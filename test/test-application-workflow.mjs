// Isolated route/service tests: all database, storage and auth calls are mocked.
// Never run writes against the configured development/production database.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url), root = process.cwd(), cache = new Map(), mocks = new Map();
function load(file) {
  const resolved = path.resolve(root, file);
  if (cache.has(resolved)) return cache.get(resolved).exports;
  const module = { exports: {} }; cache.set(resolved, module);
  const compiled = ts.transpileModule(fs.readFileSync(resolved, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const scopedRequire = (name) => {
    if (mocks.has(name)) return mocks.get(name);
    if (name.startsWith("@/") || name.startsWith(".")) {
      const target = name.startsWith("@/") ? path.join(root, "src", name.slice(2)) : path.resolve(path.dirname(resolved), name);
      return load(target + (path.extname(target) ? "" : ".ts"));
    }
    return require(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`, { filename: resolved })(scopedRequire, module, module.exports);
  return module.exports;
}
const permissions = load("src/lib/permissions.ts"), workflow = load("src/lib/application-workflow.ts");
const roles = ["DOMAIN_MASTER", "PESO_ADMIN", "PESO_STAFF", "TUPAD_COORDINATOR", "TUPAD_ASSISTING_DOCUMENTOR", "DOLE_COORDINATOR"];
for (const role of roles) assert.equal(workflow.canEncodeWalkIn({ role }), true, role + " can encode walk-ins");
assert.equal(workflow.canEncodeWalkIn(null), false);
assert.equal(workflow.canEncodeWalkIn({ role: "UNKNOWN" }), false);
for (const role of roles.slice(2)) {
  const encoder = { id: "encoder", role };
  assert.equal(workflow.canReadApplication(encoder, { source: "ONLINE", encodedById: null }), false);
  assert.equal(workflow.canReadApplication(encoder, { source: "WALK_IN", encodedById: "other" }), false);
  assert.equal(workflow.canReadApplication(encoder, { source: "WALK_IN", encodedById: "encoder" }), true);
}

let currentUser = null, row = null, query = null, versionConflict = false;
const countQueries = [], deleted = [], audits = [];
const fakePrisma = {
  tupadApplicationRoster: {
    findMany: async (input) => { query = input; return []; },
    count: async (input) => { countQueries.push(input); return 0; },
    findUnique: async () => row,
    updateMany: async ({ data }) => { if (versionConflict) return { count: 0 }; row = { ...row, ...data, updatedAt: new Date() }; return { count: 1 }; },
    deleteMany: async (input) => { deleted.push(input); return { count: 0 }; },
  },
  tupadApplicationDocument: { findMany: async (input) => { deleted.push(input); return []; }, findUnique: async () => ({ storageBucket: "private", storageKey: "fake", fileName: "synthetic.png", mimeType: "image/png", application: row }) },
  auditLog: { create: async ({ data }) => { audits.push(data); return data; } },
  $transaction: async (callback) => callback(fakePrisma),
};
mocks.set("@/lib/prisma", { __esModule: true, default: fakePrisma });
mocks.set("@/lib/auth", { ...permissions, getCurrentUser: async () => currentUser });
mocks.set("@/lib/application-storage", { removeApplicationDocuments: async () => {}, downloadApplicationDocument: async () => new Blob(["synthetic document"]) });
const list = load("src/app/api/v1/applications/route.ts"), detail = load("src/app/api/v1/applications/[id]/route.ts"), docs = load("src/app/api/v1/applications/documents/[id]/route.ts");
const req = (suffix = "", body) => new Request("http://local.test/api/v1/applications" + suffix, body ? { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
const params = { params: { id: "synthetic-record" } };
assert.equal((await list.GET(req("?source=ONLINE"))).status, 403);
assert.equal((await detail.GET(req(), params)).status, 403);
for (const role of roles.slice(2)) {
  currentUser = { id: "encoder", role, fullName: "Synthetic Encoder" };
  for (const source of workflow.INTAKE_SOURCES) assert.equal((await list.GET(req("?source=" + source))).status, 403);
  assert.equal((await detail.GET(req(), params)).status, 403);
  assert.equal((await detail.PATCH(req("", { status: "QUEUED" }), params)).status, 403);
}
currentUser = { id: "admin", role: "PESO_ADMIN", fullName: "Synthetic Reviewer" };
for (const source of workflow.INTAKE_SOURCES) {
  countQueries.length = 0;
  assert.equal((await list.GET(req(`?source=${source}&page=2&status=PENDING_REVIEW`))).status, 200);
  assert.deepEqual(query.where, { source, submissionStatus: "SUBMITTED", status: "PENDING_REVIEW" });
  assert.equal(query.skip, 25); assert.equal(query.take, 25);
  assert.ok(countQueries.every(({ where }) => where.source === source && where.submissionStatus === "SUBMITTED"), "summary counts cannot leak another channel or drafts");
}
assert.equal((await list.GET(req("?source=ALL"))).status, 400);
assert.equal((await list.GET(req("?source=ONLINE&status=INVALID"))).status, 400);
await list.GET(req()); assert.equal(query.where.source, "IMPORT");
await list.DELETE(req()); assert.equal(deleted[0].where.application.source, "IMPORT"); assert.equal(deleted[1].where.source, "IMPORT");

const original = { id: "synthetic-record", source: "WALK_IN", submissionStatus: "SUBMITTED", status: "PENDING_REVIEW", remarks: null, updatedAt: new Date("2026-10-29T01:00:00Z"), encodedById: "encoder", documents: [] };
row = { ...original };
assert.equal((await detail.GET(req(), params)).status, 200);
assert.equal((await detail.PATCH(req("", { status: "APPROVED", updatedAt: row.updatedAt }), params)).status, 400, "intake review cannot approve beneficiaries");
assert.equal((await detail.PATCH(req("", { status: "INCOMPLETE", updatedAt: row.updatedAt, remarks: " " }), params)).status, 400);
assert.equal((await detail.PATCH(req("", { status: "QUEUED", updatedAt: row.updatedAt, remarks: "Reviewed synthetic documents" }), params)).status, 200);
assert.equal(row.status, "QUEUED"); assert.equal(audits.at(-1).userId, "admin"); assert.equal(audits.at(-1).action, "APPLICATION_ADMIN_REVIEWED");
versionConflict = true;
assert.equal((await detail.PATCH(req("", { status: "INCOMPLETE", updatedAt: original.updatedAt, remarks: "Missing back ID" }), params)).status, 409);
versionConflict = false; row = { ...original, submissionStatus: "DRAFT" };
assert.equal((await detail.GET(req(), params)).status, 404);
assert.equal((await detail.PATCH(req("", { status: "QUEUED", updatedAt: original.updatedAt }), params)).status, 404);
row = { ...original, status: "APPROVED" };
assert.equal((await detail.PATCH(req("", { status: "QUEUED", updatedAt: original.updatedAt }), params)).status, 409);
currentUser = { id: "encoder", role: "DOLE_COORDINATOR" };
row = { source: "ONLINE", encodedById: null }; assert.equal((await docs.GET(req(), params)).status, 403);
row = { source: "WALK_IN", encodedById: "other" }; assert.equal((await docs.GET(req(), params)).status, 403);
row = { source: "WALK_IN", encodedById: "encoder" }; assert.equal((await docs.GET(req(), params)).status, 200);

// Exercise the real save service with synthetic data and fake storage/database.
const schema = load("src/lib/application-schema.ts");
const values = { ...schema.createEmptyApplication(), email: "synthetic@example.com", givenName: "MARIA", lastName: "REYES", birthDate: "1994-02-17", applicantAge: 32, sex: "FEMALE", civilStatus: "SINGLE", contactNumber: "09123456789", idType: "NATIONAL ID", idNumber: "1234-5678-9012-3456", typeOfBeneficiary: schema.BENEFICIARY_TYPES[0], isIp: schema.YES_NO_OPTIONS[0], is4ps: schema.YES_NO_OPTIONS[0], occupations: [schema.OCCUPATION_OPTIONS[0]], monthlyIncome: "1000", employmentInterest: schema.EMPLOYMENT_INTEREST_OPTIONS[0], barangay: schema.BARANGAYS[0], streetSitio: "PUROK TEST", dependentGivenName: "ANA", dependentLastName: "REYES", dependentAge: 20, agreedToTruthfulness: true, agreedToDataPrivacy: true };
assert.equal(schema.applicationFinalSchema.safeParse(values).success, true);
mocks.set("@/lib/application-storage", { uploadApplicationDocument: async () => ({ bucket: "private", key: "synthetic-key" }), removeApplicationDocuments: async () => {} });
fakePrisma.tupadApplicationRoster.findFirst = async () => null;
fakePrisma.tupadApplicationRoster.create = async ({ data }) => { row = { ...data, id: "new-record", documents: [] }; return row; };
fakePrisma.tupadApplicationRoster.update = async ({ data }) => { row = { ...row, ...data }; return row; };
fakePrisma.tupadApplicationDocument.create = async () => ({ id: "synthetic-document" });
const service = load("src/lib/application-service.ts");
const files = Object.fromEntries(["applicantIdFront", "applicantIdBack", "dependentIdFront", "dependentIdBack"].map((field) => [field, new File(["synthetic"], "synthetic.png", { type: "image/png" })]));
for (const source of workflow.INTAKE_SOURCES) {
  row = null;
  const result = await service.saveApplication({ values, files, action: "SUBMIT", source, encoderId: source === "WALK_IN" ? "encoder" : null });
  assert.equal(result.application.status, "PENDING_REVIEW"); assert.equal(result.application.submissionStatus, "SUBMITTED"); assert.equal(result.application.source, source);
}
await assert.rejects(service.saveApplication({ values, files: {}, action: "DRAFT", source: "WALK_IN", encoderId: "encoder" }), /APPLICATION_VALIDATION_FAILED/, "draft cannot overwrite a submitted application");
await assert.rejects(service.saveApplication({ values, files: {}, action: "SUBMIT", source: "WALK_IN", encoderId: "other" }), /APPLICATION_VALIDATION_FAILED/, "idempotent replay must not disclose another encoder's record");
await assert.rejects(service.saveApplication({ values, files: {}, action: "SUBMIT", source: "ONLINE" }), /APPLICATION_VALIDATION_FAILED/, "public submissions cannot replay a walk-in record");
const replay = await service.saveApplication({ values, files: {}, action: "SUBMIT", source: "WALK_IN", encoderId: "encoder" }); assert.equal(replay.idempotent, true);
row = null; const draft = await service.saveApplication({ values: schema.createEmptyApplication(), files: {}, action: "DRAFT", source: "WALK_IN", encoderId: "encoder" }); assert.equal(draft.application.submissionStatus, "DRAFT");

// Public status must acknowledge receipt without claiming queue/approval.
fakePrisma.beneficiaryRestriction = { findFirst: async () => null };
fakePrisma.programBeneficiary = { findFirst: async () => null };
const inquiry = load("src/app/api/v1/public/inquiry/route.ts");
fakePrisma.tupadApplicationRoster.findMany = async () => [{ ...original, fullName: "REYES, MARIA", lastName: "REYES", firstName: "MARIA", status: "PENDING_REVIEW" }];
const pendingResponse = await inquiry.POST(new Request("http://local.test/api/v1/public/inquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationCode: "APP-TEST-001" }) }));
const pendingBody = await pendingResponse.json();
assert.equal(pendingResponse.status, 200); assert.equal(pendingBody.pendingReview, true); assert.equal(pendingBody.isLackingDetails, false); assert.match(pendingBody.message, /naghihintay ng review/);

mocks.set("@/lib/audit", { logAudit: async () => {} });
const encode = load("src/app/api/v1/applications/encode/route.ts");
for (const role of roles) {
  row = null; currentUser = { id: "encoder", role, fullName: "Synthetic Encoder" };
  const response = await encode.POST(new Request("http://local.test/api/v1/applications/encode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values: schema.createEmptyApplication(), action: "DRAFT", source: "ONLINE", encoderId: "forged" }) }));
  const body = await response.json(); assert.equal(response.status, 200); assert.equal(body.application.source, "WALK_IN"); assert.equal(body.application.encodedById, "encoder");
}
currentUser = { id: "stranger", role: "UNKNOWN" }; assert.equal((await encode.POST(new Request("http://local.test/api/v1/applications/encode", { method: "POST" }))).status, 403);

console.log("Application workflow tests passed: role gates, channel isolation, drafts, pending review, private documents, review audit and stale-update protection. No live DB/storage writes.");
