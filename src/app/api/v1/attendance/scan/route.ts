import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { format } from "date-fns";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { qrToken, workDayId, targetDate, shiftMode = "AUTO", deviceId, workProgramItemId, workArea, activityName } = await request.json();
    if (!qrToken) return NextResponse.json({ error: "QR Token is required" }, { status: 400 });

    let qr = await prisma.qrCode.findUnique({
      where: { publicToken: qrToken.trim() },
      include: {
        programBeneficiary: {
          include: {
            beneficiary: true,
            program: {
              include: {
                workDays: { orderBy: { dayNumber: "asc" } },
                tupadWorkPrograms: {
                  include: {
                    items: { orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }] },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!qr) {
      return NextResponse.json({ error: "Invalid QR Code" }, { status: 404 });
    }

    // Resolve current active ProgramBeneficiary for this designated number
    let pb = qr.programBeneficiary;
    if (!pb || pb.participationStatus === "REPLACED") {
      const activePb = await prisma.programBeneficiary.findFirst({
        where: {
          programId: qr.programId,
          designatedNumber: pb?.designatedNumber,
          participationStatus: "ACTIVE",
        },
        include: {
          beneficiary: true,
          program: {
            include: {
              workDays: { orderBy: { dayNumber: "asc" } },
              tupadWorkPrograms: {
                include: {
                  items: { orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }] },
                },
              },
            },
          },
        },
      });
      if (activePb) {
        pb = activePb;
        // Re-bind and heal QR code in database
        await prisma.qrCode.update({
          where: { id: qr.id },
          data: {
            programBeneficiaryId: activePb.id,
            status: "ACTIVE",
          },
        });
      }
    } else if (qr.status !== "ACTIVE") {
      // Auto-heal status
      await prisma.qrCode.update({
        where: { id: qr.id },
        data: { status: "ACTIVE" },
      });
    }

    const program = pb.program;

    // Find WorkDay: either by explicit ID or match today's date or pick latest scheduled/active day
    const dateStr = targetDate || format(new Date(), "yyyy-MM-dd");
    let workDay = workDayId
      ? program.workDays.find((w) => w.id === workDayId)
      : program.workDays.find((w) => w.workDate === dateStr) || program.workDays[0];

    if (!workDay) {
      return NextResponse.json({ error: "No active work day found for this program" }, { status: 400 });
    }

    // Resolve Work Program Item / Area for this Beneficiary on this Work Day
    const beneBrgy = (pb.beneficiary.barangay || "").toUpperCase();
    const beneSitio = (pb.beneficiary.sitio || "").toUpperCase();

    const matchingWorkProgram = program.tupadWorkPrograms.find(
      (wp) => wp.barangay.toUpperCase() === beneBrgy || wp.projectLocation?.toUpperCase() === beneBrgy
    );

    const dayItems = matchingWorkProgram
      ? matchingWorkProgram.items.filter((it) => it.dayNumber === workDay.dayNumber)
      : [];

    let resolvedItemId = workProgramItemId || null;
    let resolvedArea = workArea || null;
    let resolvedActivity = activityName || null;
    let targetItem = null;

    if (resolvedItemId) {
      targetItem = dayItems.find((it) => it.id === resolvedItemId);
      if (targetItem) {
        resolvedArea = targetItem.area;
        resolvedActivity = targetItem.specificActivities;
      }
    } else if (dayItems.length > 0) {
      // Try to find item matching beneficiary's sitio/purok
      if (beneSitio) {
        targetItem = dayItems.find((it) => it.area.toUpperCase().includes(beneSitio));
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

    // Calculate current scanned tally for this Work Area / Day
    const areaScannedCount = resolvedItemId
      ? await prisma.attendanceRecord.count({
          where: {
            programId: program.id,
            workDayId: workDay.id,
            workProgramItemId: resolvedItemId,
          },
        })
      : 0;

    // Find or create Attendance Record for this beneficiary & workday
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

    let slotRecorded = "";
    let isDuplicate = false;

    if (!record) {
      // Create new record
      let morningIn: Date | null = null;
      let morningOut: Date | null = null;
      let afternoonIn: Date | null = null;
      let afternoonOut: Date | null = null;

      if (shiftMode === "MORNING_IN" || (shiftMode === "AUTO" && timeDecimal < 11.5)) {
        morningIn = now;
        slotRecorded = "Morning Time-In (AM IN)";
      } else if (shiftMode === "MORNING_OUT" || (shiftMode === "AUTO" && timeDecimal >= 11.5 && timeDecimal < 12.8)) {
        morningOut = now;
        slotRecorded = "Morning Time-Out (AM OUT)";
      } else if (shiftMode === "AFTERNOON_IN" || (shiftMode === "AUTO" && timeDecimal >= 12.8 && timeDecimal < 15.5)) {
        afternoonIn = now;
        slotRecorded = "Afternoon Time-In (PM IN)";
      } else {
        afternoonOut = now;
        slotRecorded = "Afternoon Time-Out (PM OUT)";
      }

      record = await prisma.attendanceRecord.create({
        data: {
          programId: program.id,
          workDayId: workDay.id,
          programBeneficiaryId: pb.id,
          attendanceDate: workDay.workDate,
          morningTimeIn: morningIn,
          morningTimeOut: morningOut,
          afternoonTimeIn: afternoonIn,
          afternoonTimeOut: afternoonOut,
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
      // Update existing record with appropriate slot
      const updateData: any = {};
      if (resolvedItemId && !record.workProgramItemId) updateData.workProgramItemId = resolvedItemId;
      if (resolvedArea && !record.workArea) updateData.workArea = resolvedArea;
      if (resolvedActivity && !record.activityName) updateData.activityName = resolvedActivity;

      if (shiftMode === "MORNING_IN") {
        if (record.morningTimeIn) isDuplicate = true;
        else { updateData.morningTimeIn = now; slotRecorded = "Morning Time-In (AM IN)"; }
      } else if (shiftMode === "MORNING_OUT") {
        if (record.morningTimeOut) isDuplicate = true;
        else { updateData.morningTimeOut = now; slotRecorded = "Morning Time-Out (AM OUT)"; }
      } else if (shiftMode === "AFTERNOON_IN") {
        if (record.afternoonTimeIn) isDuplicate = true;
        else { updateData.afternoonTimeIn = now; slotRecorded = "Afternoon Time-In (PM IN)"; }
      } else if (shiftMode === "AFTERNOON_OUT") {
        if (record.afternoonTimeOut) isDuplicate = true;
        else { updateData.afternoonTimeOut = now; slotRecorded = "Afternoon Time-Out (PM OUT)"; }
      } else {
        // AUTO detection
        if (timeDecimal < 11.5) {
          if (!record.morningTimeIn) { updateData.morningTimeIn = now; slotRecorded = "Morning Time-In (AM IN)"; }
          else isDuplicate = true;
        } else if (timeDecimal < 12.8) {
          if (!record.morningTimeOut) { updateData.morningTimeOut = now; slotRecorded = "Morning Time-Out (AM OUT)"; }
          else isDuplicate = true;
        } else if (timeDecimal < 15.5) {
          if (!record.afternoonTimeIn) { updateData.afternoonTimeIn = now; slotRecorded = "Afternoon Time-In (PM IN)"; }
          else isDuplicate = true;
        } else {
          if (!record.afternoonTimeOut) { updateData.afternoonTimeOut = now; slotRecorded = "Afternoon Time-Out (PM OUT)"; }
          else isDuplicate = true;
        }
      }

      if (Object.keys(updateData).length > 0) {
        record = await prisma.attendanceRecord.update({
          where: { id: record.id },
          data: updateData,
        });
      }
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
        isDuplicate,
        workArea: resolvedArea,
        activityName: resolvedActivity,
      },
    });

    return NextResponse.json({
      success: true,
      isDuplicate,
      slotRecorded: slotRecorded || "Already logged",
      message: isDuplicate
        ? `Attendance for this session has already been recorded.`
        : `Successfully recorded ${slotRecorded}!`,
      data: {
        designatedNumber: pb.designatedNumber,
        fullName: pb.beneficiary.fullName,
        barangay: pb.beneficiary.barangay,
        sitio: pb.beneficiary.sitio,
        tableNumber: pb.tableNumber,
        dayNumber: workDay.dayNumber,
        workDate: workDay.workDate,
        workArea: resolvedArea,
        activityName: resolvedActivity,
        areaTargetCapacity: targetItem?.totalCount || 0,
        areaScannedCount: areaScannedCount + (isDuplicate ? 0 : 1),
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
