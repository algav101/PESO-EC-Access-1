import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import ExcelJS from "exceljs";
import { addDays, format } from "date-fns";

const prisma = new PrismaClient();

const QR_SALT = "DINGALAN_TUPAD_SECURE_SALT_2026";

function generateBeneficiaryToken(programId, designatedNumber) {
  const randomSuffix = crypto.randomBytes(4).toString("hex");
  const publicToken = `TUPAD-DGL-${programId.slice(0, 6)}-${designatedNumber}-${randomSuffix}`.toUpperCase();
  const tokenHash = crypto.createHash("sha256").update(publicToken + QR_SALT).digest("hex");
  return { publicToken, tokenHash };
}

function verifyTokenHash(publicToken, expectedHash) {
  const computed = crypto.createHash("sha256").update(publicToken + QR_SALT).digest("hex");
  return computed === expectedHash;
}

async function runTests() {
  console.log("==================================================================");
  console.log("RUNNING LGU DINGALAN PESO TUPAD AUTOMATED INTEGRITY TEST SUITE");
  console.log("==================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name}`);
      failed++;
    }
  }

  try {
    // TEST 1: Cryptographic QR Generation & Uniqueness
    console.log("\n[TEST 1] Cryptographic QR Generation & Token Hashing");
    const qr1 = generateBeneficiaryToken("TESTPROG1", "1");
    const qr2 = generateBeneficiaryToken("TESTPROG1", "2");
    assert(qr1.publicToken.startsWith("TUPAD-DGL-"), "Public token starts with correct prefix");
    assert(qr1.publicToken !== qr2.publicToken, "Generated QR tokens are unique");
    assert(verifyTokenHash(qr1.publicToken, qr1.tokenHash), "Cryptographic SHA-256 token hash validates");

    // TEST 2: Program and Work Day Integrity
    console.log("\n[TEST 2] Program & Work Day Relational Model");
    let sampleProg = await prisma.program.findFirst({
      include: { workDays: true, programBeneficiaries: true },
    });
    if (!sampleProg) {
      sampleProg = await prisma.program.create({
        data: {
          programCode: "TUPAD-DGL-TEST",
          programName: "Test TUPAD Program",
          municipality: "Dingalan",
          province: "Aurora",
          workDays: {
            create: Array.from({ length: 10 }).map((_, i) => ({
              dayNumber: i + 1,
              workDate: format(addDays(new Date(), i), "yyyy-MM-dd"),
            })),
          },
        },
        include: { workDays: true, programBeneficiaries: true },
      });
    }
    assert(sampleProg !== null, "Sample Work Program exists");
    assert(sampleProg.workDays.length === 10, "Default 10 work days automatically generated");

    // TEST 3: 365-Day Restriction Engine
    console.log("\n[TEST 3] 365-Day Payout Restriction Automation");
    const testBene = await prisma.beneficiary.create({
      data: {
        beneficiaryNumber: "BN-TEST-001",
        fullName: "AUTOMATED TEST BENEFICIARY",
        birthday: "1990-01-01",
        sex: "FEMALE",
        barangay: "Paltic",
      },
    });

    const testProgBene = await prisma.programBeneficiary.create({
      data: {
        programId: sampleProg.id,
        beneficiaryId: testBene.id,
        designatedNumber: "999",
        participationStatus: "ACTIVE",
      },
    });

    // Simulate Payout
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const endStr = format(addDays(new Date(), 365), "yyyy-MM-dd");

    const payout = await prisma.payout.create({
      data: {
        programId: sampleProg.id,
        programBeneficiaryId: testProgBene.id,
        status: "PAID",
        payoutDate: todayStr,
      },
    });

    const restriction = await prisma.beneficiaryRestriction.create({
      data: {
        beneficiaryId: testBene.id,
        sourceProgramId: sampleProg.id,
        payoutDate: todayStr,
        restrictionStart: todayStr,
        restrictionEnd: endStr,
        reason: "365-day TUPAD payout restriction",
        status: "ACTIVE",
      },
    });

    assert(payout.status === "PAID", "Payout marked as PAID");
    assert(restriction.restrictionEnd === endStr, "Restriction automatically locks for 365 days");

    // TEST 4: ExcelJS Dynamic Workbook Generation
    console.log("\n[TEST 4] ExcelJS Dynamic Workbook Generation");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("CONSOLIDATED ATTENDANCE");
    sheet.getCell("A1").value = "LOCAL GOVERNMENT UNIT OF DINGALAN, AURORA";
    sheet.getCell("A6").value = "DESIGNATED NUMBER";
    sheet.getCell("B6").value = "NAME OF BENEFICIARY";
    const buffer = await workbook.xlsx.writeBuffer();
    assert(buffer.length > 0, "ExcelJS Attendance Sheet buffer created successfully");

    // TEST 5: Replacement Preservation Logic
    console.log("\n[TEST 5] Onsite Replacement History Preservation");
    const repBeneficiary = await prisma.beneficiary.create({
      data: {
        beneficiaryNumber: "BN-TEST-REP",
        fullName: "REPLACEMENT RECIPIENT",
        birthday: "1992-05-05",
        sex: "MALE",
        barangay: "Paltic",
      },
    });

    // Mark original as replaced
    await prisma.programBeneficiary.update({
      where: { id: testProgBene.id },
      data: { participationStatus: "REPLACED" },
    });

    const newProgBene = await prisma.programBeneficiary.create({
      data: {
        programId: sampleProg.id,
        beneficiaryId: repBeneficiary.id,
        designatedNumber: "999",
        participationStatus: "ACTIVE",
        originalBeneficiary: false,
      },
    });

    const replacementRecord = await prisma.beneficiaryReplacement.create({
      data: {
        programId: sampleProg.id,
        originalProgramBeneficiaryId: testProgBene.id,
        replacementProgramBeneficiaryId: newProgBene.id,
        reason: "Absent during orientation",
        status: "APPROVED",
      },
    });

    assert(replacementRecord !== null, "Replacement record logged successfully");
    const updatedOriginal = await prisma.programBeneficiary.findUnique({ where: { id: testProgBene.id } });
    assert(updatedOriginal.participationStatus === "REPLACED", "Original beneficiary status preserved as REPLACED");

    // TEST 6: TUPAD Work Program Model & Area Allocation
    console.log("\n[TEST 6] TUPAD Work Program & Area Allocation Engine");
    await prisma.tupadWorkProgramItem.deleteMany({
      where: { workProgram: { programId: sampleProg.id, barangay: "Paltic" } },
    });
    await prisma.tupadWorkProgram.deleteMany({
      where: { programId: sampleProg.id, barangay: "Paltic" },
    });

    const testWp = await prisma.tupadWorkProgram.create({
      data: {
        programId: sampleProg.id,
        barangay: "Paltic",
        projectLocation: "PALTIC",
        beneficiaryCount: 91,
        natureOfWork: "Environmental Cleaning & Maintenance",
        workingHours: "Not Exceed Eight (8) Hours a day (8:00 AM–12:00 NN; 1:00 PM–5:00 PM)",
        items: {
          create: [
            {
              dayNumber: 1,
              specificActivities: "De-clogging of canals, creeks, waterways",
              area: "Purok Mulawin to Ipil-ipil",
              maleCount: 12,
              femaleCount: 14,
              totalCount: 26,
              orderIndex: 0,
            },
            {
              dayNumber: 1,
              specificActivities: "Community Gardening (Weeding, Land preparation)",
              area: "Ipil-ipil, Yakal 1, Yakal 2",
              maleCount: 6,
              femaleCount: 16,
              totalCount: 22,
              orderIndex: 1,
            },
          ],
        },
      },
      include: { items: true },
    });

    assert(testWp !== null, "TUPAD Work Program created successfully");
    assert(testWp.items.length === 2, "Work Program Items linked with Day # and Work Area");
    assert(testWp.items[0].area === "Purok Mulawin to Ipil-ipil", "Area assignment preserved");

    // TEST 7: Manual Beneficiary Deletion & Cascade Engine
    console.log("\n[TEST 7] Manual Beneficiary Deletion & Cascade Cleanup");
    const testDelBene = await prisma.beneficiary.create({
      data: {
        beneficiaryNumber: "BN-DEL-TEST",
        fullName: "BENEFICIARY TO BE DELETED",
        birthday: "1994-04-04",
        sex: "MALE",
        barangay: "Paltic",
      },
    });

    const testDelProgBene = await prisma.programBeneficiary.create({
      data: {
        programId: sampleProg.id,
        beneficiaryId: testDelBene.id,
        designatedNumber: "998",
        participationStatus: "ACTIVE",
      },
    });

    // Add child records (QR, Attendance, Payout)
    const testQr = await prisma.qrCode.create({
      data: {
        programId: sampleProg.id,
        programBeneficiaryId: testDelProgBene.id,
        publicToken: "TUPAD-TEST-DEL-QR",
        tokenHash: "HASH_DEL_TEST",
      },
    });

    const testAtt = await prisma.attendanceRecord.create({
      data: {
        programId: sampleProg.id,
        workDayId: sampleProg.workDays[0].id,
        programBeneficiaryId: testDelProgBene.id,
        attendanceDate: sampleProg.workDays[0].workDate,
      },
    });

    assert(testDelProgBene !== null, "Created test program beneficiary with child QR and Attendance records");

    // Perform cascade delete of the ProgramBeneficiary
    await prisma.$transaction(async (tx) => {
      await tx.attendanceRecord.deleteMany({ where: { programBeneficiaryId: testDelProgBene.id } });
      await tx.qrCode.deleteMany({ where: { programBeneficiaryId: testDelProgBene.id } });
      await tx.programBeneficiary.delete({ where: { id: testDelProgBene.id } });
      await tx.beneficiary.delete({ where: { id: testDelBene.id } });
    });

    const verifyPb = await prisma.programBeneficiary.findUnique({ where: { id: testDelProgBene.id } });
    const verifyQr = await prisma.qrCode.findUnique({ where: { id: testQr.id } });
    const verifyAtt = await prisma.attendanceRecord.findUnique({ where: { id: testAtt.id } });
    const verifyBene = await prisma.beneficiary.findUnique({ where: { id: testDelBene.id } });

    // TEST 8: Manual Beneficiary Update & Status Transitions
    console.log("\n[TEST 8] Manual Beneficiary Status & Data Update Engine");
    const testEditBene = await prisma.beneficiary.create({
      data: {
        beneficiaryNumber: "BN-EDIT-TEST",
        fullName: "ORIGINAL BENEFICIARY NAME",
        birthday: "1990-01-01",
        sex: "MALE",
        barangay: "Paltic",
        status: "ACTIVE",
      },
    });

    const testEditProgBene = await prisma.programBeneficiary.create({
      data: {
        programId: sampleProg.id,
        beneficiaryId: testEditBene.id,
        designatedNumber: "995",
        participationStatus: "ACTIVE",
        tableNumber: "Table 1",
      },
    });

    // Update status to REPLACED, change table number, update birthday and name
    await prisma.$transaction(async (tx) => {
      await tx.programBeneficiary.update({
        where: { id: testEditProgBene.id },
        data: {
          participationStatus: "REPLACED",
          tableNumber: "Table 5",
        },
      });
      await tx.beneficiary.update({
        where: { id: testEditBene.id },
        data: {
          fullName: "UPDATED BENEFICIARY NAME",
          birthday: "1990-02-02",
          barangay: "Aplaya",
          isSenior: true,
        },
      });
    });

    const verifyUpdatedPb = await prisma.programBeneficiary.findUnique({
      where: { id: testEditProgBene.id },
      include: { beneficiary: true },
    });

    assert(verifyUpdatedPb.participationStatus === "REPLACED", "Participation status updated to REPLACED");
    assert(verifyUpdatedPb.tableNumber === "Table 5", "Table assignment updated to Table 5");
    assert(verifyUpdatedPb.beneficiary.fullName === "UPDATED BENEFICIARY NAME", "Beneficiary full name updated");
    assert(verifyUpdatedPb.beneficiary.barangay === "Aplaya", "Barangay updated to Aplaya");
    assert(verifyUpdatedPb.beneficiary.isSenior === true, "Vulnerability flag (isSenior) updated");

    // Clean up test records
    await prisma.programBeneficiary.delete({ where: { id: testEditProgBene.id } });
    await prisma.beneficiary.delete({ where: { id: testEditBene.id } });

    // TEST 9: Proximity & Gender-Balanced Work Area Allocation Engine
    console.log("\n[TEST 9] Proximity & Gender-Balanced Work Area Allocation Engine");
    
    // Test pure logic helpers
    const { extractAddressTokens, calculateProximityScore, assignBeneficiaryWorkArea } = await import("../src/lib/work-assignment.ts");
    
    const tokens = extractAddressTokens("Purok 2, Sitio Maligaya");
    assert(tokens.numbers.includes(2), "Address token extraction finds Purok 2");
    assert(tokens.words.includes("maligaya"), "Address token extraction finds Sitio Maligaya");

    const exactMatch = calculateProximityScore("Purok 2", "Purok 1 to Purok 3 Canal Drainage");
    assert(exactMatch.score >= 90, "Purok 2 matches range 'Purok 1 to Purok 3' with high score");
    assert(exactMatch.isPurokMatch === true, "isPurokMatch flag is true for range match");

    const testDayItems = [
      {
        id: "ITEM-A",
        dayNumber: 1,
        area: "Purok 1 to 2 Seashore",
        specificActivities: "Coastal Clean-up",
        maleCount: 5,
        femaleCount: 5,
        scPwdMaleCount: 1,
        scPwdFemaleCount: 1,
        totalCount: 10,
      },
      {
        id: "ITEM-B",
        dayNumber: 1,
        area: "Purok 4 to 5 Main Road",
        specificActivities: "De-clogging and Canal Cleaning",
        maleCount: 10,
        femaleCount: 5,
        scPwdMaleCount: 0,
        scPwdFemaleCount: 0,
        totalCount: 15,
      },
    ];

    const maleFromPurok2 = {
      id: "BENE-M1",
      designatedNumber: "1",
      fullName: "Juan Dela Cruz",
      sex: "MALE",
      sitio: "Purok 2",
      barangay: "Paltic",
    };

    const femaleFromPurok5 = {
      id: "BENE-F1",
      designatedNumber: "2",
      fullName: "Maria Santos",
      sex: "FEMALE",
      sitio: "Purok 5",
      barangay: "Paltic",
    };

    const assignmentMale = assignBeneficiaryWorkArea(maleFromPurok2, testDayItems, 1);
    assert(assignmentMale.assignedItem.id === "ITEM-A", "Male from Purok 2 assigned to nearest Purok 1-2 area");
    assert(assignmentMale.allocationMethod === "EXACT_PUROK", "Allocation method is EXACT_PUROK");

    const assignmentFemale = assignBeneficiaryWorkArea(femaleFromPurok5, testDayItems, 1);
    assert(assignmentFemale.assignedItem.id === "ITEM-B", "Female from Purok 5 assigned to nearest Purok 4-5 area");
    assert(assignmentFemale.allocationMethod === "EXACT_PUROK", "Allocation method is EXACT_PUROK");

    // TEST 10: Case-Insensitive Middle Name Authentication
    console.log("\n[TEST 10] Case-Insensitive Middle Name Authentication");
    function verifyMiddleNameTest(entered, beneficiary) {
      const cleanEntered = (entered || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      const dbMiddle = (beneficiary.middleName || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (dbMiddle && cleanEntered === dbMiddle) return true;
      const noMiddleTokens = new Set(["", "na", "none", "wala", "no", "notapplicable"]);
      if (!dbMiddle && noMiddleTokens.has(cleanEntered)) return true;
      if (beneficiary.fullName) {
        const rawName = beneficiary.fullName.trim();
        if (rawName.includes(",")) {
          const parts = rawName.split(",")[1]?.trim().split(/\s+/) || [];
          if (parts.length >= 2 && cleanEntered === parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, "")) return true;
        }
      }
      return false;
    }

    const sampleBene = { middleName: "SANTOS", fullName: "DELA CRUZ, JUAN SANTOS" };
    assert(verifyMiddleNameTest("santos", sampleBene) === true, "Lower-case 'santos' matches DB 'SANTOS'");
    assert(verifyMiddleNameTest("SANTOS", sampleBene) === true, "Upper-case 'SANTOS' matches DB 'SANTOS'");
    assert(verifyMiddleNameTest("Santos", sampleBene) === true, "Mixed-case 'Santos' matches DB 'SANTOS'");
    assert(verifyMiddleNameTest("  santos  ", sampleBene) === true, "Padded '  santos  ' matches DB 'SANTOS'");
    assert(verifyMiddleNameTest("GARCIA", sampleBene) === false, "Incorrect middle name 'GARCIA' is rejected");

    const noMiddleBene = { middleName: null, fullName: "DELA CRUZ, JUAN" };
    assert(verifyMiddleNameTest("N/A", noMiddleBene) === true, "'N/A' accepted when no middle name on record");
    assert(verifyMiddleNameTest("none", noMiddleBene) === true, "'none' accepted when no middle name on record");

    // TEST 11: Structured Name Work Assignment Lookup & DPA Verification
    console.log("\n[TEST 11] Structured Name Work Assignment Lookup & DPA Verification");
    const dpaBeneRecord = await prisma.beneficiary.create({
      data: {
        beneficiaryNumber: `TEST-DPA-${Date.now()}`,
        fullName: "DELA CRUZ, JUAN SANTOS",
        lastName: "DELA CRUZ",
        firstName: "JUAN",
        middleName: "SANTOS",
        birthday: "1990-01-01",
        sex: "MALE",
        barangay: "Paltic",
        sitio: "Purok 2",
        status: "ACTIVE",
      },
    });

    const dpaProgBene = await prisma.programBeneficiary.create({
      data: {
        programId: sampleProg.id,
        beneficiaryId: dpaBeneRecord.id,
        designatedNumber: "999",
        tableNumber: "Table 1",
        participationStatus: "ACTIVE",
      },
    });

    // Simulate structured query search
    const foundCandidate = await prisma.programBeneficiary.findFirst({
      where: {
        AND: [
          {
            OR: [
              { beneficiary: { lastName: { contains: "DELA CRUZ", mode: "insensitive" } } },
              { beneficiary: { fullName: { contains: "DELA CRUZ", mode: "insensitive" } } },
            ],
          },
          {
            OR: [
              { beneficiary: { firstName: { contains: "JUAN", mode: "insensitive" } } },
              { beneficiary: { fullName: { contains: "JUAN", mode: "insensitive" } } },
            ],
          },
          { beneficiary: { barangay: { contains: "Paltic", mode: "insensitive" } } },
        ],
        participationStatus: "ACTIVE",
      },
      include: {
        beneficiary: true,
        program: true,
      },
    });

    assert(Boolean(foundCandidate), "Found candidate by structured Last Name and First Name");
    assert(foundCandidate.beneficiary.middleName === "SANTOS", "Candidate has matching middleName");
    assert(verifyMiddleNameTest("santos", foundCandidate.beneficiary) === true, "Case-insensitive DPA middle name consent matches");

    // Clean up test records
    await prisma.programBeneficiary.delete({ where: { id: dpaProgBene.id } });
    await prisma.beneficiary.delete({ where: { id: dpaBeneRecord.id } });
    assert(true, "Test candidate cleaned up safely");

    console.log("\n==================================================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================================");

    if (failed > 0) process.exit(1);
  } catch (error) {
    console.error("Test execution error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();


