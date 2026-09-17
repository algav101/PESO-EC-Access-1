export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { formatBirthdayPin } from "@/lib/utils";
import { addDays, format, parseISO } from "date-fns";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const { transactions } = await request.json();

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ accepted: [], duplicates: [], conflicts: [], failed: [], errors: {} });
    }

    const accepted: string[] = [];
    const duplicates: string[] = [];
    const conflicts: string[] = [];
    const failed: string[] = [];
    const errors: Record<string, string> = {};

    for (const tx of transactions) {
      const { clientTransactionId, entityType, payload, deviceId } = tx;

      if (!clientTransactionId) {
        failed.push("UNKNOWN");
        continue;
      }

      // Check idempotency in Audit Logs
      const existingAudit = await prisma.auditLog.findFirst({
        where: {
          metadata: { contains: clientTransactionId },
        },
      });

      if (existingAudit) {
        duplicates.push(clientTransactionId);
        continue;
      }

      try {
        if (entityType === "ATTENDANCE") {
          const {
            programId,
            workDayId,
            programBeneficiaryId,
            attendanceDate,
            morningTimeIn,
            morningTimeOut,
            afternoonTimeIn,
            afternoonTimeOut,
            workProgramItemId,
            workArea,
            activityName,
            scannedById,
          } = payload || {};

          // 1. Resolve Program Beneficiary
          let pb = null;
          if (programBeneficiaryId) {
            pb = await prisma.programBeneficiary.findUnique({
              where: { id: programBeneficiaryId },
              include: { program: true },
            });
          }
          if (!pb && programBeneficiaryId) {
            pb = await prisma.programBeneficiary.findFirst({
              where: {
                OR: [
                  { id: programBeneficiaryId },
                  { beneficiaryId: programBeneficiaryId, programId: programId || undefined },
                ],
              },
              include: { program: true },
            });
          }

          if (!pb) {
            throw new Error(`Beneficiary record (${programBeneficiaryId || "unknown"}) not found in database.`);
          }

          const resolvedProgramId = pb.programId;
          const resolvedBeneficiaryId = pb.id;

          // 2. Resolve WorkDay
          let wd = null;
          if (workDayId && !String(workDayId).startsWith("WD-") && String(workDayId).length > 10) {
            wd = await prisma.workDay.findUnique({ where: { id: workDayId } });
          }

          const targetDate = attendanceDate || format(new Date(), "yyyy-MM-dd");

          if (!wd) {
            // Find by programId and workDate
            wd = await prisma.workDay.findFirst({
              where: { programId: resolvedProgramId, workDate: targetDate },
            });
          }

          if (!wd) {
            // Find first available workday for program
            wd = await prisma.workDay.findFirst({
              where: { programId: resolvedProgramId },
              orderBy: { dayNumber: "asc" },
            });
          }

          if (!wd) {
            // Auto-create Day 1 if no workdays exist yet
            wd = await prisma.workDay.create({
              data: {
                programId: resolvedProgramId,
                dayNumber: 1,
                workDate: targetDate,
                status: "ACTIVE",
                description: "Day 1 (Auto-created during offline sync)",
              },
            });
          }

          const resolvedWorkDayId = wd.id;
          const resolvedAttendanceDate = wd.workDate || targetDate;

          // 3. Resolve WorkProgramItem
          let resolvedItemId: string | null = null;
          if (workProgramItemId && workProgramItemId !== "AUTO" && String(workProgramItemId).trim() !== "") {
            const itemExists = await prisma.tupadWorkProgramItem.findUnique({
              where: { id: workProgramItemId },
            });
            if (itemExists) {
              resolvedItemId = itemExists.id;
            }
          }

          // 4. Resolve ScannedById / User
          let validScannedById: string | null = null;
          const targetUserId = scannedById || user?.id;
          if (targetUserId) {
            const userExists = await prisma.user.findUnique({ where: { id: targetUserId } });
            if (userExists) validScannedById = userExists.id;
          }

          // 5. Upsert Attendance Record
          await prisma.attendanceRecord.upsert({
            where: {
              programId_workDayId_programBeneficiaryId: {
                programId: resolvedProgramId,
                workDayId: resolvedWorkDayId,
                programBeneficiaryId: resolvedBeneficiaryId,
              },
            },
            update: {
              morningTimeIn: morningTimeIn ? new Date(morningTimeIn) : undefined,
              morningTimeOut: morningTimeOut ? new Date(morningTimeOut) : undefined,
              afternoonTimeIn: afternoonTimeIn ? new Date(afternoonTimeIn) : undefined,
              afternoonTimeOut: afternoonTimeOut ? new Date(afternoonTimeOut) : undefined,
              workProgramItemId: resolvedItemId || undefined,
              workArea: workArea || undefined,
              activityName: activityName || undefined,
              syncStatus: "SYNCED",
              scannedById: validScannedById || undefined,
            },
            create: {
              programId: resolvedProgramId,
              workDayId: resolvedWorkDayId,
              programBeneficiaryId: resolvedBeneficiaryId,
              attendanceDate: resolvedAttendanceDate,
              morningTimeIn: morningTimeIn ? new Date(morningTimeIn) : null,
              morningTimeOut: morningTimeOut ? new Date(morningTimeOut) : null,
              afternoonTimeIn: afternoonTimeIn ? new Date(afternoonTimeIn) : null,
              afternoonTimeOut: afternoonTimeOut ? new Date(afternoonTimeOut) : null,
              workProgramItemId: resolvedItemId,
              workArea: workArea || null,
              activityName: activityName || null,
              status: "PRESENT",
              source: "QR_SCAN_OFFLINE",
              deviceId: deviceId || "OFFLINE_UNIT",
              syncStatus: "SYNCED",
              scannedById: validScannedById,
            },
          });
          accepted.push(clientTransactionId);
        } else if (entityType === "ORIENTATION") {
          const { programId, programBeneficiaryId, status, scannedById } = payload || {};
          let pb = null;
          if (programBeneficiaryId) {
            pb = await prisma.programBeneficiary.findUnique({
              where: { id: programBeneficiaryId },
            });
          }
          if (!pb && programBeneficiaryId) {
            pb = await prisma.programBeneficiary.findFirst({
              where: {
                OR: [
                  { id: programBeneficiaryId },
                  { beneficiaryId: programBeneficiaryId, programId: programId || undefined },
                ],
              },
            });
          }

          if (!pb) {
            throw new Error(`Beneficiary record (${programBeneficiaryId || "unknown"}) not found for orientation.`);
          }

          let validScannedById: string | null = null;
          const targetUserId = scannedById || user?.id;
          if (targetUserId) {
            const userExists = await prisma.user.findUnique({ where: { id: targetUserId } });
            if (userExists) validScannedById = userExists.id;
          }

          await prisma.orientationAttendance.upsert({
            where: {
              programId_programBeneficiaryId: {
                programId: pb.programId,
                programBeneficiaryId: pb.id,
              },
            },
            update: {
              status: status || "PRESENT",
              syncStatus: "SYNCED",
              scannedById: validScannedById || undefined,
            },
            create: {
              programId: pb.programId,
              programBeneficiaryId: pb.id,
              status: status || "PRESENT",
              deviceId: deviceId || "OFFLINE_UNIT",
              syncStatus: "SYNCED",
              scannedById: validScannedById,
            },
          });
          accepted.push(clientTransactionId);
        } else if (entityType === "STUB_DISTRIBUTION") {
          const { qrId, programBeneficiaryId, birthdayPin, latitude, longitude } = payload || {};
          let pb = null;
          if (programBeneficiaryId) {
            pb = await prisma.programBeneficiary.findUnique({
              where: { id: programBeneficiaryId },
              include: { beneficiary: true, qrCodes: true },
            });
          }
          if (!pb && programBeneficiaryId) {
            pb = await prisma.programBeneficiary.findFirst({
              where: {
                OR: [
                  { id: programBeneficiaryId },
                  { beneficiaryId: programBeneficiaryId },
                ],
              },
              include: { beneficiary: true, qrCodes: true },
            });
          }

          if (!pb) {
            throw new Error(`Beneficiary record (${programBeneficiaryId || "unknown"}) not found for stub distribution.`);
          }

          const actualPin = formatBirthdayPin(pb.beneficiary.birthday);
          const enteredPin = birthdayPin?.trim();
          if (actualPin && enteredPin && actualPin !== enteredPin) {
            conflicts.push(clientTransactionId);
            errors[clientTransactionId] = `Birthday PIN mismatch: expected format ${actualPin}`;
            continue;
          }

          // Resolve QR Code ID
          let resolvedQrId = qrId;
          if (resolvedQrId) {
            const qrExists = await prisma.qrCode.findUnique({ where: { id: resolvedQrId } });
            if (!qrExists) resolvedQrId = null;
          }
          if (!resolvedQrId && pb.qrCodes && pb.qrCodes.length > 0) {
            const activeQr = pb.qrCodes.find((q) => q.status === "ACTIVE") || pb.qrCodes[0];
            resolvedQrId = activeQr.id;
          }
          if (!resolvedQrId) {
            const token = `TUPAD-${pb.programId.slice(0, 4).toUpperCase()}-${pb.designatedNumber || Date.now()}`;
            const newQr = await prisma.qrCode.create({
              data: {
                programId: pb.programId,
                programBeneficiaryId: pb.id,
                publicToken: token,
                tokenHash: Buffer.from(token).toString("base64"),
                status: "ACTIVE",
              },
            });
            resolvedQrId = newQr.id;
          }

          let validDistributedById: string | null = null;
          if (user?.id) {
            const userExists = await prisma.user.findUnique({ where: { id: user.id } });
            if (userExists) validDistributedById = userExists.id;
          }

          // Check if stub distribution already recorded
          const existingStub = await prisma.stubDistribution.findFirst({
            where: {
              OR: [
                { programBeneficiaryId: pb.id },
                { qrId: resolvedQrId },
              ],
            },
          });

          if (existingStub) {
            await prisma.stubDistribution.update({
              where: { id: existingStub.id },
              data: {
                status: "DISTRIBUTED",
                latitude: latitude ? Number(latitude) : existingStub.latitude,
                longitude: longitude ? Number(longitude) : existingStub.longitude,
                distributedById: validDistributedById || existingStub.distributedById,
                deviceId: deviceId || existingStub.deviceId,
              },
            });
          } else {
            await prisma.stubDistribution.create({
              data: {
                qrId: resolvedQrId,
                programBeneficiaryId: pb.id,
                distributedById: validDistributedById,
                verificationMethod: "BIRTHDAY_PIN",
                status: "DISTRIBUTED",
                latitude: latitude ? Number(latitude) : null,
                longitude: longitude ? Number(longitude) : null,
                deviceId: deviceId || "OFFLINE_UNIT",
              },
            });
          }
          accepted.push(clientTransactionId);
        } else if (entityType === "PAYOUT") {
          const { programId, programBeneficiaryId, status, payoutDate, remarks } = payload || {};
          let pb = null;
          if (programBeneficiaryId) {
            pb = await prisma.programBeneficiary.findUnique({
              where: { id: programBeneficiaryId },
            });
          }
          if (!pb && programBeneficiaryId) {
            pb = await prisma.programBeneficiary.findFirst({
              where: {
                OR: [
                  { id: programBeneficiaryId },
                  { beneficiaryId: programBeneficiaryId, programId: programId || undefined },
                ],
              },
            });
          }

          if (!pb) {
            throw new Error(`Beneficiary record (${programBeneficiaryId || "unknown"}) not found for payout.`);
          }

          const resolvedProgramId = pb.programId;
          const resolvedPbId = pb.id;

          let validVerifiedById: string | null = null;
          if (user?.id) {
            const userExists = await prisma.user.findUnique({ where: { id: user.id } });
            if (userExists) validVerifiedById = userExists.id;
          }

          await prisma.$transaction(async (dbTx) => {
            await dbTx.payout.upsert({
              where: {
                programId_programBeneficiaryId: {
                  programId: resolvedProgramId,
                  programBeneficiaryId: resolvedPbId,
                },
              },
              update: {
                status: status || "PAID",
                payoutDate: payoutDate || format(new Date(), "yyyy-MM-dd"),
                verifiedAt: new Date(),
                verifiedById: validVerifiedById,
                remarks: remarks || undefined,
              },
              create: {
                programId: resolvedProgramId,
                programBeneficiaryId: resolvedPbId,
                status: status || "PAID",
                payoutDate: payoutDate || format(new Date(), "yyyy-MM-dd"),
                verifiedAt: new Date(),
                verifiedById: validVerifiedById,
                remarks: remarks || null,
              },
            });

            if (status === "PAID") {
              const startD = payoutDate ? parseISO(payoutDate) : new Date();
              const endD = addDays(startD, 365);

              const existingRes = await dbTx.beneficiaryRestriction.findFirst({
                where: {
                  beneficiaryId: pb.beneficiaryId,
                  sourceProgramId: resolvedProgramId,
                },
              });

              if (!existingRes) {
                await dbTx.beneficiaryRestriction.create({
                  data: {
                    beneficiaryId: pb.beneficiaryId,
                    sourceProgramId: resolvedProgramId,
                    payoutDate: format(startD, "yyyy-MM-dd"),
                    restrictionStart: format(startD, "yyyy-MM-dd"),
                    restrictionEnd: format(endD, "yyyy-MM-dd"),
                    reason: "365-day TUPAD payout restriction (Offline Sync)",
                    status: "ACTIVE",
                  },
                });
              }
            }
          });
          accepted.push(clientTransactionId);
        } else if (entityType === "PHOTO") {
          const {
            programId,
            workDayId,
            workProgramItemId,
            barangay,
            sitio,
            workArea,
            specificActivity,
            fileKey,
            fileName,
            latitude,
            longitude,
            capturedAt,
          } = payload || {};

          let validWorkDayId: string | null = null;
          if (workDayId && !String(workDayId).startsWith("WD-")) {
            const wdExists = await prisma.workDay.findUnique({ where: { id: workDayId } });
            if (wdExists) validWorkDayId = wdExists.id;
          }

          let validWorkProgramItemId: string | null = null;
          if (workProgramItemId && workProgramItemId !== "AUTO") {
            const wpExists = await prisma.tupadWorkProgramItem.findUnique({ where: { id: workProgramItemId } });
            if (wpExists) validWorkProgramItemId = wpExists.id;
          }

          let validUploadedById: string | null = null;
          if (user?.id) {
            const userExists = await prisma.user.findUnique({ where: { id: user.id } });
            if (userExists) validUploadedById = userExists.id;
          }
          if (!validUploadedById) {
            const firstUser = await prisma.user.findFirst();
            validUploadedById = firstUser?.id || null;
          }

          await prisma.accomplishmentPhoto.create({
            data: {
              programId,
              workDayId: validWorkDayId,
              workProgramItemId: validWorkProgramItemId,
              barangay: barangay || "Paltic",
              sitio: sitio || null,
              workArea: workArea || sitio || null,
              specificActivity: specificActivity || null,
              fileKey: fileKey || `photo_offline_${Date.now()}`,
              fileName: fileName || "accomplishment_photo.jpg",
              latitude: latitude ? Number(latitude) : 15.3941,
              longitude: longitude ? Number(longitude) : 121.3965,
              capturedAt: capturedAt ? new Date(capturedAt) : new Date(),
              uploadedById: validUploadedById,
              status: isAdminUser(user) ? "APPROVED" : "FOR_REVIEW",
              approvedById: isAdminUser(user) ? validUploadedById : null,
              approvedAt: isAdminUser(user) ? new Date() : null,
            },
          });
          accepted.push(clientTransactionId);
        } else {
          failed.push(clientTransactionId);
          errors[clientTransactionId] = `Unknown entity type: ${entityType}`;
          continue;
        }

        // Record Audit for this transaction
        await logAudit({
          userId: user?.id,
          action: "OFFLINE_TRANSACTION_SYNCED",
          entityType,
          deviceId,
          metadata: { clientTransactionId, entityType },
        });
      } catch (err: any) {
        console.error("Sync item processing error:", err);
        failed.push(clientTransactionId);
        errors[clientTransactionId] = err.message || "Failed during server-side sync processing";
      }
    }

    return NextResponse.json({ accepted, duplicates, conflicts, failed, errors });
  } catch (error: any) {
    console.error("POST sync/push error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
