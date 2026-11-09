import JSZip from "jszip";
import { readFile } from "fs/promises";
import path from "path";
import { buildBarangayCompletionDays, completionBarangay, type CompletionProgram } from "./accomplishment-work-schedule";
import { appendPhotoDocumentation, barangayDocumentationPhotos, type PhotoLoader, type ReportPhoto } from "./completion-report-photos";

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

// Explicit wrapping and continuation rows avoid Excel's 409-point row-height limit.
// Only the original two-column accomplishment table grows; no roster or extra columns.
function wrapLines(text: string): string[] {
  return text.split("\n").flatMap(line => {
    const lines: string[] = [];
    let remaining = line;
    while (remaining.length > 46) {
      const space = remaining.lastIndexOf(" ", 46);
      const end = space > 0 ? space : 46;
      lines.push(remaining.slice(0, end));
      remaining = remaining.slice(end).trimStart();
    }
    lines.push(remaining);
    return lines;
  });
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
export async function populateCompletionReport(program: ReportProgram, loadPhoto: PhotoLoader): Promise<Buffer> {
  const zip = await JSZip.loadAsync(await templateBuffer());
  const stringsXml = await zip.file("xl/sharedStrings.xml")!.async("string");
  const sourceStrings = [...stringsXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(match => match[1]);
  const strings = sourceStrings.map(raw => [...raw.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(text => decodeXml(text[1])).join(""));
  const workbookXml = await zip.file("xl/workbook.xml")!.async("string");
  const relationships = await zip.file("xl/_rels/workbook.xml.rels")!.async("string");
  const targets = new Map([...relationships.matchAll(/<Relationship\b[^>]*\/>/g)].map(match => [attribute(match[0], "Id"), attribute(match[0], "Target")]));
  const issueParts = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }).formatToParts(new Date());
  const issuePart = (type: string) => issueParts.find(part => part.type === type)?.value || "";
  const issueDay = Number(issuePart("day"));
  const ordinal = issueDay % 100 >= 11 && issueDay % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[issueDay % 10] || "th";

  for (const sheet of workbookXml.matchAll(/<sheet\b[^>]*\/>/g)) {
    const barangay = decodeXml(attribute(sheet[0], "name"));
    const target = targets.get(attribute(sheet[0], "r:id"));
    if (!target) throw new Error(`Missing completion template worksheet: ${barangay}`);
    const file = target.startsWith("/") ? target.slice(1) : path.posix.normalize("xl/" + target);
    if (!/^xl\/worksheets\/[^/]+\.xml$/.test(file)) throw new Error("Invalid completion worksheet path");
    let xml = await zip.file(file)!.async("string");
    const sourceCells = [...xml.matchAll(/<c\b[^>]*\br="([A-Z]+\d+)"[^>]*t="s"[^>]*><v>(\d+)<\/v><\/c>/g)].map(match => ({ address: match[1], text: strings[Number(match[2])] || "", runs: sourceStrings[Number(match[2])] }));
    const dayCells = sourceCells.filter(cell => /^B\d+$/.test(cell.address) && /^Day \d+\b/.test(cell.text));
    if (dayCells.length !== 10) throw new Error(`Invalid daily table in ${barangay} completion template`);
    const firstRow = Number(dayCells[0].address.slice(1));
    const lastRow = firstRow + 9;
    const oldRows = [...xml.matchAll(/<row\b[^>]*\br="(\d+)"[^>]*>[\s\S]*?<\/row>/g)].filter(match => Number(match[1]) >= firstRow && Number(match[1]) <= lastRow);
    const days = buildBarangayCompletionDays(program, barangay);
    const reportRows = days.flatMap(day => {
      const lines = wrapLines(day.accomplishment);
      const chunks = [];
      for (let index = 0; index < lines.length; index += 25) chunks.push({
        label: `Day ${day.dayNumber}` + (day.workDate ? ` (${displayDate(day.workDate)})` : "") + (index ? " (continued)" : ""),
        text: lines.slice(index, index + 25).join("\n"),
        lines: Math.min(25, lines.length - index),
      });
      return chunks;
    });
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
      const height = Math.max(Number(attribute(row, "ht")) || 39, entry.lines * 13 + 8);
      return row.replace(/<row\b([^>]*)>/, (_, attrs: string) => `<row${attrs.replace(/\s+(?:ht|customHeight)="[^"]*"/g, "")} ht="${height}" customHeight="1">`);
    }).join("");
    // These ten rows are consecutive in the original template.
    const first = xml.indexOf(oldRows[0][0]);
    const end = xml.indexOf(oldRows[9][0]) + oldRows[9][0].length;
    if (first < 0 || end < first) throw new Error("Completion template daily rows could not be located");
    xml = xml.slice(0, first) + generated + xml.slice(end);

    const people = program.programBeneficiaries.filter(pb => completionBarangay(pb.beneficiary.barangay) === completionBarangay(barangay));
    const name = barangay.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
    const setLabeledCell = (address: string, label: string, value: string) => {
      const runs = sourceCells.find(cell => cell.address === address)?.runs;
      let index = 0;
      // Keep the source's bold label and underlined, regular-weight value font.
      const styled = runs?.includes("<r>") ? runs.replace(/<t\b[^>]*>[\s\S]*?<\/t>/g, text => index++ === 0 ? text : `<t xml:space="preserve">${escapeXml(value)}</t>`) : undefined;
      xml = setCell(xml, address, label + value, styled);
    };
    setLabeledCell("A5", "Project Location: ", `Brgy. ${name}, ${program.municipality || "Dingalan"}, ${program.province || "Aurora"}`);
    setLabeledCell("A6", "No. of Beneficiaries: ", String(people.length));
    const scheduledDates = program.workDays.map(day => day.workDate).filter(Boolean).sort();
    const start = displayDate(program.startDate || scheduledDates[0]);
    const endDate = displayDate(program.endDate || scheduledDates[scheduledDates.length - 1]);
    setLabeledCell("A7", "Period of Work: ", [start, endDate].filter(Boolean).join(" to "));
    if (program.doleOffice?.trim()) setLabeledCell("A4", "DOLE-Regional Office: ", program.doleOffice.trim());
    const issueCell = sourceCells.find(cell => /Issued this/.test(cell.text));
    if (issueCell) {
      const parts = ["           Issued this ", `${issueDay}${ordinal}`, " day of ", issuePart("month"), ` ${issuePart("year")}.`];
      let index = 0;
      const styled = issueCell.runs.replace(/<t\b[^>]*>[\s\S]*?<\/t>/g, () => `<t xml:space="preserve">${escapeXml(parts[index++] || "")}</t>`);
      xml = setCell(xml, shiftRef(issueCell.address), parts.join(""), styled);
    }
    const documentationCaption = sourceCells.find(cell => /Before, during work, and after/i.test(cell.text));
    if (!documentationCaption) throw new Error(`Missing Photo Documentation section in ${barangay} completion template`);
    const captionRow = Number(shiftRef(documentationCaption.address).replace(/^[A-Z]+/, ""));
    xml = await appendPhotoDocumentation(zip, xml, file, captionRow, barangayDocumentationPhotos(program, barangay), loadPhoto);
    zip.file(file, xml);
  }
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
