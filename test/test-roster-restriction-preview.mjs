// Synthetic spreadsheet + mocked Prisma only. Never connects to a real database.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import * as XLSX from "xlsx";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url), root = process.cwd(), cache = new Map();
const names = ["SYNTHETIC, ACTIVE SAMPLE", "SYNTHETIC, APPOINTIVE SAMPLE", "SYNTHETIC, DIFFERENT BIRTHDAY", "SYNTHETIC, NAME ONLY", "SYNTHETIC, EXPIRED SAMPLE"];
const restriction = (name, birthday, reason, extra = {}) => ({ beneficiary: { fullName: name, birthday }, reason, restrictionStart: "2026-01-01", restrictionEnd: "2099-12-31", payoutDate: "2025-12-31", isAppointivePersonnel: false, status: "ACTIVE", ...extra });
const restrictions = [
  restriction(names[0], "1990-01-02", "Recorded payout cooling-off period"),
  restriction(names[0], "1990-01-02", "Recorded additional restriction", { restrictionEnd: "2098-12-31" }),
  restriction(names[0], "1990-01-02", "Expired reason must not appear", { restrictionEnd: "2020-01-01" }),
  restriction(names[1], "1991-01-02", " ", { isAppointivePersonnel: true, restrictionEnd: "2020-01-01" }),
  restriction(names[2], "1980-01-02", "Different birthday must not match"),
  restriction(names[3], "", "Name-only active restriction", { restrictionEnd: null }),
  restriction(names[4], "1994-01-02", "Expired only", { restrictionEnd: "2020-01-01" }),
];
let existingProgram;
const prisma = {
  beneficiaryRestriction: { findMany: async (query) => { assert.equal(query.where.status, "ACTIVE"); assert.equal(query.select.reason, true); assert.equal(query.select.restrictionStart, true); return restrictions; } },
  beneficiary: { findMany: async (query) => { existingProgram = query.select.programBeneficiaries.where.programId; return [{ id: "synthetic-beneficiary", fullName: names[0], birthday: "1990-01-02", beneficiaryNumber: "SYNTHETIC-1", programBeneficiaries: [{ id: "synthetic-enrollment", designatedNumber: "1" }] }]; } },
};
function load(file) {
  const resolved = path.resolve(root, file);
  if (cache.has(resolved)) return cache.get(resolved).exports;
  const module = { exports: {} }; cache.set(resolved, module);
  const compiled = ts.transpileModule(fs.readFileSync(resolved, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  const scopedRequire = (name) => {
    if (name === "@/lib/prisma") return { __esModule: true, default: prisma };
    if (name.startsWith("@/")) {
      const target = path.join(root, "src", name.slice(2));
      return load(target + (fs.existsSync(target + ".tsx") ? ".tsx" : ".ts"));
    }
    return require(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`, { filename: resolved })(scopedRequire, module, module.exports);
  return module.exports;
}
const { parseBeneficiaryExcelBuffer } = load("src/lib/excel-importer.ts");
const { RosterRestrictionDetails } = load("src/components/beneficiaries/RosterRestrictionDetails.tsx");
const book = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
  ["No.", "Full Name", "Birthdate", "Street", "Barangay", "Sex", "Age"],
  ...names.map((name, i) => [i + 1, name, `199${i}-01-02`, "CENTRO", "APLAYA", "M", 30]),
]), "Synthetic roster");
const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" });
const preview = await parseBeneficiaryExcelBuffer(buffer, "synthetic-roster.xlsx", "synthetic-program");
assert.equal(existingProgram, "synthetic-program");
assert.equal(preview.totalRows, 5);
assert.equal(preview.restrictedCount, 3);
assert.equal(preview.validCount, 2);
const [active, appointive, differentBirthday, nameOnly, expired] = preview.rows;
assert.equal(active.restrictionDetails.length, 2, "all active reasons survive; no last-record overwrite");
assert.ok(active.validationError.includes("Recorded payout cooling-off period"));
assert.ok(active.validationError.includes("Recorded additional restriction"));
assert.ok(!active.validationError.includes("Expired"));
assert.equal(active.isExistingInProgram, true);
assert.equal(appointive.restrictionDetails.length, 1, "exact and appointive name-only indexes must not duplicate one record");
assert.equal(appointive.restrictionReason, "Appointive personnel restriction");
assert.equal(differentBirthday.status, "VALID");
assert.equal(nameOnly.status, "RESTRICTED");
assert.equal(expired.status, "VALID");
const html = (row) => renderToStaticMarkup(React.createElement(RosterRestrictionDetails, { row }));
const activeMarkup = html(active);
for (const text of ["Restriction reasons", "Recorded payout cooling-off period", "Recorded additional restriction", "Restricted until:", "Restriction start:", "Payout date:"]) assert.ok(activeMarkup.includes(text), text);
assert.ok(!activeMarkup.includes("Expired reason"));
assert.ok(html(appointive).includes("no date-based expiry"));
assert.ok(html(nameOnly).includes("No end date recorded"));
assert.equal(html(expired), "");
assert.ok(html({ ...active, status: "EXEMPTED", isExempted: true, exemptionReason: "Synthetic admin justification" }).includes("Original restriction reasons"));
assert.ok(html({ ...active, status: "EXEMPTED", isExempted: true, exemptionReason: "Synthetic admin justification" }).includes("Synthetic admin justification"));
assert.ok(html({ status: "RESTRICTED", validationError: "Legacy restriction explanation" }).includes("Legacy restriction explanation"));
assert.ok(html({ status: "RESTRICTED" }).includes("Reason not recorded"));
assert.ok(html({ status: "RESTRICTED", restrictionReason: "<script>unsafe</script>", restrictionEnd: "not-a-date" }).includes("&lt;script&gt;unsafe&lt;/script&gt;"));
const scopedRoute = fs.readFileSync("src/app/api/v1/programs/[id]/beneficiaries/import/preview/route.ts", "utf8");
const globalRoute = fs.readFileSync("src/app/api/v1/beneficiaries/import/preview/route.ts", "utf8");
assert.ok(scopedRoute.includes("parseBeneficiaryExcelBuffer(buffer, file.name, params.id)"));
assert.ok(globalRoute.includes("parseBeneficiaryExcelBuffer(buffer, file.name, programId)"));
console.log("Roster restriction preview passed: multiple reasons, dates, appointive/name-only matches, expired exclusions, birthday isolation, exemption history, legacy fallbacks and escaped text. No live DB/storage writes.");
