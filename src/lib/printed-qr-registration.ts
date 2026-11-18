import type { Prisma } from "@prisma/client";
import { extractCleanQrToken } from "@/lib/utils";
import { normalizeQrSlot, registeredQrSlot } from "@/lib/program-qr-slot";

type AuditReader = Pick<Prisma.TransactionClient, "auditLog">;
type QrReference = { id: string; publicToken: string; programId: string; programBeneficiary: { designatedNumber: string } };
export type PrintedQrBinding = { programId: string; designatedNumber: string };
const ENTITY_TYPE = "QR_PROGRAM_BINDING";

export class PrintedQrRegistrationError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

function bindingFromEvent(qr: QrReference, newData?: string | null): PrintedQrBinding {
  const slot = registeredQrSlot(qr.publicToken, qr.programBeneficiary.designatedNumber);
  if (!slot) throw new PrintedQrRegistrationError("Registered QR has no valid printed number.");
  if (!newData) return { programId: qr.programId, designatedNumber: slot };
  const value = JSON.parse(newData);
  if (value.version !== 1 || value.qrId !== qr.id || value.publicToken !== qr.publicToken
    || typeof value.programId !== "string" || !value.programId
    || normalizeQrSlot(value.designatedNumber) !== slot) {
    throw new PrintedQrRegistrationError("Invalid printed QR registration. Contact the administrator.", 409);
  }
  return { programId: value.programId, designatedNumber: slot };
}

/** Reissuing a physical card never changes its old QR row or historical field records. */
export async function readPrintedQrBinding(client: AuditReader, qr: QrReference): Promise<PrintedQrBinding> {
  const latest = await client.auditLog.findFirst({
    where: { entityType: ENTITY_TYPE, entityId: qr.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { newData: true },
  });
  return bindingFromEvent(qr, latest?.newData);
}

export async function readPrintedQrBindings(client: AuditReader, references: QrReference[]) {
  const valid = references.filter((qr) => registeredQrSlot(qr.publicToken, qr.programBeneficiary.designatedNumber));
  const events = valid.length ? await client.auditLog.findMany({
    where: { entityType: ENTITY_TYPE, entityId: { in: valid.map((qr) => qr.id) } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { entityId: true, newData: true },
  }) : [];
  const latest = new Map<string, string | null>();
  for (const event of events) if (event.entityId && !latest.has(event.entityId)) latest.set(event.entityId, event.newData);
  return new Map(valid.map((qr) => [qr.id, bindingFromEvent(qr, latest.get(qr.id))]));
}

/** Call inside a transaction. Only cards from a closed/completed cycle can be reissued. */
export async function registerPrintedQr(tx: Prisma.TransactionClient, input: { rawToken: string; programId: string; userId?: string | null }) {
  const clean = extractCleanQrToken(input.rawToken);
  if (!clean || normalizeQrSlot(clean)) throw new PrintedQrRegistrationError("Scan the complete registered QR code, not just its number.");
  const qr = await tx.qrCode.findFirst({
    where: { publicToken: { equals: clean, mode: "insensitive" }, status: { not: "INVALIDATED" } },
    include: { programBeneficiary: { select: { designatedNumber: true } } },
  });
  if (!qr) throw new PrintedQrRegistrationError("Printed QR is unregistered or invalidated.", 404);
  for (const key of [`qr-registration:${qr.id}`, input.programId]) {
    const [lock] = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(hashtextextended(${key}, 0)) AS locked`;
    if (!lock?.locked) throw new PrintedQrRegistrationError("Another QR registration or roster import is running. Retry after it finishes.", 409);
  }
  const previous = await readPrintedQrBinding(tx, qr);
  const target = await tx.program.findUnique({ where: { id: input.programId }, select: { id: true, programCode: true, programName: true, status: true } });
  if (!target) throw new PrintedQrRegistrationError("Selected program not found.", 404);
  if (!["ACTIVE", "DRAFT"].includes(target.status)) throw new PrintedQrRegistrationError("Register printed cards to an active or draft program.");
  if (previous.programId !== target.id) {
    const source = await tx.program.findUnique({ where: { id: previous.programId }, select: { programCode: true, status: true } });
    if (!source || !["CLOSED", "COMPLETED"].includes(source.status)) {
      throw new PrintedQrRegistrationError(`CANNOT REGISTER: This QR is assigned to ${source?.programCode || "another program"}, which is still open. Its current program must be closed before reissuing the card.`, 409);
    }
  }
  const matches = await tx.programBeneficiary.findMany({
    where: { programId: target.id, designatedNumber: previous.designatedNumber, participationStatus: { in: ["ACTIVE", "ENROLLED", "FLAGGED_FOR_REPLACEMENT"] } },
    select: { id: true, designatedNumber: true, beneficiary: { select: { fullName: true } } }, take: 2,
  });
  if (matches.length !== 1) throw new PrintedQrRegistrationError("The selected masterlist must have exactly one active beneficiary for this printed number.", 409);
  const alreadyRegistered = previous.programId === target.id;
  if (!alreadyRegistered) await tx.auditLog.create({ data: {
    userId: input.userId || null, action: "PRINTED_QR_REGISTERED_TO_PROGRAM", entityType: ENTITY_TYPE, entityId: qr.id,
    oldData: JSON.stringify(previous),
    newData: JSON.stringify({ version: 1, qrId: qr.id, publicToken: qr.publicToken, programId: target.id, designatedNumber: previous.designatedNumber }),
    metadata: JSON.stringify({ originalProgramId: qr.programId, programBeneficiaryId: matches[0].id, scanHistoryPreserved: true }),
  } });
  return { alreadyRegistered, publicToken: qr.publicToken, programId: target.id, programCode: target.programCode, programName: target.programName, designatedNumber: matches[0].designatedNumber, fullName: matches[0].beneficiary.fullName };
}
