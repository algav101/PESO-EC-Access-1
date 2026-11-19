/** Assignment ranges apply only to attendance recorded from the masterlist. */
export const MASTERLIST_ATTENDANCE_RANGES = {
  MORNING_IN: { start: "06:30", end: "07:00", label: "6:30–7:00 AM" },
  MORNING_OUT: { start: "10:30", end: "11:00", label: "10:30–11:00 AM" },
  AFTERNOON_IN: { start: "12:30", end: "13:00", label: "12:30–1:00 PM" },
  AFTERNOON_OUT: { start: "16:30", end: "17:00", label: "4:30–5:00 PM" },
} as const;

export function getMasterlistAttendanceRange(workDate: string, slot: keyof typeof MASTERLIST_ATTENDANCE_RANGES): { start: Date; end: Date } {
  const schedule = MASTERLIST_ATTENDANCE_RANGES[slot];
  if (!schedule || !/^\d{4}-\d{2}-\d{2}$/.test(workDate)) throw new Error("Invalid attendance date or shift.");
  const calendarDate = new Date(`${workDate}T00:00:00Z`);
  if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== workDate) throw new Error("Invalid attendance date.");
  // Explicit UTC+8 keeps the selected Philippine calendar date independent of
  // server/device time zones, the submission clock, and the current day.
  return {
    start: new Date(`${workDate}T${schedule.start}:00+08:00`),
    end: new Date(`${workDate}T${schedule.end}:00+08:00`),
  };
}
