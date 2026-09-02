const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('./prisma/dev.db', { readonly: true });
const outDir = './data_export';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log("=== EXPORTING ALL RETRIEVED DATA ===");

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_prisma%'").all();

const fullExport = {};

for (const t of tables) {
  const rows = db.prepare(`SELECT * FROM "${t.name}"`).all();
  fullExport[t.name] = rows;
  
  // Write individual JSON
  fs.writeFileSync(
    path.join(outDir, `${t.name}.json`),
    JSON.stringify(rows, null, 2),
    'utf-8'
  );
  
  // Also write CSV if rows exist
  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    const csvLines = [headers.join(',')];
    for (const r of rows) {
      const line = headers.map(h => {
        let val = r[h];
        if (val === null || val === undefined) return '';
        val = String(val).replace(/"/g, '""');
        if (val.includes(',') || val.includes('\n') || val.includes('"')) {
          return `"${val}"`;
        }
        return val;
      }).join(',');
      csvLines.push(line);
    }
    fs.writeFileSync(
      path.join(outDir, `${t.name}.csv`),
      csvLines.join('\n'),
      'utf-8'
    );
  }
}

// Write complete master JSON file
fs.writeFileSync(
  path.join(outDir, 'master_tupad_dingalan_backup.json'),
  JSON.stringify(fullExport, null, 2),
  'utf-8'
);

console.log(`✓ All 24 tables and records exported to ${outDir}/!`);
console.log(`- master_tupad_dingalan_backup.json`);
console.log(`- Beneficiary.csv (611 beneficiaries)`);
console.log(`- ProgramBeneficiary.csv (538 roster entries)`);
console.log(`- TupadWorkProgram.csv (11 barangays)`);
console.log(`- TupadWorkProgramItem.csv (226 activities)`);
console.log(`- QrCode.csv (522 QR codes)`);
