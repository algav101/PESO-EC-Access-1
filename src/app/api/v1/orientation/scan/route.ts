export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { normalizeBarangayName } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const rawQrToken = (body.qrToken || body.token || "").toString().trim();
    const deviceId = body.deviceId;
    const programIdParam = body.programId;

    if (!rawQrToken) {
      return NextResponse.json({ error: "QR Token or Beneficiary number is required" }, { status: 400 });
    }

    // Clean token if URL
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

    // Strategy 1: Exact or uppercase publicToken
    qr = await prisma.qrCode.findFirst({
      where: {
        OR: [{ publicToken: cleanToken }, { publicToken: cleanToken.toUpperCase() }],
      },
      include: {
        programBeneficiary: {
          include: {
            beneficiary: true,
            program: true,
            orientationAttendance: {
              include: { scannedBy: { select: { fullName: true } } },
              orderBy: { scannedAt: "desc" },
            },
            stubDistributions: {
              where: { status: "DISTRIBUTED" },
            },
          },
        },
      },
    });

    if (qr && qr.programBeneficiary) {
      pb = qr.programBeneficiary;
    }

    // Strategy 2: Case-insensitive substring
    if (!pb) {
      qr = await prisma.qrCode.findFirst({
        where: { publicToken: { contains: cleanToken, mode: "insensitive" } },
        include: {
          programBeneficiary: {
            include: {
              beneficiary: true,
              program: true,
              orientationAttendance: {
                include: { scannedBy: { select: { fullName: true } } },
                orderBy: { scannedAt: "desc" },
              },
              stubDistributions: {
                where: { status: "DISTRIBUTED" },
              },
            },
          },
        },
      });
      if (qr && qr.programBeneficiary) {
        pb = qr.programBeneficiary;
      }
    }

    // Strategy 3: Numeric designated slot number
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
          orientationAttendance: {
            include: { scannedBy: { select: { fullName: true } } },
            orderBy: { scannedAt: "desc" },
          },
          stubDistributions: {
            where: { status: "DISTRIBUTED" },
          },
          qrCodes: true,
        },
      });

      if (pb) {
        qr = pb.qrCodes.find((q: any) => q.status === "ACTIVE") || pb.qrCodes[0] || null;
      }
    }

    // Strategy 4: Beneficiary number or Full name
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
          orientationAttendance: {
            include: { scannedBy: { select: { fullName: true } } },
            orderBy: { scannedAt: "desc" },
          },
          stubDistributions: {
            where: { status: "DISTRIBUTED" },
          },
          qrCodes: true,
        },
      });

      if (pb) {
        qr = pb.qrCodes.find((q: any) => q.status === "ACTIVE") || pb.qrCodes[0] || null;
      }
    }

    if (!pb) {
      return NextResponse.json({ error: "QR Code not found in registered program roster." }, { status: 404 });
    }

    // Handle replacement resolution
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
          orientationAttendance: {
            include: { scannedBy: { select: { fullName: true } } },
            orderBy: { scannedAt: "desc" },
          },
          stubDistributions: {
            where: { status: "DISTRIBUTED" },
          },
          qrCodes: true,
        },
      });

      if (activeReplacement) {
        pb = activeReplacement;
      } else {
        return NextResponse.json(
          {
            error: `CANNOT SCAN: Beneficiary #${pb.designatedNumber} (${pb.beneficiary.fullName}) was replaced and is no longer active in this program.`,
            stepBlocked: "BENEFICIARY_REPLACED",
          },
          { status: 400 }
        );
      }
    }

    // =========================================================================
    // STEP SEQUENCE VALIDATION: Step 1 (Stub Distribution) must be completed!
    // =========================================================================
    const hasCompletedStubDistribution = (pb.stubDistributions && pb.stubDistributions.length > 0) || !pb.originalBeneficiary;
    if (!hasCompletedStubDistribution) {
      return NextResponse.json(
        {
          error: `SEQUENCE BLOCKED: Stub for #${pb.designatedNumber} (${pb.beneficiary.fullName}) has NOT yet been distributed/affirmed in Step 1 (Stub Distribution). Please complete Step 1 first before Orientation.`,
          stepBlocked: "STUB_DISTRIBUTION_REQUIRED",
          data: {
            designatedNumber: pb.designatedNumber,
            fullName: pb.beneficiary.fullName,
            barangay: normalizeBarangayName(pb.beneficiary.barangay),
          },
        },
        { status: 400 }
      );
    }

    // =========================================================================
    // ANTI-DOUBLE SCAN ENFORCEMENT: Orientation can only be scanned ONCE!
    // =========================================================================
    const existing = pb.orientationAttendance?.[0];
    if (existing) {
      const scanTime = existing.scannedAt ? new Date(existing.scannedAt).toLocaleString() : "a previous session";
      const officer = existing.scannedBy?.fullName || "Assigned Officer";

      return NextResponse.json(
        {
          error: `ALREADY SCANNED: Orientation Attendance for #${pb.designatedNumber} (${pb.beneficiary.fullName}) was already recorded as ${existing.status} on ${scanTime} by ${officer}. Double scanning is not allowed.`,
          alreadyScanned: true,
          data: {
            designatedNumber: pb.designatedNumber,
            fullName: pb.beneficiary.fullName,
            barangay: normalizeBarangayName(pb.beneficiary.barangay),
            tableNumber: pb.tableNumber,
            status: existing.status,
            scannedAt: existing.scannedAt,
          },
        },
        { status: 400 }
      );
    }

    // Create Orientation Attendance Record
    const record = await prisma.orientationAttendance.create({
      data: {
        programId: pb.programId,
        programBeneficiaryId: pb.id,
        status: "PRESENT",
        scannedById: user.id,
        deviceId: deviceId || "BROWSER",
      },
    });

    await logAudit({
      userId: user.id,
      action: "ORIENTATION_SCANNED",
      entityType: "PROGRAM_BENEFICIARY",
      entityId: pb.id,
      metadata: { designatedNumber: pb.designatedNumber, status: "PRESENT" },
    });

    return NextResponse.json({
      success: true,
      message: "✓ Orientation Attendance successfully recorded!",
      data: {
        designatedNumber: pb.designatedNumber,
        fullName: pb.beneficiary.fullName,
        barangay: normalizeBarangayName(pb.beneficiary.barangay),
        tableNumber: pb.tableNumber,
        status: "PRESENT",
        scannedAt: record.scannedAt,
      },
    });
  } catch (error: any) {
    console.error("Orientation scan error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
