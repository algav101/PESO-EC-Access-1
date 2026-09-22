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
        { error: "Forbidden: Work program is strictly in view-only mode for field coordinators. Only PESO Admins can perform batch modifications." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, itemIds, updates, groupName, area, specificActivities } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: "itemIds array is required and cannot be empty" }, { status: 400 });
    }

    if (action === "DELETE") {
      await prisma.tupadWorkProgramItem.deleteMany({
        where: { id: { in: itemIds } },
      });

      await logAudit({
        userId: user.id,
        action: "TUPAD_WORK_PROGRAM_BATCH_DELETE",
        entityType: "WORK_PROGRAM_ITEM",
        metadata: { deletedCount: itemIds.length, itemIds },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${itemIds.length} activities`,
        count: itemIds.length,
      });
    }

    if (action === "UPDATE") {
      const dataToUpdate: any = {};
      if (specificActivities !== undefined && specificActivities.trim() !== "") {
        dataToUpdate.specificActivities = specificActivities.trim();
      }
      if (area !== undefined && area.trim() !== "") {
        dataToUpdate.area = area.trim();
      }
      if (updates?.maleCount !== undefined) {
        dataToUpdate.maleCount = parseInt(updates.maleCount, 10);
      }
      if (updates?.femaleCount !== undefined) {
        dataToUpdate.femaleCount = parseInt(updates.femaleCount, 10);
      }
      if (updates?.scPwdMaleCount !== undefined) {
        dataToUpdate.scPwdMaleCount = parseInt(updates.scPwdMaleCount, 10);
      }
      if (updates?.scPwdFemaleCount !== undefined) {
        dataToUpdate.scPwdFemaleCount = parseInt(updates.scPwdFemaleCount, 10);
      }
      if (updates?.totalCount !== undefined) {
        dataToUpdate.totalCount = parseInt(updates.totalCount, 10);
      }

      await prisma.tupadWorkProgramItem.updateMany({
        where: { id: { in: itemIds } },
        data: dataToUpdate,
      });

      await logAudit({
        userId: user.id,
        action: "TUPAD_WORK_PROGRAM_BATCH_UPDATE",
        entityType: "WORK_PROGRAM_ITEM",
        metadata: { updatedCount: itemIds.length, itemIds, dataToUpdate, groupName },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully updated ${itemIds.length} activities with new area and activity details`,
        count: itemIds.length,
      });
    }

    return NextResponse.json({ error: "Invalid action. Supported actions: UPDATE, DELETE" }, { status: 400 });
  } catch (error: any) {
    console.error("Batch work program update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
