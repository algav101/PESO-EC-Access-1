import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";
import {
  classifyBeneficiaryGroup,
  normalizeBarangayName,
  normalizeSitioName,
  CANONICAL_BARANGAYS,
  CANONICAL_SITIOS_BY_BARANGAY,
} from "@/lib/dingalan-groupings";

// The canonical blank upload workbook is served by /api/v1/beneficiaries/template.

export interface RosterRestrictionDetail {
  reason: string;
  end: string;
  start?: string;
  payoutDate?: string;
  isAppointivePersonnel?: boolean;
}

export interface ParsedBeneficiaryRow {
  rowNumber: number;
  designatedNumber: string;
  fullName: string;
  lastName?: string;
  firstName?: string;
  middleName?: string;
  extensionName?: string;
  birthday: string; // YYYY-MM-DD
  birthdayPin: string; // MMDD
  sex?: string;
  civilStatus?: string;
  age?: number;
  monthlyIncome?: number;
  typeOfBeneficiary?: string;
  occupation?: string;
  idType?: string;
  idNumber?: string;
  barangay?: string;
  sitio?: string;
  municipality?: string;
  province?: string;
  contactNumber?: string;
  isSenior?: boolean;
  isPwd?: boolean;
  is4Ps?: boolean;
  isIp?: boolean;
  skillsTraining?: string;
  dependentFullName?: string;
  dependentFirstName?: string;
  dependentMiddleName?: string;
  dependentLastName?: string;
  dependentExtensionName?: string;
  dependentRelationship?: string;
  dependentAge?: number;
  reportInputs?: Record<string, string>;
  // Grouping fields
  groupName?: string;
  groupLabel?: string;
  designatedMainArea?: string;
  isExistingInDb?: boolean;
  isExistingInProgram?: boolean;
  existingBeneficiaryId?: string;
  existingBeneficiaryNumber?: string;
  existingDesignatedNumber?: string;
  status:
    | "VALID"
    | "DUPLICATE"
    | "RESTRICTED"
    | "EXEMPTED"
    | "MISSING_REQUIRED_FIELD"
    | "INVALID_BIRTHDAY"
    | "DUPLICATE_DESIGNATED_NUMBER";
  validationError?: string;
  restrictionEnd?: string;
  restrictionReason?: string;
  restrictionDetails?: RosterRestrictionDetail[];
  isExempted?: boolean;
  exemptionReason?: string;
}

export interface ImportPreviewResult {
  sourceSheetName?: string;
  fileName: string;
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  restrictedCount: number;
  invalidCount: number;
  existingInDbCount: number;
  existingInProgramCount: number;
  newBeneficiaryCount: number;
  rows: ParsedBeneficiaryRow[];
  barangaySummary: Record<string, number>;
}

const MONTH_NAME_MAP: Record<string, string> = {
  jan: "01", january: "01",
  feb: "02", february: "02",
  mar: "03", march: "03",
  apr: "04", april: "04",
  may: "05",
  jun: "06", june: "06",
  jul: "07", july: "07",
  aug: "08", august: "08",
  sep: "09", sept: "09", september: "09",
  oct: "10", october: "10",
  nov: "11", november: "11",
  dec: "12", december: "12"
};

export { normalizeSitioName, normalizeBarangayName, CANONICAL_BARANGAYS, CANONICAL_SITIOS_BY_BARANGAY };

function parseCellDateIso(val: unknown): string {
  if (val == null || val === "") return "";
  if (val instanceof Date && !isNaN(val.getTime())) return val.toISOString().slice(0, 10);
  if (typeof val === "number" && Number.isFinite(val)) {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : "";
  }
  const s = String(val).trim();
  if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(s)) {
    const [y, m, d] = s.split(/[\/\-]/);
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(s)) {
    const [p1, p2, y] = s.split(/[\/\-]/);
    const n1 = parseInt(p1, 10), n2 = parseInt(p2, 10);
    const m = n1 > 12 ? String(n2).padStart(2, "0") : String(n1).padStart(2, "0");
    const d = n1 > 12 ? String(n1).padStart(2, "0") : String(n2).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return "";
}

function cleanStr(val: unknown): string {
  if (val == null) return "";
  if (val instanceof Date && !isNaN(val.getTime())) return val.toISOString().slice(0, 10);
  const s = String(val).trim();
  return s.startsWith("=") ? "" : s;
}

export async function parseBeneficiaryExcelBuffer(
  buffer: Buffer,
  fileName: string,
  targetProgramId: string
): Promise<ImportPreviewResult> {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: false });
  } catch (e: any) {
    try {
      workbook = XLSX.read(buffer.toString("utf-8"), { type: "string", cellDates: true });
    } catch (e2: any) {
      throw new Error(`Unable to read spreadsheet file: ${e.message}`);
    }
  }

  if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("No worksheets found in uploaded file");
  }

  const form4EditSheetName = workbook.SheetNames.find((name) => name.trim().toLowerCase() === "form 4 edit");
  const consolidatedSheetName = workbook.SheetNames.find((name) => name.trim().toLowerCase() === "form 4 for consolidated");

  // Extract raw rows and workbook metadata from FORM 4 EDIT when present in the workbook.
  const form4EditByDesig = new Map<string, any[]>();
  const workbookMeta: Record<string, string> = {};
  if (form4EditSheetName) {
    const editSheet = workbook.Sheets[form4EditSheetName];
    const editRows: any[] = XLSX.utils.sheet_to_json(editSheet, { header: 1, defval: "" });
    const cellVal = (r: number, c: number) => cleanStr(editRows[r]?.[c]);
    const cellDate = (r: number, c: number) => parseCellDateIso(editSheet[XLSX.utils.encode_col(c) + (r + 1)]?.v ?? editRows[r]?.[c]);
    const metaPairs: [string, string][] = [
      ["natureOfProject", cellVal(3, 4)],
      ["regionalOffice", cellVal(4, 4)],
      ["referenceNumber", cellVal(5, 4)],
      ["province", cellVal(6, 4)],
      ["municipality", cellVal(7, 4)],
      ["barangay", cellVal(8, 4)],
      ["adlNumber", cellVal(3, 17)],
      ["periodOfCoverage", cellVal(4, 17)],
      ["tupadIdPrefix", cellVal(5, 17)],
      ["tupadIdStart", cellVal(6, 17).replace(/\.0$/, "")],
      ["batchNumber", cellVal(3, 22)],
      ["proponent", cellVal(4, 22)],
      ["orientationDate", cellDate(5, 22)],
      ["payoutDate", cellDate(6, 22)],
    ];
    for (const [k, v] of metaPairs) if (v) workbookMeta[k] = v;

    for (let r = 13; r < editRows.length; r++) {
      const row = editRows[r];
      if (!row || row.length === 0) continue;
      const d = cleanStr(row[0]).replace(/\.0$/, "");
      const hasName = Boolean(cleanStr(row[3]) || cleanStr(row[5]) || cleanStr(row[51]));
      if (d && /^\d+$/.test(d) && hasName) {
        form4EditByDesig.set(d, row);
      }
    }
  }

  let sheetName = consolidatedSheetName || form4EditSheetName || workbook.SheetNames[0];
  if (consolidatedSheetName && form4EditSheetName && form4EditByDesig.size > 0) {
    const consRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[consolidatedSheetName], { header: 1, defval: "" });
    const consHasData = consRows.slice(2).some((r) => r && (cleanStr(r[10]) || cleanStr(r[12]) || cleanStr(r[8])));
    if (!consHasData) sheetName = form4EditSheetName;
  }

  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

  if (rawRows.length === 0) {
    throw new Error("Uploaded spreadsheet is empty");
  }

  // 1. Detect multi-level header structure
  let headerRowIndex = 0;
  let subHeaderRowIndex = -1;

  for (let i = 0; i < Math.min(30, rawRows.length); i++) {
    const row = rawRows[i] || [];
    const rowStr = row.map((c: any) => String(c).toLowerCase()).join(" ");
    const nextRowStr = i + 1 < rawRows.length ? (rawRows[i + 1] || []).map((c: any) => String(c).toLowerCase()).join(" ") : "";
    const hasSubHeader =
      nextRowStr.includes("first name") ||
      nextRowStr.includes("street") ||
      nextRowStr.includes("montrh") ||
      nextRowStr.includes("month") ||
      nextRowStr.includes("brgy") ||
      nextRowStr.includes("sitio") ||
      nextRowStr.includes("yyyy/mm/dd");
    const headerKeywords = [
      "formula full name",
      "name of beneficiary",
      "beneficiary name",
      "full name",
      "birthdate",
      "birthday",
      "type of id",
      "civil status",
      "occupation",
    ].filter((k) => rowStr.includes(k)).length;

    if (hasSubHeader || headerKeywords >= 2 || (headerKeywords >= 1 && (rowStr.includes("no.") || rowStr.includes("barangay") || rowStr.includes("address")))) {
      headerRowIndex = i;
      if (hasSubHeader) {
        subHeaderRowIndex = i + 1;
      }
      break;
    }
  }

  // Build merged header map
  const topHeaders = (rawRows[headerRowIndex] || []).map((h: any) => String(h).trim());
  const subHeaders = subHeaderRowIndex !== -1 ? (rawRows[subHeaderRowIndex] || []).map((h: any) => String(h).trim()) : [];
  const isConsolidated = topHeaders[0]?.toUpperCase() === "BATCH" && topHeaders[7]?.toLowerCase() === "no." && subHeaders[10]?.toLowerCase() === "first name";
  const isForm4Edit = topHeaders[0]?.toLowerCase() === "no." && subHeaders[3]?.toLowerCase() === "first name" && topHeaders[3]?.toLowerCase().includes("name of beneficiary");
  const mergedHeaders: string[] = [];

  const maxCols = Math.max(topHeaders.length, subHeaders.length, 55);
  for (let c = 0; c < maxCols; c++) {
    const top = topHeaders[c] || "";
    const sub = subHeaders[c] || "";
    mergedHeaders.push(`${top} | ${sub}`.trim().toLowerCase());
  }

  const findCol = (...keywords: string[]) => {
    return mergedHeaders.findIndex((mh) =>
      keywords.some((k) => mh.includes(k.toLowerCase()))
    );
  };

  // Specific column indexes based on template
  const colDesig = isConsolidated ? 7 : isForm4Edit ? 0 : findCol("no. |", "designated", "seq", "# |");
  const colFormulaFullName = findCol("formula full name", "full name |");
  const colFormulaLastFirst = findCol("formula last name, first name");

  // Name sub-headers (under Name of Beneficiary)
  let colBeneFirst = -1;
  let colBeneMiddle = -1;
  let colBeneLast = -1;
  let colBeneExt = -1;

  for (let c = 0; c < maxCols; c++) {
    const sub = (subHeaders[c] || "").toLowerCase();
    const top = (topHeaders[c] || "").toLowerCase();
    if (top.includes("name of beneficiary") || top.includes("beneficiary") || (c >= 3 && c <= 6)) {
      if (sub.includes("first") && colBeneFirst === -1) colBeneFirst = c;
      if (sub.includes("middle") && colBeneMiddle === -1) colBeneMiddle = c;
      if (sub.includes("last") && colBeneLast === -1) colBeneLast = c;
      if (sub.includes("extension") && colBeneExt === -1) colBeneExt = c;
    }
  }

  if (isConsolidated) { colBeneFirst = 10; colBeneMiddle = 11; colBeneLast = 12; colBeneExt = 13; }
  if (isForm4Edit) { colBeneFirst = 3; colBeneMiddle = 4; colBeneLast = 5; colBeneExt = 6; }

  // Birthdate sub-headers (Month, Day, Year, or Single Date Column)
  let colBdayMonth = -1;
  let colBdayDay = -1;
  let colBdayYear = -1;
  let colBdaySingle = -1;

  for (let c = 0; c < maxCols; c++) {
    const sub = (subHeaders[c] || "").toLowerCase();
    const top = (topHeaders[c] || "").toLowerCase();
    if (sub.includes("montrh") || sub.includes("month") || sub === "mm") colBdayMonth = c;
    if (sub.includes("day") || sub === "dd") colBdayDay = c;
    if (sub.includes("year") || sub === "yyyy") colBdayYear = c;
    if (
      top.includes("birthday") ||
      top.includes("birthdate") ||
      top.includes("dob") ||
      sub.includes("yyyy/mm/dd") ||
      sub.includes("yyyy-mm-dd") ||
      sub.includes("mm/dd/yyyy")
    ) {
      if (colBdaySingle === -1) colBdaySingle = c;
    }
  }

  if (isForm4Edit) {
    colBdaySingle = 7;
    colBdayMonth = 11;
    colBdayDay = 12;
    colBdayYear = 13;
  } else if (colBdaySingle !== -1) {
    if (colBdayMonth === -1 && colBdaySingle + 1 < maxCols) colBdayMonth = colBdaySingle + 1;
    if (colBdayDay === -1 && colBdaySingle + 2 < maxCols) colBdayDay = colBdaySingle + 2;
    if (colBdayYear === -1 && colBdaySingle + 3 < maxCols) colBdayYear = colBdaySingle + 3;
  }

  // Address sub-headers (Street/Sitio/Purok, Brgy, City/Municipality, Province)
  let colSitio = -1;
  let colBrgy = -1;
  let colCity = -1;
  let colProvince = -1;
  let colDistrict = -1;

  for (let c = 0; c < maxCols; c++) {
    const sub = (subHeaders[c] || "").toLowerCase();
    const top = (topHeaders[c] || "").toLowerCase();
    const combined = `${top} ${sub}`.trim();

    if (
      colSitio === -1 &&
      (sub.includes("street") ||
        sub.includes("sitio") ||
        sub.includes("purok") ||
        sub.includes("address") ||
        combined.includes("street") ||
        combined.includes("sitio") ||
        combined.includes("purok"))
    ) {
      colSitio = c;
    }
    if (
      colBrgy === -1 &&
      (sub.includes("brgy") ||
        sub.includes("barangay") ||
        combined.includes("brgy") ||
        combined.includes("barangay"))
    ) {
      colBrgy = c;
    }
    if (
      colCity === -1 &&
      (sub.includes("city") ||
        sub.includes("municipality") ||
        combined.includes("city") ||
        combined.includes("municipality"))
    ) {
      colCity = c;
    }
    if (
      colProvince === -1 &&
      (sub.includes("province") || combined.includes("province"))
    ) {
      colProvince = c;
    }
    if (
      colDistrict === -1 &&
      (sub.includes("district") || combined.includes("district"))
    ) {
      colDistrict = c;
    }
  }

  if (isConsolidated) { colSitio = 18; colBrgy = 19; colCity = 20; colProvince = 21; colDistrict = 22; }
  if (isForm4Edit) { colSitio = 14; colBrgy = 15; colCity = 16; colProvince = 17; colDistrict = 18; }

  // Demographics
  const colIdType = isConsolidated ? 23 : isForm4Edit ? 19 : findCol("type of id");
  const colIdNo = isConsolidated ? 24 : isForm4Edit ? 20 : findCol("id no");
  const colContact = isConsolidated ? 25 : isForm4Edit ? 23 : findCol("contact no", "phone", "mobile");
  const colBankAccount = isConsolidated ? 26 : isForm4Edit ? 24 : findCol("account no", "e-payment");
  const colBeneType = isConsolidated ? 27 : isForm4Edit ? 25 : findCol("type of beneficiary");
  const colOccupation = isConsolidated ? 28 : isForm4Edit ? 26 : findCol("occupation");
  const colSex = isConsolidated ? 29 : isForm4Edit ? 27 : findCol("sex |", "gender");
  const colCivilStatus = isConsolidated ? 30 : isForm4Edit ? 28 : findCol("civil status");
  const colAge = isConsolidated ? 31 : isForm4Edit ? 29 : findCol("age |", "edad");
  const colMonthlyIncome = isConsolidated ? 32 : isForm4Edit ? 31 : findCol("monthly income", "income");

  // Dependent sub-headers
  let colDepFirst = -1;
  let colDepMiddle = -1;
  let colDepLast = -1;
  let colDepExt = -1;

  for (let c = 20; c < maxCols; c++) {
    const sub = (subHeaders[c] || "").toLowerCase();
    const top = (topHeaders[c] || "").toLowerCase();
    if (top.includes("dependent") || (c >= 24 && c <= 27)) {
      if (sub.includes("first") && colDepFirst === -1) colDepFirst = c;
      if (sub.includes("middle") && colDepMiddle === -1) colDepMiddle = c;
      if (sub.includes("last") && colDepLast === -1) colDepLast = c;
      if (sub.includes("extension") && colDepExt === -1) colDepExt = c;
    }
  }

  if (isConsolidated) { colDepFirst = 35; colDepMiddle = 36; colDepLast = 37; colDepExt = 38; }
  if (isForm4Edit) { colDepFirst = 32; colDepMiddle = 33; colDepLast = 34; colDepExt = 35; }

  const colDepRelationship = isConsolidated ? 39 : isForm4Edit ? 36 : findCol("relationship of dependent", "relationship of dependemt", "relationship");
  const colDepAge = isConsolidated ? 40 : isForm4Edit ? 37 : findCol("age (18 above) of dependent", "age of dependent");
  const colEmploymentInterest = isConsolidated ? 41 : isForm4Edit ? 40 : findCol("interested in wage employment", "wage employment");
  const colSkills = isConsolidated ? 42 : isForm4Edit ? 41 : findCol("skills training needed", "skills");
  const colPwd = isConsolidated ? 43 : isForm4Edit ? 42 : findCol("pwd");
  const col4Ps = isConsolidated ? 44 : isForm4Edit ? 43 : findCol("4p's", "4ps");
  const colIps = isConsolidated ? 45 : isForm4Edit ? 44 : findCol("ip's", "ips");
  const colRemarks = isConsolidated ? 6 : isForm4Edit ? 45 : findCol("remarks");

  // Step 1: Parse rows from file
  const rawParsedItems: any[] = [];
  const candidateNames = new Set<string>();
  const candidateLastNames = new Set<string>();

  const startDataRow = subHeaderRowIndex !== -1 ? subHeaderRowIndex + 1 : headerRowIndex + 1;

  for (let r = startDataRow; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0 || row.every((c: any) => String(c).trim() === "")) {
      continue; // skip empty rows
    }

    // 1. Designated Number
    let designated = "";
    if (colDesig !== -1 && row[colDesig] !== undefined && String(row[colDesig]).trim() !== "") {
      designated = String(row[colDesig]).trim();
    } else {
      designated = String(r - startDataRow + 1);
    }
    if (designated.endsWith(".0")) designated = designated.slice(0, -2);

    // Companion FORM 4 EDIT row (if present in the same workbook)
    const editRow = form4EditByDesig.get(designated);
    const pickStr = (primary: unknown, editIdx?: number): string => {
      const p = cleanStr(primary);
      if (p) return p;
      return editRow && editIdx !== undefined ? cleanStr(editRow[editIdx]) : "";
    };

    // 2. Full Name Resolution
    let fullName = "";
    let lastName = pickStr(colBeneLast !== -1 ? row[colBeneLast] : "", 5).toUpperCase();
    let firstName = pickStr(colBeneFirst !== -1 ? row[colBeneFirst] : "", 3).toUpperCase();
    let middleName = pickStr(colBeneMiddle !== -1 ? row[colBeneMiddle] : "", 4).toUpperCase();
    let extensionName = pickStr(colBeneExt !== -1 ? row[colBeneExt] : "", 6).toUpperCase();

    const formulaFullName = pickStr(colFormulaFullName !== -1 ? row[colFormulaFullName] : "", 51).toUpperCase();

    if (formulaFullName && !formulaFullName.startsWith("=")) {
      fullName = formulaFullName;
      if (!lastName && fullName.includes(",")) {
        const parts = fullName.split(",");
        lastName = parts[0].trim();
        const rest = (parts[1] || "").trim().split(" ");
        firstName = rest[0] || "";
        middleName = rest.slice(1).join(" ") || "";
      }
    } else if (lastName && firstName) {
      const midPart = middleName ? ` ${middleName}` : "";
      const extPart = extensionName ? ` ${extensionName}` : "";
      fullName = `${lastName}, ${firstName}${midPart}${extPart}`;
    }

    // 3. Birthday Parsing: First check split columns (Month, Day, Year) if present
    let birthday = ""; // YYYY-MM-DD
    let birthdayPin = ""; // MM-DD-YYYY

    const rawMonth = pickStr(colBdayMonth !== -1 ? row[colBdayMonth] : "", 11);
    const rawDay = pickStr(colBdayDay !== -1 ? row[colBdayDay] : "", 12);
    const rawYear = pickStr(colBdayYear !== -1 ? row[colBdayYear] : "", 13);

    if (rawMonth !== "" && rawDay !== "" && rawYear !== "") {
      let mStr = rawMonth.toLowerCase();
      if (MONTH_NAME_MAP[mStr]) {
        mStr = MONTH_NAME_MAP[mStr];
      } else {
        const mNum = parseInt(mStr, 10);
        if (!isNaN(mNum)) mStr = mNum.toString().padStart(2, "0");
      }

      const dNum = parseInt(rawDay, 10);
      const dStr = !isNaN(dNum) ? dNum.toString().padStart(2, "0") : "";

      let yNum = parseInt(rawYear, 10);
      if (!isNaN(yNum) && yNum < 100) yNum += yNum > 30 ? 1900 : 2000;
      const yStr = !isNaN(yNum) ? yNum.toString() : "";

      if (mStr && dStr && yStr && mStr.length === 2 && dStr.length === 2 && yStr.length === 4) {
        birthday = `${yStr}-${mStr}-${dStr}`;
        birthdayPin = `${mStr}-${dStr}-${yStr}`;
      }
    }

    // Fallback: Single date column e.g. "2000/11/08" or "14/06/1978" or Date object or serial
    if (!birthday) {
      const singleCandidate = colBdaySingle !== -1 && row[colBdaySingle] !== undefined && String(row[colBdaySingle]).trim() !== ""
        ? row[colBdaySingle]
        : editRow?.[7] || editRow?.[53] || editRow?.[54];
      const parsedIso = parseCellDateIso(singleCandidate);
      if (parsedIso) {
        birthday = parsedIso;
        const [y, m, d] = birthday.split("-");
        birthdayPin = `${m}-${d}-${y}`;
      }
    }

    // Skip non-beneficiary rows (such as footer grouping matrix e.g. "APLAYA GROUP 1, PUROK LAPU LAPU")
    const isFooterOrNonBene =
      !fullName ||
      fullName.includes("GROUP") ||
      fullName.includes("PUROK") ||
      fullName.includes("SITIO") ||
      designated.includes("GROUP") ||
      designated.includes("APLAYA") ||
      designated.includes("BNB") ||
      designated.includes("UMIRAY") ||
      !birthday;

    if (isFooterOrNonBene) {
      continue;
    }

    if (fullName) candidateNames.add(fullName);
    if (lastName) candidateLastNames.add(lastName);

    // 4. Address & Demographics
    const rawBrgy = pickStr(colBrgy !== -1 ? row[colBrgy] : "", 15) || "Dingalan";
    const barangay = normalizeBarangayName(rawBrgy);
    const rawSitio = pickStr(colSitio !== -1 ? row[colSitio] : "", 14);
    const sitio = normalizeSitioName(rawSitio, barangay);
    const rawCity = pickStr(colCity !== -1 ? row[colCity] : "", 16) || "Dingalan";
    const rawProvince = pickStr(colProvince !== -1 ? row[colProvince] : "", 17) || "Aurora";
    const rawDistrict = pickStr(colDistrict !== -1 ? row[colDistrict] : "", 18);

    // Prefer FORM 4 EDIT raw contact number when consolidated formula produced INCOMPLETE/EXCESS
    let contact = colContact !== -1 && row[colContact] ? cleanStr(row[colContact]) : "";
    const editContact = editRow ? cleanStr(editRow[23]) : "";
    if ((!contact || contact === "INCOMPLETE" || contact === "EXCESS") && editContact) {
      contact = editContact;
    } else if (editContact && contact.startsWith("639") && editContact.startsWith("09")) {
      contact = editContact;
    }
    if (contact.endsWith(".0")) contact = contact.slice(0, -2);

    const rawSex = pickStr(colSex !== -1 ? row[colSex] : "", 27).toUpperCase();
    const sex = rawSex.startsWith("M") ? "MALE" : rawSex.startsWith("F") ? "FEMALE" : rawSex;

    const rawCivil = pickStr(colCivilStatus !== -1 ? row[colCivilStatus] : "", 28).toUpperCase();
    const civilStatus = rawCivil === "M" ? "MARRIED" : rawCivil === "S" ? "SINGLE" : rawCivil === "W" ? "WIDOWED" : rawCivil === "SP" ? "SEPARATED" : rawCivil;

    const rawAgeStr = pickStr(colAge !== -1 ? row[colAge] : "", 29);
    const age = rawAgeStr ? parseInt(rawAgeStr, 10) || undefined : undefined;
    const incomeInput = pickStr(colMonthlyIncome !== -1 ? row[colMonthlyIncome] : "", 31);
    const parsedIncome = incomeInput !== "" ? Number(incomeInput.replace(/,/g, "")) : NaN;
    const monthlyIncome = Number.isFinite(parsedIncome) ? parsedIncome : undefined;

    const idType = pickStr(colIdType !== -1 ? row[colIdType] : "", 19) || undefined;
    let idNumber = pickStr(colIdNo !== -1 ? row[colIdNo] : "", 20) || undefined;
    if (idNumber && idNumber.endsWith(".0")) idNumber = idNumber.slice(0, -2);

    const typeOfBeneficiary = pickStr(colBeneType !== -1 ? row[colBeneType] : "", 25) || undefined;
    const occupation = pickStr(colOccupation !== -1 ? row[colOccupation] : "", 26) || undefined;
    const skillsTraining = pickStr(colSkills !== -1 ? row[colSkills] : "", 41) || undefined;
    const bankAccount = pickStr(colBankAccount !== -1 ? row[colBankAccount] : "", 24);
    const employmentInterest = pickStr(colEmploymentInterest !== -1 ? row[colEmploymentInterest] : "", 40);
    const remarks = pickStr(colRemarks !== -1 ? row[colRemarks] : "", 45);
    const timestamp = editRow ? cleanStr(editRow[1]) : isForm4Edit ? cleanStr(row[1]) : "";
    const email = editRow ? cleanStr(editRow[2]) : isForm4Edit ? cleanStr(row[2]) : "";

    const rawPwd = pickStr(colPwd !== -1 ? row[colPwd] : "", 42).toUpperCase();
    const isPwd = rawPwd.startsWith("Y") || rawPwd === "YES" || (rawPwd.length > 0 && rawPwd !== "N" && rawPwd !== "NO");

    const raw4Ps = pickStr(col4Ps !== -1 ? row[col4Ps] : "", 43).toUpperCase();
    const is4Ps = raw4Ps.startsWith("Y") || raw4Ps === "YES";

    const rawIps = pickStr(colIps !== -1 ? row[colIps] : "", 44).toUpperCase();
    const isIp = rawIps.startsWith("Y") || rawIps === "YES";

    const isSenior = (age && age >= 60) || (typeOfBeneficiary && typeOfBeneficiary.toLowerCase().includes("senior"));

    // Grouping Classification according to official Dingalan Purok and Sitio Groups
    const groupInfo = classifyBeneficiaryGroup(barangay, sitio);

    // Dependent fields
    const depFirst = pickStr(colDepFirst !== -1 ? row[colDepFirst] : "", 32).toUpperCase() || undefined;
    const depMiddle = pickStr(colDepMiddle !== -1 ? row[colDepMiddle] : "", 33).toUpperCase() || undefined;
    const depLast = pickStr(colDepLast !== -1 ? row[colDepLast] : "", 34).toUpperCase() || undefined;
    const depExt = pickStr(colDepExt !== -1 ? row[colDepExt] : "", 35).toUpperCase() || undefined;
    let dependentFullName: string | undefined;
    if (depFirst || depLast) {
      dependentFullName = [depFirst, depMiddle, depLast, depExt].filter(Boolean).join(" ");
    }
    const dependentRelationship = pickStr(colDepRelationship !== -1 ? row[colDepRelationship] : "", 36).toUpperCase() || undefined;
    const rawDepAge = pickStr(colDepAge !== -1 ? row[colDepAge] : "", 37);
    const dependentAge = rawDepAge ? parseInt(rawDepAge, 10) || undefined : undefined;

    const rawReportInputs: Record<string, unknown> = {
      ...(rawParsedItems.length === 0 ? workbookMeta : {}),
      sitio: rawSitio,
      barangay: rawBrgy,
      municipality: rawCity,
      province: rawProvince,
      district: rawDistrict || workbookMeta.proponent || "",
      timestamp,
      email,
      contactNumber: contact,
      bankAccount,
      civilStatus: rawCivil,
      sex: rawSex,
      employmentInterest,
      pwd: rawPwd,
      fourPs: raw4Ps,
      ip: rawIps,
      remarks,
    };
    if (isConsolidated) {
      Object.assign(rawReportInputs, {
        batchLabel: workbookMeta.batchNumber || cleanStr(row[0]),
        proponentLabel: workbookMeta.proponent || cleanStr(row[1]),
        orientationDate: workbookMeta.orientationDate || parseCellDateIso(row[2]) || cleanStr(row[2]),
        periodOfCoverage: workbookMeta.periodOfCoverage || cleanStr(row[3]),
        payoutDate: workbookMeta.payoutDate || parseCellDateIso(row[4]) || cleanStr(row[4]),
        salary: cleanStr(row[5]),
      });
    }

    rawParsedItems.push({
      rowNumber: r + 1,
      designatedNumber: designated,
      fullName,
      lastName,
      firstName,
      middleName,
      extensionName,
      birthday,
      birthdayPin,
      sex,
      civilStatus,
      age,
      monthlyIncome,
      typeOfBeneficiary,
      occupation,
      idType,
      idNumber,
      barangay,
      sitio,
      municipality: rawCity,
      province: rawProvince,
      contactNumber: contact,
      isSenior: Boolean(isSenior),
      isPwd,
      is4Ps,
      isIp,
      skillsTraining,
      dependentFullName,
      dependentFirstName: depFirst,
      dependentMiddleName: depMiddle,
      dependentLastName: depLast,
      dependentExtensionName: depExt,
      dependentRelationship,
      dependentAge,
      reportInputs: Object.fromEntries(
        Object.entries(rawReportInputs).map(([k, v]) => [k, v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "").trim()])
      ),
      groupName: groupInfo.groupName,
      groupLabel: groupInfo.groupLabel,
      designatedMainArea: groupInfo.designatedMainArea,
    });
  }

  // Step 2: Perform fast targeted DB queries only for candidate names in this file
  const todayStr = new Date().toISOString().split("T")[0];
  const restrictionMap = new Map<string, RosterRestrictionDetail[]>();
  const existingBeneDbMap = new Map<string, any>();

  if (candidateNames.size > 0) {
    const [activeRestrictions, existingDbBeneficiaries] = await Promise.all([
      prisma.beneficiaryRestriction.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { beneficiary: { fullName: { in: Array.from(candidateNames) } } },
            { beneficiary: { lastName: { in: Array.from(candidateLastNames) } } },
          ],
        },
        select: {
          restrictionEnd: true,
          restrictionStart: true,
          payoutDate: true,
          reason: true,
          isAppointivePersonnel: true,
          beneficiary: {
            select: {
              fullName: true,
              birthday: true,
            },
          },
        },
      }),
      prisma.beneficiary.findMany({
        where: {
          OR: [
            { fullName: { in: Array.from(candidateNames) } },
            { lastName: { in: Array.from(candidateLastNames) } },
          ],
        },
        select: {
          id: true,
          fullName: true,
          birthday: true,
          beneficiaryNumber: true,
          barangay: true,
          sitio: true,
          programBeneficiaries: {
            where: { programId: targetProgramId },
            select: { id: true, designatedNumber: true },
          },
        },
      }),
    ]);

    for (const r of activeRestrictions) {
      if (r.beneficiary?.fullName) {
        if (!r.restrictionEnd || r.restrictionEnd >= todayStr || r.isAppointivePersonnel) {
          const cleanName = r.beneficiary.fullName.trim().toUpperCase();
          const bday = (r.beneficiary.birthday || "").trim();
          const entry = {
            end: r.restrictionEnd || (r.isAppointivePersonnel ? "Permanent (Appointive)" : "Active Restriction"),
            reason: r.reason?.trim() || (r.isAppointivePersonnel ? "Appointive personnel restriction" : "Active beneficiary restriction"),
            start: r.restrictionStart || undefined,
            payoutDate: r.payoutDate || undefined,
            isAppointivePersonnel: r.isAppointivePersonnel,
          };
          const exactKey = `${cleanName}_${bday}`;
          restrictionMap.set(exactKey, [...(restrictionMap.get(exactKey) || []), entry]);
          if (!bday || r.isAppointivePersonnel) {
            restrictionMap.set(cleanName, [...(restrictionMap.get(cleanName) || []), entry]);
          }
        }
      }
    }

    for (const b of existingDbBeneficiaries) {
      const key = `${b.fullName.trim().toUpperCase()}_${b.birthday}`;
      existingBeneDbMap.set(key, b);
    }
  }

  // Step 3: Classify and validate parsed items
  const parsedRows: ParsedBeneficiaryRow[] = [];
  const seenDesigInFile = new Set<string>();
  const seenNameInFile = new Set<string>();
  const barangaySummary: Record<string, number> = {};

  let validCount = 0;
  let duplicateCount = 0;
  let restrictedCount = 0;
  let invalidCount = 0;
  let existingInDbCount = 0;
  let existingInProgramCount = 0;
  let newBeneficiaryCount = 0;

  for (const item of rawParsedItems) {
    let status: ParsedBeneficiaryRow["status"] = "VALID";
    let validationError: string | undefined;
    let restrictionEnd: string | undefined;

    // Check existing DB match
    const existingDbRecord = item.fullName && item.birthday
      ? existingBeneDbMap.get(`${item.fullName}_${item.birthday}`)
      : undefined;

    const isExistingInDb = Boolean(existingDbRecord);
    const isExistingInProgram = Boolean(existingDbRecord?.programBeneficiaries?.length > 0);
    const existingBeneficiaryId = existingDbRecord?.id;
    const existingBeneficiaryNumber = existingDbRecord?.beneficiaryNumber;
    const existingDesignatedNumber = existingDbRecord?.programBeneficiaries?.[0]?.designatedNumber;

    if (isExistingInProgram) {
      existingInProgramCount++;
    } else if (isExistingInDb) {
      existingInDbCount++;
    } else {
      newBeneficiaryCount++;
    }

    if (!item.fullName) {
      status = "MISSING_REQUIRED_FIELD";
      validationError = "Beneficiary full name is missing";
      invalidCount++;
    } else if (!item.birthday) {
      status = "INVALID_BIRTHDAY";
      validationError = "Birthdate (Month, Day, Year) is required for verification PIN";
      invalidCount++;
    } else if (seenDesigInFile.has(item.designatedNumber)) {
      status = "DUPLICATE_DESIGNATED_NUMBER";
      validationError = `Designated Number '${item.designatedNumber}' is repeated within file`;
      invalidCount++;
    } else if (seenNameInFile.has(`${item.fullName}_${item.birthday}`)) {
      status = "DUPLICATE";
      validationError = "Duplicate beneficiary row in file";
      duplicateCount++;
    } else {
      // Check 365-Day / Appointive restriction from targeted map
      // Keep every matched active reason, including name-only/appointive matches.
      // The same entry may be indexed under both keys; show it only once.
      const restrictions = [...new Set([
        ...(restrictionMap.get(`${item.fullName}_${item.birthday}`) || []),
        ...(restrictionMap.get(item.fullName) || []),
      ])];
      if (restrictions.length > 0) {
        status = "RESTRICTED";
        validationError = restrictions.map((restriction) => `Restricted until ${restriction.end}: ${restriction.reason}`).join("; ");
        restrictionEnd = restrictions[0].end;
        restrictedCount++;
        parsedRows.push({
          ...item,
          isExistingInDb,
          isExistingInProgram,
          existingBeneficiaryId,
          existingBeneficiaryNumber,
          existingDesignatedNumber,
          status,
          validationError,
          restrictionEnd,
          restrictionReason: [...new Set(restrictions.map((restriction) => restriction.reason))].join("; "),
          restrictionDetails: restrictions,
        });
      } else {
        status = "VALID";
        validCount++;
        parsedRows.push({
          ...item,
          isExistingInDb,
          isExistingInProgram,
          existingBeneficiaryId,
          existingBeneficiaryNumber,
          existingDesignatedNumber,
          status,
          validationError,
          restrictionEnd,
        });
      }
    }

    seenDesigInFile.add(item.designatedNumber);
    if (item.fullName && item.birthday) {
      seenNameInFile.add(`${item.fullName}_${item.birthday}`);
    }

    if (item.barangay) {
      barangaySummary[item.barangay] = (barangaySummary[item.barangay] || 0) + 1;
    }
  }

  return {
    fileName,
    sourceSheetName: sheetName,
    totalRows: parsedRows.length,
    validCount,
    duplicateCount,
    restrictedCount,
    invalidCount,
    existingInDbCount,
    existingInProgramCount,
    newBeneficiaryCount,
    rows: parsedRows,
    barangaySummary,
  };
}
