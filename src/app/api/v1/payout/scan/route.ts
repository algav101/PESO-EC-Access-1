export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { addDays, format, parseISO } from "date-fns";
import { normalizeBarangayName } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.role, "payout.scan")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions for payout scanning" }, { status: 403 });
    }

    const body = await request.json();
    const rawQrToken = (body.qrToken || body.token || "").toString().trim();
    const { status = "PAID", remarks, payoutDate, isLookupOnly = false, programId: programIdParam } = body;

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

    const pbIncludes = {
      beneficiary: true,
      program: true,
      stubDistributions: {
        where: { status: "DISTRIBUTED" },
      },
      orientationAttendance: {
        where: { status: "PRESENT" },
      },
      attendanceRecords: true,
      payouts: {
        include: { verifiedBy: { select: { fullName: true } } },
      },
      qrCodes: true,
    };

    // Strategy 1: Exact or uppercase publicToken
    qr = await prisma.qrCode.findFirst({
      where: {
        OR: [{ publicToken: cleanToken }, { publicToken: cleanToken.toUpperCase() }],
      },
      include: {
        programBeneficiary: {
          include: pbIncludes,
        },
      },
    });

    if (qr && qr.programBeneficiary) {
      pb = qr.programBeneficiary;
    }

    // Strategy 2: Case-insensitive substring (only for non-numeric tokens of length >= 6)
    const isNumericSlot = /^\d+$/.test(cleanToken);
    if (!pb && !isNumericSlot && cleanToken.length >= 6) {
      qr = await prisma.qrCode.findFirst({
        where: { publicToken: { contains: cleanToken, mode: "insensitive" } },
        include: {
          programBeneficiary: {
            include: pbIncludes,
          },
        },
      });
      if (qr && qr.programBeneficiary) {
        pb = qr.programBeneficiary;
      }
    }

    // Strategy 3: Numeric slot
    if (!pb && isNumericSlot) {
      const slotNum = String(parseInt(cleanToken, 10));
      const whereClause: any = { designatedNumber: slotNum, participationStatus: "ACTIVE" };
      if (programIdParam) whereClause.programId = programIdParam;

      pb = await prisma.programBeneficiary.findFirst({
        where: whereClause,
        orderBy: { joinedAt: "desc" },
        include: pbIncludes,
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
        include: pbIncludes,
      });

      if (pb) {
        qr = pb.qrCodes.find((q: any) => q.status === "ACTIVE") || pb.qrCodes[0] || null;
      }
    }

    if (!pb) {
      return NextResponse.json({ error: "QR Token not recognized in active program roster." }, { status: 404 });
    }

    // Resolve replacement
    if (pb.participationStatus === "REPLACED") {
      const activeReplacement = await prisma.programBeneficiary.findFirst({
        where: {
          programId: pb.programId,
          designatedNumber: pb.designatedNumber,
          participationStatus: "ACTIVE",
        },
        include: pbIncludes,
      });

      if (activeReplacement) {
        pb = activeReplacement;
      } else {
        return NextResponse.json(
          {
            error: `CANNOT CLAIM PAYOUT: Beneficiary #${pb.designatedNumber} (${pb.beneficiary.fullName}) was replaced and is no longer active in this program.`,
            stepBlocked: "BENEFICIARY_REPLACED",
          },
          { status: 400 }
        );
      }
    }

    // =========================================================================
    // STEP SEQUENCE VALIDATION: Steps 1, 2, and 3 must be completed!
    // =========================================================================
    const hasDistributedStub = (pb.stubDistributions && pb.stubDistributions.length > 0) || !pb.originalBeneficiary;
    const hasOrientation = (pb.orientationAttendance && pb.orientationAttendance.length > 0) || !pb.originalBeneficiary;
    const totalDaysPresent = (pb.attendanceRecords || []).filter((a: any) => a.morningTimeIn || a.afternoonTimeIn).length;

    if (!hasDistributedStub) {
      return NextResponse.json(
        {
          error: `SEQUENCE BLOCKED: Beneficiary #${pb.designatedNumber} (${pb.beneficiary.fullName}) has NOT completed Step 1 (Stub Distribution & Affirmation). Cannot proceed to Payout.`,
          stepBlocked: "STUB_DISTRIBUTION_REQUIRED",
        },
        { status: 400 }
      );
    }

    if (!hasOrientation) {
      return NextResponse.json(
        {
          error: `SEQUENCE BLOCKED: Beneficiary #${pb.designatedNumber} (${pb.beneficiary.fullName}) has NOT completed Step 2 (Orientation Attendance). Cannot proceed to Payout.`,
          stepBlocked: "ORIENTATION_REQUIRED",
        },
        { status: 400 }
      );
    }

    // =========================================================================
    // ANTI-DOUBLE SCAN ENFORCEMENT: Payout can only be verified & claimed ONCE!
    // =========================================================================
    const existingPayout = pb.payouts?.find((p: any) => p.status === "PAID");
    if (existingPayout) {
      const paidDateStr = existingPayout.payoutDate || (existingPayout.verifiedAt ? new Date(existingPayout.verifiedAt).toLocaleDateString() : "a previous date");
      const disbursingOfficer = existingPayout.verifiedBy?.fullName || "PESO Disbursing Officer";

      return NextResponse.json(
        {
          error: `ALREADY PAID: Payout for #${pb.designatedNumber} (${pb.beneficiary.fullName}) was already verified and claimed on ${paidDateStr} by ${disbursingOfficer}. Double payout scanning is strictly prohibited.`,
          alreadyPaid: true,
          data: {
            designatedNumber: pb.designatedNumber,
            fullName: pb.beneficiary.fullName,
            barangay: normalizeBarangayName(pb.beneficiary.barangay),
            tableNumber: pb.tableNumber,
            status: "PAID",
            payoutDate: existingPayout.payoutDate,
            remarks: existingPayout.remarks,
          },
        },
        { status: 400 }
      );
    }

    // If request was just for lookup/preview before claiming
    if (isLookupOnly) {
      return NextResponse.json({
        success: true,
        lookupOnly: true,
        data: {
          qrId: qr?.id || pb.qrCodes[0]?.id,
          programBeneficiaryId: pb.id,
          designatedNumber: pb.designatedNumber,
          fullName: pb.beneficiary.fullName,
          barangay: normalizeBarangayName(pb.beneficiary.barangay),
          sitio: pb.beneficiary.sitio || "Centro",
          tableNumber: pb.tableNumber || "Table 1",
          programName: pb.program.programName,
          daysPresent: totalDaysPresent,
          isPaid: false,
        },
      });
    }

    const program = pb.program;
    const effectivePayoutDate = payoutDate || program.payoutDate || format(new Date(), "yyyy-MM-dd");

    // Atomic transaction for Payout + 365-Day Restriction + Audit
    const result = await prisma.$transaction(async (tx) => {
      const payout = await tx.payout.upsert({
        where: {
          programId_programBeneficiaryId: {
            programId: program.id,
            programBeneficiaryId: pb.id,
          },
        },
        update: {
          status,
          payoutDate: effectivePayoutDate,
          verifiedAt: new Date(),
          verifiedById: user.id,
          remarks,
        },
        create: {
          programId: program.id,
          programBeneficiaryId: pb.id,
          status,
          payoutDate: effectivePayoutDate,
          verifiedAt: new Date(),
          verifiedById: user.id,
          remarks,
        },
      });

      let restriction = null;
      if (status === "PAID") {
        const startD = parseISO(effectivePayoutDate);
        const endD = addDays(startD, 365);
        const restrictionStartStr = format(startD, "yyyy-MM-dd");
        const restrictionEndStr = format(endD, "yyyy-MM-dd");

        const existingRestriction = await tx.beneficiaryRestriction.findFirst({
          where: {
            beneficiaryId: pb.beneficiaryId,
            sourceProgramId: program.id,
          },
        });

        if (existingRestriction) {
          restriction = await tx.beneficiaryRestriction.update({
            where: { id: existingRestriction.id },
            data: {
              payoutDate: effectivePayoutDate,
              restrictionStart: restrictionStartStr,
              restrictionEnd: restrictionEndStr,
              status: "ACTIVE",
            },
          });
        } else {
          restriction = await tx.beneficiaryRestriction.create({
            data: {
              beneficiaryId: pb.beneficiaryId,
              sourceProgramId: program.id,
              payoutDate: effectivePayoutDate,
              restrictionStart: restrictionStartStr,
              restrictionEnd: restrictionEndStr,
              adlNo: program.programCode,
              barangay: normalizeBarangayName(pb.beneficiary.barangay),
              municipality: "Dingalan",
              reason: `365-day statutory TUPAD payout restriction (${program.programName})`,
              status: "ACTIVE",
            },
          });
        }
      }

      return { payout, restriction };
    });

    await logAudit({
      userId: user.id,
      action: "PAYOUT_VERIFIED",
      entityType: "PAYOUT",
      entityId: result.payout.id,
      metadata: {
        designatedNumber: pb.designatedNumber,
        beneficiaryName: pb.beneficiary.fullName,
        status,
        restrictionCreated: !!result.restriction,
      },
    });

    return NextResponse.json({
      success: true,
      message: `✓ Payout successfully verified as ${status}!${result.restriction ? " 365-day restriction is now active." : ""}`,
      data: {
        designatedNumber: pb.designatedNumber,
        fullName: pb.beneficiary.fullName,
        barangay: normalizeBarangayName(pb.beneficiary.barangay),
        tableNumber: pb.tableNumber,
        status: result.payout.status,
        payoutDate: result.payout.payoutDate,
        restrictionEnd: result.restriction?.restrictionEnd,
      },
    });
  } catch (error: any) {
    console.error("Payout scan error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
