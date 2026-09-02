import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { qrToken } = await request.json();
    if (!qrToken) return NextResponse.json({ error: "QR Token is required" }, { status: 400 });

    let qr = await prisma.qrCode.findUnique({
      where: { publicToken: qrToken.trim() },
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
          stubDistributions: true,
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

    const isDistributed = pb.stubDistributions?.some((d) => d.status === "DISTRIBUTED") || false;

    return NextResponse.json({
      success: true,
      data: {
        qrId: qr.id,
        programBeneficiaryId: pb.id,
        designatedNumber: pb.designatedNumber,
        fullName: pb.beneficiary.fullName,
        barangay: pb.beneficiary.barangay,
        sitio: pb.beneficiary.sitio,
        tableNumber: pb.tableNumber,
        programName: pb.program.programName,
        isDistributed,
        // Notice: stored birthday is NOT sent to client to protect security
      },
    });
  } catch (error: any) {
    console.error("Stub scan error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
