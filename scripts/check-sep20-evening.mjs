import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSep20EveningData() {
  console.log("================================================================================");
  console.log("RETRIEVING SERVER DATA AROUND SEPTEMBER 20, 2026 10:00 PM PST");
  console.log("Window: 2026-09-20 18:00:00 PST to 2026-09-21 06:00:00 AM PST");
  console.log("UTC Window: 2026-09-20T10:00:00.000Z to 2026-09-20T22:00:00.000Z");
  console.log("================================================================================");

  const startUtc = new Date("2026-09-20T10:00:00.000Z"); // 6:00 PM PST
  const endUtc = new Date("2026-09-20T22:00:00.000Z");   // 6:00 AM PST next day

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      createdAt: {
        gte: startUtc,
        lte: endUtc
      }
    },
    include: {
      user: true
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`\nAudit Logs in Sep 20 Evening Window (Count: ${auditLogs.length}):`);
  for (const log of auditLogs) {
    console.log(`- [${log.createdAt.toISOString()}] Action: ${log.action} | User: ${log.user?.fullName || 'System'} (@${log.user?.username}) | Entity: ${log.entityType} | Meta: ${log.metadata?.slice(0, 100)}`);
  }

  const attendance = await prisma.attendanceRecord.findMany({
    where: {
      OR: [
        { createdAt: { gte: startUtc, lte: endUtc } },
        { updatedAt: { gte: startUtc, lte: endUtc } }
      ]
    },
    include: {
      programBeneficiary: { include: { beneficiary: true } },
      scannedBy: true
    }
  });

  console.log(`\nAttendance Records in Sep 20 Evening Window (Count: ${attendance.length}):`);
  for (const att of attendance) {
    console.log(`- Ben: ${att.programBeneficiary?.beneficiary?.fullName} | Day: ${att.attendanceDate} | Scanner: ${att.scannedBy?.fullName} | Created: ${att.createdAt.toISOString()}`);
  }

  const photos = await prisma.accomplishmentPhoto.findMany({
    where: {
      OR: [
        { createdAt: { gte: startUtc, lte: endUtc } },
        { uploadedAt: { gte: startUtc, lte: endUtc } },
        { capturedAt: { gte: startUtc, lte: endUtc } }
      ]
    },
    include: {
      uploadedBy: true
    }
  });

  console.log(`\nAccomplishment Photos in Sep 20 Evening Window (Count: ${photos.length}):`);
  for (const p of photos) {
    console.log(`- Photo ID: ${p.id} | Bgy: ${p.barangay} | Uploader: ${p.uploadedBy?.fullName} | Captured: ${p.capturedAt?.toISOString()}`);
  }
}

checkSep20EveningData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
