import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, isAdminUser, hasPermission } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (!isAdminUser(user) && !hasPermission(user.role, "inquiry.read") && !hasPermission(user.role, "audit.read"))) {
      return NextResponse.json({ error: "Forbidden: Authorized access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ALL";
    const category = searchParams.get("category") || "ALL";
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (status !== "ALL") where.status = status;
    if (category !== "ALL") where.category = category;
    if (search) {
      where.OR = [
        { trackingCode: { contains: search, mode: "insensitive" } },
        { senderName: { contains: search, mode: "insensitive" } },
        { senderContact: { contains: search } },
        { message: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
      ];
    }

    const [messages, unreadCount, totalCount] = await Promise.all([
      prisma.publicInquiryMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.publicInquiryMessage.count({ where: { status: "UNREAD" } }),
      prisma.publicInquiryMessage.count(),
    ]);

    return NextResponse.json({
      messages,
      unreadCount,
      totalCount,
    });
  } catch (error: any) {
    console.error("GET /admin/inquiries error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
