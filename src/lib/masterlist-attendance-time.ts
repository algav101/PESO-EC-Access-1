/** Fixed times apply only to attendance recorded directly from the masterlist. */
export const MASTERLIST_ATTENDANCE_TIMES = {
  MORNING_IN: { time: "07:00", label: "7:00 AM" },
  MORNING_OUT: { time: "11:00", label: "11:00 AM" },
  AFTERNOON_IN: { time: "13:00", label: "1:00 PM" },
  AFTERNOON_OUT: { time: "17:00", label: "5:00 PM" },
} as const;

export function getMasterlistAttendanceTimestamp(workDate: string, slot: keyof typeof MASTERLIST_ATTENDANCE_TIMES): Date {
  const schedule = MASTERLIST_ATTENDANCE_TIMES[slot];
  if (!schedule || !/^\d{4}-\d{2}-\d{2}$/.test(workDate)) throw new Error("Invalid attendance date or shift.");
  const calendarDate = new Date(`${workDate}T00:00:00Z`);
  if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== workDate) throw new Error("Invalid attendance date.");
  // Explicit UTC+8 keeps the selected Philippine calendar date independent of
  // server/device time zones, the submission clock, and the current day.
  return new Date(`${workDate}T${schedule.time}:00+08:00`);
}
