import type JSZip from "jszip";
import path from "path";
import { completionBarangay, type CompletionProgram } from "./accomplishment-work-schedule";

export type ReportPhoto = CompletionProgram["accomplishmentPhotos"][number] & {
  id: string;
  fileName: string | null;
  capturedAt: Date | null;
  isPurged: boolean;
  latitude?: number | null;
  longitude?: number | null;
};
export type PhotoLoader = (photo: ReportPhoto) => Promise<string | null>;
export interface SelectedReportPhotoInput {
  photoId: string;
  targetBarangay: string;
  targetDayNumber?: number | null;
  stage?: "BEFORE" | "DURING" | "AFTER" | "UNLABELLED";
  workArea?: string | null;
  specificActivity?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capturedAt?: string | null;
  includeGeotagInCaption?: boolean;
  customCaption?: string | null;
}
export interface DocumentationPhoto {
  photo: ReportPhoto;
  dayNumber?: number;
  workDate: string;
  stage: string;
  includeGeotagInCaption?: boolean;
  customCaption?: string | null;
}
export interface PhotoLayoutOptions {
  layout?: "1-col" | "2-col" | "3-col";
  photoSize?: "compact" | "medium" | "large";
  colBWidth?: number;
  colCWidth?: number;
}
const xmlText = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const relNs = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const packageNs = "http://schemas.openxmlformats.org/package/2006/relationships";
const maxImageBytes = 20 * 1024 * 1024;

export function barangayDocumentationPhotos(program: Omit<CompletionProgram, "accomplishmentPhotos"> & { accomplishmentPhotos: ReportPhoto[] }, barangay: string): DocumentationPhoto[] {
  const items = new Map(program.tupadWorkPrograms.flatMap(plan => plan.items.map(item => [item.id, { ...item, barangay: completionBarangay(plan.barangay) }] as const)));
  const days = new Map(program.workDays.map(day => [day.id, day]));
  const order = ["BEFORE", "DURING", "AFTER", "UNLABELLED"];
  return program.accomplishmentPhotos.filter(photo => {
    const item = photo.workProgramItemId ? items.get(photo.workProgramItemId) : undefined;
    return photo.status !== "REJECTED" && (completionBarangay(photo.barangay) || item?.barangay) === completionBarangay(barangay);
  }).map(photo => {
    const item = photo.workProgramItemId ? items.get(photo.workProgramItemId) : undefined;
    const day = photo.workDayId ? days.get(photo.workDayId) : program.workDays.find(day => day.dayNumber === item?.dayNumber);
    const stage = (photo.specificActivity || "").match(/^\s*(?:\[(BEFORE|DURING|AFTER)\]|(BEFORE|DURING|AFTER)\s*[:\-–])/i);
    return { photo, dayNumber: day?.dayNumber, workDate: day?.workDate || "", stage: (stage?.[1] || stage?.[2] || "UNLABELLED").toUpperCase() };
  }).sort((a, b) => (a.dayNumber ?? Infinity) - (b.dayNumber ?? Infinity) || order.indexOf(a.stage) - order.indexOf(b.stage) || +(a.photo.capturedAt || 0) - +(b.photo.capturedAt || 0) || a.photo.id.localeCompare(b.photo.id));
}

/** Only trusted storage origins, no arbitrary server-side URLs, redirects, or credentials. */
export async function imageBytes(key: string): Promise<Buffer> {
  if (key.startsWith("data:")) {
    const match = key.match(/^data:image\/(?:png|jpe?g|gif);base64,([A-Za-z0-9+/=\s]+)$/i);
    if (!match) throw new Error("Unsupported or invalid image. Re-upload as JPG or PNG in Photos.");
    if (match[1].length > Math.ceil(maxImageBytes * 4 / 3) + 100) throw new Error("Image exceeds the 20 MB export limit.");
    return Buffer.from(match[1], "base64");
  }
  let url: URL;
  try { url = new URL(key); } catch { throw new Error("Image data is missing. Re-upload this photo in Photos."); }
  const storageOrigin = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const allowed = new Set(["https://res.cloudinary.com"]);
  if (storageOrigin) { try { allowed.add(new URL(storageOrigin).origin); } catch { /* Invalid config is not an allowed host. */ } }
  if (url.protocol !== "https:" || url.username || url.password || !allowed.has(url.origin)) throw new Error("External image host is not configured for export. Re-upload in Photos.");
  const response = await fetch(url, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok || !/^image\/(png|jpeg|gif)(?:;|$)/i.test(response.headers.get("content-type") || "")) throw new Error("Stored image could not be downloaded.");
  if (Number(response.headers.get("content-length")) > maxImageBytes) throw new Error("Image exceeds the 20 MB export limit.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Stored image is empty.");
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxImageBytes) throw new Error("Image exceeds the 20 MB export limit.");
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks);
}

export function dimensions(data: Buffer): { width: number; height: number; extension: "png" | "jpeg" | "gif" } {
  if (data.length >= 24 && data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && data.toString("ascii", 12, 16) === "IHDR") {
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), extension: "png" };
  }
  if (data.length >= 10 && /^GIF8[79]a$/.test(data.toString("ascii", 0, 6))) return { width: data.readUInt16LE(6), height: data.readUInt16LE(8), extension: "gif" };
  if (data.length > 4 && data[0] === 255 && data[1] === 216) {
    let offset = 2;
    while (offset + 4 <= data.length) {
      if (data[offset++] !== 255) break;
      while (data[offset] === 255) offset++;
      const marker = data[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > data.length) break;
      const length = data.readUInt16BE(offset);
      if (length < 2 || offset + length > data.length) break;
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker) && length >= 8) return { width: data.readUInt16BE(offset + 5), height: data.readUInt16BE(offset + 3), extension: "jpeg" };
      offset += length;
    }
  }
  throw new Error("Invalid image data. Re-upload as JPG or PNG in Photos.");
}

function buildPhotoCaption(entry: DocumentationPhoto): string {
  if (entry.customCaption !== undefined && entry.customCaption !== null && entry.customCaption.trim()) {
    return entry.customCaption.trim();
  }
  const { photo } = entry;
  const activity = (photo.specificActivity || "")
    .replace(/^\s*(?:\[(BEFORE|DURING|AFTER)\]\s*[:\-–]?|(BEFORE|DURING|AFTER)\s*[:\-–])\s*/i, "")
    .trim();
  const stage = entry.stage === "UNLABELLED" ? "Stage not labelled" : entry.stage;
  const gpsText =
    entry.includeGeotagInCaption &&
    typeof photo.latitude === "number" &&
    typeof photo.longitude === "number" &&
    Number.isFinite(photo.latitude) &&
    Number.isFinite(photo.longitude)
      ? `GPS: ${photo.latitude.toFixed(5)}°N, ${photo.longitude.toFixed(5)}°E`
      : "";
  const capturedText =
    entry.includeGeotagInCaption && photo.capturedAt && !Number.isNaN(new Date(photo.capturedAt).getTime())
      ? `Captured: ${new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Manila",
        }).format(new Date(photo.capturedAt))}`
      : "";
  return [
    entry.dayNumber ? `Day ${entry.dayNumber}${entry.workDate ? ` (${entry.workDate})` : ""}` : "Work day not assigned",
    stage,
    photo.status === "FOR_REVIEW" ? "For review" : "",
    activity,
    photo.workArea || "",
    gpsText,
    capturedText,
  ]
    .filter(Boolean)
    .join(" — ");
}

function estimateCaptionLines(text: string, charsPerLine: number): number {
  return text
    .split("\n")
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / Math.max(18, charsPerLine))), 0);
}

/** Native DrawingML images: printable and available offline, not links to an API. */
export async function appendPhotoDocumentation(
  zip: JSZip,
  xml: string,
  sheetFile: string,
  captionRow: number,
  photos: DocumentationPhoto[],
  loadPhoto: PhotoLoader,
  layoutOptions: PhotoLayoutOptions = {}
): Promise<string> {
  const newRows: string[] = [], merges: string[] = [], pictures: string[] = [], imageRels: string[] = [];
  const sheetKey = path.posix.basename(sheetFile, ".xml");
  const drawingName = `completion${sheetKey}`;
  const sourceStyle = xml.match(new RegExp(`<c\\b[^>]*r="B${captionRow}"[^>]*s="(\\d+)"`))?.[1] || "5";
  let captionStyle = sourceStyle;
  let styles = await zip.file("xl/styles.xml")!.async("string");
  const formats = styles.match(/<cellXfs count="(\d+)">([\s\S]*?)<\/cellXfs>/);
  if (formats) {
    const cells = [...formats[2].matchAll(/<xf\b[^>]*(?:\/>|>[\s\S]*?<\/xf>)/g)].map(match => match[0]);
    let style = cells[Number(sourceStyle)].replace(/\s+applyAlignment="[^"]*"/, "");
    style = style.replace(/^<xf\b/, '<xf applyAlignment="1"');
    style = style.replace(/<alignment\b[^>]*\/>/, "");
    if (style.endsWith("/>")) style = style.slice(0, -2) + "></xf>";
    style = style.replace("</xf>", '<alignment horizontal="left" vertical="top" wrapText="1"/></xf>');
    const existing = cells.indexOf(style);
    captionStyle = String(existing >= 0 ? existing : cells.length);
    if (existing < 0) {
      styles = styles.replace(formats[0], `<cellXfs count="${cells.length + 1}">${formats[2]}${style}</cellXfs>`);
      zip.file("xl/styles.xml", styles);
    }
  }

  const layout = layoutOptions.layout || "1-col";
  const photoSize = layoutOptions.photoSize || "medium";
  const colBWidth = layoutOptions.colBWidth || 35;
  const colCWidth = layoutOptions.colCWidth || 68;
  const colDWidth = 38;
  const colBPx = Math.round(colBWidth * 7.4);
  const colCPx = Math.round(colCWidth * 7.4);
  const colDPx = Math.round(colDWidth * 7.4);

  // Ensure column D has an explicit clean width if 3-column layout is used
  if (layout === "3-col" && !/<col\b[^>]*min="4"/.test(xml)) {
    xml = xml.replace("</cols>", `<col min="4" max="4" width="${colDWidth}" customWidth="1"/></cols>`);
  }

  const boxHeightPx =
    photoSize === "compact"
      ? layout === "1-col" ? 210 : 175
      : photoSize === "large"
        ? layout === "1-col" ? 340 : 275
        : layout === "1-col" ? 275 : 220;
  const imageRowHeightPt = Math.round(boxHeightPx * 0.78 + 14);

  const mergedTextRow = (rowNum: number, text: string, height: number) => {
    merges.push(`B${rowNum}:C${rowNum}`);
    newRows.push(`<row r="${rowNum}" ht="${height}" customHeight="1"><c r="B${rowNum}" s="${captionStyle}" t="inlineStr"><is><t xml:space="preserve">${xmlText(text)}</t></is></c></row>`);
  };

  let row = captionRow + 2;
  if (!photos.length) {
    mergedTextRow(row, "No uploaded photo documentation available for this barangay.", 30);
    row += 1;
  } else if (layout === "1-col") {
    const totalBoxWidthPx = Math.max(460, Math.min(720, colBPx + colCPx - 24));
    const captionChars = Math.max(60, Math.floor((colBWidth + colCWidth) * 0.92));

    for (const entry of photos) {
      const { photo } = entry;
      const label = buildPhotoCaption(entry);
      const captionLines = estimateCaptionLines(label, captionChars);
      mergedTextRow(row++, label, Math.min(360, Math.max(28, captionLines * 15 + 8)));

      const storedKey = photo.isPurged ? null : await loadPhoto(photo);
      let errorText = "";
      try {
        if (photo.isPurged) throw new Error("Photo was purged; its image is no longer available.");
        if (!storedKey) throw new Error("Image is missing. Re-upload this photo in Photos.");
        const bytes = await imageBytes(storedKey);
        const size = dimensions(bytes);
        if (size.width < 1 || size.height < 1) throw new Error("Image dimensions are invalid.");
        const scale = Math.min(totalBoxWidthPx / size.width, boxHeightPx / size.height);
        const width = Math.round(size.width * scale), height = Math.round(size.height * scale);
        const id = pictures.length + 1, relation = `rId${id}`;
        const imageName = `${drawingName}Image${id}.${size.extension}`;
        zip.file(`xl/media/${imageName}`, bytes);
        imageRels.push(`<Relationship Id="${relation}" Type="${relNs}/image" Target="../media/${imageName}"/>`);
        pictures.push(`<xdr:oneCellAnchor><xdr:from><xdr:col>1</xdr:col><xdr:colOff>${Math.round((8 + Math.max(0, (totalBoxWidthPx - width) / 2)) * 9525)}</xdr:colOff><xdr:row>${row - 1}</xdr:row><xdr:rowOff>${Math.round((8 + Math.max(0, (boxHeightPx - height) / 2)) * 9525)}</xdr:rowOff></xdr:from><xdr:ext cx="${width * 9525}" cy="${height * 9525}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${id}" name="Photo ${id}" descr="${xmlText(label)}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="${relation}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${width * 9525}" cy="${height * 9525}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`);
        let types = await zip.file("[Content_Types].xml")!.async("string");
        if (!types.includes(`Extension="${size.extension}"`)) types = types.replace("</Types>", `<Default Extension="${size.extension}" ContentType="image/${size.extension}"/></Types>`);
        zip.file("[Content_Types].xml", types);
      } catch (error) {
        errorText = error instanceof Error ? error.message : "Photo could not be embedded.";
      }
      mergedTextRow(row, errorText ? `IMAGE UNAVAILABLE: ${errorText}` : "", imageRowHeightPt);
      row += 2;
    }
  } else {
    // Side-by-side multi-column grid (2-col: B & C, or 3-col: B, C, D)
    const perRow = layout === "3-col" ? 3 : 2;
    const colSpecs =
      perRow === 3
        ? [
            { colIdx: 1, letter: "B", widthPx: Math.max(220, colBPx - 14), chars: Math.max(26, Math.floor(colBWidth * 0.88)) },
            { colIdx: 2, letter: "C", widthPx: Math.max(260, Math.min(360, colCPx - 14)), chars: Math.max(36, Math.floor(colCWidth * 0.88)) },
            { colIdx: 3, letter: "D", widthPx: Math.max(240, colDPx - 14), chars: Math.max(28, Math.floor(colDWidth * 0.88)) },
          ]
        : [
            { colIdx: 1, letter: "B", widthPx: Math.max(230, colBPx - 14), chars: Math.max(28, Math.floor(colBWidth * 0.88)) },
            { colIdx: 2, letter: "C", widthPx: Math.max(300, Math.min(460, colCPx - 16)), chars: Math.max(42, Math.floor(colCWidth * 0.88)) },
          ];

    for (let i = 0; i < photos.length; i += perRow) {
      const group = photos.slice(i, i + perRow);
      const captions = group.map((entry) => buildPhotoCaption(entry));

      // 1. Caption row across columns
      let maxCaptionLines = 1;
      const captionCellsXml = group
        .map((_, idx) => {
          const spec = colSpecs[idx];
          const text = captions[idx];
          maxCaptionLines = Math.max(maxCaptionLines, estimateCaptionLines(text, spec.chars));
          return `<c r="${spec.letter}${row}" s="${captionStyle}" t="inlineStr"><is><t xml:space="preserve">${xmlText(text)}</t></is></c>`;
        })
        .join("");
      const captionHeight = Math.min(240, Math.max(28, maxCaptionLines * 15 + 8));
      newRows.push(`<row r="${row}" ht="${captionHeight}" customHeight="1">${captionCellsXml}</row>`);
      row += 1;

      // 2. Image row across columns
      const imageCellsXml: string[] = [];
      for (let idx = 0; idx < group.length; idx++) {
        const entry = group[idx];
        const spec = colSpecs[idx];
        const { photo } = entry;
        const storedKey = photo.isPurged ? null : await loadPhoto(photo);
        let errorText = "";
        try {
          if (photo.isPurged) throw new Error("Photo was purged.");
          if (!storedKey) throw new Error("Image missing.");
          const bytes = await imageBytes(storedKey);
          const size = dimensions(bytes);
          if (size.width < 1 || size.height < 1) throw new Error("Invalid dimensions.");
          const scale = Math.min(spec.widthPx / size.width, boxHeightPx / size.height);
          const width = Math.round(size.width * scale), height = Math.round(size.height * scale);
          const id = pictures.length + 1, relation = `rId${id}`;
          const imageName = `${drawingName}Image${id}.${size.extension}`;
          zip.file(`xl/media/${imageName}`, bytes);
          imageRels.push(`<Relationship Id="${relation}" Type="${relNs}/image" Target="../media/${imageName}"/>`);
          pictures.push(`<xdr:oneCellAnchor><xdr:from><xdr:col>${spec.colIdx}</xdr:col><xdr:colOff>${Math.round((6 + Math.max(0, (spec.widthPx - width) / 2)) * 9525)}</xdr:colOff><xdr:row>${row - 1}</xdr:row><xdr:rowOff>${Math.round((6 + Math.max(0, (boxHeightPx - height) / 2)) * 9525)}</xdr:rowOff></xdr:from><xdr:ext cx="${width * 9525}" cy="${height * 9525}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${id}" name="Photo ${id}" descr="${xmlText(captions[idx])}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="${relation}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${width * 9525}" cy="${height * 9525}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`);
          let types = await zip.file("[Content_Types].xml")!.async("string");
          if (!types.includes(`Extension="${size.extension}"`)) types = types.replace("</Types>", `<Default Extension="${size.extension}" ContentType="image/${size.extension}"/></Types>`);
          zip.file("[Content_Types].xml", types);
        } catch (error) {
          errorText = error instanceof Error ? error.message : "Photo could not be embedded.";
        }
        imageCellsXml.push(
          `<c r="${spec.letter}${row}" s="${captionStyle}" t="inlineStr"><is><t xml:space="preserve">${xmlText(errorText ? `IMAGE UNAVAILABLE: ${errorText}` : "")}</t></is></c>`
        );
      }
      newRows.push(`<row r="${row}" ht="${imageRowHeightPt}" customHeight="1">${imageCellsXml.join("")}</row>`);
      row += 2;
    }
  }
  // Preserve other cells; replace only the previously empty documentation rows.
  const firstNewRow = captionRow + 2;
  xml = xml.replace(/<row\b[^>]*\br="(\d+)"[^>]*>[\s\S]*?<\/row>/g, (content, number) => Number(number) >= firstNewRow && Number(number) < row ? "" : content);
  // Template ends at this section. Append before sheetData close (ascending row order).
  if ([...xml.matchAll(/<row\b[^>]*\br="(\d+)"/g)].some(match => Number(match[1]) >= row)) throw new Error("Unexpected content below photo documentation in the template.");
  xml = xml.replace("</sheetData>", newRows.join("") + "</sheetData>");
  xml = xml.replace(/<mergeCells count="(\d+)">([\s\S]*?)<\/mergeCells>/, (_, count, content) => `<mergeCells count="${Number(count) + merges.length}">${content}${merges.map(ref => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>`);
  xml = xml.replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:F${row}"/>`);
  if (pictures.length) {
    const drawingFile = `xl/drawings/${drawingName}.xml`;
    zip.file(drawingFile, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${relNs}">${pictures.join("")}</xdr:wsDr>`);
    zip.file(`xl/drawings/_rels/${drawingName}.xml.rels`, `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${packageNs}">${imageRels.join("")}</Relationships>`);
    const relFile = path.posix.join(path.posix.dirname(sheetFile), "_rels", path.posix.basename(sheetFile) + ".rels");
    let sheetRels = zip.file(relFile) ? await zip.file(relFile)!.async("string") : `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${packageNs}"></Relationships>`;
    const relation = "rIdCompletionPhotos";
    if (xml.includes("<drawing ") || sheetRels.includes(`Id="${relation}"`)) throw new Error("Template already contains photo drawings; preserve them before appending.");
    sheetRels = sheetRels.replace("</Relationships>", `<Relationship Id="${relation}" Type="${relNs}/drawing" Target="../drawings/${drawingName}.xml"/></Relationships>`);
    zip.file(relFile, sheetRels);
    xml = xml.replace("</worksheet>", `<drawing xmlns:r="${relNs}" r:id="${relation}"/></worksheet>`);
    let types = await zip.file("[Content_Types].xml")!.async("string");
    types = types.replace("</Types>", `<Override PartName="/${drawingFile}" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`);
    zip.file("[Content_Types].xml", types);
  }
  return xml;
}
