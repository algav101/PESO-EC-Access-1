/** Slot numbers are scoped to a program; QR tokens also retain their program owner. */
export function normalizeQrSlot(value: unknown): string | null {
  const text = String(value ?? "").trim().replace(/^#/, "");
  if (!/^\d+$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) && number > 0 ? String(number) : null;
}

export function registeredQrSlot(token: string, designatedNumber: string): string | null {
  // Keep the number printed on a generated card even if its old enrollee moved slots.
  const printed = token.match(/^TUPAD-DGL-[A-Z0-9-]{6}-(\d+)-[A-F0-9]{8}$/i)
    || token.match(/^TUPAD-V2-(\d+)-[A-F0-9]{48}$/i);
  return normalizeQrSlot(printed?.[1] ?? designatedNumber);
}

export interface DetectedQrIdentity {
  qrId: string | null;
  version: number;
  programId: string;
  programCode: string;
  programName: string;
  programBeneficiaryId: string;
  beneficiaryId: string;
  designatedNumber: string;
  fullName: string;
  verifiedAt: string;
  verificationStatus: "VERIFIED" | "CACHED";
}

export class ScanRequestError extends Error {
  constructor(message: string, public detected?: DetectedQrIdentity) { super(message); }
}

export function wrongProgramQrMessage(source: string, selected: string): string {
  return `WRONG WORK PROGRAM: Ang QR code na ito ay para sa ${source}. Napiling program: ${selected}. Piliin ang tamang work program o gamitin ang QR code ng napiling program. Walang na-record.`;
}

export function inactiveProgramQrMessage(program: { programCode: string; programName: string; status: string }, designatedNumber: string): string {
  return `INACTIVE WORK PROGRAM: Ang QR #${designatedNumber} ay naka-register sa ${program.programCode} (${program.programName}), status: ${program.status}. Gamitin ang QR ng aktibong program, o iparehistro sa admin ang lumang card bago muling gamitin. Walang na-record.`;
}

/** HTTP rejections must not be replayed as offline scans (including 401/403/404). */
export async function readScanResponse(response: Response, fallback: string) {
  let data;
  try { data = await response.json(); }
  catch { throw new ScanRequestError("Hindi makumpirma ang scan. I-check ang monitoring bago mag-scan muli."); }
  if (!response.ok) throw new ScanRequestError(data.error || fallback, data.detected);
  return data;
}
