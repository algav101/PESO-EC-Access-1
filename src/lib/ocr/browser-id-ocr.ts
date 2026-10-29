import jsQR from "jsqr";
import type { Page, Worker, PSM } from "tesseract.js";
import {
  mapLocalIdentityText, mergeOcrSides, detectIdentityDocumentType, extractPhilSysNumber, NON_BIRTH_DATE_LABEL, ORDERED_NAME_LABEL, isIdentityLabel,
  type MappedOcrSide, type OcrSubject, type OcrTextLine,
} from "./application-id-mapper";
import { combineLocalReadings, fieldCrops, driverFrontFieldCrops, numberRescueCrops, philsysFrontNumberCrops, philsysBackCivilCrops, identityScore, parseIdentityQr, type LocalReading } from "./local-id-reader";
import { getIdentityProfile } from "./identity-profiles";
import { extractProfileNumber } from "./id-number-reader";
import { lightDocumentBounds } from "./document-image";

const ASSETS = "/ocr/local-v1";
const MAX_SIZE = 2600;
const fileCache = new WeakMap<File, Map<string, MappedOcrSide>>();

interface ReaderOptions {
  selectedIdType: string;
  frontFile?: File;
  backFile?: File;
  numberFile?: File;
  subject: OcrSubject;
  signal?: AbortSignal;
  force?: boolean;
  onProgress?: (message: string) => void;
}

function active(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("ID reading was cancelled.", "AbortError");
}

function canvas(width: number, height: number) {
  const result = document.createElement("canvas");
  result.width = Math.max(1, Math.round(width));
  result.height = Math.max(1, Math.round(height));
  return result;
}

function context(image: HTMLCanvasElement) {
  const result = image.getContext("2d", { willReadFrequently: true });
  if (!result) throw new Error("Hindi available ang image reader sa browser na ito.");
  return result;
}

async function renderFile(file: File, signal?: AbortSignal): Promise<{ pages: HTMLCanvasElement[]; truncated: boolean }> {
  if (file.type === "application/pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = `${ASSETS}/pdf.worker.min.js`;
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false });
    const pdf = await task.promise;
    const pages: HTMLCanvasElement[] = [];
    try {
      for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 2); pageNumber++) {
        active(signal);
        const page = await pdf.getPage(pageNumber);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(3, MAX_SIZE / Math.max(base.width, base.height)) });
        const image = canvas(viewport.width, viewport.height);
        await page.render({ canvasContext: context(image), viewport }).promise;
        pages.push(image);
        page.cleanup();
      }
      return { pages, truncated: pdf.numPages > 2 };
    } finally { await pdf.destroy(); }
  }
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch { throw new Error("Hindi mabuksan ang ID image. Gumamit ng malinaw na JPG o PNG, o PDF."); }
  try {
    const scale = Math.min(3, MAX_SIZE / Math.max(bitmap.width, bitmap.height));
    const image = canvas(bitmap.width * scale, bitmap.height * scale);
    context(image).drawImage(bitmap, 0, 0, image.width, image.height);
    return { pages: [image], truncated: false };
  } finally { bitmap.close(); }
}

function rotate(source: HTMLCanvasElement, degrees: number) {
  const sideways = degrees % 180 !== 0;
  const image = canvas(sideways ? source.height : source.width, sideways ? source.width : source.height);
  const ctx = context(image);
  ctx.translate(image.width / 2, image.height / 2);
  ctx.rotate(degrees * Math.PI / 180);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return image;
}

function crop(source: HTMLCanvasElement, left: number, top: number, width: number, height: number) {
  const scale = Math.min(2.5, MAX_SIZE / Math.max(width, height));
  const image = canvas(width * scale + 32, height * scale + 32);
  const ctx = context(image);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, image.width, image.height);
  ctx.drawImage(source, left, top, width, height, 16, 16, width * scale, height * scale);
  return image;
}

function isolateLicenseCard(source: HTMLCanvasElement) {
  const scale = Math.min(1, 320 / Math.max(source.width, source.height));
  const thumbnail = canvas(source.width * scale, source.height * scale);
  try {
    const ctx = context(thumbnail); ctx.drawImage(source, 0, 0, thumbnail.width, thumbnail.height);
    const bounds = lightDocumentBounds(ctx.getImageData(0, 0, thumbnail.width, thumbnail.height).data, thumbnail.width, thumbnail.height);
    return bounds ? crop(source, bounds.left * source.width, bounds.top * source.height, bounds.width * source.width, bounds.height * source.height) : source;
  } finally { thumbnail.width = thumbnail.height = 1; }
}

// Percentile contrast stretching preserves pale ID text without a fixed threshold.
function enhance(source: HTMLCanvasElement, adaptive = false) {
  const image = canvas(source.width, source.height);
  const ctx = context(image);
  ctx.drawImage(source, 0, 0);
  const pixels = ctx.getImageData(0, 0, image.width, image.height);
  const gray = new Uint8Array(image.width * image.height);
  const histogram = new Uint32Array(256);
  for (let index = 0; index < gray.length; index++) {
    gray[index] = Math.round(pixels.data[index * 4] * 0.299 + pixels.data[index * 4 + 1] * 0.587 + pixels.data[index * 4 + 2] * 0.114);
    histogram[gray[index]]++;
  }
  let low = 0, high = 255, count = 0;
  for (; low < 255; low++) { count += histogram[low]; if (count >= gray.length * 0.015) break; }
  count = 0;
  for (; high > low; high--) { count += histogram[high]; if (count >= gray.length * 0.015) break; }
  for (let index = 0; index < gray.length; index++) gray[index] = Math.max(0, Math.min(255, (gray[index] - low) * 255 / Math.max(1, high - low)));
  const stride = image.width + 1;
  const integral = adaptive ? new Uint32Array(stride * (image.height + 1)) : null;
  if (integral) for (let y = 1; y <= image.height; y++) {
    let sum = 0;
    for (let x = 1; x <= image.width; x++) {
      sum += gray[(y - 1) * image.width + x - 1];
      integral[y * stride + x] = integral[(y - 1) * stride + x] + sum;
    }
  }
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    const index = y * image.width + x;
    let value = gray[index];
    if (integral) {
      const x0 = Math.max(0, x - 22), y0 = Math.max(0, y - 22);
      const x1 = Math.min(image.width, x + 23), y1 = Math.min(image.height, y + 23);
      const sum = integral[y1 * stride + x1] - integral[y0 * stride + x1] - integral[y1 * stride + x0] + integral[y0 * stride + x0];
      value = value < sum / ((x1 - x0) * (y1 - y0)) - 10 ? 0 : 255;
    }
    pixels.data[index * 4] = pixels.data[index * 4 + 1] = pixels.data[index * 4 + 2] = value;
  }
  ctx.putImageData(pixels, 0, 0);
  return image;
}

// Dark-ink separation suppresses pale colored security microprinting. It is an
// additional view, not a replacement for the original/contrast OCR passes.
function inkMask(source: HTMLCanvasElement, threshold: number) {
  const image = canvas(source.width, source.height);
  const ctx = context(image); ctx.drawImage(source, 0, 0);
  const pixels = ctx.getImageData(0, 0, image.width, image.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const value = Math.min(pixels.data[index], pixels.data[index + 1], pixels.data[index + 2]) < threshold ? 0 : 255;
    pixels.data[index] = pixels.data[index + 1] = pixels.data[index + 2] = value;
  }
  ctx.putImageData(pixels, 0, 0);
  return image;
}

function inkTextLine(source: HTMLCanvasElement, threshold: number) {
  const mask = inkMask(source, threshold);
  const pixels = context(mask).getImageData(0, 0, mask.width, mask.height).data;
  const counts = new Uint32Array(mask.height);
  let peak = 0;
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) if (pixels[(y * mask.width + x) * 4] === 0) counts[y]++;
    peak = Math.max(peak, counts[y]);
  }
  let start = -1, last = -1, score = 0, best = { top: 0, bottom: mask.height - 1, score: 0 };
  for (let y = 0; y <= mask.height + 3; y++) {
    if (y < mask.height && counts[y] >= Math.max(8, peak * .28)) {
      if (start < 0) start = y;
      last = y; score += counts[y];
    } else if (start >= 0 && y - last > 3) {
      if (score > best.score) best = { top: start, bottom: last, score };
      start = -1; score = 0;
    }
  }
  if (!best.score) return mask;
  const top = Math.max(0, best.top - 8), bottom = Math.min(mask.height, best.bottom + 9);
  const line = canvas(mask.width + 24, bottom - top + 24);
  const ctx = context(line); ctx.fillStyle = "white"; ctx.fillRect(0, 0, line.width, line.height);
  ctx.drawImage(mask, 0, top, mask.width, bottom - top, 12, 12, mask.width, bottom - top);
  mask.width = mask.height = 1;
  return line;
}

function readQr(image: HTMLCanvasElement): Record<string, string> {
  const regions = [image];
  // Dense real-card QR codes can decode better at native/medium resolution than
  // after the whole ID has been enlarged for text recognition.
  for (const rightOnly of [false, true]) {
    const left = rightOnly ? image.width * .4 : 0, width = image.width - left;
    const scale = Math.min(1, (rightOnly ? 900 : 1280) / Math.max(width, image.height));
    const region = canvas(width * scale, image.height * scale);
    context(region).drawImage(image, left, 0, width, image.height, 0, 0, region.width, region.height);
    regions.push(region);
  }
  try {
    for (const region of regions) {
      const data = context(region).getImageData(0, 0, region.width, region.height);
      const qr = jsQR(data.data, data.width, data.height, { inversionAttempts: "attemptBoth" });
      if (qr?.data) {
        const values = parseIdentityQr(qr.data);
        if (Object.keys(values).length) return values;
      }
    }
    for (const region of regions.slice(1)) for (const threshold of [110, 130, 150]) {
      const mask = inkMask(region, threshold);
      try {
        const data = context(mask).getImageData(0, 0, mask.width, mask.height);
        const qr = jsQR(data.data, data.width, data.height, { inversionAttempts: "attemptBoth" });
        if (qr?.data) {
          const values = parseIdentityQr(qr.data);
          if (Object.keys(values).length) return values;
        }
      } finally { mask.width = mask.height = 1; }
    }
    return {};
  } finally { for (const region of regions.slice(1)) region.width = region.height = 1; }
}

function linesFromPage(page: Page, splitColumns = false): OcrTextLine[] {
  return (page.blocks || []).flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines.flatMap((line) => {
    if (!splitColumns || !line.words?.length) return [{ text: line.text.trim(), confidence: line.confidence, left: line.bbox.x0, top: line.bbox.y0, width: line.bbox.x1 - line.bbox.x0, height: line.bbox.y1 - line.bbox.y0 }];
    const groups: typeof line.words[] = [];
    for (const word of line.words) {
      const group = groups[groups.length - 1], previous = group?.[group.length - 1];
      if (!previous || word.bbox.x0 - previous.bbox.x1 > Math.max(18, Math.min(word.bbox.y1 - word.bbox.y0, previous.bbox.y1 - previous.bbox.y0) * 1.6)) groups.push([word]);
      else group.push(word);
    }
    return groups.map((words) => {
      const left = Math.min(...words.map((word) => word.bbox.x0)), top = Math.min(...words.map((word) => word.bbox.y0));
      return { text: words.map((word) => word.text).join(" "), confidence: words.reduce((sum, word) => sum + word.confidence, 0) / words.length, left, top, width: Math.max(...words.map((word) => word.bbox.x1)) - left, height: Math.max(...words.map((word) => word.bbox.y1)) - top };
    });
  })));
}

export async function readIdentityFilesInBrowser(options: ReaderOptions) {
  const { subject, signal, onProgress, force, selectedIdType } = options;
  const profile = getIdentityProfile(selectedIdType);
  if (!profile) throw new Error("Piliin muna ang uri ng ID bago mag-upload.");
  const combine = (readings: LocalReading[], qrValues: Record<string, string>) => combineLocalReadings(readings, subject, qrValues, selectedIdType);
  const files = [options.frontFile ? { file: options.frontFile, side: "front" } : null, options.backFile ? { file: options.backFile, side: "back" } : null,
    subject === "APPLICANT" && options.numberFile ? { file: options.numberFile, side: "number" } : null]
    .filter((entry): entry is { file: File; side: string } => Boolean(entry));
  if (!files.length) throw new Error("Upload an ID image or PDF first.");
  let worker: Worker | undefined;
  let stage = "Preparing ID";
  let truncated = false;
  const sideErrors: string[] = [];
  const progress = (message: string) => { if (!signal?.aborted) onProgress?.(message); };
  const terminate = () => { if (worker) void worker.terminate().catch(() => undefined); };
  signal?.addEventListener("abort", terminate, { once: true });
  const getWorker = async () => {
    active(signal);
    if (!worker) {
      const { createWorker } = await import("tesseract.js");
      progress("Loading local ID reader...");
      worker = await createWorker("eng", 1, {
        workerPath: new URL(`${ASSETS}/worker.min.js`, window.location.origin).href,
        corePath: new URL(`${ASSETS}/core`, window.location.origin).href,
        langPath: new URL(ASSETS, window.location.origin).href,
        logger: (event) => { if (event.status === "recognizing text") progress(`${stage}... ${Math.round(event.progress * 100)}%`); },
      });
      if (signal?.aborted) { terminate(); active(signal); }
    }
    return worker;
  };
  const scan = async (image: HTMLCanvasElement, mode: PSM, prefix = "", kind?: "name" | "date" | "number" | "pcn" | "address" | "choice") => {
    const reader = await getWorker();
    await reader.setParameters({
      tessedit_pageseg_mode: mode, user_defined_dpi: "300", preserve_interword_spaces: "1",
      tessedit_char_whitelist: kind === "name" ? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz Ññ',- ." : kind === "pcn" ? "0123456789- " : kind === "number" ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- /." : "",
    });
    active(signal);
    const result = await reader.recognize(image, { rotateAuto: true }, { text: true, blocks: true });
    active(signal);
    const lines = linesFromPage(result.data, selectedIdType === "DRIVER LICENSE ID");
    let mapped = mapLocalIdentityText(result.data.text, subject, {}, lines, selectedIdType);
    if (kind === "name" && ORDERED_NAME_LABEL.test(prefix)) {
      // In a tight combined-name crop, a broken heading ("First Name. TE")
      // must not become a person's name. Keep the one surname-first value
      // group; word geometry excludes distant artifacts on that baseline.
      const names = lines.filter((line) => !isIdentityLabel(line.text) && /^[\p{L}][\p{L}\s',.-]+$/u.test(line.text) && /[,.]\s+\p{L}/u.test(line.text));
      mapped = names.length === 1 ? mapLocalIdentityText(prefix + names[0].text, subject, {}, [], selectedIdType) : { fields: {}, uncertainFields: [] };
    } else if (prefix) {
      // Prefer real labels inside the crop. Only supply context for values whose
      // label was cropped out; duplicate VIN/PCN headings must not hide a number.
      const contextual = mapLocalIdentityText(prefix + result.data.text, subject, {}, [], selectedIdType);
      if (kind === "date" && NON_BIRTH_DATE_LABEL.test(result.data.text)) {
        delete contextual.fields.birthDate; delete contextual.fields.applicantAge;
        delete contextual.fields.dependentBirthDate; delete contextual.fields.dependentAge;
      }
      for (const key of Object.keys(contextual.fields) as Array<keyof typeof contextual.fields>) {
        if (mapped.fields[key] === undefined) (mapped.fields as Record<string, unknown>)[key] = contextual.fields[key];
      }
      mapped.uncertainFields = [...new Set([...mapped.uncertainFields, ...contextual.uncertainFields])];
    }
    if (subject === "APPLICANT" && (kind === "number" || kind === "pcn")) {
      const number = profile.nationalLayout ? extractPhilSysNumber(result.data.text, lines)
        : extractProfileNumber(result.data.text, selectedIdType, false, lines);
      if (number) mapped.fields.idNumber = number;
    }
    if (subject === "APPLICANT" && kind === "choice" && prefix) {
      const choices = prefix.startsWith("Civil Status")
        ? [...result.data.text.toUpperCase().matchAll(/\b(?:MARRIED|SINGLE|WIDOWED|SEPARATED|SEPPARATED)\b/g)].map((match) => match[0] === "SEPARATED" ? "SEPPARATED" : match[0])
        : [...result.data.text.toUpperCase().matchAll(/\b(?:MALE|FEMALE)\b/g)].map((match) => match[0]);
      const unique = [...new Set(choices)];
      if (unique.length === 1) (mapped.fields as Record<string, unknown>)[prefix.startsWith("Civil Status") ? "civilStatus" : "sex"] = unique[0];
    }
    return { mapped, detectedType: detectIdentityDocumentType(result.data.text), confidence: result.data.confidence, weight: prefix && result.data.confidence >= 45 ? 2 : 1, lines, text: result.data.text };
  };

  try {
    const { PSM } = await import("tesseract.js");
    const sides = new Map<string, MappedOcrSide | null>();
    for (const entry of files) {
      active(signal);
      const cacheKey = `${subject}:${entry.side}:${selectedIdType}`;
      const cached = !force && fileCache.get(entry.file)?.get(cacheKey);
      if (cached) { sides.set(entry.side, cached); continue; }
      try {
      progress(`Preparing ${entry.side} ID and reading QR...`);
      const rendered = await renderFile(entry.file, signal);
      truncated ||= rendered.truncated;
      const readings: LocalReading[] = [];
      let qrValues: Record<string, string> = {};
      try {
        for (const source of rendered.pages) {
          active(signal);
          qrValues = { ...qrValues, ...readQr(source) };
          const qrType = mapLocalIdentityText("", "APPLICANT", qrValues).fields.idType;
          if (qrType && qrType !== selectedIdType) throw new Error(`Pinili ang ${selectedIdType}, pero ${qrType} ang nasa QR. Pakitama ang ID selection o picture.`);
          stage = `Reading ${entry.side} ID`;
          const documentSource = selectedIdType === "DRIVER LICENSE ID" ? isolateLicenseCard(source) : source;
          let selected = documentSource;
          let best = await scan(documentSource, PSM.SPARSE_TEXT);
          const orientationScore = (reading: typeof best) => identityScore(reading.mapped, subject)
            + (subject === "APPLICANT" ? Number(Boolean(reading.mapped.fields.streetSitio)) + Number(Boolean(reading.mapped.fields.barangay)) : 0)
            + (selectedIdType === "DRIVER LICENSE ID" ? Number(reading.detectedType === selectedIdType) * 6
              + Math.min(4, (reading.text.match(/LAST\s*NAME|FIRST\s*NAME|MIDDLE\s*NAME|DATE\s*OF\s*BIRTH|LICEN[CS]E\s*(?:NO|NUMBER)|\bADDRESS\b/gi) || []).length) * .4 : 0);
          // Right-angle rotation recovery is distinct from small-angle deskew.
          if ((identityScore(best.mapped, subject) < 3 || selectedIdType === "DRIVER LICENSE ID" && (documentSource.height > documentSource.width || best.detectedType !== selectedIdType)) && identityScore(mapLocalIdentityText("", subject, qrValues), subject) < 3) for (const angle of [90, 180, 270]) {
            stage = `Checking ${entry.side} ID orientation (${angle} degrees)`;
            const turned = rotate(documentSource, angle);
            const candidate = await scan(turned, PSM.SPARSE_TEXT);
            if (orientationScore(candidate) > orientationScore(best)) {
              if (selected !== documentSource) selected.width = selected.height = 1;
              selected = turned; best = candidate;
            } else turned.width = turned.height = 1;
            if (identityScore(best.mapped, subject) >= 3 && (selectedIdType !== "DRIVER LICENSE ID" || best.detectedType === selectedIdType)) break;
          }
          readings.push(best);
          const enhanced = enhance(selected);
          try {
            stage = `Enhancing and rechecking ${entry.side} ID`;
            const contrast = await scan(enhanced, PSM.SPARSE_TEXT);
            if (best.detectedType && best.detectedType === contrast.detectedType && best.detectedType !== selectedIdType) {
              throw new Error(`Pinili ang ${selectedIdType}, pero ${best.detectedType} ang nabasa sa picture. Pakitama ang ID selection o picture.`);
            }
            readings.push(contrast);
            const licenseReadings = selectedIdType === "DRIVER LICENSE ID" ? [await scan(selected, PSM.AUTO), await scan(enhanced, PSM.AUTO)] : [];
            readings.push(...licenseReadings);
            if (selectedIdType === "DRIVER LICENSE ID") {
              const licenseLines = [...licenseReadings.flatMap((reading) => reading.lines), ...contrast.lines, ...best.lines];
              for (const region of driverFrontFieldCrops(licenseLines, selected.width, selected.height)) {
                if (subject !== "APPLICANT" && region.kind !== "name" && region.kind !== "date") continue;
                stage = `Reading driver's license ${region.label.toLowerCase()} section`;
                const detail = crop(selected, region.left, region.top, region.width, region.height);
                const gray = enhance(detail), threshold = enhance(detail, true);
                try {
                  for (const variant of [detail, gray, threshold]) {
                    const reading = await scan(variant, PSM.SINGLE_BLOCK, region.label + "\n", region.kind);
                    const allowed = region.kind === "name" ? ["givenName", "lastName", "middleName", "extensionName", "dependentGivenName", "dependentLastName", "dependentMiddleName", "dependentExtensionName"]
                      : region.kind === "date" ? ["birthDate", "dependentBirthDate"] : region.kind === "number" ? ["idNumber"] : region.kind === "choice" ? ["sex"] : ["streetSitio", "barangay"];
                    for (const key of Object.keys(reading.mapped.fields)) if (!allowed.includes(key)) delete (reading.mapped.fields as Record<string, unknown>)[key];
                    reading.weight = reading.confidence >= 45 ? 3 : 1;
                    readings.push(reading);
                  }
                } finally { detail.width = detail.height = gray.width = gray.height = threshold.width = threshold.height = 1; }
              }
            }
            const crops = fieldCrops([...licenseReadings.flatMap((reading) => reading.lines), ...contrast.lines, ...best.lines], enhanced.width, enhanced.height, selectedIdType);
            for (const region of crops) {
              if ((region.kind === "address" || region.kind === "choice") && subject !== "APPLICANT") continue;
              stage = `Reading ${entry.side} ${region.label.toLowerCase()} closely`;
              const detail = crop(enhanced, region.left, region.top, region.width, region.height);
              try {
                const reading = await scan(detail, PSM.SINGLE_BLOCK, region.kind === "address" ? "" : region.label + "\n", region.kind);
                if (selectedIdType === "DRIVER LICENSE ID" && region.kind === "name") {
                  const originalName = crop(selected, region.left, region.top, region.width, region.height);
                  try { readings.push(await scan(originalName, PSM.SINGLE_BLOCK, region.label + "\n", "name")); }
                  finally { originalName.width = originalName.height = 1; }
                }
                if (region.kind === "choice" && !(region.label === "Civil Status" ? reading.mapped.fields.civilStatus : reading.mapped.fields.sex)) {
                  const originalChoice = crop(selected, region.left, region.top, region.width, region.height);
                  try {
                    for (const cutoff of [70, 90]) {
                      const ink = inkTextLine(originalChoice, cutoff);
                      try { readings.push(await scan(ink, PSM.SINGLE_LINE, region.label + "\n", "choice")); }
                      finally { ink.width = ink.height = 1; }
                    }
                  } finally { originalChoice.width = originalChoice.height = 1; }
                }
                if (region.kind === "address") {
                  // A close-up must not override names from other sections.
                  for (const key of Object.keys(reading.mapped.fields) as Array<keyof typeof reading.mapped.fields>) {
                    if (key !== "streetSitio" && key !== "barangay") delete reading.mapped.fields[key];
                  }
                  reading.weight = reading.confidence >= 45 ? 2 : 1;
                  if (!reading.mapped.fields.barangay || reading.confidence < 75) {
                    const originalAddress = crop(selected, region.left, region.top, region.width, region.height);
                    try {
                      for (const cutoff of [70, 90, 110]) {
                        const ink = inkTextLine(originalAddress, cutoff);
                        try {
                          const alternate = await scan(ink, PSM.SINGLE_LINE, "Address\n", "address");
                          if (alternate.mapped.fields.barangay && alternate.mapped.fields.streetSitio) {
                            alternate.mapped.fields = { streetSitio: alternate.mapped.fields.streetSitio, barangay: alternate.mapped.fields.barangay };
                            alternate.weight = 4;
                            readings.push(alternate);
                          }
                        } finally { ink.width = ink.height = 1; }
                      }
                    } finally { originalAddress.width = originalAddress.height = 1; }
                  }
                }
                readings.push(reading);
              }
              finally { detail.width = detail.height = 1; }
            }
            let combined = combine(readings, qrValues);
            const national = profile.nationalLayout;
            // Confirm the physical PhilSys number in its own above-left region,
            // even if full-page OCR picked a different 16-digit background number.
            const qrNumber = mapLocalIdentityText("", subject, qrValues, [], selectedIdType).fields.idNumber;
            if (national && subject === "APPLICANT" && entry.side === "front" && !qrNumber) {
              for (const region of philsysFrontNumberCrops([...contrast.lines, ...best.lines], selected.width, selected.height)) {
                stage = "Reading National ID upper-left PCN section";
                const detail = crop(selected, region.left, region.top, region.width, region.height);
                const threshold = enhance(detail, true);
                try {
                  const original = await scan(detail, PSM.SPARSE_TEXT);
                  const enhancedNumber = await scan(threshold, PSM.SPARSE_TEXT);
                  const alternatives = [original, enhancedNumber];
                  if (!original.mapped.fields.idNumber || original.mapped.fields.idNumber !== enhancedNumber.mapped.fields.idNumber) {
                    for (const cutoff of [50, 65, 85]) {
                      const ink = inkTextLine(detail, cutoff);
                      try { alternatives.push(await scan(ink, PSM.SINGLE_LINE, "", "pcn")); }
                      finally { ink.width = ink.height = 1; }
                    }
                  }
                  const agreed = alternatives.find((reading) => reading.mapped.fields.idNumber && alternatives.filter((other) => other.mapped.fields.idNumber === reading.mapped.fields.idNumber).length >= 2);
                  if (agreed?.mapped.fields.idNumber) {
                    const first = agreed.mapped.fields.idNumber;
                    // Location plus agreement strengthens the draft; never treat
                    // agreement as identity authentication or fill other fields.
                    for (const reading of alternatives.filter((reading) => reading.mapped.fields.idNumber === first).slice(0, 2)) readings.push({ ...reading,
                      mapped: { fields: { idNumber: first }, uncertainFields: ["idNumber"] }, weight: 3 });
                    break;
                  }
                } finally { detail.width = detail.height = threshold.width = threshold.height = 1; }
              }
              combined = combine(readings, qrValues);
            }
            if (national && identityScore(combined, subject) < (subject === "APPLICANT" ? 5 : 4)) {
              stage = `Reading ${entry.side} ID name and birthday section`;
              const column = crop(enhanced, enhanced.width * 0.38, enhanced.height * 0.2, enhanced.width * 0.6, enhanced.height * 0.65);
              try { readings.push(await scan(column, PSM.SPARSE_TEXT)); }
              finally { column.width = column.height = 1; }
              combined = combine(readings, qrValues);
            }
            if (subject === "APPLICANT" && !combined.fields.idNumber) {
              const regions = numberRescueCrops([...best.lines, ...contrast.lines], selected.width, selected.height, selectedIdType);
              for (const [index, region] of regions.entries()) {
                stage = `Reading ${profile.numberLabel} closely (${index + 1}/${regions.length})`;
                const number = crop(selected, region.left, region.top, region.width, region.height);
                const threshold = enhance(number, true);
                try {
                  const mode = region.singleLine ? PSM.SINGLE_LINE : PSM.SPARSE_TEXT;
                  // Restrict digits only on a tight numeric row, not a broad band.
                  const kind = region.singleLine && profile.nationalLayout ? "pcn" as const : region.singleLine ? "number" as const : undefined;
                  // No artificial document headings. Read original glyphs before
                  // thresholding, so a whitelist cannot silently erase letters.
                  const prefix = region.source === "label" ? profile.numberLabel + "\n" : "";
                  readings.push(await scan(number, mode, prefix));
                  readings.push(await scan(threshold, mode, prefix, kind));
                } finally { number.width = number.height = threshold.width = threshold.height = 1; }
                if (combine(readings, qrValues).fields.idNumber) break;
              }
            }
            if (entry.side !== "number" && identityScore(combine(readings, qrValues), subject) < (subject === "APPLICANT" ? 5 : 4)) {
              stage = `Recovering faint text on ${entry.side} ID`;
              const threshold = enhance(selected, true);
              try {
                const recovered = await scan(threshold, PSM.SPARSE_TEXT);
                readings.push(recovered);
                const birthday = subject === "APPLICANT" ? "birthDate" : "dependentBirthDate";
                if (!combine(readings, qrValues).fields[birthday]) {
                  for (const region of fieldCrops(recovered.lines, threshold.width, threshold.height, selectedIdType).filter((region) => region.kind === "date")) {
                    stage = `Recovering ${entry.side} birthday closely`;
                    const detail = crop(threshold, region.left, region.top, region.width, region.height);
                    try { readings.push(await scan(detail, PSM.SINGLE_BLOCK, "Date of Birth\n", "date")); }
                    finally { detail.width = detail.height = 1; }
                  }
                }
              }
              finally { threshold.width = threshold.height = 1; }
            }
            // A decoded PhilSys QR identifies the card family, but does not carry
            // civil status. Recover the physical back's left-hand status section.
            if (national && subject === "APPLICANT" && entry.side === "back" && qrNumber && !combine(readings, qrValues).fields.civilStatus) {
              for (const region of philsysBackCivilCrops([...best.lines, ...contrast.lines], selected.width, selected.height)) {
                stage = "Reading National ID back civil status section";
                const detail = crop(selected, region.left, region.top, region.width, region.height);
                try {
                  const variants = [detail, inkTextLine(detail, 70), inkTextLine(detail, 90)];
                  try {
                    for (const variant of variants) {
                      const reading = await scan(variant, PSM.SINGLE_BLOCK, "Civil Status\n", "choice");
                      if (reading.mapped.fields.civilStatus) readings.push({ ...reading, mapped: { fields: { civilStatus: reading.mapped.fields.civilStatus }, uncertainFields: ["civilStatus"] }, weight: 2 });
                    }
                  } finally { for (const variant of variants.slice(1)) variant.width = variant.height = 1; }
                } finally { detail.width = detail.height = 1; }
                if (combine(readings, qrValues).fields.civilStatus) break;
              }
            }
          } finally {
            enhanced.width = enhanced.height = 1;
            if (selected !== source) selected.width = selected.height = 1;
            if (documentSource !== source && documentSource !== selected) documentSource.width = documentSource.height = 1;
          }
        }
        const mapped = combine(readings, qrValues);
        if (entry.side === "number") {
          for (const key of Object.keys(mapped.fields) as Array<keyof typeof mapped.fields>) {
            if (key !== "idNumber") delete mapped.fields[key];
          }
          mapped.uncertainFields = mapped.fields.idNumber ? ["idNumber"] : [];
        }
        active(signal);
        const cache = fileCache.get(entry.file) || new Map<string, MappedOcrSide>();
        cache.set(cacheKey, mapped); fileCache.set(entry.file, cache);
        sides.set(entry.side, mapped);
      } finally { for (const image of rendered.pages) image.width = image.height = 1; }
      } catch (error) {
        active(signal);
        sides.set(entry.side, null);
        sideErrors.push(`${entry.side}: ${error instanceof Error ? error.message : "Hindi nabasa ang larawan."}`);
      }
    }
    const primary = mergeOcrSides(sides.get("front") || null, sides.get("back") || null);
    const result = sides.has("number") ? mergeOcrSides(primary, sides.get("number") || null) : primary;
    if (sides.has("number") && primary.conflicts.length) {
      result.conflicts = [...primary.conflicts, ...result.conflicts];
      result.status = "Needs Review";
    }
    const missingPcn = subject === "APPLICANT" && result.fields.idType === "NATIONAL ID" && !result.fields.idNumber;
    const reviewFields: Array<[keyof typeof result.fields, string]> = subject === "APPLICANT"
      ? [["givenName", "Given name"], ["middleName", "Middle name"], ["lastName", "Last name"], ["birthDate", "Birthday"], ["idNumber", "ID number"], ["sex", "Sex"], ["civilStatus", "Civil status"],
        ...(selectedIdType === "PASSPORT" ? [] : [["streetSitio", "Street/Purok/Sitio"], ["barangay", "Barangay"]] as Array<[keyof typeof result.fields, string]>)]
      : [["dependentGivenName", "Given name"], ["dependentMiddleName", "Middle name"], ["dependentLastName", "Last name"], ["dependentBirthDate", "Birthday"]];
    const missingFields = reviewFields.filter(([key]) => !result.fields[key]).map(([, label]) => label);
    return {
      configured: true as const, ...result, provider: "LOCAL_ENHANCED_OCR+QR", selectedIdType, missingFields,
      message: (result.status === "Unable to Read ID"
        ? "Hindi malinaw ang nabasang details. I-crop sa ID lang, kumuha ng mas malinaw na larawan, o mag-encode manually."
        : "Nabasa ang ID. Pakireview ang pangalan, birthday, at ID number bago isumite.") + (missingPcn ? " Hindi pa nabasa nang buo ang 16-digit PCN. Kumuha ng mas malapit na front photo o i-encode ang numerong nakalimbag sa ID." : "") + (truncated ? " Unang dalawang page lang ng bawat PDF ang binasa." : "") + (sideErrors.length ? " May hindi nabasang side: " + sideErrors.join("; ") : ""),
    };
  } finally {
    signal?.removeEventListener("abort", terminate);
    if (worker) await worker.terminate().catch(() => undefined);
  }
}
