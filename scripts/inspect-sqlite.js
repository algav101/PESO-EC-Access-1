const sqlite3 = require('sqlite3').verbose ? require('sqlite3') : null;
const fs = require('fs');

async function inspectSqlite() {
  const dbPath = './prisma/dev.db';
  if (!fs.existsSync(dbPath)) {
    console.log("No dev.db found");
    return;
  }

  // Use sqlite3 package or prisma with sqlite provider if installed
  try {
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database(dbPath);

    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
      if (err) {
        console.error("Error reading tables:", err);
        return;
      }
      console.log("Tables in dev.db:", tables.map(t => t.name));

      tables.forEach(t => {
        if (!t.name.startsWith('_')) {
          db.get(`SELECT count(*) as count FROM "${t.name}"`, [], (err, row) => {
            if (!err) {
              console.log(`- ${t.name}: ${row.count} records`);
            }
          });
        }
      });
    });
  } catch (e) {
    console.log("sqlite3 npm package not directly available, checking via raw string search or alternative");
  }
}

inspectSqlite();
