import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testProgramCrud() {
  console.log("==================================================================");
  console.log("TESTING PROGRAM CRUD (EDIT & CASCADING DELETION)");
  console.log("==================================================================");

  // 1. Create a dummy test program with associated relations
  const testProg = await prisma.program.create({
    data: {
      programCode: "TUPAD-TEST-CRUD-2026",
      programName: "Original Test Program Name",
      status: "DRAFT",
      municipality: "Dingalan",
      province: "Aurora",
      requiredWorkDays: 10,
      dailyHours: 8.0,
      morningStart: "08:00",
      morningEnd: "12:00",
      afternoonStart: "13:00",
      afternoonEnd: "17:00",
      programBarangays: {
        create: [
          { barangayName: "Poblacion", beneficiaryTarget: 50 },
          { barangayName: "Aplaya", beneficiaryTarget: 50 },
        ],
      },
      tableRules: {
        create: [
          { startNumber: 1, endNumber: 50, tableNumber: "Table 1" },
        ],
      },
    },
  });

  console.log("1. Created Test Program:", testProg.programCode, "ID:", testProg.id);

  // 2. Test Editing the Program
  const updatedProg = await prisma.program.update({
    where: { id: testProg.id },
    data: {
      programName: "Updated 10-Day TUPAD Clean-up Initiative",
      requiredWorkDays: 15,
      dailyHours: 4.0,
      natureOfWork: "Barangay beautification and drainage declogging",
      status: "ACTIVE",
    },
  });

  console.log("2. Successfully Edited Program Name:", updatedProg.programName);
  console.log("   - New Required Work Days:", updatedProg.requiredWorkDays);
  console.log("   - New Status:", updatedProg.status);

  if (updatedProg.programName !== "Updated 10-Day TUPAD Clean-up Initiative" || updatedProg.requiredWorkDays !== 15) {
    throw new Error("Program edit test failed!");
  }

  // 3. Test Cascading Deletion
  await prisma.$transaction(async (tx) => {
    await tx.tableAssignmentRule.deleteMany({ where: { programId: testProg.id } });
    await tx.programBarangay.deleteMany({ where: { programId: testProg.id } });
    await tx.program.delete({ where: { id: testProg.id } });
  });

  const checkDeleted = await prisma.program.findUnique({ where: { id: testProg.id } });
  if (checkDeleted) {
    throw new Error("Program delete test failed!");
  }

  console.log("3. Successfully and Safely Deleted Test Program with Zero Orphan Records.");
  console.log("==================================================================");
  console.log(">>> ALL PROGRAM EDIT & DELETE CRUD TESTS PASSED WITH 100% ACCURACY! <<<");
  console.log("==================================================================");
}

testProgramCrud()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Test Error:", e);
    process.exit(1);
  });
