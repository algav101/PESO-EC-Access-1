import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pbs = await prisma.programBeneficiary.findMany({
    include: { beneficiary: true },
  });
  console.log("Total ProgramBeneficiaries:", pbs.length);
  const byBrgy = {};
  pbs.forEach((pb) => {
    const b = pb.beneficiary?.barangay || "Unknown";
    if (!byBrgy[b])
      byBrgy[b] = { count: 0, male: 0, female: 0, sc: 0, pwd: 0, ip: 0, fourPs: 0, puroks: {} };
    byBrgy[b].count++;
    const sex = (pb.beneficiary?.sex || "").toUpperCase();
    if (sex.startsWith("M")) byBrgy[b].male++;
    else if (sex.startsWith("F")) byBrgy[b].female++;
    if (pb.beneficiary?.isSenior || (pb.beneficiary?.age && pb.beneficiary.age >= 60)) byBrgy[b].sc++;
    if (pb.beneficiary?.isPwd) byBrgy[b].pwd++;
    if (pb.beneficiary?.isIp) byBrgy[b].ip++;
    if (pb.beneficiary?.is4Ps) byBrgy[b].fourPs++;

    const sitio = pb.beneficiary?.sitio || "Centro";
    if (!byBrgy[b].puroks[sitio]) {
      byBrgy[b].puroks[sitio] = { count: 0, male: 0, female: 0, sc: 0, pwd: 0, ip: 0 };
    }
    byBrgy[b].puroks[sitio].count++;
    if (sex.startsWith("M")) byBrgy[b].puroks[sitio].male++;
    else if (sex.startsWith("F")) byBrgy[b].puroks[sitio].female++;
    if (pb.beneficiary?.isSenior || (pb.beneficiary?.age && pb.beneficiary.age >= 60)) byBrgy[b].puroks[sitio].sc++;
    if (pb.beneficiary?.isPwd) byBrgy[b].puroks[sitio].pwd++;
    if (pb.beneficiary?.isIp) byBrgy[b].puroks[sitio].ip++;
  });

  console.table(
    Object.entries(byBrgy).map(([k, v]) => ({
      Barangay: k,
      Count: v.count,
      Male: v.male,
      Female: v.female,
      SC: v.sc,
      PWD: v.pwd,
      IP: v.ip,
      Puroks: Object.keys(v.puroks).length,
    }))
  );
}

main().finally(() => prisma.$disconnect());
