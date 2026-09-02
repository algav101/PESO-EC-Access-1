import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
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
    if (barangay) whereClause.barangay = barangay;

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
      workProgramItemId,
      barangay,
      sitio,
      workArea,
      specificActivity,
      fileKey = `photo_${Date.now()}`,
      fileName = "accomplishment_photo.jpg",
      latitude,
      longitude,
      capturedAt,
    } = body;

    if (!programId || !barangay) {
      return NextResponse.json({ error: "Program and Barangay are required" }, { status: 400 });
    }

    const photo = await prisma.accomplishmentPhoto.create({
      data: {
        programId,
        workDayId,
        workProgramItemId,
        barangay,
        sitio,
        workArea: workArea || sitio,
        specificActivity,
        fileKey,
        fileName,
        latitude: latitude ? Number(latitude) : 15.3941,
        longitude: longitude ? Number(longitude) : 121.3965,
        capturedAt: capturedAt ? new Date(capturedAt) : new Date(),
        uploadedById: user.id,
        status: user.role === "PESO_ADMIN" ? "APPROVED" : "FOR_REVIEW",
        approvedById: user.role === "PESO_ADMIN" ? user.id : null,
        approvedAt: user.role === "PESO_ADMIN" ? new Date() : null,
      },
    });

    await logAudit({
      userId: user.id,
      action: "PHOTO_UPLOADED",
      entityType: "ACCOMPLISHMENT_PHOTO",
      entityId: photo.id,
      metadata: { barangay, latitude, longitude },
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

    const { id, status, rejectionReason } = await request.json();

    if (!id || !["APPROVED", "REJECTED", "FOR_REVIEW"].includes(status)) {
      return NextResponse.json({ error: "Valid photo ID and status are required" }, { status: 400 });
    }

    const photo = await prisma.accomplishmentPhoto.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === "REJECTED" ? rejectionReason : null,
        approvedById: status === "APPROVED" ? user.id : null,
        approvedAt: status === "APPROVED" ? new Date() : null,
      },
    });

    await logAudit({
      userId: user.id,
      action: status === "APPROVED" ? "PHOTO_APPROVED" : "PHOTO_REJECTED",
      entityType: "ACCOMPLISHMENT_PHOTO",
      entityId: photo.id,
      metadata: { status, rejectionReason },
    });

    return NextResponse.json({ success: true, photo });
  } catch (error: any) {
    console.error("PATCH photos error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
