import prisma from "@/lib/prisma";
import { extractCleanQrToken } from "@/lib/utils";
import { normalizeQrSlot, wrongProgramQrMessage } from "@/lib/program-qr-slot";
import { readPrintedQrBinding } from "@/lib/printed-qr-registration";
import { verifyTokenHash } from "@/lib/qr";
import type { DetectedQrIdentity } from "@/lib/program-qr-slot";

export class ProgramScanError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/** Auto scans follow the registered identity. Strict mode protects queued mutations
 * and explicitly scoped lookups from silently changing their recorded program.
 */
export async function resolveProgramScan(rawToken: string, programId: unknown, include: any, options: { autoDetect?: boolean; requireActive?: boolean } = {}) {
  const auto = options.autoDetect === true;
  if (!auto && (typeof programId !== "string" || !programId.trim())) {
    throw new ProgramScanError("CANNOT SCAN: Pumili muna ng TUPAD program.");
  }
  const clean = extractCleanQrToken(rawToken);
  let targetProgramId = typeof programId === "string" ? programId.trim() : "";
  if (!clean || clean.length > 2048) throw new ProgramScanError("INVALID QR: Scan a complete registered QR code.");
  if (/^TUPAD-V2-/i.test(clean) && !/^TUPAD-V2-[1-9]\d*-[A-F0-9]{48}$/i.test(clean)) throw new ProgramScanError("INVALID QR: Corrupted version 2 QR payload.");
  let slot = normalizeQrSlot(clean);
  let scannedQr: any = null;
  if (!slot) {
    // Exact registered tokens only. Never substring-match a slot or unregistered QR.
    const reference = await prisma.qrCode.findFirst({
      where: { publicToken: { equals: clean, mode: "insensitive" }, status: { not: "INVALIDATED" } },
      include: { programBeneficiary: { select: { designatedNumber: true, programId: true } }, program: { select: { programCode: true, programName: true } } },
    });
    if (reference && reference.programBeneficiary.programId !== reference.programId) throw new ProgramScanError("INVALID QR REGISTRATION: Program and beneficiary records do not match. Contact the administrator.", 409);
    const binding = reference ? await readPrintedQrBinding(prisma, reference) : null;
    // Legacy cards are authenticated by an exact registered token. Some historical
    // imports used another hash convention; only new V2 tokens require this HMAC.
    if (reference?.publicToken.startsWith("TUPAD-V2-") && !verifyTokenHash(reference.publicToken, reference.tokenHash)) {
      throw new ProgramScanError("INVALID QR: Verification token failed. Ask an administrator to regenerate this QR.", 409);
    }
    if (reference && binding && !auto && binding.programId !== targetProgramId) {
      const selected = await prisma.program.findUnique({ where: { id: targetProgramId }, select: { programCode: true, programName: true } });
      const owner = binding.programId === reference.programId ? reference.program
        : await prisma.program.findUnique({ where: { id: binding.programId }, select: { programCode: true, programName: true } });
      throw new ProgramScanError(wrongProgramQrMessage(
        owner ? `${owner.programCode} (${owner.programName})` : "registered work program",
        selected ? `${selected.programCode} (${selected.programName})` : "napiling work program",
      ), 409);
    }
    if (binding) {
      slot = binding.designatedNumber;
      scannedQr = reference;
      if (auto) targetProgramId = binding.programId;
    } else if (auto) {
      throw new ProgramScanError("UNKNOWN QR: Hindi registered, invalidated, o sira ang QR code. Walang na-record.", 404);
    }
  }
  // A number-only QR carries no ownership. Search all masterlists; never use the
  // displayed program to disambiguate it, even if one matching program is closed.
  if (auto && !scannedQr) targetProgramId = "";
  const slotIds = slot ? (await prisma.programBeneficiary.findMany({
    where: { ...(targetProgramId ? { programId: targetProgramId } : {}), participationStatus: { in: ["ACTIVE", "ENROLLED", "FLAGGED_FOR_REPLACEMENT"] } },
    select: { id: true, designatedNumber: true },
  })).filter((pb) => normalizeQrSlot(pb.designatedNumber) === slot).slice(0, 2).map((pb) => pb.id) : null;
  const matches = await prisma.programBeneficiary.findMany({
    where: {
      ...(targetProgramId ? { programId: targetProgramId } : {}),
      participationStatus: { in: ["ACTIVE", "ENROLLED", "FLAGGED_FOR_REPLACEMENT"] },
      ...(slotIds ? { id: { in: slotIds, ...(scannedQr?.publicToken.startsWith("TUPAD-V2-") && scannedQr.programId === targetProgramId ? { equals: scannedQr.programBeneficiaryId } : {}) } } : { OR: [
        { beneficiary: { beneficiaryNumber: clean } },
        { beneficiary: { fullName: { equals: clean, mode: "insensitive" } } },
      ] }),
    },
    include: { ...include, beneficiary: true, program: include.program || true },
    take: 2,
  });
  if (matches.length > 1) throw new ProgramScanError(auto && !scannedQr
    ? "AMBIGUOUS QR: Ang number-only QR na ito ay ginagamit sa maraming masterlist. Gamitin o mag-generate ng registered QR na may program identity. Walang na-record."
    : "CANNOT SCAN: Duplicate roster slot/name. I-check muna ang roster ng napiling program.", 409);
  const pb: any = matches[0];
  if (!pb) throw new ProgramScanError("CANNOT SCAN: Walang active beneficiary para sa QR/slot na ito sa napiling program. I-check ang program at uploaded roster.", 404);
  if ((auto || options.requireActive) && pb.program.status !== "ACTIVE") throw new ProgramScanError("INACTIVE WORK PROGRAM: Ang registered program ay closed, completed, o draft. Walang na-record.", 409);
  const qr = pb.qrCodes?.find((q: any) => ["ACTIVE", "REPRINTED"].includes(q.status)) || null;
  const detected: DetectedQrIdentity = {
    qrId: scannedQr?.id || qr?.id || null, version: scannedQr?.publicToken.startsWith("TUPAD-V2-") ? 2 : scannedQr ? 1 : 0,
    programId: pb.programId, programCode: pb.program.programCode, programName: pb.program.programName,
    programBeneficiaryId: pb.id, beneficiaryId: pb.beneficiaryId,
    designatedNumber: pb.designatedNumber, fullName: pb.beneficiary.fullName,
    verifiedAt: new Date().toISOString(), verificationStatus: "VERIFIED",
  };
  return { pb, qr, detected };
}
