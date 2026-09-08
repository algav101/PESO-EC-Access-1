import crypto from "crypto";
import QRCode from "qrcode";

const QR_SALT = process.env.QR_SALT || "DINGALAN_TUPAD_SECURE_SALT_2026";

export interface GeneratedQrData {
  publicToken: string;
  tokenHash: string;
}

export function generateBeneficiaryToken(programId: string, designatedNumber: string): GeneratedQrData {
  const randomSuffix = crypto.randomBytes(4).toString("hex");
  const publicToken = `TUPAD-DGL-${programId.slice(0, 6)}-${designatedNumber}-${randomSuffix}`.toUpperCase();
  const tokenHash = crypto.createHash("sha256").update(publicToken + QR_SALT).digest("hex");

  return {
    publicToken,
    tokenHash,
  };
}

export function verifyTokenHash(publicToken: string, expectedHash: string): boolean {
  const computed = crypto.createHash("sha256").update(publicToken + QR_SALT).digest("hex");
  return computed === expectedHash;
}

/**
 * Generates the full public mobile assignment URL while preserving the original token.
 */
export function getPublicAssignmentUrl(token: string): string {
  if (!token) return "";
  if (token.startsWith("http://") || token.startsWith("https://")) {
    return token;
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://peso-ec-access-1.onrender.com";
  return `${baseUrl}/my-assignment?token=${encodeURIComponent(token)}`;
}

/**
 * Encodes the mobile routing URL in the QR code, directing any smartphone camera
 * to the beneficiary's work area schedule upon middle-name verification.
 * Preserves the exact original token inside the URL parameter.
 */
export async function generateQrDataUrl(text: string): Promise<string> {
  const payload = getPublicAssignmentUrl(text);
  return await QRCode.toDataURL(payload, {
    width: 250,
    margin: 1,
    color: {
      dark: "#0c3b6d",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}
