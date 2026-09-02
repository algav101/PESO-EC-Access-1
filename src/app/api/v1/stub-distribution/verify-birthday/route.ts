import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { formatBirthdayPin } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { qrId, programBeneficiaryId, birthdayPin, latitude, longitude, deviceId } = await request.json();

    if (!programBeneficiaryId || !birthdayPin) {
      return NextResponse.json({ error: "Program beneficiary ID and birthday PIN are required" }, { status: 400 });
    }

    const pb = await prisma.programBeneficiary.findUnique({
      where: { id: programBeneficiaryId },
      include: {
        beneficiary: true,
        qrCodes: true,
      },
    });

    if (!pb) {
      return NextResponse.json({ error: "Beneficiary not found" }, { status: 404 });
    }

    // Format beneficiary birthday into MM-DD-YYYY for comparison
    const expectedPin = formatBirthdayPin(pb.beneficiary.birthday);
    const cleanedEntered = birthdayPin.trim().replace(/\//g, "-");

    if (cleanedEntered !== expectedPin) {
      await logAudit({
        userId: user.id,
        action: "STUB_VERIFICATION_FAILED",
        entityType: "PROGRAM_BENEFICIARY",
        entityId: pb.id,
        metadata: { enteredPin: cleanedEntered, deviceId },
      });
      return NextResponse.json({ success: false, verified: false, error: "Incorrect Birthday PIN" }, { status: 400 });
    }

    // PIN matched! Record stub distribution
    const activeQrId = qrId || pb.qrCodes.find((q) => q.status === "ACTIVE")?.id;
    if (!activeQrId) {
      return NextResponse.json({ error: "Active QR Code not found for this beneficiary" }, { status: 400 });
    }

    const dist = await prisma.stubDistribution.create({
      data: {
        qrId: activeQrId,
        programBeneficiaryId: pb.id,
        distributedById: user.id,
        verificationMethod: "BIRTHDAY_PIN",
        status: "DISTRIBUTED",
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        deviceId: deviceId || "BROWSER",
      },
    });

    await logAudit({
      userId: user.id,
      action: "STUB_DISTRIBUTED",
      entityType: "PROGRAM_BENEFICIARY",
      entityId: pb.id,
      metadata: { designatedNumber: pb.designatedNumber, distributionId: dist.id },
    });

    return NextResponse.json({
      success: true,
      verified: true,
      message: "Stub distribution verified and recorded successfully!",
      data: {
        designatedNumber: pb.designatedNumber,
        fullName: pb.beneficiary.fullName,
        barangay: pb.beneficiary.barangay,
        tableNumber: pb.tableNumber,
      },
    });
  } catch (error: any) {
    console.error("Birthday verification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
