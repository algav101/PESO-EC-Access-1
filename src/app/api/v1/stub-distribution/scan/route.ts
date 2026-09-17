export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateBeneficiaryToken } from "@/lib/qr";
import { normalizeBarangayName } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const rawQrToken = (body.qrToken || body.token || "").toString().trim();
    const programIdParam = body.programId;

    if (!rawQrToken) {
      return NextResponse.json({ error: "QR Token or Beneficiary number is required" }, { status: 400 });
    }

    // Clean token: check if scanned value is a URL containing token parameter
    let cleanToken = rawQrToken;
    try {
      if (rawQrToken.startsWith("http://") || rawQrToken.startsWith("https://")) {
        const parsedUrl = new URL(rawQrToken);
        cleanToken =
          parsedUrl.searchParams.get("token") ||
          parsedUrl.searchParams.get("qrToken") ||
          parsedUrl.pathname.split("/").pop() ||
          rawQrToken;
      }
    } catch {}

    cleanToken = cleanToken.trim();

    let qr = null;
    let pb: any = null;

    // Strategy 1: Find by exact or uppercase publicToken
    qr = await prisma.qrCode.findFirst({
      where: {
        OR: [{ publicToken: cleanToken }, { publicToken: cleanToken.toUpperCase() }],
      },
      include: {
        programBeneficiary: {
          include: {
            beneficiary: true,
            program: true,
            stubDistributions: {
              include: { distributedBy: { select: { fullName: true } } },
              orderBy: { distributedAt: "desc" },
            },
          },
        },
      },
    });

    if (qr && qr.programBeneficiary) {
      pb = qr.programBeneficiary;
    }

    // Strategy 2: Search by Case-Insensitive substring of publicToken
    if (!pb) {
      qr = await prisma.qrCode.findFirst({
        where: {
          publicToken: { contains: cleanToken, mode: "insensitive" },
        },
        include: {
          programBeneficiary: {
            include: {
              beneficiary: true,
              program: true,
              stubDistributions: {
                include: { distributedBy: { select: { fullName: true } } },
                orderBy: { distributedAt: "desc" },
              },
            },
          },
        },
      });
      if (qr && qr.programBeneficiary) {
        pb = qr.programBeneficiary;
      }
    }

    // Strategy 3: Numeric slot match (e.g. "1", "22", "81", "92")
    const isNumericSlot = /^\d+$/.test(cleanToken);
    if (!pb && isNumericSlot) {
      const slotNum = String(parseInt(cleanToken, 10));
      const whereClause: any = { designatedNumber: slotNum, participationStatus: "ACTIVE" };
      if (programIdParam) whereClause.programId = programIdParam;

      pb = await prisma.programBeneficiary.findFirst({
        where: whereClause,
        orderBy: { joinedAt: "desc" },
        include: {
          beneficiary: true,
          program: true,
          stubDistributions: {
            include: { distributedBy: { select: { fullName: true } } },
            orderBy: { distributedAt: "desc" },
          },
          qrCodes: true,
        },
      });

      if (pb) {
        qr = pb.qrCodes.find((q: any) => q.status === "ACTIVE") || pb.qrCodes[0] || null;
      }
    }

    // Strategy 4: Beneficiary Number or Full Name match
    if (!pb) {
      const whereClause: any = {
        OR: [
          { beneficiary: { beneficiaryNumber: cleanToken } },
          { beneficiary: { fullName: { equals: cleanToken, mode: "insensitive" } } },
        ],
      };
      if (programIdParam) whereClause.programId = programIdParam;

      pb = await prisma.programBeneficiary.findFirst({
        where: whereClause,
        orderBy: { joinedAt: "desc" },
        include: {
          beneficiary: true,
          program: true,
          stubDistributions: {
            include: { distributedBy: { select: { fullName: true } } },
            orderBy: { distributedAt: "desc" },
          },
          qrCodes: true,
        },
      });

      if (pb) {
        qr = pb.qrCodes.find((q: any) => q.status === "ACTIVE") || pb.qrCodes[0] || null;
      }
    }

    if (!pb) {
      return NextResponse.json({ error: "QR Stub not found in registered program roster." }, { status: 404 });
    }

    // Resolve replacement if beneficiary was replaced
    if (pb.participationStatus === "REPLACED") {
      const activeReplacement = await prisma.programBeneficiary.findFirst({
        where: {
          programId: pb.programId,
          designatedNumber: pb.designatedNumber,
          participationStatus: "ACTIVE",
        },
        include: {
          beneficiary: true,
          program: true,
          stubDistributions: {
            include: { distributedBy: { select: { fullName: true } } },
            orderBy: { distributedAt: "desc" },
          },
          qrCodes: true,
        },
      });

      if (activeReplacement) {
        pb = activeReplacement;
        qr = pb.qrCodes.find((q: any) => q.status === "ACTIVE") || pb.qrCodes[0] || qr;
      }
    }

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
    console.error("Stub scan error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
