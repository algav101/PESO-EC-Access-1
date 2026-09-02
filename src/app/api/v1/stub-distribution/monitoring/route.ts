import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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

    let totalDistributed = 0;
    let totalConfirmed = 0;
    let totalFlaggedReplacement = 0;
    let totalPending = 0;

    // Barangay aggregation map
    const DINGALAN_BARANGAYS = [
      "Aplaya", "Butas na Bato", "Caragsacan", "Davildavilan",
      "Dikapanikian", "Ibona", "Matawe", "Paltic",
      "Poblacion", "Tanawan", "Umiray"
    ];

    const brgyStats: Record<string, {
      total: number;
      distributed: number;
      confirmed: number;
      pending: number;
      flaggedReplacement: number;
    }> = {};

    for (const b of DINGALAN_BARANGAYS) {
      brgyStats[b] = { total: 0, distributed: 0, confirmed: 0, pending: 0, flaggedReplacement: 0 };
    }

    const beneficiaryRoster = beneficiaries.map((pb) => {
      const dist = pb.stubDistributions[0];
      const isConfirmed = dist?.status === "DISTRIBUTED" && dist?.verificationMethod === "BIRTHDAY_PIN";
      const isFlagged = dist?.status === "FLAGGED_REPLACEMENT" || pb.participationStatus === "FLAGGED_FOR_REPLACEMENT";
      const isDistributed = !!dist && dist.status === "DISTRIBUTED";

      let status = "PENDING";
      if (isFlagged) {
        status = "FLAGGED_REPLACEMENT";
        totalFlaggedReplacement++;
      } else if (isConfirmed) {
        status = "CONFIRMED";
        totalConfirmed++;
        totalDistributed++;
      } else if (isDistributed) {
        status = "DISTRIBUTED";
        totalDistributed++;
      } else {
        totalPending++;
      }

      const brgy = pb.beneficiary.barangay || "Unassigned";
      if (!brgyStats[brgy]) {
        brgyStats[brgy] = { total: 0, distributed: 0, confirmed: 0, pending: 0, flaggedReplacement: 0 };
      }

      brgyStats[brgy].total++;
      if (isFlagged) brgyStats[brgy].flaggedReplacement++;
      else if (isConfirmed) brgyStats[brgy].confirmed++, brgyStats[brgy].distributed++;
      else if (isDistributed) brgyStats[brgy].distributed++;
      else brgyStats[brgy].pending++;

      return {
        id: pb.id,
        designatedNumber: pb.designatedNumber,
        fullName: pb.beneficiary.fullName,
        barangay: pb.beneficiary.barangay,
        tableNumber: pb.tableNumber || "Table 1",
        contactNumber: pb.beneficiary.contactNumber || "N/A",
        birthday: pb.beneficiary.birthday,
        status,
        distributedAt: dist?.distributedAt || null,
        distributedBy: dist?.distributedBy?.fullName || null,
        remarks: dist?.remarks || null,
        qrToken: pb.qrCodes[0]?.publicToken || null,
      };
    });

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

    // Natural sort roster
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
