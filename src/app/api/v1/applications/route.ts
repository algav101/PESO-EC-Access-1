export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, isAdminUser, hasPermission } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (!isAdminUser(user) && !hasPermission(user.role, "program.read") && !hasPermission(user.role, "application.read"))) {
      return NextResponse.json({ error: "Forbidden: Authorized access required" }, { status: 403 });
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
      ];
    }

    const applications = await prisma.tupadApplicationRoster.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const counts = {
      total: await prisma.tupadApplicationRoster.count(),
      approved: await prisma.tupadApplicationRoster.count({ where: { status: "APPROVED" } }),
      pending: await prisma.tupadApplicationRoster.count({ where: { status: "PENDING" } }),
      ineligible: await prisma.tupadApplicationRoster.count({ where: { status: "INELIGIBLE" } }),
    };

    return NextResponse.json({ success: true, applications, counts });
  } catch (error: any) {
    console.error("GET /applications error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (!isAdminUser(user) && !hasPermission(user.role, "program.delete"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.tupadApplicationRoster.deleteMany({});
    return NextResponse.json({ success: true, message: "Cleared all uploaded application roster records." });
  } catch (error: any) {
    console.error("DELETE /applications error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
