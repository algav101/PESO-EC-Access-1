import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const barangay = searchParams.get("barangay");
    const dayNumber = searchParams.get("dayNumber");

    const whereClause: any = { programId: params.id };
    if (user.role === "TUPAD_COORDINATOR" && user.assignedBarangay) {
      whereClause.barangay = { contains: user.assignedBarangay };
    } else if (barangay) {
      whereClause.barangay = { contains: barangay };
    }

    const workPrograms = await prisma.tupadWorkProgram.findMany({
      where: whereClause,
      include: {
        items: {
          where: dayNumber ? { dayNumber: parseInt(dayNumber, 10) } : undefined,
          orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }],
        },
      },
      orderBy: { barangay: "asc" },
    });

    return NextResponse.json({ success: true, workPrograms });
  } catch (error: any) {
    console.error("Fetch work programs error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminUser(user) && !hasPermission(user.role, "program.update")) {
      return NextResponse.json({ error: "Forbidden: Only Domain Master and PESO Admins can modify work plan activities" }, { status: 403 });
    }

    const body = await request.json();
    const { workProgramId, dayNumber, specificActivities, area, maleCount, femaleCount, scPwdMaleCount, scPwdFemaleCount, totalCount } = body;

    if (!workProgramId || !dayNumber || !specificActivities || !area) {
      return NextResponse.json({ error: "Missing required fields for work program item" }, { status: 400 });
    }

    const item = await prisma.tupadWorkProgramItem.create({
      data: {
        workProgramId,
        dayNumber: parseInt(dayNumber, 10),
        specificActivities,
        area,
        maleCount: parseInt(maleCount, 10) || 0,
        femaleCount: parseInt(femaleCount, 10) || 0,
        scPwdMaleCount: parseInt(scPwdMaleCount, 10) || 0,
        scPwdFemaleCount: parseInt(scPwdFemaleCount, 10) || 0,
        totalCount: parseInt(totalCount, 10) || (parseInt(maleCount, 10) || 0) + (parseInt(femaleCount, 10) || 0),
      },
    });

    await logAudit({
      userId: user.id,
      action: "TUPAD_WORK_PROGRAM_ITEM_CREATED",
      entityType: "WORK_PROGRAM_ITEM",
      entityId: item.id,
      metadata: { dayNumber, area, specificActivities },
    });

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    console.error("Create work program item error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminUser(user) && !hasPermission(user.role, "program.update")) {
      return NextResponse.json({ error: "Forbidden: Only Domain Master and PESO Admins can edit work plan activities" }, { status: 403 });
    }

    const body = await request.json();
    const { id, specificActivities, area, maleCount, femaleCount, scPwdMaleCount, scPwdFemaleCount, totalCount } = body;

    if (!id) {
      return NextResponse.json({ error: "Item id is required" }, { status: 400 });
    }

    const updated = await prisma.tupadWorkProgramItem.update({
      where: { id },
      data: {
        specificActivities,
        area,
        maleCount: maleCount !== undefined ? parseInt(maleCount, 10) : undefined,
        femaleCount: femaleCount !== undefined ? parseInt(femaleCount, 10) : undefined,
        scPwdMaleCount: scPwdMaleCount !== undefined ? parseInt(scPwdMaleCount, 10) : undefined,
        scPwdFemaleCount: scPwdFemaleCount !== undefined ? parseInt(scPwdFemaleCount, 10) : undefined,
        totalCount: totalCount !== undefined ? parseInt(totalCount, 10) : undefined,
      },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    console.error("Update work program item error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminUser(user) && !hasPermission(user.role, "program.update")) {
      return NextResponse.json({ error: "Forbidden: Only Domain Master and PESO Admins can delete work plan activities" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    await prisma.tupadWorkProgramItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete work program item error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
