export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, isAdminUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");
    const barangay = searchParams.get("barangay");

    const whereClause: any = {};
    if (programId) whereClause.programId = programId;

    // Enforce coordinator / assisting documentor barangay scope
    if ((user.role === "TUPAD_COORDINATOR" || user.role === "TUPAD_ASSISTING_DOCUMENTOR") && user.assignedBarangay) {
      whereClause.barangay = user.assignedBarangay;
    } else if (barangay && barangay !== "ALL") {
      whereClause.barangay = barangay;
    }

    // DOLE coordinator sees only approved photos
    if (user.role === "DOLE_COORDINATOR") {
      whereClause.status = "APPROVED";
    }

    const photos = await prisma.accomplishmentPhoto.findMany({
      where: whereClause,
      include: {
        program: true,
        workDay: true,
        workProgramItem: true,
        uploadedBy: { select: { fullName: true } },
        approvedBy: { select: { fullName: true } },
      },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json({ photos });
  } catch (error: any) {
    console.error("GET photos error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "photo.upload")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const {
      programId,
      workDayId,
      workDayNumber,
      workProgramItemId,
      barangay,
      sitio,
      workArea,
      specificActivity,
      photoData,
      fileKey,
      fileName = "accomplishment_photo.jpg",
      latitude,
      longitude,
      capturedAt,
    } = body;

    const actualBarangay =
      (user.role === "TUPAD_COORDINATOR" || user.role === "TUPAD_ASSISTING_DOCUMENTOR") && user.assignedBarangay
        ? user.assignedBarangay
        : barangay;

    if (!programId || !actualBarangay) {
      return NextResponse.json({ error: "Program and Barangay are required" }, { status: 400 });
    }

    // If workDayId is not given but workDayNumber is provided, resolve workDay
    let resolvedWorkDayId = workDayId || null;
    if (!resolvedWorkDayId && workDayNumber) {
      const wd = await prisma.workDay.findFirst({
        where: { programId, dayNumber: Number(workDayNumber) },
      });
      if (wd) resolvedWorkDayId = wd.id;
    }

    const finalFileKey = photoData || fileKey || `photo_${Date.now()}`;

    const photo = await prisma.accomplishmentPhoto.create({
      data: {
        programId,
        workDayId: resolvedWorkDayId,
        workProgramItemId: workProgramItemId || null,
        barangay: actualBarangay,
        sitio: sitio || null,
        workArea: workArea || sitio || null,
        specificActivity: specificActivity || null,
        fileKey: finalFileKey,
        fileName,
        latitude: latitude ? Number(latitude) : 15.3941,
        longitude: longitude ? Number(longitude) : 121.3965,
        capturedAt: capturedAt ? new Date(capturedAt) : new Date(),
        uploadedById: user.id,
        status: isAdminUser(user) ? "APPROVED" : "FOR_REVIEW",
        approvedById: isAdminUser(user) ? user.id : null,
        approvedAt: isAdminUser(user) ? new Date() : null,
      },
    });

    await logAudit({
      userId: user.id,
      action: "PHOTO_UPLOADED",
      entityType: "ACCOMPLISHMENT_PHOTO",
      entityId: photo.id,
      metadata: { barangay: actualBarangay, latitude, longitude, specificActivity },
    });

    return NextResponse.json({ success: true, photo }, { status: 201 });
  } catch (error: any) {
    console.error("POST photos error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "photo.approve")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { id, status, rejectionReason, isExported } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Valid photo ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (status) {
      if (!["APPROVED", "REJECTED", "FOR_REVIEW"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updateData.status = status;
      updateData.rejectionReason = status === "REJECTED" ? rejectionReason : null;
      updateData.approvedById = status === "APPROVED" ? user.id : null;
      updateData.approvedAt = status === "APPROVED" ? new Date() : null;
    }
    if (isExported !== undefined) {
      updateData.isExported = Boolean(isExported);
    }

    const photo = await prisma.accomplishmentPhoto.update({
      where: { id },
      data: updateData,
    });

    await logAudit({
      userId: user.id,
      action: status === "APPROVED" ? "PHOTO_APPROVED" : "PHOTO_UPDATED",
      entityType: "ACCOMPLISHMENT_PHOTO",
      entityId: photo.id,
      metadata: { status, rejectionReason, isExported },
    });

    return NextResponse.json({ success: true, photo });
  } catch (error: any) {
    console.error("PATCH photos error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (!isAdminUser(user) && !hasPermission(user.role, "photo.reject"))) {
      return NextResponse.json({ error: "Forbidden: Only Domain Master and PESO Admins can purge photo data" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const idsParam = searchParams.get("ids");
    const programId = searchParams.get("programId");
    const barangay = searchParams.get("barangay");
    const status = searchParams.get("status");

    let deletedCount = 0;

    if (id) {
      const photo = await prisma.accomplishmentPhoto.delete({
        where: { id },
      });
      deletedCount = 1;

      await logAudit({
        userId: user.id,
        action: "PHOTO_PURGED",
        entityType: "ACCOMPLISHMENT_PHOTO",
        entityId: id,
        metadata: { photoId: id, fileName: photo.fileName, barangay: photo.barangay },
      });
    } else if (idsParam) {
      const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
      const result = await prisma.accomplishmentPhoto.deleteMany({
        where: { id: { in: ids } },
      });
      deletedCount = result.count;

      await logAudit({
        userId: user.id,
        action: "PHOTO_BATCH_PURGED",
        entityType: "ACCOMPLISHMENT_PHOTO",
        metadata: { count: deletedCount, idsCount: ids.length },
      });
    } else if (programId) {
      const whereClause: any = { programId };
      if (barangay && barangay !== "ALL") whereClause.barangay = barangay;
      if (status && status !== "ALL") whereClause.status = status;

      const result = await prisma.accomplishmentPhoto.deleteMany({
        where: whereClause,
      });
      deletedCount = result.count;

      await logAudit({
        userId: user.id,
        action: "PHOTO_PROGRAM_PURGED",
        entityType: "ACCOMPLISHMENT_PHOTO",
        metadata: { count: deletedCount, programId, barangay, status },
      });
    } else {
      return NextResponse.json({ error: "Missing required parameters (id, ids, or programId)" }, { status: 400 });
    }

    return NextResponse.json({ success: true, count: deletedCount });
  } catch (error: any) {
    console.error("DELETE photos error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
