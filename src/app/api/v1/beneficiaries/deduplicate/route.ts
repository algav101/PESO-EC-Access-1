export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (!hasPermission(user.role, "beneficiary.update") && !hasPermission(user.role, "beneficiary.import"))) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { programId: requestedProgramId, removeTestData = true } = body;

    let targetProgramId = requestedProgramId;
    if (!targetProgramId || targetProgramId === "AUTO") {
      const activeProg = await prisma.program.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      });
      targetProgramId = activeProg?.id;
    }

    let removedTestCount = 0;
    let removedDuplicatesCount = 0;

    // Step 1: Remove sample/test dummy data
    if (removeTestData) {
      const testKeywords = [
        "AUTOMATED TEST",
        "TEST BENEFICIARY",
        "REPLACEMENT RECIPIENT",
        "SAMPLE BENEFICIARY",
        "DUMMY",
        "TEST USER",
        "DELA CRUZ, JUAN SANTOS",
      ];

      const testBeneficiaries = await prisma.beneficiary.findMany({
        where: {
          OR: testKeywords.map((kw) => ({
            fullName: { contains: kw },
          })),
        },
        select: { id: true },
      });

      const testBeneIds = testBeneficiaries.map((b) => b.id);
      if (testBeneIds.length > 0) {
        const testPbs = await prisma.programBeneficiary.findMany({
          where: { beneficiaryId: { in: testBeneIds } },
          select: { id: true },
        });
        const testPbIds = testPbs.map((p) => p.id);

        if (testPbIds.length > 0) {
          await Promise.all([
            prisma.attendanceRecord.deleteMany({ where: { programBeneficiaryId: { in: testPbIds } } }),
            prisma.orientationAttendance.deleteMany({ where: { programBeneficiaryId: { in: testPbIds } } }),
            prisma.stubDistribution.deleteMany({ where: { programBeneficiaryId: { in: testPbIds } } }),
            prisma.payout.deleteMany({ where: { programBeneficiaryId: { in: testPbIds } } }),
            prisma.qrCode.deleteMany({ where: { programBeneficiaryId: { in: testPbIds } } }),
          ]);
          await prisma.programBeneficiary.deleteMany({ where: { id: { in: testPbIds } } });
        }

        await Promise.all([
          prisma.dependent.deleteMany({ where: { beneficiaryId: { in: testBeneIds } } }),
          prisma.beneficiaryRestriction.deleteMany({ where: { beneficiaryId: { in: testBeneIds } } }),
        ]);
        await prisma.beneficiary.deleteMany({ where: { id: { in: testBeneIds } } });
        removedTestCount = testBeneIds.length;
      }
    }

    // Step 2: Deduplicate Program Beneficiaries
    const programFilter = targetProgramId ? { id: targetProgramId } : {};
    const programs = await prisma.program.findMany({
      where: programFilter,
      select: { id: true, programCode: true },
    });

    for (const prog of programs) {
      const pbs = await prisma.programBeneficiary.findMany({
        where: { programId: prog.id },
        select: {
          id: true,
          designatedNumber: true,
          participationStatus: true,
          joinedAt: true,
          beneficiary: {
            select: { id: true, fullName: true, birthday: true },
          },
        },
        orderBy: [{ joinedAt: "desc" }],
      });

      const seenDesig = new Map<string, string>();
      const seenBene = new Map<string, string>();
      const pbIdsToDelete: string[] = [];

      for (const pb of pbs) {
        const desig = String(pb.designatedNumber || "").trim();
        const name = pb.beneficiary?.fullName?.trim().toUpperCase() || "";

        let isDuplicate = false;

        if (desig && seenDesig.has(desig)) {
          isDuplicate = true;
        }

        if (name && seenBene.has(name)) {
          isDuplicate = true;
        }

        if (isDuplicate) {
          pbIdsToDelete.push(pb.id);
        } else {
          if (desig) seenDesig.set(desig, pb.id);
          if (name) seenBene.set(name, pb.id);
        }
      }

      if (pbIdsToDelete.length > 0) {
        const CHUNK_SIZE = 100;
        for (let i = 0; i < pbIdsToDelete.length; i += CHUNK_SIZE) {
          const chunk = pbIdsToDelete.slice(i, i + CHUNK_SIZE);
          await Promise.all([
            prisma.attendanceRecord.deleteMany({ where: { programBeneficiaryId: { in: chunk } } }),
            prisma.orientationAttendance.deleteMany({ where: { programBeneficiaryId: { in: chunk } } }),
            prisma.stubDistribution.deleteMany({ where: { programBeneficiaryId: { in: chunk } } }),
            prisma.payout.deleteMany({ where: { programBeneficiaryId: { in: chunk } } }),
            prisma.qrCode.deleteMany({ where: { programBeneficiaryId: { in: chunk } } }),
          ]);
          await prisma.programBeneficiary.deleteMany({ where: { id: { in: chunk } } });
        }
        removedDuplicatesCount += pbIdsToDelete.length;
      }

      // Sync program beneficiary count
      const finalCount = await prisma.programBeneficiary.count({
        where: { programId: prog.id, participationStatus: { not: "REPLACED" } },
      });
      await prisma.program.update({
        where: { id: prog.id },
        data: { beneficiaryCount: finalCount },
      });
    }

    const totalActiveBeneficiaries = targetProgramId
      ? await prisma.programBeneficiary.count({
          where: { programId: targetProgramId, participationStatus: { not: "REPLACED" } },
        })
      : await prisma.beneficiary.count({ where: { status: "ACTIVE" } });

    await logAudit({
      userId: user.id,
      action: "BENEFICIARIES_MASTERLIST_DEDUPLICATED_AND_CLEANED",
      entityType: "PROGRAM",
      entityId: targetProgramId || "ALL",
      metadata: { removedTestCount, removedDuplicatesCount, totalActiveBeneficiaries },
    });

    return NextResponse.json({
      success: true,
      removedDuplicatesCount,
      removedTestCount,
      totalActiveBeneficiaries,
      message: `Cleaned up ${removedDuplicatesCount} duplicate entries and ${removedTestCount} test records. Total active beneficiaries: ${totalActiveBeneficiaries}.`,
    });
  } catch (error: any) {
    console.error("Deduplicate error:", error);
    return NextResponse.json({ error: error.message || "Failed to deduplicate masterlist" }, { status: 500 });
  }
}
