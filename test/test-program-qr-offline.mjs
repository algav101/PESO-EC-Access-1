// Actual IndexedDB/Dexie in a fresh synthetic browser origin. No server/database calls.
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const compile = (file) => ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.route("**/*", (route) => route.fulfill({ contentType: "text/html", body: "<title>Synthetic QR test</title>" }));
  await page.goto("http://synthetic-qr.test");
  await page.addScriptTag({ path: "node_modules/dexie/dist/dexie.js" });
  const result = await page.evaluate(async ({ slotJs, dbJs }) => {
    function check(value, message) { if (!value) throw new Error(message); }
    // Simulate an installed version-2 client with old scans and an unsynced transaction.
    const oldDb = new Dexie("TupadOfflineDB_Dingalan");
    oldDb.version(2).stores({ cachedPrograms: "id, programCode, status", cachedBeneficiaries: "id, programId, designatedNumber, qrToken, barangay, fullName", cachedWorkDays: "id, programId, dayNumber, workDate", cachedWorkProgramItems: "id, programId, barangay, dayNumber", offlineAttendanceRecords: "++id, [programId+workDayId+programBeneficiaryId], programBeneficiaryId, workDayId, attendanceDate", offlineQueue: "++id, clientTransactionId, entityType, status, createdAt" });
    const token = "TUPAD-DGL-ABCDEF-113-12345678";
    const old = { id: "old-pb", programId: "old", beneficiaryId: "old-person", designatedNumber: "113", qrToken: token, fullName: "OLD PERSON", birthday: "1990-01-02", birthdayPin: "01-02-1990", barangay: "Aplaya", status: "ACTIVE", orientationStatus: "PRESENT", stubDistributed: true, payoutStatus: "PAID" };
    await oldDb.cachedBeneficiaries.put(old);
    await oldDb.offlineAttendanceRecords.add({ programId: "old", programBeneficiaryId: old.id, workDayId: "old-day", attendanceDate: "2026-11-04", morningTimeIn: "2026-11-04T00:00:00Z" });
    await oldDb.offlineQueue.add({ clientTransactionId: "old-unsynced", entityType: "ATTENDANCE", status: "PENDING", payload: { programId: "old", programBeneficiaryId: old.id } });
    oldDb.close();
    const slot = { exports: {} }; new Function("module", "exports", slotJs)(slot, slot.exports);
    const mod = { exports: {} };
    const util = { extractCleanQrToken: (raw) => { try { return new URL(raw).searchParams.get("token") || raw; } catch { return String(raw).trim(); } }, getPhilippineTime: () => ({ now: new Date("2026-11-04T00:05:00Z"), dateStr: "2026-11-04", timeDecimal: 8 }), determineAttendanceSlot: () => "MORNING_IN", ATTENDANCE_SLOT_LABELS: { MORNING_IN: "Morning Time-In" } };
    new Function("require", "module", "exports", dbJs)((name) => {
      if (name === "dexie") return { __esModule: true, default: Dexie };
      if (name === "date-fns") return { format: (date) => date.toISOString() };
      if (name === "@/lib/utils") return util;
      if (name === "@/lib/program-qr-slot") return slot.exports;
      if (name === "@/lib/dingalan-groupings") return { normalizeBarangayName: (s) => s, normalizeSitioName: (s) => s };
      throw new Error("Unexpected dependency " + name);
    }, mod, mod.exports);
    const { offlineDb: db, findBeneficiaryOffline: find, recordOfflineAttendance: record } = mod.exports;
    const current = { ...old, id: "new-pb", programId: "new", beneficiaryId: "NEW PERSON", fullName: "NEW PERSON", qrToken: "TUPAD-DGL-NEWWWW-113-87654321", orientationStatus: "ABSENT", stubDistributed: false, payoutStatus: "PENDING" };
    await db.cachedBeneficiaries.put(current);
    await db.cachedWorkDays.bulkPut([{ id: "old-day", programId: "old", dayNumber: 1, workDate: "2026-11-04" }, { id: "new-day", programId: "new", dayNumber: 1, workDate: "2026-11-04" }]);
    check((await find(token, "new")).id === current.id, "legacy cache alias must resolve new-program slot");
    await db.cachedQrSlots.bulkPut([{ publicToken: "__SYNCED__", designatedNumber: "" }, { publicToken: token, designatedNumber: "113" }]);
    check((await find("https://test/my-assignment?token=" + token.toLowerCase(), "new")).id === current.id, "URL/lowercase alias must resolve current-program enrollee");
    check((await find("00113", "new")).id === current.id, "leading zeros");
    check((await find("#113", "new")).id === current.id, "manual #slot");
    check(await find(token, "empty") === null, "must not fall back to the old program");
    check(await find(token) === null, "must require a selected program");
    check(await find(token.slice(0, -1), "new") === null, "partial tokens must not match");
    check(await find("600", "new") === null, "unassigned slot must not match");
    check((await db.offlineQueue.toArray()).some((q) => q.clientTransactionId === "old-unsynced"), "upgrade must preserve old queued scans");
    check((await db.cachedBeneficiaries.get(current.id)).orientationStatus === "ABSENT", "new program starts pending");
    let blocked = false;
    try { await record({ rawToken: token, programId: "new", workDayId: "old-day", shiftMode: "MORNING_IN" }); } catch { blocked = true; }
    check(blocked, "cross-program work day must fail");
    const first = await record({ rawToken: token, programId: "new", workDayId: "new-day", shiftMode: "MORNING_IN" });
    check(!first.isDuplicate && first.data.fullName === "NEW PERSON", "new-program scan must not inherit old attendance");
    check((await record({ rawToken: token, programId: "new", workDayId: "new-day", shiftMode: "MORNING_IN" })).isDuplicate, "same-program duplicate remains blocked");
    check((await db.offlineQueue.toArray()).filter((q) => q.payload.programId === "new").length === 1, "only one current-program queued scan");
    check(JSON.stringify(await db.cachedBeneficiaries.get(old.id)) === JSON.stringify(old), "old person flags unchanged");
    check((await db.offlineAttendanceRecords.where("programBeneficiaryId").equals(old.id).first()).morningTimeIn === "2026-11-04T00:00:00Z", "old attendance unchanged");
    await db.cachedQrSlots.delete(token);
    check(await find(token, "new") === null, "authoritative cache removal must invalidate stale legacy aliases");
    for (const status of [400, 401, 403, 404, 409, 503]) {
      let rejected = false;
      try { await slot.exports.readScanResponse(new Response(JSON.stringify({ error: "Synthetic denial" }), { status }), "fallback"); } catch (error) { rejected = error instanceof slot.exports.ScanRequestError; }
      check(rejected, "HTTP rejections must not become offline scans: " + status);
    }
    db.close();
    return "Offline QR tests passed: real IndexedDB v2→v3 upgrade, reusable aliases, current roster identity, separate pending flags/history/queue, duplicate protection, invalidated aliases and HTTP rejection handling.";
  }, { slotJs: compile("src/lib/program-qr-slot.ts"), dbJs: compile("src/lib/dexie.ts") });
  console.log(result); assert.match(result, /passed/);
} finally { await browser.close(); }
