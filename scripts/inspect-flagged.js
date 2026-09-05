const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const program = await prisma.program.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      programBeneficiaries: {
        include: {
          beneficiary: true,
          stubDistributions: true,
          orientationAttendance: true,
          originalReplacements: true,
          newReplacements: true,
        }
      }
    }
  });

  if (!program) {
    console.log("No program found");
    return;
  }

  console.log(`Program: ${program.programName} (${program.id})`);
  console.log(`Total beneficiaries: ${program.programBeneficiaries.length}`);

  const flaggedList = program.programBeneficiaries.filter(pb => 
    pb.participationStatus === 'FLAGGED_FOR_REPLACEMENT' ||
    pb.stubDistributions.some(sd => sd.status === 'FLAGGED_REPLACEMENT')
  );

  console.log(`Currently flagged count: ${flaggedList.length}`);
  for (const pb of flaggedList) {
    console.log(`Slot #${pb.designatedNumber}: ${pb.beneficiary.fullName} | Status: ${pb.participationStatus} | SD Status: ${pb.stubDistributions.map(s => s.status + ' | ' + s.remarks).join(', ')}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
