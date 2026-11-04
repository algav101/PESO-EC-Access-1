import type { Prisma } from "@prisma/client";
import { generateBeneficiaryToken } from "@/lib/qr";

/** Used inside a transaction; shares the import lock to prevent duplicate token batches. */
export async function ensureProgramQrCodes(tx: Prisma.TransactionClient, programId: string, userId: string, options: { force?: boolean; barangay?: string | null } = {}) {
  const [lock] = await tx.$queryRaw<{ locked: boolean }[]>`
    SELECT pg_try_advisory_xact_lock(hashtextextended(${programId}, 0)) AS locked
  `;
  if (!lock?.locked) throw new Error("QR_GENERATION_BUSY");
  const program = await tx.program.findUnique({ where: { id: programId }, select: { id: true } });
  if (!program) throw new Error("QR_PROGRAM_NOT_FOUND");
  const beneficiaries = await tx.programBeneficiary.findMany({
    where: { programId, participationStatus: { in: ["ACTIVE", "ENROLLED"] },
      ...(options.barangay ? { beneficiary: { barangay: { equals: options.barangay, mode: "insensitive" as const } } } : {}) },
    select: { id: true, designatedNumber: true, qrCodes: { where: { status: { in: ["ACTIVE", "REPRINTED"] } }, select: { id: true } } },
  });
  beneficiaries.sort((a, b) => a.designatedNumber.localeCompare(b.designatedNumber, undefined, { numeric: true }));
  const missing = beneficiaries.filter((pb) => options.force || !pb.qrCodes.length);
  if (options.force && missing.length) {
    await tx.qrCode.updateMany({ where: { programId, programBeneficiaryId: { in: missing.map((b) => b.id) }, status: { in: ["ACTIVE", "REPRINTED"] } }, data: { status: "REPLACED" } });
  }
  if (missing.length) await tx.qrCode.createMany({ data: missing.map((pb) => ({
    programId, programBeneficiaryId: pb.id, ...generateBeneficiaryToken(programId, pb.designatedNumber), status: "ACTIVE", generatedById: userId,
  })) });
  const stats = { totalCount: beneficiaries.length, generatedCount: missing.length, existingCount: beneficiaries.length - missing.length,
    firstGeneratedSlot: missing[0]?.designatedNumber ?? null, lastGeneratedSlot: missing.at(-1)?.designatedNumber ?? null,
    additionalSlotsAbove522: beneficiaries.filter((pb) => Number(pb.designatedNumber) > 522).length };
  await tx.auditLog.create({ data: { userId, action: options.force ? "QR_BATCH_REGENERATED" : "QR_MISSING_ADDED", entityType: "PROGRAM", entityId: programId, metadata: JSON.stringify(stats) } });
  return stats;
}
