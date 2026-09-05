const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const referenceSlots = [
  3, 27, 34, 114, 122, 192, 193, 198, 201, 219, 240, 261, 266, 267, 281, 283, 289,
  300, 306, 314, 322, 330, 337, 357, 361, 362, 369, 370, 386, 405, 412, 416, 435,
  443, 448, 464, 469, 470, 484, 498, 510, 520
];

async function main() {
  const pbs = await prisma.programBeneficiary.findMany({
    where: {
      designatedNumber: {
        in: referenceSlots.map(String)
      }
    },
    include: {
      beneficiary: true,
      stubDistributions: true,
      qrCodes: true,
      originalReplacements: true,
      newReplacements: true
    },
    orderBy: {
      designatedNumber: 'asc'
    }
  });

  console.log(`Found ${pbs.length} program beneficiaries matching the 42 slots.`);
  for (const pb of pbs) {
    console.log(`Slot #${pb.designatedNumber}: ${pb.beneficiary.fullName} (Status: ${pb.participationStatus}, SD: ${pb.stubDistributions.length})`);
  }

  // Check what beneficiaries are in DB that might have different names or slots
  const missingSlots = referenceSlots.filter(s => !pbs.some(pb => pb.designatedNumber === String(s)));
  if (missingSlots.length > 0) {
    console.log(`Missing slots in DB: ${missingSlots.join(', ')}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
