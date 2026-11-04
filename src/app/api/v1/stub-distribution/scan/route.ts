import { resolveProgramScan, ProgramScanError } from "@/lib/program-scan-resolver";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { generateBeneficiaryToken } from "@/lib/qr";
import { normalizeBarangayName } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.role, "stub.distribution.scan") && !hasPermission(user.role, "stub.distribution.distribute")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions for stub distribution" }, { status: 403 });
    }

    const body = await request.json();
    const rawQrToken = (body.qrToken || body.token || "").toString().trim();
    const programIdParam = body.programId;

    if (!rawQrToken) {
      return NextResponse.json({ error: "QR Token or Beneficiary number is required" }, { status: 400 });
    }

    const resolved = await resolveProgramScan(rawQrToken, programIdParam, {
      beneficiary: true, program: true, qrCodes: true,
      stubDistributions: { include: { distributedBy: { select: { fullName: true } } }, orderBy: { distributedAt: "desc" } },
    });
    const pb = resolved.pb;
    let qr = resolved.qr;

    // Ensure active QR code record exists
    if (!qr) {
      const qrData = generateBeneficiaryToken(pb.programId, pb.designatedNumber);
      qr = await prisma.qrCode.create({
        data: {
          programId: pb.programId,
          programBeneficiaryId: pb.id,
          publicToken: qrData.publicToken,
          tokenHash: qrData.tokenHash,
          status: "ACTIVE",
        },
      });
    }

    // =========================================================================
    // ANTI-DOUBLE SCAN ENFORCEMENT: Check if Stub is Already Distributed & Affirmed
    // =========================================================================
    const existingDistribution = pb.stubDistributions?.find(
      (d: any) => d.status === "DISTRIBUTED"
    );

    if (existingDistribution) {
      const distTime = existingDistribution.distributedAt
        ? new Date(existingDistribution.distributedAt).toLocaleString()
        : "a previous session";
      const officer = existingDistribution.distributedBy?.fullName || "Assigned Coordinator";

      return NextResponse.json(
        {
          error: `ALREADY DISTRIBUTED & AFFIRMED: Stub #${pb.designatedNumber} (${pb.beneficiary.fullName}) was already verified and distributed on ${distTime} by ${officer}. Double scanning is not allowed.`,
          alreadyDistributed: true,
          data: {
            qrId: qr.id,
            programBeneficiaryId: pb.id,
            designatedNumber: pb.designatedNumber,
            fullName: pb.beneficiary.fullName,
            barangay: normalizeBarangayName(pb.beneficiary.barangay),
            sitio: pb.beneficiary.sitio || "Centro",
            tableNumber: pb.tableNumber || "Table 1",
            programName: pb.program.programName,
            isDistributed: true,
            distributedAt: existingDistribution.distributedAt,
          },
        },
        { status: 400 }
      );
    }

    const normalizedBrgy = normalizeBarangayName(pb.beneficiary.barangay);

    const flaggedDistribution = pb.stubDistributions?.find(
      (d: any) => d.status === "FLAGGED_REPLACEMENT"
    );
    const isFlagged =
      pb.participationStatus === "FLAGGED_FOR_REPLACEMENT" || Boolean(flaggedDistribution);
    const flagRemarks = flaggedDistribution?.remarks || (isFlagged ? "Flagged for onsite replacement" : null);

    return NextResponse.json({
      success: true,
      data: {
        qrId: qr.id,
        programBeneficiaryId: pb.id,
        programId: pb.programId,
        designatedNumber: pb.designatedNumber,
        fullName: pb.beneficiary.fullName,
        barangay: normalizedBrgy,
        sitio: pb.beneficiary.sitio || "Centro",
        tableNumber: pb.tableNumber || "Table 1",
        programName: pb.program.programName,
        isDistributed: false,
        isFlagged,
        remarks: flagRemarks,
        flaggedAt: flaggedDistribution?.distributedAt || null,
        flaggedBy: flaggedDistribution?.distributedBy?.fullName || null,
      },
    });
  } catch (error: any) {
    if (error instanceof ProgramScanError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Stub scan error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
