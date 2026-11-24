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
import { logAudit } from "@/lib/audit";
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
      const buffer = await generateAccomplishmentExcel(programId, { approvedPhotosOnly: false });
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

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const reportType = body?.type;
    const programId = body?.programId;

    if (reportType !== "ACCOMPLISHMENT") {
      return NextResponse.json({ error: "Unsupported report type for POST export" }, { status: 400 });
    }
    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }
    if (!hasPermission(user.role, "report.export")) {
      return NextResponse.json({ error: "Your role is not allowed to export this report." }, { status: 403 });
    }

    const selectedBarangays: string[] | undefined = Array.isArray(body.selectedBarangays)
      ? body.selectedBarangays.map((b: unknown) => String(b || "").trim()).filter(Boolean)
      : undefined;

    if (selectedBarangays && selectedBarangays.length === 0) {
      return NextResponse.json({ error: "Please select at least one barangay to export." }, { status: 400 });
    }

    const selectedPhotos = Array.isArray(body.selectedPhotos) ? body.selectedPhotos : undefined;
    const barangayEdits =
      body.barangayEdits && typeof body.barangayEdits === "object" ? body.barangayEdits : undefined;
    const layout = body.layout && typeof body.layout === "object" ? body.layout : undefined;

    const programMeta = await prisma.program.findUnique({
      where: { id: programId },
      select: { programCode: true },
    });
    if (!programMeta) {
      return NextResponse.json({ error: "Selected program not found." }, { status: 404 });
    }

    const buffer = await generateAccomplishmentExcel(programId, {
      approvedPhotosOnly: false,
      selectedBarangays,
      selectedPhotos,
      barangayEdits,
      layout,
    });

    await logAudit({
      userId: user.id,
      action: "ACCOMPLISHMENT_REPORT_EXPORTED",
      entityType: "PROGRAM",
      entityId: programId,
      metadata: {
        programCode: programMeta.programCode,
        selectedBarangays: selectedBarangays || "ALL_11",
        selectedPhotoCount: selectedPhotos ? selectedPhotos.length : "AUTO",
      },
    });

    const safeCode = (programMeta.programCode || programId.slice(0, 6)).replace(/[^A-Za-z0-9_-]/g, "_");
    const brgySuffix =
      selectedBarangays && selectedBarangays.length === 1
        ? `_${selectedBarangays[0].replace(/[^A-Za-z0-9_-]/g, "_")}`
        : selectedBarangays && selectedBarangays.length < 11
          ? `_${selectedBarangays.length}Brgys`
          : "";

    let offset = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset >= buffer.length) {
          controller.close();
          return;
        }
        const end = Math.min(offset + 256 * 1024, buffer.length);
        controller.enqueue(new Uint8Array(buffer.subarray(offset, end)));
        offset = end;
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="TUPAD_Accomplishment_Report_${safeCode}${brgySuffix}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: any) {
    console.error("POST Report export error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate accomplishment report" }, { status: 500 });
  }
}
