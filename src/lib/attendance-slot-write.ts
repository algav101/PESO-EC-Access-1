import crypto from "crypto";
import { Prisma, type AttendanceRecord } from "@prisma/client";

export const ATTENDANCE_FIELDS = {
  MORNING_IN: "morningTimeIn", MORNING_OUT: "morningTimeOut",
  AFTERNOON_IN: "afternoonTimeIn", AFTERNOON_OUT: "afternoonTimeOut",
} as const;
export type AttendanceSlot = keyof typeof ATTENDANCE_FIELDS;
type Row = { programBeneficiaryId: string; workProgramItemId?: string | null; workArea?: string | null; activityName?: string | null };

/** One conditional write for scanner and roster batches. Concurrent requests must
 * never overwrite an already recorded timestamp or merge a rescheduled old date.
 */
export async function writeAttendanceSlot(client: Pick<Prisma.TransactionClient, "$queryRaw">, input: {
  programId: string; workDayId: string; attendanceDate: string; slot: AttendanceSlot;
  now: Date; userId: string; source: string; deviceId: string; rows: Row[];
}): Promise<AttendanceRecord[]> {
  if (!input.rows.length) return [];
  const field = ATTENDANCE_FIELDS[input.slot];
  if (!field) throw new Error("Invalid attendance shift.");
  // The identifier comes only from the fixed map above; user values stay bound.
  const column = Prisma.raw(`"${field}"`);
  const rows = input.rows.map((row) => ({ ...row, id: crypto.randomUUID() }));
  return client.$queryRaw<AttendanceRecord[]>(Prisma.sql`
    INSERT INTO "AttendanceRecord" AS current (
      id, "programId", "workDayId", "programBeneficiaryId", "attendanceDate", ${column},
      status, source, "scannedById", "deviceId", "workProgramItemId", "workArea", "activityName", "createdAt", "updatedAt"
    )
    SELECT row.id, ${input.programId}, ${input.workDayId}, row."programBeneficiaryId", ${input.attendanceDate}, ${input.now},
      'PRESENT', ${input.source}, ${input.userId}, ${input.deviceId}, row."workProgramItemId", row."workArea", row."activityName", ${input.now}, ${input.now}
    FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS row(
      id text, "programBeneficiaryId" text, "workProgramItemId" text, "workArea" text, "activityName" text
    )
    ON CONFLICT ("programId", "workDayId", "programBeneficiaryId") DO UPDATE SET
      ${column} = EXCLUDED.${column}, status = 'PRESENT', "updatedAt" = EXCLUDED."updatedAt",
      "workProgramItemId" = COALESCE(current."workProgramItemId", EXCLUDED."workProgramItemId"),
      "workArea" = COALESCE(current."workArea", EXCLUDED."workArea"),
      "activityName" = COALESCE(current."activityName", EXCLUDED."activityName")
    WHERE current.${column} IS NULL AND current."attendanceDate" = EXCLUDED."attendanceDate"
    RETURNING current.*
  `);
}
