import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { qrToken, deviceId } = await request.json();
    if (!qrToken) return NextResponse.json({ error: "QR Token is required" }, { status: 400 });

    let qr = await prisma.qrCode.findUnique({
      where: { publicToken: qrToken.trim() },
      include: {
        programBeneficiary: {
          include: {
            beneficiary: true,
            program: true,
            orientationAttendance: true,
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
          orientationAttendance: true,
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
    const existing = pb.orientationAttendance[0];

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyRecorded: true,
        message: `Beneficiary was already recorded as ${existing.status} at ${new Date(existing.scannedAt).toLocaleTimeString()}`,
        data: {
          designatedNumber: pb.designatedNumber,
          fullName: pb.beneficiary.fullName,
          barangay: pb.beneficiary.barangay,
          tableNumber: pb.tableNumber,
          status: existing.status,
          scannedAt: existing.scannedAt,
        },
      });
    }

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
      alreadyRecorded: false,
      message: "Orientation Attendance successfully recorded!",
      data: {
        designatedNumber: pb.designatedNumber,
        fullName: pb.beneficiary.fullName,
        barangay: pb.beneficiary.barangay,
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
