import type { Prisma } from "@prisma/client";

export class ProgramScheduleError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/** Day 1 is the exact start date. Retain the existing Sunday rest-day rule after it. */
export function buildProgramWorkDays(startDate: string, count: number) {
  if (typeof startDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) throw new ProgramScheduleError("Work Start Date must be a valid YYYY-MM-DD date.");
  const date = new Date(`${startDate}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== startDate) throw new ProgramScheduleError("Work Start Date is invalid.");
  if (!Number.isInteger(count) || count < 1 || count > 366) throw new ProgramScheduleError("Required work days must be between 1 and 366.");
  const days: { dayNumber: number; workDate: string; description: string; status: string }[] = [];
  while (days.length < count) {
    if (!days.length || date.getUTCDay() !== 0) {
      const dayNumber = days.length + 1;
      days.push({ dayNumber, workDate: date.toISOString().slice(0, 10), description: `Day ${dayNumber} Community Work Activities`, status: "SCHEDULED" });
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return days;
}

/** Must run in a transaction. Keep day IDs and every attendance/photo history row. */
export async function rescheduleProgramWorkDays(tx: Prisma.TransactionClient, program: { id: string; startDate: string; requiredWorkDays: number }) {
  const [lock] = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(hashtextextended(${program.id}, 0)) AS locked`;
  if (!lock?.locked) throw new ProgramScheduleError("Another program update is running. Please retry after it finishes.", 409);
  const existing = await tx.workDay.findMany({ where: { programId: program.id }, orderBy: { dayNumber: "asc" } });
  // Keep any historical days beyond a subsequently reduced required-day count.
  const days = buildProgramWorkDays(program.startDate, Math.max(program.requiredWorkDays, ...existing.map((day) => day.dayNumber)));
  const updates = existing.flatMap((day) => {
    const target = days.find((d) => d.dayNumber === day.dayNumber);
    if (!target) throw new ProgramScheduleError("Invalid existing day number. Contact the administrator.", 409);
    return target.workDate === day.workDate ? [] : [{ id: day.id, workDate: target.workDate }];
  });
  if (updates.length) {
    // Vacate changed dates before assigning overlapping new dates; both steps are
    // atomic and satisfy the unique (programId, workDate) constraint.
    const ids = JSON.stringify(updates.map((day) => day.id));
    await tx.$executeRaw`
      UPDATE "WorkDay" SET "workDate" = '__RESCHEDULE__' || id
      WHERE "programId" = ${program.id} AND id IN (SELECT value FROM jsonb_array_elements_text(${ids}::jsonb))
    `;
    await tx.$executeRaw`
      UPDATE "WorkDay" AS day SET "workDate" = value."workDate"
      FROM jsonb_to_recordset(${JSON.stringify(updates)}::jsonb) AS value(id text, "workDate" text)
      WHERE day.id = value.id AND day."programId" = ${program.id}
    `;
  }
  const existingNumbers = new Set(existing.map((day) => day.dayNumber));
  const missing = days.filter((day) => day.dayNumber <= program.requiredWorkDays && !existingNumbers.has(day.dayNumber));
  if (missing.length) await tx.workDay.createMany({ data: missing.map((day) => ({ ...day, programId: program.id })) });
  return tx.workDay.findMany({ where: { programId: program.id }, orderBy: { dayNumber: "asc" } });
}
