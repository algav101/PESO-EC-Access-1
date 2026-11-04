// Synthetic data only, in a disposable loopback PostgreSQL cluster. Never reads .env.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import cp from "node:child_process";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const root = process.cwd(), cacheRoot = path.resolve(root, "node_modules/.cache");
fs.mkdirSync(cacheRoot, { recursive: true });
const dataDir = fs.mkdtempSync(path.join(cacheRoot, "program-qr-pg-"));
const pgBin = process.env.TEST_POSTGRES_BIN || "C:/Program Files/PostgreSQL/18/bin";
const suffix = process.platform === "win32" ? ".exe" : "";
function run(program, args, env = process.env) {
  const result = cp.spawnSync(program, args, { encoding: "utf8", windowsHide: true, env, timeout: 30000, maxBuffer: 4 * 1024 * 1024, stdio: path.basename(program).startsWith("pg_ctl") ? "ignore" : "pipe" });
  if (result.status !== 0) throw new Error(`${path.basename(program)}: ${result.stderr || result.stdout || result.status}`);
}
const listener = net.createServer();
await new Promise((resolve, reject) => { listener.once("error", reject); listener.listen(0, "127.0.0.1", resolve); });
const port = listener.address().port;
await new Promise((resolve) => listener.close(resolve));
const testUrl = `postgresql://qr_test@127.0.0.1:${port}/postgres?schema=public`;
assert.equal(new URL(testUrl).hostname, "127.0.0.1");
let started = false, db;
try {
  run(path.join(pgBin, "initdb" + suffix), ["-D", dataDir, "-U", "qr_test", "-A", "trust", "--no-locale", "-E", "UTF8"]);
  run(path.join(pgBin, "pg_ctl" + suffix), ["-D", dataDir, "-l", path.join(dataDir, "test.log"), "-o", `-h 127.0.0.1 -p ${port} -F`, "-w", "start"]);
  started = true;
  run(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate", "--schema", "prisma/schema.prisma"], { ...process.env, DATABASE_URL: testUrl, DIRECT_URL: testUrl });
  db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const admin = await db.user.create({ data: { username: "synthetic-qr-admin", passwordHash: "synthetic", fullName: "Synthetic QR Admin", role: "PESO_ADMIN" } });
  let authorized = true;
  const cache = new Map();
  function load(file) {
    const resolved = path.resolve(root, file);
    if (cache.has(resolved)) return cache.get(resolved).exports;
    const module = { exports: {} }; cache.set(resolved, module);
    const code = ts.transpileModule(fs.readFileSync(resolved, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const localRequire = (name) => {
      if (name === "@/lib/prisma" || (name === "./prisma" && resolved.endsWith(path.join("lib", "audit.ts")))) return { __esModule: true, default: db };
      if (name === "@/lib/auth") return { getCurrentUser: async () => authorized ? admin : null, hasPermission: () => authorized };
      if (name.startsWith("@/")) return load(path.join("src", name.slice(2)) + ".ts");
      return require(name);
    };
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: resolved })(localRequire, module, module.exports);
    return module.exports;
  }
  const request = (body) => new Request("http://synthetic.test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const route = (stage) => load(`src/app/api/v1/${stage}/scan/route.ts`);
  const qr = load("src/lib/qr.ts");
  const old = await db.program.create({ data: { programCode: "SYNTHETIC-OLD", programName: "Old QR program", status: "COMPLETED", createdById: admin.id } });
  const oldDay = await db.workDay.create({ data: { programId: old.id, dayNumber: 1, workDate: "2026-09-20" } });
  const rows = Array.from({ length: 600 }, (_, i) => ({ fullName: `SYNTHETIC QR PERSON ${String(i + 1).padStart(4, "0")}`, birthday: "1990-01-02", designatedNumber: String(i + 1), barangay: "Aplaya", sitio: "Centro", status: "VALID" }));
  await db.beneficiary.createMany({ data: rows.slice(0, 522).map((r, i) => ({ id: `bene-${i + 1}`, beneficiaryNumber: `TEST-${i + 1}`, fullName: r.fullName, birthday: r.birthday })) });
  await db.programBeneficiary.createMany({ data: rows.slice(0, 522).map((r, i) => ({ id: `old-pb-${i + 1}`, programId: old.id, beneficiaryId: `bene-${i + 1}`, designatedNumber: r.designatedNumber })) });
  await db.qrCode.createMany({ data: rows.slice(0, 522).map((r, i) => ({ programId: old.id, programBeneficiaryId: `old-pb-${i + 1}`, ...qr.generateBeneficiaryToken(old.id, r.designatedNumber) })) });
  const printed = await db.qrCode.findFirst({ where: { programBeneficiaryId: "old-pb-113" } });
  await db.stubDistribution.create({ data: { qrId: printed.id, programBeneficiaryId: "old-pb-113", verificationMethod: "BIRTHDAY_PIN", status: "DISTRIBUTED", distributedAt: new Date("2026-09-20") } });
  await db.orientationAttendance.create({ data: { programId: old.id, programBeneficiaryId: "old-pb-113", scannedAt: new Date("2026-09-20") } });
  await db.attendanceRecord.create({ data: { programId: old.id, programBeneficiaryId: "old-pb-113", workDayId: oldDay.id, attendanceDate: "2026-09-20", morningTimeIn: new Date("2026-09-20") } });
  await db.payout.create({ data: { programId: old.id, programBeneficiaryId: "old-pb-113", status: "PAID", payoutDate: "2026-09-30" } });
  const oldHistory = async () => JSON.stringify(await db.programBeneficiary.findUnique({ where: { id: "old-pb-113" }, include: { stubDistributions: true, orientationAttendance: true, attendanceRecords: true, payouts: true } }));
  const snapshot = await oldHistory();
  const created = await load("src/app/api/v1/programs/route.ts").POST(request({ programCode: "SYNTHETIC-NEW", programName: "New 600 roster", startDate: "2026-11-04", requiredWorkDays: 1 }));
  assert.equal(created.status, 201);
  const program = (await created.json()).program;
  const commit = load("src/app/api/v1/beneficiaries/import/commit/route.ts");
  const imported = await commit.POST(request({ programId: program.id, rows }));
  assert.equal(imported.status, 200, JSON.stringify(await imported.clone().json()));
  assert.equal(await db.qrCode.count({ where: { programId: program.id } }), 600);
  assert.equal(await db.orientationAttendance.count({ where: { programId: program.id } }), 0);
  assert.equal(await db.attendanceRecord.count({ where: { programId: program.id } }), 0);
  assert.equal(await db.payout.count({ where: { programId: program.id } }), 0);
  const newPbs = await db.programBeneficiary.findMany({ where: { programId: program.id }, include: { stubDistributions: true } });
  assert.equal(newPbs.length, 600); assert.ok(newPbs.every((b) => b.stubDistributions.length === 0));
  const pb = newPbs.find((p) => p.designatedNumber === "113");
  // Reassign the slot to a DIFFERENT beneficiary; the printed card must follow the slot, not the old person.
  await db.programBeneficiary.update({ where: { id: pb.id }, data: { beneficiaryId: newPbs.find((p) => p.designatedNumber === "600").beneficiaryId } });
  const raw = `https://synthetic.test/my-assignment?token=${printed.publicToken}`;
  const scanBody = { qrToken: raw, programId: program.id };
  assert.equal((await route("orientation").POST(request(scanBody))).status, 400, "new enrollee must complete THIS program's stub first");
  const lookup = await route("stub-distribution").POST(request(scanBody));
  assert.equal(lookup.status, 200);
  const details = (await lookup.json()).data;
  assert.equal(details.programBeneficiaryId, pb.id); assert.notEqual(details.qrId, printed.id);
  assert.match(details.fullName, /0600$/);
  const affirmed = await load("src/app/api/v1/stub-distribution/verify-birthday/route.ts").POST(request({ ...details, programId: program.id, birthdayPin: "01-02-1990" }));
  assert.equal(affirmed.status, 200);
  assert.equal((await route("orientation").POST(request({ qrToken: "00113", programId: program.id }))).status, 200, "numeric slots must never substring-match old QR tokens");
  assert.equal((await route("orientation").POST(request(scanBody))).status, 400, "same-program duplicate scanning stays blocked");
  const day = await db.workDay.findFirst({ where: { programId: program.id } });
  assert.equal((await route("attendance").POST(request({ ...scanBody, workDayId: oldDay.id }))).status, 400);
  for (const shiftMode of ["MORNING_IN", "MORNING_OUT", "AFTERNOON_IN", "AFTERNOON_OUT"]) {
    const response = await route("attendance").POST(request({ ...scanBody, workDayId: day.id, shiftMode }));
    assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
  }
  assert.equal((await route("attendance").POST(request({ ...scanBody, workDayId: day.id, shiftMode: "MORNING_IN" }))).status, 400);
  assert.equal((await route("payout").POST(request({ ...scanBody, isLookupOnly: true }))).status, 200);
  assert.equal((await route("payout").POST(request({ ...scanBody, status: "PAID" }))).status, 200);
  assert.equal((await route("payout").POST(request({ ...scanBody, status: "PAID" }))).status, 400);
  assert.equal(await oldHistory(), snapshot, "old program history must remain byte-for-byte unchanged");
  for (const stage of ["orientation", "attendance", "payout", "stub-distribution"]) {
    assert.equal((await route(stage).POST(request({ qrToken: raw }))).status, 400);
    assert.equal((await route(stage).POST(request({ programId: program.id, qrToken: "601" }))).status, 404);
    assert.equal((await route(stage).POST(request({ programId: program.id, qrToken: printed.publicToken.slice(0, -1) }))).status, 404);
  }
  await db.qrCode.update({ where: { id: printed.id }, data: { status: "INVALIDATED" } });
  assert.equal((await route("stub-distribution").POST(request(scanBody))).status, 404);
  await db.qrCode.update({ where: { id: printed.id }, data: { status: "ACTIVE" } });
  // Test repairing a legacy 522-only generation without reprinting/resetting #1–#522.
  const extraIds = newPbs.filter((p) => Number(p.designatedNumber) > 522).map((p) => p.id);
  await db.qrCode.deleteMany({ where: { programId: program.id, programBeneficiaryId: { in: extraIds } } });
  const firstTokens = await db.qrCode.findMany({ where: { programId: program.id }, orderBy: { publicToken: "asc" } });
  assert.equal(firstTokens.length, 522);
  const generate = load("src/app/api/v1/programs/[id]/qr/generate/route.ts");
  // Imports and QR creation use the same per-program advisory lock.
  let locked, lockFailed, unlock;
  const ready = new Promise((resolve, reject) => { locked = resolve; lockFailed = reject; });
  const release = new Promise((resolve) => { unlock = resolve; });
  const held = db.$transaction(async (tx) => {
    const [lock] = await tx.$queryRaw`SELECT pg_try_advisory_xact_lock(hashtextextended(${program.id}, 0)) AS locked`;
    assert.equal(lock.locked, true);
    locked(); await release;
  }, { timeout: 10000 });
  held.catch((error) => lockFailed(error));
  try { await ready; assert.equal((await generate.POST(request({}), { params: { id: program.id } })).status, 409); }
  finally { unlock(); await held; }
  assert.equal(await db.qrCode.count({ where: { programId: program.id } }), 522);
  // A downstream failure after bulk QR creation rolls back the entire batch.
  const { ensureProgramQrCodes } = load("src/lib/program-qr-generation.ts");
  await assert.rejects(db.$transaction(async (tx) => { await ensureProgramQrCodes(tx, program.id, admin.id); throw new Error("synthetic downstream failure"); }), /synthetic downstream failure/);
  assert.equal(await db.qrCode.count({ where: { programId: program.id } }), 522);
  const generated = await generate.POST(request({}), { params: { id: program.id } });
  assert.equal(generated.status, 200);
  const stats = await generated.json();
  assert.deepEqual([stats.generatedCount, stats.firstGeneratedSlot, stats.lastGeneratedSlot], [78, "523", "600"]);
  assert.equal(await db.qrCode.count({ where: { programId: program.id } }), 600);
  const repeated = await generate.POST(request({}), { params: { id: program.id } });
  assert.equal((await repeated.json()).generatedCount, 0);
  assert.deepEqual(await db.qrCode.findMany({ where: { id: { in: firstTokens.map((q) => q.id) } }, orderBy: { publicToken: "asc" } }), firstTokens);
  assert.equal(await oldHistory(), snapshot);
  assert.equal(await db.orientationAttendance.count({ where: { programId: program.id } }), 1, "generation must not reset current-program scans either");
  const slots = await load("src/app/api/v1/qr/slots/route.ts").GET();
  assert.equal(slots.status, 200); assert.ok((await slots.json()).slots.some((q) => q.publicToken === printed.publicToken && q.designatedNumber === "113"));
  const push = load("src/app/api/v1/sync/push/route.ts");
  const queued = await push.POST(request({ transactions: ["ORIENTATION", "ATTENDANCE", "PAYOUT", "STUB_DISTRIBUTION"].map((entityType) => ({ entityType, clientTransactionId: `wrong-program-${entityType}`, payload: { programId: program.id, programBeneficiaryId: "old-pb-113", status: "PRESENT" } })) }));
  const sync = await queued.json(); assert.equal(sync.accepted.length, 0); assert.equal(sync.failed.length, 4); assert.equal(await oldHistory(), snapshot);
  const assignment = await load("src/app/api/v1/work-assignment/lookup/route.ts").GET(new Request(`http://synthetic.test?token=${printed.publicToken}`));
  assert.equal(assignment.status, 200); assert.match(JSON.stringify(await assignment.json()), /0600/);
  authorized = false;
  assert.equal((await generate.POST(request({}), { params: { id: program.id } })).status, 403);
  assert.equal((await load("src/app/api/v1/qr/slots/route.ts").GET()).status, 401);
  console.log("Program QR PostgreSQL integration passed: new 600-person roster starts at zero, reusable printed slots, four scanner stages, duplicate protection, no old-history mutation, #523–#600 extension, idempotent generation, invalid QR rejection, public routing and cross-program offline sync guards. Shared database untouched.");
} finally {
  if (db) await db.$disconnect();
  if (started) run(path.join(pgBin, "pg_ctl" + suffix), ["-D", dataDir, "-m", "immediate", "-w", "stop"]);
  if (!path.resolve(dataDir).startsWith(cacheRoot + path.sep + "program-qr-pg-")) throw new Error("Unsafe test cleanup path");
  fs.rmSync(dataDir, { recursive: true, force: true });
}
