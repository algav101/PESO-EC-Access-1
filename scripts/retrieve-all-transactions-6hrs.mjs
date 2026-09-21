import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function retrieve6HoursTransactions() {
  console.log("================================================================================");
  console.log("PESO TUPAD DINGALAN - 6-HOUR TRANSACTION & AUDIT TRAIL RETRIEVAL");
  console.log("Local Time Window: 2026-09-21 04:00:00 AM to 10:05:00 AM PST");
  console.log("UTC Time Window:   2026-09-20T20:00:00.000Z to 2026-09-21T02:05:00.000Z");
  console.log("Target: Domain Master / Super Admin Account (@admin)");
  console.log("================================================================================");

  // 6 hours ago from 10:01 AM PST is 04:01 AM PST.
  // To be ultra thorough and catch everything today, we will check from 2026-09-20T20:00:00.000Z (04:00 AM PST)
  // and also check midnight 2026-09-20T16:00:00.000Z (00:00 AM PST).
  const filterSince6Hours = new Date("2026-09-20T20:00:00.000Z"); // 4:00 AM PST
  const filterSinceMidnight = new Date("2026-09-20T16:00:00.000Z"); // 12:00 AM midnight PST

  // 1. Domain Master User
  const domainMaster = await prisma.user.findFirst({
    where: {
      OR: [
        { role: "DOMAIN_MASTER" },
        { username: "admin" }
      ]
    }
  });

  console.log(`\nSuper Admin / Domain Master Account: ${domainMaster?.fullName} (${domainMaster?.username}) [ID: ${domainMaster?.id}]`);

  // 2. Attendance Records (Last 6 Hours & Today)
  const attendance6h = await prisma.attendanceRecord.findMany({
    where: {
      OR: [
        { createdAt: { gte: filterSince6Hours } },
        { updatedAt: { gte: filterSince6Hours } },
        { morningTimeIn: { gte: filterSince6Hours } },
        { morningTimeOut: { gte: filterSince6Hours } },
        { afternoonTimeIn: { gte: filterSince6Hours } },
        { afternoonTimeOut: { gte: filterSince6Hours } }
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
    orderBy: { createdAt: 'asc' }
  });

  console.log(`\n[1] ATTENDANCE RECORDS (Past 6 Hours): Found ${attendance6h.length} records`);
  const attScanners = {};
  const attBrgys = {};
  for (const r of attendance6h) {
    const scanner = r.scannedBy ? `${r.scannedBy.fullName} (@${r.scannedBy.username}, ${r.scannedBy.role})` : "Direct / System";
    const bgy = r.programBeneficiary?.beneficiary?.barangay || "Unknown";
    attScanners[scanner] = (attScanners[scanner] || 0) + 1;
    attBrgys[bgy] = (attBrgys[bgy] || 0) + 1;
  }
  console.log("  By User/Scanner:", attScanners);
  console.log("  By Barangay:", attBrgys);

  // 3. Accomplishment Photos (Last 6 Hours & Today)
  const photos6h = await prisma.accomplishmentPhoto.findMany({
    where: {
      OR: [
        { uploadedAt: { gte: filterSince6Hours } },
        { capturedAt: { gte: filterSince6Hours } }
      ]
    },
    include: {
      program: { select: { programCode: true, programName: true } },
      workDay: { select: { dayNumber: true, workDate: true } },
      workProgramItem: true,
      uploadedBy: { select: { id: true, username: true, fullName: true, role: true, assignedBarangay: true } },
      approvedBy: { select: { id: true, username: true, fullName: true, role: true } }
    },
    orderBy: { uploadedAt: 'asc' }
  });

  console.log(`\n[2] ACCOMPLISHMENT PHOTOS (Past 6 Hours): Found ${photos6h.length} photos`);
  for (const p of photos6h) {
    console.log(`  - Photo [${p.id}]`);
    console.log(`    Barangay: ${p.barangay}, Sitio: ${p.sitio || 'N/A'}, Work Area: ${p.workArea || 'N/A'}`);
    console.log(`    Day ${p.workDay?.dayNumber || 1} (${p.workDay?.workDate || '2026-09-21'}), GPS: ${p.latitude}, ${p.longitude}`);
    console.log(`    Uploader: ${p.uploadedBy?.fullName} (@${p.uploadedBy?.username}, ${p.uploadedBy?.role})`);
    console.log(`    Status: ${p.status}, Approver: ${p.approvedBy?.fullName || 'Auto/Pending'}`);
    console.log(`    Captured: ${p.capturedAt?.toISOString()}, Uploaded: ${p.uploadedAt.toISOString()}`);
  }

  // 4. Audit Logs (All Transactions by all users in last 6 Hours)
  const auditLogs6h = await prisma.auditLog.findMany({
    where: { createdAt: { gte: filterSince6Hours } },
    include: {
      user: { select: { id: true, username: true, fullName: true, role: true, assignedBarangay: true } }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`\n[3] AUDIT TRANSACTIONS (Past 6 Hours): Found ${auditLogs6h.length} transactions`);
  const actionsSummary = {};
  const userActionsSummary = {};
  for (const log of auditLogs6h) {
    actionsSummary[log.action] = (actionsSummary[log.action] || 0) + 1;
    const actor = log.user ? `${log.user.fullName} (@${log.user.username})` : 'Unauthenticated / System';
    userActionsSummary[actor] = (userActionsSummary[actor] || 0) + 1;
  }
  console.log("  Action Summary:", actionsSummary);
  console.log("  User Transaction Summary:", userActionsSummary);

  // 5. Stub Distributions (Past 6 Hours)
  const stubDistributions6h = await prisma.stubDistribution.findMany({
    where: { distributedAt: { gte: filterSince6Hours } },
    include: {
      distributedBy: { select: { username: true, fullName: true, role: true } },
      programBeneficiary: { include: { beneficiary: true } }
    }
  });
  console.log(`\n[4] STUB DISTRIBUTIONS (Past 6 Hours): Found ${stubDistributions6h.length} records`);

  // 6. Orientation Attendance (Past 6 Hours)
  const orientationAttendances6h = await prisma.orientationAttendance.findMany({
    where: { scannedAt: { gte: filterSince6Hours } },
    include: {
      scannedBy: { select: { username: true, fullName: true, role: true } },
      programBeneficiary: { include: { beneficiary: true } }
    }
  });
  console.log(`\n[5] ORIENTATION ATTENDANCES (Past 6 Hours): Found ${orientationAttendances6h.length} records`);

  // 7. Beneficiary Replacements (Past 6 Hours)
  const replacements6h = await prisma.beneficiaryReplacement.findMany({
    where: { initiatedAt: { gte: filterSince6Hours } },
    include: {
      initiatedBy: { select: { username: true, fullName: true, role: true } },
      approvedBy: { select: { username: true, fullName: true, role: true } },
      originalProgramBeneficiary: { include: { beneficiary: true } },
      replacementProgramBeneficiary: { include: { beneficiary: true } }
    }
  });
  console.log(`\n[6] BENEFICIARY REPLACEMENTS (Past 6 Hours): Found ${replacements6h.length} records`);

  // 8. Payout Verifications (Past 6 Hours)
  const payouts6h = await prisma.payout.findMany({
    where: { createdAt: { gte: filterSince6Hours } },
    include: {
      verifiedBy: { select: { username: true, fullName: true, role: true } },
      programBeneficiary: { include: { beneficiary: true } }
    }
  });
  console.log(`\n[7] PAYOUT VERIFICATIONS (Past 6 Hours): Found ${payouts6h.length} records`);

  // 9. QR Print Batches & Logs (Past 6 Hours)
  const printLogs6h = await prisma.qrPrintLog.findMany({
    where: { printedAt: { gte: filterSince6Hours } },
    include: {
      printedBy: { select: { username: true, fullName: true, role: true } }
    }
  });
  console.log(`\n[8] QR PRINT LOGS (Past 6 Hours): Found ${printLogs6h.length} records`);

  // 10. Public Messages / Inquiries (Past 6 Hours)
  const messages6h = await prisma.publicInquiryMessage.findMany({
    where: { createdAt: { gte: filterSince6Hours } }
  });
  console.log(`\n[9] PUBLIC INQUIRIES (Past 6 Hours): Found ${messages6h.length} records`);

  // Consolidated Master JSON
  const consolidatedMaster = {
    metadata: {
      title: "Consolidated Master Data - Last 6 Hours (September 21, 2026)",
      retrievedAt: new Date().toISOString(),
      timeWindow: {
        startPST: "2026-09-21 04:00:00 PST",
        endPST: "2026-09-21 10:05:00 PST",
        startUTC: filterSince6Hours.toISOString(),
        endUTC: new Date().toISOString()
      },
      superAdmin: {
        id: domainMaster?.id,
        username: domainMaster?.username,
        name: domainMaster?.fullName,
        role: domainMaster?.role
      }
    },
    totals: {
      attendanceRecords: attendance6h.length,
      accomplishmentPhotos: photos6h.length,
      auditTransactions: auditLogs6h.length,
      stubDistributions: stubDistributions6h.length,
      orientationAttendances: orientationAttendances6h.length,
      replacements: replacements6h.length,
      payouts: payouts6h.length,
      qrPrintLogs: printLogs6h.length,
      publicInquiries: messages6h.length
    },
    breakdownByBarangay: attBrgys,
    breakdownByScannerUser: attScanners,
    breakdownByAction: actionsSummary,
    transactionsByActor: userActionsSummary,
    attendanceRecords: attendance6h.map(a => ({
      id: a.id,
      designatedNumber: a.programBeneficiary?.designatedNumber,
      beneficiaryName: `${a.programBeneficiary?.beneficiary?.lastName}, ${a.programBeneficiary?.beneficiary?.firstName}`,
      barangay: a.programBeneficiary?.beneficiary?.barangay,
      sitio: a.programBeneficiary?.beneficiary?.sitio,
      dayNumber: a.workDay?.dayNumber,
      workDate: a.workDay?.workDate,
      morningTimeIn: a.morningTimeIn?.toISOString(),
      morningTimeOut: a.morningTimeOut?.toISOString(),
      afternoonTimeIn: a.afternoonTimeIn?.toISOString(),
      afternoonTimeOut: a.afternoonTimeOut?.toISOString(),
      status: a.status,
      syncStatus: a.syncStatus,
      workArea: a.workArea || a.workProgramItem?.area,
      specificActivity: a.activityName || a.workProgramItem?.specificActivities,
      scannedBy: a.scannedBy ? {
        id: a.scannedBy.id,
        name: a.scannedBy.fullName,
        username: a.scannedBy.username,
        role: a.scannedBy.role,
        assignedBarangay: a.scannedBy.assignedBarangay
      } : null
    })),
    accomplishmentPhotos: photos6h.map(p => ({
      id: p.id,
      barangay: p.barangay,
      sitio: p.sitio,
      workArea: p.workArea,
      activity: p.specificActivity || p.workProgramItem?.specificActivities,
      dayNumber: p.workDay?.dayNumber,
      workDate: p.workDay?.workDate,
      latitude: p.latitude,
      longitude: p.longitude,
      capturedAt: p.capturedAt?.toISOString(),
      uploadedAt: p.uploadedAt.toISOString(),
      status: p.status,
      uploadedBy: {
        id: p.uploadedBy?.id,
        name: p.uploadedBy?.fullName,
        username: p.uploadedBy?.username,
        role: p.uploadedBy?.role,
        assignedBarangay: p.uploadedBy?.assignedBarangay
      },
      approvedBy: p.approvedBy ? {
        id: p.approvedBy.id,
        name: p.approvedBy.fullName,
        username: p.approvedBy.username,
        role: p.approvedBy.role
      } : null
    })),
    auditTrail: auditLogs6h.map(l => ({
      id: l.id,
      timestamp: l.createdAt.toISOString(),
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      actor: l.user ? {
        id: l.user.id,
        username: l.user.username,
        name: l.user.fullName,
        role: l.user.role,
        assignedBarangay: l.user.assignedBarangay
      } : null,
      metadata: l.metadata ? (typeof l.metadata === 'string' ? JSON.parse(l.metadata) : l.metadata) : null
    }))
  };

  const outputPath = path.join(process.cwd(), 'scripts', 'consolidated-6hours-today.json');
  fs.writeFileSync(outputPath, JSON.stringify(consolidatedMaster, null, 2));
  console.log(`\nConsolidated 6-Hour Master Report saved to: ${outputPath}`);
}

retrieve6HoursTransactions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
