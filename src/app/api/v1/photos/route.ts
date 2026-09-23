export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, isAdminUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { normalizeBarangayName } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");
    const barangay = searchParams.get("barangay");
    const includeData = searchParams.get("includeData") === "true";

    const whereClause: any = {};
    if (programId) whereClause.programId = programId;

    // Enforce coordinator / assisting documentor barangay scope
    if ((user.role === "TUPAD_COORDINATOR" || user.role === "TUPAD_ASSISTING_DOCUMENTOR") && user.assignedBarangay) {
      const canonicalBrgy = normalizeBarangayName(user.assignedBarangay);
      whereClause.barangay = { contains: canonicalBrgy, mode: "insensitive" };
    } else if (barangay && barangay !== "ALL") {
      const canonicalBrgy = normalizeBarangayName(barangay);
      whereClause.barangay = { contains: canonicalBrgy, mode: "insensitive" };
    }

    // DOLE coordinator sees only approved photos
    if (user.role === "DOLE_COORDINATOR") {
      whereClause.status = "APPROVED";
    }

    const rawPhotos = await prisma.accomplishmentPhoto.findMany({
      where: whereClause,
      select: {
        id: true,
        programId: true,
        workDayId: true,
        workProgramItemId: true,
        barangay: true,
        sitio: true,
        workArea: true,
        specificActivity: true,
        fileName: true,
        latitude: true,
        longitude: true,
        capturedAt: true,
        uploadedAt: true,
        uploadedById: true,
        status: true,
        isExported: true,
        isPurged: true,
        approvedById: true,
        approvedAt: true,
        rejectionReason: true,
        fileKey: includeData, // Only load full multi-MB base64 data if explicitly requested
        program: {
          select: {
            id: true,
            programCode: true,
            programName: true,
          },
        },
        workDay: {
          select: {
            id: true,
            dayNumber: true,
            workDate: true,
          },
        },
        workProgramItem: {
          select: {
            id: true,
            dayNumber: true,
            specificActivities: true,
            area: true,
          },
        },
        uploadedBy: { select: { fullName: true } },
        approvedBy: { select: { fullName: true } },
      },
      orderBy: { uploadedAt: "desc" },
    });

    const photos = rawPhotos.map((p) => ({
      ...p,
      imageUrl: `/api/v1/photos/${p.id}/image`,
      hasImage: true,
    }));

    return NextResponse.json({ photos, total: photos.length });
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

    const rawBarangay =
      (user.role === "TUPAD_COORDINATOR" || user.role === "TUPAD_ASSISTING_DOCUMENTOR") && user.assignedBarangay
        ? user.assignedBarangay
        : barangay;

    if (!programId || !rawBarangay) {
      return NextResponse.json({ error: "Program and Barangay are required" }, { status: 400 });
    }

    const actualBarangay = normalizeBarangayName(rawBarangay);

    // If workDayId is not given or is a client placeholder, resolve real workDay
    let resolvedWorkDayId: string | null = null;
    if (workDayId && !String(workDayId).startsWith("WD-") && String(workDayId).length > 10) {
      const wdExists = await prisma.workDay.findUnique({ where: { id: workDayId } });
      if (wdExists) resolvedWorkDayId = wdExists.id;
    }

    if (!resolvedWorkDayId && (workDayNumber || workDayId)) {
      const dayNum = Number(workDayNumber || String(workDayId).replace("WD-", ""));
      if (!isNaN(dayNum) && dayNum > 0) {
        const wd = await prisma.workDay.findFirst({
          where: { programId, dayNumber: dayNum },
        });
        if (wd) resolvedWorkDayId = wd.id;
      }
    }

    // Validate workProgramItemId if provided to prevent Foreign Key constraint crash
    let validWorkProgramItemId: string | null = null;
    if (workProgramItemId && workProgramItemId !== "AUTO" && !String(workProgramItemId).startsWith("WP-")) {
      try {
        const itemExists = await prisma.tupadWorkProgramItem.findUnique({
          where: { id: workProgramItemId },
        });
        if (itemExists) {
          validWorkProgramItemId = itemExists.id;
        }
      } catch (err) {
        console.warn("Invalid workProgramItemId format, falling back to null:", workProgramItemId);
      }
    }

    const finalFileKey = photoData || fileKey || `photo_${Date.now()}`;

    const photo = await prisma.accomplishmentPhoto.create({
      data: {
        programId,
        workDayId: resolvedWorkDayId,
        workProgramItemId: validWorkProgramItemId,
        barangay: actualBarangay,
        sitio: sitio || null,
        workArea: workArea || sitio || null,
        specificActivity: specificActivity || null,
        fileKey: finalFileKey,
        fileName,
        latitude: latitude ? Number(latitude) : 15.3941,
        longitude: longitude ? Number(longitude) : 121.3965,
        capturedAt: capturedAt ? new Date(capturedAt) : new Date(),
        uploadedById: (isAdminUser(user) && body.uploadedById) ? body.uploadedById : user.id,
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
      metadata: {
        barangay: actualBarangay,
        latitude,
        longitude,
        specificActivity,
        workDayNumber: workDayNumber || null,
        uploadedById: photo.uploadedById,
        documentedByName: body.documentedByName || null,
      },
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
