import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function retrieveAndAnalyzeData() {
  console.log("================================================================================");
  console.log("PESO TUPAD DINGALAN - COMPREHENSIVE DATA RETRIEVAL & CONSOLIDATION AUDIT");
  console.log("Filter: Since September 21, 2026 06:00:00 AM PST (2026-09-20T22:00:00.000Z UTC)");
  console.log("================================================================================");

  const filterSince = new Date("2026-09-20T22:00:00.000Z");

  // 1. Programs & Work Days
  const programs = await prisma.program.findMany({
    include: {
      workDays: { orderBy: { dayNumber: 'asc' } },
      tupadWorkPrograms: {
        include: {
          items: { orderBy: { dayNumber: 'asc' } }
        }
      },
      _count: { select: { programBeneficiaries: true, attendanceRecords: true, accomplishmentPhotos: true } }
    }
  });

  console.log("\n--- ACTIVE PROGRAMS ---");
  for (const prog of programs) {
    console.log(`Program: [${prog.programCode}] ${prog.programName}`);
    console.log(`  ID: ${prog.id}`);
    console.log(`  Status: ${prog.status}, Total Beneficiaries: ${prog._count.programBeneficiaries}`);
    console.log(`  Total Attendance Records: ${prog._count.attendanceRecords}, Total Accomplishment Photos: ${prog._count.accomplishmentPhotos}`);
    console.log(`  Work Days: ${prog.workDays.map(wd => `Day ${wd.dayNumber} (${wd.workDate})`).join(', ')}`);
    console.log(`  Work Programs per Barangay: ${prog.tupadWorkPrograms.map(wp => `${wp.barangay} (${wp.items.length} items)`).join(', ')}`);
  }

  // 2. Attendance Records
  const attendance = await prisma.attendanceRecord.findMany({
    where: {
      OR: [
        { morningTimeIn: { gte: filterSince } },
        { morningTimeOut: { gte: filterSince } },
        { afternoonTimeIn: { gte: filterSince } },
        { afternoonTimeOut: { gte: filterSince } },
        { createdAt: { gte: filterSince } },
        { updatedAt: { gte: filterSince } }
      ]
    },
    include: {
      program: { select: { programCode: true, programName: true } },
      workDay: { select: { dayNumber: true, workDate: true } },
      scannedBy: { select: { id: true, username: true, fullName: true, role: true, assignedBarangay: true } },
      workProgramItem: true,
      programBeneficiary: {
        include: {
          beneficiary: true
        }
      }
    },
    orderBy: [
      { workDay: { dayNumber: 'asc' } },
      { programBeneficiary: { designatedNumber: 'asc' } }
    ]
  });

  console.log(`\n--- ATTENDANCE RECORDS RETRIEVED (Count: ${attendance.length}) ---`);
  const attendanceByBarangay = {};
  const scannedByMap = {};
  const slotCount = { amIn: 0, amOut: 0, pmIn: 0, pmOut: 0 };

  for (const att of attendance) {
    const bgy = att.programBeneficiary?.beneficiary?.barangay || "Unknown";
    attendanceByBarangay[bgy] = (attendanceByBarangay[bgy] || 0) + 1;
    const scanner = att.scannedBy ? `${att.scannedBy.fullName} (${att.scannedBy.username}, ${att.scannedBy.role})` : 'System / Direct';
    scannedByMap[scanner] = (scannedByMap[scanner] || 0) + 1;
    if (att.morningTimeIn) slotCount.amIn++;
    if (att.morningTimeOut) slotCount.amOut++;
    if (att.afternoonTimeIn) slotCount.pmIn++;
    if (att.afternoonTimeOut) slotCount.pmOut++;
  }

  console.log("Attendance breakdown by Barangay:", attendanceByBarangay);
  console.log("Attendance logged by Scanner/User:", scannedByMap);
  console.log("Slots filled:", slotCount);

  console.log("\nDetailed Sample Attendance Records (First 15):");
  attendance.slice(0, 15).forEach((att, idx) => {
    const ben = att.programBeneficiary?.beneficiary;
    console.log(`${idx + 1}. [No. ${att.programBeneficiary?.designatedNumber}] ${ben?.lastName}, ${ben?.firstName} | Bgy: ${ben?.barangay} | Day ${att.workDay?.dayNumber} (${att.attendanceDate}) | AM In: ${att.morningTimeIn ? att.morningTimeIn.toISOString() : '-'} | PM In: ${att.afternoonTimeIn ? att.afternoonTimeIn.toISOString() : '-'} | Status: ${att.status} | Sync: ${att.syncStatus} | Scanner: ${att.scannedBy?.fullName || 'N/A'}`);
  });

  // 3. Accomplishment Photos
  const photos = await prisma.accomplishmentPhoto.findMany({
    include: {
      program: { select: { programCode: true, programName: true } },
      workDay: { select: { dayNumber: true, workDate: true } },
      workProgramItem: true,
      uploadedBy: { select: { id: true, username: true, fullName: true, role: true, assignedBarangay: true } },
      approvedBy: { select: { id: true, username: true, fullName: true, role: true } }
    },
    orderBy: { capturedAt: 'desc' }
  });

  console.log(`\n--- ACCOMPLISHMENT PHOTOS RETRIEVED (Count: ${photos.length}) ---`);
  for (const p of photos) {
    console.log(`Photo ID: ${p.id}`);
    console.log(`  Barangay: ${p.barangay}, Sitio: ${p.sitio}, Work Area: ${p.workArea}`);
    console.log(`  Activity: ${p.specificActivity || p.workProgramItem?.specificActivities || 'N/A'}`);
    console.log(`  Work Day: Day ${p.workDay?.dayNumber} (${p.workDay?.workDate})`);
    console.log(`  Uploaded By: ${p.uploadedBy?.fullName} (${p.uploadedBy?.username}, ${p.uploadedBy?.role}, Assigned Bgy: ${p.uploadedBy?.assignedBarangay || 'None'})`);
    console.log(`  Coordinates: Lat ${p.latitude}, Lng ${p.longitude}`);
    console.log(`  Captured At: ${p.capturedAt ? p.capturedAt.toISOString() : 'N/A'}, Uploaded At: ${p.uploadedAt.toISOString()}`);
    console.log(`  Status: ${p.status} (Approved by: ${p.approvedBy?.fullName || 'Pending Review'})`);
    console.log(`  File Name: ${p.fileName}, Key length: ${p.fileKey?.length}`);
  }

  // 4. Beneficiaries per Barangay in Master Database
  const beneficiariesByBgy = await prisma.beneficiary.groupBy({
    by: ['barangay'],
    _count: { id: true }
  });
  console.log("\n--- MASTER BENEFICIARY POPULATION BY BARANGAY ---");
  console.table(beneficiariesByBgy.map(b => ({ Barangay: b.barangay, "Total Beneficiaries": b._count.id })));

  // 5. Users List
  const users = await prisma.user.findMany({
    select: { id: true, username: true, fullName: true, role: true, assignedBarangay: true, status: true, plainPassword: true },
    orderBy: { role: 'asc' }
  });
  console.log("\n--- REGISTERED USERS / SYSTEM ROLES ---");
  console.table(users);
}

retrieveAndAnalyzeData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
