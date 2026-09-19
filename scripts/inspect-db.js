const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const [pbs, progs] = await Promise.all([
    prisma.programBeneficiary.findMany({
      select: {
        id: true,
        programId: true,
        designatedNumber: true,
        participationStatus: true,
        beneficiary: {
          select: { id: true, fullName: true, barangay: true, sitio: true },
        },
      },
      orderBy: [{ designatedNumber: 'asc' }],
    }),
    prisma.program.findMany({
      select: { id: true, programCode: true, programName: true, status: true, beneficiaryCount: true },
    }),
  ]);

  console.log('Programs count:', progs.length);
  progs.forEach((p) => console.log(`  - [${p.id}] ${p.programCode} - ${p.programName} (${p.status}) count=${p.beneficiaryCount}`));

  console.log('\nTotal ProgramBeneficiaries in DB:', pbs.length);

  const pbsByProgram = {};
  for (const pb of pbs) {
    if (!pbsByProgram[pb.programId]) pbsByProgram[pb.programId] = [];
    pbsByProgram[pb.programId].push(pb);
  }

  for (const [progId, progPbs] of Object.entries(pbsByProgram)) {
    console.log(`\nProgram [${progId}] has ${progPbs.length} ProgramBeneficiaries:`);
    const byDesig = {};
    const byName = {};
    for (const pb of progPbs) {
      const desig = pb.designatedNumber;
      const name = pb.beneficiary?.fullName;
      byDesig[desig] = (byDesig[desig] || 0) + 1;
      byName[name] = (byName[name] || 0) + 1;
    }
    const dupDesigs = Object.entries(byDesig).filter(([k, v]) => v > 1);
    const dupNames = Object.entries(byName).filter(([k, v]) => v > 1);
    console.log(`  - Duplicate designated numbers count: ${dupDesigs.length}`);
    if (dupDesigs.length > 0) console.log('    Sample dup desigs:', dupDesigs.slice(0, 5));
    console.log(`  - Duplicate names count: ${dupNames.length}`);
    if (dupNames.length > 0) console.log('    Sample dup names:', dupNames.slice(0, 5));
    console.log('  - First 5 active beneficiaries:');
    progPbs.slice(0, 5).forEach((pb) => console.log(`    #${pb.designatedNumber} ${pb.beneficiary?.fullName} (${pb.beneficiary?.barangay} - ${pb.beneficiary?.sitio}) [${pb.participationStatus}]`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
