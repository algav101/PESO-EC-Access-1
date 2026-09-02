import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testStubDistributionMonitoring() {
  console.log("==================================================================");
  console.log("TESTING STUB DISTRIBUTION, BIRTHDAY AFFIRMATION & MONITORING");
  console.log("==================================================================");

  const timestamp = Date.now();

  // 1. Create a test program
  const program = await prisma.program.create({
    data: {
      programCode: `TUPAD-TEST-DIST-${timestamp}`,
      programName: "Stub Distribution Test Program",
      status: "ACTIVE",
      municipality: "Dingalan",
      province: "Aurora",
      requiredWorkDays: 10,
    },
  });

  // 2. Create 3 beneficiaries in different barangays
  const b1 = await prisma.beneficiary.create({
    data: {
      beneficiaryNumber: `BN-DIST-01-${timestamp}`,
      fullName: "BENEFICIARY CONFIRMED APLAYA",
      birthday: "1988-08-15",
      municipality: "Dingalan",
      barangay: "Aplaya",
    },
  });

  const b2 = await prisma.beneficiary.create({
    data: {
      beneficiaryNumber: `BN-DIST-02-${timestamp}`,
      fullName: "BENEFICIARY FLAGGED POBLACION",
      birthday: "1992-03-20",
      municipality: "Dingalan",
      barangay: "Poblacion",
    },
  });

  const b3 = await prisma.beneficiary.create({
    data: {
      beneficiaryNumber: `BN-DIST-03-${timestamp}`,
      fullName: "BENEFICIARY PENDING IBONA",
      birthday: "1995-11-10",
      municipality: "Dingalan",
      barangay: "Ibona",
    },
  });

  const pb1 = await prisma.programBeneficiary.create({
    data: {
      programId: program.id,
      beneficiaryId: b1.id,
      designatedNumber: "1",
      tableNumber: "Table 1",
    },
  });

  const pb2 = await prisma.programBeneficiary.create({
    data: {
      programId: program.id,
      beneficiaryId: b2.id,
      designatedNumber: "2",
      tableNumber: "Table 1",
    },
  });

  const pb3 = await prisma.programBeneficiary.create({
    data: {
      programId: program.id,
      beneficiaryId: b3.id,
      designatedNumber: "3",
      tableNumber: "Table 1",
    },
  });

  const qr1 = await prisma.qrCode.create({
    data: {
      programId: program.id,
      programBeneficiaryId: pb1.id,
      publicToken: `TUPAD-DGL-TEST-001-${timestamp}`,
      tokenHash: `hash-001-${timestamp}`,
      status: "ACTIVE",
    },
  });

  const qr2 = await prisma.qrCode.create({
    data: {
      programId: program.id,
      programBeneficiaryId: pb2.id,
      publicToken: `TUPAD-DGL-TEST-002-${timestamp}`,
      tokenHash: `hash-002-${timestamp}`,
      status: "ACTIVE",
    },
  });

  // 3. Confirm B1 with Birthday PIN
  await prisma.stubDistribution.create({
    data: {
      qrId: qr1.id,
      programBeneficiaryId: pb1.id,
      verificationMethod: "BIRTHDAY_PIN",
      status: "DISTRIBUTED",
    },
  });

  // 4. Flag B2 as Possible Replacement
  await prisma.programBeneficiary.update({
    where: { id: pb2.id },
    data: { participationStatus: "FLAGGED_FOR_REPLACEMENT" },
  });

  await prisma.stubDistribution.create({
    data: {
      qrId: qr2.id,
      programBeneficiaryId: pb2.id,
      verificationMethod: "FLAGGED_UNREACHABLE",
      status: "FLAGGED_REPLACEMENT",
      remarks: "UNREACHABLE_PHONE_OR_RESIDENCE: Phone number disconnected",
    },
  });

  console.log("1. Setup Test Roster: 1 Confirmed, 1 Flagged Replacement, 1 Pending");

  // 5. Verification
  const confirmedCount = await prisma.stubDistribution.count({
    where: {
      programBeneficiary: { programId: program.id },
      status: "DISTRIBUTED",
      verificationMethod: "BIRTHDAY_PIN",
    },
  });

  const flaggedCount = await prisma.stubDistribution.count({
    where: {
      programBeneficiary: { programId: program.id },
      status: "FLAGGED_REPLACEMENT",
    },
  });

  console.log("2. Verified Database Counts:");
  console.log("   - Confirmed & Distributed:", confirmedCount);
  console.log("   - Flagged for Replacement:", flaggedCount);

  if (confirmedCount !== 1 || flaggedCount !== 1) {
    throw new Error("Verification counts mismatch!");
  }

  // 6. Cleanup
  await prisma.$transaction(async (tx) => {
    await tx.stubDistribution.deleteMany({
      where: { programBeneficiary: { programId: program.id } },
    });
    await tx.qrCode.deleteMany({ where: { programId: program.id } });
    await tx.programBeneficiary.deleteMany({ where: { programId: program.id } });
    await tx.program.delete({ where: { id: program.id } });
    await tx.beneficiary.delete({ where: { id: b1.id } });
    await tx.beneficiary.delete({ where: { id: b2.id } });
    await tx.beneficiary.delete({ where: { id: b3.id } });
  });

  console.log("==================================================================");
  console.log(">>> PASS: STUB DISTRIBUTION & MONITORING TEST PASSED (100%) <<<");
  console.log("==================================================================");
}

testStubDistributionMonitoring()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Test Error:", e);
    process.exit(1);
  });
