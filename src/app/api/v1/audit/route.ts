import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Strict Authorization: Only DOMAIN_MASTER and PESO_ADMIN can view audit logs
    if (!isAdminUser(user) && !hasPermission(user.role, "audit.read")) {
      return NextResponse.json(
        { error: "Forbidden. System audit trail viewing is strictly restricted to Domain Master and PESO Dingalan Admin Officers." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const entityType = searchParams.get("entityType");

    const whereClause: any = {};
    if (action) whereClause.action = action;
    if (entityType) whereClause.entityType = entityType;

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        user: { select: { fullName: true, username: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error("GET audit logs error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
