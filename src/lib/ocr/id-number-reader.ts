import type { OcrTextLine } from "./application-id-mapper.ts";

export const normalizeNumberText = (value: string) => value.toUpperCase()
  .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D_|]/g, "-")
  .replace(/[\u00a0\u2007\u202f\t]/g, " ").trim();
const numericGlyphs = /^[0-9OQILSBZGD .-]+$/;

/** Rejoin fragments on the same visual baseline, never across unrelated columns. */
export function identityNumberRows(lines: OcrTextLine[]): OcrTextLine[] {
  const rows: OcrTextLine[][] = [];
  const seen = new Set<string>();
  for (const line of [...lines].sort((a, b) => a.top - b.top || a.left - b.left)) {
    const text = normalizeNumberText(line.text);
    if (!text || !/\d/.test(text) || !numericGlyphs.test(text)) continue;
    const key = `${text}:${Math.round(line.left)}:${Math.round(line.top)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const row = rows.find((row) => {
      const previous = row[row.length - 1];
      const centerGap = Math.abs(line.top + line.height / 2 - previous.top - previous.height / 2);
      return centerGap < Math.max(line.height, previous.height) * 0.65;
    });
    if (row) row.push(line); else rows.push([line]);
  }
  const segments = rows.flatMap((row) => {
    const segments: OcrTextLine[][] = [];
    for (const line of row.sort((a, b) => a.left - b.left)) {
      const current = segments[segments.length - 1];
      const previous = current?.[current.length - 1];
      const gap = previous ? line.left - previous.left - previous.width : Infinity;
      if (previous && gap >= -2 && gap < Math.max(line.height, previous.height) * 6) current.push(line);
      else segments.push([line]);
    }
    return segments;
  });
  return segments.map((row) => {
    const left = Math.min(...row.map((line) => line.left)), top = Math.min(...row.map((line) => line.top));
    return { text: row.map((line) => normalizeNumberText(line.text)).join(" "), left, top,
      width: Math.max(...row.map((line) => line.left + line.width)) - left,
      height: Math.max(...row.map((line) => line.top + line.height)) - top,
      confidence: Math.min(...row.map((line) => line.confidence ?? 0)) };
  });
}

// Agency lengths are parsing constraints, not authentication/checksum verification.
// Sources: PSA PCN advisory; SSS My.SSS guide; PhilHealth circular 2019-0002;
// Pag-IBIG Member's Data Form (TIN/CRN/MID). Preserve, never manufacture, digits.
const NUMERIC_FORMATS: Record<string, { lengths: number[]; groups: number[] }> = {
  "SSS ID": { lengths: [10], groups: [2, 7, 1] },
  "UMID": { lengths: [12], groups: [4, 7, 1] },
  "TIN ID": { lengths: [9, 12], groups: [3, 3, 3, 3] },
  "PHILHEALTH ID": { lengths: [12], groups: [2, 9, 1] },
  "PAGIBIG ID": { lengths: [12], groups: [4, 4, 4] },
};

function numericNumber(value: string, type: string): string {
  const format = NUMERIC_FORMATS[type];
  if (!format || !numericGlyphs.test(value)) return "";
  const glyphs = value.replace(/[ .-]/g, "");
  if (!format.lengths.includes(glyphs.length) || (glyphs.match(/\d/g) || []).length < glyphs.length - 2) return "";
  const digits = glyphs.replace(/[OQD]/g, "0").replace(/[IL]/g, "1").replace(/Z/g, "2").replace(/S/g, "5").replace(/G/g, "6").replace(/B/g, "8");
  let offset = 0;
  return format.groups.map((length) => { const part = digits.slice(offset, offset + length); offset += length; return part; }).filter(Boolean).join("-");
}

/** Labeled numbers may be agency-specific; unlabeled fallback requires a known shape. */
export function extractProfileNumber(value: string, type: string, labeled = false, lines: OcrTextLine[] = []): string {
  const blocked = /\b(?:CONTACT|PHONE|MOBILE|TELEPHONE|TEL|RECEIPT|PRECINCT|BIRTH|EXPIRY|ISSUED)\b/i;
  const visualRows = identityNumberRows(lines).filter((row) => !lines.some((label) => blocked.test(label.text)
    && Math.abs(row.left - label.left) < Math.max(80, label.height * 4)
    && row.top >= label.top - label.height && row.top <= label.top + label.height * 4));
  const rows = [...normalizeNumberText(value).split(/\r?\n/), ...visualRows.map((line) => line.text)];
  const candidates = new Set<string>();
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index].replace(/^[\s:#.-]+|[\s:#.-]+$/g, "").replace(/^[)\]]\s*[:#.-]?\s*/, "");
    if (!row || /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$|^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(row)) continue;
    if (!labeled && blocked.test(rows[index - 1] || "")) continue;
    if (type === "DRIVER LICENSE ID") {
      // Read the license token, not the expiry date printed beside it. Limited
      // glyph correction is confined to numeric positions; no missing digits.
      for (const match of row.matchAll(/(?<![A-Z0-9])([A-Z])([0-9OQILSB]{2})[ .-]?([0-9OQILSB]{2})[ .-]?([0-9OQILSB]{6})(?![A-Z0-9])/g)) {
        const digits = match[2] + match[3] + match[4];
        if ((digits.match(/\d/g) || []).length < 8) continue;
        const normalize = (part: string) => part.replace(/[OQ]/g, "0").replace(/[IL]/g, "1").replace(/S/g, "5").replace(/B/g, "8");
        candidates.add(`${match[1]}${normalize(match[2])}-${normalize(match[3])}-${normalize(match[4])}`);
      }
      continue;
    }
    if (NUMERIC_FORMATS[type]) {
      const number = numericNumber(row, type);
      // Don't mistake a bare Philippine mobile number for an unlabeled SSS number.
      if (number && (labeled || !/^09\d{8}$/.test(row))) candidates.add(number);
    } else if (labeled && /^[A-Z0-9][A-Z0-9 ./-]{3,29}$/.test(row) && /\d/.test(row)
      && !/\b(?:DATE|BIRTH|EXPIRY|ISSUE|ADDRESS|PHONE|MOBILE|PUROK|SITIO|BARANGAY|BRGY|STREET|PRECINCT|RECEIPT|TEL)\b/.test(row)) candidates.add(row);
    else if (type === "DRIVER LICENSE ID" && /^[A-Z]\d{2}[ -]?\d{2}[ -]?\d{6}$/.test(row)) candidates.add(row.replace(/\s/g, "-"));
    else if (type === "PASSPORT" && /^[A-Z]\d{7}[A-Z]$/.test(row)) candidates.add(row);
  }
  return candidates.size === 1 ? [...candidates][0] : "";
}
