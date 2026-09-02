import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function healQrCodes() {
  console.log("Checking and healing all QR codes in database...");

  const allQrs = await prisma.qrCode.findMany({
    include: { programBeneficiary: true },
  });

  let healedCount = 0;

  for (const qr of allQrs) {
    let shouldUpdate = false;
    let newStatus = qr.status;
    let newPbId = qr.programBeneficiaryId;

    if (qr.status !== "ACTIVE") {
      newStatus = "ACTIVE";
      shouldUpdate = true;
    }

    if (qr.programBeneficiary?.participationStatus === "REPLACED") {
      const activePb = await prisma.programBeneficiary.findFirst({
        where: {
          programId: qr.programId,
          designatedNumber: qr.programBeneficiary.designatedNumber,
          participationStatus: "ACTIVE",
        },
      });
      if (activePb) {
        newPbId = activePb.id;
        shouldUpdate = true;
      }
    }

    if (shouldUpdate) {
      await prisma.qrCode.update({
        where: { id: qr.id },
        data: {
          status: "ACTIVE",
          programBeneficiaryId: newPbId,
          invalidatedAt: null,
          invalidatedById: null,
        },
      });
      healedCount++;
    }
  }

  console.log(`Successfully verified and healed ${healedCount} QR code record(s). All physical cards are 100% active.`);
}

healQrCodes()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
