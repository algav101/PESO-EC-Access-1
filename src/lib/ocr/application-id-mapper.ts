import { ID_TYPES, calculateAge, type ApplicationFormValues } from "../application-schema.ts";
import { readIdentityAddress, splitIdentityAddress } from "./identity-address.ts";
import { getIdentityProfile } from "./identity-profiles.ts";
import { extractProfileNumber, identityNumberRows, normalizeNumberText } from "./id-number-reader.ts";
import type { AzureDocumentField, AzureDocumentResult } from "./azure-document-intelligence.ts";

export type OcrSubject = "APPLICANT" | "DEPENDENT";
export type OcrAutofillStatus = "Autofill Complete" | "Needs Review" | "Unable to Read ID";

export interface OcrConflict {
  field: keyof ApplicationFormValues;
  frontValue: string;
  backValue: string;
}

export interface MappedOcrSide {
  fields: Partial<ApplicationFormValues>;
  uncertainFields: Array<keyof ApplicationFormValues>;
}

export interface MergedOcrResult extends MappedOcrSide {
  status: OcrAutofillStatus;
  conflicts: OcrConflict[];
}

export interface OcrTextLine {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  confidence?: number;
}

export function ocrFieldsForSubject(subject: OcrSubject): Array<keyof ApplicationFormValues> {
  return subject === "APPLICANT"
    ? ["givenName", "middleName", "lastName", "extensionName", "birthDate", "applicantAge", "sex", "idNumber", "idType", "civilStatus", "streetSitio", "barangay"]
    : ["dependentGivenName", "dependentMiddleName", "dependentLastName", "dependentExtensionName", "dependentBirthDate", "dependentAge"];
}

export function applyOcrAutofill(
  current: ApplicationFormValues,
  extracted: Partial<ApplicationFormValues>,
  manuallyEdited: ReadonlySet<keyof ApplicationFormValues>,
  subject?: OcrSubject
): ApplicationFormValues {
  const next: ApplicationFormValues = { ...current, fieldSources: { ...current.fieldSources } };
  if (subject) for (const key of ocrFieldsForSubject(subject)) {
    if (manuallyEdited.has(key) || !["OCR", "CALCULATION"].includes(current.fieldSources[key])) continue;
    (next as unknown as Record<string, unknown>)[key] = key === "applicantAge" || key === "dependentAge" ? null : "";
    delete next.fieldSources[key];
  }
  for (const [rawKey, value] of Object.entries(extracted)) {
    const key = rawKey as keyof ApplicationFormValues;
    if (manuallyEdited.has(key)) continue;
    (next as unknown as Record<string, unknown>)[key] = value;
    next.fieldSources[key] = key === "applicantAge" || key === "dependentAge" ? "CALCULATION" : "OCR";
  }
  if (!manuallyEdited.has("applicantAge") && (subject === "APPLICANT" || extracted.birthDate || extracted.applicantAge !== undefined)) {
    next.applicantAge = calculateAge(next.birthDate);
    if (next.applicantAge !== null) next.fieldSources.applicantAge = "CALCULATION";
  }
  if (!manuallyEdited.has("dependentAge") && (subject === "DEPENDENT" || extracted.dependentBirthDate || extracted.dependentAge !== undefined)) {
    next.dependentAge = calculateAge(next.dependentBirthDate);
    if (next.dependentAge !== null) next.fieldSources.dependentAge = "CALCULATION";
  }
  return next;
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function fieldValue(field?: AzureDocumentField): string {
  if (!field) return "";
  return clean(field.valueString || field.valueDate || field.valueCountryRegion || field.content);
}

function normalizeComparable(value: unknown): string {
  return (typeof value === "number" ? String(value) : clean(value)).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function parseExplicitDate(value: string): string {
  const normalizeDigits = (part: string) => part.toUpperCase()
    .replace(/[OQ]/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/S/g, "5")
    .replace(/B/g, "8");
  const normalized = value.trim();
  const numericText = normalized.replace(/(?<=\d)[OQILSB]|[OQILSB](?=\d)/gi, (character) => normalizeDigits(character));
  const numericMatch = numericText.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/);
  const isoMatch = numericText.match(/\b(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})\b/);
  let month = "";
  let day = "";
  let year = "";

  if (isoMatch) {
    [, year, month, day] = isoMatch;
  } else if (numericMatch) {
    [, month, day, year] = numericMatch;
    if (Number(month) > 12 && Number(day) <= 12) [month, day] = [day, month];
  } else {
    const monthPattern = "JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUN(?:E)?|JUL(?:Y)?|AUG(?:UST)?|SEP(?:TEMBER)?|OCT(?:OBER)?|NOV(?:EMBER)?|DEC(?:EMBER)?";
    const monthFirst = normalized.match(new RegExp(`\\b(${monthPattern})[ .-]*([0-9OQILSB]{1,2})(?:ST|ND|RD|TH)?[, .-]*([0-9OQILSB]{4})\\b`, "i"));
    const dayFirst = normalized.match(new RegExp(`\\b([0-9OQILSB]{1,2})(?:ST|ND|RD|TH)?[ ,.-]*(${monthPattern})[, .-]*([0-9OQILSB]{4})\\b`, "i"));
    const monthMatch = monthFirst || dayFirst;
    if (!monthMatch) return "";
    const monthToken = monthFirst ? monthMatch[1] : monthMatch[2];
    const monthNumber = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
      .indexOf(monthToken.slice(0, 3).toUpperCase()) + 1;
    month = String(monthNumber);
    day = normalizeDigits(monthFirst ? monthMatch[2] : monthMatch[1]);
    year = normalizeDigits(monthMatch[3]);
  }

  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear() !== Number(year) || parsed.getUTCMonth() + 1 !== Number(month) || parsed.getUTCDate() !== Number(day)
    ? ""
    : iso;
}

function matchIdType(documentType: string, rawText: string): string {
  const haystack = `${documentType} ${rawText}`.toUpperCase();
  const strictMatches: Array<[RegExp, (typeof ID_TYPES)[number]]> = [
    [/PHILSYS|NATIONAL\s+ID|PAMBANSANG\s+PAGKAKAKILANLAN|PHILIPPINE\s+IDENTIFICATION/, "NATIONAL ID"],
    [/DRIVER.?S?\s+LICEN[CS]E/, "DRIVER LICENSE ID"],
    [/\bUMID\b|UNIFIED MULTI.PURPOSE/, "UMID"],
    [/\bSSS\b|SOCIAL SECURITY SYSTEM/, "SSS ID"],
    [/\bTIN\b|TAX IDENTIFICATION/, "TIN ID"],
    [/PHILHEALTH/, "PHILHEALTH ID"],
    [/SENIOR CITIZEN/, "SENIOR CITIZEN ID"],
    [/PASSPORT/, "PASSPORT"],
    [/POLICE CLEARANCE/, "POLICE CLEARANCE"],
    [/\bNBI\b/, "NBI CLEARANCE"],
    [/PAG.?IBIG|HDMF/, "PAGIBIG ID"],
    [/SOLO PARENT/, "SOLO PARENT ID"],
    [/PERSON WITH DISABILITY|\bPWD\b/, "PWD ID"],
    [/POSTAL/, "POSTAL ID"],
    [/PROFESSIONAL REGULATION COMMISSION|\bPRC\b/, "PRC"],
    [/VOTER.?S?\s+CERT/, "VOTER'S CETIFICATE"],
    [/VOTER.?S?\s+ID/, "VOTER'S ID"],
  ];
  return strictMatches.find(([pattern]) => pattern.test(haystack))?.[1] || "";
}

export function detectIdentityDocumentType(rawText: string, documentType = ""): string {
  return matchIdType(documentType, rawText);
}

const LOCAL_ID_LABEL = /(?:APELYIDO|LAST\s*NAME|SURNAME|MGA\s+PANGALAN|G[I1L]VEN\s*NAMES?|FIRST\s*NAME|GITNANG\s+APELYIDO|M[I1L]DDLE\s*NAME|DATE\s+OF\s+BIRTH|BIRTH\s*DATE|BIRTH\s*PLACE|\bDOB\b|PETSA\s+NG\s+KAPANGANAKAN|\bSEX\b|KASARIAN|CIVIL\s+STATUS|MARITAL\s+STATUS|ADDRESS|TIRAHAN|\bPCN\b|\bPSN\b|ID\s+(?:NUMBER|NO\b)|DOCUMENT\s+NUMBER|CARD\s+NUMBER|LICEN[CS]E\s+(?:NUMBER|NO\b)|\bCRN\b)/i;

export const NON_BIRTH_DATE_LABEL = /\b(?:DATE\s*(?:OF\s*)?(?:REGISTR[A-Z0-9]*|ISSUE[D]?|EXPIR[A-Z0-9]*)|DA[T7L]E\s*(?:OF\s*)?R[EA]G[I1LE]STR[A-Z0-9]*|REGISTR[A-Z0-9]*\s*DATE|ISSUED\s*AND\s*SIGNED|VALID\s*UNTIL|VOTING\s*RECORD)\b/i;
export const ORDERED_NAME_LABEL = /\bLAST\s*NAME\s*[,.;:]\s*(?:F[I1L]R[SA]T|GIVEN)\s*NAMES?\s*[,.;:]\s*M[I1L]DDLE\s*NAME\b/i;

export function isIdentityLabel(value: string): boolean {
  if (/\b(?:NATIONALITY|CITIZENSHIP|WEIGHT|HEIGHT|BLOOD\s*TYPE|EYES?\s*COL[O0]R|AGENCY\s*CODE|DL\s*CODES?|CONDITIONS)\b/i.test(value)) return true;
  // A bilingual heading may lose its first English letter ("| ast Name").
  // It is still a heading, never the person's name after "Apelyido /".
  if (/\bNAMES?\b/i.test(value)) return true;
  if (NON_BIRTH_DATE_LABEL.test(value)) return true;
  if (/\b(?:DATE\s*OF\s*BIRTH|BIRTH\s*DATE)\b/i.test(value)) return true;
  return LOCAL_ID_LABEL.test(value) || /\b(?:DATE\s*(?:OF\s*)?(?:REGISTRATION|ISSUE|ISSUED|EXPIRY|EXPIRATION)|REGISTRATION\s*DATE|PLACE\s*OF\s*BIRTH|LUGAR\s*NG\s*KAPANGANAKAN|VOTING\s*RECORD|CURRENT|PREVIOUS|SECTOR|REGISTRATION\s*TYPE|VALID\s*UNTIL|ISSUED\s*AND\s*SIGNED|CERTIFIED\s*CORRECT|CIVIL\s*STATUS|MARITAL\s*STATUS|RESIDENCE|PRECINCT|PROVINCE|MUNICIPALITY|BARANGAY)\b|^(?:NAME|PANGALAN)\b/i.test(value);
}

function cleanLocalValue(value: string): string {
  return value
    .replace(/^[\s:/#|\-]+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanPersonName(value: string): string {
  if (/\d/.test(value)) return "";
  const name = cleanLocalValue(value)
    .split(/\s+(?:DATE\s+OF\s+BIRTH|PETSA\s+NG\s+KAPANGANAKAN|SEX|KASARIAN|ADDRESS|TIRAHAN)\b/i)[0]
    .replace(/[^\p{L}\s'.-]/gu, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .toUpperCase();
  if (!name || isIdentityLabel(name)) return "";
  if (/\b(?:ADDRESS|TIRAHAN|PUROK|SITIO|BARANGAY|BRGY|STREET|ROAD|DINGALAN|AURORA|PHILIPPINES?)\b/i.test(name)) return "";
  if (name.split(/\s+/).length > 6) return "";
  return name;
}

function labeledValue(rawText: string, patterns: RegExp[]): string {
  const lines = rawText.split(/\r?\n/).map(cleanLocalValue).filter(Boolean);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (!match || match.index === undefined) continue;
      const sameLine = cleanLocalValue(line.slice(match.index + match[0].length));
      if (sameLine && !isIdentityLabel(sameLine)) return sameLine;
      for (let nextIndex = index + 1; nextIndex < Math.min(lines.length, index + 3); nextIndex += 1) {
        const nextLine = cleanLocalValue(lines[nextIndex]);
        if (!nextLine) continue;
        if (isIdentityLabel(nextLine)) break;
        return nextLine;
      }
    }
  }
  return "";
}

function layoutLabeledValue(lines: OcrTextLine[], patterns: RegExp[], allowRightValue = false): string {
  const usableLines = lines
    .map((line) => ({ ...line, text: cleanLocalValue(line.text) }))
    .filter((line) => line.text);

  for (const labelLine of usableLines) {
    for (const pattern of patterns) {
      const match = labelLine.text.match(pattern);
      if (!match || match.index === undefined) continue;
      const sameLine = cleanLocalValue(labelLine.text.slice(match.index + match[0].length));
      if (sameLine && !isIdentityLabel(sameLine)) return sameLine;

      // Certificates often place a value to the right on the same baseline,
      // not below the label. Stop before another field in the same table row.
      const sameRow = (line: OcrTextLine) => Math.abs(line.top + line.height / 2 - labelLine.top - labelLine.height / 2) <= Math.min(line.height, labelLine.height) * .7;
      const rightEdge = labelLine.left + labelLine.width;
      const nextRightLabel = usableLines.filter((line) => line !== labelLine && line.left >= rightEdge && sameRow(line) && isIdentityLabel(line.text)).sort((a, b) => a.left - b.left)[0];
      const rightValue = usableLines.filter((line) => line !== labelLine && !isIdentityLabel(line.text) && sameRow(line)
        && line.left >= rightEdge - labelLine.height * .2
        && line.left - rightEdge <= Math.max(100, labelLine.width * 2, labelLine.height * 18)
        && (!nextRightLabel || line.left + line.width <= nextRightLabel.left))
        .sort((a, b) => a.left - b.left)[0];
      if (allowRightValue && rightValue) return rightValue.text;

      const maxVerticalGap = Math.max(45, labelLine.height * 5);
      const nextLabel = usableLines.filter((line) =>
        line.top > labelLine.top + labelLine.height && isIdentityLabel(line.text) &&
        !patterns.some((candidatePattern) => candidatePattern.test(line.text)) &&
        Math.abs(line.left - labelLine.left) <= Math.max(70, labelLine.width * 0.65)
      ).sort((a, b) => a.top - b.top)[0];
      const candidate = usableLines
        .filter((line) => {
          if (line === labelLine || isIdentityLabel(line.text)) return false;
          if (nextLabel && line.top >= nextLabel.top) return false;
          const verticalGap = line.top - (labelLine.top + labelLine.height);
          if (verticalGap < -Math.max(3, labelLine.height * 0.25) || verticalGap > maxVerticalGap) return false;
          const horizontalOverlap = Math.min(line.left + line.width, labelLine.left + labelLine.width) - Math.max(line.left, labelLine.left);
          const nearSameColumn = Math.abs(line.left - labelLine.left) <= Math.max(70, labelLine.width * 0.65);
          return horizontalOverlap > 0 || nearSameColumn;
        })
        .sort((left, right) => {
          const leftScore = Math.max(0, left.top - labelLine.top) + Math.abs(left.left - labelLine.left) * 0.2;
          const rightScore = Math.max(0, right.top - labelLine.top) + Math.abs(right.left - labelLine.left) * 0.2;
          return leftScore - rightScore;
        })[0];
      if (candidate) return candidate.text;
    }
  }
  return "";
}

function identityValue(rawText: string, lines: OcrTextLine[], patterns: RegExp[], allowRightValue = false): string {
  return layoutLabeledValue(lines, patterns, allowRightValue) || labeledValue(rawText, patterns);
}

function birthDateValue(rawText: string, lines: OcrTextLine[], patterns: RegExp[]): string {
  // If the document geometry contains this label, an empty value is meaningful:
  // do not fall back to a flattened OCR order that may put registration below it.
  return lines.some((line) => patterns.some((pattern) => pattern.test(line.text)))
    ? layoutLabeledValue(lines.filter((line) => !(patterns.some((pattern) => pattern.test(line.text)) && NON_BIRTH_DATE_LABEL.test(line.text))), patterns, true)
    : labeledValue(rawText, patterns);
}

function voterCombinedName(value: string) {
  const parts = value.split(",").map((part) => part.trim());
  if (parts.length < 2 || parts.length > 3) return null;
  let extensionName = "";
  const suffixPattern = /\b(JR|SR|II|III|IV)\.?$/i;
  if (parts.length === 3 && /^(?:JR|SR|II|III|IV)\.?$/i.test(parts[2])) extensionName = parts.pop()!.replace(/\./g, "").toUpperCase();
  for (const index of [0, parts.length - 1]) {
    const suffix = parts[index].match(suffixPattern);
    if (suffix) { extensionName ||= suffix[1].toUpperCase(); parts[index] = parts[index].slice(0, suffix.index).trim(); }
  }
  const lastName = cleanPersonName(parts[0]);
  if (parts.length === 3) {
    const givenName = cleanPersonName(parts[1]), middleName = cleanPersonName(parts[2]);
    return lastName && givenName ? { lastName, givenName, middleName, extensionName } : null;
  }
  const rest = cleanPersonName(parts[1]);
  if (!lastName || !rest) return null;
  const words = rest.split(/\s+/);
  let middleStart = words.length > 1 ? words.length - 1 : words.length;
  if (words.length > 2 && /^(?:DE|DEL|DELA|SAN|SANTA|SANTO|VAN|VON)$/.test(words[words.length - 2])) middleStart = words.length - 2;
  if (words.length > 3 && words[words.length - 3] === "DE" && /^(?:LA|LOS|LAS)$/.test(words[words.length - 2])) middleStart = words.length - 3;
  const middle = words.slice(middleStart).join(" ");
  return { lastName, givenName: words.slice(0, middleStart).join(" "), middleName: /^[A-Z]\.?$/.test(middle) ? "" : middle, extensionName };
}

function qrValue(values: Record<string, string>, aliases: string[]): string {
  const normalizedAliases = aliases.map((alias) => alias.toLowerCase().replace(/[^a-z0-9]/g, ""));
  for (const [key, value] of Object.entries(values)) {
    if (/mother|father|parent|issuer|signature/i.test(key)) continue;
    const normalizedKey = key.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalizedAliases.includes(normalizedKey)) return clean(value);
  }
  return "";
}

export function extractPhilSysNumber(value: string, layoutLines: OcrTextLine[] = []): string {
  const text = normalizeNumberText(value);
  const normalize = (candidate: string) => {
    const glyphs = candidate.replace(/[ .-]/g, "");
    if (!/^[0-9OQILSBZGD]{16}$/.test(glyphs)) return "";
    // Never construct missing digits or convert an entire word into a number.
    if ((glyphs.match(/\d/g) || []).length < 12) return "";
    for (let offset = 0; offset < 16; offset += 4) {
      if ((glyphs.slice(offset, offset + 4).match(/\d/g) || []).length < 2) return "";
    }
    const digits = glyphs.replace(/[OQD]/g, "0").replace(/[IL]/g, "1")
      .replace(/Z/g, "2").replace(/S/g, "5").replace(/G/g, "6").replace(/B/g, "8");
    return digits.replace(/(\d{4})(?=\d)/g, "$1-");
  };
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const visualNumbers = identityNumberRows(layoutLines).map((line) => line.text).filter((line) => line.replace(/[ .-]/g, "").length === 16);
  for (const line of [...lines, ...visualNumbers]) {
    const numberOnly = line.replace(/^(?:(?:PHILSYS\s+)?CARD\s*(?:NUMBER|NO\.?)|PCN)\s*[:#.-]?\s*/i, "");
    if (/^[0-9OQILSBZGD .-]+$/.test(numberOnly)) {
      const number = normalize(numberOnly);
      if (number) return number;
      continue;
    }
    // Overlapping matches let us reject a preceding birth year without skipping
    // the actual four-group PCN later on the same OCR line.
    for (const match of line.matchAll(/(?=\b([0-9OQILSBZGD]{4}(?:[ .-]*[0-9OQILSBZGD]{4}){3})\b)/g)) {
      const tail = line.slice((match.index || 0) + match[1].length);
      if (/^[ .-]*\d/.test(tail)) continue;
      const number = normalize(match[1]);
      if (number) return number;
    }
  }
  // Tesseract may split a PCN into 4+4+4+4, 4+12 or 8+8 lines.
  // Validate the whole contiguous run: never slide through an extra birth year.
  const fragment = (line: string) => /^[0-9OQILSBZGD .-]+$/.test(line) && [4, 8, 12].includes(line.replace(/[ .-]/g, "").length);
  for (let index = 0; index < lines.length; index++) {
    if (!fragment(lines[index])) continue;
    const pieces: string[] = [];
    while (index < lines.length && fragment(lines[index])) pieces.push(lines[index++]);
    if (pieces.length >= 2 && pieces.length <= 4) {
      const number = normalize(pieces.join("-"));
      if (number) return number;
    }
  }
  return "";
}

function normalizeIdNumber(value: string, isPhilSys = false): string {
  const cleaned = cleanLocalValue(value).replace(/^\.\s*/, "").replace(/\s+(?=[A-Z]+\s*:)/i, "");
  if (isPhilSys) {
    const pcn = extractPhilSysNumber(cleaned);
    if (pcn) return pcn;
  }
  const groupedDigits = cleaned.match(/\b\d{4}[ -]+\d{4}[ -]+\d{4}[ -]+\d{4}\b/);
  return (groupedDigits?.[0] || cleaned).replace(/\s+/g, groupedDigits ? "-" : " ").trim();
}

function localSex(rawText: string, qrValues: Record<string, string>, lines: OcrTextLine[] = []): string {
  const candidate = qrValue(qrValues, ["sex", "gender"]) || identityValue(rawText, lines, [/\b(?:KASARIAN\s*\/\s*)?SEX\b/i, /\bKASARIAN\b/i]);
  if (candidate) {
    if (/\bF(?:EMALE)?\b/i.test(candidate)) return "FEMALE";
    if (/\bM(?:ALE)?\b/i.test(candidate)) return "MALE";
  }
  if (/\bFEMALE\b/i.test(rawText)) return "FEMALE";
  if (/\bMALE\b/i.test(rawText)) return "MALE";
  return "";
}

function localCivilStatus(rawText: string, qrValues: Record<string, string>): string {
  const candidate = (qrValue(qrValues, ["civilStatus", "maritalStatus"]) || labeledValue(rawText, [/\bCIVIL\s*STATUS\b/i, /\bMARITAL\s*STATUS\b/i, /\bKALAGAYANG\s*SIBIL\b/i])).toUpperCase();
  if (/\bMARRIED\b/.test(candidate)) return "MARRIED";
  if (/\bSINGLE\b/.test(candidate)) return "SINGLE";
  if (/\bWIDOWED\b/.test(candidate)) return "WIDOWED";
  if (/\bSEP(?:A|PA)RATED\b/.test(candidate)) return "SEPPARATED";
  return "";
}

export function mapLocalIdentityText(
  rawText: string,
  subject: OcrSubject,
  qrValues: Record<string, string> = {},
  layoutLines: OcrTextLine[] = [],
  selectedIdType = ""
): MappedOcrSide {
  const target: MappedOcrSide = { fields: {}, uncertainFields: [] };
  const uncertain = new Set<keyof ApplicationFormValues>();
  const setLocal = (key: keyof ApplicationFormValues, value: string | number | null) => {
    const previousCount = Object.keys(target.fields).length;
    setMapped(target, key, value);
    if (Object.keys(target.fields).length > previousCount) uncertain.add(key);
  };

  const combinedLabel = ORDERED_NAME_LABEL;
  const combinedValue = combinedLabel.test(rawText) ? identityValue(rawText, layoutLines, [combinedLabel]) : "";
  const combined = combinedValue ? combinedValue.split(",").map(cleanPersonName) : null;
  const combinedPart = (index: number) => combined?.length === 3 ? combined[index] : "";
  // This certificate's explicit comma gives surname order. A label-free name
  // never receives this heuristic; every split remains Needs Review.
  const voterName = selectedIdType === "DRIVER LICENSE ID" && combinedValue
    ? voterCombinedName(combinedValue.includes(",") ? combinedValue : combinedValue.replace(/^([\p{L}' -]{2,})\.\s+(?=\p{L})/u, "$1, "))
    : (selectedIdType || matchIdType("", rawText)).startsWith("VOTER'S")
      ? voterCombinedName(identityValue(rawText, layoutLines, [/^NAME\b/i, /^PANGALAN\b/i], true)) : null;
  const lastName = cleanPersonName(qrValue(qrValues, ["lastName", "lName", "surname", "familyName"]) || (combined ? combinedPart(0) : identityValue(rawText, layoutLines, [/(?:APELYIDO\s*\/\s*)?LAST\s*NAME\b/i, /^(?!GITNANG\b)APELYIDO\b/i, /\bSURNAME\b/i]))) || voterName?.lastName || "";
  const firstName = cleanPersonName(qrValue(qrValues, ["firstName", "fName", "givenName", "givenNames"]) || (combined ? combinedPart(1) : identityValue(rawText, layoutLines, [/(?:MGA\s+PANGALAN\s*\/\s*)?G[I1L]VEN\s*NAMES?\b/i, /\bMGA\s+PANGALAN\b/i, /\bFIRST\s*NAME\b/i]))) || voterName?.givenName || "";
  const middleName = cleanPersonName(qrValue(qrValues, ["middleName", "mName"]) || (combined ? combinedPart(2) : identityValue(rawText, layoutLines, [/(?:GITNANG\s+APELYIDO\s*\/\s*)?M[I1L]DDLE\s*NAME\b/i, /\bGITNANG\s+APELYIDO\b/i]))) || voterName?.middleName || "";
  const birthDateSource = qrValue(qrValues, ["dateOfBirth", "birthDate", "dob"]) || birthDateValue(rawText, layoutLines, [/(?:PETSA\s+NG\s+KAPANGANAKAN\s*\/\s*)?DATE\s*OF\s*BIRTH\b/i, /\bPETSA\s+NG\s+KAPANGANAKAN\b/i, /\bBIRTH\s*DATE\b/i, /\bD\.?O\.?B\.?\b/i]);
  const parsedDate = parseExplicitDate(birthDateSource);
  const birthDate = calculateAge(parsedDate) === null ? "" : parsedDate;
  const suffix = (qrValue(qrValues, ["suffix", "extensionName"]) || labeledValue(rawText, [/\bSUFFIX\b/i, /\bEXTENSION\s*NAME\b/i])).toUpperCase().match(/\b(?:JR|SR|I|II|III|IV)\b/)?.[0] || voterName?.extensionName || "";

  if (subject === "APPLICANT") {
    const profile = getIdentityProfile(selectedIdType);
    const detectedType = matchIdType(qrValue(qrValues, ["documentType", "idType"]), rawText);
    const idType = profile ? selectedIdType : detectedType;
    const qrPcn = !profile || profile.nationalLayout ? qrValue(qrValues, ["pcn", "philSysCardNumber"]) : "";
    const specificQr = profile ? qrValue(qrValues, profile.qrNumberAliases.slice(0, -3)) : "";
    const notIdentityNumber = /\b(?:PRECINCT|CONTACT|PHONE|MOBILE|RECEIPT)\b/i;
    const numberText = rawText.split(/\r?\n/).filter((line) => !notIdentityNumber.test(line)).join("\n");
    const numberLines = layoutLines.filter((line) => !notIdentityNumber.test(line.text));
    // Specific agency labels win over an unrelated generic "ID Number" elsewhere.
    const printedNumber = profile ? profile.numberPatterns.map((pattern) => identityValue(numberText, numberLines, [pattern]))
      .find((candidate) => profile.nationalLayout ? Boolean(extractPhilSysNumber(candidate)) : Boolean(extractProfileNumber(candidate, idType, true))) || ""
      : identityValue(rawText, layoutLines, [/\bPCN\b/i, /\bPSN\b/i, /\bID\s+(?:NUMBER|NO\.?)\b/i, /\bDOCUMENT\s+NUMBER\b/i, /\bCARD\s+NUMBER\b/i, /\bLICEN[CS]E\s+(?:NUMBER|NO\.?)\b/i, /\bCRN\b/i]);
    const labeledIdNumber = qrPcn || specificQr || qrValue(qrValues, ["documentNumber", "idNumber", "cardNumber", ...(!profile ? ["psn"] : [])]) || printedNumber;
    const fallbackIdNumber = !profile || profile.nationalLayout ? extractPhilSysNumber(rawText, layoutLines) : extractProfileNumber(rawText, idType, false, layoutLines);
    const address = readIdentityAddress(rawText, layoutLines, qrValues);

    setLocal("givenName", firstName);
    setLocal("middleName", middleName);
    setLocal("lastName", lastName);
    setLocal("extensionName", suffix);
    setLocal("birthDate", birthDate);
    setLocal("applicantAge", calculateAge(birthDate));
    setLocal("sex", localSex(rawText, qrValues, layoutLines));
    setLocal("idNumber", idType === "NATIONAL ID" || Boolean(qrPcn)
      ? extractPhilSysNumber(labeledIdNumber) || fallbackIdNumber
      : profile ? extractProfileNumber(labeledIdNumber, idType, true) || fallbackIdNumber
      : /\d/.test(labeledIdNumber || fallbackIdNumber) ? normalizeIdNumber(labeledIdNumber || fallbackIdNumber) : "");
    setLocal("civilStatus", localCivilStatus(rawText, qrValues));
    setLocal("streetSitio", address.streetSitio);
    setLocal("barangay", address.barangay);
    // A user selection guides reading; it isn't an extracted detail on a blank image.
    if (detectedType || Object.keys(target.fields).length) setLocal("idType", idType);
  } else {
    setLocal("dependentGivenName", firstName);
    setLocal("dependentMiddleName", middleName);
    setLocal("dependentLastName", lastName);
    setLocal("dependentExtensionName", suffix);
    setLocal("dependentBirthDate", birthDate);
    setLocal("dependentAge", calculateAge(birthDate));
  }

  target.uncertainFields = [...uncertain];
  return target;
}

function explicitLabel(rawText: string, labels: string[]): string {
  const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const pattern = new RegExp(`(?:${escaped})\\s*[:#-]\\s*([^\\n\\r]+)`, "i");
  return clean(rawText.match(pattern)?.[1]);
}

function setMapped(
  target: MappedOcrSide,
  key: keyof ApplicationFormValues,
  value: string | number | null,
  confidence?: number
) {
  if (value === "" || value === null || value === undefined) return;
  (target.fields as Record<string, unknown>)[key] = value;
  if (typeof confidence === "number" && confidence < 0.72) target.uncertainFields.push(key);
}

export function mapAzureIdentityResult(result: AzureDocumentResult, subject: OcrSubject): MappedOcrSide {
  const target: MappedOcrSide = { fields: {}, uncertainFields: [] };
  const document = result.documents?.[0];
  const fields = document?.fields || {};
  const rawText = clean(result.content);
  const layoutLines: OcrTextLine[] = (result.pages || []).flatMap((page, pageIndex) => {
    const lines = (page.lines || []).filter((line) => line.content && line.polygon?.length === 8);
    const heights = lines.map((line) => Math.max(...line.polygon!.filter((_, index) => index % 2 === 1)) - Math.min(...line.polygon!.filter((_, index) => index % 2 === 1))).filter((height) => height > 0).sort((a, b) => a - b);
    const scale = heights.length ? 20 / heights[Math.floor(heights.length / 2)] : 1;
    return lines.map((line) => {
      const x = line.polygon!.filter((_, index) => index % 2 === 0);
      const y = line.polygon!.filter((_, index) => index % 2 === 1);
      return { text: line.content!, left: Math.min(...x) * scale, top: Math.min(...y) * scale + pageIndex * 100_000, width: (Math.max(...x) - Math.min(...x)) * scale, height: (Math.max(...y) - Math.min(...y)) * scale };
    });
  });
  const fallback = mapLocalIdentityText(rawText, subject, {}, layoutLines);

  const firstName = fieldValue(fields.FirstName || fields.GivenName);
  const middleName = fieldValue(fields.MiddleName);
  const lastName = fieldValue(fields.LastName || fields.Surname);
  const birthDate = parseExplicitDate(fieldValue(fields.DateOfBirth));
  const sexRaw = fieldValue(fields.Sex || fields.Gender).toUpperCase();
  const sex = sexRaw === "M" || sexRaw === "MALE" ? "MALE" : sexRaw === "F" || sexRaw === "FEMALE" ? "FEMALE" : "";
  const idNumber = fieldValue(fields.DocumentNumber || fields.IdNumber);
  const address = fieldValue(fields.Address);
  const idType = matchIdType(fieldValue(fields.DocumentType) || document?.docType || "", rawText);
  const civilStatusRaw = explicitLabel(rawText, ["CIVIL STATUS", "MARITAL STATUS"]).toUpperCase();
  const civilStatus = ["SINGLE", "MARRIED", "WIDOWED", "SEPPARATED"].includes(civilStatusRaw)
    ? civilStatusRaw
    : civilStatusRaw === "SEPARATED" ? "SEPPARATED" : "";

  if (subject === "APPLICANT") {
    setMapped(target, "givenName", firstName.toUpperCase(), fields.FirstName?.confidence || fields.GivenName?.confidence);
    setMapped(target, "middleName", middleName.toUpperCase(), fields.MiddleName?.confidence);
    setMapped(target, "lastName", lastName.toUpperCase(), fields.LastName?.confidence || fields.Surname?.confidence);
    setMapped(target, "birthDate", birthDate, fields.DateOfBirth?.confidence);
    setMapped(target, "applicantAge", calculateAge(birthDate), fields.DateOfBirth?.confidence);
    setMapped(target, "sex", sex, fields.Sex?.confidence || fields.Gender?.confidence);
    setMapped(target, "idNumber", idNumber, fields.DocumentNumber?.confidence || fields.IdNumber?.confidence);
    setMapped(target, "idType", idType, fields.DocumentType?.confidence);
    setMapped(target, "civilStatus", civilStatus);
    const addressParts = splitIdentityAddress(address);
    setMapped(target, "streetSitio", addressParts.streetSitio, fields.Address?.confidence);
    setMapped(target, "barangay", addressParts.barangay, fields.Address?.confidence);
  } else {
    setMapped(target, "dependentGivenName", firstName.toUpperCase(), fields.FirstName?.confidence || fields.GivenName?.confidence);
    setMapped(target, "dependentMiddleName", middleName.toUpperCase(), fields.MiddleName?.confidence);
    setMapped(target, "dependentLastName", lastName.toUpperCase(), fields.LastName?.confidence || fields.Surname?.confidence);
    setMapped(target, "dependentBirthDate", birthDate, fields.DateOfBirth?.confidence);
    setMapped(target, "dependentAge", calculateAge(birthDate), fields.DateOfBirth?.confidence);
  }

  // Structured Azure fields take priority; printed labels fill only missing fields.
  for (const [rawKey, value] of Object.entries(fallback.fields)) {
    const key = rawKey as keyof ApplicationFormValues;
    if (target.fields[key] !== undefined) continue;
    (target.fields as Record<string, unknown>)[key] = value;
    target.uncertainFields.push(key);
  }
  const dateKey = subject === "APPLICANT" ? "birthDate" : "dependentBirthDate";
  const ageKey = subject === "APPLICANT" ? "applicantAge" : "dependentAge";
  const age = calculateAge(String(target.fields[dateKey] || ""));
  if (age !== null) {
    target.fields[ageKey] = age;
    if (target.uncertainFields.includes(dateKey) && !target.uncertainFields.includes(ageKey)) target.uncertainFields.push(ageKey);
  }
  return target;
}

export function mergeOcrSides(front: MappedOcrSide | null, back: MappedOcrSide | null): MergedOcrResult {
  const fields: Partial<ApplicationFormValues> = { ...(back?.fields || {}), ...(front?.fields || {}) };
  const conflicts: OcrConflict[] = [];
  const uncertainFields = new Set<keyof ApplicationFormValues>([
    ...(front?.uncertainFields || []),
    ...(back?.uncertainFields || []),
  ]);

  if (front && back) {
    for (const key of Object.keys(front.fields) as Array<keyof ApplicationFormValues>) {
      const frontValue = front.fields[key];
      const backValue = back.fields[key];
      if (frontValue === undefined || backValue === undefined) continue;
      if (normalizeComparable(frontValue) !== normalizeComparable(backValue)) {
        conflicts.push({ field: key, frontValue: String(frontValue), backValue: String(backValue) });
        uncertainFields.add(key);
      }
    }
  }

  const extractedCount = Object.values(fields).filter((value) => value !== "" && value !== null && value !== undefined).length;
  const status: OcrAutofillStatus = extractedCount === 0
    ? "Unable to Read ID"
    : conflicts.length > 0 || uncertainFields.size > 0
      ? "Needs Review"
      : "Autofill Complete";

  return { fields, conflicts, uncertainFields: [...uncertainFields], status };
}
