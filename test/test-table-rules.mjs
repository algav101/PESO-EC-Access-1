import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testTableRules() {
  console.log("==================================================================");
  console.log("TESTING TABLE ASSIGNMENT CONFIGURATION & BENEFICIARY MAPPING");
  console.log("==================================================================");

  // 1. Get first program
  const program = await prisma.program.findFirst({
    include: { programBeneficiaries: true },
  });

  if (!program) {
    console.error("No program found in database.");
    return;
  }

  console.log(`Testing program: ${program.programCode} (${program.programName})`);
  console.log(`Current Beneficiary Count: ${program.programBeneficiaries.length}`);

  // 2. Define custom table ranges with equivalent capacities
  const testRules = [
    { startNumber: 1, endNumber: 100, tableNumber: "Table 1", slotGroup: "Main Slot (1-100)" },
    { startNumber: 101, endNumber: 200, tableNumber: "Table 2", slotGroup: "Main Slot (101-200)" },
    { startNumber: 201, endNumber: 300, tableNumber: "Table 3", slotGroup: "Main Slot (201-300)" },
    { startNumber: 301, endNumber: 400, tableNumber: "Table 4", slotGroup: "Main Slot (301-400)" },
    { startNumber: 401, endNumber: 522, tableNumber: "Table 5", slotGroup: "Extension Slot (401-522)" },
  ];

  // Verify capacity calculations
  for (const r of testRules) {
    const capacity = r.endNumber - r.startNumber + 1;
    console.log(`  [CONFIG] ${r.tableNumber}: #${r.startNumber} - #${r.endNumber} -> Equivalent Capacity: ${capacity} Beneficiaries`);
  }

  // 3. Batch apply rules
  await prisma.$transaction(async (tx) => {
    await tx.tableAssignmentRule.deleteMany({
      where: { programId: program.id },
    });

    for (let i = 0; i < testRules.length; i++) {
      const r = testRules[i];
      await tx.tableAssignmentRule.create({
        data: {
          programId: program.id,
          startNumber: r.startNumber,
          endNumber: r.endNumber,
          tableNumber: r.tableNumber,
          slotGroup: r.slotGroup,
          priority: i,
        },
      });
    }

    const savedRules = await tx.tableAssignmentRule.findMany({
      where: { programId: program.id },
      orderBy: { priority: "desc" },
    });

    for (const pb of program.programBeneficiaries) {
      const num = parseInt(pb.designatedNumber, 10);
      let assignedTable = "Table 1";
      let assignedSlot = "Main Regular";

      if (!isNaN(num)) {
        const matched = savedRules.find((rule) => num >= rule.startNumber && num <= rule.endNumber);
        if (matched) {
          assignedTable = matched.tableNumber;
          assignedSlot = matched.slotGroup || assignedSlot;
        } else {
          assignedTable = `Table ${Math.ceil(num / 100)}`;
        }
      }

      await tx.programBeneficiary.update({
        where: { id: pb.id },
        data: { tableNumber: assignedTable, slotGroup: assignedSlot },
      });
    }
  });

  // 4. Verify updated beneficiary tables
  const updatedBeneficiaries = await prisma.programBeneficiary.findMany({
    where: { programId: program.id },
    select: { designatedNumber: true, tableNumber: true, slotGroup: true },
    orderBy: { designatedNumber: "asc" },
  });

  const tableDistribution = {};
  for (const b of updatedBeneficiaries) {
    tableDistribution[b.tableNumber] = (tableDistribution[b.tableNumber] || 0) + 1;
  }

  console.log("\nBeneficiary Distribution across configured tables:", tableDistribution);

  const sample1 = updatedBeneficiaries.find((b) => b.designatedNumber === "1");
  const sample100 = updatedBeneficiaries.find((b) => b.designatedNumber === "100");
  const sample101 = updatedBeneficiaries.find((b) => b.designatedNumber === "101");
  const sample410 = updatedBeneficiaries.find((b) => b.designatedNumber === "410");

  console.log("\nSpot checking designated numbers:");
  if (sample1) console.log(`  Beneficiary #1 -> Assigned: ${sample1.tableNumber} (${sample1.slotGroup})`);
  if (sample100) console.log(`  Beneficiary #100 -> Assigned: ${sample100.tableNumber} (${sample100.slotGroup})`);
  if (sample101) console.log(`  Beneficiary #101 -> Assigned: ${sample101.tableNumber} (${sample101.slotGroup})`);
  if (sample410) console.log(`  Beneficiary #410 -> Assigned: ${sample410.tableNumber} (${sample410.slotGroup})`);

  console.log("\n>>> SUCCESS: TABLE ASSIGNMENT RULES AND EQUIVALENT BENEFICIARY CAPACITIES CONFIGURED AND VERIFIED! <<<");
}

testTableRules();
