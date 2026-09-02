const Database = require('better-sqlite3');
const fs = require('fs');

const db = new Database('./prisma/dev.db', { readonly: true });

console.log("=== DUMPING ALL PREVIOUS DATA STORED IN DEV.DB ===\n");

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_prisma%'").all();

const summary = {};

for (const t of tables) {
  const count = db.prepare(`SELECT count(*) as count FROM "${t.name}"`).get().count;
  summary[t.name] = count;
  console.log(`\n================== TABLE: ${t.name} (${count} records) ==================`);
  if (count > 0) {
    const rows = db.prepare(`SELECT * FROM "${t.name}" LIMIT 25`).all();
    console.table(rows);
  }
}

console.log("\n=== DATA SUMMARY ===");
console.table(summary);
