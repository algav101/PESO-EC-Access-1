import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const pbs = await prisma.programBeneficiary.findMany({
    where: { participationStatus: { not: "REPLACED" } },
    include: { beneficiary: true, program: true },
    orderBy: { designatedNumber: "asc" }
  });

  console.log(`Total active Program Beneficiaries: ${pbs.length}`);

  const byBrgy = {};
  for (const pb of pbs) {
    const b = pb.beneficiary;
    const brgy = b?.barangay || "UNKNOWN";
    if (!byBrgy[brgy]) byBrgy[brgy] = {};
    const s = b?.sitio || "(EMPTY)";
    byBrgy[brgy][s] = (byBrgy[brgy][s] || 0) + 1;
  }

  for (const [brgy, sitios] of Object.entries(byBrgy).sort()) {
    console.log(`\n=== Barangay: ${brgy} (${Object.values(sitios).reduce((a,b)=>a+b,0)} pax) ===`);
    for (const [s, count] of Object.entries(sitios).sort((a,b) => a[0].localeCompare(b[0]))) {
      console.log(`  - "${s}": ${count}`);
    }
  }
}

run().finally(() => prisma.$disconnect());
