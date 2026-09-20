import fs from "fs";
import path from "path";
import crypto from "crypto";
import jsqr from "jsqr";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const pdfPath = "C:\\Users\\My PC\\.gemini\\antigravity-ide\\brain\\feaddd2e-0cc0-4058-b2e6-ee705bd28bd6\\.user_uploaded\\media_1789871571896.pdf";

async function main() {
  console.log("=== Extracting & Decoding All 522 QR Codes from PDF ===");
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  console.log(`PDF successfully loaded. Total pages: ${doc.numPages}`);

  const decodedTokens = []; // { number: 1, token: "TUPAD-DGL-..." }

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const ops = await page.getOperatorList();
    const imageNames = [];
    for (let i = 0; i < ops.fnArray.length; i++) {
      if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
        imageNames.push(ops.argsArray[i][0]);
      }
    }

    const pageQrs = [];
    for (const imgName of imageNames) {
      try {
        const img = page.objs.get(imgName);
        if (img && img.width === 220 && img.height === 220) {
          // This is the 220x220 QR image
          let rgbaData;
          if (img.data.length === img.width * img.height * 4) {
            rgbaData = img.data;
          } else if (img.data.length === img.width * img.height * 3) {
            rgbaData = new Uint8ClampedArray(img.width * img.height * 4);
            for (let p = 0, q = 0; p < img.data.length; p += 3, q += 4) {
              rgbaData[q] = img.data[p];
              rgbaData[q + 1] = img.data[p + 1];
              rgbaData[q + 2] = img.data[p + 2];
              rgbaData[q + 3] = 255;
            }
          } else if (img.data.length === img.width * img.height) {
            rgbaData = new Uint8ClampedArray(img.width * img.height * 4);
            for (let p = 0, q = 0; p < img.data.length; p++, q += 4) {
              const v = img.data[p];
              rgbaData[q] = v;
              rgbaData[q + 1] = v;
              rgbaData[q + 2] = v;
              rgbaData[q + 3] = 255;
            }
          }
          if (rgbaData) {
            const code = jsqr(rgbaData, img.width, img.height);
            if (code && code.data) {
              pageQrs.push(code.data.trim());
            }
          }
        }
      } catch (err) {
        console.error(`Error processing img on page ${pageNum}:`, err.message);
      }
    }

    console.log(`Page ${pageNum}/${doc.numPages}: Found ${pageQrs.length} QR codes`);
    for (const token of pageQrs) {
      // Token format: TUPAD-DGL-13F05F-1-6FD71B85
      // Extract number
      const parts = token.split("-");
      // parts: ["TUPAD", "DGL", "13F05F", "1", "6FD71B85"]
      let desigNum = null;
      if (parts.length >= 4) {
        desigNum = parseInt(parts[3], 10);
      }
      decodedTokens.push({
        token,
        designatedNumber: desigNum,
        index: decodedTokens.length + 1,
      });
    }
  }

  console.log(`\nTotal Decoded QR Codes: ${decodedTokens.length}`);

  // Save the complete mapping to JSON
  const mappingFile = path.resolve("src/data/official_522_qr_tokens.json");
  fs.writeFileSync(mappingFile, JSON.stringify(decodedTokens, null, 2));
  console.log(`Saved exact token mapping to: ${mappingFile}`);

  // Now update database
  const prog = await prisma.program.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!prog) throw new Error("No active program found");

  console.log(`\nUpdating Database for Program: ${prog.programCode} (${prog.id})`);

  // Fetch all program beneficiaries
  const pbs = await prisma.programBeneficiary.findMany({
    where: { programId: prog.id },
    include: { beneficiary: true }
  });

  const pbByDesig = new Map();
  for (const pb of pbs) {
    pbByDesig.set(parseInt(pb.designatedNumber, 10), pb);
  }

  let updatedCount = 0;
  for (const item of decodedTokens) {
    const desig = item.designatedNumber || item.index;
    const pb = pbByDesig.get(desig);
    if (!pb) {
      console.warn(`Warning: No ProgramBeneficiary found for #Desig: ${desig}`);
      continue;
    }

    const publicToken = item.token;
    const tokenHash = crypto.createHash("sha256").update(publicToken).digest("hex");

    // Deactivate or delete old QR code
    await prisma.qrCode.deleteMany({
      where: { programBeneficiaryId: pb.id }
    });

    // Create exact authentic QR record
    await prisma.qrCode.create({
      data: {
        programId: prog.id,
        programBeneficiaryId: pb.id,
        publicToken,
        tokenHash,
        status: "ACTIVE",
      }
    });

    updatedCount++;
    if (updatedCount % 50 === 0 || updatedCount === decodedTokens.length) {
      console.log(`Updated QR for #${desig} (${pb.beneficiary?.fullName}) -> ${publicToken}`);
    }
  }

  console.log(`\n=== Successfully linked all ${updatedCount} Official QR Codes to Beneficiaries 1-522! ===`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
