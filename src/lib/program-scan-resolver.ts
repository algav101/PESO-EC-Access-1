import prisma from "@/lib/prisma";
import { extractCleanQrToken } from "@/lib/utils";
import { normalizeQrSlot, registeredQrSlot } from "@/lib/program-qr-slot";

export class ProgramScanError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/** All scanner stages resolve the selected program's enrollee, not the old QR owner. */
export async function resolveProgramScan(rawToken: string, programId: unknown, include: any) {
  if (typeof programId !== "string" || !programId.trim()) {
    throw new ProgramScanError("CANNOT SCAN: Pumili muna ng TUPAD program.");
  }
  const clean = extractCleanQrToken(rawToken);
  let slot = normalizeQrSlot(clean);
  if (!slot) {
    // Exact registered tokens only. Never substring-match a slot or unregistered QR.
    const reference = await prisma.qrCode.findFirst({
      where: { publicToken: { equals: clean, mode: "insensitive" }, status: { not: "INVALIDATED" } },
      include: { programBeneficiary: { select: { designatedNumber: true } } },
    });
    if (reference) slot = registeredQrSlot(reference.publicToken, reference.programBeneficiary.designatedNumber);
  }
  const matches = await prisma.programBeneficiary.findMany({
    where: {
      programId: programId.trim(),
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
