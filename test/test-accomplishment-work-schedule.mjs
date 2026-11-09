// Actual exporter and download handler, synthetic in-memory Prisma data only. No live DB.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript"), ExcelJS = require("exceljs"), JSZip = require("jszip");
const { PNG } = require("pngjs");
const samplePng = (width, height, red, green, blue) => {
  const image = new PNG({ width, height });
  for (let index = 0; index < image.data.length; index += 4) image.data.set([red, green, blue, 255], index);
  return PNG.sync.write(image);
};
const landscape = samplePng(640, 360, 40, 150, 200), portrait = samplePng(240, 480, 180, 80, 40);
const jpeg = Buffer.from("/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAgABADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD5yooor8PP5vCiiigD/9k=", "base64");
const imageKeys = new Map();
const imageQueries = [];
let fixture;
let sessionUser = { id: "synthetic-admin", role: "PESO_ADMIN" };
const queries = [];
const db = { program: { findUnique: async query => {
  queries.push(query);
  assert.equal(query.where.id, fixture.id);
  assert.deepEqual(query.include.programBeneficiaries.where, { participationStatus: { not: "REPLACED" } });
  assert.ok(query.include.accomplishmentPhotos.where.status === "APPROVED" || query.include.accomplishmentPhotos.where.status.not === "REJECTED");
  assert.equal(query.include.accomplishmentPhotos.select.fileKey, undefined, "Do not load every full-size base64 image at once");
  return { ...fixture, accomplishmentPhotos: fixture.accomplishmentPhotos.filter(photo => query.include.accomplishmentPhotos.where.status !== "APPROVED" || photo.status === "APPROVED") };
} }, accomplishmentPhoto: { findFirst: async query => {
  imageQueries.push(query);
  assert.equal(query.where.programId, fixture.id);
  assert.equal(query.where.isPurged, false);
  const photo = fixture.accomplishmentPhotos.find(photo => photo.id === query.where.id && !photo.isPurged && photo.status !== "REJECTED" && (query.where.status !== "APPROVED" || photo.status === "APPROVED"));
  return photo ? { fileKey: imageKeys.get(photo.id) } : null;
} } };
const cache = new Map();
function load(file) {
  const absolute = path.resolve(file);
  if (cache.has(absolute)) return cache.get(absolute);
  const output = ts.transpileModule(fs.readFileSync(absolute, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const exports = {}; cache.set(absolute, exports);
  vm.runInThisContext(`(function(require,exports,__dirname){${output}\n})`, { filename: absolute })(name => {
    if (name === "./prisma" || name === "@/lib/prisma") return { __esModule: true, default: db };
    if (name === "@/lib/auth") return { getCurrentUser: async () => sessionUser, isAdminUser: user => ["PESO_ADMIN", "DOMAIN_MASTER"].includes(user?.role) };
    if (name === "@/lib/permissions") return load("src/lib/permissions.ts");
    if (name === "@/lib/excel-exporter") return load("src/lib/excel-exporter.ts");
    if (name.startsWith("./")) return load(path.join(path.dirname(absolute), name + ".ts"));
    return require(name);
  }, exports, path.dirname(absolute));
  return exports;
}
const { buildBarangayCompletionDays } = load("src/lib/accomplishment-work-schedule.ts");
const { generateAccomplishmentExcel } = load("src/lib/excel-exporter.ts");
const item = (day, area, activity) => ({ id: `synthetic-item-${day}-${area}`, dayNumber: day, area, specificActivities: activity, orderIndex: 0 });
const person = (slot, barangay) => ({ id: `synthetic-pb-${slot}`, beneficiary: { barangay } });
const workDays = [1,2,3].map(dayNumber => ({ id: "day-" + dayNumber, dayNumber, workDate: `2026-11-0${dayNumber + 2}` }));
let sequence = 0;
const photo = (day, activity, extra = {}) => {
  const id = "synthetic-photo-" + (++sequence);
  imageKeys.set(id, "data:image/png;base64," + landscape.toString("base64"));
  return { id, fileName: id + ".png", isPurged: false, capturedAt: new Date("2026-11-03T01:00:00Z"), workDayId: "day-" + day, workProgramItemId: null, barangay: "Ibona", workArea: "Community Center", specificActivity: activity, status: "APPROVED", ...extra };
};
fixture = {
  id: "synthetic-program-a", requiredWorkDays: 3, startDate: "2026-11-03", endDate: "2026-11-05", municipality: "Dingalan", province: "Aurora", doleOffice: null, workDays,
  programBeneficiaries: [person(1, "Brgy. Ibona"), person(2, "IBONA"), person(3, "Matawe"), person(4, "Paltic"), person(5, "")],
  tupadWorkPrograms: [
    { barangay: " ibona ", items: [item(1, "Purok 1", "Clear drainage"), item(1, "Purok 5", "Sort plastics"), item(2, "Purok 1", "Maintain canal outlet"), item(3, "Purok 1", "Maintain canal outlet")] },
    { barangay: "Paltic", items: [item(2, "Purok 4", "Paltic DAY TWO ONLY assignment")] },
  ],
  accomplishmentPhotos: [
    photo(1, "[BEFORE] Repair the community garden fence"),
    photo(1, "[DURING] Repair the community garden fence"),
    photo(1, "[AFTER] repair the community garden fence."),
    photo(1, "Clear drainage", { workArea: "Purok 1" }),
    photo(1, "Clear drainage", { workArea: "Purok 2" }),
    photo(2, "Prepare emergency supply kits", { status: "FOR_REVIEW" }),
    photo(1, "Rejected entry", { status: "REJECTED" }),
    photo(1, "Other barangay task", { barangay: "Matawe" }),
    photo(1, "Missing barangay must not become Paltic", { barangay: "" }),
    photo(1, "Unknown day must not be guessed", { workDayId: "unknown", capturedAt: "2026-11-03" }),
    photo(1, "Item-linked additional task", { workDayId: null, workProgramItemId: "synthetic-item-2-Purok 1", barangay: "" }),
    photo(3, "[AFTER] Purged documentation", { isPurged: true }),
    photo(3, "[DURING] Corrupt documentation"),
  ],
  attendanceRecords: [
    { workDayId: "day-1", workProgramItemId: null, programBeneficiaryId: "synthetic-pb-1", workArea: "Evacuation Center", activityName: "Arrange emergency sleeping areas" },
    { workDayId: "day-1", workProgramItemId: null, programBeneficiaryId: "synthetic-pb-2", workArea: "Evacuation Center", activityName: "Arrange emergency sleeping areas" },
  ],
};
imageKeys.set(fixture.accomplishmentPhotos[1].id, "data:image/png;base64," + portrait.toString("base64"));
imageKeys.set(fixture.accomplishmentPhotos[4].id, "data:image/jpeg;base64," + jpeg.toString("base64"));
imageKeys.set(fixture.accomplishmentPhotos.at(-1).id, "data:image/png;base64,SGVsbG8=");
const summary = buildBarangayCompletionDays(fixture, "Ibona");
assert.equal(summary.length, 3);
assert.match(summary[0].accomplishment, /Clear drainage \(Area: Purok 1; Purok 2\)/);
assert.equal(summary[0].accomplishment.match(/Repair the community garden fence/g).length, 1);
assert.match(summary[0].accomplishment, /Arrange emergency sleeping areas/);
assert.match(summary[1].accomplishment, /Prepare emergency supply kits/);
assert.match(summary[1].accomplishment, /Item-linked additional task/);
assert.doesNotMatch(summary[0].accomplishment, /Rejected|Other barangay|Unknown day|Missing barangay|Prepare emergency/);
assert.equal(buildBarangayCompletionDays(fixture, "Paltic")[0].accomplishment, "");
console.log("PASS: regular + custom/photo + attendance assignments, unique stages, correct day/barangay, no invented fallback");

const firstBuffer = await generateAccomplishmentExcel(fixture.id);
const book = new ExcelJS.Workbook(); await book.xlsx.load(firstBuffer);
const original = new ExcelJS.Workbook(); await original.xlsx.readFile("public/templates/tupad-completion-report.xlsx");
assert.equal(book.worksheets.length, 11);
const plain = value => (value?.richText ? value.richText.map(run => run.text).join("") : String(value || "")).replace(/\s+/g, " ").trim();
const text = sheet => { const values = []; sheet.eachRow(row => row.eachCell(cell => values.push(plain(cell.value)))); return plain(values.join(" ")); };
const ibona = book.getWorksheet("IBONA");
assert.equal(ibona.getCell("A1").value, "TUPAD Completion Report");
assert.equal(plain(ibona.getCell("B13").value), "Period of Work");
assert.equal(ibona.getCell("C13").value, "Actual Accomplishment");
assert.equal(ibona.getCell("B14").value, "Day 1 (November 3, 2026)");
assert.match(plain(ibona.getCell("C14").value), /Repair the community garden fence/);
assert.match(plain(ibona.getCell("C14").value), /Sort plastics/);
assert.match(plain(ibona.getCell("C14").value), /Arrange emergency sleeping areas/);
assert.match(plain(ibona.getCell("C15").value), /Prepare emergency supply kits/);
assert.equal(plain(ibona.getCell("B17").value), ""); assert.equal(plain(ibona.getCell("C17").value), "");
assert.equal(plain(ibona.getCell("A6").value), "No. of Beneficiaries: 2");
assert.equal(plain(book.getWorksheet("PALTIC").getCell("A6").value), "No. of Beneficiaries: 1");
assert.equal(plain(book.getWorksheet("APLAYA").getCell("A6").value), "No. of Beneficiaries: 0");
assert.equal(ibona.getCell("A6").value.richText[1].font.underline, true);
assert.doesNotMatch(text(ibona), /March 26|April 10|April 2026|BENEFICIARY ATTENDANCE|DESIGNATED NO/);
assert.match(text(book.getWorksheet("MATAWE")), /Other barangay task/);
assert.doesNotMatch(text(book.getWorksheet("MATAWE")), /Clear drainage|Maintain canal|Prepare emergency/);
assert.equal(book.getWorksheet("BUTAS NA BATO").getCell("B12").value, "Day 1 (November 3, 2026)", "Respect differing source-sheet table positions");
for (const sheet of book.worksheets) {
  const source = original.getWorksheet(sheet.name);
  assert.deepEqual(sheet.model.merges.slice(0, source.model.merges.length), source.model.merges);
  assert.equal(sheet.getColumn(2).width, source.getColumn(2).width);
  assert.equal(sheet.getColumn(3).width, source.getColumn(3).width);
  assert.deepEqual(sheet.pageSetup, source.pageSetup);
  assert.deepEqual(sheet.getCell("C14").style, source.getCell("C14").style);
  assert.equal(sheet.getCell("C29").value, source.getCell("C29").value, "Retain existing signatory/footer");
}
const beforeZip = await JSZip.loadAsync(fs.readFileSync("public/templates/tupad-completion-report.xlsx")), afterZip = await JSZip.loadAsync(firstBuffer);
for (const [name, entry] of Object.entries(beforeZip.files)) {
  if (entry.dir || /^xl\/worksheets\/sheet\d+\.xml$/.test(name) || name === "[Content_Types].xml" || name === "xl/styles.xml" || /^xl\/worksheets\/_rels\//.test(name)) continue;
  assert.deepEqual(await afterZip.file(name).async("nodebuffer"), await entry.async("nodebuffer"), "Preserve native part: " + name);
}
console.log("PASS: original two-column layout, all 11 sheets, styles/page settings/native parts, selected program counts and dates");
const images = ibona.getImages();
assert.equal(images.length, 8, "Embed every non-rejected, non-purged, valid photo including unknown-day documentation");
assert.equal(book.getWorksheet("MATAWE").getImages().length, 1);
assert.equal(book.getWorksheet("PALTIC").getImages().length, 0);
assert.deepEqual(Buffer.from(book.getImage(images[0].imageId).buffer), landscape, "Original pixels/banners are retained");
assert.ok(images.some(image => image.range.ext.height > image.range.ext.width), "Portrait orientation remains portrait, no stretching");
assert.ok(images.some(image => book.getImage(image.imageId).extension === "jpeg"), "Actual JPG uploads embed too");
assert.match(text(ibona), /B\. Photo Documentation/);
assert.match(text(ibona), /BEFORE/); assert.match(text(ibona), /DURING/); assert.match(text(ibona), /AFTER/);
assert.match(text(ibona), /For review/);
assert.match(text(ibona), /Work day not assigned/);
assert.match(text(ibona), /Stage not labelled/);
assert.match(text(ibona), /IMAGE UNAVAILABLE: Photo was purged/);
assert.match(text(ibona), /IMAGE UNAVAILABLE: Invalid image/);
assert.match(text(book.getWorksheet("APLAYA")), /No uploaded photo documentation/);
assert.doesNotMatch(text(ibona), /Rejected entry|Other barangay task/);
assert.ok(imageQueries.every(query => !fixture.accomplishmentPhotos.find(photo => photo.id === query.where.id)?.isPurged));
const originalStyles = (await beforeZip.file("xl/styles.xml").async("string")).match(/<cellXfs count="\d+">([\s\S]*?)<\/cellXfs>/)[1];
const newStyles = (await afterZip.file("xl/styles.xml").async("string")).match(/<cellXfs count="\d+">([\s\S]*?)<\/cellXfs>/)[1];
assert.ok(newStyles.startsWith(originalStyles), "All existing cell formats remain intact; photo wrapping only appends a style");
console.log("PASS: actual embedded pictures, stage/day captions, portrait fitting, missing/purged warnings, no cross-barangay photo leaks");
const outputDir = "node_modules/.cache/accomplishment-schedule-review";
fs.mkdirSync(outputDir, { recursive: true }); fs.writeFileSync(path.join(outputDir, "synthetic-accomplishment.xlsx"), firstBuffer);

const firstFixture = fixture;
fixture = { ...firstFixture, id: "synthetic-program-b", programBeneficiaries: [person(1, "Ibona")], accomplishmentPhotos: [], attendanceRecords: [], tupadWorkPrograms: [{ barangay: "Ibona", items: [item(1, "Purok 1", "PROGRAM B EXCLUSIVE assignment")] }] };
const other = new ExcelJS.Workbook(); await other.xlsx.load(await generateAccomplishmentExcel(fixture.id));
assert.match(text(other.getWorksheet("IBONA")), /PROGRAM B EXCLUSIVE/);
assert.doesNotMatch(text(other.getWorksheet("IBONA")), /Clear drainage|Repair the community/);

const { GET } = load("src/app/api/v1/reports/export/route.ts");
const response = await GET(new Request("http://synthetic.test/api/v1/reports/export?type=ACCOMPLISHMENT&programId=" + fixture.id));
assert.equal(response.status, 200); assert.match(response.headers.get("content-type"), /spreadsheetml/);
const downloaded = new ExcelJS.Workbook(); await downloaded.xlsx.load(Buffer.from(await response.arrayBuffer()));
assert.match(text(downloaded.getWorksheet("IBONA")), /PROGRAM B EXCLUSIVE/);
sessionUser = null;
const count = queries.length;
assert.equal((await GET(new Request("http://synthetic.test/api/v1/reports/export?type=ACCOMPLISHMENT&programId=" + fixture.id))).status, 401);
assert.equal(queries.length, count);
sessionUser = { id: "synthetic-staff", role: "PESO_STAFF" };
fixture = firstFixture;
const staffResponse = await GET(new Request("http://synthetic.test/api/v1/reports/export?type=ACCOMPLISHMENT&programId=" + fixture.id));
assert.equal(staffResponse.status, 200);
const staffBook = new ExcelJS.Workbook(); await staffBook.xlsx.load(Buffer.from(await staffResponse.arrayBuffer()));
assert.equal(staffBook.getWorksheet("IBONA").getImages().length, 8);
assert.match(text(staffBook.getWorksheet("IBONA")), /For review/);
assert.equal(queries.at(-1).include.accomplishmentPhotos.where.status.not, "REJECTED");
for (const role of ["TUPAD_COORDINATOR", "TUPAD_ASSISTING_DOCUMENTOR", "UNKNOWN_ROLE"]) {
  sessionUser = { id: "synthetic-denied", role };
  const beforeDenied = queries.length;
  assert.equal((await GET(new Request("http://synthetic.test/api/v1/reports/export?type=ACCOMPLISHMENT&programId=" + fixture.id))).status, 403);
  assert.equal(queries.length, beforeDenied, "Other roles must stay blocked without loading data");
}
console.log("PASS: PESO operational staff exports full report/photos; unrelated roles stay blocked");
sessionUser = { id: "synthetic-dole", role: "DOLE_COORDINATOR" };
const doleResponse = await GET(new Request("http://synthetic.test/api/v1/reports/export?type=ACCOMPLISHMENT&programId=" + fixture.id));
assert.equal(doleResponse.status, 200);
const doleBook = new ExcelJS.Workbook(); await doleBook.xlsx.load(Buffer.from(await doleResponse.arrayBuffer()));
assert.doesNotMatch(text(doleBook.getWorksheet("IBONA")), /Prepare emergency supply kits|For review/);
assert.equal(doleBook.getWorksheet("IBONA").getImages().length, 7);
assert.equal(queries.at(-1).include.accomplishmentPhotos.where.status, "APPROVED");
console.log("PASS: selected-program isolation and authenticated download handler; no real DB writes");

const longText = Array.from({length: 80}, (_, i) => "Additional assignment segment " + i).join(" ");
fixture = { ...firstFixture, id: "synthetic-long", requiredWorkDays: 12, accomplishmentPhotos: [photo(1, longText)], attendanceRecords: [],
  workDays: Array.from({length:12}, (_, i) => ({id: "day-" + (i+1),dayNumber:i+1,workDate: `2026-11-${String(i+1).padStart(2,"0")}` })),
  tupadWorkPrograms: [{barangay:"Ibona",items:[item(12,"Purok 1","Last day assignment must be included")]}] };
const longBook = new ExcelJS.Workbook(); const longBuffer = await generateAccomplishmentExcel(fixture.id); await longBook.xlsx.load(longBuffer);
const longSheet = longBook.getWorksheet("IBONA");
assert.match(text(longSheet), /Day 12 \(November 12, 2026\)/);
assert.match(text(longSheet), /Last day assignment must be included/);
assert.match(text(longSheet), /Additional assignment segment 79/);
assert.match(text(longSheet), /continued/);
assert.match(text(longSheet), /ALBERT D. GAVIOLA/);
assert.ok(longSheet.model.merges.some(ref => /^B\d+:C\d+$/.test(ref)));
longSheet.eachRow(row => assert.ok(!row.height || row.height <= 409));
fs.writeFileSync(path.join(outputDir, "synthetic-long-accomplishment.xlsx"), longBuffer);
console.log("PASS: >10 days and long custom text continue in two columns without clipping or lost footer");

const originalFetch = globalThis.fetch, storageEnv = process.env.SUPABASE_URL;
try {
  const blocked = photo(1, "[BEFORE] Untrusted URL"), trusted = photo(1, "[DURING] Trusted storage image");
  imageKeys.set(blocked.id, "http://127.0.0.1/private");
  imageKeys.set(trusted.id, "https://synthetic-storage.test/storage/v1/object/public/photos/test.png");
  process.env.SUPABASE_URL = "https://synthetic-storage.test";
  let remoteCalls = 0;
  globalThis.fetch = async (url, options) => {
    remoteCalls++;
    assert.equal(new URL(url).origin, "https://synthetic-storage.test");
    assert.equal(options.redirect, "error"); assert.equal(options.headers, undefined);
    return new Response(landscape, { headers: { "content-type": "image/png", "content-length": String(landscape.length) } });
  };
  fixture = { ...firstFixture, id: "synthetic-storage", accomplishmentPhotos: [blocked, trusted] };
  const storageBook = new ExcelJS.Workbook(); await storageBook.xlsx.load(await generateAccomplishmentExcel(fixture.id));
  assert.equal(remoteCalls, 1, "Never fetch arbitrary/private URLs stored as image keys");
  assert.equal(storageBook.getWorksheet("IBONA").getImages().length, 1);
  assert.match(text(storageBook.getWorksheet("IBONA")), /External image host is not configured/);
} finally {
  globalThis.fetch = originalFetch;
  if (storageEnv === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = storageEnv;
}
console.log("PASS: trusted external storage works; private URLs, credentials, and redirects are not forwarded");

// A real photo-heavy workbook larger than the hosting buffered-response limit.
const noise = new PNG({width:900,height:900});
let seed = 1234567;
for (let index = 0; index < noise.data.length; index++) {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  noise.data[index] = index % 4 === 3 ? 255 : seed & 255;
}
const largePhoto = "data:image/png;base64," + PNG.sync.write(noise).toString("base64");
const largePhotos = [photo(1,"[BEFORE] Large photo 1"),photo(1,"[AFTER] Large photo 2")];
largePhotos.forEach(photo => imageKeys.set(photo.id, largePhoto));
fixture = { ...firstFixture, id: "synthetic-streamed-photos", accomplishmentPhotos: largePhotos };
sessionUser = { id: "synthetic-admin", role: "PESO_ADMIN" };
const largeResponse = await GET(new Request("http://synthetic.test/api/v1/reports/export?type=ACCOMPLISHMENT&programId=" + fixture.id));
assert.equal(largeResponse.status, 200);
assert.equal(largeResponse.headers.get("cache-control"), "private, no-store");
const chunks = [];
for (const reader = largeResponse.body.getReader();;) {
  const chunk = await reader.read(); if (chunk.done) break;
  assert.ok(chunk.value.byteLength <= 256 * 1024);
  chunks.push(Buffer.from(chunk.value));
}
const largeDownload = Buffer.concat(chunks);
assert.ok(largeDownload.length > 4.5 * 1024 * 1024);
assert.ok(chunks.length > 1);
const largeZip = await JSZip.loadAsync(largeDownload);
assert.equal(Object.keys(largeZip.files).filter(name => /^xl\/media\/[^/]+$/.test(name)).length, 2);
console.log("PASS: >4.5 MB photo workbook downloads in bounded stream chunks and remains a valid XLSX");
