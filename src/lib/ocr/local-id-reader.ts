import { calculateAge, type ApplicationFormValues } from "../application-schema.ts";
import { extractPhilSysNumber, isIdentityLabel, NON_BIRTH_DATE_LABEL, ORDERED_NAME_LABEL, mapLocalIdentityText, type MappedOcrSide, type OcrSubject, type OcrTextLine } from "./application-id-mapper.ts";
import { ADDRESS_LABEL, ADDRESS_STOP, qrIdentityAddress } from "./identity-address.ts";
import { getIdentityProfile } from "./identity-profiles.ts";
import { extractProfileNumber, identityNumberRows } from "./id-number-reader.ts";

export interface LocalReading {
  mapped: MappedOcrSide;
  confidence: number;
  weight?: number;
}

export interface IdFieldCrop {
  label: string;
  kind: "name" | "date" | "number" | "address" | "choice";
  left: number;
  top: number;
  width: number;
  height: number;
}

const CROP_LABELS: Array<{ pattern: RegExp; label: string; kind: IdFieldCrop["kind"] }> = [
  { pattern: ORDERED_NAME_LABEL, label: "Last Name, First Name, Middle Name", kind: "name" },
  { pattern: /LAST\s*NAME|SURNAME|^APELYIDO\b/i, label: "Last Name", kind: "name" },
  { pattern: /G[I1L]VEN\s*NAMES?|FIRST\s*NAME|MGA\s+PANGALAN/i, label: "Given Names", kind: "name" },
  { pattern: /M[I1L]DDLE\s*NAME|GITNANG\s+APELYIDO/i, label: "Middle Name", kind: "name" },
  { pattern: /^NAME\b|^PANGALAN\b/i, label: "Name", kind: "name" },
  { pattern: /DATE\s*OF\s*BIRTH|BIRTH\s*DATE|PETSA\s*(?:NG\s*)?KAPANGANAKAN|\bD\.?O\.?B\.?\b/i, label: "Date of Birth", kind: "date" },
  { pattern: /\bPCN\b|\bID\s*(?:NUMBER|NO\.?)/i, label: "ID Number", kind: "number" },
  { pattern: ADDRESS_LABEL, label: "Address", kind: "address" },
  { pattern: /\bSEX\b|KASARIAN/i, label: "Sex", kind: "choice" },
  { pattern: /CIVIL\s*STATUS|MAR[I1L]T[A4][L1I/]\s*STAT|KALAGAYANG\s*SIBIL|\bSIBIL\b/i, label: "Civil Status", kind: "choice" },
];

// Only the person's own fields are considered; issuer/parent names cannot win.
export function parseIdentityQr(text: string): Record<string, string> {
  if (text.length > 64_000) return {};
  const candidates = [text];
  const token = text.split(".");
  if (token.length === 3) {
    try {
      const normalized = token[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      candidates.push(new TextDecoder().decode(Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))));
    } catch { /* Not every QR token is a JWT. */ }
  }
  for (const candidate of candidates) {
    try {
      const root = JSON.parse(candidate);
      if (!root || typeof root !== "object" || Array.isArray(root)) continue;
      const subjectKey = Object.keys(root).find((key) => /^(subject|personalInfo|personalInformation)$/i.test(key));
      const subject = subjectKey ? root[subjectKey] : root;
      if (!subject || typeof subject !== "object" || Array.isArray(subject)) continue;
      const values: Record<string, string> = {};
      const flatten = (object: Record<string, unknown>, prefix = "") => {
        for (const [key, value] of Object.entries(object)) {
          if (/mother|father|parent|issuer|signature|public.?key/i.test(key)) continue;
          if (typeof value === "string" || typeof value === "number") values[prefix + key] = String(value);
          else if (value && typeof value === "object" && !Array.isArray(value)) flatten(value as Record<string, unknown>, prefix + key + ".");
        }
      };
      flatten(subject);
      for (const key of Object.keys(root)) {
        if (/^(pcn|psn|philSysCardNumber|cardNumber|documentNumber|idType|documentType)$/i.test(key.replace(/[^a-z0-9]/gi, "")) && typeof root[key] === "string") values[key] = root[key];
      }
      // A JSON QR is only a data source, never proof that an ID is authentic.
      return values;
    } catch { /* Unsupported/encrypted QR payload: continue with printed OCR. */ }
  }
  return {};
}

export function identityScore(mapped: MappedOcrSide, subject: OcrSubject): number {
  const fields = subject === "APPLICANT"
    ? ["givenName", "lastName", "middleName", "birthDate", "idNumber"] as const
    : ["dependentGivenName", "dependentLastName", "dependentMiddleName", "dependentBirthDate"] as const;
  return fields.reduce((score, key) => score + (mapped.fields[key] ? 1 : 0), 0);
}

export function fieldCrops(lines: OcrTextLine[], width: number, height: number, selectedIdType = ""): IdFieldCrop[] {
  const crops: IdFieldCrop[] = [];
  const profile = getIdentityProfile(selectedIdType);
  const definitions = profile ? CROP_LABELS.map((definition) => definition.kind === "number"
    ? { ...definition, label: profile.numberLabel, pattern: new RegExp(profile.numberPatterns.map((pattern) => `(?:${pattern.source})`).join("|"), "i") } : definition) : CROP_LABELS;
  for (const definition of definitions) {
    if (definition.label === "Last Name, First Name, Middle Name" && selectedIdType !== "DRIVER LICENSE ID") continue;
    if (definition.label === "Name" && !selectedIdType.startsWith("VOTER'S")) continue;
    const isNumberLabel = (line: OcrTextLine) => !/\b(?:PRECINCT|CONTACT|PHONE|MOBILE|RECEIPT)\b/i.test(line.text);
    const label = definition.kind === "number" && profile
      ? profile.numberPatterns.map((pattern) => lines.find((line) => isNumberLabel(line) && pattern.test(line.text))).find(Boolean)
      : lines.find((line) => definition.pattern.test(line.text) && !(definition.kind === "date" && NON_BIRTH_DATE_LABEL.test(line.text)));
    if (!label) continue;
    if (definition.kind === "name" && definition.label !== "Last Name, First Name, Middle Name" && CROP_LABELS.filter((other) => other.kind === "name" && other.pattern.test(label.text)).length > 1) continue;
    const sameColumn = (line: OcrTextLine) => Math.abs(line.left - label.left) < Math.max(80, label.width * 0.6);
    const nextLabel = lines.filter((line) => line.top > label.top + label.height && sameColumn(line) &&
      (ADDRESS_STOP.test(line.text) || isIdentityLabel(line.text) || definitions.some((other) => other !== definition && other.pattern.test(line.text)))).sort((a, b) => a.top - b.top)[0];
    const left = Math.max(0, label.left - label.height);
    const match = label.text.match(definition.pattern);
    const suffix = match ? label.text.slice((match.index || 0) + match[0].length).replace(/^[\s:/#.-]+/, "") : "";
    const inlineValue = (suffix && !isIdentityLabel(suffix)) || (definition.kind !== "name" || definition.label === "Name") && lines.some((line) => line !== label && !isIdentityLabel(line.text)
      && line.left >= label.left + label.width - label.height * .2
      && Math.abs(line.top + line.height / 2 - label.top - label.height / 2) <= Math.min(line.height, label.height) * .7);
    const top = Math.max(0, label.top + label.height * (definition.kind === "address" || definition.kind === "number" || inlineValue ? -0.5 : 0.85));
    const rightLabel = lines.filter((line) => line.left > label.left + label.width &&
      Math.abs(line.top - label.top) < label.height * 2 && CROP_LABELS.some((other) => other.pattern.test(line.text)))
      .sort((a, b) => a.left - b.left)[0];
    const right = rightLabel ? rightLabel.left - label.height : width;
    const bottom = Math.min(height, nextLabel?.top ?? top + Math.max(55, label.height * (definition.kind === "address" ? 12 : 5)));
    if (bottom - top > 8 && right - left > 35) crops.push({
      label: definition.label, kind: definition.kind, left, top, width: right - left, height: bottom - top,
    });
  }
  return crops;
}

export interface IdNumberRegion extends IdFieldCrop {
  singleLine: boolean;
  source: "label" | "numeric-row" | "philsys-position" | "band";
}

/** Current Philippine LTO front: use the recognized issuer/title and DOB
 * column as anchors. Never borrow these regions for other card families or
 * for a license whose columns/portrait layout do not match.
 */
export function driverFrontFieldCrops(lines: OcrTextLine[], width: number, height: number): IdFieldCrop[] {
  if (width / height < 1.3 || width / height > 2.1) return [];
  const title = lines.find((line) => /DRIVER.?S?\s+LICEN[CS]E/i.test(line.text) && line.left > width * .22 && line.top < height * .35);
  const birth = lines.find((line) => /DATE\s*OF\s*BIRTH/i.test(line.text) && line.left > width * .48 && line.left < width * .8 && line.top > height * .3 && line.top < height * .55);
  if (!title || !birth || birth.top <= title.top + title.height) return [];
  const unit = Math.min(height * .035, Math.max(height * .018, birth.height));
  const left = Math.max(0, title.left - unit), right = width * .97;
  const region = (label: string, kind: IdFieldCrop["kind"], x0: number, y0: number, x1: number, y1: number): IdFieldCrop => ({ label, kind,
    left: Math.max(0, x0), top: Math.max(0, y0), width: Math.min(width, x1) - Math.max(0, x0), height: Math.min(height, y1) - Math.max(0, y0) });
  const weight = lines.find((line) => /\bWEIGHT\b/i.test(line.text) && line.left > birth.left && Math.abs(line.top - birth.top) < unit * 2);
  return [
    region("Last Name, First Name, Middle Name", "name", left, title.top + title.height + unit, right, birth.top - unit * .4),
    region("Date of Birth", "date", birth.left - unit * .5, birth.top - unit * .3, weight ? weight.left - unit * .5 : birth.left + width * .15, birth.top + unit * 3.4),
    region("Sex", "choice", birth.left - width * .085, birth.top - unit * .3, birth.left - unit, birth.top + unit * 3.4),
    region("Address", "address", left, birth.top + unit * 3.6, right, birth.top + unit * 9),
    region("License Number", "number", left, birth.top + unit * 10, birth.left - unit * .6, birth.top + unit * 16.5),
  ].filter((crop) => crop.width > 25 && crop.height > 15);
}

export function philsysFrontNumberCrops(lines: OcrTextLine[], width: number, height: number): IdNumberRegion[] {
  // Physical PhilSys front only. Portrait certificates/digital layouts retain
  // label/whole-document recovery instead of borrowing this card's coordinates.
  if (width / height < 1.2 || width / height > 2.1) return [];
  const regions: IdNumberRegion[] = [];
  const surname = lines.find((line) => !/MIDDLE|GITNANG/i.test(line.text) && /LAST\s*NAME|SURNAME|APELYIDO/i.test(line.text)
    && line.left > width * .33 && line.top > height * .18 && line.top < height * .65);
  if (surname) {
    const left = width * .035, right = Math.min(width * .6, surname.left - width * .015);
    if (right - left > width * .3) regions.push({ label: "PCN above-left of surname", kind: "number", source: "philsys-position", singleLine: false,
      left, top: Math.max(0, surname.top - height * .105), width: right - left, height: height * .105 });
  }
  regions.push({ label: "PCN upper-left of National ID", kind: "number", source: "philsys-position", singleLine: false,
    left: width * .035, top: height * .20, width: width * .52, height: height * .14 });
  return regions;
}

export function philsysBackCivilCrops(lines: OcrTextLine[], width: number, height: number): IdFieldCrop[] {
  if (width / height < 1.15 || width / height > 2.1) return [];
  const regions: IdFieldCrop[] = [{ label: "Civil Status", kind: "choice", left: width * .02, top: height * .48, width: width * .4, height: height * .105 }];
  const sex = lines.find((line) => /\bSEX\b|KASARIAN/i.test(line.text) && line.left < width * .4 && line.top > height * .12 && line.top < height * .55);
  if (sex) regions.push({ label: "Civil Status", kind: "choice", left: Math.max(0, sex.left - width * .02), top: sex.top + height * .13,
    width: width * .4, height: Math.min(height * .14, height - sex.top - height * .13) });
  return regions;
}

export function numberRescueCrops(lines: OcrTextLine[], width: number, height: number, selectedIdType: string): IdNumberRegion[] {
  const profile = getIdentityProfile(selectedIdType);
  const candidates = [...identityNumberRows(lines), ...lines.filter((line) => profile?.numberPatterns.some((pattern) => pattern.test(line.text)))].filter((line) =>
    (line.text.match(/\d/g) || []).length >= 6 && !/\b(?:BIRTH|DATE|CONTACT|PHONE|MOBILE|RECEIPT|PRECINCT)\b/i.test(line.text)
  ).sort((a, b) => (b.confidence || 0) - (a.confidence || 0) || a.top - b.top)
    .filter((line, index, all) => !all.slice(0, index).some((previous) =>
      Math.abs(previous.top - line.top) < Math.max(previous.height, line.height) &&
      Math.abs(previous.left - line.left) < Math.max(previous.height, line.height) * 2));
  return [
    ...fieldCrops(lines, width, height, selectedIdType).filter((region) => region.kind === "number")
      .map((region) => ({ ...region, source: "label" as const, singleLine: false })),
    ...candidates.slice(0, 3).map((line) => {
      const pad = Math.max(12, line.height);
      const left = Math.min(width - 1, Math.max(0, line.left - pad));
      const top = Math.min(height - 1, Math.max(0, line.top - pad * 0.6));
      return { label: profile?.numberLabel || "ID Number", kind: "number" as const, source: "numeric-row" as const, singleLine: true, left, top,
        width: Math.min(width - left, line.width + pad * 2),
        height: Math.min(height - top, line.height + pad * 1.2) };
    }),
    ...(profile?.nationalLayout ? philsysFrontNumberCrops(lines, width, height) : []),
    // ePhilID and other cards can print the number below the photo, not only at the top.
    ...[0.03, 0.35, 0.67].map((top) => ({ label: profile?.numberLabel || "ID Number", kind: "number" as const, source: "band" as const, singleLine: false,
      left: width * 0.01, top: height * top, width: width * 0.98, height: height * Math.min(0.33, 1 - top) })),
  ];
}

export function nationalNumberCrops(lines: OcrTextLine[], width: number, height: number) {
  return numberRescueCrops(lines, width, height, "NATIONAL ID");
}

export function combineLocalReadings(readings: LocalReading[], subject: OcrSubject, qrValues: Record<string, string> = {}, selectedIdType = ""): MappedOcrSide {
  const qr = mapLocalIdentityText("", subject, qrValues, [], selectedIdType);
  const national = subject === "APPLICANT" && (getIdentityProfile(selectedIdType) ? selectedIdType === "NATIONAL ID" : qr.fields.idType === "NATIONAL ID" || readings.some((reading) => reading.mapped.fields.idType === "NATIONAL ID"));
  const candidates = new Map<keyof ApplicationFormValues, Map<string, { value: unknown; votes: number; quality: number }>>();
  for (const reading of readings) {
    for (const [rawKey, rawValue] of Object.entries(reading.mapped.fields)) {
      const key = rawKey as keyof ApplicationFormValues;
      const value = key !== "idNumber" ? rawValue : national ? extractPhilSysNumber(String(rawValue))
        : selectedIdType ? extractProfileNumber(String(rawValue), selectedIdType, true) : rawValue;
      if (key === "applicantAge" || key === "dependentAge" || value === "" || value === null) continue;
      const normalized = String(value).toUpperCase().replace(/[^\p{L}\d]/gu, "");
      const options = candidates.get(key) || new Map();
      const existing = options.get(normalized);
      options.set(normalized, { value, votes: (existing?.votes || 0) + (reading.weight || 1), quality: Math.max(existing?.quality || 0, reading.confidence) });
      candidates.set(key, options);
    }
  }
  const fields: Partial<ApplicationFormValues> = {};
  for (const [key, options] of candidates) {
    const best = [...options.values()].sort((a, b) => b.votes - a.votes || b.quality - a.quality)[0];
    (fields as Record<string, unknown>)[key] = best.value;
  }
  // Explicit QR fields have priority over an OCR character guess, but still need review.
  if (national && qr.fields.idNumber) {
    const number = extractPhilSysNumber(qr.fields.idNumber);
    if (number) qr.fields.idNumber = number;
    else delete qr.fields.idNumber;
  }
  if (!national && selectedIdType && qr.fields.idNumber) {
    const number = extractProfileNumber(qr.fields.idNumber, selectedIdType, true);
    if (number) qr.fields.idNumber = number; else delete qr.fields.idNumber;
  }
  const qrAddress = subject === "APPLICANT" ? qrIdentityAddress(qrValues) : null;
  if (qrAddress?.barangay && fields.barangay && qrAddress.barangay !== fields.barangay && !qrAddress.streetSitio) {
    // Never combine a printed purok with a different QR barangay.
    delete fields.streetSitio;
  }
  Object.assign(fields, qr.fields);
  if (qrAddress?.foreignLocality) delete fields.barangay;
  const birthday = subject === "APPLICANT" ? fields.birthDate : fields.dependentBirthDate;
  const ageKey = subject === "APPLICANT" ? "applicantAge" : "dependentAge";
  const age = calculateAge(birthday || "");
  if (age !== null) fields[ageKey] = age;
  return { fields, uncertainFields: Object.keys(fields) as Array<keyof ApplicationFormValues> };
}
