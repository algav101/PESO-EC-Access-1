import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "PESO_ADMIN") {
      return NextResponse.json({ error: "Forbidden: PESO Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const barangay = searchParams.get("barangay") || "ALL";
    const status = searchParams.get("status") || "ALL";

    const where: any = {};
    if (barangay !== "ALL") where.barangay = barangay;
    if (status !== "ALL") where.status = status;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { contactNumber: { contains: search } },
        { idNumber: { contains: search } },
      ];
    }

    const [applicants, totalCount, incompleteCount, queuedCount] = await Promise.all([
      prisma.tupadApplicationRoster.findMany({
        where,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        take: 500,
      }),
      prisma.tupadApplicationRoster.count(),
      prisma.tupadApplicationRoster.count({ where: { status: "INCOMPLETE" } }),
      prisma.tupadApplicationRoster.count({ where: { status: "QUEUED" } }),
    ]);

    return NextResponse.json({
      applicants,
      totalCount,
      incompleteCount,
      queuedCount,
    });
  } catch (error: any) {
    console.error("GET /applications error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "PESO_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.tupadApplicationRoster.deleteMany({});
    return NextResponse.json({ success: true, message: "Cleared all uploaded application roster records." });
  } catch (error: any) {
    console.error("DELETE /applications error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
