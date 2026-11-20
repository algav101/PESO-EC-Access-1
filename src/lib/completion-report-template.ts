import JSZip from "jszip";
import { readFile } from "fs/promises";
import path from "path";
import { buildBarangayCompletionDays, completionBarangay, type CompletionProgram } from "./accomplishment-work-schedule";
import {
  appendPhotoDocumentation,
  barangayDocumentationPhotos,
  type DocumentationPhoto,
  type PhotoLayoutOptions,
  type PhotoLoader,
  type ReportPhoto,
} from "./completion-report-photos";

export interface BarangayReportDayEdit {
  label: string;
  text: string;
}

export interface BarangayReportEdit {
  doleOffice?: string;
  projectLocation?: string;
  beneficiaryCount?: string;
  periodOfWork?: string;
  issuedLine?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  days?: BarangayReportDayEdit[];
}

export interface ReportLayoutSettings {
  colCWidth?: number;
  textAlign?: "left" | "center" | "justify";
  photoLayout?: "1-col" | "2-col" | "3-col";
  photoSize?: "compact" | "medium" | "large";
}

export interface CompletionReportOptions {
  selectedBarangays?: string[];
  customPhotosByBarangay?: Map<string, DocumentationPhoto[]>;
  barangayEdits?: Record<string, BarangayReportEdit>;
  layout?: ReportLayoutSettings;
}

interface ReportProgram extends CompletionProgram {
  accomplishmentPhotos: ReportPhoto[];
  startDate: string | null;
  endDate: string | null;
  municipality: string;
  province: string;
  doleOffice: string | null;
}
const escapeXml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const decodeXml = (value: string) => value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const attribute = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] || "";

function setCell(xml: string, address: string, text: string, richText?: string): string {
  let found = false;
  const result = xml.replace(new RegExp(`<c\\b([^>]*\\br="${address}"[^>]*)(?:\\/>|>[\\s\\S]*?<\\/c>)`), (_, attrs: string) => {
    found = true;
    return `<c${attrs.replace(/\s+t="[^"]*"/g, "")} t="inlineStr"><is>${richText || `<t xml:space="preserve">${escapeXml(text)}</t>`}</is></c>`;
  });
  if (!found) throw new Error(`Completion template is missing cell ${address}`);
  return result;
}

function displayDate(raw?: string | null): string {
  if (!raw || !/^\d{4}-\d{2}-\d{2}/.test(raw)) return "";
  const date = new Date(raw.slice(0, 10) + "T00:00:00Z");
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
}

// Estimate visual wrapped line count without inserting artificial hard line breaks,
// allowing Excel's native wrapText="1" to flow cleanly across whatever column width is set.
function estimateWrappedLines(text: string, charsPerLine: number): number {
  const safeLimit = Math.max(30, charsPerLine);
  return text.split("\n").reduce((total, paragraph) => {
    if (!paragraph.trim()) return total + 1;
    return total + Math.max(1, Math.ceil(paragraph.length / safeLimit));
  }, 0);
}

// Split only truly massive day text (> 22 visual lines) across continuation rows to stay well under Excel's 409pt row height limit.
function chunkAccomplishmentParagraphs(
  label: string,
  text: string,
  charsPerLine: number
): Array<{ label: string; text: string; lines: number }> {
  const normalized = text.replace(/\r\n/g, "\n");
  const totalLines = estimateWrappedLines(normalized, charsPerLine);
  if (totalLines <= 22) {
    return [{ label, text: normalized, lines: totalLines }];
  }

  const paragraphs = normalized.split("\n");
  const chunks: Array<{ label: string; text: string; lines: number }> = [];
  let bucket: string[] = [];
  let bucketLines = 0;

  for (const para of paragraphs) {
    const pLines = estimateWrappedLines(para, charsPerLine);
    if (bucket.length > 0 && bucketLines + pLines > 22) {
      chunks.push({
        label: chunks.length === 0 ? label : `${label} (continued)`,
        text: bucket.join("\n"),
        lines: bucketLines,
      });
      bucket = [para];
      bucketLines = pLines;
    } else {
      bucket.push(para);
      bucketLines += pLines;
    }
  }
  if (bucket.length > 0) {
    chunks.push({
      label: chunks.length === 0 ? label : `${label} (continued)`,
      text: bucket.join("\n"),
      lines: Math.max(1, bucketLines),
    });
  }
  return chunks.length ? chunks : [{ label, text: "", lines: 1 }];
}

async function ensureAccomplishmentCellStyle(
  zip: JSZip,
  sourceStyleIdx: string,
  horizontalAlign: "left" | "center" | "justify"
): Promise<string> {
  let styles = await zip.file("xl/styles.xml")!.async("string");
  const formats = styles.match(/<cellXfs count="(\d+)">([\s\S]*?)<\/cellXfs>/);
  if (!formats) return sourceStyleIdx;
  const cells = [...formats[2].matchAll(/<xf\b[^>]*(?:\/>|>[\s\S]*?<\/xf>)/g)].map((m) => m[0]);
  const base = cells[Number(sourceStyleIdx)];
  if (!base) return sourceStyleIdx;

  let style = base.replace(/\s+applyAlignment="[^"]*"/, "");
  style = style.replace(/^<xf\b/, '<xf applyAlignment="1"');
  style = style.replace(/<alignment\b[^>]*\/>/, "");
  if (style.endsWith("/>")) style = style.slice(0, -2) + "></xf>";
  style = style.replace(
    "</xf>",
    `<alignment horizontal="${horizontalAlign}" vertical="top" wrapText="1"/></xf>`
  );

  const existing = cells.indexOf(style);
  if (existing >= 0) return String(existing);

  styles = styles.replace(
    formats[0],
    `<cellXfs count="${cells.length + 1}">${formats[2]}${style}</cellXfs>`
  );
  zip.file("xl/styles.xml", styles);
  return String(cells.length);
}

async function templateBuffer(): Promise<Buffer> {
  const candidates = [
    path.join(process.cwd(), "public/templates/tupad-completion-report.xlsx"),
    path.join(__dirname, "../../public/templates/tupad-completion-report.xlsx"),
  ];
  for (const file of candidates) {
    try { return await readFile(file); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  throw new Error("The TUPAD Completion Report template is not available on this server.");
}

/** Patch values in the supplied workbook, retaining its styles, layout and native parts. */
export async function populateCompletionReport(
  program: ReportProgram,
  loadPhoto: PhotoLoader,
  options: CompletionReportOptions = {}
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(await templateBuffer());
  const stringsXml = await zip.file("xl/sharedStrings.xml")!.async("string");
  const sourceStrings = [...stringsXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(match => match[1]);
  const strings = sourceStrings.map(raw => [...raw.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(text => decodeXml(text[1])).join(""));
  let workbookXml = await zip.file("xl/workbook.xml")!.async("string");
  let relationships = await zip.file("xl/_rels/workbook.xml.rels")!.async("string");
  const targets = new Map([...relationships.matchAll(/<Relationship\b[^>]*\/>/g)].map(match => [attribute(match[0], "Id"), attribute(match[0], "Target")]));
  const issueParts = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }).formatToParts(new Date());
  const issuePart = (type: string) => issueParts.find(part => part.type === type)?.value || "";
  const issueDay = Number(issuePart("day"));
  const ordinal = issueDay % 100 >= 11 && issueDay % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[issueDay % 10] || "th";

  const selectedBarangaySet =
    options.selectedBarangays && options.selectedBarangays.length > 0
      ? new Set(options.selectedBarangays.map(b => completionBarangay(b)).filter(Boolean))
      : null;

  const allSheets = [...workbookXml.matchAll(/<sheet\b[^>]*\/>/g)].map(match => ({
    tag: match[0],
    barangay: decodeXml(attribute(match[0], "name")),
    rId: attribute(match[0], "r:id"),
  }));

  const keptSheets = selectedBarangaySet
    ? allSheets.filter(s => selectedBarangaySet.has(completionBarangay(s.barangay)))
    : allSheets;
  const droppedSheets = selectedBarangaySet
    ? allSheets.filter(s => !selectedBarangaySet.has(completionBarangay(s.barangay)))
    : [];

  if (keptSheets.length === 0) {
    throw new Error("Please select at least one valid Dingalan barangay to export.");
  }

  // Cleanly remove unselected barangay worksheets so Excel opens without repair warnings.
  if (droppedSheets.length > 0) {
    let contentTypes = await zip.file("[Content_Types].xml")!.async("string");
    for (const dropped of droppedSheets) {
      workbookXml = workbookXml.replace(dropped.tag, "");
      relationships = relationships.replace(
        new RegExp(`<Relationship\\b[^>]*\\bId="${dropped.rId}"[^>]*\\/>`),
        ""
      );
      const target = targets.get(dropped.rId);
      if (target) {
        const sheetPath = target.startsWith("/") ? target.slice(1) : path.posix.normalize("xl/" + target);
        const relPath = path.posix.join(path.posix.dirname(sheetPath), "_rels", path.posix.basename(sheetPath) + ".rels");
        zip.remove(sheetPath);
        if (zip.file(relPath)) zip.remove(relPath);
        contentTypes = contentTypes.replace(
          new RegExp(`<Override\\b[^>]*\\bPartName="/${sheetPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*\\/>`),
          ""
        );
      }
    }

    // Reset activeTab & firstSheet to index 0 so Excel never points past the kept sheets.
    workbookXml = workbookXml.replace(/<workbookView\b([^>]*)\/>/, (_, attrs: string) => {
      let cleaned = attrs
        .replace(/\s+firstSheet="[^"]*"/g, "")
        .replace(/\s+activeTab="[^"]*"/g, "");
      return `<workbookView${cleaned} firstSheet="0" activeTab="0"/>`;
    });

    zip.file("xl/workbook.xml", workbookXml);
    zip.file("xl/_rels/workbook.xml.rels", relationships);
    zip.file("[Content_Types].xml", contentTypes);

    // Update docProps/app.xml sheet count and TitlesOfParts vector.
    const appFile = zip.file("docProps/app.xml");
    if (appFile) {
      let appXml = await appFile.async("string");
      appXml = appXml.replace(
        /(<vt:lpstr>Worksheets<\/vt:lpstr><\/vt:variant><vt:variant><vt:i4>)\d+(<\/vt:i4>)/,
        `$1${keptSheets.length}$2`
      );
      appXml = appXml.replace(
        /<TitlesOfParts><vt:vector\b[^>]*>[\s\S]*?<\/vt:vector><\/TitlesOfParts>/,
        `<TitlesOfParts><vt:vector size="${keptSheets.length}" baseType="lpstr">${keptSheets
          .map(s => `<vt:lpstr>${escapeXml(s.barangay)}</vt:lpstr>`)
          .join("")}</vt:vector></TitlesOfParts>`
      );
      zip.file("docProps/app.xml", appXml);
    }
  }

  // Normalize barangayEdits keys so matching works with Title Case or UPPERCASE keys
  const normalizedEdits = new Map<string, BarangayReportEdit>();
  if (options.barangayEdits) {
    for (const [k, v] of Object.entries(options.barangayEdits)) {
      const norm = completionBarangay(k);
      if (norm && v) normalizedEdits.set(norm, v);
    }
  }

  const desiredColCWidth = options.layout?.colCWidth && options.layout.colCWidth >= 35 && options.layout.colCWidth <= 120
    ? options.layout.colCWidth
    : 68;
  const desiredTextAlign: "left" | "center" | "justify" = options.layout?.textAlign || "left";
  const desiredPhotoLayout = options.layout?.photoLayout || "1-col";
  const desiredPhotoSize = options.layout?.photoSize || "medium";

  for (let sheetIndex = 0; sheetIndex < keptSheets.length; sheetIndex++) {
    const sheet = keptSheets[sheetIndex];
    const barangay = sheet.barangay;
    const brgyKey = completionBarangay(barangay);
    const brgyEdit = normalizedEdits.get(brgyKey);
    const target = targets.get(sheet.rId);
    if (!target) throw new Error(`Missing completion template worksheet: ${barangay}`);
    const file = target.startsWith("/") ? target.slice(1) : path.posix.normalize("xl/" + target);
    if (!/^xl\/worksheets\/[^/]+\.xml$/.test(file)) throw new Error("Invalid completion worksheet path");
    let xml = await zip.file(file)!.async("string");

    // Ensure tabSelected is strictly set on the first kept sheet when filtering barangays.
    if (droppedSheets.length > 0) {
      xml = xml.replace(/<sheetView\b([^>]*?)(\/?>)/, (_, attrs: string, close: string) => {
        const cleaned = attrs.replace(/\s+tabSelected="[^"]*"/g, "");
        return sheetIndex === 0
          ? `<sheetView${cleaned} tabSelected="1"${close}`
          : `<sheetView${cleaned}${close}`;
      });
    }

    // Apply Column C width so accomplishment text flows cleanly across the full table width.
    const colBWidthMatch = xml.match(/<col\b[^>]*min="2"[^>]*width="([^"]+)"/);
    const colBWidth = colBWidthMatch ? Number(colBWidthMatch[1]) || 35 : 35;
    xml = xml.replace(/<col\b([^>]*min="3"[^>]*)\/>/, (full, attrs: string) => {
      if (/\bwidth="[^"]*"/.test(attrs)) {
        return `<col${attrs.replace(/\bwidth="[^"]*"/, `width="${desiredColCWidth}"`)}/>`;
      }
      return full;
    });

    const sourceCells = [...xml.matchAll(/<c\b[^>]*\br="([A-Z]+\d+)"[^>]*t="s"[^>]*><v>(\d+)<\/v><\/c>/g)].map(match => ({ address: match[1], text: strings[Number(match[2])] || "", runs: sourceStrings[Number(match[2])] }));
    const dayCells = sourceCells.filter(cell => /^B\d+$/.test(cell.address) && /^Day \d+\b/.test(cell.text));
    if (dayCells.length !== 10) throw new Error(`Invalid daily table in ${barangay} completion template`);
    const firstRow = Number(dayCells[0].address.slice(1));
    const lastRow = firstRow + 9;
    const oldRows = [...xml.matchAll(/<row\b[^>]*\br="(\d+)"[^>]*>[\s\S]*?<\/row>/g)].filter(match => Number(match[1]) >= firstRow && Number(match[1]) <= lastRow);

    // Ensure Column C accomplishment cell style uses native wrapText + desired alignment (default left-aligned, top-aligned)
    const origColCStyle = oldRows[0]?.[0].match(new RegExp(`<c\\b[^>]*r="C${firstRow}"[^>]*s="(\\d+)"`))?.[1] || "19";
    const alignedColCStyle = await ensureAccomplishmentCellStyle(zip, origColCStyle, desiredTextAlign);

    const charsPerLine = Math.max(40, Math.floor(desiredColCWidth * 0.92));
    const sourceDays: Array<{ label: string; text: string }> =
      brgyEdit?.days && brgyEdit.days.length > 0
        ? brgyEdit.days.map((d) => ({ label: d.label || "", text: d.text || "" }))
        : buildBarangayCompletionDays(program, barangay).map((day) => ({
            label: `Day ${day.dayNumber}` + (day.workDate ? ` (${displayDate(day.workDate)})` : ""),
            text: day.accomplishment,
          }));

    const reportRows = sourceDays.flatMap((entry) =>
      chunkAccomplishmentParagraphs(entry.label, entry.text, charsPerLine)
    );
    // For a shorter program, blank unused reference rows rather than keeping old sample data.
    while (reportRows.length < 10) reportRows.push({ label: "", text: "", lines: 1 });
    const delta = reportRows.length - 10;
    const shiftRef = (ref: string) => ref.replace(/([A-Z]+)(\d+)/g, (_, column, number) => column + (Number(number) > lastRow ? Number(number) + delta : Number(number)));
    if (delta) {
      xml = xml.replace(/<row\b[^>]*\br="(\d+)"[^>]*>[\s\S]*?<\/row>/g, (row, number) => Number(number) > lastRow
        ? row.replace(/\br="([A-Z]*)(\d+)"/g, (_: string, column: string, value: string) => `r="${column}${Number(value) + delta}"`) : row);
      xml = xml.replace(/\bref="([A-Z]+\d+(?::[A-Z]+\d+)?)"/g, (_, ref) => `ref="${shiftRef(ref)}"`);
    }
    const generated = reportRows.map((entry, index) => {
      const number = firstRow + index;
      let row = oldRows[Math.min(index, 9)][0].replace(/\br="([A-Z]*)(\d+)"/g, (_, column) => `r="${column}${number}"`);
      row = setCell(setCell(row, `B${number}`, entry.label), `C${number}`, entry.text);
      // Apply chosen horizontal alignment + wrapText to Column C
      row = row.replace(
        new RegExp(`(<c\\b[^>]*r="C${number}"[^>]*\\bs=")\\d+(")`),
        `$1${alignedColCStyle}$2`
      );
      const height = Math.min(400, Math.max(Number(attribute(row, "ht")) || 39, entry.lines * 15 + 14));
      return row.replace(/<row\b([^>]*)>/, (_, attrs: string) => `<row${attrs.replace(/\s+(?:ht|customHeight)="[^"]*"/g, "")} ht="${height}" customHeight="1">`);
    }).join("");
    // These ten rows are consecutive in the original template.
    const first = xml.indexOf(oldRows[0][0]);
    const end = xml.indexOf(oldRows[9][0]) + oldRows[9][0].length;
    if (first < 0 || end < first) throw new Error("Completion template daily rows could not be located");
    xml = xml.slice(0, first) + generated + xml.slice(end);

    const people = program.programBeneficiaries.filter(pb => completionBarangay(pb.beneficiary.barangay) === brgyKey);
    const name = barangay.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
    const setLabeledCell = (address: string, label: string, value: string) => {
      const runs = sourceCells.find(cell => cell.address === address)?.runs;
      let index = 0;
      // Keep the source's bold label and underlined, regular-weight value font.
      const styled = runs?.includes("<r>") ? runs.replace(/<t\b[^>]*>[\s\S]*?<\/t>/g, text => index++ === 0 ? text : `<t xml:space="preserve">${escapeXml(value)}</t>`) : undefined;
      xml = setCell(xml, address, label + value, styled);
    };
    const defaultLocation = `Brgy. ${name}, ${program.municipality || "Dingalan"}, ${program.province || "Aurora"}`;
    const scheduledDates = program.workDays.map(day => day.workDate).filter(Boolean).sort();
    const start = displayDate(program.startDate || scheduledDates[0]);
    const endDate = displayDate(program.endDate || scheduledDates[scheduledDates.length - 1]);
    const defaultPeriod = [start, endDate].filter(Boolean).join(" to ");
    const defaultDoleOffice = program.doleOffice?.trim() || "";

    setLabeledCell("A5", "Project Location: ", brgyEdit?.projectLocation?.trim() || defaultLocation);
    setLabeledCell("A6", "No. of Beneficiaries: ", brgyEdit?.beneficiaryCount?.trim() || String(people.length));
    setLabeledCell("A7", "Period of Work: ", brgyEdit?.periodOfWork?.trim() || defaultPeriod);
    const finalDoleOffice = brgyEdit?.doleOffice?.trim() || defaultDoleOffice;
    if (finalDoleOffice) setLabeledCell("A4", "DOLE-Regional Office: ", finalDoleOffice);

    const issueCell = sourceCells.find(cell => /Issued this/.test(cell.text));
    if (issueCell) {
      if (brgyEdit?.issuedLine?.trim()) {
        xml = setCell(xml, shiftRef(issueCell.address), "           " + brgyEdit.issuedLine.trim());
      } else {
        const parts = ["           Issued this ", `${issueDay}${ordinal}`, " day of ", issuePart("month"), ` ${issuePart("year")}.`];
        let index = 0;
        const styled = issueCell.runs.replace(/<t\b[^>]*>[\s\S]*?<\/t>/g, () => `<t xml:space="preserve">${escapeXml(parts[index++] || "")}</t>`);
        xml = setCell(xml, shiftRef(issueCell.address), parts.join(""), styled);
      }
    }

    if (brgyEdit?.signatoryName?.trim()) {
      const sigNameCell = sourceCells.find(cell => /GAVIOLA/i.test(cell.text));
      if (sigNameCell) {
        xml = setCell(xml, shiftRef(sigNameCell.address), brgyEdit.signatoryName.trim());
      }
    }
    if (brgyEdit?.signatoryTitle?.trim()) {
      const sigTitleCell = sourceCells.find(cell => /PESO Manager/i.test(cell.text));
      if (sigTitleCell) {
        xml = setCell(xml, shiftRef(sigTitleCell.address), brgyEdit.signatoryTitle.trim());
      }
    }

    const documentationCaption = sourceCells.find(cell => /Before, during work, and after/i.test(cell.text));
    if (!documentationCaption) throw new Error(`Missing Photo Documentation section in ${barangay} completion template`);
    const captionRow = Number(shiftRef(documentationCaption.address).replace(/^[A-Z]+/, ""));
    const photosForSheet = options.customPhotosByBarangay
      ? options.customPhotosByBarangay.get(brgyKey) || []
      : barangayDocumentationPhotos(program, barangay);
    const photoLayoutOpts: PhotoLayoutOptions = {
      layout: desiredPhotoLayout,
      photoSize: desiredPhotoSize,
      colBWidth,
      colCWidth: desiredColCWidth,
    };
    xml = await appendPhotoDocumentation(zip, xml, file, captionRow, photosForSheet, loadPhoto, photoLayoutOpts);
    zip.file(file, xml);
  }
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
