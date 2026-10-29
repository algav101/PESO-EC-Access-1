import { BARANGAYS } from "../application-schema.ts";
import type { OcrTextLine } from "./application-id-mapper.ts";

// Match a printed address heading, not a word in an issuer's footer.
export const ADDRESS_LABEL = /^\s*(?:(?:RESIDENTIAL|RESIDENCE|HOME|PRESENT|PERMANENT|CURRENT)\s+)?(?:TIRAHAN\s*\/\s*ADDRESS|ADDRESS\s*\/\s*TIRAHAN|ADDRESS|TIRAHAN)\b\s*[:/#|.-]*\s*/i;
export const ADDRESS_STOP = /\b(?:LAST\s*NAME|FIRST\s*NAME|GIVEN\s*NAMES?|MIDDLE\s*NAME|APELYIDO|PANGALAN|BIRTH|KAPANGANAKAN|KAPANGANAK|SEX|KASARIAN|CIVIL\s*STATUS|MARITAL\s*STATUS|BLOOD\s*TYPE|HEIGHT|WEIGHT|NATIONALITY|CITIZENSHIP|ISSUED|ISSUE\s*DATE|EXPIRY|EXPIRATION|VALID\s*UNTIL|SIGNATURE|LAGDA|PCN|PSN|DOCUMENT\s*NUMBER|ID\s*(?:NO|NUMBER)|PHILSYS|SCAN\s*(?:THE\s*)?QR|IF\s*FOUND|REPUBLIC|REPUBLIKA)\b/i;
const BRGY = /\b(?:BARANGAY|BRGY\.?|BGY\.?)\s*[:#.-]?\s*/gi;
const normalize = (text: string) => text.toUpperCase().replace(/[\u00a0\u2007\u202f]/g, " ").replace(/[\u2010-\u2015]/g, "-").replace(/[ \t]+/g, " ").trim();
const trim = (text: string) => text.replace(/^[\s,;:/|.-]+|[\s,;:/|.-]+$/g, "");
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const barangayPattern = (name: string) => name.split(/\s+/).map(escape).join("\\s+");

function addressLike(text: string): boolean {
  return /\b(?:PUROK|PRK\.?|SITIO|STO\.?|BARANGAY|BRGY\.?|BGY\.?|STREET|ST\.?|ROAD|RD\.?|BLOCK|BLK|LOT|PHASE|SUBD|SUBDIVISION|DINGALAN|AURORA|PHILIPPINES?|PHL)\b|\d/i.test(text)
    || BARANGAYS.some((name) => new RegExp(`\\b${barangayPattern(name)}\\b`, "i").test(text));
}

function addressPiece(text: string): string {
  return trim(normalize(text).replace(ADDRESS_LABEL, "").split(ADDRESS_STOP)[0]);
}

function addressStart(text: string): boolean {
  return addressLike(text) && (/\b(?:PUROK|PRK|SITIO|BARANGAY|BRGY|BGY|STREET|ROAD|BLOCK|BLK|LOT|PHASE|SUBD|DINGALAN|AURORA)\b/i.test(text)
    || /^#?\d+[A-Z]?\s+\p{L}/u.test(text) || BARANGAYS.some((name) => new RegExp(`^${barangayPattern(name)}$`, "i").test(text)));
}

function nearBarangay(value: string): string {
  const candidate = value.replace(/[^A-Z ]/g, "").replace(/\s+/g, " ").trim();
  if (candidate.length < 6 || /\d|\b(?:PUROK|SITIO|STREET|ROAD|BLK|LOT)\b/.test(value)) return "";
  const distances = BARANGAYS.map((name) => {
    let previous = Array.from({ length: name.length + 1 }, (_, index) => index);
    for (let row = 1; row <= candidate.length; row++) {
      const current = [row];
      for (let col = 1; col <= name.length; col++) current[col] = Math.min(current[col - 1] + 1, previous[col] + 1, previous[col - 1] + Number(candidate[row - 1] !== name[col - 1]));
      previous = current;
    }
    return { name, distance: previous[name.length] };
  }).sort((a, b) => a.distance - b.distance);
  const [best, second] = distances;
  return best.distance <= (best.name.length >= 9 ? 2 : 1) && best.distance / Math.max(candidate.length, best.name.length) <= .2
    && best.distance < second.distance ? best.name : "";
}

function wrappedLocalName(text: string, following: string | undefined): boolean {
  return /^[\p{L} .'-]{2,60}$/u.test(text) && Boolean(following && !ADDRESS_STOP.test(following)
    && /\b(?:BARANGAY|BRGY|BGY|DINGALAN|AURORA)\b/i.test(following));
}

/** Read a contiguous address block without consuming the next personal field. */
export function printedAddress(rawText: string, lines: OcrTextLine[] = []): string {
  for (const label of lines.filter((line) => ADDRESS_LABEL.test(line.text))) {
    const pieces: string[] = [];
    const inline = addressPiece(label.text);
    if (inline && addressStart(inline)) pieces.push(inline);
    let bottom = label.top + label.height;
    const nearby = lines.filter((line) => line !== label && line.top >= label.top + label.height * 0.65
      && Math.abs(line.left - label.left) <= Math.max(55, label.height * 3)
      && line.top < label.top + Math.max(180, label.height * 14)).sort((a, b) => a.top - b.top || a.left - b.left);
    for (const [index, line] of nearby.entries()) {
      if (line.top - bottom > Math.max(48, line.height * 2.8)) break;
      if (ADDRESS_STOP.test(line.text) || ADDRESS_LABEL.test(line.text)) break;
      const value = addressPiece(line.text);
      if (!pieces.length && !addressStart(value)) continue;
      if (!value || (!addressLike(value) && !(pieces.length && wrappedLocalName(value, nearby[index + 1]?.text)))) break;
      pieces.push(value); bottom = line.top + line.height;
      if (pieces.length >= 5) break;
    }
    if (pieces.length) return pieces.join("\n");
  }
  const textLines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let index = 0; index < textLines.length; index++) {
    if (!ADDRESS_LABEL.test(textLines[index])) continue;
    const pieces: string[] = [];
    const inline = addressPiece(textLines[index]);
    if (inline && addressStart(inline)) pieces.push(inline);
    for (let next = index + 1; next < Math.min(textLines.length, index + 6); next++) {
      const line = textLines[next];
      if (!pieces.length && !ADDRESS_STOP.test(line) && !ADDRESS_LABEL.test(line) && !addressStart(line)) continue;
      if (ADDRESS_STOP.test(line) || ADDRESS_LABEL.test(line)
        || (!addressLike(line) && !(pieces.length && wrappedLocalName(line, textLines[next + 1])))) break;
      const value = addressPiece(line);
      if (value) pieces.push(value);
    }
    if (pieces.length) return pieces.join("\n");
  }
  return "";
}

export interface IdentityAddress { streetSitio: string; barangay: string }

/** Only a complete, bounded barangay name can match the form's Dingalan list. */
export function splitIdentityAddress(value: string): IdentityAddress {
  const text = normalize(value).replace(ADDRESS_LABEL, "");
  const markers = [...text.matchAll(BRGY)];
  const matches: Array<{ name: string; index: number }> = [];
  for (const marker of markers) {
    const index = marker.index!;
    const rest = text.slice(index + marker[0].length);
    const name = BARANGAYS.find((name) => new RegExp(`^${barangayPattern(name)}(?=$|[,;/.\\n]|\\s*$|\\s+(?:DINGALAN|AURORA|PHILIPPINES?|PHL)\\b)`).test(rest));
    if (name) matches.push({ name, index });
  }
  if (!markers.length) for (const name of BARANGAYS) {
    for (const match of text.matchAll(new RegExp(`\\b${barangayPattern(name)}\\b`, "g"))) {
      const before = text.slice(0, match.index);
      const after = text.slice(match.index! + match[0].length);
      if (/\b(?:SITIO|PUROK|PRK|STREET|ROAD)\s*$/i.test(before)) continue;
      // A standalone line/comma-delimited locality or a locality before Dingalan.
      if ((/(?:^|[,;\n])\s*$/.test(before) && /^(?:\s*[,;\n]|\s*$)/.test(after))
        || /^\s*[,;]?\s*DINGALAN\b/.test(after)) matches.push({ name, index: match.index! });
    }
  }
  // A unique near-match is only allowed in a bounded barangay position with an
  // explicit Dingalan locality. It remains OCR/Needs Review, never verification.
  if (!matches.length && /\bDINGALAN\b/.test(text)) {
    if (markers.length === 1) {
      const marker = markers[0];
      const candidate = trim(text.slice(marker.index! + marker[0].length).split(/[,;\n]|\bDINGALAN\b/)[0]);
      const name = nearBarangay(candidate);
      if (name) matches.push({ name, index: marker.index! });
    } else if (!markers.length) {
      const prefix = text.slice(0, text.indexOf("DINGALAN")).replace(/[\s,;]+$/, "");
      const candidate = prefix.split(/[,;\n]/).pop()!.trim();
      const name = nearBarangay(candidate);
      if (name) matches.push({ name, index: prefix.lastIndexOf(candidate) });
    }
  }
  const names = [...new Set(matches.map((match) => match.name))];
  const barangay = names.length === 1 && (!markers.length || markers.length === matches.length) ? names[0] : "";
  // Explicit barangay headings are a boundary even when the name is unreadable.
  const boundary = markers.length ? markers[0].index! : barangay ? matches[0].index : text.length;
  let local = text.slice(0, boundary);
  local = local.replace(/(?:^|[,;\n])\s*(?:\d{4}\s+)?(?:DINGALAN|AURORA|PHILIPPINES?|PHL)\b[\s\S]*$/i, "");
  // If the locality wasn't recognized, don't put it in the Purok/Sitio field.
  local = local.replace(/\s+\bDINGALAN\b[\s\S]*$/i, "");
  const streetSitio = trim(local).split(/\s*[,;\n]+\s*/).filter(Boolean).join(", ");
  return { streetSitio, barangay };
}

/** QR components stay within one address object; issuer/parent data is excluded. */
export function qrIdentityAddress(values: Record<string, string>): (IdentityAddress & { foreignLocality?: boolean }) | null {
  const safe = Object.entries(values).filter(([key]) => !/mother|father|parent|issuer|signature|birth.?place|place.?of.?birth|birth.?address/i.test(key));
  const keyName = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");
  const full = safe.find(([key, value]) => ["fulladdress", "address", "residenceaddress", "residentialaddress"].includes(keyName(key.split(".").pop()!)) && value.trim());
  if (full) return splitIdentityAddress(full[1]);
  const groups = new Map<string, Record<string, string>>();
  for (const [key, value] of safe) {
    const path = key.split(".");
    const leaf = keyName(path.pop()!);
    if (path.length && !path.some((part) => /^(?:address|residenceaddress|residentialaddress|homeaddress|presentaddress)$/i.test(keyName(part)))) continue;
    const group = groups.get(path.join(".")) || {};
    group[leaf] = value; groups.set(path.join("."), group);
  }
  for (const group of groups.values()) {
    const labeled = (label: string, value: string | undefined) => value ? new RegExp(`^${label}\\b`, "i").test(value.trim()) ? value : `${label} ${value}` : "";
    const local = [group.housenumber, group.unit, labeled("BLOCK", group.block), labeled("LOT", group.lot), labeled("PUROK", group.purok), labeled("SITIO", group.sitio), group.streetsitio, group.street || group.streetaddress, group.subdivision].filter(Boolean);
    const rawBarangay = group.barangay || group.brgy || "";
    if (!local.length && !rawBarangay) continue;
    const parsed = splitIdentityAddress([...new Set(local), rawBarangay ? "BARANGAY " + rawBarangay : ""].filter(Boolean).join(", "));
    const city = group.municipality || group.citymunicipality || group.city || "";
    if (city && !/^(?:MUNICIPALITY OF\s+)?DINGALAN$/i.test(city.trim())) return { ...parsed, barangay: "", foreignLocality: true };
    return parsed;
  }
  return null;
}

export function readIdentityAddress(rawText: string, lines: OcrTextLine[], values: Record<string, string>): IdentityAddress {
  const printed = splitIdentityAddress(printedAddress(rawText, lines));
  const qr = qrIdentityAddress(values);
  // Missing QR components can be filled by the printed address, unless locality conflicts.
  if (!qr) return printed;
  if (qr.foreignLocality) return { streetSitio: qr.streetSitio, barangay: "" };
  const sameLocality = !qr.barangay || !printed.barangay || qr.barangay === printed.barangay;
  return { streetSitio: qr.streetSitio || (sameLocality ? printed.streetSitio : ""), barangay: qr.barangay || printed.barangay };
}
