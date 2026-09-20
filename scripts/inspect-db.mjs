import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const progs = await prisma.program.findMany({
    include: {
      _count: {
        select: { programBeneficiaries: true }
      }
    }
  });
  console.log("Programs:", progs.map(p => ({
    id: p.id,
    code: p.programCode,
    total: p.totalBeneficiaries,
    pbs: p._count.programBeneficiaries
  })));

  if (progs.length > 0) {
    const pbs = await prisma.programBeneficiary.findMany({
      where: { programId: progs[0].id },
      include: { beneficiary: true },
      take: 10
    });
    console.log("\nSample 10 PBs in", progs[0].programCode, ":");
    pbs.forEach(pb => {
      console.log(`- #${pb.designatedNumber}: ${pb.beneficiary?.fullName} | ${pb.beneficiary?.barangay} - ${pb.beneficiary?.sitio} | Birthday: ${pb.beneficiary?.birthday}`);
    });

    const uniqueSitios = await prisma.beneficiary.groupBy({
      by: ['barangay', 'sitio'],
      _count: { id: true }
    });
    console.log("\nSitios in Database by Barangay:");
    uniqueSitios.forEach(s => {
      console.log(`  ${s.barangay} -> "${s.sitio}": ${s._count.id}`);
    });
  }
}

main().finally(() => prisma.$disconnect());
