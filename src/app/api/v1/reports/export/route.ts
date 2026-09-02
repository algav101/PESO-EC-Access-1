import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateAttendanceExcel, generateAccomplishmentExcel, generateWorkProgramExcel } from "@/lib/excel-exporter";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type"); // ATTENDANCE, ACCOMPLISHMENT, WORK_PROGRAM, ORIENTATION, PAYOUT
    const programId = searchParams.get("programId");

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    if (reportType === "ATTENDANCE") {
      const buffer = await generateAttendanceExcel(programId);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="TUPAD_Attendance_Dingalan_${programId.slice(0, 6)}.xlsx"`,
        },
      });
    } else if (reportType === "ACCOMPLISHMENT") {
      const buffer = await generateAccomplishmentExcel(programId);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="TUPAD_Accomplishment_Report_Dingalan_${programId.slice(0, 6)}.xlsx"`,
        },
      });
    } else if (reportType === "WORK_PROGRAM") {
      const buffer = await generateWorkProgramExcel(programId);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="TUPAD_10Day_Work_Program_Dingalan_${programId.slice(0, 6)}.xlsx"`,
        },
      });
    } else {
      return NextResponse.json({ error: "Unsupported report type for direct export" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Report export error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
