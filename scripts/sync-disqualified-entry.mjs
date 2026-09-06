import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Syncing record to Disqualified Beneficiaries list...");

  const rawName = "GAVIOLA, ALBERT DE VERA";
  const fullName = "GAVIOLA, ALBERT DE VERA";
  const lastName = "GAVIOLA";
  const firstName = "ALBERT";
  const middleName = "DE VERA";
  const extensionName = null;
  const adlNo = "Municipal Goovernment Department Head- PESO Manager";
  const orientationDate = "January 02, 2024";
  const workDate = "January 02, 2024";
  const payoutDate = "January 02, 2024";
  const barangay = "PALTIC";
  const municipality = "DINGALAN";

  // 1. Find or create Beneficiary
  let bene = await prisma.beneficiary.findFirst({
    where: {
      OR: [
        { fullName: { contains: fullName, mode: "insensitive" } },
        {
          AND: [
            { lastName: { contains: lastName, mode: "insensitive" } },
            { firstName: { contains: firstName, mode: "insensitive" } },
          ],
        },
      ],
    },
  });

  if (!bene) {
    bene = await prisma.beneficiary.create({
      data: {
        beneficiaryNumber: `BN-REF-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`,
        fullName: fullName.toUpperCase(),
        lastName: lastName.toUpperCase(),
        firstName: firstName.toUpperCase(),
        middleName: middleName.toUpperCase(),
        extensionName: extensionName,
        birthday: "1980-01-01",
        barangay: barangay.toUpperCase(),
        municipality: municipality.toUpperCase(),
        province: "Aurora",
        status: "ACTIVE",
      },
    });
    console.log(`Created new Beneficiary: ${bene.fullName} (${bene.id})`);
  } else {
    console.log(`Found existing Beneficiary: ${bene.fullName} (${bene.id})`);
  }

  // 2. Delete any duplicate restriction for this beneficiary with this adlNo
  await prisma.beneficiaryRestriction.deleteMany({
    where: {
      beneficiaryId: bene.id,
    },
  });

  // 3. Create the BeneficiaryRestriction
  const restriction = await prisma.beneficiaryRestriction.create({
    data: {
      beneficiaryId: bene.id,
      payoutDate: payoutDate,
      restrictionStart: "2024-01-02",
      restrictionEnd: "Permanent (Barangay / Municipal Appointive & Department Head)",
      adlNo: adlNo,
      workDate: workDate,
      orientationDate: orientationDate,
      barangay: barangay.toUpperCase(),
      municipality: municipality.toUpperCase(),
      isAppointivePersonnel: true,
      reason: `Disqualified: Active Government Official / Appointive Personnel (${adlNo}). Government officials, department heads, and appointive personnel are strictly barred from TUPAD emergency employment under DOLE statutory guidelines.`,
      status: "ACTIVE",
    },
  });

  console.log("Successfully created Restriction record:", restriction);

  // Count total restrictions
  const totalCount = await prisma.beneficiaryRestriction.count();
  console.log(`Total Disqualified Records in Database: ${totalCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
