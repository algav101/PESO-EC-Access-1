import type { Prisma } from "@prisma/client";
import { generateBeneficiaryToken } from "@/lib/qr";
import { normalizeQrSlot, registeredQrSlot } from "@/lib/program-qr-slot";
import { updateImportedQrBindings, type QrBindingUpdate } from "@/lib/masterlist-bulk-updates";

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
    select: { id: true, designatedNumber: true, qrCodes: { where: { status: { in: ["ACTIVE", "REPRINTED"] } }, select: { id: true, publicToken: true } } },
  });
  beneficiaries.sort((a, b) => a.designatedNumber.localeCompare(b.designatedNumber, undefined, { numeric: true }));

  const rebindOps: QrBindingUpdate[] = [];
  const reboundPbIds = new Set<string>();
  const mismatchedQrIdsToReplace: string[] = [];

  if (!options.force) {
    const needsSlotRepair = beneficiaries.some((pb) => {
      const targetSlot = normalizeQrSlot(pb.designatedNumber) || pb.designatedNumber;
      return !pb.qrCodes.some((q) => registeredQrSlot(q.publicToken, pb.designatedNumber) === targetSlot);
    });
    if (needsSlotRepair) {
      const programQrs = await tx.qrCode.findMany({
        where: { programId, status: { not: "INVALIDATED" } },
        select: { id: true, publicToken: true, programBeneficiaryId: true, status: true },
      });
      const qrBySlot = new Map<string, { id: string; publicToken: string; programBeneficiaryId: string; status: string }>();
      for (const q of programQrs) {
        const slot = registeredQrSlot(q.publicToken, "");
        if (slot && !qrBySlot.has(slot)) qrBySlot.set(slot, q);
      }
      const claimedQrIds = new Set<string>();
      for (const pb of beneficiaries) {
        const targetSlot = normalizeQrSlot(pb.designatedNumber) || pb.designatedNumber;
        const matchingOwn = pb.qrCodes.find((q) => registeredQrSlot(q.publicToken, pb.designatedNumber) === targetSlot);
        if (matchingOwn) {
          claimedQrIds.add(matchingOwn.id);
          for (const extra of pb.qrCodes) {
            if (extra.id !== matchingOwn.id) mismatchedQrIdsToReplace.push(extra.id);
          }
          continue;
        }
        const slotQr = qrBySlot.get(targetSlot);
        if (slotQr && !claimedQrIds.has(slotQr.id)) {
          claimedQrIds.add(slotQr.id);
          reboundPbIds.add(pb.id);
          if (slotQr.programBeneficiaryId !== pb.id || slotQr.status !== "ACTIVE") {
            rebindOps.push({ id: slotQr.id, programBeneficiaryId: pb.id, status: "ACTIVE" });
          }
        }
        for (const oldQr of pb.qrCodes) {
          if (!claimedQrIds.has(oldQr.id)) mismatchedQrIdsToReplace.push(oldQr.id);
        }
      }
      if (mismatchedQrIdsToReplace.length) {
        await tx.qrCode.updateMany({ where: { programId, id: { in: mismatchedQrIdsToReplace } }, data: { status: "REPLACED" } });
      }
      if (rebindOps.length) {
        await updateImportedQrBindings(tx, programId, rebindOps);
      }
    }
  }

  const missing = beneficiaries.filter((pb) => {
    if (options.force) return true;
    if (reboundPbIds.has(pb.id)) return false;
    const targetSlot = normalizeQrSlot(pb.designatedNumber) || pb.designatedNumber;
    return !pb.qrCodes.some((q) => registeredQrSlot(q.publicToken, pb.designatedNumber) === targetSlot);
  });
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
