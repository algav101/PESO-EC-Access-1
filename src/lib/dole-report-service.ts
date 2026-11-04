import fs from "node:fs/promises";
import path from "node:path";
import prisma from "@/lib/prisma";
import { composeDoleReportData, EMPTY_REPORT_DRAFT, validateReportDraft, ReportInputError } from "@/lib/dole-report-data";
import type { DoleReportDraft } from "@/lib/dole-report-config";

export async function readDoleReportTemplate() {
  const candidates = [
    path.join(process.cwd(), "public", "templates", "dole-2026-all-forms.xlsx"),
    ...(typeof __dirname === "string" ? [
      path.resolve(__dirname, "..", "..", "public", "templates", "dole-2026-all-forms.xlsx"),
      path.resolve(__dirname, "..", "..", "..", "public", "templates", "dole-2026-all-forms.xlsx"),
    ] : []),
  ];
  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate);
    } catch {}
  }
  throw new Error("DOLE report template file is missing from deployment (public/templates/dole-2026-all-forms.xlsx).");
}
export async function loadDoleReport(programId: string, draftOverride?: unknown) {
  const [program, sourceEvent, draftEvent] = await Promise.all([
    prisma.program.findUnique({ where: { id: programId }, include: {
      workDays: { orderBy: { dayNumber: "asc" } },
      programBeneficiaries: { where: { participationStatus: { in: ["ACTIVE", "ENROLLED", "FLAGGED_FOR_REPLACEMENT"] } }, include: { beneficiary: { include: { dependents: { orderBy: { createdAt: "asc" } } } }, attendanceRecords: true } },
    } }),
    prisma.auditLog.findFirst({ where: { entityType: "PROGRAM_REPORT_MASTERLIST", entityId: programId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
    prisma.auditLog.findFirst({ where: { entityType: "PROGRAM_REPORT_DRAFT", entityId: programId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
  ]);
  if (!program) return null;
  const source = sourceEvent?.newData ? JSON.parse(sourceEvent.newData).rows || {} : {};
  const saved: DoleReportDraft = draftEvent?.newData ? JSON.parse(draftEvent.newData) : EMPTY_REPORT_DRAFT();
  const ids = new Set(program.programBeneficiaries.map((pb) => pb.id));
  // A subsequently removed/replaced enrollee's saved edits must not be applied to a new occupant.
  saved.rows = Object.fromEntries(Object.entries(saved.rows || {}).filter(([id]) => ids.has(id)));
  const draft = validateReportDraft(draftOverride === undefined ? saved : draftOverride, ids);
  return composeDoleReportData(program, source, draft, draftEvent?.id || null);
}

export async function saveDoleReportDraft(programId: string, draft: DoleReportDraft, revision: string | null, userId: string) {
  return prisma.$transaction(async (tx) => {
    const [lock] = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(hashtextextended(${programId}, 0)) AS locked`;
    if (!lock?.locked) throw new ReportInputError("Another import/report save is running for this program. Wait and retry.");
    const latest = await tx.auditLog.findFirst({ where: { entityType: "PROGRAM_REPORT_DRAFT", entityId: programId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    if ((latest?.id || null) !== revision) throw new ReportInputError("Report was changed by another user. Reload before saving.");
    const validUser = (tx as any).user?.findUnique ? await (tx as any).user.findUnique({ where: { id: userId }, select: { id: true } }) : { id: userId };
    return tx.auditLog.create({ data: { userId: validUser ? userId : null, action: "REPORT_DRAFT_SAVED", entityType: "PROGRAM_REPORT_DRAFT", entityId: programId, newData: JSON.stringify(draft), metadata: JSON.stringify({ version: 1 }) } });
  });
}
