import JSZip from "jszip";
import * as XLSX from "xlsx";
import { DOLE_REPORT_SHEETS, FORM4_CONSOLIDATED, type DoleReportData, type DoleSheetName } from "@/lib/dole-report-config";

const CELL = /<c\b([^>]*?\br="([A-Z]+)(\d+)"[^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function valueCell(attrs: string, value: unknown) {
  const clean = attrs.replace(/\s+t="[^"]*"/g, "");
  if (value === null || value === undefined || value === "") return `<c${clean}/>`;
  if (typeof value === "number" && Number.isFinite(value)) return `<c${clean}><v>${value}</v></c>`;
  return `<c${clean} t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
}
function stripCached(cell: string) { return cell.replace(/<v\b[^>]*>[\s\S]*?<\/v>/g, "").replace(/<is\b[^>]*>[\s\S]*?<\/is>/g, ""); }
export function shiftFormula(formula: string, delta: number) {
  return formula.split(/("(?:[^"]|"")*"|'(?:[^']|'')*')/g).map((s, i) => i % 2 ? s : s.replace(/(\$?[A-Z]{1,3})(\$?)(\d+)\b/g, (_, col, fixed, row) => `${col}${fixed}${Number(row) + (fixed ? 0 : delta)}`)).join("");
}
const indexOf = (name: string) => DOLE_REPORT_SHEETS.findIndex((s) => s.name === name) + 1;
const pathOf = (name: string) => `xl/worksheets/sheet${indexOf(name)}.xml`;
export const excelDate = (value: unknown) => {
  if (!value) return null;
  const date = new Date(String(value).slice(0, 10) + "T00:00:00Z");
  return Number.isNaN(date.getTime()) ? null : date.getTime() / 86400000 + 25569;
};

/** Values/formula caches only. Styles, drawings, media and print dimensions are not round-tripped. */
export async function sanitizeDoleTemplate(input: Buffer) {
  const zip = await JSZip.loadAsync(input);
  const clearHeader: Record<string, Set<string>> = {
    "FORM 4 EDIT": new Set(["E6", "E8", "E9", "R4", "R5", "R6", "R7", "R8", "W4", "W5", "W6", "W7"]),
    "CONTRACT": new Set(["A611", "D611"]), "PAYROLL": new Set(["C626", "K626"]),
    "for GPAI Enrollment": new Set(["C622", "H622", "A12"]), "DTR": new Set(["A511", "J513", "C10", "D10", "E10", "F10", "G10", "H10", "I10", "J10", "K10", "L10"]),
  };
  for (const config of DOLE_REPORT_SHEETS) {
    const xml = await zip.file(pathOf(config.name))!.async("string");
    const clean = xml.replace(CELL, (whole, attrs, col, r, content = "") => {
      if (/<f\b/.test(content)) return stripCached(whole);
      const row = Number(r), ref = `${col}${r}`;
      const body = row >= config.start && row <= config.end;
      const summaryStatic = config.name === "SUMMARY BREAKDOWN" && ["I2", "I3", "L2", "L3", "L4"].includes(ref);
      if ((body && !summaryStatic) || clearHeader[config.name]?.has(ref)) return valueCell(attrs, null);
      return whole;
    });
    zip.file(pathOf(config.name), clean);
  }
  // Remove unused shared strings too: deleting cells alone would leave private sample data recoverable.
  const referenced = new Set<number>();
  for (const cfg of DOLE_REPORT_SHEETS) {
    const xml = await zip.file(pathOf(cfg.name))!.async("string");
    xml.replace(CELL, (whole, attrs, col, row, content = "") => { if (/\bt="s"/.test(attrs)) { const n = content.match(/<v>(\d+)<\/v>/); if (n) referenced.add(Number(n[1])); } return whole; });
  }
  if (zip.file("xl/sharedStrings.xml")) {
    let i = 0;
    zip.file("xl/sharedStrings.xml", (await zip.file("xl/sharedStrings.xml")!.async("string")).replace(/<si\b[^>]*>[\s\S]*?<\/si>/g, (si) => referenced.has(i++) ? si : "<si><t></t></si>"));
  }
  for (const name of Object.keys(zip.files)) {
    if (/^xl\/worksheets\/.*\.rels$/.test(name)) zip.file(name, (await zip.file(name)!.async("string")).replace(/<Relationship\b[^>]*Type="[^"]*\/hyperlink"[^>]*\/>/g, ""));
    if (/^xl\/worksheets\/sheet\d+\.xml$/.test(name)) zip.file(name, (await zip.file(name)!.async("string")).replace(/<hyperlinks\b[^>]*>[\s\S]*?<\/hyperlinks>/g, ""));
    if (/^xl\/comments\d*\.xml$/.test(name)) zip.file(name, (await zip.file(name)!.async("string")).replace(/<author>[\s\S]*?<\/author>/g, "<author>Template</author>").replace(/<text>[\s\S]*?<\/text>/g, "<text><t></t></text>"));
    if (/^xl\/(threadedComments|persons)/.test(name)) throw new Error("Template contains threaded annotations requiring a privacy review before packaging.");
  }
  let workbook = await zip.file("xl/workbook.xml")!.async("string");
  workbook = workbook.replace(/<mc:AlternateContent[\s\S]*?<\/mc:AlternateContent>/g, "")
    .replace(/(<definedName name="_xlnm.Print_Area" localSheetId="5">)[\s\S]*?(<\/definedName>)/, (_, a, b) => a + "'USSC PAYROLL'!$A$1:$I$601" + b)
    .replace(/(<definedName name="_xlnm.Print_Titles" localSheetId="9">)[\s\S]*?(<\/definedName>)/, (_, a, b) => a + "'LIST MED'!$5:$6" + b);
  zip.file("xl/workbook.xml", workbook);
  if (zip.file("docProps/core.xml")) zip.file("docProps/core.xml", (await zip.file("docProps/core.xml")!.async("string")).replace(/<(dc:creator|cp:lastModifiedBy)>[\s\S]*?<\/\1>/g, "<$1></$1>"));
  await resetCalculation(zip);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

async function resetCalculation(zip: JSZip) {
  let workbook = await zip.file("xl/workbook.xml")!.async("string");
  workbook = workbook.replace(/<calcPr\b[^>]*\/>/, '<calcPr calcId="191029" calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/>');
  zip.file("xl/workbook.xml", workbook);
  zip.remove("xl/calcChain.xml");
  if (zip.file("xl/_rels/workbook.xml.rels")) zip.file("xl/_rels/workbook.xml.rels", (await zip.file("xl/_rels/workbook.xml.rels")!.async("string")).replace(/<Relationship\b[^>]*Type="[^"]*\/calcChain"[^>]*\/>/g, ""));
  zip.file("[Content_Types].xml", (await zip.file("[Content_Types].xml")!.async("string")).replace(/<Override\b[^>]*PartName="\/xl\/calcChain.xml"[^>]*\/>/g, ""));
}

function extendRows(xml: string, cfg: typeof DOLE_REPORT_SHEETS[number], count: number, readSheet: XLSX.WorkSheet) {
  const delta = Math.max(0, count - (cfg.end - cfg.start + 1));
  if (!delta) return xml;
  let prototype = "";
  xml = xml.replace(/<row\b([^>]*?\br="(\d+)"[^>]*?)(?:\/>|>[\s\S]*?<\/row>)/g, (row, attrs, r) => {
    const n = Number(r);
    if (n === cfg.end) prototype = row;
    if (n <= cfg.end) return row;
    return row.replace(/\br="([A-Z]*)(\d+)"/g, (_, col, num) => `r="${col}${Number(num) + delta}"`)
      .replace(/<f\b[^>]*>([\s\S]*?)<\/f>/g, (whole, formula) => whole.replace(formula, formula.replace(/(\$?[A-Z]{1,3}\$?)(\d+)\b/g, (_: string, c: string, v: string) => c + (Number(v) >= cfg.end ? Number(v) + delta : v))));
  });
  if (!prototype) throw new Error(`Missing template row for ${cfg.name}`);
  const additions = Array.from({ length: delta }, (_, i) => {
    const offset = i + 1, next = cfg.end + offset;
    let copy = prototype.replace(/\br="([A-Z]*)(\d+)"/g, (_, col, num) => `r="${col}${Number(num) + offset}"`);
    copy = copy.replace(CELL, (whole, attrs, col) => {
      const original = readSheet[`${col}${cfg.end}`];
      if (!original?.f) return valueCell(attrs, null);
      return `<c${attrs.replace(/\s+(t|cm)="[^"]*"/g, "")}><f>${esc(shiftFormula(original.f, offset))}</f></c>`;
    });
    return copy.replace(new RegExp(`^<row([^>]*?)r="${next}"`), `<row$1r="${next}"`);
  }).join("");
  const endRow = new RegExp(`(<row\\b[^>]*\\br="${cfg.end}"[^>]*(?:/>|>[\\s\\S]*?</row>))`);
  xml = xml.replace(endRow, (m) => m + additions);
  // Footer merges, sheet dimensions, filter ranges and page breaks move with the extended body.
  xml = xml.replace(/(<(mergeCell|dimension|autoFilter)\b[^>]*\bref=")([^"]+)(")/g, (_, a, tag, ref, b) => a + ref.replace(/([A-Z]+)(\d+)/g, (_: string, c: string, r: string) => c + (Number(r) > cfg.end || tag !== "mergeCell" && Number(r) === cfg.end ? Number(r) + delta : r)) + b);
  return xml;
}

function setCells(xml: string, values: Record<string, unknown>, onlyBlank = false) {
  const pending = new Map(Object.entries(values));
  xml = xml.replace(CELL, (whole, attrs, col, row, content = "") => {
    const ref = col + row;
    if (!pending.has(ref)) return /<f\b/.test(content) ? stripCached(whole) : whole;
    if (/<f\b/.test(content)) throw new Error(`Cannot overwrite template formula ${ref}`);
    if (onlyBlank && /<(v|is)\b/.test(content)) throw new Error(`Only blank template cells may be edited: ${ref}`);
    const value = pending.get(ref); pending.delete(ref);
    return valueCell(attrs, value);
  });
  // Existing blank rows often omit unpopulated <c> nodes. Insert new cells in column order.
  for (const [ref, value] of pending) {
    if (value === null || value === undefined || value === "") continue;
    const row = Number(ref.match(/\d+$/)![0]);
    const matcher = new RegExp(`(<row\\b[^>]*?\\br="${row}"[^>]*?)(/>|>[\\s\\S]*?</row>)`);
    const cell = valueCell(` r="${ref}"`, value);
    if (!matcher.test(xml)) throw new Error(`Template cell row not found: ${ref}`);
    xml = xml.replace(matcher, (whole, open, body) => body === "/>" ? `${open}>${cell}</row>` : `${open}${body.slice(0, -6)}${cell}</row>`);
  }
  // Sort cell nodes by their actual column, without changing their formatting attributes.
  return xml.replace(/<row\b[^>]*>[\s\S]*?<\/row>/g, (row) => {
    const cells = [...row.matchAll(CELL)].map((m) => m[0]);
    if (cells.length < 2) return row;
    const open = row.match(/^<row\b[^>]*>/)![0];
    const rest = row.slice(open.length, -6).replace(CELL, "");
    cells.sort((a, b) => XLSX.utils.decode_cell(a.match(/\br="([A-Z]+\d+)"/)![1]).c - XLSX.utils.decode_cell(b.match(/\br="([A-Z]+\d+)"/)![1]).c);
    return open + cells.join("") + rest + "</row>";
  });
}

export async function populateDoleWorkbook(base: Buffer, data: DoleReportData, selected: DoleSheetName[], importTemplate = false) {
  const zip = await JSZip.loadAsync(base);
  const read = XLSX.read(base, { type: "buffer", cellFormula: true, sheetStubs: true });
  const count = importTemplate ? 600 : data.rows.length;
  if (!selected.length || selected.some((s) => !DOLE_REPORT_SHEETS.some((cfg) => cfg.name === s))) throw new Error("Select at least one valid report sheet.");
  if (!importTemplate && data.program.requiredWorkDays > 10 && selected.some((s) => ["DTR", "PAYROLL", "USSC PAYROLL", FORM4_CONSOLIDATED].includes(s))) throw new Error("The original DTR has 10 day columns. This program exceeds 10 days; choose another report or provide an approved extended DTR template.");
  const m = data.meta;
  for (const cfg of DOLE_REPORT_SHEETS) {
    let xml = await zip.file(pathOf(cfg.name))!.async("string");
    const n = cfg.name === "LIST MED" ? data.rows.filter((r) => Number(r.age) >= 60).length
      : cfg.name === "SUMMARY BREAKDOWN" ? Math.max(4, ...["barangay", "occupation", "typeOfBeneficiary"].map((key) => new Set(data.rows.map((r) => r[key]).filter(Boolean)).size + 1)) : count;
    xml = extendRows(xml, cfg, n, read.Sheets[cfg.name]);
    const values: Record<string, unknown> = {};
    if (cfg.name === "FORM 4 EDIT" && !importTemplate) Object.assign(values, {
      E4: m.natureOfProject, E5: m.regionalOffice, E6: m.referenceNumber, E7: m.province, E8: m.municipality, E9: m.barangay,
      R4: m.adlNumber, R5: m.periodOfCoverage, R6: m.tupadIdPrefix, R7: m.tupadIdStart ? Number(m.tupadIdStart) : null, R8: count,
      W4: m.batchNumber, W5: m.proponent, W6: excelDate(m.orientationDate), W7: excelDate(m.payoutDate),
    });
    const shift = Math.max(0, n - (cfg.end - cfg.start + 1));
    if (!importTemplate) {
      if (cfg.name === "FORM 4 FINAL") Object.assign(values, { [`B${518 + shift}`]: m.preparedBy, C4: m.natureOfProject, C5: m.regionalOffice, C7: m.province });
      if (cfg.name === "CONTRACT") { values[`A${611 + shift}`] = m.contractWitness; values[`D${611 + shift}`] = m.contractDoleWitness; }
      if (cfg.name === "for GPAI Enrollment") { values.A12 = `Specific Nature Of Work : ${m.specificNatureOfWork || ""}`; values[`C${622 + shift}`] = m.insurancePreparedBy; values[`H${622 + shift}`] = m.insuranceApprovedBy; }
      if (cfg.name === "PAYROLL") Object.assign(values, { C10: m.serviceProvider, C11: m.serviceProviderAddress, C12: excelDate(m.payoutDate), C13: m.batchNumber, C14: m.periodOfCoverage, [`C${626 + shift}`]: m.fundsAvailableBy, [`K${626 + shift}`]: m.payrollCertifiedBy });
      if (cfg.name === "DTR") {
        values[`A${511 + shift}`] = `Issued ${m.certificationDate || "________________"} at Local Government Unit of ${m.municipality || "________________"}, ${m.province || "________________"}.`;
        values[`J${513 + shift}`] = m.dtrCertifiedBy;
        values.A2 = `Province of ${m.province}`; values.A3 = `Municipality of ${m.municipality}`;
        for (let i = 0; i < 10; i++) values[`${XLSX.utils.encode_col(i + 2)}10`] = data.workDays[i]?.workDate ? new Date(data.workDays[i].workDate + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).toUpperCase() : null;
      }
    }
    const capacity = Math.max(n, cfg.end - cfg.start + 1);
    if (cfg.name !== "LIST MED" && cfg.name !== "SUMMARY BREAKDOWN") {
      for (let i = 0; i < capacity; i++) {
        const row = cfg.start + i, person = data.rows[i];
        values[cfg.key + row] = i < count ? (!importTemplate && person ? Number(person.designatedNumber) : i + 1) : null;
        if (importTemplate) continue;
        if (!person) continue;
        if (cfg.name === "FORM 4 EDIT") {
          const b = String(person.birthday || "").split("-");
          const map: Record<string, unknown> = { B: person.timestamp, C: person.email, D: person.firstName, E: person.middleName, F: person.lastName, G: person.extensionName, H: excelDate(person.birthday), L: b[1] ? Number(b[1]) : null, M: b[2] ? Number(b[2]) : null, N: b[0] ? Number(b[0]) : null, O: person.sitio, P: person.barangay, Q: person.municipality, R: person.province, S: person.district || m.proponent, T: person.idType, U: person.idNumber, X: person.contactNumber, Y: person.bankAccount, Z: person.typeOfBeneficiary, AA: person.occupation, AB: person.sex, AC: person.civilStatus, AD: person.age === "" || person.age == null ? null : Number(person.age), AF: person.monthlyIncome === "" || person.monthlyIncome == null ? null : Number(person.monthlyIncome), AG: person.dependentFirstName, AH: person.dependentMiddleName, AI: person.dependentLastName, AJ: person.dependentExtensionName, AK: person.dependentRelationship, AL: person.dependentAge === "" || person.dependentAge == null ? null : Number(person.dependentAge), AO: person.employmentInterest, AP: person.skillsTraining, AQ: person.pwd, AR: person.fourPs, AS: person.ip, AT: person.remarks };
          for (const [col, value] of Object.entries(map)) values[col + row] = value;
        }
        // Preserve original formulas: these columns are non-formula inputs in the supplied template.
        if (cfg.name === "FORM 4 FINAL") Object.assign(values, { [`J${row}`]: person.province || m.province, [`K${row}`]: person.district || m.proponent, [`O${row}`]: person.bankAccount });
        if (cfg.name === "PAYROLL") Object.assign(values, { [`J${row}`]: person.province || m.province, [`O${row}`]: m.dailyRate !== "" ? Number(m.dailyRate) : null });
        if (cfg.name === "for GPAI Enrollment") values[`I${row}`] = person.province || m.province;
        if (cfg.name === FORM4_CONSOLIDATED) Object.assign(values, { [`G${row}`]: person.remarks, [`V${row}`]: person.province || m.province, [`W${row}`]: person.district || m.proponent, [`AA${row}`]: person.bankAccount });
        if (cfg.name === "DTR") person.attendance.forEach((day, d) => { if (d < 10) values[XLSX.utils.encode_col(d + 2) + row] = day; });
      }
      // An upload template is a clean entry grid, not a sheet of lookups against blank source data.
      if (importTemplate && cfg.name === FORM4_CONSOLIDATED) xml = xml.replace(CELL, (whole, attrs, col, r) => Number(r) >= cfg.start ? valueCell(attrs, col === "H" && Number(r) < cfg.start + count ? Number(r) - cfg.start + 1 : null) : whole);
      if (!importTemplate) xml = xml.replace(/<row\b([^>]*\br="(\d+)"[^>]*)(\/>|>)/g, (whole, attrs, r, end) => {
        const value = Number(r);
        if (value < cfg.start || value > cfg.start + capacity - 1) return whole;
        return `<row${attrs.replace(/\s+hidden="[^"]*"/g, "")}${value >= cfg.start + count ? ' hidden="1"' : ""}${end}`;
      });
    }
    xml = setCells(xml, values);
    if (!importTemplate && data.draft.cells[cfg.name]) {
      for (const ref of Object.keys(data.draft.cells[cfg.name])) {
        const row = Number(ref.match(/\d+$/)![0]);
        if (row >= cfg.start && row <= Math.max(cfg.end, cfg.start + n - 1)) throw new Error("Only blank header/footer cells may be edited by address. Use beneficiary fields for roster details; enter attendance through the program scanner/correction workflow.");
      }
      xml = setCells(xml, data.draft.cells[cfg.name], true);
    }
    if (count > 887) xml = xml.replace(/(<f\b[^>]*>)([\s\S]*?)(<\/f>)/g, (_, a, f, b) => a + f.replace(/((?:\$?[A-Z]+\$?)14:(?:\$?[A-Z]+\$?))900\b/g, `$1${count + 13}`) + b);
    xml = xml.replace(/<sheetView\b([^>]*?)(\/?>)/g, (_, attrs, close) => `<sheetView${attrs.replace(/\s+tabSelected="[^"]*"/g, "")} tabSelected="${selected.includes(cfg.name) ? 1 : 0}"${close}`);
    zip.file(pathOf(cfg.name), xml);
  }
  let book = await zip.file("xl/workbook.xml")!.async("string");
  let sheetIndex = -1;
  book = book.replace(/<sheet\b([^>]*\bname="([^"]+)"[^>]*)\/>/g, (_, attrs, name) => { sheetIndex++; return `<sheet${attrs.replace(/\s+state="[^"]*"/g, "")}${selected.includes(name as DoleSheetName) ? "" : ' state="hidden"'}/>`; });
  const first = DOLE_REPORT_SHEETS.findIndex((s) => selected.includes(s.name));
  book = book.replace(/<workbookView\b([^>]*?)(\/?>)/, (_, attrs, close) => `<workbookView${attrs.replace(/\s+(activeTab|firstSheet)="[^"]*"/g, "")} activeTab="${first}" firstSheet="${first}"${close}`);
  // Extend print areas only as much as necessary; preserve original paper/orientation/scale/margins.
  book = book.replace(/<definedName\b([^>]*localSheetId="(\d+)"[^>]*)>([\s\S]*?)<\/definedName>/g, (whole, attrs, idx, ref) => {
    const cfg = DOLE_REPORT_SHEETS[Number(idx)];
    const delta = cfg && !["LIST MED", "SUMMARY BREAKDOWN"].includes(cfg.name) ? Math.max(0, count - (cfg.end - cfg.start + 1)) : 0;
    return delta ? `<definedName${attrs}>${ref.replace(/(\$?[A-Z]+\$?)(\d+)/g, (_: string, c: string, r: string) => c + (Number(r) >= cfg.end ? Number(r) + delta : r))}</definedName>` : whole;
  });
  zip.file("xl/workbook.xml", book);
  await resetCalculation(zip);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
