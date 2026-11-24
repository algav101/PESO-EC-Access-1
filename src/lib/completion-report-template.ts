import JSZip from "jszip";
import { readFile } from "fs/promises";
import path from "path";
import { DINGALAN_BARANGAYS } from "./utils";
import { buildBarangayCompletionDays, completionBarangay, type CompletionProgram } from "./accomplishment-work-schedule";
import {
  barangayDocumentationPhotos,
  dimensions,
  imageBytes,
  type DocumentationPhoto,
  type PhotoLoader,
  type ReportPhoto,
} from "./completion-report-photos";

export interface BarangayReportDayEdit {
  dayNumber?: number;
  label: string;
  text: string;
}

export interface BarangayReportEdit {
  barangayHeader?: string;
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
  photoFitMode?: "fill" | "contain";
  includeEmptyDays?: boolean;
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

const REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_NS = "http://schemas.openxmlformats.org/package/2006/relationships";

// Exact photo slot geometry from the uploaded POBLACION sheet (landscape Folio 8.5" x 13", 6 photos/page):
// Photo columns: A (col 0), C (col 2), E (col 4) with width 50.5703125 (~372px = 3,543,300 EMU)
// Photo rows: row +6 (row 7) and row +8 (row 9) with height 212.65pt (~282px = 2,686,050 EMU)
const SLOT_WIDTH_EMU = 3543300;
const SLOT_HEIGHT_EMU = 2686050;
const PHOTO_ROW_HEIGHT_PT = 212.65;
const PHOTO_COL_WIDTH = 50.5703125;
const SPACER_COL_WIDTH = 2.42578125;

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

function displayDateUpper(raw?: string | null): string {
  if (!raw || !/^\d{4}-\d{2}-\d{2}/.test(raw)) return "";
  const date = new Date(raw.slice(0, 10) + "T00:00:00Z");
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(date)
    .toUpperCase();
}

async function photoTemplateBuffer(): Promise<Buffer> {
  const candidates = [
    path.join(process.cwd(), "public/templates/tupad-accomplishment-photo-template.xlsx"),
    path.join(__dirname, "../../public/templates/tupad-accomplishment-photo-template.xlsx"),
  ];
  for (const file of candidates) {
    try {
      return await readFile(file);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  throw new Error("The TUPAD Accomplishment Photo Report template is not available on this server.");
}

/**
 * Ensures xl/styles.xml has a wrapText-enabled variant of style 6 (Calibri 12pt activity line)
 * so longer multi-line activities wrap cleanly inside A3:E3 without clipping.
 */
function ensureWrappedActivityStyle(stylesXml: string): { stylesXml: string; styleId: string } {
  const formats = stylesXml.match(/<cellXfs count="(\d+)">([\s\S]*?)<\/cellXfs>/);
  if (!formats) return { stylesXml, styleId: "6" };
  const cells = [...formats[2].matchAll(/<xf\b[^>]*(?:\/>|>[\s\S]*?<\/xf>)/g)].map((m) => m[0]);
  const wrappedStyle = `<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>`;
  const existing = cells.indexOf(wrappedStyle);
  if (existing >= 0) return { stylesXml, styleId: String(existing) };

  const updated = stylesXml.replace(
    formats[0],
    `<cellXfs count="${cells.length + 1}">${formats[2]}${wrappedStyle}</cellXfs>`
  );
  return { stylesXml: updated, styleId: String(cells.length) };
}

interface PagePhotoSlot {
  colIdx: number; // 0 (A = BEFORE), 2 (C = DURING), 4 (E = AFTER)
  rowOffset: number; // 6 (Row 7 top) or 8 (Row 9 bottom)
  entry: DocumentationPhoto;
}

interface DayPageModel {
  barangayHeader: string;
  dayHeader: string;
  activityText: string;
  slots: PagePhotoSlot[];
}

function buildDayPages(
  barangayName: string,
  program: ReportProgram,
  photosForBarangay: DocumentationPhoto[],
  brgyEdit?: BarangayReportEdit,
  includeEmptyDays: boolean = true
): DayPageModel[] {
  const defaultHeader = `BRGY. ${barangayName.toUpperCase()}, ${(program.municipality || "DINGALAN").toUpperCase()}, ${(program.province || "AURORA").toUpperCase()}.`;
  const barangayHeader = brgyEdit?.barangayHeader?.trim() || defaultHeader;

  const computedDays = buildBarangayCompletionDays(program, barangayName);
  const dayDateMap = new Map<number, string>();
  for (const wd of program.workDays) {
    dayDateMap.set(wd.dayNumber, wd.workDate);
  }

  // Build ordered day entries (either from user edits or computed program work days)
  const dayConfigs: Array<{ dayNumber: number; label: string; text: string }> =
    brgyEdit?.days && brgyEdit.days.length > 0
      ? brgyEdit.days.map((d, idx) => {
          const dNum = d.dayNumber ?? idx + 1;
          const dateStr = displayDateUpper(dayDateMap.get(dNum));
          const fallbackLabel = dateStr ? `DAY ${dNum} - ${dateStr}` : `DAY ${dNum}`;
          return {
            dayNumber: dNum,
            label: d.label?.trim() || fallbackLabel,
            text: (d.text || "").trim(),
          };
        })
      : computedDays.map((d) => {
          const dateStr = displayDateUpper(d.workDate);
          return {
            dayNumber: d.dayNumber,
            label: dateStr ? `DAY ${d.dayNumber} - ${dateStr}` : `DAY ${d.dayNumber}`,
            text: (d.accomplishment || "").trim(),
          };
        });

  // Ensure at least 10 days when using defaults
  const maxDayNum = Math.max(
    program.requiredWorkDays || 10,
    ...dayConfigs.map((d) => d.dayNumber),
    ...photosForBarangay.map((p) => p.dayNumber || 1)
  );
  if (!brgyEdit?.days) {
    for (let d = dayConfigs.length + 1; d <= maxDayNum; d++) {
      const dateStr = displayDateUpper(dayDateMap.get(d));
      dayConfigs.push({
        dayNumber: d,
        label: dateStr ? `DAY ${d} - ${dateStr}` : `DAY ${d}`,
        text: "",
      });
    }
  }

  // Group photos by dayNumber -> stage bucket (BEFORE, DURING, AFTER)
  const photosByDay = new Map<number, { BEFORE: DocumentationPhoto[]; DURING: DocumentationPhoto[]; AFTER: DocumentationPhoto[] }>();
  const ensureDayBuckets = (dNum: number) => {
    let b = photosByDay.get(dNum);
    if (!b) {
      b = { BEFORE: [], DURING: [], AFTER: [] };
      photosByDay.set(dNum, b);
    }
    return b;
  };

  for (const entry of photosForBarangay) {
    const dNum = entry.dayNumber && entry.dayNumber > 0 ? entry.dayNumber : 1;
    const buckets = ensureDayBuckets(dNum);
    const st = (entry.stage || "DURING").toUpperCase();
    if (st === "BEFORE") buckets.BEFORE.push(entry);
    else if (st === "AFTER") buckets.AFTER.push(entry);
    else buckets.DURING.push(entry);
  }

  const pages: DayPageModel[] = [];

  for (const dayCfg of dayConfigs) {
    const buckets = photosByDay.get(dayCfg.dayNumber) || { BEFORE: [], DURING: [], AFTER: [] };
    const totalDayPhotos = buckets.BEFORE.length + buckets.DURING.length + buckets.AFTER.length;

    if (!includeEmptyDays && totalDayPhotos === 0 && !dayCfg.text) {
      continue;
    }

    // Each landscape page holds up to 2 BEFORE (A7, A9), 2 DURING (C7, C9), 2 AFTER (E7, E9) = 6 photos/page
    const pageCountForDay = Math.max(
      1,
      Math.ceil(Math.max(buckets.BEFORE.length, buckets.DURING.length, buckets.AFTER.length) / 2)
    );

    for (let pIdx = 0; pIdx < pageCountForDay; pIdx++) {
      const slots: PagePhotoSlot[] = [];
      const bTop = buckets.BEFORE[pIdx * 2];
      const bBot = buckets.BEFORE[pIdx * 2 + 1];
      const dTop = buckets.DURING[pIdx * 2];
      const dBot = buckets.DURING[pIdx * 2 + 1];
      const aTop = buckets.AFTER[pIdx * 2];
      const aBot = buckets.AFTER[pIdx * 2 + 1];

      if (bTop) slots.push({ colIdx: 0, rowOffset: 6, entry: bTop });
      if (dTop) slots.push({ colIdx: 2, rowOffset: 6, entry: dTop });
      if (aTop) slots.push({ colIdx: 4, rowOffset: 6, entry: aTop });
      if (bBot) slots.push({ colIdx: 0, rowOffset: 8, entry: bBot });
      if (dBot) slots.push({ colIdx: 2, rowOffset: 8, entry: dBot });
      if (aBot) slots.push({ colIdx: 4, rowOffset: 8, entry: aBot });

      const dayHeader =
        pageCountForDay > 1 && pIdx > 0 ? `${dayCfg.label} (PAGE ${pIdx + 1})` : dayCfg.label;

      pages.push({
        barangayHeader,
        dayHeader,
        activityText: dayCfg.text,
        slots,
      });
    }
  }

  if (pages.length === 0) {
    const dateStr = displayDateUpper(dayDateMap.get(1));
    pages.push({
      barangayHeader,
      dayHeader: dateStr ? `DAY 1 - ${dateStr}` : "DAY 1",
      activityText: "",
      slots: [],
    });
  }

  return pages;
}

/**
 * Generates the official DOLE Aurora Field Office Landscape Accomplishment Photo Report (.xlsx)
 * matching the uploaded POBLACION template:
 * - Orientation: Landscape, Folio (8.5" x 13", paperSize="14"), 0.197" margins, horizontalCentered
 * - Official "BG TUPAD" watermark background via header &C&G + VML legacyDrawingHF on every page
 * - Exactly 10 rows per page with manual rowBreaks between pages
 * - Exactly 6 photo slots per page (2 rows x 3 columns: BEFORE A7/A9, DURING C7/C9, AFTER E7/E9)
 * - Exact POBLACION photo sizing (3,543,300 x 2,686,050 EMU = 3.875" x 2.9375")
 */
export async function populateCompletionReport(
  program: ReportProgram,
  loadPhoto: PhotoLoader,
  options: CompletionReportOptions = {}
): Promise<Buffer> {
  const baseZip = await JSZip.loadAsync(await photoTemplateBuffer());
  const outZip = new JSZip();

  // Copy core static template assets directly from uploaded template
  const relsRoot = await baseZip.file("_rels/.rels")!.async("string");
  const coreXml = await baseZip.file("docProps/core.xml")!.async("string");
  const rawStylesXml = await baseZip.file("xl/styles.xml")!.async("string");
  const themeXml = await baseZip.file("xl/theme/theme1.xml")!.async("string");
  const printerBin = await baseZip.file("xl/printerSettings/printerSettings1.bin")!.async("nodebuffer");
  const bgJpeg = await baseZip.file("xl/media/bgTupad.jpeg")!.async("nodebuffer");
  const vmlTemplate = await baseZip.file("xl/drawings/vmlDrawingTemplate.vml")!.async("string");

  const { stylesXml, styleId: activityStyleId } = ensureWrappedActivityStyle(rawStylesXml);

  outZip.file("_rels/.rels", relsRoot);
  outZip.file("docProps/core.xml", coreXml);
  outZip.file("xl/styles.xml", stylesXml);
  outZip.file("xl/theme/theme1.xml", themeXml);
  outZip.file("xl/printerSettings/printerSettings1.bin", printerBin);
  outZip.file("xl/media/bgTupad.jpeg", bgJpeg);

  // Resolve selected barangays (defaults to all 11 Dingalan barangays)
  const selectedBarangaySet =
    options.selectedBarangays && options.selectedBarangays.length > 0
      ? new Set(options.selectedBarangays.map((b) => completionBarangay(b)).filter(Boolean))
      : null;

  const targetBarangays = selectedBarangaySet
    ? DINGALAN_BARANGAYS.filter((b) => selectedBarangaySet.has(completionBarangay(b)))
    : [...DINGALAN_BARANGAYS];

  if (targetBarangays.length === 0) {
    throw new Error("Please select at least one valid Dingalan barangay to export.");
  }

  // Normalize barangayEdits map
  const normalizedEdits = new Map<string, BarangayReportEdit>();
  if (options.barangayEdits) {
    for (const [k, v] of Object.entries(options.barangayEdits)) {
      const norm = completionBarangay(k);
      if (norm && v) normalizedEdits.set(norm, v);
    }
  }

  const photoFitMode: "fill" | "contain" = options.layout?.photoFitMode || "fill";
  const includeEmptyDays = options.layout?.includeEmptyDays ?? true;

  const workbookSheetsXml: string[] = [];
  const workbookRelsXml: string[] = [];
  const definedNamesXml: string[] = [];
  const contentOverrides: string[] = [
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`,
    `<Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>`,
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`,
    `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>`,
    `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>`,
  ];
  const usedImageExtensions = new Set<string>(["jpeg"]);
  let globalImageCounter = 1;

  for (let sheetIdx = 0; sheetIdx < targetBarangays.length; sheetIdx++) {
    const brgyTitle = targetBarangays[sheetIdx];
    const sheetName = brgyTitle.toUpperCase();
    const brgyKey = completionBarangay(brgyTitle);
    const sheetNum = sheetIdx + 1;
    const sheetRelId = `rId${sheetNum}`;
    const brgyEdit = normalizedEdits.get(brgyKey);

    const photosForSheet = options.customPhotosByBarangay
      ? options.customPhotosByBarangay.get(brgyKey) || []
      : barangayDocumentationPhotos(program, brgyTitle);

    const pages = buildDayPages(brgyTitle, program, photosForSheet, brgyEdit, includeEmptyDays);

    const rowsXml: string[] = [];
    const mergesXml: string[] = [];
    const breaksXml: string[] = [];
    const picturesXml: string[] = [];
    const drawingRelsXml: string[] = [];

    for (let pIdx = 0; pIdx < pages.length; pIdx++) {
      const page = pages[pIdx];
      const baseRow = pIdx * 10 + 1; // 1, 11, 21, 31, ...

      const r1 = baseRow; // Barangay Header
      const r2 = baseRow + 1; // DAY X - DATE
      const r3 = baseRow + 2; // Daily Work Program Activity
      const r4 = baseRow + 3; // Spacer
      const r5 = baseRow + 4; // BEFORE | DURING | AFTER
      const r6 = baseRow + 5; // Spacer
      const r7 = baseRow + 6; // Top Photo Row (ht=212.65)
      const r8 = baseRow + 7; // Spacer between photo rows
      const r9 = baseRow + 8; // Bottom Photo Row (ht=212.65)
      const r10 = baseRow + 9; // Bottom margin spacer

      // Activity line height: keep exact 15.75 for single-line, expand gently if wrapped (2 lines max ~30pt so page still fits 1 Folio landscape sheet!)
      const cleanActivityOneLine = page.activityText.replace(/\r\n/g, "\n").trim();
      const approxActivityLines = Math.min(
        2,
        Math.max(1, Math.ceil(cleanActivityOneLine.length / 135))
      );
      const r3Height = approxActivityLines > 1 ? 28 : 15.75;
      // Slightly trim spacer rows r4/r6 if r3 expanded to 2 lines so total page height stays identical (~560pt)
      const r4Height = approxActivityLines > 1 ? 8 : 15;
      const r6Height = approxActivityLines > 1 ? 9.75 : 15;

      // Track merged ranges matching POBLACION exactly
      mergesXml.push(
        `<mergeCell ref="A${r1}:E${r1}"/>`,
        `<mergeCell ref="A${r2}:E${r2}"/>`,
        `<mergeCell ref="A${r3}:E${r3}"/>`,
        `<mergeCell ref="A${r4}:E${r4}"/>`,
        `<mergeCell ref="A${r6}:E${r6}"/>`
      );

      // Row 1: BRGY. {BARANGAY}, DINGALAN, AURORA.
      rowsXml.push(
        `<row r="${r1}" spans="1:5" s="3" customFormat="1" ht="25.5" customHeight="1">` +
          `<c r="A${r1}" s="1" t="inlineStr"><is><t xml:space="preserve">${escapeXml(page.barangayHeader)}</t></is></c>` +
          `<c r="B${r1}" s="1"/><c r="C${r1}" s="1"/><c r="D${r1}" s="1"/><c r="E${r1}" s="1"/>` +
          `</row>`
      );

      // Row 2: DAY X - MONTH DD, YYYY
      rowsXml.push(
        `<row r="${r2}" spans="1:5" s="5" customFormat="1" ht="18" customHeight="1">` +
          `<c r="A${r2}" s="4" t="inlineStr"><is><t xml:space="preserve">${escapeXml(page.dayHeader)}</t></is></c>` +
          `<c r="B${r2}" s="4"/><c r="C${r2}" s="4"/><c r="D${r2}" s="4"/><c r="E${r2}" s="4"/>` +
          `</row>`
      );

      // Row 3: Daily Activity
      rowsXml.push(
        `<row r="${r3}" spans="1:5" s="7" customFormat="1" ht="${r3Height}" customHeight="1">` +
          `<c r="A${r3}" s="${activityStyleId}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(cleanActivityOneLine)}</t></is></c>` +
          `<c r="B${r3}" s="6"/><c r="C${r3}" s="6"/><c r="D${r3}" s="6"/><c r="E${r3}" s="6"/>` +
          `</row>`
      );

      // Row 4: Spacer
      rowsXml.push(
        `<row r="${r4}" spans="1:5" ht="${r4Height}" customHeight="1">` +
          `<c r="A${r4}" s="8"/><c r="B${r4}" s="8"/><c r="C${r4}" s="8"/><c r="D${r4}" s="8"/><c r="E${r4}" s="8"/>` +
          `</row>`
      );

      // Row 5: BEFORE | DURING | AFTER
      rowsXml.push(
        `<row r="${r5}" spans="1:5" ht="15.75" customHeight="1">` +
          `<c r="A${r5}" s="10" t="inlineStr"><is><t>BEFORE</t></is></c>` +
          `<c r="B${r5}" s="10"/>` +
          `<c r="C${r5}" s="10" t="inlineStr"><is><t>DURING</t></is></c>` +
          `<c r="D${r5}" s="10"/>` +
          `<c r="E${r5}" s="10" t="inlineStr"><is><t>AFTER</t></is></c>` +
          `</row>`
      );

      // Row 6: Spacer
      rowsXml.push(
        `<row r="${r6}" spans="1:5" ht="${r6Height}" customHeight="1">` +
          `<c r="A${r6}" s="8"/><c r="B${r6}" s="8"/><c r="C${r6}" s="8"/><c r="D${r6}" s="8"/><c r="E${r6}" s="8"/>` +
          `</row>`
      );

      // Row 7: Top Photo Row (exact 212.65pt height)
      rowsXml.push(
        `<row r="${r7}" spans="1:5" ht="${PHOTO_ROW_HEIGHT_PT}" customHeight="1">` +
          `<c r="B${r7}" s="9"/><c r="D${r7}" s="9"/>` +
          `</row>`
      );

      // Row 8: Spacer between Top & Bottom Photo Rows
      rowsXml.push(
        `<row r="${r8}" spans="1:5" ht="15" customHeight="1">` +
          `<c r="B${r8}" s="9"/><c r="D${r8}" s="9"/>` +
          `</row>`
      );

      // Row 9: Bottom Photo Row (exact 212.65pt height)
      rowsXml.push(
        `<row r="${r9}" spans="1:5" ht="${PHOTO_ROW_HEIGHT_PT}" customHeight="1">` +
          `<c r="B${r9}" s="9"/><c r="D${r9}" s="9"/>` +
          `</row>`
      );

      // Row 10: Bottom Spacer + Manual Page Break after every page except last
      rowsXml.push(
        `<row r="${r10}" spans="1:5" ht="15" customHeight="1">` +
          `<c r="B${r10}" s="9"/><c r="D${r10}" s="9"/>` +
          `</row>`
      );

      if (pIdx < pages.length - 1) {
        breaksXml.push(`<brk id="${r10}" max="16383" man="1"/>`);
      }

      // Embed up to 6 photos for this page at exact POBLACION slots (A7, C7, E7, A9, C9, E9)
      for (const slot of page.slots) {
        const { photo } = slot.entry;
        const storedKey = photo.isPurged ? null : await loadPhoto(photo);
        if (!storedKey) continue;

        try {
          const bytes = await imageBytes(storedKey);
          const size = dimensions(bytes);
          if (size.width < 1 || size.height < 1) continue;

          const picId = picturesXml.length + 1;
          const relId = `rId${picId}`;
          const imageFile = `photo${globalImageCounter++}.${size.extension}`;
          usedImageExtensions.add(size.extension);
          outZip.file(`xl/media/${imageFile}`, bytes);
          drawingRelsXml.push(
            `<Relationship Id="${relId}" Type="${REL_NS}/image" Target="../media/${imageFile}"/>`
          );

          let cx = SLOT_WIDTH_EMU;
          let cy = SLOT_HEIGHT_EMU;
          let colOff = 0;
          let rowOff = 0;
          let picLocks = `<a:picLocks noChangeArrowheads="1"/>`;

          if (photoFitMode === "contain") {
            const scale = Math.min(SLOT_WIDTH_EMU / size.width, SLOT_HEIGHT_EMU / size.height);
            cx = Math.round(size.width * scale);
            cy = Math.round(size.height * scale);
            colOff = Math.round((SLOT_WIDTH_EMU - cx) / 2);
            rowOff = Math.round((SLOT_HEIGHT_EMU - cy) / 2);
            picLocks = `<a:picLocks noChangeAspect="1" noChangeArrowheads="1"/>`;
          }

          const zeroBasedRow = baseRow + slot.rowOffset - 1;
          const descr = escapeXml(
            slot.entry.customCaption ||
              [page.dayHeader, slot.entry.stage, photo.workArea || ""].filter(Boolean).join(" — ")
          );

          picturesXml.push(
            `<xdr:oneCellAnchor>` +
              `<xdr:from><xdr:col>${slot.colIdx}</xdr:col><xdr:colOff>${colOff}</xdr:colOff><xdr:row>${zeroBasedRow}</xdr:row><xdr:rowOff>${rowOff}</xdr:rowOff></xdr:from>` +
              `<xdr:ext cx="${cx}" cy="${cy}"/>` +
              `<xdr:pic>` +
              `<xdr:nvPicPr><xdr:cNvPr id="${picId}" name="Picture ${picId}" descr="${descr}"/><xdr:cNvPicPr>${picLocks}</xdr:cNvPicPr></xdr:nvPicPr>` +
              `<xdr:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>` +
              `<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>` +
              `</xdr:pic>` +
              `<xdr:clientData/>` +
              `</xdr:oneCellAnchor>`
          );
        } catch (err) {
          console.warn(`Skipping unembeddable photo ${photo.id}:`, err);
        }
      }
    }

    const lastRow = pages.length * 10;
    const hasDrawing = picturesXml.length > 0;

    // Build Worksheet XML matching POBLACION orientation, margins, pageSetup, view, and BG TUPAD header
    const sheetXml =
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${REL_NS}">` +
      `<dimension ref="A1:E${lastRow}"/>` +
      `<sheetViews><sheetView${sheetIdx === 0 ? ' tabSelected="1"' : ""} view="pageLayout" zoomScale="66" zoomScaleNormal="40" zoomScaleSheetLayoutView="40" zoomScalePageLayoutView="66" workbookViewId="0"><selection activeCell="A1" sqref="A1"/></sheetView></sheetViews>` +
      `<sheetFormatPr defaultColWidth="9" defaultRowHeight="15"/>` +
      `<cols>` +
      `<col min="1" max="1" width="${PHOTO_COL_WIDTH}" customWidth="1"/>` +
      `<col min="2" max="2" width="${SPACER_COL_WIDTH}" customWidth="1"/>` +
      `<col min="3" max="3" width="${PHOTO_COL_WIDTH}" customWidth="1"/>` +
      `<col min="4" max="4" width="${SPACER_COL_WIDTH}" customWidth="1"/>` +
      `<col min="5" max="5" width="${PHOTO_COL_WIDTH}" customWidth="1"/>` +
      `</cols>` +
      `<sheetData>${rowsXml.join("")}</sheetData>` +
      `<mergeCells count="${mergesXml.length}">${mergesXml.join("")}</mergeCells>` +
      `<printOptions horizontalCentered="1"/>` +
      `<pageMargins left="0.19685039370078741" right="0.19685039370078741" top="0.19685039370078741" bottom="0.19685039370078741" header="3.937007874015748E-2" footer="3.937007874015748E-2"/>` +
      `<pageSetup paperSize="14" fitToWidth="0" fitToHeight="0" orientation="landscape" horizontalDpi="300" verticalDpi="300" r:id="rId1"/>` +
      `<headerFooter><oddHeader>&amp;C&amp;G</oddHeader></headerFooter>` +
      (breaksXml.length > 0
        ? `<rowBreaks count="${breaksXml.length}" manualBreakCount="${breaksXml.length}">${breaksXml.join("")}</rowBreaks>`
        : "") +
      (hasDrawing ? `<drawing r:id="rId2"/>` : "") +
      `<legacyDrawingHF r:id="rId3"/>` +
      `</worksheet>`;

    outZip.file(`xl/worksheets/sheet${sheetNum}.xml`, sheetXml);
    contentOverrides.push(
      `<Override PartName="/xl/worksheets/sheet${sheetNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    );

    // Sheet relationships: printerSettings + optional drawing + VML BG TUPAD header watermark
    const sheetRels: string[] = [
      `<Relationship Id="rId1" Type="${REL_NS}/printerSettings" Target="../printerSettings/printerSettings1.bin"/>`,
      `<Relationship Id="rId3" Type="${REL_NS}/vmlDrawing" Target="../drawings/vmlDrawing${sheetNum}.vml"/>`,
    ];

    if (hasDrawing) {
      sheetRels.push(
        `<Relationship Id="rId2" Type="${REL_NS}/drawing" Target="../drawings/drawing${sheetNum}.xml"/>`
      );
      outZip.file(
        `xl/drawings/drawing${sheetNum}.xml`,
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${REL_NS}">` +
          picturesXml.join("") +
          `</xdr:wsDr>`
      );
      outZip.file(
        `xl/drawings/_rels/drawing${sheetNum}.xml.rels`,
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="${PACKAGE_NS}">${drawingRelsXml.join("")}</Relationships>`
      );
      contentOverrides.push(
        `<Override PartName="/xl/drawings/drawing${sheetNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`
      );
    }

    outZip.file(
      `xl/worksheets/_rels/sheet${sheetNum}.xml.rels`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="${PACKAGE_NS}">${sheetRels.join("")}</Relationships>`
    );

    // VML Header Watermark ("BG TUPAD") per sheet
    outZip.file(`xl/drawings/vmlDrawing${sheetNum}.vml`, vmlTemplate);
    outZip.file(
      `xl/drawings/_rels/vmlDrawing${sheetNum}.vml.rels`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="${PACKAGE_NS}">` +
        `<Relationship Id="rId1" Type="${REL_NS}/image" Target="../media/bgTupad.jpeg"/>` +
        `</Relationships>`
    );

    workbookSheetsXml.push(
      `<sheet name="${escapeXml(sheetName)}" sheetId="${sheetNum}" r:id="${sheetRelId}"/>`
    );
    workbookRelsXml.push(
      `<Relationship Id="${sheetRelId}" Type="${REL_NS}/worksheet" Target="worksheets/sheet${sheetNum}.xml"/>`
    );
    definedNamesXml.push(
      `<definedName name="_xlnm.Print_Area" localSheetId="${sheetIdx}">'${escapeXml(sheetName)}'!$A$1:$E$${lastRow}</definedName>`
    );
  }

  // Add styles & theme relationships to workbook.xml.rels
  const themeRelId = `rId${targetBarangays.length + 1}`;
  const stylesRelId = `rId${targetBarangays.length + 2}`;
  workbookRelsXml.push(
    `<Relationship Id="${themeRelId}" Type="${REL_NS}/theme" Target="theme/theme1.xml"/>`,
    `<Relationship Id="${stylesRelId}" Type="${REL_NS}/styles" Target="styles.xml"/>`
  );

  outZip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${REL_NS}">` +
      `<bookViews><workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="15600" firstSheet="0" activeTab="0"/></bookViews>` +
      `<sheets>${workbookSheetsXml.join("")}</sheets>` +
      `<definedNames>${definedNamesXml.join("")}</definedNames>` +
      `</workbook>`
  );

  outZip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="${PACKAGE_NS}">${workbookRelsXml.join("")}</Relationships>`
  );

  // docProps/app.xml with exact sheet count & titles
  outZip.file(
    "docProps/app.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">` +
      `<Application>Microsoft Excel</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop>` +
      `<HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>${targetBarangays.length}</vt:i4></vt:variant></vt:vector></HeadingPairs>` +
      `<TitlesOfParts><vt:vector size="${targetBarangays.length}" baseType="lpstr">${targetBarangays
        .map((b) => `<vt:lpstr>${escapeXml(b.toUpperCase())}</vt:lpstr>`)
        .join("")}</vt:vector></TitlesOfParts>` +
      `<Company></Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged>` +
      `</Properties>`
  );

  // [Content_Types].xml
  const defaultTypes = [
    `<Default Extension="bin" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.printerSettings"/>`,
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,
    `<Default Extension="xml" ContentType="application/xml"/>`,
    `<Default Extension="vml" ContentType="application/vnd.openxmlformats-officedocument.vmlDrawing"/>`,
    ...[...usedImageExtensions].map(
      (ext) => `<Default Extension="${ext}" ContentType="image/${ext}"/>`
    ),
  ];

  outZip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      defaultTypes.join("") +
      contentOverrides.join("") +
      `</Types>`
  );

  return outZip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
