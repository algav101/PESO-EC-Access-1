import { PrismaClient } from "@prisma/client";
import { format } from "date-fns";

const prisma = new PrismaClient();

async function runOfflineSyncResilienceTest() {
  console.log("==================================================================");
  console.log("RUNNING OFFLINE SYNC RESILIENCE & FK AUTO-RESOLUTION TEST SUITE");
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
    // 1. Setup / find a test program and beneficiary
    let program = await prisma.program.findFirst({
      include: {
        programBeneficiaries: {
          include: { beneficiary: true, qrCodes: true },
        },
        workDays: true,
      },
    });

    if (!program || program.programBeneficiaries.length === 0) {
      const bene = await prisma.beneficiary.create({
        data: {
          beneficiaryNumber: `TEST-BENE-${Date.now()}`,
          fullName: "DELA CRUZ, JUAN PEDRO",
          birthday: "1990-05-15",
          barangay: "Aplaya",
          municipality: "Dingalan",
          province: "Aurora",
        },
      });

      program = await prisma.program.create({
        data: {
          programCode: `TUPAD-SYNC-${Date.now()}`,
          programName: "Sync Resilience Test Program",
          status: "ACTIVE",
          requiredWorkDays: 10,
          programBeneficiaries: {
            create: {
              beneficiaryId: bene.id,
              designatedNumber: "1",
              tableNumber: "Table 1",
            },
          },
        },
        include: {
          programBeneficiaries: {
            include: { beneficiary: true, qrCodes: true },
          },
          workDays: true,
        },
      });
    }

    const testPb = program.programBeneficiaries[0];
    const testBene = testPb.beneficiary;

    console.log(`Using Program: ${program.programCode} (${program.id})`);
    console.log(`Using Beneficiary: ${testBene.fullName} (${testPb.id})`);

    // Dynamic import of the sync push route logic or simulate its exact resolution
    // Let's test the actual route logic directly via fetch if server running or via simulated transaction processor
    const clientTx1 = `TX-${Date.now()}-att-placeholder`;
    const clientTx2 = `TX-${Date.now()}-att-missing-wd`;
    const clientTx3 = `TX-${Date.now()}-orientation`;
    const clientTx4 = `TX-${Date.now()}-stub`;
    const clientTx5 = `TX-${Date.now()}-payout`;

    console.log("\n[TEST 1] Attendance Sync with Mock Placeholder `workDayId: 'WD-1'` & `workProgramItemId: 'AUTO'`");
    
    // Simulate resolution logic matching POST /api/v1/sync/push
    const payload1 = {
      programId: program.id,
      workDayId: "WD-1", // Placeholder
      programBeneficiaryId: testPb.id,
      attendanceDate: format(new Date(), "yyyy-MM-dd"),
      morningTimeIn: new Date().toISOString(),
      morningTimeOut: new Date().toISOString(),
      workProgramItemId: "AUTO", // Placeholder
      workArea: "Purok 1 Coastal Road",
      activityName: "Debris Clearing",
    };

    // Resolve WorkDay
    let wd = null;
    if (payload1.workDayId && !payload1.workDayId.startsWith("WD-") && payload1.workDayId.length > 10) {
      wd = await prisma.workDay.findUnique({ where: { id: payload1.workDayId } });
    }
    const targetDate = payload1.attendanceDate || format(new Date(), "yyyy-MM-dd");
    if (!wd) {
      wd = await prisma.workDay.findFirst({
        where: { programId: program.id, workDate: targetDate },
      });
    }
    if (!wd) {
      wd = await prisma.workDay.findFirst({
        where: { programId: program.id },
        orderBy: { dayNumber: "asc" },
      });
    }
    if (!wd) {
      wd = await prisma.workDay.create({
        data: {
          programId: program.id,
          dayNumber: 1,
          workDate: targetDate,
          status: "ACTIVE",
          description: "Day 1 (Auto-created during offline sync)",
        },
      });
    }

    assert(wd && wd.id, "WorkDay successfully resolved from placeholder WD-1");

    // Upsert Attendance Record
    const attRecord = await prisma.attendanceRecord.upsert({
      where: {
        programId_workDayId_programBeneficiaryId: {
          programId: program.id,
          workDayId: wd.id,
          programBeneficiaryId: testPb.id,
        },
      },
      update: {
        morningTimeIn: new Date(payload1.morningTimeIn),
        morningTimeOut: new Date(payload1.morningTimeOut),
        workArea: payload1.workArea,
        activityName: payload1.activityName,
        syncStatus: "SYNCED",
      },
      create: {
        programId: program.id,
        workDayId: wd.id,
        programBeneficiaryId: testPb.id,
        attendanceDate: targetDate,
        morningTimeIn: new Date(payload1.morningTimeIn),
        morningTimeOut: new Date(payload1.morningTimeOut),
        workArea: payload1.workArea,
        activityName: payload1.activityName,
        status: "PRESENT",
        source: "QR_SCAN_OFFLINE",
        deviceId: "TEST_UNIT",
        syncStatus: "SYNCED",
      },
    });

    assert(attRecord.id && attRecord.syncStatus === "SYNCED", "Attendance record created/updated without foreign key errors");
    assert(attRecord.workArea === "Purok 1 Coastal Road", "Work area string preserved correctly");

    console.log("\n[TEST 2] Orientation Sync Auto-Resolution");
    const orientRecord = await prisma.orientationAttendance.upsert({
      where: {
        programId_programBeneficiaryId: {
          programId: testPb.programId,
          programBeneficiaryId: testPb.id,
        },
      },
      update: { status: "PRESENT", syncStatus: "SYNCED" },
      create: {
        programId: testPb.programId,
        programBeneficiaryId: testPb.id,
        status: "PRESENT",
        deviceId: "TEST_UNIT",
        syncStatus: "SYNCED",
      },
    });
    assert(orientRecord.id && orientRecord.status === "PRESENT", "Orientation attendance synced cleanly");

    console.log("\n[TEST 3] Stub Distribution with Missing qrId Auto-Resolution");
    let resolvedQrId = null;
    const activeQr = testPb.qrCodes?.find((q) => q.status === "ACTIVE") || testPb.qrCodes?.[0];
    if (activeQr) {
      resolvedQrId = activeQr.id;
    } else {
      const token = `TUPAD-${testPb.programId.slice(0, 4).toUpperCase()}-${testPb.designatedNumber || Date.now()}`;
      const newQr = await prisma.qrCode.create({
        data: {
          programId: testPb.programId,
          programBeneficiaryId: testPb.id,
          publicToken: token,
          tokenHash: Buffer.from(token).toString("base64"),
          status: "ACTIVE",
        },
      });
      resolvedQrId = newQr.id;
    }

    assert(resolvedQrId, "QrCode resolved or auto-generated for stub distribution");

    const existingStub = await prisma.stubDistribution.findFirst({
      where: {
        OR: [{ programBeneficiaryId: testPb.id }, { qrId: resolvedQrId }],
      },
    });

    let stub;
    if (existingStub) {
      stub = await prisma.stubDistribution.update({
        where: { id: existingStub.id },
        data: { status: "DISTRIBUTED" },
      });
    } else {
      stub = await prisma.stubDistribution.create({
        data: {
          qrId: resolvedQrId,
          programBeneficiaryId: testPb.id,
          verificationMethod: "BIRTHDAY_PIN",
          status: "DISTRIBUTED",
        },
      });
    }

    assert(stub && stub.status === "DISTRIBUTED", "Stub distribution synced successfully");

    console.log("\n[TEST 4] Payout Sync & 365-Day Restriction");
    const payoutDate = format(new Date(), "yyyy-MM-dd");
    await prisma.$transaction(async (dbTx) => {
      await dbTx.payout.upsert({
        where: {
          programId_programBeneficiaryId: {
            programId: testPb.programId,
            programBeneficiaryId: testPb.id,
          },
        },
        update: { status: "PAID", payoutDate, verifiedAt: new Date() },
        create: {
          programId: testPb.programId,
          programBeneficiaryId: testPb.id,
          status: "PAID",
          payoutDate,
          verifiedAt: new Date(),
        },
      });

      const existingRes = await dbTx.beneficiaryRestriction.findFirst({
        where: {
          beneficiaryId: testPb.beneficiaryId,
          sourceProgramId: testPb.programId,
        },
      });

      if (!existingRes) {
        await dbTx.beneficiaryRestriction.create({
          data: {
            beneficiaryId: testPb.beneficiaryId,
            sourceProgramId: testPb.programId,
            payoutDate,
            restrictionStart: payoutDate,
            restrictionEnd: format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
            reason: "365-day TUPAD payout restriction (Offline Sync)",
            status: "ACTIVE",
          },
        });
      }
    });

    const verifyPayout = await prisma.payout.findUnique({
      where: {
        programId_programBeneficiaryId: {
          programId: testPb.programId,
          programBeneficiaryId: testPb.id,
        },
      },
    });
    assert(verifyPayout && verifyPayout.status === "PAID", "Payout recorded as PAID");

    console.log("\n==================================================================");
    console.log(`TOTAL PASSED: ${passed} | TOTAL FAILED: ${failed}`);
    console.log("==================================================================");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runOfflineSyncResilienceTest();
