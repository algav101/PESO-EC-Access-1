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
        cleanToken = parsedUrl.searchParams.get("token") || parsedUrl.searchParams.get("qrToken") || parsedUrl.pathname.split("/").pop() || rawQrToken;
      }
    } catch {}

    cleanToken = cleanToken.trim();

    let qr = null;
    let pb = null;

    // Strategy 1: Find by exact or uppercase publicToken
    qr = await prisma.qrCode.findFirst({
      where: {
        OR: [
          { publicToken: cleanToken },
          { publicToken: cleanToken.toUpperCase() },
        ],
      },
      include: {
        programBeneficiary: {
          include: {
            beneficiary: true,
            program: true,
            stubDistributions: true,
          },
        },
      },
    });

    if (qr && qr.programBeneficiary) {
      pb = qr.programBeneficiary;
    }

    // Strategy 2: If not found, search by Case-Insensitive substring of publicToken
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
              stubDistributions: true,
            },
          },
        },
      });
      if (qr && qr.programBeneficiary) {
        pb = qr.programBeneficiary;
      }
    }

    // Strategy 3: Check if scanned input is a designated slot number (e.g. "1", "22", "81", "92")
    const isNumericSlot = /^\d+$/.test(cleanToken);
    if (!pb && isNumericSlot) {
      const slotNum = String(parseInt(cleanToken, 10));
      const whereClause: any = { designatedNumber: slotNum, participationStatus: "ACTIVE" };
      if (programIdParam) whereClause.programId = programIdParam;

      pb = await prisma.programBeneficiary.findFirst({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
          beneficiary: true,
          program: true,
          stubDistributions: true,
          qrCodes: true,
        },
      });

      if (pb) {
        qr = pb.qrCodes.find((q: any) => q.status === "ACTIVE") || pb.qrCodes[0] || null;
      }
    }

    // Strategy 4: Check by Beneficiary Number (e.g. "BN-0001") or Full Name
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
        orderBy: { createdAt: "desc" },
        include: {
          beneficiary: true,
          program: true,
          stubDistributions: true,
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
          stubDistributions: true,
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

    const isDistributed = pb.stubDistributions?.some((d: any) => d.status === "DISTRIBUTED") || false;
    const normalizedBrgy = normalizeBarangayName(pb.beneficiary.barangay);

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
        isDistributed,
      },
    });
  } catch (error: any) {
    console.error("Stub scan error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
