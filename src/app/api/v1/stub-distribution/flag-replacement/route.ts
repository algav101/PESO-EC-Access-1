export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { programBeneficiaryId, reason, remarks } = await request.json();

    if (!programBeneficiaryId || !reason) {
      return NextResponse.json({ error: "Beneficiary ID and reason are required" }, { status: 400 });
    }

    const pb = await prisma.programBeneficiary.findUnique({
      where: { id: programBeneficiaryId },
      include: {
        beneficiary: true,
        qrCodes: { where: { status: "ACTIVE" } },
      },
    });

    if (!pb) {
      return NextResponse.json({ error: "Beneficiary not found" }, { status: 404 });
    }

    const activeQr = pb.qrCodes[0];

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update ProgramBeneficiary status to FLAGGED_FOR_REPLACEMENT
      await tx.programBeneficiary.update({
        where: { id: pb.id },
        data: {
          participationStatus: "FLAGGED_FOR_REPLACEMENT",
        },
      });

      // 2. Create or update StubDistribution record as FLAGGED_REPLACEMENT
      const dist = await tx.stubDistribution.create({
        data: {
          qrId: activeQr?.id || "FLAGGED_QR",
          programBeneficiaryId: pb.id,
          distributedById: user.id,
          verificationMethod: "FLAGGED_UNREACHABLE",
          status: "FLAGGED_REPLACEMENT",
          remarks: `${reason}: ${remarks || "No additional remarks"}`,
        },
      });

      return dist;
    });

    await logAudit({
      userId: user.id,
      action: "BENEFICIARY_FLAGGED_FOR_REPLACEMENT",
      entityType: "PROGRAM_BENEFICIARY",
      entityId: pb.id,
      metadata: {
        designatedNumber: pb.designatedNumber,
        reason,
        remarks,
        flaggedById: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Beneficiary #${pb.designatedNumber} (${pb.beneficiary.fullName}) has been flagged as a possible onsite replacement.`,
      data: {
        designatedNumber: pb.designatedNumber,
        fullName: pb.beneficiary.fullName,
        barangay: pb.beneficiary.barangay,
        reason,
      },
    });
  } catch (error: any) {
    console.error("Flag replacement error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
