export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser, hasPermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminUser(user)) {
      return NextResponse.json(
        { error: "Forbidden: Work program is strictly in view-only mode for field coordinators. Only PESO Admins can sync groupings." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      barangay,
      groupName,
      groupLabel,
      designatedArea,
      specificActivities,
      targetDays = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      demographics = {},
    } = body;

    if (!barangay || !designatedArea || !specificActivities) {
      return NextResponse.json(
        { error: "barangay, designatedArea, and specificActivities are required" },
        { status: 400 }
      );
    }

    // 1. Find or create the TupadWorkProgram header for this barangay
    let workProgram = await prisma.tupadWorkProgram.findFirst({
      where: {
        programId: params.id,
        barangay: { equals: barangay, mode: "insensitive" },
      },
    });

    if (!workProgram) {
      workProgram = await prisma.tupadWorkProgram.create({
        data: {
          programId: params.id,
          barangay: barangay,
          natureOfWork: specificActivities,
          workingHours: "8:00 AM - 12:00 NN | 1:00 PM - 5:00 PM (4 hrs/day)",
          beneficiaryCount: demographics.totalCount || 0,
        },
      });
    }

    const maleCount = parseInt(demographics.maleCount, 10) || 0;
    const femaleCount = parseInt(demographics.femaleCount, 10) || 0;
    const scPwdMaleCount = parseInt(demographics.scPwdMaleCount, 10) || 0;
    const scPwdFemaleCount = parseInt(demographics.scPwdFemaleCount, 10) || 0;
    const totalCount = parseInt(demographics.totalCount, 10) || (maleCount + femaleCount);

    const daysToProcess = Array.isArray(targetDays) && targetDays.length > 0
      ? targetDays
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // 2. Insert or update items for each target day
    for (const dayNum of daysToProcess) {
      // Look for an existing item for this day that matches the group area or specific activity
      const existingItem = await prisma.tupadWorkProgramItem.findFirst({
        where: {
          workProgramId: workProgram.id,
          dayNumber: dayNum,
          OR: [
            { area: { contains: designatedArea, mode: "insensitive" } },
            { area: { contains: groupName || "", mode: "insensitive" } },
            { specificActivities: { contains: specificActivities, mode: "insensitive" } },
          ],
        },
      });

      if (existingItem) {
        await prisma.tupadWorkProgramItem.update({
          where: { id: existingItem.id },
          data: {
            area: designatedArea,
            specificActivities: specificActivities,
            maleCount,
            femaleCount,
            scPwdMaleCount,
            scPwdFemaleCount,
            totalCount,
          },
        });
      } else {
        await prisma.tupadWorkProgramItem.create({
          data: {
            workProgramId: workProgram.id,
            dayNumber: dayNum,
            area: designatedArea,
            specificActivities: specificActivities,
            maleCount,
            femaleCount,
            scPwdMaleCount,
            scPwdFemaleCount,
            totalCount,
          },
        });
      }
    }

    await logAudit({
      userId: user.id,
      action: "TUPAD_WORK_PROGRAM_GROUP_SYNCED",
      entityType: "WORK_PROGRAM",
      entityId: workProgram.id,
      metadata: {
        barangay,
        groupName,
        designatedArea,
        specificActivities,
        targetDays: daysToProcess,
        demographics,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synced grouping "${groupLabel || groupName}" to TUPAD Work Program for ${daysToProcess.length} days!`,
      workProgramId: workProgram.id,
    });
  } catch (error: any) {
    console.error("Sync grouping to work program error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
