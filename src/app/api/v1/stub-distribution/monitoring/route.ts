export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { DINGALAN_BARANGAYS, normalizeBarangayName } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");

    // If no programId provided, find the active or latest program
    let targetProgramId = programId;
    if (!targetProgramId) {
      const latestProg = await prisma.program.findFirst({
        orderBy: { createdAt: "desc" },
      });
      if (!latestProg) {
        return NextResponse.json({ summary: null, barangays: [], beneficiaries: [] });
      }
      targetProgramId = latestProg.id;
    }

    const program = await prisma.program.findUnique({
      where: { id: targetProgramId },
      include: {
        programBarangays: true,
        programBeneficiaries: {
          where: { participationStatus: { not: "REPLACED" } },
          include: {
            beneficiary: true,
            stubDistributions: {
              include: { distributedBy: { select: { fullName: true } } },
              orderBy: { distributedAt: "desc" },
            },
            qrCodes: { where: { status: "ACTIVE" } },
          },
        },
      },
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    const beneficiaries = program.programBeneficiaries;
    const totalBeneficiaries = beneficiaries.length;

    // Canonical Barangay aggregation map initialized with all 11 Dingalan barangays
    const brgyStats: Record<
      string,
      {
        total: number;
        distributed: number;
        confirmed: number;
        pending: number;
        flaggedReplacement: number;
      }
    > = {};

    for (const b of DINGALAN_BARANGAYS) {
      brgyStats[b] = { total: 0, distributed: 0, confirmed: 0, pending: 0, flaggedReplacement: 0 };
    }

    const beneficiaryRoster = beneficiaries.map((pb) => {
      const flaggedDist = pb.stubDistributions?.find((d: any) => d.status === "FLAGGED_REPLACEMENT");
      const distributedDist = pb.stubDistributions?.find((d: any) => d.status === "DISTRIBUTED");

      const isFlagged =
        pb.participationStatus === "FLAGGED_FOR_REPLACEMENT" ||
        Boolean(flaggedDist);

      const isConfirmed = !isFlagged && Boolean(distributedDist);

      let status = "PENDING";
      if (isFlagged) {
        status = "FLAGGED_REPLACEMENT";
      } else if (isConfirmed) {
        status = "CONFIRMED";
      } else {
        status = "PENDING";
      }

      // Normalize barangay name to eliminate case-splitting (e.g. "PALTIC" -> "Paltic", "CARAGSACAN" -> "Caragsacan")
      const normalizedBrgy = normalizeBarangayName(pb.beneficiary.barangay);

      if (!brgyStats[normalizedBrgy]) {
        brgyStats[normalizedBrgy] = { total: 0, distributed: 0, confirmed: 0, pending: 0, flaggedReplacement: 0 };
      }

      brgyStats[normalizedBrgy].total++;
      if (isFlagged) {
        brgyStats[normalizedBrgy].flaggedReplacement++;
      } else if (isConfirmed) {
        brgyStats[normalizedBrgy].confirmed++;
        brgyStats[normalizedBrgy].distributed++;
      }

      const activeDist = isFlagged ? (flaggedDist || distributedDist) : (distributedDist || flaggedDist);

      return {
        id: pb.id,
        designatedNumber: pb.designatedNumber,
        fullName: pb.beneficiary.fullName,
        barangay: normalizedBrgy,
        tableNumber: pb.tableNumber || "Table 1",
        contactNumber: pb.beneficiary.contactNumber || "N/A",
        birthday: pb.beneficiary.birthday,
        status,
        distributedAt: activeDist?.distributedAt || null,
        distributedBy: activeDist?.distributedBy?.fullName || null,
        remarks: activeDist?.remarks || (isFlagged ? "Flagged for onsite replacement" : null),
        qrToken: pb.qrCodes[0]?.publicToken || null,
      };
    });

    // Compute Pending (Uninformed) mathematically: Target - (Confirmed + Flagged for Replacement)
    for (const key of Object.keys(brgyStats)) {
      brgyStats[key].pending = Math.max(
        0,
        brgyStats[key].total - (brgyStats[key].confirmed + brgyStats[key].flaggedReplacement)
      );
    }

    const totalConfirmed = Object.values(brgyStats).reduce((acc, s) => acc + s.confirmed, 0);
    const totalFlaggedReplacement = Object.values(brgyStats).reduce((acc, s) => acc + s.flaggedReplacement, 0);
    const totalDistributed = totalConfirmed;
    const totalPending = Math.max(0, totalBeneficiaries - (totalConfirmed + totalFlaggedReplacement));

    const barangaysBreakdown = Object.entries(brgyStats).map(([name, stats]) => {
      const percentage = stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0;
      let badgeStatus = "NOT_STARTED";
      if (percentage === 100) badgeStatus = "COMPLETED";
      else if (percentage >= 50) badgeStatus = "IN_PROGRESS";
      else if (percentage > 0) badgeStatus = "LAGGING";

      return {
        barangayName: name,
        total: stats.total,
        confirmed: stats.confirmed,
        distributed: stats.distributed,
        pending: stats.pending,
        flaggedReplacement: stats.flaggedReplacement,
        completionPercentage: percentage,
        status: badgeStatus,
      };
    });

    // Natural sort roster by designated slot number
    beneficiaryRoster.sort((a, b) => parseInt(a.designatedNumber, 10) - parseInt(b.designatedNumber, 10));

    return NextResponse.json({
      success: true,
      program: {
        id: program.id,
        programCode: program.programCode,
        programName: program.programName,
        orientationDate: program.orientationDate,
        orientationVenue: program.orientationVenue,
      },
      summary: {
        totalBeneficiaries,
        totalDistributed,
        totalConfirmed,
        totalPending,
        totalFlaggedReplacement,
        distributionRate: totalBeneficiaries > 0 ? ((totalDistributed / totalBeneficiaries) * 100).toFixed(1) : "0",
        confirmationRate: totalBeneficiaries > 0 ? ((totalConfirmed / totalBeneficiaries) * 100).toFixed(1) : "0",
      },
      barangays: barangaysBreakdown,
      beneficiaries: beneficiaryRoster,
    });
  } catch (error: any) {
    console.error("GET /stub-distribution/monitoring error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
