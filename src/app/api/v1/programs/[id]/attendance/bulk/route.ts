export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canRecordMasterlistAttendance } from "@/lib/permissions";
import { getPhilippineTime, ATTENDANCE_SLOT_LABELS } from "@/lib/utils";
import { ATTENDANCE_FIELDS, writeAttendanceSlot, type AttendanceSlot } from "@/lib/attendance-slot-write";
import { getMasterlistAttendanceRange, MASTERLIST_ATTENDANCE_RANGES } from "@/lib/masterlist-attendance-time";

class BulkAttendanceError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !canRecordMasterlistAttendance(user)) return NextResponse.json({ error: "Only PESO Admin and PESO Staff can record attendance from the masterlist." }, { status: 403 });
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new BulkAttendanceError("Invalid attendance request.");
    if (!Array.isArray(body.programBeneficiaryIds) || !body.programBeneficiaryIds.length || body.programBeneficiaryIds.length > 2000
      || body.programBeneficiaryIds.some((id: unknown) => typeof id !== "string" || !id.trim())) throw new BulkAttendanceError("Select between 1 and 2,000 valid beneficiaries.");
    const ids = [...new Set(body.programBeneficiaryIds as string[])];
    if (typeof body.workDayId !== "string" || !body.workDayId || typeof body.targetDate !== "string") throw new BulkAttendanceError("Choose an attendance day and date.");
    if (typeof body.shiftMode !== "string" || !Object.prototype.hasOwnProperty.call(ATTENDANCE_FIELDS, body.shiftMode)) throw new BulkAttendanceError("Choose AM IN, AM OUT, PM IN or PM OUT.");
    if (body.remarks !== undefined && (typeof body.remarks !== "string" || body.remarks.length > 1000)) throw new BulkAttendanceError("Remarks must be at most 1,000 characters.");
    const slot = body.shiftMode as AttendanceSlot, field = ATTENDANCE_FIELDS[slot];
    const now = getPhilippineTime().now;
    const result = await prisma.$transaction(async (tx) => {
      // Serialize against roster imports and start-date edits for this program.
      const [lock] = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(hashtextextended(${params.id}, 0)) AS locked`;
      if (!lock?.locked) throw new BulkAttendanceError("Another program update is running. Retry after it finishes.", 409);
      const program = await tx.program.findUnique({ where: { id: params.id }, include: {
        workDays: { where: { id: body.workDayId } },
        tupadWorkPrograms: { include: { items: { orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }] } } },
      } });
      if (!program) throw new BulkAttendanceError("Program not found.", 404);
      if (program.status !== "ACTIVE") throw new BulkAttendanceError("Attendance can only be recorded for an active program.", 409);
      const day = program.workDays[0];
      if (!day || day.status === "CANCELLED") throw new BulkAttendanceError("The selected attendance day is unavailable in this program.", 409);
      if (day.workDate !== body.targetDate) throw new BulkAttendanceError("Work schedule changed. Reopen Attendance and choose the updated day.", 409);
      const timeRange = getMasterlistAttendanceRange(day.workDate, slot);
      const assignedTimes = new Map<string, Date>();
      const people = await tx.programBeneficiary.findMany({ where: { programId: params.id, id: { in: ids } }, include: {
        beneficiary: { select: { fullName: true, barangay: true, sitio: true } },
        orientationAttendance: { where: { programId: params.id, status: "PRESENT" }, select: { id: true }, take: 1 },
        attendanceRecords: { where: { programId: params.id, workDayId: day.id }, take: 1 },
      } });
      if (people.length !== ids.length) throw new BulkAttendanceError("Some selected beneficiaries are missing or belong to another program. Refresh the masterlist and select again.", 409);
      const bypassSetting = await tx.systemSetting.findFirst({ where: { key: { in: ["bypass_three_hour_rule", "BYPASS_3_HOUR_RULE"] } } });
      const enforceDuration = ["enforce_3hr", "true_enforce"].includes(bypassSetting?.value || "");
      const results = people.map((pb) => {
        const existing = pb.attendanceRecords[0];
        // Each person receives an independent, server-assigned second within
        // the selected day's range, including both endpoints.
        const slotTime = new Date(randomInt(timeRange.start.getTime() / 1000, timeRange.end.getTime() / 1000 + 1) * 1000);
        assignedTimes.set(pb.id, slotTime);
        let reason = "";
        if (!["ACTIVE", "ENROLLED", "FLAGGED_FOR_REPLACEMENT"].includes(pb.participationStatus)) reason = "Inactive or replaced beneficiary.";
        else if (pb.originalBeneficiary && !pb.orientationAttendance.length) reason = "Orientation attendance must be verified first.";
        else if (existing && existing.attendanceDate !== day.workDate) reason = "Existing attendance belongs to the previous schedule date; review it first.";
        else if (existing?.[field]) reason = "This attendance shift is already recorded; the original timestamp was kept.";
        else if (enforceDuration && existing) {
          const timeIn = slot === "MORNING_OUT" ? existing.morningTimeIn : slot === "AFTERNOON_OUT" ? existing.afternoonTimeIn : null;
          if (timeIn && slotTime.getTime() - timeIn.getTime() < 3 * 60 * 60 * 1000) reason = "Time-out requires at least 3 hours after time-in.";
        }
        return { programBeneficiaryId: pb.id, designatedNumber: pb.designatedNumber, fullName: pb.beneficiary.fullName, status: reason ? "SKIPPED" : "PENDING", reason, attendanceTime: null as string | null };
      });
      const eligible = new Set(results.filter((row) => row.status === "PENDING").map((row) => row.programBeneficiaryId));
      const records = await writeAttendanceSlot(tx, {
        programId: program.id, workDayId: day.id, attendanceDate: day.workDate, slot, now,
        userId: user.id, source: "MASTERLIST_BULK", deviceId: "ADMIN_WEB_ROSTER",
        rows: people.filter((pb) => eligible.has(pb.id)).map((pb) => {
          const brgy = (pb.beneficiary.barangay || "").toUpperCase(), sitio = (pb.beneficiary.sitio || "").toUpperCase();
          const wp = program.tupadWorkPrograms.find((wp) => wp.barangay.toUpperCase() === brgy || wp.projectLocation?.toUpperCase() === brgy);
          const items = wp?.items.filter((item) => item.dayNumber === day.dayNumber) || [];
          const item = (sitio ? items.find((item) => item.area.toUpperCase().includes(sitio)) : undefined) || items[0];
          return { programBeneficiaryId: pb.id, slotTime: assignedTimes.get(pb.id), workProgramItemId: item?.id, workArea: item?.area, activityName: item?.specificActivities };
        }),
      });
      const recordedTimes = new Map(records.map((record) => [record.programBeneficiaryId, record[field]!.toISOString()]));
      for (const row of results) if (row.status === "PENDING") {
        row.status = recordedTimes.has(row.programBeneficiaryId) ? "RECORDED" : "SKIPPED";
        row.attendanceTime = recordedTimes.get(row.programBeneficiaryId) || null;
        if (row.status === "SKIPPED") row.reason = "Already recorded by another request or the schedule changed; original data was kept.";
      }
      if (records.length) await tx.auditLog.createMany({ data: records.map((record) => ({
        userId: user.id, action: "ATTENDANCE_RECORDED_FROM_MASTERLIST", entityType: "ATTENDANCE_RECORD", entityId: record.id,
        metadata: JSON.stringify({ programId: program.id, programBeneficiaryId: record.programBeneficiaryId, workDayId: day.id,
          dayNumber: day.dayNumber, attendanceDate: day.workDate, slot, attendanceTime: record[field]!.toISOString(), recordedAt: now.toISOString(),
          timePolicy: "RANDOM_WITHIN_PHILIPPINE_TIME_RANGE", timeRange: { start: timeRange.start.toISOString(), end: timeRange.end.toISOString() },
          source: "MASTERLIST_BULK", remarks: body.remarks || null }),
      })) });
      return { success: true, updatedCount: records.length, skippedCount: ids.length - records.length,
        workDay: { id: day.id, dayNumber: day.dayNumber, workDate: day.workDate }, slot, slotLabel: ATTENDANCE_SLOT_LABELS[slot], timeRangeLabel: MASTERLIST_ATTENDANCE_RANGES[slot].label, results };
    }, { timeout: 30000, maxWait: 5000 });
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof BulkAttendanceError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid attendance request." }, { status: 400 });
    if (["P2034", "P2028"].includes(error?.code)) return NextResponse.json({ error: "Attendance changed while saving. Refresh and retry; existing records were kept." }, { status: 409 });
    console.error("Bulk attendance failed", { code: error?.code || error?.name });
    return NextResponse.json({ error: "Attendance could not be saved. Refresh the masterlist before retrying." }, { status: 500 });
  }
}
