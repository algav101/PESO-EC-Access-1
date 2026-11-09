import { normalizeBarangayName } from "./utils";

interface WorkDay { id: string; dayNumber: number; workDate: string }
interface WorkItem { id: string; dayNumber: number; specificActivities: string; area: string }
interface WorkPlan { barangay: string; items: WorkItem[] }
interface PhotoActivity {
  workDayId: string | null;
  workProgramItemId: string | null;
  barangay: string | null;
  specificActivity: string | null;
  workArea: string | null;
  status: string;
}
interface AttendanceActivity {
  workDayId: string;
  workProgramItemId: string | null;
  programBeneficiaryId: string;
  activityName: string | null;
  workArea: string | null;
}
export interface CompletionProgram {
  requiredWorkDays: number;
  workDays: WorkDay[];
  tupadWorkPrograms: WorkPlan[];
  programBeneficiaries: Array<{ id: string; beneficiary: { barangay: string | null } }>;
  accomplishmentPhotos: PhotoActivity[];
  attendanceRecords: AttendanceActivity[];
}
export interface CompletionDay { dayNumber: number; workDate: string; accomplishment: string }

// Do not use normalizeBarangayName's Paltic fallback for missing locations.
export function completionBarangay(raw?: string | null): string {
  return raw?.trim() ? normalizeBarangayName(raw).toUpperCase() : "";
}

function cleanActivity(raw?: string | null): string {
  // Photo documentation stages are not separate assignments.
  return (raw || "").replace(/^\s*(?:\[(?:BEFORE|DURING|AFTER)\]\s*[:\-–]?|(?:BEFORE|DURING|AFTER)\s*[:\-–])\s*/i, "").replace(/\r\n/g, "\n").trim();
}
const key = (text: string) => text.replace(/\s+/g, " ").replace(/[.\s]+$/, "").toLocaleLowerCase("en");

/** Daily barangay summary, not a per-person roster. Includes saved custom assignments. */
export function buildBarangayCompletionDays(program: CompletionProgram, barangay: string): CompletionDay[] {
  const target = completionBarangay(barangay);
  const itemById = new Map(program.tupadWorkPrograms.flatMap(plan => plan.items.map(item => [item.id, { ...item, barangay: completionBarangay(plan.barangay) }] as const)));
  const dayById = new Map(program.workDays.map(day => [day.id, day]));
  const beneficiaryById = new Map(program.programBeneficiaries.map(pb => [pb.id, completionBarangay(pb.beneficiary.barangay)]));
  const lastDay = Math.max(program.requiredWorkDays || 0, ...program.workDays.map(day => day.dayNumber), ...program.tupadWorkPrograms.flatMap(plan => plan.items.map(item => item.dayNumber)));
  const days: CompletionDay[] = [];
  for (let dayNumber = 1; dayNumber <= lastDay; dayNumber++) {
    const activities = new Map<string, { text: string; areas: Map<string, string> }>();
    const add = (raw: string | null | undefined, area?: string | null) => {
      const text = cleanActivity(raw);
      if (!text) return;
      const id = key(text);
      const entry = activities.get(id) || { text, areas: new Map<string, string>() };
      if (area?.trim()) entry.areas.set(key(area), area.trim());
      activities.set(id, entry);
    };
    for (const plan of program.tupadWorkPrograms) {
      if (completionBarangay(plan.barangay) !== target) continue;
      for (const item of plan.items) if (item.dayNumber === dayNumber) add(item.specificActivities, item.area);
    }
    for (const photo of program.accomplishmentPhotos) {
      if (photo.status === "REJECTED") continue;
      const item = photo.workProgramItemId ? itemById.get(photo.workProgramItemId) : undefined;
      // Explicit work-day links are authoritative. Never substitute the upload/capture date.
      const day = photo.workDayId ? dayById.get(photo.workDayId)?.dayNumber : item?.dayNumber;
      const location = completionBarangay(photo.barangay) || item?.barangay;
      if (day === dayNumber && location === target) add(photo.specificActivity, photo.workArea || item?.area);
    }
    for (const record of program.attendanceRecords) {
      const item = record.workProgramItemId ? itemById.get(record.workProgramItemId) : undefined;
      const location = item?.barangay || beneficiaryById.get(record.programBeneficiaryId);
      if (dayById.get(record.workDayId)?.dayNumber === dayNumber && location === target) add(record.activityName, record.workArea || item?.area);
    }
    days.push({
      dayNumber,
      workDate: program.workDays.find(day => day.dayNumber === dayNumber)?.workDate || "",
      accomplishment: [...activities.values()].map(entry => entry.text + (entry.areas.size ? ` (Area: ${[...entry.areas.values()].join("; ")})` : "")).join("\n"),
    });
  }
  return days;
}
