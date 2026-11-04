// Integration test against a NEW disposable, loopback-only PostgreSQL cluster.
// Never uses DATABASE_URL/DIRECT_URL from .env or the shared Supabase database.
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
const pgBin = process.env.TEST_POSTGRES_BIN || "C:/Program Files/PostgreSQL/18/bin";
const root = process.cwd(), cacheRoot = path.resolve(root, "node_modules/.cache");
fs.mkdirSync(cacheRoot, { recursive: true });
const dataDir = fs.mkdtempSync(path.join(cacheRoot, "masterlist-pg-"));
const suffix = process.platform === "win32" ? ".exe" : "";
function run(program, args, env = process.env) {
  const result = cp.spawnSync(program, args, { encoding: "utf8", windowsHide: true, env, maxBuffer: 4 * 1024 * 1024, timeout: 30000, stdio: path.basename(program).startsWith("pg_ctl") ? "ignore" : "pipe" });
  if (result.status !== 0) throw new Error(`Local test command failed: ${path.basename(program)} (${result.status}): ${result.stderr || result.stdout}`);
  return result.stdout;
}
const listener = net.createServer();
await new Promise((resolve, reject) => { listener.once("error", reject); listener.listen(0, "127.0.0.1", resolve); });
const port = listener.address().port;
await new Promise((resolve) => listener.close(resolve));
const testUrl = `postgresql://roster_test@127.0.0.1:${port}/postgres?schema=public`;
assert.equal(new URL(testUrl).hostname, "127.0.0.1");
let started = false, db;
try {
  run(path.join(pgBin, "initdb" + suffix), ["-D", dataDir, "-U", "roster_test", "-A", "trust", "--no-locale", "-E", "UTF8"]);
  run(path.join(pgBin, "pg_ctl" + suffix), ["-D", dataDir, "-l", path.join(dataDir, "test-server.log"), "-o", `-h 127.0.0.1 -p ${port} -F`, "-w", "start"]);
  started = true;
  run(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate", "--schema", "prisma/schema.prisma"], { ...process.env, DATABASE_URL: testUrl, DIRECT_URL: testUrl });
  db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const admin = await db.user.create({ data: { username: "synthetic-import-admin", passwordHash: "synthetic-not-a-real-password", fullName: "Synthetic Admin", role: "PESO_ADMIN" } });
  const program = await db.program.create({ data: { programCode: "SYNTHETIC-IMPORT", programName: "Synthetic import test", status: "ACTIVE", createdById: admin.id } });
  const rows = Array.from({ length: 500 }, (_, i) => ({ fullName: `SYNTHETIC BENEFICIARY ${String(i).padStart(4, "0")}`, birthday: "1990-01-02", designatedNumber: String(i + 1), barangay: "Aplaya", sitio: "Centro", occupation: "SYNTHETIC UPDATED", dependentFullName: "Synthetic Dependent", dependentRelationship: "TEST", status: i < 3 ? "EXEMPTED" : "VALID", isExempted: i < 3, exemptionReason: i < 3 ? "Synthetic authorized exemption" : undefined }));
  // Seed the same 290 existing / 210 new split shown in the reported failure.
  await db.beneficiary.createMany({ data: rows.slice(0, 290).map((r, i) => ({ id: `synthetic-bene-${i}`, fullName: r.fullName, birthday: r.birthday, beneficiaryNumber: `SYNTHETIC-${i}`, occupation: "SYNTHETIC OLD" })) });
  await db.programBeneficiary.createMany({ data: rows.slice(0, 290).map((r, i) => ({ id: `synthetic-enrollment-${i}`, beneficiaryId: `synthetic-bene-${i}`, programId: program.id, designatedNumber: r.designatedNumber })) });
  await db.qrCode.createMany({ data: rows.slice(0, 290).map((r, i) => ({ programId: program.id, programBeneficiaryId: `synthetic-enrollment-${i}`, publicToken: `synthetic-token-${i}`, tokenHash: `synthetic-hash-${i}` })) });
  await db.beneficiaryRestriction.createMany({ data: [0, 1, 2].map((i) => ({ beneficiaryId: `synthetic-bene-${i}`, reason: "Synthetic restriction", payoutDate: "2026-01-01", restrictionEnd: "2099-12-31" })) });
  let failQr = false, failAudit = false, failCommitAcknowledgement = false;
  const injectedDb = new Proxy(db, { get(target, key) {
    if (key === "$transaction") return async (callback, options) => { const result = await target.$transaction(async (tx) => callback(new Proxy(tx, { get(inner, property) {
      if (property === "qrCode") return new Proxy(inner.qrCode, { get(delegate, method) {
        if (method === "createMany") return (args) => { if (failQr) throw new Error("Synthetic QR failure"); return delegate.createMany(args); };
        return delegate[method];
      } });
      if (property === "auditLog") return new Proxy(inner.auditLog, { get(delegate, method) {
        if (method === "create") return (args) => { if (failAudit) throw new Error("Synthetic audit failure"); return delegate.create(args); };
        return delegate[method];
      } });
      const value = inner[property]; return typeof value === "function" ? value.bind(inner) : value;
    } })), options); if (failCommitAcknowledgement) throw new Error("Synthetic lost commit acknowledgement"); return result; };
    const value = target[key]; return typeof value === "function" ? value.bind(target) : value;
  } });
  const cache = new Map();
  function load(file) {
    const resolved = path.resolve(root, file);
    if (cache.has(resolved)) return cache.get(resolved).exports;
    const module = { exports: {} }; cache.set(resolved, module);
    const code = ts.transpileModule(fs.readFileSync(resolved, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
    const scopedRequire = (name) => {
      if (name === "@/lib/prisma") return { __esModule: true, default: injectedDb };
      if (name === "@/lib/auth") return { getCurrentUser: async () => admin, hasPermission: () => true };
      if (name.startsWith("@/")) return load(path.join("src", name.slice(2)) + ".ts");
      return require(name);
    };
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: resolved })(scopedRequire, module, module.exports);
    return module.exports;
  }
  const commit = load("src/app/api/v1/beneficiaries/import/commit/route.ts");
  const scoped = load("src/app/api/v1/programs/[id]/beneficiaries/import/commit/route.ts");
  const request = (inputRows = rows, extra = {}) => new Request("http://synthetic.test/api/v1/beneficiaries/import/commit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: inputRows, programId: program.id, ...extra }) });
  failQr = true;
  const failed = await commit.POST(request());
  assert.equal(failed.status, 503);
  assert.equal((await failed.json()).code, "IMPORT_ROLLED_BACK");
  assert.equal(await db.beneficiary.count(), 290, "new parents must roll back after child failure");
  assert.equal(await db.dependent.count(), 0);
  assert.equal(await db.programBeneficiary.count(), 290);
  assert.equal(await db.qrCode.count(), 290);
  assert.equal(await db.auditLog.count(), 0);
  assert.equal((await db.beneficiary.findFirst()).occupation, "SYNTHETIC OLD", "bulk updates must roll back too");
  failQr = false;
  failAudit = true;
  assert.equal((await commit.POST(request())).status, 503);
  assert.equal(await db.beneficiary.count(), 290);
  assert.equal(await db.programBeneficiary.count(), 290);
  assert.equal(await db.qrCode.count(), 290);
  assert.equal(await db.beneficiaryRestriction.count({ where: { status: "ACTIVE" } }), 3, "exemption overrides must roll back after an audit failure");
  failAudit = false;
  const startedAt = Date.now();
  const response = await commit.POST(request());
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual([result.importedCount, result.newCount, result.updatedCount, result.exemptedCount], [500, 210, 290, 3]);
  assert.equal(await db.beneficiary.count(), 500);
  assert.equal(await db.dependent.count(), 210, "dependent inserts must follow committed-in-transaction parents");
  assert.equal(await db.programBeneficiary.count(), 500);
  assert.equal(await db.qrCode.count(), 500);
  assert.equal(await db.beneficiaryRestriction.count({ where: { status: "OVERRIDDEN" } }), 3);
  assert.equal((await db.program.findUnique({ where: { id: program.id } })).beneficiaryCount, 500);
  assert.equal(await db.beneficiary.count({ where: { occupation: "SYNTHETIC UPDATED" } }), 500);
  const reportSource = await db.auditLog.findFirst({ where: { entityType: "PROGRAM_REPORT_MASTERLIST", entityId: program.id }, orderBy: { createdAt: "desc" } });
  assert.equal(Object.keys(JSON.parse(reportSource.newData).rows).length, 500, "report source must be captured atomically for the selected program");
  const reportService = load("src/lib/dole-report-service.ts");
  const reportData = await reportService.loadDoleReport(program.id);
  assert.equal(reportData.rows.length, 500);
  assert.equal(reportData.program.id, program.id);
  const draft = { meta: { dailyRate: "600" }, rows: {}, cells: {} };
  await reportService.saveDoleReportDraft(program.id, draft, null, admin.id);
  assert.equal((await reportService.loadDoleReport(program.id)).meta.dailyRate, "600");
  await assert.rejects(reportService.saveDoleReportDraft(program.id, draft, null, admin.id), /changed by another user/);
  const retry = await commit.POST(request());
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).newCount, 0);
  assert.equal(await db.beneficiary.count(), 500, "retry must not duplicate beneficiaries");
  assert.equal(await db.dependent.count(), 210);
  assert.equal(await db.programBeneficiary.count(), 500, "retry must not duplicate enrollments");
  assert.equal(await db.qrCode.count(), 500, "retry must retain existing QR tokens");
  // Repair an existing enrollment from a legacy partial save, without duplicating it.
  await db.qrCode.deleteMany({ where: { programBeneficiaryId: "synthetic-enrollment-0" } });
  assert.equal((await commit.POST(request([rows[0]]))).status, 200);
  assert.equal(await db.qrCode.count(), 500);
  const skipped = await commit.POST(request(rows, { duplicateStrategy: "SKIP" }));
  assert.equal((await skipped.json()).skippedCount, 500);
  assert.equal(await db.qrCode.count(), 500);
  assert.equal((await commit.POST(request([rows[0], rows[0]]))).status, 400);
  assert.equal((await commit.POST(request([{ ...rows[0], designatedNumber: "2" }, { ...rows[1], designatedNumber: "1" }]))).status, 200);
  assert.equal(await db.programBeneficiary.count({ where: { participationStatus: "ACTIVE" } }), 500, "moving existing beneficiaries between slots must not mark either one replaced");
  assert.equal(await db.beneficiaryReplacement.count(), 0);
  failCommitAcknowledgement = true;
  const uncertain = await commit.POST(request([rows[0]]));
  assert.equal(uncertain.status, 503);
  assert.equal((await uncertain.json()).code, "IMPORT_RESULT_UNKNOWN", "lost commit acknowledgement must not promise a rollback");
  assert.equal(await db.beneficiary.count(), 500);
  failCommitAcknowledgement = false;
  const malformed = new Request("http://synthetic.test", { method: "POST", body: "not json" });
  assert.equal((await scoped.POST(malformed, { params: { id: program.id } })).status, 400);
  const scopedResult = await scoped.POST(request([rows[0]], { programId: "wrong-program-in-body" }), { params: { id: program.id } });
  assert.equal((await scopedResult.json()).programId, program.id, "URL program cannot be overridden by posted data");
  let unlock, acquired, lockFailed;
  const lockReady = new Promise((resolve, reject) => { acquired = resolve; lockFailed = reject; });
  const release = new Promise((resolve) => { unlock = resolve; });
  const held = db.$transaction(async (tx) => {
    const [lock] = await tx.$queryRaw`SELECT pg_try_advisory_xact_lock(hashtextextended(${program.id}, 0)) AS locked`;
    assert.equal(lock.locked, true);
    acquired(); await release;
  }, { timeout: 10000 });
  held.catch((error) => lockFailed(error));
  try { await lockReady; assert.equal((await commit.POST(request())).status, 409); }
  finally { unlock(); await held; }
  console.log(`Masterlist PostgreSQL integration passed: 500 rows (290 merge / 210 new), FK ordering, real bulk SQL, atomic rollback, retry without duplicates, QR repair, skip, scoped target and concurrent-import lock (${Date.now() - startedAt}ms). Shared database untouched.`);
} finally {
  if (db) await db.$disconnect();
  if (started) run(path.join(pgBin, "pg_ctl" + suffix), ["-D", dataDir, "-m", "immediate", "-w", "stop"]);
  // Only the unique cluster generated by this test may be removed.
  if (!path.resolve(dataDir).startsWith(cacheRoot + path.sep + "masterlist-pg-")) throw new Error("Unsafe test cleanup path");
  fs.rmSync(dataDir, { recursive: true, force: true });
}
