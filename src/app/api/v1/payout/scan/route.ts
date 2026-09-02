import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { addDays, format, parseISO } from "date-fns";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { qrToken, status = "PAID", remarks, payoutDate } = await request.json();
    if (!qrToken) return NextResponse.json({ error: "QR Token is required" }, { status: 400 });

    let qr = await prisma.qrCode.findUnique({
      where: { publicToken: qrToken.trim() },
      include: {
        programBeneficiary: {
          include: {
            beneficiary: true,
            program: true,
            payouts: true,
          },
        },
      },
    });

    if (!qr) {
      return NextResponse.json({ error: "Invalid QR Code" }, { status: 404 });
    }

    // Resolve current active ProgramBeneficiary for this designated slot
    let pb = qr.programBeneficiary;
    if (!pb || pb.participationStatus === "REPLACED") {
      const activePb = await prisma.programBeneficiary.findFirst({
        where: {
          programId: qr.programId,
          designatedNumber: pb?.designatedNumber,
          participationStatus: "ACTIVE",
        },
        include: {
          beneficiary: true,
          program: true,
          payouts: true,
        },
      });
      if (activePb) {
        pb = activePb;
        await prisma.qrCode.update({
          where: { id: qr.id },
          data: { programBeneficiaryId: activePb.id, status: "ACTIVE" },
        });
      }
    } else if (qr.status !== "ACTIVE") {
      await prisma.qrCode.update({
        where: { id: qr.id },
        data: { status: "ACTIVE" },
      });
    }

    const program = pb.program;
    const effectivePayoutDate = payoutDate || program.payoutDate || format(new Date(), "yyyy-MM-dd");

    // Atomic transaction for Payout + Automatic 365-Day Restriction + Audit
    const result = await prisma.$transaction(async (tx) => {
      // 1. Upsert Payout record
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

      // 2. If status is PAID, automatically enforce 365-day restriction
      let restriction = null;
      if (status === "PAID") {
        const startD = parseISO(effectivePayoutDate);
        const endD = addDays(startD, 365);
        const restrictionStartStr = format(startD, "yyyy-MM-dd");
        const restrictionEndStr = format(endD, "yyyy-MM-dd");

        restriction = await tx.beneficiaryRestriction.create({
          data: {
            beneficiaryId: pb.beneficiaryId,
            sourceProgramId: program.id,
            payoutDate: effectivePayoutDate,
            restrictionStart: restrictionStartStr,
            restrictionEnd: restrictionEndStr,
            reason: `365-day TUPAD payout restriction (${program.programName})`,
            status: "ACTIVE",
          },
        });
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
      message: `Payout successfully verified as ${status}!${result.restriction ? " 365-day restriction is now active." : ""}`,
      data: {
        designatedNumber: pb.designatedNumber,
        fullName: pb.beneficiary.fullName,
        barangay: pb.beneficiary.barangay,
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
