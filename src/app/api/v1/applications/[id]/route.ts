export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { isIntakeSource, REVIEW_STATUSES } from "@/lib/application-workflow";

const details = {
  encodedBy: { select: { id: true, fullName: true } },
  documents: { select: { id: true, fieldName: true, subject: true, fileName: true, mimeType: true, createdAt: true }, orderBy: { createdAt: "desc" as const } },
};

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser(request);
  if (!isAdminUser(user)) return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
  try {
    const application = await prisma.tupadApplicationRoster.findUnique({ where: { id: params.id }, include: details });
    if (!application || !isIntakeSource(application.source) || application.submissionStatus !== "SUBMITTED") return NextResponse.json({ error: "Submitted application not found." }, { status: 404 });
    return NextResponse.json({ application }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to load the application." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser(request);
  if (!user || !isAdminUser(user)) return NextResponse.json({ error: "Forbidden: Admin review access required." }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const status = body?.status, remarks = typeof body?.remarks === "string" ? body.remarks.trim() : "";
  const expectedUpdatedAt = typeof body?.updatedAt === "string" ? new Date(body.updatedAt) : null;
  if (!["QUEUED", "INCOMPLETE"].includes(status) || !expectedUpdatedAt || Number.isNaN(expectedUpdatedAt.getTime()) || remarks.length > 2000 || (status === "INCOMPLETE" && !remarks)) {
    return NextResponse.json({ error: "Choose a review result, provide the record version, and describe any missing requirements (maximum 2,000 characters)." }, { status: 400 });
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.tupadApplicationRoster.findUnique({ where: { id: params.id } });
      if (!existing || !isIntakeSource(existing.source) || existing.submissionStatus !== "SUBMITTED") return "NOT_FOUND" as const;
      // Final program decisions cannot be changed through an intake review.
      if (!REVIEW_STATUSES.includes(existing.status as typeof REVIEW_STATUSES[number])) return "CONFLICT" as const;
      const changed = await tx.tupadApplicationRoster.updateMany({
        where: { id: existing.id, updatedAt: expectedUpdatedAt, submissionStatus: "SUBMITTED", status: existing.status },
        data: { status, remarks: remarks || null },
      });
      if (changed.count !== 1) return "CONFLICT" as const;
      await tx.auditLog.create({ data: {
        userId: user.id, action: "APPLICATION_ADMIN_REVIEWED", entityType: "TupadApplicationRoster", entityId: existing.id,
        oldData: JSON.stringify({ status: existing.status, remarks: existing.remarks }),
        newData: JSON.stringify({ status, remarks: remarks || null }),
        metadata: JSON.stringify({ source: existing.source, reviewerName: user.fullName }),
      } });
      return await tx.tupadApplicationRoster.findUnique({ where: { id: existing.id }, include: details });
    });
    if (result === "NOT_FOUND") return NextResponse.json({ error: "Submitted application not found." }, { status: 404 });
    if (result === "CONFLICT") return NextResponse.json({ error: "This record changed or has a final decision. Refresh before reviewing." }, { status: 409 });
    return NextResponse.json({ success: true, application: result });
  } catch {
    return NextResponse.json({ error: "Review was not saved. Please retry." }, { status: 500 });
  }
}
