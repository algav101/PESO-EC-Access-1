import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";

export interface ParsedBeneficiaryRow {
  rowNumber: number;
  designatedNumber: string;
  fullName: string;
  lastName?: string;
  firstName?: string;
  middleName?: string;
  extensionName?: string;
  birthday: string; // YYYY-MM-DD
  birthdayPin: string; // MM-DD-YYYY
  sex?: string;
  civilStatus?: string;
  age?: number;
  monthlyIncome?: number;
  typeOfBeneficiary?: string;
  occupation?: string;
  idType?: string;
  idNumber?: string;
  barangay: string;
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
  status: "VALID" | "DUPLICATE" | "RESTRICTED" | "MISSING_REQUIRED_FIELD" | "INVALID_BIRTHDAY" | "DUPLICATE_DESIGNATED_NUMBER";
  validationError?: string;
  restrictionEnd?: string;
}

export interface ImportPreviewResult {
  fileName: string;
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  restrictedCount: number;
  invalidCount: number;
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

const DINGALAN_BARANGAYS = [
  "Aplaya", "Butas na Bato", "Caragsacan", "Davildavilan",
  "Dikapanikian", "Ibona", "Matawe", "Paltic",
  "Poblacion", "Tanawan", "Umiray"
];

function normalizeBarangayName(input: string): string {
  if (!input) return "Dingalan";
  const cleaned = input.trim().toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ");
  for (const brgy of DINGALAN_BARANGAYS) {
    if (cleaned.includes(brgy.toLowerCase())) {
      return brgy;
    }
  }
  // Title case fallback
  return input
    .trim()
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

  if (rawRows.length === 0) {
    throw new Error("Uploaded spreadsheet is empty");
  }

  // 1. Detect multi-level header structure
  let headerRowIndex = 0;
  let subHeaderRowIndex = -1;

  for (let i = 0; i < Math.min(10, rawRows.length); i++) {
    const row = rawRows[i] || [];
    const rowStr = row.map((c: any) => String(c).toLowerCase()).join(" ");
    if (
      rowStr.includes("no.") ||
      rowStr.includes("formula full name") ||
      rowStr.includes("name of beneficiary") ||
      rowStr.includes("beneficiary name") ||
      rowStr.includes("full name") ||
      rowStr.includes("birthdate") ||
      rowStr.includes("birthday") ||
      rowStr.includes("address") ||
      rowStr.includes("barangay")
    ) {
      headerRowIndex = i;
      // Check if next row contains sub-headers like "first name", "montrh", "day", "brgy"
      if (i + 1 < rawRows.length) {
        const nextRowStr = rawRows[i + 1].map((c: any) => String(c).toLowerCase()).join(" ");
        if (
          nextRowStr.includes("first name") ||
          nextRowStr.includes("montrh") ||
          nextRowStr.includes("month") ||
          nextRowStr.includes("brgy") ||
          nextRowStr.includes("sitio")
        ) {
          subHeaderRowIndex = i + 1;
        }
      }
      break;
    }
  }

  // Build merged header map
  const topHeaders = (rawRows[headerRowIndex] || []).map((h: any) => String(h).trim());
  const subHeaders = subHeaderRowIndex !== -1 ? (rawRows[subHeaderRowIndex] || []).map((h: any) => String(h).trim()) : [];
  const mergedHeaders: string[] = [];

  const maxCols = Math.max(topHeaders.length, subHeaders.length, 35);
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
  const colDesig = findCol("no. |", "designated", "seq", "# |");
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
    if (top.includes("name of beneficiary") || top.includes("beneficiary") || c >= 3 && c <= 6) {
      if (sub.includes("first") && colBeneFirst === -1) colBeneFirst = c;
      if (sub.includes("middle") && colBeneMiddle === -1) colBeneMiddle = c;
      if (sub.includes("last") && colBeneLast === -1) colBeneLast = c;
      if (sub.includes("extension") && colBeneExt === -1) colBeneExt = c;
    }
  }

  // Birthdate sub-headers (Month, Day, Year)
  let colBdayMonth = -1;
  let colBdayDay = -1;
  let colBdayYear = -1;
  let colBdaySingle = -1;

  for (let c = 0; c < maxCols; c++) {
    const sub = (subHeaders[c] || "").toLowerCase();
    const top = (topHeaders[c] || "").toLowerCase();
    if (sub.includes("montrh") || sub.includes("month")) colBdayMonth = c;
    if (sub.includes("day") && colBdayDay === -1) colBdayDay = c;
    if (sub.includes("year") && colBdayYear === -1) colBdayYear = c;
    if ((top.includes("birthday") || top.includes("birthdate") || top.includes("dob")) && !sub) {
      colBdaySingle = c;
    }
  }

  // Address sub-headers (Sitio/Purok, Brgy, City/Municipality, Province)
  let colSitio = -1;
  let colBrgy = -1;
  let colCity = -1;
  let colProvince = -1;

  for (let c = 0; c < maxCols; c++) {
    const sub = (subHeaders[c] || "").toLowerCase();
    if (sub.includes("sitio") || sub.includes("purok")) colSitio = c;
    if (sub.includes("brgy") || sub.includes("barangay")) colBrgy = c;
    if (sub.includes("city") || sub.includes("municipality")) colCity = c;
    if (sub.includes("province")) colProvince = c;
  }

  // Demographics
  const colIdType = findCol("type of id");
  const colIdNo = findCol("id no");
  const colContact = findCol("contact no", "phone", "mobile");
  const colBeneType = findCol("type of beneficiary");
  const colOccupation = findCol("occupation");
  const colSex = findCol("sex |", "gender");
  const colCivilStatus = findCol("civil status");
  const colAge = findCol("age |", "edad");
  const colMonthlyIncome = findCol("monthly income", "income");

  // Dependent sub-headers
  let colDepFirst = -1;
  let colDepMiddle = -1;
  let colDepLast = -1;
  let colDepExt = -1;

  for (let c = 20; c < maxCols; c++) {
    const sub = (subHeaders[c] || "").toLowerCase();
    const top = (topHeaders[c] || "").toLowerCase();
    if (top.includes("dependent") || c >= 24 && c <= 27) {
      if (sub.includes("first") && colDepFirst === -1) colDepFirst = c;
      if (sub.includes("middle") && colDepMiddle === -1) colDepMiddle = c;
      if (sub.includes("last") && colDepLast === -1) colDepLast = c;
      if (sub.includes("extension") && colDepExt === -1) colDepExt = c;
    }
  }

  const colDepRelationship = findCol("relationship of dependent", "relationship");
  const colDepAge = findCol("age (18 above) of dependent", "age of dependent");
  const colSkills = findCol("skills training needed", "skills");
  const colPwd = findCol("pwd");
  const col4Ps = findCol("4p's", "4ps");
  const colIps = findCol("ip's", "ips");

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

    // 2. Full Name Resolution
    let fullName = "";
    let lastName = colBeneLast !== -1 && row[colBeneLast] ? String(row[colBeneLast]).trim().toUpperCase() : "";
    let firstName = colBeneFirst !== -1 && row[colBeneFirst] ? String(row[colBeneFirst]).trim().toUpperCase() : "";
    let middleName = colBeneMiddle !== -1 && row[colBeneMiddle] ? String(row[colBeneMiddle]).trim().toUpperCase() : "";
    let extensionName = colBeneExt !== -1 && row[colBeneExt] ? String(row[colBeneExt]).trim().toUpperCase() : "";

    const formulaFullName = colFormulaFullName !== -1 && row[colFormulaFullName] ? String(row[colFormulaFullName]).trim().toUpperCase() : "";

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

    if (fullName) candidateNames.add(fullName);
    if (lastName) candidateLastNames.add(lastName);

    // 3. Birthday Parsing (Split Columns: Month, Day, Year OR Single Column)
    let birthday = ""; // YYYY-MM-DD
    let birthdayPin = ""; // MM-DD-YYYY

    if (colBdayMonth !== -1 && colBdayDay !== -1 && colBdayYear !== -1 &&
        row[colBdayMonth] !== undefined && row[colBdayDay] !== undefined && row[colBdayYear] !== undefined &&
        String(row[colBdayMonth]).trim() !== "" && String(row[colBdayDay]).trim() !== "" && String(row[colBdayYear]).trim() !== "") {
      
      let mStr = String(row[colBdayMonth]).trim().toLowerCase();
      if (MONTH_NAME_MAP[mStr]) {
        mStr = MONTH_NAME_MAP[mStr];
      } else {
        const mNum = parseInt(mStr, 10);
        if (!isNaN(mNum)) mStr = mNum.toString().padStart(2, "0");
      }

      const dNum = parseInt(String(row[colBdayDay]).trim(), 10);
      const dStr = !isNaN(dNum) ? dNum.toString().padStart(2, "0") : "";

      let yNum = parseInt(String(row[colBdayYear]).trim(), 10);
      if (!isNaN(yNum) && yNum < 100) yNum += yNum > 30 ? 1900 : 2000;
      const yStr = !isNaN(yNum) ? yNum.toString() : "";

      if (mStr && dStr && yStr) {
        birthday = `${yStr}-${mStr}-${dStr}`;
        birthdayPin = `${mStr}-${dStr}-${yStr}`;
      }
    } else if (colBdaySingle !== -1 && row[colBdaySingle] !== undefined && String(row[colBdaySingle]).trim() !== "") {
      const val = row[colBdaySingle];
      if (val instanceof Date && !isNaN(val.getTime())) {
        birthday = val.toISOString().split("T")[0];
        const [y, m, d] = birthday.split("-");
        birthdayPin = `${m}-${d}-${y}`;
      } else if (typeof val === "number") {
        const parsedDate = new Date(Math.round((val - 25569) * 86400 * 1000));
        if (!isNaN(parsedDate.getTime())) {
          birthday = parsedDate.toISOString().split("T")[0];
          const [y, m, d] = birthday.split("-");
          birthdayPin = `${m}-${d}-${y}`;
        }
      } else {
        const strVal = String(val).trim();
        if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(strVal)) {
          const parts = strVal.split("-");
          const y = parts[0];
          const m = parts[1].padStart(2, "0");
          const d = parts[2].padStart(2, "0");
          birthday = `${y}-${m}-${d}`;
          birthdayPin = `${m}-${d}-${y}`;
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(strVal)) {
          const parts = strVal.split("/");
          const m = parts[0].padStart(2, "0");
          const d = parts[1].padStart(2, "0");
          const y = parts[2];
          birthday = `${y}-${m}-${d}`;
          birthdayPin = `${m}-${d}-${y}`;
        } else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(strVal)) {
          const parts = strVal.split("-");
          const m = parts[0].padStart(2, "0");
          const d = parts[1].padStart(2, "0");
          const y = parts[2];
          birthday = `${y}-${m}-${d}`;
          birthdayPin = `${m}-${d}-${y}`;
        } else {
          const dateObj = new Date(strVal);
          if (!isNaN(dateObj.getTime())) {
            birthday = dateObj.toISOString().split("T")[0];
            const [y, m, d] = birthday.split("-");
            birthdayPin = `${m}-${d}-${y}`;
          }
        }
      }
    }

    // 4. Address & Demographics
    const rawBrgy = colBrgy !== -1 && row[colBrgy] ? String(row[colBrgy]).trim() : "Dingalan";
    const barangay = normalizeBarangayName(rawBrgy);
    const sitio = colSitio !== -1 && row[colSitio] ? String(row[colSitio]).trim() : "";
    const contact = colContact !== -1 && row[colContact] ? String(row[colContact]).trim() : "";

    const rawSex = colSex !== -1 && row[colSex] ? String(row[colSex]).trim().toUpperCase() : "";
    const sex = rawSex.startsWith("M") ? "MALE" : rawSex.startsWith("F") ? "FEMALE" : rawSex;

    const rawCivil = colCivilStatus !== -1 && row[colCivilStatus] ? String(row[colCivilStatus]).trim().toUpperCase() : "";
    const civilStatus = rawCivil === "M" ? "MARRIED" : rawCivil === "S" ? "SINGLE" : rawCivil === "W" ? "WIDOWED" : rawCivil;

    const age = colAge !== -1 && row[colAge] ? parseInt(String(row[colAge]).trim(), 10) || undefined : undefined;
    const monthlyIncome = colMonthlyIncome !== -1 && row[colMonthlyIncome] ? parseFloat(String(row[colMonthlyIncome]).replace(/[^0-9.]/g, "")) || undefined : undefined;

    const idType = colIdType !== -1 && row[colIdType] ? String(row[colIdType]).trim() : undefined;
    let idNumber = colIdNo !== -1 && row[colIdNo] ? String(row[colIdNo]).trim() : undefined;
    if (idNumber && idNumber.endsWith(".0")) idNumber = idNumber.slice(0, -2);

    const typeOfBeneficiary = colBeneType !== -1 && row[colBeneType] ? String(row[colBeneType]).trim() : undefined;
    const occupation = colOccupation !== -1 && row[colOccupation] ? String(row[colOccupation]).trim() : undefined;
    const skillsTraining = colSkills !== -1 && row[colSkills] ? String(row[colSkills]).trim() : undefined;

    const rawPwd = colPwd !== -1 && row[colPwd] ? String(row[colPwd]).trim().toUpperCase() : "";
    const isPwd = rawPwd.startsWith("Y") || rawPwd === "YES" || (rawPwd.length > 0 && rawPwd !== "N" && rawPwd !== "NO");

    const raw4Ps = col4Ps !== -1 && row[col4Ps] ? String(row[col4Ps]).trim().toUpperCase() : "";
    const is4Ps = raw4Ps.startsWith("Y") || raw4Ps === "YES";

    const rawIps = colIps !== -1 && row[colIps] ? String(row[colIps]).trim().toUpperCase() : "";
    const isIp = rawIps.startsWith("Y") || rawIps === "YES";

    const isSenior = (age && age >= 60) || (typeOfBeneficiary && typeOfBeneficiary.toLowerCase().includes("senior"));

    // Dependent fields
    const depFirst = colDepFirst !== -1 && row[colDepFirst] ? String(row[colDepFirst]).trim().toUpperCase() : undefined;
    const depMiddle = colDepMiddle !== -1 && row[colDepMiddle] ? String(row[colDepMiddle]).trim().toUpperCase() : undefined;
    const depLast = colDepLast !== -1 && row[colDepLast] ? String(row[colDepLast]).trim().toUpperCase() : undefined;
    const depExt = colDepExt !== -1 && row[colDepExt] ? String(row[colDepExt]).trim().toUpperCase() : undefined;
    let dependentFullName: string | undefined;
    if (depFirst || depLast) {
      dependentFullName = [depFirst, depMiddle, depLast, depExt].filter(Boolean).join(" ");
    }
    const dependentRelationship = colDepRelationship !== -1 && row[colDepRelationship] ? String(row[colDepRelationship]).trim().toUpperCase() : undefined;
    const dependentAge = colDepAge !== -1 && row[colDepAge] ? parseInt(String(row[colDepAge]).trim(), 10) || undefined : undefined;

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
      municipality: "Dingalan",
      province: "Aurora",
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
    });
  }

  // Step 2: Perform fast targeted DB queries only for candidate names in this file
  const todayStr = new Date().toISOString().split("T")[0];
  const restrictionMap = new Map<string, { end: string; reason: string }>();

  if (candidateNames.size > 0) {
    const activeRestrictions = await prisma.beneficiaryRestriction.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { beneficiary: { fullName: { in: Array.from(candidateNames) } } },
          { beneficiary: { lastName: { in: Array.from(candidateLastNames) } } },
        ],
      },
      select: {
        restrictionEnd: true,
        reason: true,
        beneficiary: {
          select: {
            fullName: true,
            birthday: true,
          },
        },
      },
    });

    for (const r of activeRestrictions) {
      if (r.beneficiary?.fullName) {
        if (!r.restrictionEnd || r.restrictionEnd >= todayStr) {
          const key = `${r.beneficiary.fullName.trim().toUpperCase()}_${r.beneficiary.birthday}`;
          restrictionMap.set(key, { end: r.restrictionEnd || "Active Restriction", reason: r.reason || "365-day payout restriction" });
        }
      }
    }
  }

  // Fetch existing program beneficiaries
  const existingProgramBeneficiaries = await prisma.programBeneficiary.findMany({
    where: { programId: targetProgramId },
    select: { designatedNumber: true },
  });
  const existingDesigSet = new Set(existingProgramBeneficiaries.map((b) => String(b.designatedNumber)));

  // Step 3: Classify and validate parsed items
  const parsedRows: ParsedBeneficiaryRow[] = [];
  const seenDesigInFile = new Set<string>();
  const seenNameInFile = new Set<string>();
  const barangaySummary: Record<string, number> = {};

  let validCount = 0;
  let duplicateCount = 0;
  let restrictedCount = 0;
  let invalidCount = 0;

  for (const item of rawParsedItems) {
    let status: ParsedBeneficiaryRow["status"] = "VALID";
    let validationError: string | undefined;
    let restrictionEnd: string | undefined;

    if (!item.fullName) {
      status = "MISSING_REQUIRED_FIELD";
      validationError = "Beneficiary full name is missing";
      invalidCount++;
    } else if (!item.birthday) {
      status = "INVALID_BIRTHDAY";
      validationError = "Birthdate (Month, Day, Year) is required for verification PIN";
      invalidCount++;
    } else if (seenDesigInFile.has(item.designatedNumber) || existingDesigSet.has(item.designatedNumber)) {
      status = "DUPLICATE_DESIGNATED_NUMBER";
      validationError = `Designated Number '${item.designatedNumber}' already exists in batch`;
      invalidCount++;
    } else if (seenNameInFile.has(`${item.fullName}_${item.birthday}`)) {
      status = "DUPLICATE";
      validationError = "Duplicate beneficiary row in file";
      duplicateCount++;
    } else {
      // Check 365-Day restriction from targeted map
      const restriction = restrictionMap.get(`${item.fullName}_${item.birthday}`);
      if (restriction) {
        status = "RESTRICTED";
        validationError = `Restricted until ${restriction.end}: ${restriction.reason}`;
        restrictionEnd = restriction.end;
        restrictedCount++;
      } else {
        status = "VALID";
        validCount++;
      }
    }

    seenDesigInFile.add(item.designatedNumber);
    if (item.fullName && item.birthday) {
      seenNameInFile.add(`${item.fullName}_${item.birthday}`);
    }

    if (item.barangay) {
      barangaySummary[item.barangay] = (barangaySummary[item.barangay] || 0) + 1;
    }

    parsedRows.push({
      ...item,
      status,
      validationError,
      restrictionEnd,
    });
  }

  return {
    fileName,
    totalRows: parsedRows.length,
    validCount,
    duplicateCount,
    restrictedCount,
    invalidCount,
    rows: parsedRows,
    barangaySummary,
  };
}
