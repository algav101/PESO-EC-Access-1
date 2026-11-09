import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  generateAttendanceExcel,
  generateAccomplishmentExcel,
  generateWorkProgramExcel,
  generateOrientationExcel,
  generatePayoutExcel,
  generateFlaggedReplacementsExcel,
} from "@/lib/excel-exporter";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
      if (!hasPermission(user.role, "report.export")) {
        return NextResponse.json({ error: "Your role is not allowed to export this report." }, { status: 403 });
      }
      const buffer = await generateAccomplishmentExcel(programId, { approvedPhotosOnly: user.role === "DOLE_COORDINATOR" });
      // A streamed response avoids the hosting limit on buffered photo-heavy downloads.
      let offset = 0;
      const stream = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (offset >= buffer.length) { controller.close(); return; }
          const end = Math.min(offset + 256 * 1024, buffer.length);
          controller.enqueue(new Uint8Array(buffer.subarray(offset, end)));
          offset = end;
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="TUPAD_Accomplishment_Report_Dingalan_${programId.slice(0, 6)}.xlsx"`,
          "Cache-Control": "private, no-store",
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
    } else if (reportType === "ORIENTATION") {
      const buffer = await generateOrientationExcel(programId);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="TUPAD_Orientation_Stubs_Dingalan_${programId.slice(0, 6)}.xlsx"`,
        },
      });
    } else if (reportType === "PAYOUT") {
      const buffer = await generatePayoutExcel(programId);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="TUPAD_Payout_Verification_Dingalan_${programId.slice(0, 6)}.xlsx"`,
        },
      });
    } else if (reportType === "FLAGGED_REPLACEMENTS" || reportType === "REPLACEMENTS") {
      const buffer = await generateFlaggedReplacementsExcel(programId);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="TUPAD_Flagged_Replacements_Masterlist_Dingalan_${programId.slice(0, 6)}.xlsx"`,
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
