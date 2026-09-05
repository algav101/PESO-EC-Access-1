const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const backup = JSON.parse(fs.readFileSync('./data_export/master_tupad_dingalan_backup.json', 'utf-8'));

async function check() {
  const pgProgs = await prisma.program.findMany();
  console.log('Postgres Programs:', pgProgs.map(p => ({ id: p.id, code: p.programCode, name: p.programName })));
  
  const pgBenes = await prisma.beneficiary.findMany({ take: 5 });
  console.log('\nSample Postgres Beneficiaries:', pgBenes.map(b => ({ id: b.id, name: b.fullName, barangay: b.barangay })));
  
  const backupBenes = backup.Beneficiary.slice(0, 5);
  console.log('\nSample Backup Beneficiaries:', backupBenes.map(b => ({ id: b.id, name: b.fullName, barangay: b.barangay })));

  const allPgBenes = await prisma.beneficiary.findMany({ select: { id: true, fullName: true } });
  const allPgBeneIds = new Set(allPgBenes.map(b => b.id));
  const allPgBeneNames = new Set(allPgBenes.map(b => b.fullName?.toUpperCase().trim()));

  const matchedById = backup.Beneficiary.filter(b => allPgBeneIds.has(b.id)).length;
  const matchedByName = backup.Beneficiary.filter(b => allPgBeneNames.has(b.fullName?.toUpperCase().trim())).length;
  console.log('\nBackup beneficiaries matching PG by ID:', matchedById, 'of', backup.Beneficiary.length);
  console.log('Backup beneficiaries matching PG by Name:', matchedByName, 'of', backup.Beneficiary.length);

  // Check ProgramBeneficiaries in PG vs Backup
  const pgProgBenes = await prisma.programBeneficiary.findMany({
    include: { beneficiary: true }
  });
  console.log('\nPostgres ProgramBeneficiaries count:', pgProgBenes.length);
  console.log('Sample Postgres ProgramBeneficiary names:', pgProgBenes.map(pb => pb.beneficiary?.fullName));

  await prisma.$disconnect();
}
check().catch(console.error);
