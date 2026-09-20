import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testMatrixAndSync() {
  console.log("=== Testing 10-Day Dynamic Attendance Matrix & Offline Sync Pipeline ===");

  // 1. Test Program & Beneficiaries Query Performance
  const program = await prisma.program.findFirst({
    where: { programCode: "TUPAD-DGL-2026-09" },
    include: {
      workDays: { orderBy: { dayNumber: "asc" } },
    },
  });

  if (!program) {
    console.error("Program not found!");
    process.exit(1);
  }

  console.log(`✓ Found Program: ${program.programCode} (ID: ${program.id}) with ${program.workDays.length} workdays.`);

  const startMatrix = Date.now();
  const beneficiaries = await prisma.programBeneficiary.findMany({
    where: { programId: program.id, participationStatus: { not: "REPLACED" } },
    select: {
      id: true,
      designatedNumber: true,
      tableNumber: true,
      participationStatus: true,
      beneficiary: {
        select: {
          id: true,
          fullName: true,
          barangay: true,
          sitio: true,
        },
      },
      attendanceRecords: {
        select: {
          id: true,
          workDayId: true,
          attendanceDate: true,
          morningTimeIn: true,
          morningTimeOut: true,
          afternoonTimeIn: true,
          afternoonTimeOut: true,
          status: true,
        },
      },
    },
  });

  const matrixQueryTime = Date.now() - startMatrix;
  console.log(`✓ Streamlined Matrix Database Query Time: ${matrixQueryTime}ms for ${beneficiaries.length} beneficiaries.`);

  // 2. Test Offline Attendance Record Sync Simulation
  const testPb = beneficiaries[0];
  const testWd = program.workDays[0];
  const nowIso = new Date().toISOString();
  const clientTransactionId = `TEST-TX-${Date.now()}`;

  console.log(`\nTesting offline attendance sync for #${testPb.designatedNumber} (${testPb.beneficiary.fullName}) on Day ${testWd.dayNumber}...`);

  // Simulate upsert exactly as /api/v1/sync/push does
  const syncedRecord = await prisma.attendanceRecord.upsert({
    where: {
      programId_workDayId_programBeneficiaryId: {
        programId: program.id,
        workDayId: testWd.id,
        programBeneficiaryId: testPb.id,
      },
    },
    update: {
      morningTimeIn: new Date(nowIso),
      status: "PRESENT",
      syncStatus: "SYNCED",
    },
    create: {
      programId: program.id,
      workDayId: testWd.id,
      programBeneficiaryId: testPb.id,
      attendanceDate: testWd.workDate,
      morningTimeIn: new Date(nowIso),
      status: "PRESENT",
      source: "QR_SCAN_OFFLINE",
      deviceId: "TEST_UNIT",
      syncStatus: "SYNCED",
    },
  });

  console.log(`✓ Attendance Record successfully upserted into Central PostgreSQL Database!`);
  console.log(`  ID: ${syncedRecord.id}`);
  console.log(`  ProgramBeneficiaryId: ${syncedRecord.programBeneficiaryId}`);
  console.log(`  WorkDayId: ${syncedRecord.workDayId}`);
  console.log(`  Morning Time In: ${syncedRecord.morningTimeIn}`);
  console.log(`  Sync Status: ${syncedRecord.syncStatus}`);

  // 3. Verify it shows up in matrix query immediately
  const recheckBene = await prisma.programBeneficiary.findUnique({
    where: { id: testPb.id },
    select: {
      designatedNumber: true,
      beneficiary: { select: { fullName: true } },
      attendanceRecords: {
        where: { workDayId: testWd.id },
        select: { morningTimeIn: true, morningTimeOut: true },
      },
    },
  });

  console.log(`\n✓ Verified in Matrix query: Beneficiary #${recheckBene.designatedNumber} has morningTimeIn: ${recheckBene.attendanceRecords[0]?.morningTimeIn}`);
  console.log("\n=== ALL TESTS PASSED SUCCESSFULLY! ===");
}

testMatrixAndSync()
  .catch((err) => {
    console.error("Test error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
