// Synthetic workbook/API tests. No database connections or external writes.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import crypto from "node:crypto";
const require = createRequire(import.meta.url), cache = new Map(), root = process.cwd();
const hash = (b) => crypto.createHash("sha256").update(b).digest("hex");
let user = { id: "synthetic-admin", role: "PESO_ADMIN" }, events = [], program;
const db = {
  program: { findUnique: async ({ where }) => where.id === program?.id ? program : null },
  auditLog: { findFirst: async ({ where }) => events.filter((e) => e.entityType === where.entityType && e.entityId === where.entityId).at(-1) || null, create: async ({ data }) => { const row = { ...data, id: `event-${events.length + 1}` }; events.push(row); return row; } },
  beneficiaryRestriction: { findMany: async () => [] }, beneficiary: { findMany: async () => [] }, programBeneficiary: { findMany: async () => [] },
  $queryRaw: async () => [{ locked: true }], $transaction: async (callback) => callback(db),
};
function load(file) {
  const full = path.resolve(root, file);
  if (cache.has(full)) return cache.get(full).exports;
  const module = { exports: {} }; cache.set(full, module);
  const code = ts.transpileModule(fs.readFileSync(full, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: full })((name) => {
    if (name === "@/lib/prisma") return { __esModule: true, default: db };
    if (name === "@/lib/auth") return { getCurrentUser: async () => user, hasPermission: () => true };
    if (name === "@/lib/audit") return { logAudit: async () => {} };
    if (name.startsWith("@/")) return load("src/" + name.slice(2) + ".ts");
    return require(name);
  }, module, module.exports);
  return module.exports;
}
const config = load("src/lib/dole-report-config.ts"), xml = load("src/lib/dole-report-xml.ts"), model = load("src/lib/dole-report-data.ts");
const base = fs.readFileSync("public/templates/dole-2026-all-forms.xlsx"), baseZip = await JSZip.loadAsync(base);
const original = "C:/Users/WHITERAVEN/Downloads/2026 - ALL FORMS (FORMULA) Updated.xlsx";
if (fs.existsSync(original)) {
  const source = await JSZip.loadAsync(fs.readFileSync(original));
  for (const name of Object.keys(source.files).filter((n) => /^xl\/(media|drawings)\//.test(n) && !source.files[n].dir)) assert.equal(hash(await source.file(name).async("nodebuffer")), hash(await baseZip.file(name).async("nodebuffer")), name);
  const s = XLSX.read(fs.readFileSync(original)), clean = XLSX.read(base, { sheetStubs: true });
  const sample = s.Sheets["FORM 4 EDIT"], zipText = (await Promise.all(Object.keys(baseZip.files).filter((n) => n.endsWith(".xml")).map((n) => baseZip.file(n).async("string")))).join("");
  for (const ref of ["C14", "U14", "X14", "D14", "E14", "F14"]) { const value = String(sample[ref]?.v || ""); if (value.length > 5) assert.ok(!zipText.includes(value), "private sample value retained at " + ref); }
  for (const name of s.SheetNames) for (const [ref, cell] of Object.entries(s.Sheets[name])) if (cell.f) assert.equal(clean.Sheets[name][ref]?.f, cell.f, `formula altered: ${name}!${ref}`);
}
const makeProgram = (n) => ({ id: "program-new", programCode: "SYNTHETIC-NEW", programName: "Synthetic report program", municipality: "Dingalan", province: "Aurora", requiredWorkDays: 2, orientationDate: "2026-11-04", startDate: "2026-11-05", endDate: "2026-11-06", workDays: [1,2].map((n) => ({ id: `day-${n}`, programId: "program-new", dayNumber: n, workDate: `2026-11-0${n+4}` })), programBeneficiaries: Array.from({ length: n }, (_, i) => ({ id: `pb-${i+1}`, beneficiaryId: `person-${i+1}`, designatedNumber: String(i+1), beneficiary: { id: `person-${i+1}`, fullName: `SYNTHETIC, PERSON ${i+1}`, firstName: "PERSON", lastName: "SYNTHETIC", middleName: "TEST", birthday: "1990-01-02", sex: "MALE", barangay: "Aplaya", sitio: "Purok Test", idType: "NATIONAL ID", idNumber: `SYNTHETIC-${i+1}`, monthlyIncome: 0, dependents: [{ firstName: "ANA", middleName: "TEST", lastName: "SYNTHETIC", age: 20, relationship: "DAUGHTER" }] }, attendanceRecords: i === 0 ? [{ programId: "program-new", workDayId: "day-1", morningTimeIn: "2026-11-05T00:00:00Z", morningTimeOut: "2026-11-05T04:00:00Z", afternoonTimeIn: "2026-11-05T05:00:00Z", afternoonTimeOut: "2026-11-05T09:00:00Z" }] : [] })) });
program = makeProgram(2);
const draft = model.validateReportDraft({ meta: { dailyRate: "600", tupadIdPrefix: "TEST-", tupadIdStart: "1000", proponent: "LONE", preparedBy: "Synthetic Officer" }, rows: { "pb-1": { idNumber: "=NOT_A_FORMULA()", monthlyIncome: "0" } }, cells: {} }, new Set(["pb-1", "pb-2"]));
const data = model.composeDoleReportData(program, {}, draft, null);
assert.deepEqual(data.rows[0].attendance, [1, null]); assert.deepEqual(data.rows[1].attendance, [null, null]);
assert.equal(data.rows[0].age, "36"); assert.equal(data.rows[0].monthlyIncome, "0");
const generated = await xml.populateDoleWorkbook(base, data, ["FORM 4 FINAL", "PAYROLL", "DTR"]);
const output = XLSX.read(generated, { cellFormula: true, sheetStubs: true }), zip = await JSZip.loadAsync(generated);
assert.equal(output.Sheets["FORM 4 EDIT"].D14.v, "PERSON"); assert.equal(output.Sheets["FORM 4 EDIT"].U14.v, "=NOT_A_FORMULA()"); assert.equal(output.Sheets["FORM 4 EDIT"].U14.f, undefined, "formula-like text must remain literal");
assert.equal(output.Sheets["FORM 4 EDIT"].AF14.v, 0, "zero income is not blank");
assert.equal(output.Sheets.DTR.C11.v, 1); assert.equal(output.Sheets.DTR.C12?.v, undefined);
assert.equal(output.Sheets.PAYROLL.O19.v, 600); assert.equal(output.Sheets.PAYROLL.P19.f, "N19*O19"); assert.equal(output.Sheets.DTR.M11.f, "SUM(C11:L11)");
assert.ok(output.Sheets["FORM 4 FINAL"].B14.f.includes("XLOOKUP"));
assert.equal(output.Workbook.Sheets.find((s) => s.name === "PAYROLL").Hidden, 0); assert.equal(output.Workbook.Sheets.find((s) => s.name === "FORM 4 EDIT").Hidden, 1);
assert.ok((await zip.file("xl/workbook.xml").async("string")).includes("forceFullCalc=\"1\""));
for (const name of Object.keys(baseZip.files).filter((n) => /^xl\/(media|drawings)\//.test(n) && !baseZip.files[n].dir).concat(["xl/styles.xml"])) assert.equal(hash(await baseZip.file(name).async("nodebuffer")), hash(await zip.file(name).async("nodebuffer")), name);
const cacheDir = "node_modules/.cache/dole-report-review"; fs.mkdirSync(cacheDir, { recursive: true }); fs.writeFileSync(cacheDir + "/synthetic-report.xlsx", generated);
for (const count of [600, 1200]) {
  const large = model.composeDoleReportData(makeProgram(count), {}, draft, null);
  const expanded = await xml.populateDoleWorkbook(base, large, ["FORM 4 FINAL", "DTR", "FORM 4 for consolidated"]);
  const read = XLSX.read(expanded, { cellFormula: true, sheetStubs: true });
  assert.equal(read.Sheets["FORM 4 EDIT"][`A${count+13}`].v, count);
  assert.equal(read.Sheets["FORM 4 FINAL"][`A${count+13}`].v, count);
  assert.ok(read.Sheets["FORM 4 FINAL"][`B${count+13}`].f.includes(`A${count+13}`));
  assert.equal(read.Sheets.DTR[`M${count+10}`].f, `SUM(C${count+10}:L${count+10})`);
  assert.equal(read.Sheets["FORM 4 for consolidated"][`H${count+2}`].v, count);
  assert.equal(read.Sheets["FORM 4 FINAL"][`B${count+18}`]?.v, "Synthetic Officer", "signature footer must move with expanded body");
  fs.writeFileSync(`${cacheDir}/synthetic-${count}.xlsx`, expanded);
}
const blank = await xml.populateDoleWorkbook(base, { ...data, rows: [] }, [config.FORM4_CONSOLIDATED], true);
const entry = XLSX.read(blank, { cellFormula: true });
assert.equal(entry.Sheets[config.FORM4_CONSOLIDATED].H3.v, 1); assert.equal(entry.Sheets[config.FORM4_CONSOLIDATED].K3?.f, undefined); assert.equal(entry.Sheets[config.FORM4_CONSOLIDATED].K3?.v, undefined);
// Populate the clean entry grid with synthetic data and verify named-sheet selection and exact offset columns.
const sheet = entry.Sheets[config.FORM4_CONSOLIDATED];
const put = (ref, v) => { sheet[ref] = { t: typeof v === "number" ? "n" : "s", v }; };
for (const [ref, value] of Object.entries({ K3: "MARIA", L3: "DELA", M3: "TEST", N3: "JR.", O3: "1990/01/02", S3: "PUROK TEST", T3: "APLAYA", U3: "DINGALAN", V3: "AURORA", W3: "LONE", X3: "NATIONAL ID", Y3: "SYNTHETIC-ID", Z3: "09123456789", AD3: "F", AE3: "SP", AG3: 0, AJ3: "ANA", AK3: "TEST", AL3: "DEPENDENT", AM3: "III", AN3: "DAUGHTER", AO3: 20, AS3: "EX" })) put(ref, value);
const upload = XLSX.write(entry, { type: "buffer", bookType: "xlsx" });
const preview = await load("src/lib/excel-importer.ts").parseBeneficiaryExcelBuffer(upload, "synthetic.xlsx", program.id);
assert.equal(preview.sourceSheetName, config.FORM4_CONSOLIDATED); assert.equal(preview.totalRows, 1);
const row = preview.rows[0];
assert.deepEqual([row.firstName, row.middleName, row.lastName, row.extensionName], ["MARIA", "DELA", "TEST", "JR."]);
assert.deepEqual([row.dependentFirstName, row.dependentMiddleName, row.dependentLastName, row.dependentExtensionName], ["ANA", "TEST", "DEPENDENT", "III"]);
assert.equal(row.monthlyIncome, 0); assert.equal(row.reportInputs.fourPs, "EX"); assert.equal(row.reportInputs.district, "LONE");
assert.throws(() => model.validateReportDraft({ rows: { "other-program-pb": { firstName: "wrong" } } }, new Set(["pb-1"])), /does not belong/);
assert.throws(() => model.validateReportDraft({ meta: { dailyRate: "-1" } }, new Set()), /Invalid/);
assert.throws(() => model.validateReportDraft({ meta: { payoutDate: "2026-02-30" } }, new Set()), /valid/);
await assert.rejects(xml.populateDoleWorkbook(base, { ...data, draft: { ...draft, cells: { "FORM 4 FINAL": { B14: "wrong" } } } }, ["FORM 4 FINAL"]), /Only blank header\/footer/);
const api = load("src/app/api/v1/programs/[id]/reports/route.ts"), params = { params: { id: program.id } };
const request = (body) => new Request("http://synthetic.test", { method: "POST", body: JSON.stringify(body) });
assert.equal((await api.GET(new Request("http://synthetic.test"), params)).status, 200);
assert.equal((await api.POST(request({ action: "save", draft, revision: null }), params)).status, 200);
assert.equal((await api.POST(request({ action: "save", draft, revision: null }), params)).status, 422, "stale drafts must not overwrite another save");
assert.equal((await api.POST(request({ action: "print", draft, sheets: ["FORM 4 FINAL"] }), params)).status, 200);
assert.equal((await api.GET(new Request("http://synthetic.test"), { params: { id: "other" } })).status, 404);
user = { id: "dole", role: "DOLE_COORDINATOR" }; assert.equal((await api.GET(new Request("http://synthetic.test"), params)).status, 200);
user = { id: "staff", role: "PESO_STAFF" }; assert.equal((await api.GET(new Request("http://synthetic.test"), params)).status, 403);
user = null; assert.equal((await api.GET(new Request("http://synthetic.test"), params)).status, 401);
console.log("DOLE report tests passed: 12 native sheets/formulas preserved, sanitized sample data, unchanged logo/drawing/style hashes, correct Form 4 offsets and dependent names, zero income, literal formula-like IDs, per-program drafts/role gates, selected sheets, print preparation and 600/1200-row formula/footer extension. Excel 365 recalculation/physical printer verification remains a native-client step.");
