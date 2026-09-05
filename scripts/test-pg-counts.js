const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient();
  try {
    console.log("Testing Prisma connection to Postgres...");
    const models = [
      'user', 'program', 'programBarangay', 'beneficiary',
      'programBeneficiary', 'dependent', 'beneficiaryDocument',
      'qrCode', 'qrPrintBatch', 'qrPrintLog', 'tableAssignmentRule',
      'stubDistribution', 'orientationAttendance', 'beneficiaryReplacement',
      'workDay', 'attendanceRecord', 'accomplishmentPhoto', 'photoConfiguration',
      'payout', 'beneficiaryRestriction', 'auditLog', 'systemSetting',
      'tupadWorkProgram', 'tupadWorkProgramItem', 'tupadApplicationRoster',
      'publicInquiryMessage'
    ];

    for (const m of models) {
      try {
        if (prisma[m]) {
          const count = await prisma[m].count();
          console.log(`[PG] ${m}: ${count}`);
        } else {
          console.log(`[PG] ${m}: model not on prisma client`);
        }
      } catch (err) {
        console.log(`[PG] ${m}: ERROR - ${err.message}`);
      }
    }
  } catch (err) {
    console.error("Global PG error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
