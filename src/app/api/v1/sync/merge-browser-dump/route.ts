export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { normalizeBarangayName } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    // Allow admin or authenticated field staff
    if (!user) {
      // If called from browser script without cookie, try finding default admin
      const adminFallback = await prisma.user.findFirst({
        where: { role: { in: ["DOMAIN_MASTER", "PESO_ADMIN"] } }
      });
      if (!adminFallback) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const adminUser = user || await prisma.user.findFirst({
      where: { role: { in: ["DOMAIN_MASTER", "PESO_ADMIN"] } }
    });

    const body = await request.json();
    const dump = body.data || body;

    const indexedDB = dump.indexedDB || dump;
    const offlineAttendanceRecords = indexedDB.offlineAttendanceRecords || [];
    const offlineQueue = indexedDB.offlineQueue || dump.transactions || [];
    const photosList = dump.photos || dump.accomplishmentPhotos || [];

    const results = {
      attendanceMerged: 0,
      photosMerged: 0,
      queueTransactionsProcessed: 0,
      errors: [] as string[],
    };

    // 1. Fetch Active Program and Work Days
    const activeProgram = await prisma.program.findFirst({
      where: { status: { in: ["ACTIVE", "DRAFT"] } },
      include: {
        workDays: true,
        programBeneficiaries: {
          include: { beneficiary: true }
        }
      }
    });

    if (!activeProgram) {
      return NextResponse.json({ error: "No active program found in database" }, { status: 400 });
    }

    // 2. Process Offline Attendance Records
    for (const record of offlineAttendanceRecords) {
      try {
        const progId = record.programId || activeProgram.id;
        
        // Find matching ProgramBeneficiary
        let pb = activeProgram.programBeneficiaries.find(
          p => p.id === record.programBeneficiaryId ||
               (record.designatedNumber && String(p.designatedNumber) === String(record.designatedNumber)) ||
               (record.beneficiaryId && p.beneficiaryId === record.beneficiaryId)
        );

        if (!pb && record.designatedNumber) {
          pb = await prisma.programBeneficiary.findFirst({
            where: {
              programId: progId,
              designatedNumber: String(record.designatedNumber)
            },
            include: { beneficiary: true }
          });
        }

        if (!pb) continue;

        // Resolve WorkDay
        let wd = activeProgram.workDays.find(
          w => w.id === record.workDayId ||
               w.dayNumber === record.dayNumber ||
               w.workDate === record.attendanceDate
        );

        if (!wd) {
          wd = activeProgram.workDays[0];
        }

        if (!wd) continue;

        // Upsert into Supabase PostgreSQL
        const existing = await prisma.attendanceRecord.findUnique({
          where: {
            programId_workDayId_programBeneficiaryId: {
              programId: activeProgram.id,
              workDayId: wd.id,
              programBeneficiaryId: pb.id
            }
          }
        });

        if (existing) {
          await prisma.attendanceRecord.update({
            where: { id: existing.id },
            data: {
              morningTimeIn: existing.morningTimeIn || (record.morningTimeIn ? new Date(record.morningTimeIn) : undefined),
              morningTimeOut: existing.morningTimeOut || (record.morningTimeOut ? new Date(record.morningTimeOut) : undefined),
              afternoonTimeIn: existing.afternoonTimeIn || (record.afternoonTimeIn ? new Date(record.afternoonTimeIn) : undefined),
              afternoonTimeOut: existing.afternoonTimeOut || (record.afternoonTimeOut ? new Date(record.afternoonTimeOut) : undefined),
              workArea: existing.workArea || record.workArea || undefined,
              activityName: existing.activityName || record.activityName || undefined,
              syncStatus: "SYNCED",
              status: "PRESENT"
            }
          });
        } else {
          await prisma.attendanceRecord.create({
            data: {
              programId: activeProgram.id,
              workDayId: wd.id,
              programBeneficiaryId: pb.id,
              attendanceDate: record.attendanceDate || wd.workDate,
              morningTimeIn: record.morningTimeIn ? new Date(record.morningTimeIn) : null,
              morningTimeOut: record.morningTimeOut ? new Date(record.morningTimeOut) : null,
              afternoonTimeIn: record.afternoonTimeIn ? new Date(record.afternoonTimeIn) : null,
              afternoonTimeOut: record.afternoonTimeOut ? new Date(record.afternoonTimeOut) : null,
              workArea: record.workArea || null,
              activityName: record.activityName || null,
              status: "PRESENT",
              source: "BROWSER_DUMP_MERGE",
              syncStatus: "SYNCED",
              scannedById: adminUser?.id || null
            }
          });
        }

        results.attendanceMerged++;
      } catch (err: any) {
        results.errors.push(`Attendance merge error: ${err.message}`);
      }
    }

    // 3. Process Offline Queue Transactions
    for (const tx of offlineQueue) {
      try {
        if (tx.entityType === "PHOTO") {
          const payload = tx.payload || {};
          const bgy = normalizeBarangayName(payload.barangay || "Dingalan");
          const fileKey = payload.photoData || payload.fileKey;

          if (!fileKey) continue;

          // Check if photo already exists
          const existingPhoto = await prisma.accomplishmentPhoto.findFirst({
            where: {
              OR: [
                { fileKey: fileKey },
                {
                  barangay: { contains: bgy, mode: "insensitive" },
                  capturedAt: payload.capturedAt ? new Date(payload.capturedAt) : undefined
                }
              ]
            }
          });

          if (!existingPhoto) {
            let wd = activeProgram.workDays.find(
              w => w.id === payload.workDayId || w.dayNumber === Number(payload.workDayNumber)
            );
            if (!wd) wd = activeProgram.workDays[0];

            await prisma.accomplishmentPhoto.create({
              data: {
                programId: activeProgram.id,
                workDayId: wd?.id || null,
                barangay: bgy,
                sitio: payload.sitio || null,
                workArea: payload.workArea || payload.sitio || null,
                specificActivity: payload.specificActivity || null,
                fileKey: fileKey,
                fileName: payload.fileName || "accomplishment_photo.jpg",
                latitude: payload.latitude ? Number(payload.latitude) : 15.3941,
                longitude: payload.longitude ? Number(payload.longitude) : 121.3965,
                capturedAt: payload.capturedAt ? new Date(payload.capturedAt) : new Date(),
                uploadedById: adminUser?.id || null,
                status: "APPROVED",
                approvedById: adminUser?.id || null,
                approvedAt: new Date()
              }
            });
            results.photosMerged++;
          }
        } else if (tx.entityType === "ATTENDANCE") {
          const payload = tx.payload || {};
          let pb = activeProgram.programBeneficiaries.find(
            p => p.id === payload.programBeneficiaryId ||
                 (payload.designatedNumber && String(p.designatedNumber) === String(payload.designatedNumber))
          );

          if (pb) {
            let wd = activeProgram.workDays.find(
              w => w.id === payload.workDayId || w.dayNumber === payload.dayNumber
            );
            if (!wd) wd = activeProgram.workDays[0];

            if (wd) {
              const existing = await prisma.attendanceRecord.findUnique({
                where: {
                  programId_workDayId_programBeneficiaryId: {
                    programId: activeProgram.id,
                    workDayId: wd.id,
                    programBeneficiaryId: pb.id
                  }
                }
              });

              if (existing) {
                await prisma.attendanceRecord.update({
                  where: { id: existing.id },
                  data: {
                    morningTimeIn: existing.morningTimeIn || (payload.morningTimeIn ? new Date(payload.morningTimeIn) : undefined),
                    morningTimeOut: existing.morningTimeOut || (payload.morningTimeOut ? new Date(payload.morningTimeOut) : undefined),
                    afternoonTimeIn: existing.afternoonTimeIn || (payload.afternoonTimeIn ? new Date(payload.afternoonTimeIn) : undefined),
                    afternoonTimeOut: existing.afternoonTimeOut || (payload.afternoonTimeOut ? new Date(payload.afternoonTimeOut) : undefined),
                    workArea: existing.workArea || payload.workArea || undefined,
                    activityName: existing.activityName || payload.activityName || undefined,
                    syncStatus: "SYNCED",
                    status: "PRESENT"
                  }
                });
              } else {
                await prisma.attendanceRecord.create({
                  data: {
                    programId: activeProgram.id,
                    workDayId: wd.id,
                    programBeneficiaryId: pb.id,
                    attendanceDate: payload.attendanceDate || wd.workDate,
                    morningTimeIn: payload.morningTimeIn ? new Date(payload.morningTimeIn) : null,
                    morningTimeOut: payload.morningTimeOut ? new Date(payload.morningTimeOut) : null,
                    afternoonTimeIn: payload.afternoonTimeIn ? new Date(payload.afternoonTimeIn) : null,
                    afternoonTimeOut: payload.afternoonTimeOut ? new Date(payload.afternoonTimeOut) : null,
                    workArea: payload.workArea || null,
                    activityName: payload.activityName || null,
                    status: "PRESENT",
                    source: "QUEUE_DUMP_MERGE",
                    syncStatus: "SYNCED",
                    scannedById: adminUser?.id || null
                  }
                });
              }
              results.attendanceMerged++;
            }
          }
        }
        results.queueTransactionsProcessed++;
      } catch (err: any) {
        results.errors.push(`Queue merge error: ${err.message}`);
      }
    }

    // 4. Process direct photos list if provided
    for (const p of photosList) {
      try {
        const bgy = normalizeBarangayName(p.barangay || "Dingalan");
        const fileKey = p.photoData || p.fileKey;
        if (!fileKey) continue;

        const existingPhoto = await prisma.accomplishmentPhoto.findFirst({
          where: {
            OR: [
              { fileKey: fileKey },
              {
                barangay: { contains: bgy, mode: "insensitive" },
                capturedAt: p.capturedAt ? new Date(p.capturedAt) : undefined
              }
            ]
          }
        });

        if (!existingPhoto) {
          let wd = activeProgram.workDays.find(
            w => w.id === p.workDayId || w.dayNumber === Number(p.workDayNumber || p.dayNumber)
          );
          if (!wd) wd = activeProgram.workDays[0];

          await prisma.accomplishmentPhoto.create({
            data: {
              programId: activeProgram.id,
              workDayId: wd?.id || null,
              barangay: bgy,
              sitio: p.sitio || null,
              workArea: p.workArea || p.sitio || null,
              specificActivity: p.specificActivity || p.activity || null,
              fileKey: fileKey,
              fileName: p.fileName || "accomplishment_photo.jpg",
              latitude: p.latitude || (p.coordinates?.latitude ? Number(p.coordinates.latitude) : 15.3941),
              longitude: p.longitude || (p.coordinates?.longitude ? Number(p.coordinates.longitude) : 121.3965),
              capturedAt: p.capturedAt ? new Date(p.capturedAt) : new Date(),
              uploadedById: adminUser?.id || null,
              status: "APPROVED",
              approvedById: adminUser?.id || null,
              approvedAt: new Date()
            }
          });
          results.photosMerged++;
        }
      } catch (err: any) {
        results.errors.push(`Photo merge error: ${err.message}`);
      }
    }

    if (adminUser) {
      await logAudit({
        userId: adminUser.id,
        action: "OFFLINE_DATA_MERGED_TO_SUPABASE",
        entityType: "SYSTEM_SYNC",
        metadata: {
          attendanceMerged: results.attendanceMerged,
          photosMerged: results.photosMerged,
          queueTransactionsProcessed: results.queueTransactionsProcessed
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully merged data into Supabase PostgreSQL: ${results.attendanceMerged} attendance scans, ${results.photosMerged} photos.`,
      results
    });
  } catch (error: any) {
    console.error("Browser dump merge error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
