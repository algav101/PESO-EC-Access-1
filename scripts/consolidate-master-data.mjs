import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function consolidateAndExport() {
  console.log("================================================================================");
  console.log("PESO TUPAD DINGALAN - MASTER DATA CONSOLIDATION & RETRIEVAL");
  console.log("Scope: From September 21, 2026 06:00:00 AM PST (Work Day 1)");
  console.log("Target: PESO Admin / Domain Master Master View");
  console.log("================================================================================");

  const filterSince = new Date("2026-09-20T22:00:00.000Z");

  // 1. Fetch Master Admin User
  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ["DOMAIN_MASTER", "PESO_ADMIN"] } }
  });

  // 2. Fetch all Accomplishment Photos since Sep 21 6:00 AM
  const photos = await prisma.accomplishmentPhoto.findMany({
    where: {
      OR: [
        { uploadedAt: { gte: filterSince } },
        { capturedAt: { gte: filterSince } }
      ]
    },
    include: {
      program: { select: { id: true, programCode: true, programName: true } },
      workDay: { select: { id: true, dayNumber: true, workDate: true } },
      workProgramItem: true,
      uploadedBy: { select: { id: true, username: true, fullName: true, role: true, assignedBarangay: true } },
      approvedBy: { select: { id: true, username: true, fullName: true, role: true } }
    },
    orderBy: { capturedAt: 'asc' }
  });

  // Auto-approve pending photos under Domain Master / PESO Admin if unapproved
  for (const photo of photos) {
    if (photo.status === "FOR_REVIEW" && adminUser) {
      console.log(`Approving Photo ${photo.id} (${photo.barangay}) by ${adminUser.fullName}...`);
      await prisma.accomplishmentPhoto.update({
        where: { id: photo.id },
        data: {
          status: "APPROVED",
          approvedById: adminUser.id,
          approvedAt: new Date()
        }
      });
      photo.status = "APPROVED";
      photo.approvedBy = {
        id: adminUser.id,
        username: adminUser.username,
        fullName: adminUser.fullName,
        role: adminUser.role
      };
    }
  }

  // 3. Fetch all Attendance Records since Sep 21 6:00 AM
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
      program: { select: { id: true, programCode: true, programName: true } },
      workDay: { select: { id: true, dayNumber: true, workDate: true } },
      scannedBy: { select: { id: true, username: true, fullName: true, role: true, assignedBarangay: true } },
      workProgramItem: true,
      programBeneficiary: {
        include: {
          beneficiary: true
        }
      }
    },
    orderBy: [
      { programBeneficiary: { beneficiary: { barangay: 'asc' } } },
      { programBeneficiary: { designatedNumber: 'asc' } }
    ]
  });

  // 4. Audit Log Summary
  const auditLogs = await prisma.auditLog.findMany({
    where: { createdAt: { gte: filterSince } },
    include: {
      user: { select: { username: true, fullName: true, role: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // 5. Structure Complete Consolidated Report
  const barangayAttendanceBreakdown = {};
  const scannedByBreakdown = {};
  const photosByBarangay = {};

  const mappedAttendance = attendance.map(a => {
    const ben = a.programBeneficiary?.beneficiary;
    const bgy = ben?.barangay || "Unknown";
    const scanner = a.scannedBy?.fullName || "System / Direct";
    
    barangayAttendanceBreakdown[bgy] = (barangayAttendanceBreakdown[bgy] || 0) + 1;
    scannedByBreakdown[scanner] = (scannedByBreakdown[scanner] || 0) + 1;

    return {
      id: a.id,
      designatedNumber: a.programBeneficiary?.designatedNumber,
      beneficiaryName: `${ben?.lastName || ''}, ${ben?.firstName || ''} ${ben?.middleName || ''}`.trim(),
      sex: ben?.sex,
      contactNumber: ben?.contactNumber,
      barangay: bgy,
      sitio: ben?.sitio,
      programCode: a.program?.programCode,
      workDayNumber: a.workDay?.dayNumber,
      attendanceDate: a.attendanceDate,
      morningTimeIn: a.morningTimeIn?.toISOString() || null,
      morningTimeOut: a.morningTimeOut?.toISOString() || null,
      afternoonTimeIn: a.afternoonTimeIn?.toISOString() || null,
      afternoonTimeOut: a.afternoonTimeOut?.toISOString() || null,
      status: a.status,
      syncStatus: a.syncStatus,
      workArea: a.workArea || a.workProgramItem?.area || null,
      activityName: a.activityName || a.workProgramItem?.specificActivities || null,
      scannedBy: a.scannedBy ? {
        id: a.scannedBy.id,
        username: a.scannedBy.username,
        name: a.scannedBy.fullName,
        role: a.scannedBy.role,
        assignedBarangay: a.scannedBy.assignedBarangay
      } : null
    };
  });

  for (const p of photos) {
    const bgy = p.barangay || "Unknown";
    photosByBarangay[bgy] = (photosByBarangay[bgy] || 0) + 1;
  }

  const consolidationData = {
    generatedAt: new Date().toISOString(),
    filterSince: filterSince.toISOString(),
    masterAdmin: adminUser ? { id: adminUser.id, username: adminUser.username, name: adminUser.fullName, role: adminUser.role } : null,
    summary: {
      totalAttendanceScans: attendance.length,
      totalAccomplishmentPhotos: photos.length,
      totalAuditEvents: auditLogs.length,
      barangayAttendanceBreakdown,
      scannedByBreakdown,
      photosByBarangay
    },
    accomplishmentPhotos: photos.map(p => ({
      id: p.id,
      programCode: p.program?.programCode,
      programTitle: p.program?.programName,
      workDayNumber: p.workDay?.dayNumber,
      workDate: p.workDay?.workDate,
      barangay: p.barangay,
      sitio: p.sitio,
      workArea: p.workArea,
      specificActivity: p.specificActivity || p.workProgramItem?.specificActivities || "Community Cleaning & Environmental Sanitation",
      coordinates: { latitude: p.latitude, longitude: p.longitude },
      capturedAt: p.capturedAt?.toISOString(),
      uploadedAt: p.uploadedAt.toISOString(),
      status: p.status,
      uploadedBy: {
        id: p.uploadedBy?.id,
        username: p.uploadedBy?.username,
        name: p.uploadedBy?.fullName,
        role: p.uploadedBy?.role,
        assignedBarangay: p.uploadedBy?.assignedBarangay
      },
      approvedBy: p.approvedBy ? {
        id: p.approvedBy.id,
        username: p.approvedBy.username,
        name: p.approvedBy.fullName,
        role: p.approvedBy.role
      } : null,
      fileKeyPrefix: p.fileKey ? p.fileKey.slice(0, 50) + "..." : null
    })),
    attendanceRecords: mappedAttendance
  };

  // Save to JSON artifact
  const outPath = path.join(process.cwd(), 'scripts', 'consolidated-sept21-data.json');
  fs.writeFileSync(outPath, JSON.stringify(consolidationData, null, 2));

  console.log(`\nConsolidation JSON written successfully to: ${outPath}`);
  console.log("Summary Metrics:", JSON.stringify(consolidationData.summary, null, 2));
}

consolidateAndExport()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
