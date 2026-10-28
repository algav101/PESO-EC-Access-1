export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { format } from "date-fns";
import {
  normalizeBarangayName,
  getPhilippineTime,
  determineAttendanceSlot,
  ATTENDANCE_SLOT_LABELS,
} from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.role, "attendance.scan")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions for attendance scanning" }, { status: 403 });
    }

    const body = await request.json();
    const rawQrToken = (body.qrToken || body.token || "").toString().trim();
    const {
      workDayId,
      targetDate,
      shiftMode = "AUTO",
      deviceId,
      workProgramItemId,
      workArea,
      activityName,
      programId: programIdParam,
    } = body;

    if (!rawQrToken) {
      return NextResponse.json({ error: "QR Token or Beneficiary number is required" }, { status: 400 });
    }

    // Clean token if URL
    let cleanToken = rawQrToken;
    try {
      if (rawQrToken.startsWith("http://") || rawQrToken.startsWith("https://")) {
        const parsedUrl = new URL(rawQrToken);
        cleanToken =
          parsedUrl.searchParams.get("token") ||
          parsedUrl.searchParams.get("qrToken") ||
          parsedUrl.pathname.split("/").pop() ||
          rawQrToken;
      }
    } catch {}

    cleanToken = cleanToken.trim();

    let qr = null;
    let pb: any = null;

    const pbIncludes = {
      beneficiary: true,
      orientationAttendance: {
        where: { status: "PRESENT" },
      },
      stubDistributions: {
        where: { status: "DISTRIBUTED" },
      },
      program: {
        include: {
          workDays: { orderBy: { dayNumber: "asc" as const } },
          tupadWorkPrograms: {
            include: {
              items: { orderBy: [{ dayNumber: "asc" as const }, { orderIndex: "asc" as const }] },
            },
          },
        },
      },
      qrCodes: true,
    };

    // Strategy 1: Find by exact or uppercase publicToken
    qr = await prisma.qrCode.findFirst({
      where: {
        OR: [{ publicToken: cleanToken }, { publicToken: cleanToken.toUpperCase() }],
      },
      include: {
        programBeneficiary: {
          include: pbIncludes,
        },
      },
    });

    if (qr && qr.programBeneficiary) {
      pb = qr.programBeneficiary;
    }

    // Strategy 2: Case-insensitive substring (only for non-numeric tokens of length >= 6)
    const isNumericSlot = /^\d+$/.test(cleanToken);
    if (!pb && !isNumericSlot && cleanToken.length >= 6) {
      qr = await prisma.qrCode.findFirst({
        where: { publicToken: { contains: cleanToken, mode: "insensitive" } },
        include: {
          programBeneficiary: {
            include: pbIncludes,
          },
        },
      });
      if (qr && qr.programBeneficiary) {
        pb = qr.programBeneficiary;
      }
    }

    // Strategy 3: Numeric designated slot
    if (!pb && isNumericSlot) {
      const slotNum = String(parseInt(cleanToken, 10));
      const whereClause: any = { designatedNumber: slotNum, participationStatus: "ACTIVE" };
      if (programIdParam) whereClause.programId = programIdParam;

      pb = await prisma.programBeneficiary.findFirst({
        where: whereClause,
        orderBy: { joinedAt: "desc" },
        include: pbIncludes,
      });

      if (pb) {
        qr = pb.qrCodes.find((q: any) => q.status === "ACTIVE") || pb.qrCodes[0] || null;
      }
    }

    // Strategy 4: Beneficiary number or Full name
    if (!pb) {
      const whereClause: any = {
        OR: [
          { beneficiary: { beneficiaryNumber: cleanToken } },
          { beneficiary: { fullName: { equals: cleanToken, mode: "insensitive" } } },
        ],
      };
      if (programIdParam) whereClause.programId = programIdParam;

      pb = await prisma.programBeneficiary.findFirst({
        where: whereClause,
        orderBy: { joinedAt: "desc" },
        include: pbIncludes,
      });

      if (pb) {
        qr = pb.qrCodes.find((q: any) => q.status === "ACTIVE") || pb.qrCodes[0] || null;
      }
    }

    if (!pb) {
      return NextResponse.json({ error: "QR Token not recognized in active program roster." }, { status: 404 });
    }

    // Resolve replacement
    if (pb.participationStatus === "REPLACED") {
      const activeReplacement = await prisma.programBeneficiary.findFirst({
        where: {
          programId: pb.programId,
          designatedNumber: pb.designatedNumber,
          participationStatus: "ACTIVE",
        },
        include: pbIncludes,
      });

      if (activeReplacement) {
        pb = activeReplacement;
      } else {
        return NextResponse.json(
          {
            error: `CANNOT SCAN: Beneficiary #${pb.designatedNumber} (${pb.beneficiary.fullName}) was replaced and is no longer active in this work program.`,
            stepBlocked: "BENEFICIARY_REPLACED",
          },
          { status: 400 }
        );
      }
    }

    // =========================================================================
    // STEP SEQUENCE VALIDATION: Step 2 (Orientation Attendance) must be completed!
    // =========================================================================
    const hasCompletedOrientation =
      (pb.orientationAttendance && pb.orientationAttendance.length > 0) || !pb.originalBeneficiary;

    if (!hasCompletedOrientation) {
      return NextResponse.json(
        {
          error: `SEQUENCE BLOCKED: Beneficiary #${pb.designatedNumber} (${pb.beneficiary.fullName}) has NOT completed Step 2 (Orientation Attendance). Daily attendance scanning requires prior Orientation verification.`,
          stepBlocked: "ORIENTATION_REQUIRED",
          data: {
            designatedNumber: pb.designatedNumber,
            fullName: pb.beneficiary.fullName,
            barangay: normalizeBarangayName(pb.beneficiary.barangay),
          },
        },
        { status: 400 }
      );
    }

    const program = pb.program;

    // Resolve WorkDay using Philippine Standard Time date
    const pht = getPhilippineTime();
    const now = pht.now;
    const dateStr = targetDate || pht.dateStr;
    let workDay = workDayId
      ? program.workDays.find((w: any) => w.id === workDayId)
      : program.workDays.find((w: any) => w.workDate === dateStr) || program.workDays[0];

    if (!workDay) {
      return NextResponse.json({ error: "No active work day found for this program" }, { status: 400 });
    }

    // Resolve Work Program Item / Area
    const beneBrgy = (pb.beneficiary.barangay || "").toUpperCase();
    const beneSitio = (pb.beneficiary.sitio || "").toUpperCase();

    const matchingWorkProgram = program.tupadWorkPrograms?.find(
      (wp: any) => wp.barangay.toUpperCase() === beneBrgy || wp.projectLocation?.toUpperCase() === beneBrgy
    );

    const dayItems = matchingWorkProgram
      ? matchingWorkProgram.items.filter((it: any) => it.dayNumber === workDay.dayNumber)
      : [];

    let resolvedItemId = workProgramItemId || null;
    let resolvedArea = workArea || null;
    let resolvedActivity = activityName || null;
    let targetItem = null;

    if (resolvedItemId) {
      targetItem = dayItems.find((it: any) => it.id === resolvedItemId);
      if (targetItem) {
        resolvedArea = targetItem.area;
        resolvedActivity = targetItem.specificActivities;
      }
    } else if (dayItems.length > 0) {
      if (beneSitio) {
        targetItem = dayItems.find((it: any) => it.area.toUpperCase().includes(beneSitio));
      }
      if (!targetItem) {
        targetItem = dayItems[0];
      }
      if (targetItem) {
        resolvedItemId = targetItem.id;
        resolvedArea = targetItem.area;
        resolvedActivity = targetItem.specificActivities;
      }
    }

    // Find existing Attendance Record for this workday
    let record = await prisma.attendanceRecord.findUnique({
      where: {
        programId_workDayId_programBeneficiaryId: {
          programId: program.id,
          workDayId: workDay.id,
          programBeneficiaryId: pb.id,
        },
      },
    });

    // Determine target slot in Philippine Standard Time (PST / Asia/Manila, UTC+8)
    let targetSlot: "MORNING_IN" | "MORNING_OUT" | "AFTERNOON_IN" | "AFTERNOON_OUT" = "MORNING_IN";
    if (shiftMode === "MORNING_IN") targetSlot = "MORNING_IN";
    else if (shiftMode === "MORNING_OUT") targetSlot = "MORNING_OUT";
    else if (shiftMode === "AFTERNOON_IN") targetSlot = "AFTERNOON_IN";
    else if (shiftMode === "AFTERNOON_OUT") targetSlot = "AFTERNOON_OUT";
    else {
      // AUTO detection strictly by Philippine Time (0:00-11:30 AM IN, 11:30-12:45 AM OUT, 12:45-15:30 PM IN, 15:30+ PM OUT)
      targetSlot = determineAttendanceSlot(pht.timeDecimal);
    }

    const slotLabels = ATTENDANCE_SLOT_LABELS;

    // =========================================================================
    // ANTI-DOUBLE SCAN ENFORCEMENT: Check if the session slot was already logged
    // =========================================================================
    if (targetSlot === "MORNING_IN" && record?.morningTimeIn) {
      const loggedTime = format(new Date(record.morningTimeIn), "hh:mm a");
      return NextResponse.json(
        {
          error: `ALREADY SCANNED: Morning Time-In (AM IN) for #${pb.designatedNumber} (${pb.beneficiary.fullName}) was already recorded today at ${loggedTime}. Double scanning is blocked.`,
          alreadyScanned: true,
          slotName: slotLabels[targetSlot],
          loggedTime,
          data: {
            designatedNumber: pb.designatedNumber,
            fullName: pb.beneficiary.fullName,
            barangay: normalizeBarangayName(pb.beneficiary.barangay),
            dayNumber: workDay.dayNumber,
            workDate: workDay.workDate,
            morningTimeIn: record.morningTimeIn,
            morningTimeOut: record.morningTimeOut,
            afternoonTimeIn: record.afternoonTimeIn,
            afternoonTimeOut: record.afternoonTimeOut,
          },
        },
        { status: 400 }
      );
    }

    if (targetSlot === "MORNING_OUT" && record?.morningTimeOut) {
      const loggedTime = format(new Date(record.morningTimeOut), "hh:mm a");
      return NextResponse.json(
        {
          error: `ALREADY SCANNED: Morning Time-Out (AM OUT) for #${pb.designatedNumber} (${pb.beneficiary.fullName}) was already recorded today at ${loggedTime}. Double scanning is blocked.`,
          alreadyScanned: true,
          slotName: slotLabels[targetSlot],
          loggedTime,
          data: {
            designatedNumber: pb.designatedNumber,
            fullName: pb.beneficiary.fullName,
            barangay: normalizeBarangayName(pb.beneficiary.barangay),
            dayNumber: workDay.dayNumber,
            workDate: workDay.workDate,
            morningTimeIn: record.morningTimeIn,
            morningTimeOut: record.morningTimeOut,
            afternoonTimeIn: record.afternoonTimeIn,
            afternoonTimeOut: record.afternoonTimeOut,
          },
        },
        { status: 400 }
      );
    }

    if (targetSlot === "AFTERNOON_IN" && record?.afternoonTimeIn) {
      const loggedTime = format(new Date(record.afternoonTimeIn), "hh:mm a");
      return NextResponse.json(
        {
          error: `ALREADY SCANNED: Afternoon Time-In (PM IN) for #${pb.designatedNumber} (${pb.beneficiary.fullName}) was already recorded today at ${loggedTime}. Double scanning is blocked.`,
          alreadyScanned: true,
          slotName: slotLabels[targetSlot],
          loggedTime,
          data: {
            designatedNumber: pb.designatedNumber,
            fullName: pb.beneficiary.fullName,
            barangay: normalizeBarangayName(pb.beneficiary.barangay),
            dayNumber: workDay.dayNumber,
            workDate: workDay.workDate,
            morningTimeIn: record.morningTimeIn,
            morningTimeOut: record.morningTimeOut,
            afternoonTimeIn: record.afternoonTimeIn,
            afternoonTimeOut: record.afternoonTimeOut,
          },
        },
        { status: 400 }
      );
    }

    if (targetSlot === "AFTERNOON_OUT" && record?.afternoonTimeOut) {
      const loggedTime = format(new Date(record.afternoonTimeOut), "hh:mm a");
      return NextResponse.json(
        {
          error: `ALREADY SCANNED: Afternoon Time-Out (PM OUT) for #${pb.designatedNumber} (${pb.beneficiary.fullName}) was already recorded today at ${loggedTime}. Double scanning is blocked.`,
          alreadyScanned: true,
          slotName: slotLabels[targetSlot],
          loggedTime,
          data: {
            designatedNumber: pb.designatedNumber,
            fullName: pb.beneficiary.fullName,
            barangay: normalizeBarangayName(pb.beneficiary.barangay),
            dayNumber: workDay.dayNumber,
            workDate: workDay.workDate,
            morningTimeIn: record.morningTimeIn,
            morningTimeOut: record.morningTimeOut,
            afternoonTimeIn: record.afternoonTimeIn,
            afternoonTimeOut: record.afternoonTimeOut,
          },
        },
        { status: 400 }
      );
    }

    // =========================================================================
    // 3-HOUR RULE & SEQUENCE CHECKS
    // Disabled to allow field users to freely scan and comply with backlogs
    // =========================================================================
    // 3-hour minimum duration rule is disabled by default for backlog recovery.
    // If a beneficiary is scanned for Time-Out without a prior Time-In, we still
    // allow recording the Time-Out or auto-fill default time if missing.
    const bypassSetting = await prisma.systemSetting.findFirst({
      where: {
        key: { in: ["bypass_three_hour_rule", "BYPASS_3_HOUR_RULE"] },
      },
    });

    // Default to bypass enabled (3-hour rule disabled) unless explicitly turned off
    const is3HourRuleActive = bypassSetting?.value === "enforce_3hr" || bypassSetting?.value === "true_enforce";

    if (is3HourRuleActive && body.bypass3HourRule !== true) {
      const MIN_WORK_DURATION_MS = 3 * 60 * 60 * 1000; // 3 Hours (180 minutes)

      if (targetSlot === "MORNING_OUT" && record?.morningTimeIn) {
        const amInDate = new Date(record.morningTimeIn);
        const diffMs = now.getTime() - amInDate.getTime();
        if (diffMs < MIN_WORK_DURATION_MS) {
          const remainingMs = MIN_WORK_DURATION_MS - Math.max(0, diffMs);
          const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
          const elapsedMinutes = Math.max(0, Math.floor(diffMs / (60 * 1000)));
          const unlockTime = new Date(amInDate.getTime() + MIN_WORK_DURATION_MS);
          const amInTimeFormatted = format(amInDate, "hh:mm a");
          const unlockTimeFormatted = format(unlockTime, "hh:mm a");

          const remainingText =
            remainingMinutes >= 60
              ? `${Math.floor(remainingMinutes / 60)} hr ${remainingMinutes % 60} mins`
              : `${remainingMinutes} mins`;
          const elapsedText =
            elapsedMinutes >= 60
              ? `${Math.floor(elapsedMinutes / 60)} hr ${elapsedMinutes % 60} mins`
              : `${elapsedMinutes} mins`;

          return NextResponse.json(
            {
              error: `TIME-OUT BLOCKED: Morning Time-Out (AM OUT) requires at least 3 hours of active work duration. AM IN was recorded at ${amInTimeFormatted} (elapsed: ${elapsedText}). Re-scanning AM OUT is allowed at or after ${unlockTimeFormatted} (${remainingText} remaining).`,
              stepBlocked: "MINIMUM_DURATION_NOT_MET",
              slotName: slotLabels[targetSlot],
              timeInFormatted: amInTimeFormatted,
              unlockTimeFormatted,
              remainingMinutes,
              data: {
                designatedNumber: pb.designatedNumber,
                fullName: pb.beneficiary.fullName,
                barangay: normalizeBarangayName(pb.beneficiary.barangay),
                dayNumber: workDay.dayNumber,
                workDate: workDay.workDate,
                morningTimeIn: record.morningTimeIn,
                morningTimeOut: record.morningTimeOut,
                afternoonTimeIn: record.afternoonTimeIn,
                afternoonTimeOut: record.afternoonTimeOut,
              },
            },
            { status: 400 }
          );
        }
      }

      if (targetSlot === "AFTERNOON_OUT" && record?.afternoonTimeIn) {
        const pmInDate = new Date(record.afternoonTimeIn);
        const diffMs = now.getTime() - pmInDate.getTime();
        if (diffMs < MIN_WORK_DURATION_MS) {
          const remainingMs = MIN_WORK_DURATION_MS - Math.max(0, diffMs);
          const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
          const elapsedMinutes = Math.max(0, Math.floor(diffMs / (60 * 1000)));
          const unlockTime = new Date(pmInDate.getTime() + MIN_WORK_DURATION_MS);
          const pmInTimeFormatted = format(pmInDate, "hh:mm a");
          const unlockTimeFormatted = format(unlockTime, "hh:mm a");

          const remainingText =
            remainingMinutes >= 60
              ? `${Math.floor(remainingMinutes / 60)} hr ${remainingMinutes % 60} mins`
              : `${remainingMinutes} mins`;
          const elapsedText =
            elapsedMinutes >= 60
              ? `${Math.floor(elapsedMinutes / 60)} hr ${elapsedMinutes % 60} mins`
              : `${elapsedMinutes} mins`;

          return NextResponse.json(
            {
              error: `TIME-OUT BLOCKED: Afternoon Time-Out (PM OUT) requires at least 3 hours of active work duration. PM IN was recorded at ${pmInTimeFormatted} (elapsed: ${elapsedText}). Re-scanning PM OUT is allowed at or after ${unlockTimeFormatted} (${remainingText} remaining).`,
              stepBlocked: "MINIMUM_DURATION_NOT_MET",
              slotName: slotLabels[targetSlot],
              timeInFormatted: pmInTimeFormatted,
              unlockTimeFormatted,
              remainingMinutes,
              data: {
                designatedNumber: pb.designatedNumber,
                fullName: pb.beneficiary.fullName,
                barangay: normalizeBarangayName(pb.beneficiary.barangay),
                dayNumber: workDay.dayNumber,
                workDate: workDay.workDate,
                morningTimeIn: record.morningTimeIn,
                morningTimeOut: record.morningTimeOut,
                afternoonTimeIn: record.afternoonTimeIn,
                afternoonTimeOut: record.afternoonTimeOut,
              },
            },
            { status: 400 }
          );
        }
      }
    }

    // Record or update attendance atomically via upsert to prevent P2002 race conditions
    const slotRecorded = slotLabels[targetSlot];

    const updateData: any = {};
    if (resolvedItemId && !record?.workProgramItemId) updateData.workProgramItemId = resolvedItemId;
    if (resolvedArea && !record?.workArea) updateData.workArea = resolvedArea;
    if (resolvedActivity && !record?.activityName) updateData.activityName = resolvedActivity;

    if (targetSlot === "MORNING_IN") updateData.morningTimeIn = now;
    else if (targetSlot === "MORNING_OUT") updateData.morningTimeOut = now;
    else if (targetSlot === "AFTERNOON_IN") updateData.afternoonTimeIn = now;
    else if (targetSlot === "AFTERNOON_OUT") updateData.afternoonTimeOut = now;

    record = await prisma.attendanceRecord.upsert({
      where: {
        programId_workDayId_programBeneficiaryId: {
          programId: program.id,
          workDayId: workDay.id,
          programBeneficiaryId: pb.id,
        },
      },
      update: updateData,
      create: {
        programId: program.id,
        workDayId: workDay.id,
        programBeneficiaryId: pb.id,
        attendanceDate: workDay.workDate,
        morningTimeIn: targetSlot === "MORNING_IN" ? now : null,
        morningTimeOut: targetSlot === "MORNING_OUT" ? now : null,
        afternoonTimeIn: targetSlot === "AFTERNOON_IN" ? now : null,
        afternoonTimeOut: targetSlot === "AFTERNOON_OUT" ? now : null,
        status: "PRESENT",
        source: "QR_SCAN",
        scannedById: user.id,
        deviceId: deviceId || "BROWSER",
        workProgramItemId: resolvedItemId,
        workArea: resolvedArea,
        activityName: resolvedActivity,
      },
    });

    await logAudit({
      userId: user.id,
      action: "ATTENDANCE_SCANNED",
      entityType: "ATTENDANCE_RECORD",
      entityId: record.id,
      metadata: {
        designatedNumber: pb.designatedNumber,
        workDayNumber: workDay.dayNumber,
        slotRecorded,
        workArea: resolvedArea,
        activityName: resolvedActivity,
      },
    });

    return NextResponse.json({
      success: true,
      slotRecorded,
      message: `✓ Successfully recorded ${slotRecorded}!`,
      data: {
        designatedNumber: pb.designatedNumber,
        fullName: pb.beneficiary.fullName,
        barangay: normalizeBarangayName(pb.beneficiary.barangay),
        sitio: pb.beneficiary.sitio,
        tableNumber: pb.tableNumber,
        dayNumber: workDay.dayNumber,
        workDate: workDay.workDate,
        workArea: resolvedArea,
        activityName: resolvedActivity,
        morningTimeIn: record.morningTimeIn,
        morningTimeOut: record.morningTimeOut,
        afternoonTimeIn: record.afternoonTimeIn,
        afternoonTimeOut: record.afternoonTimeOut,
      },
    });
  } catch (error: any) {
    console.error("Attendance scan error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
