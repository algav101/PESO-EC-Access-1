import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MONTH_NAME_MAP = {
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

function normalizeBarangayName(input) {
  if (!input) return "Dingalan";
  const cleaned = input.trim().toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ");
  for (const brgy of DINGALAN_BARANGAYS) {
    if (cleaned.includes(brgy.toLowerCase())) {
      return brgy;
    }
  }
  return input.trim().toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

async function parseBeneficiaryExcelBuffer(buffer, fileName, targetProgramId) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

  let headerRowIndex = 0;
  let subHeaderRowIndex = -1;

  for (let i = 0; i < Math.min(10, rawRows.length); i++) {
    const row = rawRows[i] || [];
    const rowStr = row.map((c) => String(c).toLowerCase()).join(" ");
    if (
      rowStr.includes("no.") ||
      rowStr.includes("formula full name") ||
      rowStr.includes("name of beneficiary") ||
      rowStr.includes("birthdate") ||
      rowStr.includes("address (beneficiary)")
    ) {
      headerRowIndex = i;
      if (i + 1 < rawRows.length) {
        const nextRowStr = rawRows[i + 1].map((c) => String(c).toLowerCase()).join(" ");
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

  const topHeaders = (rawRows[headerRowIndex] || []).map((h) => String(h).trim());
  const subHeaders = subHeaderRowIndex !== -1 ? (rawRows[subHeaderRowIndex] || []).map((h) => String(h).trim()) : [];
  const mergedHeaders = [];

  const maxCols = Math.max(topHeaders.length, subHeaders.length, 35);
  for (let c = 0; c < maxCols; c++) {
    const top = topHeaders[c] || "";
    const sub = subHeaders[c] || "";
    mergedHeaders.push(`${top} | ${sub}`.trim().toLowerCase());
  }

  const findCol = (...keywords) => {
    return mergedHeaders.findIndex((mh) => keywords.some((k) => mh.includes(k.toLowerCase())));
  };

  const colDesig = findCol("no. |", "designated", "seq", "# |");
  const colFormulaFullName = findCol("formula full name", "full name |");

  let colBeneFirst = -1, colBeneMiddle = -1, colBeneLast = -1, colBeneExt = -1;
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

  let colBdayMonth = -1, colBdayDay = -1, colBdayYear = -1, colBdaySingle = -1;
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

  let colSitio = -1, colBrgy = -1;
  for (let c = 0; c < maxCols; c++) {
    const sub = (subHeaders[c] || "").toLowerCase();
    if (sub.includes("sitio") || sub.includes("purok")) colSitio = c;
    if (sub.includes("brgy") || sub.includes("barangay")) colBrgy = c;
  }

  const colIdType = findCol("type of id");
  const colIdNo = findCol("id no");
  const colContact = findCol("contact no", "phone", "mobile");
  const colBeneType = findCol("type of beneficiary");
  const colOccupation = findCol("occupation");
  const colSex = findCol("sex |", "gender");
  const colCivilStatus = findCol("civil status");
  const colAge = findCol("age |", "edad");
  const colMonthlyIncome = findCol("monthly income", "income");

  let colDepFirst = -1, colDepMiddle = -1, colDepLast = -1, colDepExt = -1;
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

  const colDepRelationship = findCol("relationship of dependent", "relationship");
  const colDepAge = findCol("age (18 above) of dependent", "age of dependent");

  const parsedRows = [];
  const seenDesigInFile = new Set();
  const seenNameInFile = new Set();
  const barangaySummary = {};
  let validCount = 0, duplicateCount = 0, restrictedCount = 0, invalidCount = 0;

  const startDataRow = subHeaderRowIndex !== -1 ? subHeaderRowIndex + 1 : headerRowIndex + 1;

  for (let r = startDataRow; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0 || row.every((c) => String(c).trim() === "")) continue;

    let designated = colDesig !== -1 && row[colDesig] !== undefined && String(row[colDesig]).trim() !== ""
      ? String(row[colDesig]).trim()
      : String(r - startDataRow + 1);
    if (designated.endsWith(".0")) designated = designated.slice(0, -2);

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

    let birthday = "";
    let birthdayPin = "";

    if (
      colBdayMonth !== -1 && colBdayDay !== -1 && colBdayYear !== -1 &&
      row[colBdayMonth] !== undefined && row[colBdayDay] !== undefined && row[colBdayYear] !== undefined &&
      String(row[colBdayMonth]).trim() !== "" && String(row[colBdayDay]).trim() !== "" && String(row[colBdayYear]).trim() !== ""
    ) {
      let mStr = String(row[colBdayMonth]).trim().toLowerCase();
      if (MONTH_NAME_MAP[mStr]) mStr = MONTH_NAME_MAP[mStr];
      else {
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
    }

    const rawBrgy = colBrgy !== -1 && row[colBrgy] ? String(row[colBrgy]).trim() : "Dingalan";
    const barangay = normalizeBarangayName(rawBrgy);
    const sitio = colSitio !== -1 && row[colSitio] ? String(row[colSitio]).trim() : "";
    const contact = colContact !== -1 && row[colContact] ? String(row[colContact]).trim() : "";

    const idType = colIdType !== -1 && row[colIdType] ? String(row[colIdType]).trim() : undefined;
    let idNumber = colIdNo !== -1 && row[colIdNo] ? String(row[colIdNo]).trim() : undefined;
    if (idNumber && idNumber.endsWith(".0")) idNumber = idNumber.slice(0, -2);

    let status = "VALID";
    let validationError = undefined;

    if (!fullName) {
      status = "MISSING_REQUIRED_FIELD";
      validationError = "Beneficiary full name is missing";
      invalidCount++;
    } else if (!birthday) {
      status = "INVALID_BIRTHDAY";
      validationError = "Birthdate (Month, Day, Year) is required for verification PIN";
      invalidCount++;
    } else if (seenDesigInFile.has(designated)) {
      status = "DUPLICATE_DESIGNATED_NUMBER";
      validationError = `Designated Number '${designated}' already exists in batch`;
      invalidCount++;
    } else if (seenNameInFile.has(`${fullName}_${birthday}`)) {
      status = "DUPLICATE";
      validationError = "Duplicate beneficiary row in file";
      duplicateCount++;
    } else {
      status = "VALID";
      validCount++;
    }

    seenDesigInFile.add(designated);
    if (fullName && birthday) seenNameInFile.add(`${fullName}_${birthday}`);
    if (barangay) barangaySummary[barangay] = (barangaySummary[barangay] || 0) + 1;

    parsedRows.push({
      rowNumber: r + 1,
      designatedNumber: designated,
      fullName,
      lastName,
      firstName,
      middleName,
      birthday,
      birthdayPin,
      barangay,
      sitio,
      idType,
      idNumber,
      contactNumber: contact,
      status,
      validationError,
    });
  }

  return {
    totalRows: parsedRows.length,
    validCount,
    duplicateCount,
    restrictedCount,
    invalidCount,
    rows: parsedRows,
    barangaySummary,
  };
}

async function run() {
  console.log("==================================================================");
  console.log("TESTING OFFICIAL DOLE / LGU DINGALAN BENEFICIARY TEMPLATE PARSER");
  console.log("==================================================================");

  const csvContent = `No.,FORMULA FULL NAME,"FORMULA LAST NAME, FIRST NAME",Name of Beneficiary,,,,Birthdate,,,Address (Beneficiary),,,,,Type of ID,ID No.,Contact No.,Type of Beneficiary,Occupation,Sex,Civil Status,Age,Average monthly income,Dependent,,,,RELATIONSHIP OF DEPENDENT,AGE (18 ABOVE) OF DEPENDENT,Interested in wage employment or self-employment?,Skills Training Needed,"PWD\n(Please Indicate)","4P's\n(Y/N)","IP's\n(Y/N)"
,,,First Name,Middle Name,Last Name,Extension Name,Montrh,Day,Year,Sitio/Purok,Brgy.,City/Municipality,Province,District,,,,,,,,,,First Name, Middle Name,Last Name,Extension Name,,,"(Yes/No, if Yes, please specify)",,,,
1,"ASTORGA, JONEL TALENTO","ASTORGA, JONEL",JONEL,TALENTO,ASTORGA,,11,8,2000,LAPU LAPU,APLAYA,DINGALAN,AURORA,LONE,NATIONAL ID,77050009BK0800JTA10000,639979925136,UNDEREMPLOYED,,F,M,25,3000,KAILA,NICOL,PRONTO,,WIFE,31,YES,NONE,,N,N
2,"ATENTAR, OFELIA SARMIENTO","ATENTAR, OFELIA",OFELIA,SARMIENTO,ATENTAR,,11,6,1959,PUROK TANIGUE,APLAYA,DINGALAN,AURORA,LONE,NATIONAL ID,6348-5468-2693-6042,639977003203,UNDEREMPLOYED,,F,M,66,3000,NICOLE,SARMIENTO,ATENTAR,,DAUGHTER,26,YES,NONE,,N,N
3,"AVELLANO, LUIGENE BALDERAMA","AVELLANO, LUIGENE",LUIGENE,BALDERAMA,AVELLANO,,1,18,2006,LAPU LAPU,APLAYA,DINGALAN,AURORA,LONE,NATIONAL ID,3208370389764217,639637920972,UNDEREMPLOYED,,M,S,20,3000,ANNA CHERRIE,BALDERAMA,AVELLANO,,WIFE,48,YES,NONE,,N,N
4,"BONEO, JOCELYN BAUTISTA","BONEO, JOCELYN",JOCELYN,BAUTISTA,BONEO,,6,14,1978,LAPU LAPU,APLAYA,DINGALAN,AURORA,LONE,VOTER'S CETIFICATE,77050010BF1478JBB20000,639125458926,UNDEREMPLOYED,,F,M,48,3000,RODEL,ARCILLA,BONEO,,WIFE,43,YES,NONE,,N,N
37,"ADION, MARIA CONCEPCION SACARE","ADION, MARIA CONCEPCION",MARIA CONCEPCION,SACARE,ADION,,6,4,1999,PUROK 1,BUTAS NA BATO,DINGALAN,AURORA,LONE,NATIONAL ID,9.17432E+11,639550226552,UNDEREMPLOYED,,F,S,27,3000,EDMARK,TAYAO,NANTES,,LIVE IN PARTNERS,42,YES,NONE,,N,N
69,"ACOSTA, HIYASMIN PINERA","ACOSTA, HIYASMIN",HIYASMIN,PINERA,ACOSTA,,7,28,1989,PUROK 5 EVNAI,CARAGSACAN,DINGALAN,AURORA,LONE,NATIONAL ID,4852-9738-2190-5407,639682332415,UNDEREMPLOYED,,F,S,37,3000,JAVIN,CRUZ,MORAL,,LIVE IN PARTNERS,37,YES,,,N,N
410,"ADONIS, LYKA RITUAL","ADONIS, LYKA",LYKA,RITUAL,ADONIS,,6,20,2005,SO DUGYAN,UMIRAY,DINGALAN,AURORA,LONE,NATIONAL ID,2156438275205134,639917636253,UNDEREMPLOYED,,F,S,21,3000,DALIA,RITUAL,ADONIS,,MOTHER,43,YES,NONE,,N,N`;

  const wb = XLSX.read(csvContent, { type: "string" });
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const result = await parseBeneficiaryExcelBuffer(buf, "test_dole_template.xlsx", "prog_id");

  console.log(`\nParsed ${result.totalRows} rows:`);
  console.log(`  Valid Count: ${result.validCount} / ${result.totalRows}`);
  console.log(`  Invalid Count: ${result.invalidCount}`);
  console.log(`  Barangays:`, result.barangaySummary);

  for (const r of result.rows) {
    console.log(`  Row ${r.rowNumber} -> #${r.designatedNumber} ${r.fullName} | Born: ${r.birthday} (PIN: ${r.birthdayPin}) | Brgy: ${r.barangay} (${r.sitio}) | ID: ${r.idType} ${r.idNumber} | Status: ${r.status}`);
  }

  if (result.validCount === 7 && result.invalidCount === 0) {
    console.log("\n==================================================================");
    console.log(">>> SUCCESS: 100% OF DOLE TEMPLATE BENEFICIARIES PARSED FLAWLESSLY! <<<");
    console.log("==================================================================");
  }
}

run();
