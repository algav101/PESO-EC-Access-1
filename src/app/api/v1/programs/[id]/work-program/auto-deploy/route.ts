export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  DINGALAN_BARANGAY_GROUPINGS,
  getBarangayKey,
  getStandardBarangayName,
  classifyBeneficiaryGroup,
  computeGroupDemographics,
} from "@/lib/dingalan-groupings";

const DEFAULT_10_DAY_ACTIVITIES = [
  { day: 1, activity: "Orientation, PPE Distribution & Area Assessment; Initial Clearing of Public Pathways and Road Shoulders" },
  { day: 2, activity: "Vegetation Trimming, Grass Cutting & Debris Removal along Main Thoroughfares and Drainage Canals" },
  { day: 3, activity: "Desilting and De-clogging of Drainage Channels, Culverts and Water Outlets" },
  { day: 4, activity: "Waste Segregation, Collection of Solid Waste & Community Recycling Drive" },
  { day: 5, activity: "Mid-Term Progress Inspection, Tools Maintenance, and Coastal / Riverbank Cleanup Activities" },
  { day: 6, activity: "Tree Planting, Mangrove Rehabilitation & Community Nursery Maintenance" },
  { day: 7, activity: "Disinfection and Sanitization of Public Markets, Barangay Covered Courts & Health Centers" },
  { day: 8, activity: "Repair and Whitewashing of Public Street Curbs, Guardrails and Community Fences" },
  { day: 9, activity: "Final Community Sweep, Hazardous Material Removal & Consolidation of Waste Disposal" },
  { day: 10, activity: "Accomplishment Documentation, Handover of Cleared Zones to Barangay Council & Completion Briefing" },
];

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || (!hasPermission(user.role, "program.update") && !hasPermission(user.role, "program.create"))) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { barangay: targetBarangay } = await request.json().catch(() => ({}));

    // 1. Fetch program
    const program = await prisma.program.findUnique({
      where: { id: params.id },
      include: {
        programBeneficiaries: {
          where: { participationStatus: { not: "REPLACED" } },
          include: { beneficiary: true },
        },
        tupadWorkPrograms: {
          include: { items: { orderBy: { orderIndex: "asc" } } },
        },
      },
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    // 2. Group beneficiaries by standard Barangay
    const beneficiariesByBrgy: Record<string, any[]> = {};

    for (const pb of program.programBeneficiaries) {
      const rawBrgy = pb.beneficiary?.barangay || "Paltic";
      const stdBrgy = getStandardBarangayName(rawBrgy);
      if (!beneficiariesByBrgy[stdBrgy]) {
        beneficiariesByBrgy[stdBrgy] = [];
      }
      beneficiariesByBrgy[stdBrgy].push(pb);
    }

    const targetBarangays = targetBarangay && targetBarangay !== "ALL"
      ? [getStandardBarangayName(targetBarangay)]
      : Object.keys(beneficiariesByBrgy).length > 0
      ? Object.keys(beneficiariesByBrgy)
      : Object.values(DINGALAN_BARANGAY_GROUPINGS).map((c) => c.barangay);

    let totalDeployedBarangays = 0;
    let totalDeployedActivities = 0;

    for (const brgyName of targetBarangays) {
      const bKey = getBarangayKey(brgyName);
      const config = DINGALAN_BARANGAY_GROUPINGS[bKey];
      const brgyBeneficiaries = beneficiariesByBrgy[brgyName] || [];

      // Group beneficiaries within this barangay
      const groupBeneficiariesMap: Record<string, any[]> = {};
      if (config) {
        for (const g of config.groups) {
          groupBeneficiariesMap[g.groupName] = [];
        }
      }

      for (const pb of brgyBeneficiaries) {
        const classification = classifyBeneficiaryGroup(brgyName, pb.beneficiary?.sitio || "");
        if (!groupBeneficiariesMap[classification.groupName]) {
          groupBeneficiariesMap[classification.groupName] = [];
        }
        groupBeneficiariesMap[classification.groupName].push(pb);
      }

      // Check if existing TupadWorkProgram exists
      const existingWp = program.tupadWorkPrograms.find((w) => w.barangay === brgyName);
      let workProgramId: string;

      if (!existingWp) {
        const createdWp = await prisma.tupadWorkProgram.create({
          data: {
            programId: params.id,
            barangay: brgyName,
            projectLocation: brgyName,
            beneficiaryCount: brgyBeneficiaries.length,
            natureOfWork: "Environmental Cleaning, Waste Management, Pathway Clearing & Community Greening",
            workingHours: "Not Exceed Eight (8) Hours a day (8:00 AM–12:00 NN; 1:00 PM–5:00 PM)",
          },
        });
        workProgramId = createdWp.id;
      } else {
        workProgramId = existingWp.id;
        await prisma.tupadWorkProgram.update({
          where: { id: workProgramId },
          data: { beneficiaryCount: brgyBeneficiaries.length },
        });
        // Delete old items to rebuild with revised groups
        await prisma.tupadWorkProgramItem.deleteMany({
          where: { workProgramId },
        });
      }

      // Build Day 1 to 10 activities for each group in this barangay
      const itemsToInsert: any[] = [];
      let orderIndex = 0;

      const definedGroups = config?.groups || [
        {
          groupName: `${brgyName.toUpperCase()} GROUP 1`,
          groupLabel: `${brgyName} Group 1`,
          designatedMainArea: "Designated Barangay Work Zones",
          purokSitios: [],
        },
      ];

      for (let day = 1; day <= 10; day++) {
        // Check if existing work program had an activity description for this day
        const existingDayItem = existingWp?.items.find((it) => it.dayNumber === day);
        const defaultDayObj = DEFAULT_10_DAY_ACTIVITIES.find((d) => d.day === day);
        const specificActivities =
          existingDayItem?.specificActivities ||
          defaultDayObj?.activity ||
          `Day ${day} Community Environmental Maintenance & Road Clearing`;

        for (const group of definedGroups) {
          const groupBenes = groupBeneficiariesMap[group.groupName] || [];
          const demographics = computeGroupDemographics(groupBenes);

          // Area format combining Group Label and Designated Main Area
          const area = `${group.groupLabel}: ${group.designatedMainArea}`;

          itemsToInsert.push({
            workProgramId,
            dayNumber: day,
            specificActivities,
            area,
            maleCount: demographics.maleCount,
            femaleCount: demographics.femaleCount,
            scPwdMaleCount: demographics.scPwdMaleCount,
            scPwdFemaleCount: demographics.scPwdFemaleCount,
            totalCount: demographics.totalCount,
            orderIndex: orderIndex++,
          });
        }
      }

      if (itemsToInsert.length > 0) {
        await prisma.tupadWorkProgramItem.createMany({
          data: itemsToInsert,
        });
        totalDeployedBarangays++;
        totalDeployedActivities += itemsToInsert.length;
      }
    }

    await logAudit({
      userId: user.id,
      action: "WORK_PROGRAM_REVISED_DEPLOYMENT",
      entityType: "PROGRAM",
      entityId: params.id,
      metadata: {
        barangays: targetBarangays,
        totalActivities: totalDeployedActivities,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully revised & deployed TUPAD Work Program across ${totalDeployedBarangays} Barangays with ${totalDeployedActivities} group activities according to the official Purok & Sitio matrix.`,
      deployedBarangays: totalDeployedBarangays,
      deployedActivities: totalDeployedActivities,
    });
  } catch (error: any) {
    console.error("Auto-deploy work program error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
