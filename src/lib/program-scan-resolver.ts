import prisma from "@/lib/prisma";
import { extractCleanQrToken } from "@/lib/utils";
import { normalizeQrSlot, wrongProgramQrMessage } from "@/lib/program-qr-slot";
import { readPrintedQrBinding } from "@/lib/printed-qr-registration";

export class ProgramScanError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/** Verify the registered QR's program before resolving any roster slot or scan history. */
export async function resolveProgramScan(rawToken: string, programId: unknown, include: any) {
  if (typeof programId !== "string" || !programId.trim()) {
    throw new ProgramScanError("CANNOT SCAN: Pumili muna ng TUPAD program.");
  }
  const clean = extractCleanQrToken(rawToken);
  const targetProgramId = programId.trim();
  let slot = normalizeQrSlot(clean);
  if (!slot) {
    // Exact registered tokens only. Never substring-match a slot or unregistered QR.
    const reference = await prisma.qrCode.findFirst({
      where: { publicToken: { equals: clean, mode: "insensitive" }, status: { not: "INVALIDATED" } },
      include: { programBeneficiary: { select: { designatedNumber: true } }, program: { select: { programCode: true, programName: true } } },
    });
    const binding = reference ? await readPrintedQrBinding(prisma, reference) : null;
    if (reference && binding && binding.programId !== targetProgramId) {
      const selected = await prisma.program.findUnique({ where: { id: targetProgramId }, select: { programCode: true, programName: true } });
      const owner = binding.programId === reference.programId ? reference.program
        : await prisma.program.findUnique({ where: { id: binding.programId }, select: { programCode: true, programName: true } });
      throw new ProgramScanError(wrongProgramQrMessage(
        owner ? `${owner.programCode} (${owner.programName})` : "registered work program",
        selected ? `${selected.programCode} (${selected.programName})` : "napiling work program",
      ), 409);
    }
    if (binding) slot = binding.designatedNumber;
  }
  const matches = await prisma.programBeneficiary.findMany({
    where: {
      programId: targetProgramId,
      participationStatus: { in: ["ACTIVE", "ENROLLED", "FLAGGED_FOR_REPLACEMENT"] },
      ...(slot ? { designatedNumber: slot } : { OR: [
        { beneficiary: { beneficiaryNumber: clean } },
        { beneficiary: { fullName: { equals: clean, mode: "insensitive" } } },
      ] }),
    },
    include,
    take: 2,
  });
  if (matches.length > 1) throw new ProgramScanError("CANNOT SCAN: Duplicate roster slot/name. I-check muna ang roster ng napiling program.", 409);
  const pb: any = matches[0];
  if (!pb) throw new ProgramScanError("CANNOT SCAN: Walang active beneficiary para sa QR/slot na ito sa napiling program. I-check ang program at uploaded roster.", 404);
  const qr = pb.qrCodes?.find((q: any) => ["ACTIVE", "REPRINTED"].includes(q.status)) || null;
  return { pb, qr };
}
