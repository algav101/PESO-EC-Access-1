import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import {
  normalizeBarangayName,
  normalizeSitioName,
  getStandardBarangayName,
  CANONICAL_BARANGAYS,
  CANONICAL_SITIOS_BY_BARANGAY,
} from "../src/lib/dingalan-groupings.ts";

const prisma = new PrismaClient();

async function main() {
  console.log("=== FAST BATCH UNIFYING ALL SITIO AND PUROK SPELLINGS ===");

  // 1. Group all distinct (barangay, sitio) in the DB
  const distinctCombos = await prisma.$queryRaw`
    SELECT "barangay", "sitio", COUNT(*)::int as cnt
    FROM "Beneficiary"
    GROUP BY "barangay", "sitio"
  `;

  console.log(`Found ${distinctCombos.length} distinct Barangay/Sitio combinations.`);

  let totalUpdatedRows = 0;

  for (const combo of distinctCombos) {
    const rawBrgy = combo.barangay;
    const rawSitio = combo.sitio;
    const count = combo.cnt;

    const normBrgy = normalizeBarangayName(rawBrgy);
    const normSitio = normalizeSitioName(rawSitio, normBrgy);

    if (normBrgy !== (rawBrgy || "") || normSitio !== (rawSitio || "")) {
      console.log(
        `Normalizing combo [${count} rows]: Brgy "${rawBrgy}" -> "${normBrgy}", Sitio "${rawSitio}" -> "${normSitio}"`
      );

      if (rawSitio === null || rawSitio === undefined) {
        const res = await prisma.$executeRaw`
          UPDATE "Beneficiary"
          SET "barangay" = ${normBrgy}, "sitio" = ${normSitio || null}
          WHERE ("barangay" = ${rawBrgy} OR ("barangay" IS NULL AND ${rawBrgy} IS NULL))
            AND "sitio" IS NULL
        `;
        totalUpdatedRows += res;
      } else {
        const res = await prisma.$executeRaw`
          UPDATE "Beneficiary"
          SET "barangay" = ${normBrgy}, "sitio" = ${normSitio || null}
          WHERE ("barangay" = ${rawBrgy} OR ("barangay" IS NULL AND ${rawBrgy} IS NULL))
            AND "sitio" = ${rawSitio}
        `;
        totalUpdatedRows += res;
      }
    }
  }

  console.log(`\nSuccessfully updated ${totalUpdatedRows} database rows.`);

  // 2. Update data_export/Beneficiary.json if exists
  const beneJsonPath = path.resolve("./data_export/Beneficiary.json");
  if (fs.existsSync(beneJsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(beneJsonPath, "utf-8"));
      if (Array.isArray(data)) {
        let jsonUpdatedCount = 0;
        const unifiedData = data.map((b) => {
          const normBrgy = normalizeBarangayName(b.barangay);
          const normSitio = normalizeSitioName(b.sitio, normBrgy);
          if (normBrgy !== (b.barangay || "") || normSitio !== (b.sitio || "")) {
            jsonUpdatedCount++;
          }
          return {
            ...b,
            barangay: normBrgy,
            sitio: normSitio || null,
          };
        });
        fs.writeFileSync(beneJsonPath, JSON.stringify(unifiedData, null, 2), "utf-8");
        console.log(`Updated ${jsonUpdatedCount} records in ${beneJsonPath}`);
      }
    } catch (err) {
      console.error("Error updating Beneficiary.json:", err);
    }
  }

  // 3. Update data_export/master_tupad_dingalan_backup.json if exists
  const masterBackupPath = path.resolve("./data_export/master_tupad_dingalan_backup.json");
  if (fs.existsSync(masterBackupPath)) {
    try {
      const masterData = JSON.parse(fs.readFileSync(masterBackupPath, "utf-8"));
      let masterUpdatedCount = 0;
      if (masterData.Beneficiary && Array.isArray(masterData.Beneficiary)) {
        masterData.Beneficiary = masterData.Beneficiary.map((b) => {
          const normBrgy = normalizeBarangayName(b.barangay);
          const normSitio = normalizeSitioName(b.sitio, normBrgy);
          if (normBrgy !== (b.barangay || "") || normSitio !== (b.sitio || "")) {
            masterUpdatedCount++;
          }
          return {
            ...b,
            barangay: normBrgy,
            sitio: normSitio || null,
          };
        });
      }
      fs.writeFileSync(masterBackupPath, JSON.stringify(masterData, null, 2), "utf-8");
      console.log(`Updated ${masterUpdatedCount} records in ${masterBackupPath}`);
    } catch (err) {
      console.error("Error updating master_tupad_dingalan_backup.json:", err);
    }
  }

  // 4. Summarize final Sitio distribution for current program beneficiaries
  const pbs = await prisma.programBeneficiary.findMany({
    where: { participationStatus: { not: "REPLACED" } },
    include: { beneficiary: true },
  });

  const byBrgy = {};
  for (const pb of pbs) {
    const b = pb.beneficiary;
    const brgy = b?.barangay || "UNKNOWN";
    if (!byBrgy[brgy]) byBrgy[brgy] = {};
    const s = b?.sitio || "(EMPTY)";
    byBrgy[brgy][s] = (byBrgy[brgy][s] || 0) + 1;
  }

  console.log("\n=== FINAL UNIFIED SITIO / PUROK DISTRIBUTION FOR ACTIVE PROGRAM ===");
  for (const [brgy, sitios] of Object.entries(byBrgy).sort()) {
    console.log(`\nBarangay: ${brgy} (${Object.values(sitios).reduce((a, b) => a + b, 0)} pax)`);
    for (const [s, count] of Object.entries(sitios).sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(`  - "${s}": ${count}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
