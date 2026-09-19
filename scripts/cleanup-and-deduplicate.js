const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function deduplicateAndClean() {
  console.log("=== Starting Masterlist Deduplication & Test Data Cleanup ===");

  // Step 1: Remove sample and test data beneficiaries
  const testKeywords = [
    "AUTOMATED TEST",
    "TEST BENEFICIARY",
    "REPLACEMENT RECIPIENT",
    "SAMPLE BENEFICIARY",
    "DUMMY",
    "TEST USER",
    "DELA CRUZ, JUAN SANTOS",
  ];

  const testBeneficiaries = await prisma.beneficiary.findMany({
    where: {
      OR: testKeywords.map((kw) => ({
        fullName: { contains: kw },
      })),
    },
    select: { id: true, fullName: true },
  });

  console.log(`Found ${testBeneficiaries.length} test/sample beneficiaries to clean.`);
  const testBeneIds = testBeneficiaries.map((b) => b.id);

  if (testBeneIds.length > 0) {
    const testPbs = await prisma.programBeneficiary.findMany({
      where: { beneficiaryId: { in: testBeneIds } },
      select: { id: true },
    });
    const testPbIds = testPbs.map((p) => p.id);

    if (testPbIds.length > 0) {
      await prisma.attendanceRecord.deleteMany({ where: { programBeneficiaryId: { in: testPbIds } } });
      await prisma.orientationAttendance.deleteMany({ where: { programBeneficiaryId: { in: testPbIds } } });
      await prisma.stubDistribution.deleteMany({ where: { programBeneficiaryId: { in: testPbIds } } });
      await prisma.payout.deleteMany({ where: { programBeneficiaryId: { in: testPbIds } } });
      await prisma.qrCode.deleteMany({ where: { programBeneficiaryId: { in: testPbIds } } });
      await prisma.programBeneficiary.deleteMany({ where: { id: { in: testPbIds } } });
    }

    await prisma.dependent.deleteMany({ where: { beneficiaryId: { in: testBeneIds } } });
    await prisma.beneficiaryRestriction.deleteMany({ where: { beneficiaryId: { in: testBeneIds } } });
    await prisma.beneficiary.deleteMany({ where: { id: { in: testBeneIds } } });
    console.log(`✅ Removed ${testBeneIds.length} test beneficiaries and associated records.`);
  }

  // Step 2: Deduplicate ProgramBeneficiaries in each program
  const programs = await prisma.program.findMany({ select: { id: true, programCode: true } });

  for (const prog of programs) {
    console.log(`\nProcessing program: ${prog.programCode} [${prog.id}]`);
    const pbs = await prisma.programBeneficiary.findMany({
      where: { programId: prog.id },
      include: { beneficiary: true, qrCodes: true },
      orderBy: [{ joinedAt: "desc" }],
    });

    console.log(`  Total program beneficiaries before deduplication: ${pbs.length}`);

    const seenDesig = new Map(); // designatedNumber -> primary pbId
    const seenBeneName = new Map(); // fullName -> primary pbId
    const pbIdsToDelete = new Set();

    for (const pb of pbs) {
      const desig = String(pb.designatedNumber || "").trim();
      const name = pb.beneficiary?.fullName?.trim().toUpperCase() || "";

      let isDuplicate = false;

      // Check duplicate designated number
      if (desig && seenDesig.has(desig)) {
        isDuplicate = true;
      }

      // Check duplicate beneficiary name in the same program
      if (name && seenBeneName.has(name)) {
        isDuplicate = true;
      }

      if (isDuplicate) {
        pbIdsToDelete.add(pb.id);
      } else {
        if (desig) seenDesig.set(desig, pb.id);
        if (name) seenBeneName.set(name, pb.id);
      }
    }

    const redundantPbIds = Array.from(pbIdsToDelete);
    console.log(`  Found ${redundantPbIds.length} redundant duplicate ProgramBeneficiary entries.`);

    if (redundantPbIds.length > 0) {
      // Chunked deletion of related records
      const CHUNK_SIZE = 100;
      for (let i = 0; i < redundantPbIds.length; i += CHUNK_SIZE) {
        const chunk = redundantPbIds.slice(i, i + CHUNK_SIZE);
        await prisma.attendanceRecord.deleteMany({ where: { programBeneficiaryId: { in: chunk } } });
        await prisma.orientationAttendance.deleteMany({ where: { programBeneficiaryId: { in: chunk } } });
        await prisma.stubDistribution.deleteMany({ where: { programBeneficiaryId: { in: chunk } } });
        await prisma.payout.deleteMany({ where: { programBeneficiaryId: { in: chunk } } });
        await prisma.qrCode.deleteMany({ where: { programBeneficiaryId: { in: chunk } } });
        await prisma.programBeneficiary.deleteMany({ where: { id: { in: chunk } } });
      }
      console.log(`  ✅ Successfully deleted ${redundantPbIds.length} duplicate ProgramBeneficiaries.`);
    }

    // Update program beneficiary count
    const finalCount = await prisma.programBeneficiary.count({
      where: { programId: prog.id, participationStatus: { not: "REPLACED" } },
    });
    await prisma.program.update({
      where: { id: prog.id },
      data: { beneficiaryCount: finalCount },
    });
    console.log(`  Updated program beneficiary count: ${finalCount}`);
  }

  // Step 3: Deduplicate Global Beneficiary Table (merge duplicate name + birthday profiles)
  console.log("\nChecking Global Beneficiary records for duplicate profiles...");
  const allBenes = await prisma.beneficiary.findMany({
    select: {
      id: true,
      fullName: true,
      birthday: true,
      contactNumber: true,
      barangay: true,
      sitio: true,
      createdAt: true,
      _count: {
        select: {
          programBeneficiaries: true,
        },
      },
    },
    orderBy: [{ createdAt: "asc" }],
  });

  const beneMap = new Map(); // `${fullName}_${birthday}` -> primary Beneficiary
  const beneIdsToDelete = [];

  for (const b of allBenes) {
    const key = `${b.fullName.trim().toUpperCase()}_${b.birthday || ""}`;
    if (!beneMap.has(key)) {
      beneMap.set(key, b);
    } else {
      const primary = beneMap.get(key);
      // Re-link any remaining child records to primary if needed
      await prisma.programBeneficiary.updateMany({
        where: { beneficiaryId: b.id },
        data: { beneficiaryId: primary.id },
      });
      await prisma.dependent.updateMany({
        where: { beneficiaryId: b.id },
        data: { beneficiaryId: primary.id },
      });
      await prisma.beneficiaryRestriction.updateMany({
        where: { beneficiaryId: b.id },
        data: { beneficiaryId: primary.id },
      });
      beneIdsToDelete.push(b.id);
    }
  }

  console.log(`Found ${beneIdsToDelete.length} redundant duplicate global Beneficiary profiles.`);
  if (beneIdsToDelete.length > 0) {
    const CHUNK_SIZE = 100;
    for (let i = 0; i < beneIdsToDelete.length; i += CHUNK_SIZE) {
      const chunk = beneIdsToDelete.slice(i, i + CHUNK_SIZE);
      await prisma.beneficiary.deleteMany({ where: { id: { in: chunk } } });
    }
    console.log(`✅ Deleted ${beneIdsToDelete.length} redundant global Beneficiary duplicates.`);
  }

  console.log("\n🎉 Masterlist Deduplication & Cleanup Completed Successfully!");
}

deduplicateAndClean()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
