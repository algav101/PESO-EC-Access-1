// Isolated Chrome profile, synthetic origin/records, real Dexie + IndexedDB. No live API/database access.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const compile = file => ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;
const modules = { queue: compile("src/lib/dexie.ts"), monitor: compile("src/lib/offline-monitoring.ts") };
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext();
await context.route("**/*", route => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Synthetic offline sync test</title>" }));
const install = async page => {
  await page.goto("http://offline-sync.test");
  await page.addScriptTag({ path: require.resolve("dexie/dist/dexie.js") });
  await page.evaluate(modules => {
    const load = code => {
      const exports = {};
      new Function("require", "exports", code)(name => {
        if (name === "dexie") return window.Dexie;
        if (name === "date-fns") return { format: () => "SYNTHETIC" };
        if (name === "@/lib/dingalan-groupings") return { normalizeBarangayName: x => x || "", normalizeSitioName: x => x || "" };
        if (name === "@/lib/utils" || name === "@/lib/program-qr-slot") return {};
        if (name === "./dexie") return window.queue;
        throw new Error("Unexpected import " + name);
      }, exports);
      return exports;
    };
    window.queue = load(modules.queue);
    window.monitor = load(modules.monitor);
    window.db = window.queue.offlineDb;
  }, modules);
};
try {
  const page = await context.newPage();
  await install(page);
  await page.evaluate(async () => {
    const legacy = new window.Dexie("TupadOfflineDB_Dingalan");
    legacy.version(2).stores({
      cachedPrograms: "id, programCode, status",
      cachedBeneficiaries: "id, programId, designatedNumber, qrToken, barangay, fullName",
      cachedWorkDays: "id, programId, dayNumber, workDate",
      cachedWorkProgramItems: "id, programId, barangay, dayNumber",
      offlineAttendanceRecords: "++id, [programId+workDayId+programBeneficiaryId], programBeneficiaryId, workDayId, attendanceDate",
      offlineQueue: "++id, clientTransactionId, entityType, status, createdAt",
    });
    legacy.version(3).stores({ cachedQrSlots: "publicToken, designatedNumber" });
    await legacy.table("offlineQueue").add({ clientTransactionId: "SYNTHETIC-LEGACY", status: "SYNCING", createdAt: "2000-01-01" });
    await legacy.table("offlineAttendanceRecords").add({ programId: "legacy-program", workDayId: "legacy-day", programBeneficiaryId: "legacy-pb" });
    legacy.close();
    if ((await window.db.offlineAttendanceRecords.where("programId").equals("legacy-program").count()) !== 1 || (await window.db.offlineQueue.count()) !== 1) throw Error("Migration lost legacy device records");
    await window.db.offlineQueue.clear();
    await window.db.offlineAttendanceRecords.clear();
  });
  console.log("PASS: existing v3 database upgrades to v4 without losing queued scans or attendance");
  const results = await page.evaluate(async () => {
    const q = window.queue, db = window.db, reports = [];
    const check = (value, message) => { if (!value) throw Error(message); };
    const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
    const payload = { programId: "synthetic-program", programBeneficiaryId: "synthetic-pb", workDayId: "synthetic-day" };
    const add = async (type = "STUB_DISTRIBUTION", more = {}) => q.queueOfflineTransaction(type, "CREATE", { ...payload, ...more });
    const ack = transactions => ({ accepted: transactions.map(t => t.clientTransactionId), duplicates: [], conflicts: [], errors: {} });
    let calls = 0, syncedEvents = 0;
    window.addEventListener("tupad-offline-synced", () => syncedEvents++);
    for (const entity of ["STUB_DISTRIBUTION", "ORIENTATION", "ATTENDANCE", "PAYOUT", "PHOTO", "REPLACEMENT"]) {
      await db.offlineQueue.clear();
      const tx = await add(entity);
      const row = (await db.offlineQueue.toArray())[0];
      await db.offlineQueue.update(row.id, { status: "SYNCING", createdAt: new Date(Date.now() - q.SYNC_LEASE_MS - 10).toISOString() });
      check(await q.getPendingQueueCount() === 1, entity + " stranded row must remain visible");
      window.fetch = async (_url, init) => { calls++; const transactions = JSON.parse(init.body).transactions; check(transactions[0].clientTransactionId === tx, "Idempotency ID changed"); return reply(ack(transactions)); };
      const result = await q.pushSyncQueue();
      check(result.accepted.length === 1 && await db.offlineQueue.count() === 0, entity + " interrupted upload recovery failed");
    }
    reports.push("PASS: six entity types recover interrupted uploads without changing transaction IDs");
    await add();
    let row = (await db.offlineQueue.toArray())[0];
    await db.offlineQueue.update(row.id, { status: "SYNCING", syncStartedAt: new Date().toISOString(), createdAt: "2000-01-01" });
    calls = 0;
    await q.pushSyncQueue();
    check(calls === 0 && await q.getPendingQueueCount() === 1, "Active lease must not be stolen");
    await db.offlineQueue.update(row.id, { status: "CONFLICT" });
    await q.retryOfflineTransaction(row.id);
    await q.retryAllFailedTransactions();
    await q.pushSyncQueue();
    check(calls === 0 && (await db.offlineQueue.get(row.id)).status === "CONFLICT", "Conflict must require review");
    reports.push("PASS: active requests and conflicts are visible and not blindly retried");
    await db.offlineQueue.clear();
    for (let i = 0; i < 25; i++) await add();
    calls = 0; syncedEvents = 0;
    window.fetch = async () => { calls++; check(await db.offlineQueue.where("status").equals("SYNCING").count() === 20, "Only current chunk may be in flight"); return reply({ error: "Synthetic expired login" }, 401); };
    const unauthorized = await q.pushSyncQueue();
    check(unauthorized.authRequired && unauthorized.remaining === 25 && calls === 1 && syncedEvents === 0, "401 must not look successful or drain later chunks");
    check(await db.offlineQueue.where("status").equals("PENDING").count() === 5, "Unsent chunks must stay pending");
    const beforeMaster = await db.cachedBeneficiaries.toArray();
    const master = await q.forceMasterSyncWithServer({ id: "synthetic-user" });
    check(!master.success && JSON.stringify(beforeMaster) === JSON.stringify(await db.cachedBeneficiaries.toArray()), "Master must not reset on upload failure");
    reports.push("PASS: auth failures preserve all records; Master Sync refuses false success");
    await db.offlineQueue.clear();
    const a = await add(), b = await add(), c = await add();
    window.fetch = async () => reply({ accepted: [a], duplicates: [], conflicts: [b], errors: { [b]: "Synthetic conflict" } });
    const partial = await q.pushSyncQueue();
    check(partial.remaining === 2 && partial.failed.includes(c) && !await db.offlineQueue.where("clientTransactionId").equals(a).first(), "Partial ACK handling");
    const failed = await db.offlineQueue.where("clientTransactionId").equals(c).first();
    check(failed.status === "FAILED", "Unacknowledged row must stay retryable");
    window.fetch = async () => new Response("not JSON", { status: 200 });
    await q.pushSyncQueue();
    check(await db.offlineQueue.count() === 2, "Malformed ACK must not delete data");
    window.fetch = async (_url, init) => { const sent = JSON.parse(init.body).transactions; return reply({ accepted: [], duplicates: sent.map(t => t.clientTransactionId), conflicts: [], errors: {} }); };
    const duplicate = await q.pushSyncQueue();
    check(duplicate.duplicates.length === 1 && await db.offlineQueue.count() === 1, "Duplicate ACK removes only acknowledged row");
    reports.push("PASS: partial, duplicate and malformed acknowledgments preserve unresolved records");
    await db.offlineQueue.clear();
    await db.cachedBeneficiaries.put({ id: "synthetic-pb", ...payload, beneficiaryId: "synthetic-bene", fullName: "SYNTHETIC PERSON", barangay: "Ibona", designatedNumber: "248", status: "ACTIVE", birthday: "1990-01-01", birthdayPin: "01-01-1990", stubDistributed: true });
    const attendanceId = await db.offlineAttendanceRecords.add({ ...payload, attendanceDate: "2026-11-01", status: "PRESENT", scannedAt: "2026-11-01", morningTimeIn: "2026-11-01T00:00:00Z", afternoonTimeOut: "2026-11-01T09:00:00Z", isSynced: false });
    await add("STUB_DISTRIBUTION"); await add("ORIENTATION", { status: "PRESENT" }); await add("PAYOUT", { status: "PAID" });
    const att1 = await add("ATTENDANCE", { morningTimeIn: "2026-11-01T00:00:00Z" });
    await add("ATTENDANCE");
    // Simulate the legacy cache having already overwritten AM IN and marked this record synced.
    await db.offlineAttendanceRecords.update(attendanceId, { isSynced: true, morningTimeIn: "2026-11-01T00:05:00Z" });
    const serverBene = { id: "synthetic-pb", beneficiaryId: "synthetic-bene", designatedNumber: "248", beneficiary: { fullName: "SYNTHETIC PERSON", birthday: "1990-01-01", barangay: "Ibona" }, attendanceRecords: [{ workDayId: "synthetic-day", morningTimeIn: "2026-11-01T00:05:00Z" }], stubDistributions: [], orientationAttendance: [], payouts: [] };
    const snapshotFetch = async url => {
      if (url === "/api/v1/programs") return reply({ programs: [{ id: "synthetic-program", programCode: "SYNTHETIC", workDays: [] }] });
      if (url === "/api/v1/qr/slots") return reply({ slots: [] });
      if (url.endsWith("/work-program")) return reply({ workPrograms: [] });
      if (url.endsWith("/beneficiaries")) return reply({ beneficiaries: [serverBene] });
      throw Error("Unexpected URL " + url);
    };
    window.fetch = snapshotFetch;
    await q.initializeUserOfflineCache({ id: "synthetic-user" });
    const cached = await db.cachedBeneficiaries.get("synthetic-pb");
    check(cached.stubDistributed && cached.orientationStatus === "PRESENT" && cached.payoutStatus === "PAID", "Pending scan overlay lost");
    const attendance = await db.offlineAttendanceRecords.get(attendanceId);
    check(!attendance.isSynced && attendance.morningTimeIn === "2026-11-01T00:00:00Z" && attendance.afternoonTimeOut, "Pending attendance overwritten");
    check((await db.offlineAttendanceRecords.where("programId").equals("synthetic-program").toArray()).length === 1, "Matrix program index missing");
    const monitor = await window.monitor.getCachedMonitoring("synthetic-program", "stub");
    check(monitor.summary.totalConfirmed === 0 && monitor.summary.totalPending === 1 && monitor.beneficiaries[0].status === "PENDING_SYNC", "Queued stub must not count as confirmed");
    const orientation = await window.monitor.getCachedMonitoring("synthetic-program", "orientation");
    check(orientation.summary.totalOrientationScanned === 0 && orientation.beneficiaries[0].pendingOrientationSync, "Queued orientation must not count as confirmed");
    const before = JSON.stringify(await db.cachedBeneficiaries.toArray());
    window.fetch = async url => url.endsWith("/beneficiaries") ? reply({ error: "Synthetic outage" }, 500) : snapshotFetch(url);
    let threw = false;
    try { await q.initializeUserOfflineCache({ id: "synthetic-user" }); } catch { threw = true; }
    check(threw && JSON.stringify(await db.cachedBeneficiaries.toArray()) === before, "Failed download changed cache");
    window.fetch = async () => reply({ accepted: [att1], duplicates: [], conflicts: [], errors: {} });
    await q.pushSyncQueue();
    check(!(await db.offlineAttendanceRecords.get(attendanceId)).isSynced, "First ACK incorrectly marked a later attendance update synced");
    window.fetch = async (_url, init) => reply(ack(JSON.parse(init.body).transactions));
    await q.pushSyncQueue();
    check((await db.offlineAttendanceRecords.get(attendanceId)).isSynced, "Final attendance ACK missing");
    reports.push("PASS: atomic downloads retain pending stub/orientation/payout and attendance; real program index works");
    window.fetch = snapshotFetch;
    check((await q.forceMasterSyncWithServer({ id: "synthetic-user" })).success, "Master Sync must succeed after all ACKs");
    // Persistent reload fixture: the next page will recover the same row, not invent a new transaction.
    const reloadId = await add();
    row = await db.offlineQueue.where("clientTransactionId").equals(reloadId).first();
    await db.offlineQueue.update(row.id, { status: "SYNCING", syncStartedAt: "2000-01-01T00:00:00Z" });
    localStorage.setItem("synthetic-reload-tx", reloadId);
    return reports;
  });
  results.forEach(line => console.log(line));
  await page.reload();
  // Reinstall app module after a genuine navigation; IndexedDB survives the reload.
  await install(page);
  assert.equal(await page.evaluate(async () => {
    const expected = localStorage.getItem("synthetic-reload-tx");
    window.fetch = async (_url, init) => {
      const ids = JSON.parse(init.body).transactions.map(t => t.clientTransactionId);
      if (ids[0] !== expected) throw Error("Reload changed original transaction ID");
      return new Response(JSON.stringify({ accepted: ids, duplicates: [], conflicts: [], errors: {} }));
    };
    await window.queue.pushSyncQueue();
    return window.db.offlineQueue.count();
  }), 0);
  console.log("PASS: genuine reload recovers the persisted request with its original ID");
  const second = await context.newPage();
  await install(second);
  let requests = 0;
  await context.route("**/api/v1/sync/push", async route => {
    requests++;
    const ids = route.request().postDataJSON().transactions.map(t => t.clientTransactionId);
    await route.fulfill({ json: { accepted: ids, duplicates: [], conflicts: [], errors: {} } });
  });
  // Restore real fetch in both tabs so the synthetic route records cross-tab requests.
  await install(page);
  await page.evaluate(() => window.queue.queueOfflineTransaction("STUB_DISTRIBUTION", "CREATE", { programId: "synthetic-program", programBeneficiaryId: "synthetic-pb" }));
  await Promise.all([page.evaluate(() => window.queue.pushSyncQueue()), second.evaluate(() => window.queue.pushSyncQueue())]);
  assert.equal(requests, 1);
  assert.equal(await page.evaluate(() => window.db.offlineQueue.count()), 0);
  console.log("PASS: two tabs upload a queued transaction once (Web Lock + atomic claim)");
} finally { await context.close(); await browser.close(); }
