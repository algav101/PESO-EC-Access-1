export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { generateBeneficiaryToken } from "@/lib/qr";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "qr.generate")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const beneficiariesWithoutQr = await prisma.programBeneficiary.findMany({
      where: {
        programId: params.id,
        qrCodes: { none: {} },
      },
    });

    let generatedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const pb of beneficiariesWithoutQr) {
        const qrData = generateBeneficiaryToken(params.id, pb.designatedNumber);
        await tx.qrCode.create({
          data: {
            programId: params.id,
            programBeneficiaryId: pb.id,
            publicToken: qrData.publicToken,
            tokenHash: qrData.tokenHash,
            status: "ACTIVE",
            generatedById: user.id,
          },
        });
        generatedCount++;
      }
    });

    await logAudit({
      userId: user.id,
      action: "QR_BATCH_GENERATED",
      entityType: "PROGRAM",
      entityId: params.id,
      metadata: { generatedCount },
    });

    return NextResponse.json({ success: true, generatedCount });
  } catch (error: any) {
    console.error("QR generate error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
