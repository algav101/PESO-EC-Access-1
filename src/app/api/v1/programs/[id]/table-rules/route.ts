export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const rules = await prisma.tableAssignmentRule.findMany({
      where: { programId: params.id },
      orderBy: { startNumber: "asc" },
    });

    // Also calculate actual assigned beneficiary count for each rule
    const beneficiaries = await prisma.programBeneficiary.findMany({
      where: { programId: params.id },
      select: { designatedNumber: true, tableNumber: true },
    });

    const enrichedRules = rules.map((r) => {
      const capacity = Math.max(0, r.endNumber - r.startNumber + 1);
      const actualAssigned = beneficiaries.filter((b) => {
        const num = parseInt(b.designatedNumber, 10);
        return !isNaN(num) && num >= r.startNumber && num <= r.endNumber;
      }).length;

      return {
        ...r,
        equivalentBeneficiaryCount: capacity,
        actualAssignedCount: actualAssigned,
      };
    });

    return NextResponse.json({ rules: enrichedRules, totalBeneficiaries: beneficiaries.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "stub.configure")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();

    // Check if batch configuration was submitted
    if (Array.isArray(body.rules)) {
      const { rules } = body;

      const validRules = rules
        .map((r: any, i: number) => ({
          programId: params.id,
          startNumber: Number(r.startNumber),
          endNumber: Number(r.endNumber),
          tableNumber: String(r.tableNumber ?? "").trim(),
          slotGroup: r.slotGroup?.trim() || `Slot Group ${i + 1}`,
          priority: i,
        }))
        .filter(
          (r: any) =>
            !isNaN(r.startNumber) &&
            !isNaN(r.endNumber) &&
            Boolean(r.tableNumber)
        );

      await prisma.$transaction(
        async (tx) => {
          // Remove existing rules for program
          await tx.tableAssignmentRule.deleteMany({
            where: { programId: params.id },
          });

          // Insert new rules in a single batch query
          if (validRules.length > 0) {
            await tx.tableAssignmentRule.createMany({
              data: validRules,
            });
          }

          // Order rules by priority desc to match previous behavior
          const freshRules = [...validRules].sort((a, b) => b.priority - a.priority);

          // Fetch only needed fields for re-assignment
          const programBeneficiaries = await tx.programBeneficiary.findMany({
            where: { programId: params.id },
            select: {
              id: true,
              designatedNumber: true,
              tableNumber: true,
              slotGroup: true,
            },
          });

          // Group beneficiary IDs by target (tableNumber, slotGroup) to batch updates
          const updateBuckets = new Map<
            string,
            { tableNumber: string; slotGroup: string; ids: string[] }
          >();

          for (const pb of programBeneficiaries) {
            const num = parseInt(pb.designatedNumber, 10);
            let assignedTable = "Table 1";
            let assignedSlot = "Main Regular";

            if (!isNaN(num)) {
              const matchedRule = freshRules.find(
                (rule) => num >= rule.startNumber && num <= rule.endNumber
              );
              if (matchedRule) {
                assignedTable = matchedRule.tableNumber;
                assignedSlot = matchedRule.slotGroup || assignedSlot;
              } else {
                assignedTable = `Table ${Math.ceil(num / 100)}`;
              }
            }

            if (pb.tableNumber === assignedTable && pb.slotGroup === assignedSlot) {
              continue;
            }

            const bucketKey = `${assignedTable}\0${assignedSlot}`;
            let bucket = updateBuckets.get(bucketKey);
            if (!bucket) {
              bucket = {
                tableNumber: assignedTable,
                slotGroup: assignedSlot,
                ids: [],
              };
              updateBuckets.set(bucketKey, bucket);
            }
            bucket.ids.push(pb.id);
          }

          // Apply batched updateMany per table/slot bucket (few queries instead of 800+)
          for (const bucket of updateBuckets.values()) {
            await tx.programBeneficiary.updateMany({
              where: { id: { in: bucket.ids } },
              data: {
                tableNumber: bucket.tableNumber,
                slotGroup: bucket.slotGroup,
              },
            });
          }
        },
        {
          maxWait: 10000,
          timeout: 30000,
        }
      );

      await logAudit({
        userId: user.id,
        action: "TABLE_RULES_BATCH_CONFIGURED",
        entityType: "PROGRAM",
        entityId: params.id,
        metadata: { ruleCount: body.rules.length },
      });

      return NextResponse.json({ success: true, message: "Table rules batch configured and retroactively applied" });
    }

    // Single rule create
    const { startNumber, endNumber, tableNumber, slotGroup, priority = 0, applyToExisting = true } = body;

    if (startNumber === undefined || endNumber === undefined || !tableNumber) {
      return NextResponse.json({ error: "Start number, end number, and table number are required" }, { status: 400 });
    }

    const start = Number(startNumber);
    const end = Number(endNumber);

    const rule = await prisma.tableAssignmentRule.create({
      data: {
        programId: params.id,
        startNumber: start,
        endNumber: end,
        tableNumber: String(tableNumber).trim(),
        slotGroup: slotGroup?.trim() || `Designated ${start}-${end}`,
        priority: Number(priority),
      },
    });

    if (applyToExisting) {
      const beneficiaries = await prisma.programBeneficiary.findMany({
        where: { programId: params.id },
        select: { id: true, designatedNumber: true },
      });

      const matchingIds: string[] = [];
      for (const pb of beneficiaries) {
        const num = parseInt(pb.designatedNumber, 10);
        if (!isNaN(num) && num >= rule.startNumber && num <= rule.endNumber) {
          matchingIds.push(pb.id);
        }
      }

      if (matchingIds.length > 0) {
        await prisma.programBeneficiary.updateMany({
          where: { id: { in: matchingIds } },
          data: {
            tableNumber: rule.tableNumber,
            slotGroup: rule.slotGroup,
          },
        });
      }
    }

    await logAudit({
      userId: user.id,
      action: "TABLE_RULE_CREATED",
      entityType: "PROGRAM",
      entityId: params.id,
      newData: rule,
    });

    return NextResponse.json({ success: true, rule }, { status: 201 });
  } catch (error: any) {
    console.error("POST table-rules error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "stub.configure")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("ruleId");

    if (!ruleId) {
      return NextResponse.json({ error: "ruleId is required" }, { status: 400 });
    }

    await prisma.tableAssignmentRule.delete({
      where: { id: ruleId },
    });

    await logAudit({
      userId: user.id,
      action: "TABLE_RULE_DELETED",
      entityType: "PROGRAM",
      entityId: params.id,
      metadata: { ruleId },
    });

    return NextResponse.json({ success: true, message: "Table rule deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
