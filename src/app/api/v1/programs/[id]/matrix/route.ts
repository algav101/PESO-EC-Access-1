export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const programId = params.id;
    const { searchParams } = new URL(request.url);
    const barangay = searchParams.get("barangay");

    // 1. Fetch Program & WorkDays
    const program = await prisma.program.findUnique({
      where: { id: programId },
      select: {
        id: true,
        programCode: true,
        programName: true,
        requiredWorkDays: true,
        status: true,
        workDays: {
          select: {
            id: true,
            dayNumber: true,
            workDate: true,
            status: true,
          },
          orderBy: { dayNumber: "asc" },
        },
      },
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    // 2. Fetch Beneficiaries with Attendance Records (Streamlined for fast rendering)
    const whereClause: any = {
      programId,
      participationStatus: { not: "REPLACED" },
    };

    // Coordinator / Assisting Documentor barangay isolation
    if ((user.role === "TUPAD_COORDINATOR" || user.role === "TUPAD_ASSISTING_DOCUMENTOR") && user.assignedBarangay) {
      whereClause.beneficiary = { barangay: user.assignedBarangay };
    } else if (barangay && barangay !== "ALL") {
      whereClause.beneficiary = { barangay };
    }

    const beneficiaries = await prisma.programBeneficiary.findMany({
      where: whereClause,
      select: {
        id: true,
        designatedNumber: true,
        tableNumber: true,
        participationStatus: true,
        beneficiary: {
          select: {
            id: true,
            fullName: true,
            barangay: true,
            sitio: true,
          },
        },
        attendanceRecords: {
          select: {
            id: true,
            workDayId: true,
            attendanceDate: true,
            morningTimeIn: true,
            morningTimeOut: true,
            afternoonTimeIn: true,
            afternoonTimeOut: true,
            status: true,
          },
        },
      },
    });

    // Natural sort by designatedNumber
    beneficiaries.sort((a, b) => {
      const numA = parseInt(a.designatedNumber, 10);
      const numB = parseInt(b.designatedNumber, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return String(a.designatedNumber).localeCompare(String(b.designatedNumber), undefined, { numeric: true });
    });

    return NextResponse.json({
      program,
      beneficiaries,
      totalBeneficiaries: beneficiaries.length,
    });
  } catch (error: any) {
    console.error("GET /api/v1/programs/[id]/matrix error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
