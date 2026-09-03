import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { matchesBirthdayPin, normalizeBarangayName } from "@/lib/utils";

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

    // Robust multi-format birthday comparison
    const isMatched = matchesBirthdayPin(pb.beneficiary.birthday, birthdayPin);

    if (!isMatched) {
      await logAudit({
        userId: user.id,
        action: "STUB_VERIFICATION_FAILED",
        entityType: "PROGRAM_BENEFICIARY",
        entityId: pb.id,
        metadata: { enteredPin: birthdayPin.trim(), deviceId },
      });
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: "Incorrect Birthday PIN. Please input in MM-DD-YYYY or YYYY-MM-DD format.",
        },
        { status: 400 }
      );
    }

    // PIN matched! Record stub distribution
    const activeQrId = qrId || pb.qrCodes.find((q) => q.status === "ACTIVE")?.id || pb.qrCodes[0]?.id;
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
        latitude: latitude ? Number(latitude) : 15.3941,
        longitude: longitude ? Number(longitude) : 121.3965,
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

    const normalizedBrgy = normalizeBarangayName(pb.beneficiary.barangay);

    return NextResponse.json({
      success: true,
      verified: true,
      message: "Stub distribution verified and recorded successfully!",
      data: {
        designatedNumber: pb.designatedNumber,
        fullName: pb.beneficiary.fullName,
        barangay: normalizedBrgy,
        tableNumber: pb.tableNumber || "Table 1",
      },
    });
  } catch (error: any) {
    console.error("Birthday verification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
