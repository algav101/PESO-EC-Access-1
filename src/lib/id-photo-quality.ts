export interface IdPhotoQuality {
  brightness: number;
  contrast: number;
  sharpness: number;
  score: number;
  warnings: string[];
}

/** Capture guidance only, not OCR confidence, document validity, or identity verification. */
export function analyzeIdPhoto(data: Uint8ClampedArray, width: number, height: number, nativeLongEdge: number, minimumLongEdge = 1200): IdPhotoQuality {
  if (width < 3 || height < 3 || data.length !== width * height * 4) throw new Error("Invalid quality-analysis image");
  const gray = new Float32Array(width * height);
  let sum = 0, squared = 0, white = 0;
  for (let index = 0; index < gray.length; index++) {
    const value = data[index * 4] * .299 + data[index * 4 + 1] * .587 + data[index * 4 + 2] * .114;
    gray[index] = value; sum += value; squared += value * value;
    if (value >= 250) white++;
  }
  const brightness = sum / gray.length;
  const contrast = Math.sqrt(Math.max(0, squared / gray.length - brightness * brightness));
  let energy = 0;
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const index = y * width + x;
    const edge = gray[index] * 4 - gray[index - 1] - gray[index + 1] - gray[index - width] - gray[index + width];
    energy += edge * edge;
  }
  const sharpness = energy / ((width - 2) * (height - 2));
  const warnings: string[] = [];
  if (nativeLongEdge < minimumLongEdge) warnings.push("Maliit pa ang ID sa kuha. Ilapit ang ID o i-landscape ang phone para mas maraming detalye ang makuha.");
  if (brightness < 60) warnings.push("Madilim ang kuha. Lumipat sa maliwanag na lugar o buksan ang camera light kung available.");
  if (white / gray.length > .82 && contrast < 30) warnings.push("Sobrang liwanag o may glare. Iwasang tumapat ang ilaw sa ID.");
  else if (contrast < 17) warnings.push("Mahina ang contrast ng sulat. Ayusin ang ilaw at tiyaking nakatutok ang camera sa ID.");
  if (sharpness < 65 && contrast >= 17) warnings.push("Maaaring malabo ang sulat. Linisin ang lens at i-steady muna ang phone bago kumuha.");
  const score = Math.log1p(sharpness) * 10 + Math.min(contrast, 70) * .3 + Math.min(nativeLongEdge / minimumLongEdge, 1.5) * 12 - warnings.length * 12;
  return { brightness, contrast, sharpness, score, warnings };
}

/** A supplemental OCR view for shadows/color casts. Original pixels are never overwritten. */
export function normalizeIdLighting(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  if (width < 1 || height < 1 || data.length !== width * height * 4) throw new Error("Invalid normalization image");
  const stride = width + 1;
  // OCR images are capped below 8M pixels; a 32-bit sum stays below 2^32.
  if (width * height > 8_000_000) throw new Error("Normalization image exceeds the OCR size budget");
  const integral = new Uint32Array(stride * (height + 1));
  const gray = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      gray[index] = data[index * 4] * .299 + data[index * 4 + 1] * .587 + data[index * 4 + 2] * .114;
      row += gray[index]; integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + row;
    }
  }
  const radius = Math.max(16, Math.round(Math.min(width, height) / 18));
  const output = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const left = Math.max(0, x - radius), right = Math.min(width, x + radius + 1);
    const top = Math.max(0, y - radius), bottom = Math.min(height, y + radius + 1);
    const average = (integral[bottom * stride + right] - integral[top * stride + right] - integral[bottom * stride + left] + integral[top * stride + left]) / ((right - left) * (bottom - top));
    const index = y * width + x;
    const value = Math.max(0, Math.min(255, gray[index] * 225 / Math.max(35, average)));
    output[index * 4] = output[index * 4 + 1] = output[index * 4 + 2] = value;
    output[index * 4 + 3] = 255;
  }
  return output;
}
