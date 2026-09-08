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
 * Retains the exact original QR data URL encoding the raw cryptographic token string.
 * Matches 100% with the physical stubs and badges currently held by beneficiaries.
 */
export async function generateQrDataUrl(text: string): Promise<string> {
  return await QRCode.toDataURL(text, {
    width: 250,
    margin: 1,
    color: {
      dark: "#0c3b6d",
      light: "#ffffff",
    },
    errorCorrectionLevel: "H",
  });
}
