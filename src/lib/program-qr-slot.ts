/** A printed QR is a reusable slot reference, never a scan-history identity. */
export function normalizeQrSlot(value: unknown): string | null {
  const text = String(value ?? "").trim().replace(/^#/, "");
  if (!/^\d+$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) && number > 0 ? String(number) : null;
}

export function registeredQrSlot(token: string, designatedNumber: string): string | null {
  // Keep the number printed on a generated card even if its old enrollee moved slots.
  const printed = token.match(/^TUPAD-DGL-[A-Z0-9-]{6}-(\d+)-[A-F0-9]{8}$/i);
  return normalizeQrSlot(printed?.[1] ?? designatedNumber);
}

export class ScanRequestError extends Error {}

/** HTTP rejections must not be replayed as offline scans (including 401/403/404). */
export async function readScanResponse(response: Response, fallback: string) {
  let data;
  try { data = await response.json(); }
  catch { throw new ScanRequestError("Hindi makumpirma ang scan. I-check ang monitoring bago mag-scan muli."); }
  if (!response.ok) throw new ScanRequestError(data.error || fallback);
  return data;
}
