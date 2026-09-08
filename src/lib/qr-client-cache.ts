import QRCode from "qrcode";

// Global in-memory cache for QR code data URLs
const qrDataUrlCache = new Map<string, string>();

/**
 * Resolves the mobile routing URL while preserving the exact original token.
 */
export function getPublicAssignmentUrl(token: string): string {
  if (!token) return "";
  if (token.startsWith("http://") || token.startsWith("https://")) {
    return token;
  }
  const baseUrl =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://peso-ec-access-1.onrender.com";
  return `${baseUrl}/my-assignment?token=${encodeURIComponent(token)}`;
}

/**
 * Returns a cached QR Data URL or generates a new one.
 * Encodes the direct mobile web routing link with the original token preserved,
 * allowing any smartphone built-in camera to open the link directly.
 */
export async function getQrDataUrl(
  token: string,
  darkColor: string = "#0c3b6d"
): Promise<string> {
  if (!token) return "";
  const key = `${token}_${darkColor}`;
  const existing = qrDataUrlCache.get(key);
  if (existing) return existing;

  const payload = getPublicAssignmentUrl(token);

  try {
    const dataUrl = await QRCode.toDataURL(payload, {
      width: 220,
      margin: 1,
      color: { dark: darkColor, light: "#ffffff" },
      errorCorrectionLevel: "M", // M level is 2.5x faster to render than H and delivers crystal-clear scan accuracy
    });
    qrDataUrlCache.set(key, dataUrl);
    return dataUrl;
  } catch (err) {
    console.error("QR Generation error:", err);
    return "";
  }
}

/**
 * Synchronously checks if a QR code is already cached.
 */
export function getCachedQrSync(
  token: string,
  darkColor: string = "#0c3b6d"
): string | undefined {
  if (!token) return undefined;
  return qrDataUrlCache.get(`${token}_${darkColor}`);
}

/**
 * Batch generate QR codes in non-blocking microtask chunks of `chunkSize`
 */
export async function batchPreloadQrCodes(
  tokens: string[],
  darkColor: string = "#0c3b6d",
  onProgress?: (count: number, total: number) => void
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const missingTokens: string[] = [];

  for (const t of tokens) {
    if (!t) continue;
    const key = `${t}_${darkColor}`;
    if (qrDataUrlCache.has(key)) {
      result[t] = qrDataUrlCache.get(key)!;
    } else {
      missingTokens.push(t);
    }
  }

  if (missingTokens.length === 0) {
    if (onProgress) onProgress(tokens.length, tokens.length);
    return result;
  }

  const chunkSize = 40;
  for (let i = 0; i < missingTokens.length; i += chunkSize) {
    const chunk = missingTokens.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (token) => {
        const url = await getQrDataUrl(token, darkColor);
        result[token] = url;
      })
    );

    if (onProgress) {
      onProgress(Math.min(tokens.length, Object.keys(result).length), tokens.length);
    }

    // Yield control to main thread so the browser remains 100% fluid & responsive
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return result;
}
