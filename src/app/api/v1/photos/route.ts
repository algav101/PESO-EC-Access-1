export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, isAdminUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { normalizeBarangayName } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");
    const barangay = searchParams.get("barangay");
    const includeData = searchParams.get("includeData") === "true";

    const whereClause: any = {};
    if (programId) whereClause.programId = programId;

    // Strict Barangay-level isolation:
    const userBrgy = user.assignedBarangay ? normalizeBarangayName(user.assignedBarangay) : null;
    const queryBrgy = barangay && barangay !== "ALL" ? normalizeBarangayName(barangay) : null;
    const effectiveBrgy = (!isAdminUser(user) && userBrgy) ? userBrgy : queryBrgy;

    if (effectiveBrgy) {
      whereClause.barangay = { contains: effectiveBrgy, mode: "insensitive" };
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
    const user = await getCurrentUser(request);
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
      (!isAdminUser(user) && user.assignedBarangay)
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
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ids, status, rejectionReason, isExported, photoStage, specificActivity } = body;

    // Check permissions
    if (status) {
      if (!hasPermission(user.role, "photo.approve") && !isAdminUser(user)) {
        return NextResponse.json({ error: "Forbidden: insufficient permissions to review photos" }, { status: 403 });
      }
    }

    const canUpdatePhoto =
      isAdminUser(user) ||
      hasPermission(user.role, "photo.update") ||
      hasPermission(user.role, "photo.upload") ||
      hasPermission(user.role, "photo.read");

    if (!canUpdatePhoto && !status) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions to update photos" }, { status: 403 });
    }

    const formatWithStage = (
      currentText: string | null | undefined,
      targetStage: string,
      overrideText?: string | null
    ) => {
      const textToUse = overrideText !== undefined && overrideText !== null ? overrideText : (currentText || "Emergency Employment Field Work");
      const base = textToUse
        .replace(/^\[(BEFORE|DURING|AFTER)\]\s*/i, "")
        .replace(/^(BEFORE|DURING|AFTER)[:\-]\s*/i, "")
        .trim();
      return `[${targetStage.toUpperCase()}] ${base || "Emergency Employment Field Work"}`;
    };

    // 1. Batch Phase / Status Update
    if (ids && Array.isArray(ids) && ids.length > 0) {
      const targetStage = photoStage ? photoStage.toUpperCase() : null;
      if (targetStage && !["BEFORE", "DURING", "AFTER"].includes(targetStage)) {
        return NextResponse.json({ error: "Invalid photoStage. Must be BEFORE, DURING, or AFTER" }, { status: 400 });
      }

      const existingPhotos = await prisma.accomplishmentPhoto.findMany({
        where: { id: { in: ids } },
        select: { id: true, specificActivity: true, barangay: true, uploadedById: true },
      });

      if (existingPhotos.length === 0) {
        return NextResponse.json({ error: "No matching photos found" }, { status: 404 });
      }

      const updateOps = existingPhotos.map((p) => {
        const updateData: any = {};
        if (targetStage) {
          updateData.specificActivity = formatWithStage(p.specificActivity, targetStage);
        }
        if (status) {
          updateData.status = status;
          updateData.rejectionReason = status === "REJECTED" ? rejectionReason : null;
          updateData.approvedById = status === "APPROVED" ? user.id : null;
          updateData.approvedAt = status === "APPROVED" ? new Date() : null;
        }
        return prisma.accomplishmentPhoto.update({
          where: { id: p.id },
          data: updateData,
        });
      });

      await prisma.$transaction(updateOps);

      await logAudit({
        userId: user.id,
        action: targetStage ? "PHOTO_BATCH_PHASE_CORRECTED" : "PHOTO_BATCH_UPDATED",
        entityType: "ACCOMPLISHMENT_PHOTO",
        metadata: {
          count: existingPhotos.length,
          newPhase: targetStage,
          status,
          ids,
          updatedBy: user.fullName || user.username,
        },
      });

      return NextResponse.json({
        success: true,
        count: existingPhotos.length,
        photoStage: targetStage,
      });
    }

    // 2. Single Photo Update
    if (!id) {
      return NextResponse.json({ error: "Valid photo ID or IDs array is required" }, { status: 400 });
    }

    const existingPhoto = await prisma.accomplishmentPhoto.findUnique({
      where: { id },
    });
    if (!existingPhoto) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (photoStage) {
      const normStage = photoStage.toUpperCase();
      if (!["BEFORE", "DURING", "AFTER"].includes(normStage)) {
        return NextResponse.json({ error: "Invalid photoStage. Must be BEFORE, DURING, or AFTER" }, { status: 400 });
      }
      updateData.specificActivity = formatWithStage(existingPhoto.specificActivity, normStage, specificActivity);
    } else if (specificActivity !== undefined) {
      updateData.specificActivity = specificActivity;
    }

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
      action: photoStage ? "PHOTO_PHASE_CORRECTED" : status === "APPROVED" ? "PHOTO_APPROVED" : "PHOTO_UPDATED",
      entityType: "ACCOMPLISHMENT_PHOTO",
      entityId: photo.id,
      metadata: {
        photoId: photo.id,
        newPhase: photoStage ? photoStage.toUpperCase() : undefined,
        previousActivity: existingPhoto.specificActivity,
        newActivity: updateData.specificActivity,
        status,
        updatedBy: user.fullName || user.username,
      },
    });

    return NextResponse.json({
      success: true,
      photo: {
        ...photo,
        imageUrl: `/api/v1/photos/${photo.id}/image`,
        hasImage: true,
        photoStage: photoStage ? photoStage.toUpperCase() : undefined,
      },
    });
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
