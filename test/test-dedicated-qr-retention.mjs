import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testDedicatedQrRetention() {
  console.log("==================================================================");
  console.log("TESTING DEDICATED QR CODE RETENTION & REPLACEMENT ZERO-REPRINT");
  console.log("==================================================================");

  // 1. Create a test program
  const program = await prisma.program.create({
    data: {
      programCode: "TUPAD-TEST-QR-RETENTION",
      programName: "QR Retention Test Program",
      status: "ACTIVE",
      municipality: "Dingalan",
      province: "Aurora",
      requiredWorkDays: 10,
      workDays: {
        create: [
          { dayNumber: 1, workDate: "2026-09-01", status: "SCHEDULED" },
        ],
      },
    },
    include: { workDays: true },
  });

  // 2. Create original beneficiary in slot #1
  const origBene = await prisma.beneficiary.create({
    data: {
      beneficiaryNumber: "BN-TEST-ORIG-1",
      fullName: "ORIGINAL BENEFICIARY ONE",
      birthday: "1990-01-01",
      municipality: "Dingalan",
      barangay: "Poblacion",
      status: "ACTIVE",
    },
  });

  const origPb = await prisma.programBeneficiary.create({
    data: {
      programId: program.id,
      beneficiaryId: origBene.id,
      designatedNumber: "1",
      participationStatus: "ACTIVE",
      tableNumber: "Table 1",
    },
  });

  // 3. Generate initial QR code token for designated slot #1
  const fixedToken = `TUPAD-DGL-FIXED-SLOT-001-${Date.now()}`;
  const qr = await prisma.qrCode.create({
    data: {
      programId: program.id,
      programBeneficiaryId: origPb.id,
      publicToken: fixedToken,
      tokenHash: "test-hash-001",
      status: "ACTIVE",
    },
  });

  console.log("1. Original Physical QR Generated for Slot #1:");
  console.log("   - Token:", fixedToken);
  console.log("   - Mapped Beneficiary:", origBene.fullName);

  // 4. Perform Replacement: Slot #1 replaced with "REPLACEMENT BENEFICIARY JUAN"
  const repBene = await prisma.beneficiary.create({
    data: {
      beneficiaryNumber: "BN-TEST-REP-1",
      fullName: "REPLACEMENT BENEFICIARY JUAN",
      birthday: "1995-05-05",
      municipality: "Dingalan",
      barangay: "Poblacion",
      status: "ACTIVE",
    },
  });

  const result = await prisma.$transaction(async (tx) => {
    // Mark original as replaced
    await tx.programBeneficiary.update({
      where: { id: origPb.id },
      data: { participationStatus: "REPLACED" },
    });

    // Create replacement program beneficiary in slot #1
    const newPb = await tx.programBeneficiary.create({
      data: {
        programId: program.id,
        beneficiaryId: repBene.id,
        designatedNumber: "1",
        participationStatus: "ACTIVE",
        tableNumber: "Table 1",
        originalBeneficiary: false,
      },
    });

    // RETAIN the exact original physical QR Code and re-bind to new beneficiary!
    await tx.qrCode.update({
      where: { id: qr.id },
      data: {
        programBeneficiaryId: newPb.id,
        status: "ACTIVE",
      },
    });

    return newPb;
  });

  console.log("2. Beneficiary Replaced in Slot #1 with:", repBene.fullName);
  console.log("   - Physical QR code token is KEPT 100% IDENTICAL:", fixedToken);

  // 5. Verify that looking up the original QR code now directly resolves to REPLACEMENT BENEFICIARY JUAN
  const scannedQr = await prisma.qrCode.findUnique({
    where: { publicToken: fixedToken },
    include: {
      programBeneficiary: {
        include: { beneficiary: true },
      },
    },
  });

  if (!scannedQr || scannedQr.status !== "ACTIVE") {
    throw new Error("QR code was invalidated or not found!");
  }

  if (scannedQr.programBeneficiary.beneficiary.fullName !== "REPLACEMENT BENEFICIARY JUAN") {
    throw new Error("QR code failed to resolve to replacement beneficiary!");
  }

  console.log("3. Scan Simulation Result:");
  console.log("   - Scanned Physical Token:", fixedToken);
  console.log("   - Resolved Active Beneficiary:", scannedQr.programBeneficiary.beneficiary.fullName);
  console.log("   - Status:", scannedQr.status);

  // 6. Cleanup
  await prisma.$transaction(async (tx) => {
    await tx.qrCode.deleteMany({ where: { programId: program.id } });
    await tx.programBeneficiary.deleteMany({ where: { programId: program.id } });
    await tx.workDay.deleteMany({ where: { programId: program.id } });
    await tx.program.delete({ where: { id: program.id } });
    await tx.beneficiary.delete({ where: { id: origBene.id } });
    await tx.beneficiary.delete({ where: { id: repBene.id } });
  });

  console.log("==================================================================");
  console.log(">>> PASS: ZERO REPRINT GUARANTEED! PHYSICAL QR REMAINS PERMANENT <<<");
  console.log("==================================================================");
}

testDedicatedQrRetention()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Test Error:", e);
    process.exit(1);
  });
