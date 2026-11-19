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
  await db.$executeRawUnsafe(fs.readFileSync("prisma/migrations/20261119000100_qr_active_roster_identity/migration.sql", "utf8"));
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
      if (name === "@/lib/auth") return { getCurrentUser: async () => authorized ? admin : null, hasPermission: (role, permission) => authorized && load("src/lib/permissions.ts").hasPermission(role, permission) };
      if (name.startsWith("@/")) return load(path.join("src", name.slice(2)) + ".ts");
      return require(name);
    };
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: resolved })(localRequire, module, module.exports);
    return module.exports;
  }
  const request = (body) => new Request("http://synthetic.test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ autoDetect: false, ...body }) });
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
  await db.program.update({ where: { id: program.id }, data: { status: "ACTIVE" } });
  const commit = load("src/app/api/v1/beneficiaries/import/commit/route.ts");
  for (const programId of [undefined, "AUTO", "undefined", ""]) {
    assert.equal((await commit.POST(request({ programId, rows }))).status, 400, "imports must never silently choose the newest batch");
    const form = new FormData(); form.append("file", new Blob(["synthetic"], { type: "text/csv" }), "synthetic.csv");
    if (programId !== undefined) form.append("programId", programId);
    assert.equal((await load("src/app/api/v1/beneficiaries/import/preview/route.ts").POST(new Request("http://synthetic.test", { method: "POST", body: form }))).status, 400);
  }
  assert.equal((await commit.POST(request({ programId: program.id, previewProgramId: old.id, rows }))).status, 409);
  assert.equal((await commit.POST(request({ programId: "missing-program", rows }))).status, 404);
  assert.equal(await db.programBeneficiary.count({ where: { programId: program.id } }), 0);
  const imported = await commit.POST(request({ programId: program.id, previewProgramId: program.id, rows }));
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
  const currentPrinted = await db.qrCode.findFirst({ where: { programBeneficiaryId: pb.id } });
  const beforeRejectedScans = JSON.stringify(await db.programBeneficiary.findMany({ orderBy: { id: "asc" }, include: { stubDistributions: true, orientationAttendance: true, attendanceRecords: true, payouts: true } }));
  for (const stage of ["orientation", "attendance", "payout", "stub-distribution"]) {
    for (const [qrToken, programId] of [[printed.publicToken, program.id], [currentPrinted.publicToken, old.id]]) {
      const rejected = await route(stage).POST(request({ qrToken: `https://synthetic.test/my-assignment?token=${qrToken.toLowerCase()}`, programId }));
      assert.equal(rejected.status, 409, stage + " must reject another program's QR even if its slot exists locally");
      assert.match((await rejected.json()).error, /WRONG WORK PROGRAM/);
    }
  }
  assert.equal(JSON.stringify(await db.programBeneficiary.findMany({ orderBy: { id: "asc" }, include: { stubDistributions: true, orientationAttendance: true, attendanceRecords: true, payouts: true } })), beforeRejectedScans, "wrong-program scans must write nothing");
  const raw = `https://synthetic.test/my-assignment?token=${currentPrinted.publicToken}`;
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
    assert.equal((await route(stage).POST(request({ programId: program.id, qrToken: printed.publicToken.slice(0, -1) }))).status, 400);
  }
  await db.qrCode.update({ where: { id: currentPrinted.id }, data: { status: "INVALIDATED" } });
  assert.equal((await route("stub-distribution").POST(request(scanBody))).status, 404);
  await db.qrCode.update({ where: { id: currentPrinted.id }, data: { status: "ACTIVE" } });
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
  assert.equal(slots.status, 200); assert.ok((await slots.json()).slots.some((q) => q.publicToken === printed.publicToken && q.designatedNumber === "113" && q.programId === old.id));
  const push = load("src/app/api/v1/sync/push/route.ts");
  const queued = await push.POST(request({ transactions: ["ORIENTATION", "ATTENDANCE", "PAYOUT", "STUB_DISTRIBUTION"].map((entityType) => ({ entityType, clientTransactionId: `wrong-program-${entityType}`, payload: { programId: program.id, programBeneficiaryId: "old-pb-113", status: "PRESENT" } })) }));
  const sync = await queued.json(); assert.equal(sync.accepted.length, 0); assert.equal(sync.failed.length, 4); assert.equal(await oldHistory(), snapshot);
  const assignmentRoute = load("src/app/api/v1/work-assignment/lookup/route.ts");
  const assignment = await assignmentRoute.GET(new Request(`http://synthetic.test?token=${printed.publicToken}`));
  assert.equal(assignment.status, 409, "public camera lookup must reject a closed program");
  const currentAssignment = await assignmentRoute.GET(new Request(`http://synthetic.test?token=${currentPrinted.publicToken}`));
  assert.equal(currentAssignment.status, 200); assert.match(JSON.stringify(await currentAssignment.json()), /0600/);
  assert.equal((await assignmentRoute.GET(new Request(`http://synthetic.test?token=${printed.publicToken}&programId=${program.id}`))).status, 409);
  const wrongTokenSync = await push.POST(request({ transactions: ["ORIENTATION", "ATTENDANCE", "PAYOUT", "STUB_DISTRIBUTION"].map((entityType) => ({ entityType, clientTransactionId: `wrong-qr-${entityType}`, payload: { programId: program.id, programBeneficiaryId: pb.id, qrToken: printed.publicToken, status: "PRESENT" } })) }));
  const wrongTokenSyncResult = await wrongTokenSync.json();
  assert.equal(wrongTokenSyncResult.accepted.length, 0); assert.equal(wrongTokenSyncResult.failed.length, 4);
  assert.ok(Object.values(wrongTokenSyncResult.errors).every(message => message.includes("WRONG WORK PROGRAM")));
  // Identical slot numbers have separate program-owned QR tokens.
  const firstCard = await db.qrCode.findFirst({ where: { programBeneficiaryId: "old-pb-1" } });
  const otherProgram = await db.program.create({ data: { programCode: "SYNTHETIC-OTHER", programName: "Different #1 masterlist", createdById: admin.id } });
  await db.program.update({ where: { id: otherProgram.id }, data: { status: "ACTIVE" } });
  const otherImport = await commit.POST(request({ programId: otherProgram.id, rows: [{ ...rows[0], fullName: "DIFFERENT MASTERLIST PERSON ONE" }] }));
  assert.equal(otherImport.status, 200, JSON.stringify(await otherImport.clone().json()));
  for (const [programId, expectedName] of [[old.id, rows[0].fullName], [otherProgram.id, "DIFFERENT MASTERLIST PERSON ONE"]]) {
    const ownQr = programId === old.id ? firstCard : await db.qrCode.findFirst({ where: { programId } });
    assert.equal((await route("attendance").POST(request({ qrToken: ownQr.publicToken, programId: programId === old.id ? otherProgram.id : old.id }))).status, 409);
    const response = await route("attendance").POST(request({ qrToken: ownQr.publicToken, programId }));
    if (programId === old.id) { assert.equal(response.status, 409); continue; }
    assert.equal(response.status, 400);
    const blocked = await response.json();
    assert.equal(blocked.stepBlocked, "ORIENTATION_REQUIRED");
    assert.equal(blocked.data.fullName, expectedName, "even sequence errors must name the selected masterlist's #1");
    assert.equal(blocked.data.designatedNumber, "1");
  }
  const replacementPreview = new FormData();
  replacementPreview.append("programId", old.id);
  replacementPreview.append("file", new Blob(["No.,Full Name,Birthday,Barangay\n1,DIFFERENT MASTERLIST PERSON ONE,1990-01-02,Aplaya\n"], { type: "text/csv" }), "other-batch.csv");
  const previewResponse = await load("src/app/api/v1/beneficiaries/import/preview/route.ts").POST(new Request("http://synthetic.test", { method: "POST", body: replacementPreview }));
  assert.equal(previewResponse.status, 200);
  const previewDetails = await previewResponse.json();
  assert.equal(previewDetails.resolvedProgramId, old.id);
  assert.deepEqual(previewDetails.preview.slotReplacements, [{ designatedNumber: "1", previousFullName: rows[0].fullName, fullName: "DIFFERENT MASTERLIST PERSON ONE" }]);
  assert.equal(await db.attendanceRecord.count({ where: { programId: otherProgram.id } }), 0);
  assert.equal(await oldHistory(), snapshot);
  // An explicitly reissued printed card from a closed cycle can serve a new cycle.
  // Its immutable QR row and the old person's field records remain byte-for-byte intact.
  const registerRoute = load("src/app/api/v1/programs/[id]/qr/register-printed/route.ts");
  assert.equal((await registerRoute.POST(request({ qrToken: currentPrinted.publicToken }), { params: { id: otherProgram.id } })).status, 409, "cannot take a card away from an open program");
  await db.stubDistribution.create({ data: { qrId: firstCard.id, programBeneficiaryId: "old-pb-1", verificationMethod: "BIRTHDAY_PIN", status: "DISTRIBUTED", distributedAt: new Date("2026-09-20") } });
  await db.orientationAttendance.create({ data: { programId: old.id, programBeneficiaryId: "old-pb-1", scannedAt: new Date("2026-09-20") } });
  await db.attendanceRecord.create({ data: { programId: old.id, programBeneficiaryId: "old-pb-1", workDayId: oldDay.id, attendanceDate: "2026-09-20", morningTimeIn: new Date("2026-09-20") } });
  const archivedCard = async () => JSON.stringify(await db.qrCode.findUnique({ where: { id: firstCard.id }, include: { stubDistributions: true, printLogs: true, programBeneficiary: { include: { orientationAttendance: true, attendanceRecords: true, payouts: true } } } }));
  const archivedBefore = await archivedCard();
  const registered = await registerRoute.POST(request({ qrToken: `https://synthetic.test/my-assignment?token=${firstCard.publicToken.toLowerCase()}` }), { params: { id: otherProgram.id } });
  assert.equal(registered.status, 200);
  assert.equal((await registered.json()).data.fullName, "DIFFERENT MASTERLIST PERSON ONE");
  const repeatedRegistration = await registerRoute.POST(request({ qrToken: firstCard.publicToken }), { params: { id: otherProgram.id } });
  assert.equal((await repeatedRegistration.json()).data.alreadyRegistered, true);
  assert.equal(await db.auditLog.count({ where: { entityType: "QR_PROGRAM_BINDING", entityId: firstCard.id } }), 1);
  const reissuedLookup = await route("stub-distribution").POST(request({ qrToken: firstCard.publicToken, programId: otherProgram.id }));
  assert.equal(reissuedLookup.status, 200);
  assert.equal((await reissuedLookup.json()).data.fullName, "DIFFERENT MASTERLIST PERSON ONE");
  for (const stage of ["stub-distribution", "orientation", "attendance", "payout"]) {
    for (const programId of [old.id, program.id]) assert.equal((await route(stage).POST(request({ qrToken: firstCard.publicToken, programId }))).status, 409);
  }
  const reissuedSlots = await load("src/app/api/v1/qr/slots/route.ts").GET();
  assert.equal((await reissuedSlots.json()).slots.find(qr => qr.publicToken === firstCard.publicToken).programId, otherProgram.id);
  const reissuedCameraLink = await assignmentRoute.GET(new Request(`http://synthetic.test?token=${firstCard.publicToken}`));
  assert.equal(reissuedCameraLink.status, 200); assert.match(JSON.stringify(await reissuedCameraLink.json()), /DIFFERENT MASTERLIST PERSON ONE/);
  assert.equal(await archivedCard(), archivedBefore, "reissuing must not move, rename or delete archived QR/field records");
  assert.equal((await registerRoute.POST(request({ qrToken: firstCard.publicToken }), { params: { id: program.id } })).status, 409);
  assert.equal((await registerRoute.POST(request({ qrToken: "1" }), { params: { id: otherProgram.id } })).status, 400);
  assert.equal((await registerRoute.POST(request({ qrToken: "UNREGISTERED-CARD" }), { params: { id: otherProgram.id } })).status, 404);
  // Regression: registering #1 must not leave the rest of a reused printed set behind.
  for (const number of [2, 321, 500, 522]) {
    const person = await db.beneficiary.create({ data: { beneficiaryNumber: `BATCH-PERSON-${number}`, fullName: `NEW BATCH PERSON ${number}`, birthday: "1990-01-02" } });
    await db.programBeneficiary.create({ data: { programId: otherProgram.id, beneficiaryId: person.id, designatedNumber: String(number) } });
  }
  // Missing/inactive target numbers must remain assigned to the original program.
  await db.programBeneficiary.create({ data: { programId: otherProgram.id, beneficiaryId: "bene-113", designatedNumber: "113", participationStatus: "REPLACED" } });
  const batchRequest = () => registerRoute.POST(request({ sourceProgramId: old.id }), { params: { id: otherProgram.id } });
  assert.equal((await registerRoute.POST(request({ sourceProgramId: program.id }), { params: { id: otherProgram.id } })).status, 409, "batch cannot take cards from an open source");
  const batch = await batchRequest();
  assert.equal(batch.status, 200, JSON.stringify(await batch.clone().json()));
  const batchData = (await batch.json()).data;
  assert.equal(batchData.registeredCount, 4); assert.equal(batchData.alreadyRegisteredCount, 1); assert.equal(batchData.skippedCount, 517);
  assert.equal((await (await batchRequest()).json()).data.registeredCount, 0, "repeating a batch must not duplicate binding events");
  const resolver = load("src/lib/program-scan-resolver.ts");
  for (const number of [2, 321, 500, 522]) {
    const card = await db.qrCode.findFirst({ where: { programBeneficiaryId: `old-pb-${number}` } });
    const resolved = await resolver.resolveProgramScan(card.publicToken, otherProgram.id, { beneficiary: true });
    assert.equal(resolved.pb.beneficiary.fullName, `NEW BATCH PERSON ${number}`);
    for (const stage of ["stub-distribution", "orientation", "attendance", "payout"]) {
      for (const programId of [old.id, program.id]) assert.equal((await route(stage).POST(request({ qrToken: card.publicToken, programId }))).status, 409, `batch card #${number} must reject another program`);
    }
  }
  assert.equal(await archivedCard(), archivedBefore);
  assert.equal(await oldHistory(), snapshot);
  const bindingsBeforeConflict = await db.auditLog.count({ where: { entityType: "QR_PROGRAM_BINDING" } });
  assert.equal((await registerRoute.POST(request({ sourceProgramId: old.id }), { params: { id: program.id } })).status, 409, "batch must reject an already reissued card in another open program atomically");
  assert.equal(await db.auditLog.count({ where: { entityType: "QR_PROGRAM_BINDING" } }), bindingsBeforeConflict);
  await assert.rejects(() => db.programBeneficiary.create({ data: { programId: otherProgram.id, beneficiaryId: "bene-321", designatedNumber: "0321" } }), e => e.code === "P2002", "database must reject duplicate active target slots including leading zero variants");
  assert.equal(await db.auditLog.count({ where: { entityType: "QR_PROGRAM_BINDING" } }), bindingsBeforeConflict);
  await (await import("./qr-auto-scenarios.mjs")).testAutomaticQrDetection({ db, load, admin, request, route });
  await (await import("./program-work-date-scenarios.mjs")).testProgramWorkDateChanges({ db, load, admin, request, route });
  await (await import("./bulk-attendance-scenarios.mjs")).testBulkAttendance({ db, load, admin, request, route });
  authorized = false;
  assert.equal((await load("src/app/api/v1/programs/[id]/attendance/bulk/route.ts").POST(request({}), { params: { id: program.id } })).status, 403);
  assert.equal((await batchRequest()).status, 403);
  assert.equal((await registerRoute.POST(request({ qrToken: firstCard.publicToken }), { params: { id: otherProgram.id } })).status, 403);
  assert.equal((await generate.POST(request({}), { params: { id: program.id } })).status, 403);
  assert.equal((await load("src/app/api/v1/qr/slots/route.ts").GET()).status, 401);
  console.log("Program QR PostgreSQL integration passed: new 600-person roster starts at zero, program-owned QR tokens, wrong-program rejection in both directions across four scanner stages, duplicate protection, no old-history mutation, #523–#600 extension, idempotent generation, invalid QR rejection, public routing and cross-program offline sync guards. Shared database untouched.");
} finally {
  if (db) await db.$disconnect();
  if (started) run(path.join(pgBin, "pg_ctl" + suffix), ["-D", dataDir, "-m", "immediate", "-w", "stop"]);
  if (!path.resolve(dataDir).startsWith(cacheRoot + path.sep + "program-qr-pg-")) throw new Error("Unsafe test cleanup path");
  fs.rmSync(dataDir, { recursive: true, force: true });
}
