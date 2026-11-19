import type { Prisma } from "@prisma/client";

/** Run in a transaction. Correct stale schedule metadata only when EVERY saved
 * scan timestamp already falls on the new scheduled date in Asia/Manila.
 * Actual time-in/out values and records from genuinely different dates stay intact.
 */
export async function reconcileAttendanceScheduleDates(tx: Prisma.TransactionClient, programId: string, userId?: string | null) {
  const corrected = await tx.$queryRaw<{ id: string; workDayId: string; oldDate: string; newDate: string }[]>`
    WITH candidates AS (
      SELECT attendance.id, attendance."workDayId", attendance."attendanceDate" AS "oldDate", day."workDate" AS "newDate"
      FROM "AttendanceRecord" attendance JOIN "WorkDay" day ON day.id = attendance."workDayId" AND day."programId" = attendance."programId"
      WHERE attendance."programId" = ${programId} AND attendance."attendanceDate" <> day."workDate"
        AND COALESCE(attendance."morningTimeIn", attendance."morningTimeOut", attendance."afternoonTimeIn", attendance."afternoonTimeOut") IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM unnest(ARRAY[attendance."morningTimeIn", attendance."morningTimeOut", attendance."afternoonTimeIn", attendance."afternoonTimeOut"]) AS stamp(value)
          WHERE stamp.value IS NOT NULL AND to_char(stamp.value + interval '8 hours', 'YYYY-MM-DD') <> day."workDate"
        )
      FOR UPDATE OF attendance
    )
    UPDATE "AttendanceRecord" AS attendance SET "attendanceDate" = candidate."newDate", "updatedAt" = CURRENT_TIMESTAMP
    FROM candidates candidate WHERE attendance.id = candidate.id
    RETURNING attendance.id, attendance."workDayId", candidate."oldDate", candidate."newDate"
  `;
  if (corrected.length) await tx.auditLog.createMany({ data: corrected.map((record) => ({
    userId: userId || null, action: "ATTENDANCE_SCHEDULE_DATE_RECONCILED", entityType: "ATTENDANCE_RECORD", entityId: record.id,
    oldData: JSON.stringify({ attendanceDate: record.oldDate }), newData: JSON.stringify({ attendanceDate: record.newDate }),
    metadata: JSON.stringify({ programId, workDayId: record.workDayId, reason: "All existing scan timestamps already match the corrected work date in Asia/Manila", scanTimestampsPreserved: true }),
  })) });
  return corrected;
}
