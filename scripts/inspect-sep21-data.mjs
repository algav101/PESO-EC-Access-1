import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function inspectData() {
  const since = new Date("2026-09-20T22:00:00.000Z"); // 2026-09-21 06:00:00 PST (+08:00)

  console.log("=== RETRIEVING DATA SINCE SEP 21, 2026 6:00 AM PST ===");

  const attendance = await prisma.attendanceRecord.findMany({
    include: {
      programBeneficiary: {
        include: {
          beneficiary: true,
          program: true,
        },
      },
      workDay: true,
      scannedBy: true,
    },
    orderBy: { createdAt: "desc" },
  });

  console.log("Total attendance records in DB:", attendance.length);
  const todayAttendance = attendance.filter((a) => {
    const d = new Date(a.createdAt || a.morningTimeIn || 0);
    return a.attendanceDate === "2026-09-21" || d >= since;
  });
  console.log("Attendance records on/since Sep 21 6:00 AM:", todayAttendance.length);

  const byBrgy = {};
  for (const a of attendance) {
    const brgy = a.programBeneficiary?.beneficiary?.barangay || "Unknown";
    byBrgy[brgy] = (byBrgy[brgy] || 0) + 1;
  }
  console.log("Attendance breakdown by Barangay:", byBrgy);

  const photos = await prisma.accomplishmentPhoto.findMany({
    include: {
      program: true,
      workDay: true,
      workProgramItem: true,
      uploadedBy: true,
      approvedBy: true,
    },
    orderBy: { uploadedAt: "desc" },
  });
  console.log("\nTotal accomplishment photos in DB:", photos.length);
  for (const p of photos) {
    console.log({
      id: p.id,
      program: p.program?.programCode,
      barangay: p.barangay,
      sitio: p.sitio,
      workArea: p.workArea,
      activity: p.specificActivity,
      workDay: p.workDay?.dayNumber,
      uploadedBy: p.uploadedBy?.fullName || p.uploadedBy?.username,
      uploadedByRole: p.uploadedBy?.role,
      status: p.status,
      uploadedAt: p.uploadedAt,
    });
  }

  const audits = await prisma.auditLog.findMany({
    where: { createdAt: { gte: since } },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  console.log("\nAudit logs since Sep 21 6:00 AM:", audits.length);
  for (const a of audits.slice(0, 20)) {
    console.log({
      action: a.action,
      entityType: a.entityType,
      user: a.user?.username || a.user?.fullName,
      time: a.createdAt,
      metadata: a.metadata,
    });
  }
}

inspectData().catch(console.error).finally(() => prisma.$disconnect());
