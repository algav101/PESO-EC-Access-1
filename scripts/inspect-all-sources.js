const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("=== 1. CHECKING SQLITE DEV.DB ===");
  const sqlitePath = path.join(__dirname, '../prisma/dev.db');
  let sqliteCounts = {};
  if (fs.existsSync(sqlitePath)) {
    try {
      const db = new Database(sqlitePath, { readonly: true });
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_prisma%'").all();
      for (const t of tables) {
        const count = db.prepare(`SELECT count(*) as c FROM "${t.name}"`).get().c;
        sqliteCounts[t.name] = count;
      }
      console.log(sqliteCounts);
    } catch (e) {
      console.error("SQLite error:", e.message);
    }
  } else {
    console.log("No dev.db found");
  }

  console.log("\n=== 2. CHECKING DATA_EXPORT MASTER BACKUP ===");
  const backupPath = path.join(__dirname, '../data_export/master_tupad_dingalan_backup.json');
  if (fs.existsSync(backupPath)) {
    const data = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    for (const [k, v] of Object.entries(data)) {
      console.log(`${k}: ${Array.isArray(v) ? v.length : typeof v}`);
    }
  }

  console.log("\n=== 3. CHECKING POSTGRESQL (.env DATABASE_URL) ===");
  const prisma = new PrismaClient();
  try {
    const counts = {
      users: await prisma.user.count(),
      programs: await prisma.program.count(),
      programBarangays: await prisma.programBarangay.count(),
      beneficiaries: await prisma.beneficiary.count(),
      programBeneficiaries: await prisma.programBeneficiary.count(),
      dependents: await prisma.dependent.count(),
      restrictions: await prisma.beneficiaryRestriction.count(),
      qrCodes: await prisma.qrCode.count(),
      qrPrintBatches: await prisma.qrPrintBatch.count(),
      qrPrintLogs: await prisma.qrPrintLog.count(),
      tableRules: await prisma.tableAssignmentRule.count(),
      workDays: await prisma.workDay.count(),
      tupadWorkPrograms: await prisma.tupadWorkProgram.count(),
      tupadWorkProgramItems: await prisma.tupadWorkProgramItem.count(),
      attendanceRecords: await prisma.attendanceRecord.count(),
      accomplishmentPhotos: await prisma.accomplishmentPhoto.count(),
      payouts: await prisma.payout.count(),
      auditLogs: await prisma.auditLog.count(),
      systemSettings: await prisma.systemSetting.count(),
      tupadApplicationRosters: await prisma.tupadApplicationRoster.count(),
      publicInquiryMessages: await prisma.publicInquiryMessage.count(),
    };
    console.log(counts);
  } catch (e) {
    console.error("Postgres error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
