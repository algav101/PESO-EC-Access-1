const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

async function exportAll() {
  const prisma = new PrismaClient();
  const outDir = path.join(__dirname, '../data_export');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log("=== EXPORTING LATEST COMPLETE POSTGRES DATABASE TO DATA_EXPORT ===");

  const models = [
    { name: 'User', model: prisma.user },
    { name: 'Program', model: prisma.program },
    { name: 'ProgramBarangay', model: prisma.programBarangay },
    { name: 'Beneficiary', model: prisma.beneficiary },
    { name: 'ProgramBeneficiary', model: prisma.programBeneficiary },
    { name: 'Dependent', model: prisma.dependent },
    { name: 'BeneficiaryDocument', model: prisma.beneficiaryDocument },
    { name: 'QrCode', model: prisma.qrCode },
    { name: 'QrPrintBatch', model: prisma.qrPrintBatch },
    { name: 'QrPrintLog', model: prisma.qrPrintLog },
    { name: 'TableAssignmentRule', model: prisma.tableAssignmentRule },
    { name: 'StubDistribution', model: prisma.stubDistribution },
    { name: 'OrientationAttendance', model: prisma.orientationAttendance },
    { name: 'BeneficiaryReplacement', model: prisma.beneficiaryReplacement },
    { name: 'WorkDay', model: prisma.workDay },
    { name: 'AttendanceRecord', model: prisma.attendanceRecord },
    { name: 'AccomplishmentPhoto', model: prisma.accomplishmentPhoto },
    { name: 'PhotoConfiguration', model: prisma.photoConfiguration },
    { name: 'Payout', model: prisma.payout },
    { name: 'BeneficiaryRestriction', model: prisma.beneficiaryRestriction },
    { name: 'AuditLog', model: prisma.auditLog },
    { name: 'SystemSetting', model: prisma.systemSetting },
    { name: 'TupadWorkProgram', model: prisma.tupadWorkProgram },
    { name: 'TupadWorkProgramItem', model: prisma.tupadWorkProgramItem },
    { name: 'TupadApplicationRoster', model: prisma.tupadApplicationRoster },
    { name: 'PublicInquiryMessage', model: prisma.publicInquiryMessage },
  ];

  const fullExport = {};

  for (const item of models) {
    try {
      const rows = await item.model.findMany();
      fullExport[item.name] = rows;
      console.log(`• Exported ${item.name}: ${rows.length} records`);

      // Write JSON
      fs.writeFileSync(
        path.join(outDir, `${item.name}.json`),
        JSON.stringify(rows, null, 2),
        'utf-8'
      );

      // Write CSV if rows exist
      if (rows.length > 0) {
        const headers = Object.keys(rows[0]);
        const csvLines = [headers.join(',')];
        for (const r of rows) {
          const line = headers.map(h => {
            let val = r[h];
            if (val === null || val === undefined) return '';
            if (val instanceof Date) val = val.toISOString();
            if (typeof val === 'object') val = JSON.stringify(val);
            val = String(val).replace(/"/g, '""');
            if (val.includes(',') || val.includes('\n') || val.includes('"')) {
              return `"${val}"`;
            }
            return val;
          }).join(',');
          csvLines.push(line);
        }
        fs.writeFileSync(
          path.join(outDir, `${item.name}.csv`),
          csvLines.join('\n'),
          'utf-8'
        );
      }
    } catch (err) {
      console.error(`Error exporting ${item.name}:`, err.message);
    }
  }

  // Write master JSON backup
  fs.writeFileSync(
    path.join(outDir, 'master_tupad_dingalan_backup.json'),
    JSON.stringify(fullExport, null, 2),
    'utf-8'
  );

  console.log("\n✓ All tables and master backup exported to data_export/ directory successfully!");
  await prisma.$disconnect();
}

exportAll().catch(console.error);
