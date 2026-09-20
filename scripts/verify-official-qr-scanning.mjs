import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Testing Official QR Code Verification ===");
  const tokens = JSON.parse(fs.readFileSync("src/data/official_522_qr_tokens.json", "utf-8"));
  console.log(`Loaded ${tokens.length} official QR tokens.`);

  const sampleNumbers = [1, 2, 50, 100, 200, 300, 400, 500, 522];

  for (const num of sampleNumbers) {
    const item = tokens.find((t) => t.designatedNumber === num);
    if (!item) {
      console.error(`Token for #${num} not found in official tokens file!`);
      continue;
    }

    const qr = await prisma.qrCode.findFirst({
      where: { publicToken: item.token },
      include: {
        programBeneficiary: {
          include: { beneficiary: true, program: true }
        }
      }
    });

    if (!qr || !qr.programBeneficiary) {
      console.error(`FAILED to resolve QR in database: ${item.token}`);
    } else {
      const pb = qr.programBeneficiary;
      console.log(`✓ Card #${num} Token "${item.token}" -> MATCHED: ${pb.beneficiary.fullName} (Desig #${pb.designatedNumber}, Brgy: ${pb.beneficiary.barangay}, Sitio: ${pb.beneficiary.sitio})`);
    }
  }

  const totalQrCount = await prisma.qrCode.count({ where: { status: "ACTIVE" } });
  console.log(`\nTotal Active QR Codes in Database: ${totalQrCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
