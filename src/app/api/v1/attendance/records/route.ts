import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");
    const workDayId = searchParams.get("workDayId");
    const barangay = searchParams.get("barangay");

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    const whereClause: any = { programId };
    if (workDayId) whereClause.workDayId = workDayId;
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
