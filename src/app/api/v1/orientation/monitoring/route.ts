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
            orientationAttendance: {
              include: { scannedBy: { select: { fullName: true } } },
              orderBy: { scannedAt: "desc" },
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
        stubsAffirmed: number;
        flaggedReplacement: number;
        orientationScanned: number;
        orientationPending: number;
      }
    > = {};

    for (const b of DINGALAN_BARANGAYS) {
      brgyStats[b] = {
        total: 0,
        stubsAffirmed: 0,
        flaggedReplacement: 0,
        orientationScanned: 0,
        orientationPending: 0,
      };
    }

    const beneficiaryRoster = beneficiaries.map((pb) => {
      const flaggedDist = pb.stubDistributions?.find((d: any) => d.status === "FLAGGED_REPLACEMENT");
      const distributedDist = pb.stubDistributions?.find((d: any) => d.status === "DISTRIBUTED");
      const orientationRecord = pb.orientationAttendance?.[0];

      const isFlagged =
        pb.participationStatus === "FLAGGED_FOR_REPLACEMENT" ||
        Boolean(flaggedDist);

      const isStubAffirmed = !isFlagged && Boolean(distributedDist);
      const isOrientationScanned = Boolean(orientationRecord && orientationRecord.status === "PRESENT");

      // Categorical orientation status:
      // 1. SCANNED_PRESENT: Already scanned and verified present for orientation
      // 2. NOT_SCANNED_PENDING: Stub was affirmed/distributed, but NOT YET scanned for orientation
      // 3. FLAGGED_REPLACEMENT: Flagged for replacement during stub distribution
      // 4. PENDING_STUB: Step 1 (stub distribution) not yet completed
      let status = "PENDING_STUB";
      if (isOrientationScanned) {
        status = "SCANNED_PRESENT";
      } else if (isFlagged) {
        status = "FLAGGED_REPLACEMENT";
      } else if (isStubAffirmed) {
        status = "NOT_SCANNED_PENDING";
      } else {
        status = "PENDING_STUB";
      }

      const normalizedBrgy = normalizeBarangayName(pb.beneficiary.barangay);

      if (!brgyStats[normalizedBrgy]) {
        brgyStats[normalizedBrgy] = {
          total: 0,
          stubsAffirmed: 0,
          flaggedReplacement: 0,
          orientationScanned: 0,
          orientationPending: 0,
        };
      }

      brgyStats[normalizedBrgy].total++;
      if (isFlagged) {
        brgyStats[normalizedBrgy].flaggedReplacement++;
      } else if (isStubAffirmed) {
        brgyStats[normalizedBrgy].stubsAffirmed++;
        if (isOrientationScanned) {
          brgyStats[normalizedBrgy].orientationScanned++;
        } else {
          brgyStats[normalizedBrgy].orientationPending++;
        }
      }

      return {
        id: pb.id,
        designatedNumber: pb.designatedNumber,
        fullName: pb.beneficiary.fullName,
        barangay: normalizedBrgy,
        tableNumber: pb.tableNumber || "Table 1",
        contactNumber: pb.beneficiary.contactNumber || "N/A",
        birthday: pb.beneficiary.birthday,
        isStubAffirmed,
        isFlagged,
        isOrientationScanned,
        status,
        stubDistributedAt: distributedDist?.distributedAt || null,
        stubDistributedBy: distributedDist?.distributedBy?.fullName || null,
        orientationScannedAt: orientationRecord?.scannedAt || null,
        orientationScannedBy: orientationRecord?.scannedBy?.fullName || null,
        orientationStatus: orientationRecord?.status || (isOrientationScanned ? "PRESENT" : "PENDING"),
        remarks: flaggedDist?.remarks || (isFlagged ? "Flagged for replacement in Stub Distribution" : null),
        qrToken: pb.qrCodes[0]?.publicToken || null,
      };
    });

    const totalStubsAffirmed = Object.values(brgyStats).reduce((acc, s) => acc + s.stubsAffirmed, 0);
    const totalFlaggedReplacement = Object.values(brgyStats).reduce((acc, s) => acc + s.flaggedReplacement, 0);
    const totalOrientationScanned = Object.values(brgyStats).reduce((acc, s) => acc + s.orientationScanned, 0);
    const totalOrientationPending = Object.values(brgyStats).reduce((acc, s) => acc + s.orientationPending, 0);

    const barangaysBreakdown = Object.entries(brgyStats).map(([name, stats]) => {
      const eligibleForOrientation = stats.stubsAffirmed;
      const percentage =
        eligibleForOrientation > 0
          ? Math.round((stats.orientationScanned / eligibleForOrientation) * 100)
          : stats.total > 0 && stats.orientationScanned > 0
          ? Math.round((stats.orientationScanned / stats.total) * 100)
          : 0;

      let badgeStatus = "NOT_STARTED";
      if (percentage === 100 && stats.orientationScanned > 0) badgeStatus = "COMPLETED";
      else if (percentage >= 50) badgeStatus = "IN_PROGRESS";
      else if (percentage > 0) badgeStatus = "LAGGING";

      return {
        barangayName: name,
        total: stats.total,
        stubsAffirmed: stats.stubsAffirmed,
        flaggedReplacement: stats.flaggedReplacement,
        orientationScanned: stats.orientationScanned,
        orientationPending: stats.orientationPending,
        completionPercentage: percentage,
        status: badgeStatus,
      };
    });

    // Natural sort roster by designated slot number (1, 2, 3...)
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
        totalStubsAffirmed,
        totalFlaggedReplacement,
        totalOrientationScanned,
        totalOrientationPending,
        attendanceRate:
          totalStubsAffirmed > 0
            ? ((totalOrientationScanned / totalStubsAffirmed) * 100).toFixed(1)
            : totalBeneficiaries > 0
            ? ((totalOrientationScanned / totalBeneficiaries) * 100).toFixed(1)
            : "0",
      },
      barangays: barangaysBreakdown,
      beneficiaries: beneficiaryRoster,
    });
  } catch (error: any) {
    console.error("GET /orientation/monitoring error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
