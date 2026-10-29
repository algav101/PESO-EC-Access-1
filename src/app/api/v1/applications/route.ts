export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, isAdminUser, hasPermission } from "@/lib/auth";
import { removeApplicationDocuments } from "@/lib/application-storage";
import type { Prisma } from "@prisma/client";
import { isIntakeSource, REVIEW_STATUSES } from "@/lib/application-workflow";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Forbidden: Authorized access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const barangay = searchParams.get("barangay") || "ALL";
    const status = searchParams.get("status") || "ALL";
    const source = searchParams.get("source") || "IMPORT";
    if (source !== "IMPORT" && !isIntakeSource(source)) return NextResponse.json({ error: "Invalid application source." }, { status: 400 });
    if (isIntakeSource(source) ? !isAdminUser(user) : !hasPermission(user.role, "application.read")) {
      return NextResponse.json({ error: "Forbidden: Admin review access required." }, { status: 403 });
    }
    if (status !== "ALL" && ![...REVIEW_STATUSES, "APPROVED", "DISQUALIFIED"].includes(status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    const requestedPage = Number(searchParams.get("page"));
    const page = Number.isFinite(requestedPage) ? Math.max(1, Math.min(100000, Math.floor(requestedPage))) : 1;
    const pageSize = isIntakeSource(source) ? 25 : 500;

    const scope: Prisma.TupadApplicationRosterWhereInput = { source, submissionStatus: "SUBMITTED" };
    const where: Prisma.TupadApplicationRosterWhereInput = { ...scope };
    if (barangay !== "ALL") where.barangay = barangay;
    if (status !== "ALL") where.status = status;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { contactNumber: { contains: search } },
        { idNumber: { contains: search, mode: "insensitive" } },
        { applicationCode: { contains: search, mode: "insensitive" } },
      ];
    }

    const applications = await prisma.tupadApplicationRoster.findMany({
      where,
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      ...(isIntakeSource(source) ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
      include: {
        encodedBy: { select: { id: true, fullName: true } },
        documents: {
          select: { id: true, fieldName: true, subject: true, fileName: true, mimeType: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const counts = {
      total: await prisma.tupadApplicationRoster.count({ where: scope }),
      pending: await prisma.tupadApplicationRoster.count({ where: { ...scope, status: "PENDING_REVIEW" } }),
      queued: await prisma.tupadApplicationRoster.count({ where: { ...scope, status: "QUEUED" } }),
      incomplete: await prisma.tupadApplicationRoster.count({ where: { ...scope, status: "INCOMPLETE" } }),
    };
    const filteredCount = await prisma.tupadApplicationRoster.count({ where });

    return NextResponse.json({
      success: true,
      applications,
      applicants: applications,
      counts,
      filteredCount, page, pageSize,
      totalCount: counts.total,
      queuedCount: counts.queued,
      incompleteCount: counts.incomplete,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: any) {
    console.error("GET /applications error:", error);
    return NextResponse.json({ error: "Unable to load applications. Check the application database setup." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const documents = await prisma.tupadApplicationDocument.findMany({
      where: { application: { source: "IMPORT" } },
      select: { storageBucket: true, storageKey: true },
    });
    if (documents.length) {
      await removeApplicationDocuments(documents.map((document) => ({ bucket: document.storageBucket, key: document.storageKey })));
    }
    await prisma.tupadApplicationRoster.deleteMany({ where: { source: "IMPORT" } });
    return NextResponse.json({ success: true, message: "Cleared all uploaded application roster records." });
  } catch (error: any) {
    console.error("DELETE /applications error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
