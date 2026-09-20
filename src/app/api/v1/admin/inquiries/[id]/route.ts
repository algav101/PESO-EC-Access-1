export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || (!isAdminUser(user) && !hasPermission(user.role, "audit.read"))) {
      return NextResponse.json({ error: "Forbidden: Domain Master or PESO Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { status, adminRemarks, adminReply } = body;

    const data: any = {};
    if (status !== undefined) data.status = status;
    if (adminRemarks !== undefined) data.adminRemarks = adminRemarks;
    if (adminReply !== undefined) {
      data.adminReply = adminReply;
      data.repliedAt = new Date();
      data.repliedById = user.id;
      if (status === undefined) data.status = "REPLIED";
    }

    const updated = await prisma.publicInquiryMessage.update({
      where: { id: params.id },
      data,
    });

    await logAudit({
      userId: user.id,
      action: "PUBLIC_INQUIRY_UPDATED",
      entityType: "PUBLIC_INQUIRY_MESSAGE",
      entityId: updated.id,
      metadata: { trackingCode: updated.trackingCode, status: updated.status },
    });

    return NextResponse.json({ success: true, message: updated });
  } catch (error: any) {
    console.error("PATCH /admin/inquiries/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || (!isAdminUser(user) && !hasPermission(user.role, "audit.read"))) {
      return NextResponse.json({ error: "Forbidden: Domain Master or PESO Admin access required" }, { status: 403 });
    }

    await prisma.publicInquiryMessage.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Inquiry message deleted." });
  } catch (error: any) {
    console.error("DELETE /admin/inquiries/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
