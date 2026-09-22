import fs from "fs";

const backupPath = "data_export/master_tupad_dingalan_backup.json";
if (fs.existsSync(backupPath)) {
  const data = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
  console.log(`Backup contains ${data.Beneficiary?.length || 0} Beneficiaries, ${data.ProgramBeneficiary?.length || 0} ProgramBeneficiaries.`);

  const sitiosByBrgy = {};
  for (const b of (data.Beneficiary || [])) {
    const brgy = b.barangay || "UNKNOWN";
    if (!sitiosByBrgy[brgy]) sitiosByBrgy[brgy] = new Set();
    sitiosByBrgy[brgy].add(b.sitio || "(EMPTY)");
  }

  for (const [brgy, sitios] of Object.entries(sitiosByBrgy).sort()) {
    console.log(`\n=== ${brgy} ===`);
    console.log(Array.from(sitios).sort());
  }
}
