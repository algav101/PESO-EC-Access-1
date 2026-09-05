import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, isAdminUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");
    const workDayId = searchParams.get("workDayId");
    const programBeneficiaryId = searchParams.get("programBeneficiaryId");
    const barangay = searchParams.get("barangay");

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    const whereClause: any = { programId };
    if (workDayId) whereClause.workDayId = workDayId;
    if (programBeneficiaryId) whereClause.programBeneficiaryId = programBeneficiaryId;
    if (barangay) whereClause.programBeneficiary = { beneficiary: { barangay } };

    const records = await prisma.attendanceRecord.findMany({
      where: whereClause,
      include: {
        workDay: true,
        programBeneficiary: {
          include: { beneficiary: true },
        },
        scannedBy: { select: { fullName: true } },
      },
      orderBy: [
        { workDay: { dayNumber: "asc" } },
        { programBeneficiary: { designatedNumber: "asc" } },
      ],
    });

    return NextResponse.json({ records });
  } catch (error: any) {
    console.error("GET attendance records error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (!isAdminUser(user) && !hasPermission(user.role, "attendance.correct"))) {
      return NextResponse.json(
        { error: "Forbidden: Only Domain Master and PESO Admin can manually edit or reset daily attendance." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      programBeneficiaryId,
      programId,
      workDayId,
      workDayNumber,
      action = "UPDATE", // "UPDATE" | "RESET_DAY" | "RESET_ALL"
      morningTimeIn,
      morningTimeOut,
      afternoonTimeIn,
      afternoonTimeOut,
      status = "PRESENT",
      remarks,
    } = body;

    if (!programBeneficiaryId) {
      return NextResponse.json({ error: "programBeneficiaryId is required" }, { status: 400 });
    }

    const pb = await prisma.programBeneficiary.findUnique({
      where: { id: programBeneficiaryId },
      include: {
        beneficiary: true,
        program: {
          include: { workDays: { orderBy: { dayNumber: "asc" } } },
        },
      },
    });

    if (!pb) {
      return NextResponse.json({ error: "Beneficiary not found" }, { status: 404 });
    }

    const prog = pb.program;

    // ACTION: RESET ALL DAYS FOR BENEFICIARY
    if (action === "RESET_ALL") {
      const deletedCount = await prisma.attendanceRecord.deleteMany({
        where: {
          programId: prog.id,
          programBeneficiaryId: pb.id,
        },
      });

      await logAudit({
        userId: user.id,
        action: "ATTENDANCE_RESET_ALL",
        entityType: "PROGRAM_BENEFICIARY",
        entityId: pb.id,
        metadata: {
          designatedNumber: pb.designatedNumber,
          fullName: pb.beneficiary.fullName,
          deletedRecordsCount: deletedCount.count,
          remarks: remarks || "PESO Admin reset all 10 days of attendance",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully reset all attendance records for #${pb.designatedNumber} (${pb.beneficiary.fullName}). QR codes can now be re-scanned.`,
      });
    }

    // Resolve specific Work Day
    let targetWorkDay = null;
    if (workDayId) {
      targetWorkDay = prog.workDays.find((w) => w.id === workDayId);
    } else if (workDayNumber) {
      targetWorkDay = prog.workDays.find((w) => w.dayNumber === parseInt(workDayNumber, 10));
    }

    if (!targetWorkDay) {
      return NextResponse.json({ error: "Target work day not found in this program" }, { status: 400 });
    }

    // ACTION: RESET SINGLE WORK DAY ATTENDANCE
    if (action === "RESET_DAY") {
      await prisma.attendanceRecord.deleteMany({
        where: {
          programId: prog.id,
          workDayId: targetWorkDay.id,
          programBeneficiaryId: pb.id,
        },
      });

      await logAudit({
        userId: user.id,
        action: "ATTENDANCE_RESET_DAY",
        entityType: "ATTENDANCE_RECORD",
        entityId: `${pb.id}_Day${targetWorkDay.dayNumber}`,
        metadata: {
          designatedNumber: pb.designatedNumber,
          fullName: pb.beneficiary.fullName,
          dayNumber: targetWorkDay.dayNumber,
          workDate: targetWorkDay.workDate,
          remarks: remarks || "PESO Admin reset day attendance to allow re-scanning",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully reset Day ${targetWorkDay.dayNumber} attendance for #${pb.designatedNumber} (${pb.beneficiary.fullName}). All 4 slots can now be re-scanned.`,
        dayNumber: targetWorkDay.dayNumber,
      });
    }

    // ACTION: UPDATE / MANUAL OVERRIDE DAY ATTENDANCE
    const now = new Date();
    const parseTimeOrNull = (val: any) => {
      if (!val) return null;
      if (val === true) return now;
      if (val instanceof Date) return val;
      const parsed = new Date(val);
      return isNaN(parsed.getTime()) ? now : parsed;
    };

    const record = await prisma.attendanceRecord.upsert({
      where: {
        programId_workDayId_programBeneficiaryId: {
          programId: prog.id,
          workDayId: targetWorkDay.id,
          programBeneficiaryId: pb.id,
        },
      },
      update: {
        morningTimeIn: parseTimeOrNull(morningTimeIn),
        morningTimeOut: parseTimeOrNull(morningTimeOut),
        afternoonTimeIn: parseTimeOrNull(afternoonTimeIn),
        afternoonTimeOut: parseTimeOrNull(afternoonTimeOut),
        status,
        source: "MANUAL_ADMIN",
      },
      create: {
        programId: prog.id,
        workDayId: targetWorkDay.id,
        programBeneficiaryId: pb.id,
        attendanceDate: targetWorkDay.workDate,
        morningTimeIn: parseTimeOrNull(morningTimeIn),
        morningTimeOut: parseTimeOrNull(morningTimeOut),
        afternoonTimeIn: parseTimeOrNull(afternoonTimeIn),
        afternoonTimeOut: parseTimeOrNull(afternoonTimeOut),
        status,
        source: "MANUAL_ADMIN",
        scannedById: user.id,
        deviceId: "ADMIN_CONSOLE",
      },
      include: {
        workDay: true,
      },
    });

    await logAudit({
      userId: user.id,
      action: "ATTENDANCE_MANUAL_OVERRIDE",
      entityType: "ATTENDANCE_RECORD",
      entityId: record.id,
      metadata: {
        designatedNumber: pb.designatedNumber,
        fullName: pb.beneficiary.fullName,
        dayNumber: targetWorkDay.dayNumber,
        status,
        morningTimeIn: !!record.morningTimeIn,
        morningTimeOut: !!record.morningTimeOut,
        afternoonTimeIn: !!record.afternoonTimeIn,
        afternoonTimeOut: !!record.afternoonTimeOut,
        remarks,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully updated Day ${targetWorkDay.dayNumber} attendance for #${pb.designatedNumber} (${pb.beneficiary.fullName}).`,
      record,
    });
  } catch (error: any) {
    console.error("PATCH attendance record error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
