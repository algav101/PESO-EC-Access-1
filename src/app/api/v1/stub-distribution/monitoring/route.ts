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
          where: {
            participationStatus: {
              notIn: ["REPLACED", "PENDING_APPROVAL", "WITHDRAWN"],
            },
          },
          include: {
            beneficiary: {
              include: { dependents: { take: 1 } },
            },
            stubDistributions: {
              include: { distributedBy: { select: { fullName: true } } },
              orderBy: { distributedAt: "desc" },
            },
            qrCodes: { where: { status: "ACTIVE" } },
            originalReplacements: {
              where: { status: "PENDING" },
              include: {
                initiatedBy: { select: { fullName: true, role: true } },
                replacementProgramBeneficiary: {
                  include: {
                    beneficiary: {
                      include: {
                        dependents: true,
                        documents: true,
                      },
                    },
                  },
                },
              },
              orderBy: { initiatedAt: "desc" },
              take: 1,
            },
            newReplacements: {
              where: { status: "APPROVED" },
              include: {
                approvedBy: { select: { fullName: true, role: true } },
                originalProgramBeneficiary: {
                  include: { beneficiary: { select: { fullName: true } } },
                },
              },
              orderBy: { approvedAt: "desc" },
              take: 1,
            },
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
      const pendingRep = pb.originalReplacements?.[0] || null;
      const approvedRep = pb.newReplacements?.[0] || null;

      const isCompletedReplacement =
        Boolean(approvedRep) ||
        !pb.originalBeneficiary ||
        distributedDist?.verificationMethod === "ONSITE_REPLACEMENT_CONSENT" ||
        distributedDist?.verificationMethod === "ONSITE_REPLACEMENT";

      const isUnresolvedFlag =
        !isCompletedReplacement &&
        (Boolean(pendingRep) ||
          pb.participationStatus === "FLAGGED_FOR_REPLACEMENT" ||
          Boolean(flaggedDist));

      const isFlagged = isUnresolvedFlag || isCompletedReplacement;
      const isConfirmed = Boolean(distributedDist) && !isUnresolvedFlag;

      let status = "PENDING";
      if (isUnresolvedFlag) {
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
      }
      if (isConfirmed) {
        brgyStats[normalizedBrgy].confirmed++;
        brgyStats[normalizedBrgy].distributed++;
      }
      if (!isConfirmed && !isUnresolvedFlag) {
        brgyStats[normalizedBrgy].pending++;
      }

      const activeDist = isUnresolvedFlag ? (flaggedDist || distributedDist) : (distributedDist || flaggedDist);
      const originalBeneficiaryName = approvedRep?.originalProgramBeneficiary?.beneficiary?.fullName || null;
      const dependentFullName = pb.beneficiary.dependents?.[0]?.fullName || null;

      // Once assessed & approved by Admin/PESO, Remarks is marked as "Replaced - <Original Beneficiary Name>"
      const resolvedRemarks = isCompletedReplacement && originalBeneficiaryName
        ? `Replaced - ${originalBeneficiaryName}`
        : activeDist?.remarks || (isFlagged ? "Flagged for onsite replacement" : null);

      const candidateBene = pendingRep?.replacementProgramBeneficiary?.beneficiary || null;
      const candidateDep = candidateBene?.dependents?.[0] || null;

      return {
        id: pb.id,
        designatedNumber: pb.designatedNumber,
        fullName: pb.beneficiary.fullName,
        barangay: normalizedBrgy,
        sitio: pb.beneficiary.sitio || null,
        tableNumber: pb.tableNumber || "Table 1",
        contactNumber: pb.beneficiary.contactNumber || "N/A",
        birthday: pb.beneficiary.birthday,
        status,
        isCompletedReplacement,
        hasPendingReplacementApproval: Boolean(pendingRep),
        pendingReplacement: pendingRep
          ? {
              id: pendingRep.id,
              reason: pendingRep.reason,
              initiatedAt: pendingRep.initiatedAt,
              initiatedBy: pendingRep.initiatedBy?.fullName || "Field Coordinator",
              originalBeneficiary: {
                designatedNumber: pb.designatedNumber,
                fullName: pb.beneficiary.fullName,
                birthday: pb.beneficiary.birthday,
                barangay: normalizedBrgy,
                sitio: pb.beneficiary.sitio || "",
              },
              candidateBeneficiary: candidateBene
                ? {
                    fullName: candidateBene.fullName,
                    birthday: candidateBene.birthday,
                    sex: candidateBene.sex,
                    barangay: candidateBene.barangay,
                    sitio: candidateBene.sitio,
                    contactNumber: candidateBene.contactNumber,
                    idType: candidateBene.idType,
                    idNumber: candidateBene.idNumber,
                    dependentFullName: candidateDep?.fullName || "",
                    dependentRelationship: candidateDep?.relationship || "",
                    dependentBirthday: candidateDep?.birthday || "",
                    dependentAge: candidateDep?.age ?? null,
                    documents: candidateBene.documents || [],
                  }
                : null,
            }
          : null,
        originalBeneficiaryName,
        dependentFullName,
        distributedAt: activeDist?.distributedAt || null,
        distributedBy:
          (isCompletedReplacement && approvedRep?.approvedBy?.fullName) ||
          activeDist?.distributedBy?.fullName ||
          null,
        remarks: resolvedRemarks,
        qrToken: pb.qrCodes[0]?.publicToken || null,
      };
    });

    const totalConfirmed = Object.values(brgyStats).reduce((acc, s) => acc + s.confirmed, 0);
    const totalFlaggedReplacement = Object.values(brgyStats).reduce((acc, s) => acc + s.flaggedReplacement, 0);
    const totalDistributed = totalConfirmed;
    const totalPending = Object.values(brgyStats).reduce((acc, s) => acc + s.pending, 0);
    const totalPendingApprovals = beneficiaryRoster.filter((r) => r.hasPendingReplacementApproval).length;

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
        totalPendingApprovals,
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
