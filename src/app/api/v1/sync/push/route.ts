import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, isAdminUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { formatBirthdayPin } from "@/lib/utils";
import { addDays, format, parseISO } from "date-fns";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const { transactions } = await request.json();

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ accepted: [], duplicates: [], conflicts: [], failed: [] });
    }

    const accepted: string[] = [];
    const duplicates: string[] = [];
    const conflicts: string[] = [];
    const failed: string[] = [];

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
          const { programId, workDayId, programBeneficiaryId, attendanceDate, morningTimeIn, morningTimeOut, afternoonTimeIn, afternoonTimeOut } = payload;
          await prisma.attendanceRecord.upsert({
            where: {
              programId_workDayId_programBeneficiaryId: {
                programId,
                workDayId,
                programBeneficiaryId,
              },
            },
            update: {
              morningTimeIn: morningTimeIn ? new Date(morningTimeIn) : undefined,
              morningTimeOut: morningTimeOut ? new Date(morningTimeOut) : undefined,
              afternoonTimeIn: afternoonTimeIn ? new Date(afternoonTimeIn) : undefined,
              afternoonTimeOut: afternoonTimeOut ? new Date(afternoonTimeOut) : undefined,
              syncStatus: "SYNCED",
            },
            create: {
              programId,
              workDayId,
              programBeneficiaryId,
              attendanceDate,
              morningTimeIn: morningTimeIn ? new Date(morningTimeIn) : null,
              morningTimeOut: morningTimeOut ? new Date(morningTimeOut) : null,
              afternoonTimeIn: afternoonTimeIn ? new Date(afternoonTimeIn) : null,
              afternoonTimeOut: afternoonTimeOut ? new Date(afternoonTimeOut) : null,
              status: "PRESENT",
              source: "QR_SCAN_OFFLINE",
              deviceId,
              syncStatus: "SYNCED",
            },
          });
          accepted.push(clientTransactionId);
        } else if (entityType === "ORIENTATION") {
          const { programId, programBeneficiaryId, status } = payload;
          await prisma.orientationAttendance.upsert({
            where: {
              programId_programBeneficiaryId: {
                programId,
                programBeneficiaryId,
              },
            },
            update: { status, syncStatus: "SYNCED" },
            create: {
              programId,
              programBeneficiaryId,
              status: status || "PRESENT",
              deviceId,
              syncStatus: "SYNCED",
            },
          });
          accepted.push(clientTransactionId);
        } else if (entityType === "STUB_DISTRIBUTION") {
          const { qrId, programBeneficiaryId, birthdayPin, latitude, longitude } = payload;
          const pb = await prisma.programBeneficiary.findUnique({
            where: { id: programBeneficiaryId },
            include: { beneficiary: true },
          });

          if (pb && formatBirthdayPin(pb.beneficiary.birthday) === birthdayPin?.trim()) {
            await prisma.stubDistribution.create({
              data: {
                qrId,
                programBeneficiaryId,
                distributedById: user?.id,
                verificationMethod: "BIRTHDAY_PIN",
                status: "DISTRIBUTED",
                latitude: latitude ? Number(latitude) : null,
                longitude: longitude ? Number(longitude) : null,
                deviceId,
              },
            });
            accepted.push(clientTransactionId);
          } else {
            conflicts.push(clientTransactionId);
            continue;
          }
        } else if (entityType === "PAYOUT") {
          const { programId, programBeneficiaryId, status, payoutDate } = payload;
          const pb = await prisma.programBeneficiary.findUnique({
            where: { id: programBeneficiaryId },
          });

          if (pb) {
            await prisma.$transaction(async (dbTx) => {
              await dbTx.payout.upsert({
                where: {
                  programId_programBeneficiaryId: {
                    programId,
                    programBeneficiaryId,
                  },
                },
                update: { status, payoutDate, verifiedAt: new Date() },
                create: {
                  programId,
                  programBeneficiaryId,
                  status,
                  payoutDate,
                  verifiedAt: new Date(),
                },
              });

              if (status === "PAID") {
                const startD = payoutDate ? parseISO(payoutDate) : new Date();
                const endD = addDays(startD, 365);
                await dbTx.beneficiaryRestriction.create({
                  data: {
                    beneficiaryId: pb.beneficiaryId,
                    sourceProgramId: programId,
                    payoutDate: format(startD, "yyyy-MM-dd"),
                    restrictionStart: format(startD, "yyyy-MM-dd"),
                    restrictionEnd: format(endD, "yyyy-MM-dd"),
                    reason: "365-day TUPAD payout restriction (Offline Sync)",
                    status: "ACTIVE",
                  },
                });
              }
            });
            accepted.push(clientTransactionId);
          } else {
            conflicts.push(clientTransactionId);
            continue;
          }
        } else if (entityType === "PHOTO") {
          const { programId, workDayId, workProgramItemId, barangay, sitio, workArea, specificActivity, fileKey, fileName, latitude, longitude, capturedAt } = payload;
          await prisma.accomplishmentPhoto.create({
            data: {
              programId,
              workDayId: workDayId || null,
              workProgramItemId: workProgramItemId || null,
              barangay: barangay || "Paltic",
              sitio: sitio || null,
              workArea: workArea || sitio || null,
              specificActivity: specificActivity || null,
              fileKey: fileKey || `photo_offline_${Date.now()}`,
              fileName: fileName || "accomplishment_photo.jpg",
              latitude: latitude ? Number(latitude) : 15.3941,
              longitude: longitude ? Number(longitude) : 121.3965,
              capturedAt: capturedAt ? new Date(capturedAt) : new Date(),
              uploadedById: user?.id || (await prisma.user.findFirst())?.id || "",
              status: isAdminUser(user) ? "APPROVED" : "FOR_REVIEW",
              approvedById: isAdminUser(user) ? user?.id : null,
              approvedAt: isAdminUser(user) ? new Date() : null,
            },
          });
          accepted.push(clientTransactionId);
        } else {
          failed.push(clientTransactionId);
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
        console.error("Sync item error:", err);
        failed.push(clientTransactionId);
      }
    }

    return NextResponse.json({ accepted, duplicates, conflicts, failed });
  } catch (error: any) {
    console.error("POST sync/push error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
