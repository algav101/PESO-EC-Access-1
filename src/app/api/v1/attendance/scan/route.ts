export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { format } from "date-fns";
import { normalizeBarangayName } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    // Strategy 2: Case-insensitive substring
    if (!pb) {
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
    const isNumericSlot = /^\d+$/.test(cleanToken);
    if (!pb && isNumericSlot) {
      const slotNum = String(parseInt(cleanToken, 10));
      const whereClause: any = { designatedNumber: slotNum, participationStatus: "ACTIVE" };
      if (programIdParam) whereClause.programId = programIdParam;

      pb = await prisma.programBeneficiary.findFirst({
        where: whereClause,
        orderBy: { createdAt: "desc" },
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
        orderBy: { createdAt: "desc" },
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

    // Resolve WorkDay
    const dateStr = targetDate || format(new Date(), "yyyy-MM-dd");
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

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const timeDecimal = currentHour + currentMinute / 60;

    // Determine target slot
    let targetSlot: "MORNING_IN" | "MORNING_OUT" | "AFTERNOON_IN" | "AFTERNOON_OUT" = "MORNING_IN";
    if (shiftMode === "MORNING_IN") targetSlot = "MORNING_IN";
    else if (shiftMode === "MORNING_OUT") targetSlot = "MORNING_OUT";
    else if (shiftMode === "AFTERNOON_IN") targetSlot = "AFTERNOON_IN";
    else if (shiftMode === "AFTERNOON_OUT") targetSlot = "AFTERNOON_OUT";
    else {
      // AUTO detection by time
      if (timeDecimal < 11.5) targetSlot = "MORNING_IN";
      else if (timeDecimal < 12.8) targetSlot = "MORNING_OUT";
      else if (timeDecimal < 15.5) targetSlot = "AFTERNOON_IN";
      else targetSlot = "AFTERNOON_OUT";
    }

    const slotLabels: Record<string, string> = {
      MORNING_IN: "Morning Time-In (AM IN)",
      MORNING_OUT: "Morning Time-Out (AM OUT)",
      AFTERNOON_IN: "Afternoon Time-In (PM IN)",
      AFTERNOON_OUT: "Afternoon Time-Out (PM OUT)",
    };

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

    // Sequence check within day: Cannot scan Time-Out before Time-In!
    if (targetSlot === "MORNING_OUT" && !record?.morningTimeIn) {
      return NextResponse.json(
        {
          error: `CANNOT RECORD TIME-OUT: Morning Time-In (AM IN) has not been recorded yet for #${pb.designatedNumber}. Please scan AM IN first.`,
          stepBlocked: "TIME_IN_REQUIRED",
        },
        { status: 400 }
      );
    }

    if (targetSlot === "AFTERNOON_OUT" && !record?.afternoonTimeIn) {
      return NextResponse.json(
        {
          error: `CANNOT RECORD TIME-OUT: Afternoon Time-In (PM IN) has not been recorded yet for #${pb.designatedNumber}. Please scan PM IN first.`,
          stepBlocked: "TIME_IN_REQUIRED",
        },
        { status: 400 }
      );
    }

    // Record or update attendance
    const slotRecorded = slotLabels[targetSlot];

    if (!record) {
      record = await prisma.attendanceRecord.create({
        data: {
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
    } else {
      const updateData: any = {};
      if (resolvedItemId && !record.workProgramItemId) updateData.workProgramItemId = resolvedItemId;
      if (resolvedArea && !record.workArea) updateData.workArea = resolvedArea;
      if (resolvedActivity && !record.activityName) updateData.activityName = resolvedActivity;

      if (targetSlot === "MORNING_IN") updateData.morningTimeIn = now;
      else if (targetSlot === "MORNING_OUT") updateData.morningTimeOut = now;
      else if (targetSlot === "AFTERNOON_IN") updateData.afternoonTimeIn = now;
      else if (targetSlot === "AFTERNOON_OUT") updateData.afternoonTimeOut = now;

      record = await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: updateData,
      });
    }

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
