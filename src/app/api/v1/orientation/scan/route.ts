import { resolveProgramScan, ProgramScanError } from "@/lib/program-scan-resolver";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { normalizeBarangayName } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.role, "orientation.scan")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions for orientation scanning" }, { status: 403 });
    }

    const body = await request.json();
    const rawQrToken = (body.qrToken || body.token || "").toString().trim();
    const deviceId = body.deviceId;
    const programIdParam = body.programId;

    if (!rawQrToken) {
      return NextResponse.json({ error: "QR Token or Beneficiary number is required" }, { status: 400 });
    }

    const { pb, qr } = await resolveProgramScan(rawQrToken, programIdParam, {
      beneficiary: true, program: true, qrCodes: true,
      orientationAttendance: { where: { programId: programIdParam }, include: { scannedBy: { select: { fullName: true } } }, orderBy: { scannedAt: "desc" } },
      stubDistributions: { where: { status: "DISTRIBUTED" } },
    });

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
    if (error instanceof ProgramScanError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Orientation scan error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
