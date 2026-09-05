import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { DINGALAN_BARANGAYS, normalizeBarangayName } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");
    const barangayFilter = searchParams.get("barangay");

    // Resolve target program ID
    let targetProgramId = programId;
    if (!targetProgramId) {
      const activeProg = await prisma.program.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      });
      if (activeProg) {
        targetProgramId = activeProg.id;
      } else {
        const latestProg = await prisma.program.findFirst({
          orderBy: { createdAt: "desc" },
        });
        if (!latestProg) {
          return NextResponse.json({ summary: null, barangays: [], beneficiaries: [] });
        }
        targetProgramId = latestProg.id;
      }
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
            orientationAttendance: {
              include: { scannedBy: { select: { fullName: true } } },
              orderBy: { scannedAt: "desc" },
            },
            qrCodes: { where: { status: "ACTIVE" } },
            originalReplacements: {
              include: {
                replacementProgramBeneficiary: {
                  include: { beneficiary: true },
                },
              },
            },
          },
        },
      },
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    let pbs = program.programBeneficiaries;

    // Filter by coordinator's assigned barangay if restricted
    if (user.role === "TUPAD_COORDINATOR" && user.assignedBarangay) {
      const userBrgyNorm = normalizeBarangayName(user.assignedBarangay).toLowerCase();
      pbs = pbs.filter(
        (pb) => normalizeBarangayName(pb.beneficiary.barangay).toLowerCase() === userBrgyNorm
      );
    } else if (barangayFilter && barangayFilter !== "ALL") {
      const targetBrgyNorm = normalizeBarangayName(barangayFilter).toLowerCase();
      pbs = pbs.filter(
        (pb) => normalizeBarangayName(pb.beneficiary.barangay).toLowerCase() === targetBrgyNorm
      );
    }

    // Initialize canonical 11 barangay stats
    const brgyMap: Record<
      string,
      {
        total: number;
        stubsAffirmed: number;
        flaggedForReplacement: number;
        orientationPresent: number;
        orientationPending: number;
        onsiteReplacements: number;
      }
    > = {};

    for (const b of DINGALAN_BARANGAYS) {
      brgyMap[b] = {
        total: 0,
        stubsAffirmed: 0,
        flaggedForReplacement: 0,
        orientationPresent: 0,
        orientationPending: 0,
        onsiteReplacements: 0,
      };
    }

    const beneficiaryRoster = pbs.map((pb) => {
      const normalizedBrgy = normalizeBarangayName(pb.beneficiary.barangay);

      if (!brgyMap[normalizedBrgy]) {
        brgyMap[normalizedBrgy] = {
          total: 0,
          stubsAffirmed: 0,
          flaggedForReplacement: 0,
          orientationPresent: 0,
          orientationPending: 0,
          onsiteReplacements: 0,
        };
      }

      const flaggedDist = pb.stubDistributions?.find((d: any) => d.status === "FLAGGED_REPLACEMENT");
      const distributedDist = pb.stubDistributions?.find((d: any) => d.status === "DISTRIBUTED");

      const isFlagged =
        pb.participationStatus === "FLAGGED_FOR_REPLACEMENT" ||
        Boolean(flaggedDist);

      const isAffirmedStub = !isFlagged && (Boolean(distributedDist) || !pb.originalBeneficiary);

      const orientationRecord = pb.orientationAttendance?.[0];
      const isOrientationPresent = orientationRecord?.status === "PRESENT";
      const isReplaced = pb.participationStatus === "REPLACED";

      // Overall lifecycle status for orientation
      let lifecycleStatus = "PENDING_STUB";
      if (isReplaced) {
        lifecycleStatus = "REPLACED";
      } else if (isFlagged) {
        lifecycleStatus = "FLAGGED_REPLACEMENT";
      } else if (isOrientationPresent) {
        lifecycleStatus = "ORIENTATION_PRESENT";
      } else if (isAffirmedStub) {
        lifecycleStatus = "AFFIRMED_AWAITING_ORIENTATION";
      }

      // Update counters
      brgyMap[normalizedBrgy].total++;
      if (isAffirmedStub) brgyMap[normalizedBrgy].stubsAffirmed++;
      if (isFlagged) brgyMap[normalizedBrgy].flaggedForReplacement++;
      if (isOrientationPresent) brgyMap[normalizedBrgy].orientationPresent++;
      else if (!isReplaced) brgyMap[normalizedBrgy].orientationPending++;
      if (!pb.originalBeneficiary) brgyMap[normalizedBrgy].onsiteReplacements++;

      const latestStubDist = isFlagged ? (flaggedDist || distributedDist) : (distributedDist || flaggedDist);

      return {
        id: pb.id,
        beneficiaryId: pb.beneficiary.id,
        designatedNumber: pb.designatedNumber,
        fullName: pb.beneficiary.fullName,
        lastName: pb.beneficiary.lastName,
        firstName: pb.beneficiary.firstName,
        middleName: pb.beneficiary.middleName,
        sitio: pb.beneficiary.sitio || "Centro",
        barangay: normalizedBrgy,
        sex: pb.beneficiary.sex || "UNKNOWN",
        birthday: pb.beneficiary.birthday,
        age: pb.beneficiary.age,
        contactNumber: pb.beneficiary.contactNumber || "N/A",
        isSenior: pb.beneficiary.isSenior,
        isPwd: pb.beneficiary.isPwd,
        tableNumber: pb.tableNumber || "Table 1",
        originalBeneficiary: pb.originalBeneficiary,
        participationStatus: pb.participationStatus,
        lifecycleStatus,
        isAffirmedStub,
        isFlaggedForReplacement: isFlagged,
        isOrientationPresent,
        stubDistributedAt: latestStubDist?.distributedAt || null,
        stubDistributedBy: latestStubDist?.distributedBy?.fullName || null,
        stubRemarks: latestStubDist?.remarks || (isFlagged ? "Flagged for onsite replacement" : null),
        orientationScannedAt: orientationRecord?.scannedAt || null,
        orientationScannedBy: orientationRecord?.scannedBy?.fullName || null,
        qrToken: pb.qrCodes[0]?.publicToken || null,
      };
    });

    // Natural sort by designated slot number
    beneficiaryRoster.sort(
      (a, b) => parseInt(a.designatedNumber, 10) - parseInt(b.designatedNumber, 10)
    );

    // Summary calculations
    const totalBeneficiaries = beneficiaryRoster.length;
    const totalAffirmedStubs = beneficiaryRoster.filter((b) => b.isAffirmedStub).length;
    const totalFlagged = beneficiaryRoster.filter((b) => b.isFlaggedForReplacement).length;
    const totalOrientationPresent = beneficiaryRoster.filter((b) => b.isOrientationPresent).length;
    const totalOrientationPending = beneficiaryRoster.filter(
      (b) => !b.isOrientationPresent && b.participationStatus !== "REPLACED"
    ).length;
    const totalOnsiteReplacements = beneficiaryRoster.filter((b) => !b.originalBeneficiary).length;

    const barangaysBreakdown = Object.entries(brgyMap).map(([name, stats]) => {
      const orientationRate =
        stats.total > 0 ? Math.round((stats.orientationPresent / stats.total) * 100) : 0;
      const stubAffirmedRate =
        stats.total > 0 ? Math.round((stats.stubsAffirmed / stats.total) * 100) : 0;

      return {
        barangayName: name,
        total: stats.total,
        stubsAffirmed: stats.stubsAffirmed,
        flaggedForReplacement: stats.flaggedForReplacement,
        orientationPresent: stats.orientationPresent,
        orientationPending: stats.orientationPending,
        onsiteReplacements: stats.onsiteReplacements,
        stubAffirmedRate,
        orientationRate,
      };
    });

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
        totalAffirmedStubs,
        totalFlagged,
        totalOrientationPresent,
        totalOrientationPending,
        totalOnsiteReplacements,
        orientationCompletionRate:
          totalBeneficiaries > 0
            ? ((totalOrientationPresent / totalBeneficiaries) * 100).toFixed(1)
            : "0.0",
        stubAffirmationRate:
          totalBeneficiaries > 0
            ? ((totalAffirmedStubs / totalBeneficiaries) * 100).toFixed(1)
            : "0.0",
      },
      barangays: barangaysBreakdown,
      beneficiaries: beneficiaryRoster,
    });
  } catch (error: any) {
    console.error("GET /orientation/monitoring error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
