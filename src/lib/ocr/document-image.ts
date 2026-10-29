export interface DocumentBounds { left: number; top: number; width: number; height: number }

/** Conservative light-card detection on a small thumbnail, not a fixed ID ROI.
 * Returns normalized bounds only when a large, solid document stands apart
 * from a darker background. Never edits the uploaded file or guesses text.
 */
export function lightDocumentBounds(data: Uint8ClampedArray, width: number, height: number): DocumentBounds | null {
  const size = width * height;
  if (width < 30 || height < 30 || width > 512 || height > 512 || data.length !== size * 4) return null;
  const light = new Uint8Array(size), queue = new Uint32Array(size);
  for (let i = 0; i < size; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    light[i] = data[i * 4 + 3] > 200 && Math.min(r, g, b) >= 90 && r * .299 + g * .587 + b * .114 >= 155 && Math.max(r, g, b) - Math.min(r, g, b) < 100 ? 1 : 0;
  }
  let best: { left: number; top: number; right: number; bottom: number; area: number } | null = null;
  for (let i = 0; i < size; i++) {
    if (!light[i]) continue;
    let head = 0, tail = 1, left = width, right = 0, top = height, bottom = 0;
    queue[0] = i; light[i] = 0;
    while (head < tail) {
      const pixel = queue[head++], x = pixel % width, y = Math.floor(pixel / width);
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      for (const next of [x > 0 ? pixel - 1 : -1, x + 1 < width ? pixel + 1 : -1, y > 0 ? pixel - width : -1, y + 1 < height ? pixel + width : -1]) {
        if (next >= 0 && light[next]) { light[next] = 0; queue[tail++] = next; }
      }
    }
    const boxArea = (right - left + 1) * (bottom - top + 1), aspect = (right - left + 1) / (bottom - top + 1);
    if (tail < size * .18 || boxArea < size * .25 || boxArea > size * .94 || tail / boxArea < .68 || aspect < .5 || aspect > 2.1) continue;
    if (!best || tail > best.area) best = { left, top, right, bottom, area: tail };
  }
  if (!best) return null;
  const pad = Math.ceil(Math.max(width, height) * .012);
  const left = Math.max(0, best.left - pad), top = Math.max(0, best.top - pad);
  const right = Math.min(width, best.right + pad + 1), bottom = Math.min(height, best.bottom + pad + 1);
  return { left: left / width, top: top / height, width: (right - left) / width, height: (bottom - top) / height };
}
