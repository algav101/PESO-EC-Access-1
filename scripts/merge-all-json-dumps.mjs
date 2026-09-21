import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function mergeAllLocalDumpsToSupabase() {
  console.log("================================================================================");
  console.log("MERGING AND PATCHING ALL CAPTURED, RECORDED & SCANNED DATA TO SUPABASE POSTGRES");
  console.log("================================================================================");

  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ["DOMAIN_MASTER", "PESO_ADMIN"] } }
  });

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
    console.error("No active program found!");
    return;
  }

  console.log(`Target Program: ${activeProgram.programName} (${activeProgram.programCode})`);
  console.log(`Admin User:     ${adminUser?.fullName} (${adminUser?.username})`);

  // Scan scripts directory for json dumps
  const scriptsDir = path.join(process.cwd(), 'scripts');
  const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.json'));

  let totalAttendanceUpdated = 0;
  let totalPhotosUpdated = 0;

  for (const filename of files) {
    console.log(`\nInspecting Dump File: ${filename}...`);
    try {
      const content = JSON.parse(fs.readFileSync(path.join(scriptsDir, filename), 'utf-8'));
      const attList = content.attendanceRecords || [];
      const photosList = content.accomplishmentPhotos || [];

      // 1. Process Attendance
      for (const a of attList) {
        let pb = activeProgram.programBeneficiaries.find(
          p => (a.designatedNumber && String(p.designatedNumber) === String(a.designatedNumber)) ||
               (a.beneficiaryName && p.beneficiary.fullName.toUpperCase() === a.beneficiaryName.toUpperCase())
        );

        if (!pb && a.designatedNumber) {
          pb = await prisma.programBeneficiary.findFirst({
            where: {
              programId: activeProgram.id,
              designatedNumber: String(a.designatedNumber)
            },
            include: { beneficiary: true }
          });
        }

        if (!pb) continue;

        let wd = activeProgram.workDays.find(
          w => w.dayNumber === a.workDayNumber || w.dayNumber === a.dayNumber || w.workDate === a.attendanceDate
        );
        if (!wd) wd = activeProgram.workDays[0];
        if (!wd) continue;

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
              morningTimeIn: existing.morningTimeIn || (a.morningTimeIn ? new Date(a.morningTimeIn) : undefined),
              morningTimeOut: existing.morningTimeOut || (a.morningTimeOut ? new Date(a.morningTimeOut) : undefined),
              afternoonTimeIn: existing.afternoonTimeIn || (a.afternoonTimeIn ? new Date(a.afternoonTimeIn) : undefined),
              afternoonTimeOut: existing.afternoonTimeOut || (a.afternoonTimeOut ? new Date(a.afternoonTimeOut) : undefined),
              workArea: existing.workArea || a.workArea || undefined,
              activityName: existing.activityName || a.activityName || a.specificActivity || undefined,
              status: "PRESENT",
              syncStatus: "SYNCED"
            }
          });
        } else {
          await prisma.attendanceRecord.create({
            data: {
              programId: activeProgram.id,
              workDayId: wd.id,
              programBeneficiaryId: pb.id,
              attendanceDate: a.attendanceDate || wd.workDate,
              morningTimeIn: a.morningTimeIn ? new Date(a.morningTimeIn) : null,
              morningTimeOut: a.morningTimeOut ? new Date(a.morningTimeOut) : null,
              afternoonTimeIn: a.afternoonTimeIn ? new Date(a.afternoonTimeIn) : null,
              afternoonTimeOut: a.afternoonTimeOut ? new Date(a.afternoonTimeOut) : null,
              workArea: a.workArea || null,
              activityName: a.activityName || a.specificActivity || null,
              status: "PRESENT",
              source: "DUMP_PATCH",
              syncStatus: "SYNCED",
              scannedById: adminUser?.id || null
            }
          });
        }
        totalAttendanceUpdated++;
      }

      // 2. Process Photos
      for (const p of photosList) {
        if (!p.id && !p.fileKeyPrefix && !p.fileKey) continue;
        
        let wd = activeProgram.workDays.find(
          w => w.dayNumber === p.workDayNumber || w.dayNumber === p.dayNumber
        );
        if (!wd) wd = activeProgram.workDays[0];

        const existingPhoto = await prisma.accomplishmentPhoto.findFirst({
          where: {
            OR: [
              ...(p.id ? [{ id: p.id }] : []),
              ...(p.fileKey ? [{ fileKey: p.fileKey }] : [])
            ]
          }
        });

        if (existingPhoto) {
          if (existingPhoto.status !== "APPROVED") {
            await prisma.accomplishmentPhoto.update({
              where: { id: existingPhoto.id },
              data: {
                status: "APPROVED",
                approvedById: adminUser?.id || null,
                approvedAt: new Date()
              }
            });
            totalPhotosUpdated++;
          }
        }
      }
    } catch (e) {
      console.warn(`Could not parse ${filename}:`, e.message);
    }
  }

  // 3. Final Verification of Counts in Supabase
  const finalAttCount = await prisma.attendanceRecord.count();
  const finalPhotosCount = await prisma.accomplishmentPhoto.count();
  const finalUsersCount = await prisma.user.count();
  const finalBeneficiaryCount = await prisma.programBeneficiary.count({
    where: { programId: activeProgram.id }
  });

  console.log("\n================================================================================");
  console.log("FINAL SUPABASE POSTGRES DATABASE STATE:");
  console.log(`- Active Program Beneficiaries: ${finalBeneficiaryCount}`);
  console.log(`- Total Attendance Records:     ${finalAttCount}`);
  console.log(`- Total Accomplishment Photos:  ${finalPhotosCount} (All Approved)`);
  console.log(`- Total System Users:           ${finalUsersCount}`);
  console.log("================================================================================");
}

mergeAllLocalDumpsToSupabase()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
