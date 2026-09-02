import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const beneficiary = await prisma.beneficiary.findUnique({
      where: { id: params.id },
      include: {
        programBeneficiaries: {
          include: {
            program: true,
            qrCodes: true,
            stubDistributions: true,
            orientationAttendance: true,
            attendanceRecords: true,
            payouts: true,
          },
        },
        restrictions: true,
        dependents: true,
        documents: true,
      },
    });

    if (!beneficiary) {
      return NextResponse.json({ error: "Beneficiary not found" }, { status: 404 });
    }

    return NextResponse.json({ beneficiary });
  } catch (error: any) {
    console.error("GET /beneficiaries/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "beneficiary.delete")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const beneficiary = await prisma.beneficiary.findUnique({
      where: { id: params.id },
      include: {
        programBeneficiaries: true,
      },
    });

    if (!beneficiary) {
      return NextResponse.json({ error: "Beneficiary not found" }, { status: 404 });
    }

    const affectedProgramIds = Array.from(new Set(beneficiary.programBeneficiaries.map((pb) => pb.programId)));

    await prisma.$transaction(async (tx) => {
      // For each program enrollment, delete child items
      for (const pb of beneficiary.programBeneficiaries) {
        await tx.attendanceRecord.deleteMany({ where: { programBeneficiaryId: pb.id } });
        await tx.orientationAttendance.deleteMany({ where: { programBeneficiaryId: pb.id } });
        await tx.stubDistribution.deleteMany({ where: { programBeneficiaryId: pb.id } });
        await tx.payout.deleteMany({ where: { programBeneficiaryId: pb.id } });
        await tx.qrCode.deleteMany({ where: { programBeneficiaryId: pb.id } });
        await tx.beneficiaryReplacement.deleteMany({
          where: {
            OR: [
              { originalProgramBeneficiaryId: pb.id },
              { replacementProgramBeneficiaryId: pb.id },
            ],
          },
        });
        await tx.programBeneficiary.delete({ where: { id: pb.id } });
      }

      // Decrement program beneficiary counts
      for (const progId of affectedProgramIds) {
        const count = beneficiary.programBeneficiaries.filter((pb) => pb.programId === progId).length;
        await tx.program.update({
          where: { id: progId },
          data: { beneficiaryCount: { decrement: count } },
        });
      }

      // Delete beneficiary children
      await tx.dependent.deleteMany({ where: { beneficiaryId: params.id } });
      await tx.beneficiaryDocument.deleteMany({ where: { beneficiaryId: params.id } });
      await tx.beneficiaryRestriction.deleteMany({ where: { beneficiaryId: params.id } });

      // Delete the beneficiary
      await tx.beneficiary.delete({ where: { id: params.id } });
    });

    await logAudit({
      userId: user.id,
      action: "BENEFICIARY_PERMANENTLY_DELETED",
      entityType: "BENEFICIARY",
      entityId: params.id,
      metadata: {
        beneficiaryNumber: beneficiary.beneficiaryNumber,
        fullName: beneficiary.fullName,
        barangay: beneficiary.barangay,
        programsAffected: affectedProgramIds,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Beneficiary "${beneficiary.fullName}" (${beneficiary.beneficiaryNumber}) deleted permanently.`,
    });
  } catch (error: any) {
    console.error("DELETE /beneficiaries/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "beneficiary.update")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const {
      fullName,
      lastName,
      firstName,
      middleName,
      extensionName,
      birthday,
      sex,
      civilStatus,
      contactNumber,
      barangay,
      sitio,
      municipality,
      province,
      occupation,
      idType,
      idNumber,
      isSenior,
      isPwd,
      is4Ps,
      isIp,
      status,
    } = body;

    const existing = await prisma.beneficiary.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Beneficiary not found" }, { status: 404 });
    }

    const bUpdateData: any = {};
    if (fullName !== undefined) bUpdateData.fullName = fullName.trim().toUpperCase();
    if (lastName !== undefined) bUpdateData.lastName = lastName?.trim().toUpperCase() || null;
    if (firstName !== undefined) bUpdateData.firstName = firstName?.trim().toUpperCase() || null;
    if (middleName !== undefined) bUpdateData.middleName = middleName?.trim().toUpperCase() || null;
    if (extensionName !== undefined) bUpdateData.extensionName = extensionName?.trim().toUpperCase() || null;
    if (birthday !== undefined) bUpdateData.birthday = birthday.trim();
    if (sex !== undefined) bUpdateData.sex = sex?.trim().toUpperCase() || null;
    if (civilStatus !== undefined) bUpdateData.civilStatus = civilStatus?.trim() || null;
    if (contactNumber !== undefined) bUpdateData.contactNumber = contactNumber?.trim() || null;
    if (barangay !== undefined) bUpdateData.barangay = barangay?.trim() || null;
    if (sitio !== undefined) bUpdateData.sitio = sitio?.trim() || null;
    if (municipality !== undefined) bUpdateData.municipality = municipality?.trim() || "Dingalan";
    if (province !== undefined) bUpdateData.province = province?.trim() || "Aurora";
    if (occupation !== undefined) bUpdateData.occupation = occupation?.trim() || null;
    if (idType !== undefined) bUpdateData.idType = idType?.trim() || null;
    if (idNumber !== undefined) bUpdateData.idNumber = idNumber?.trim() || null;
    if (isSenior !== undefined) bUpdateData.isSenior = Boolean(isSenior);
    if (isPwd !== undefined) bUpdateData.isPwd = Boolean(isPwd);
    if (is4Ps !== undefined) bUpdateData.is4Ps = Boolean(is4Ps);
    if (isIp !== undefined) bUpdateData.isIp = Boolean(isIp);
    if (status !== undefined) bUpdateData.status = status;

    if ((lastName || firstName) && !fullName) {
      bUpdateData.fullName = `${lastName || ""}, ${firstName || ""} ${middleName || ""}`.trim().replace(/\s+/g, " ").toUpperCase();
    }

    const updated = await prisma.beneficiary.update({
      where: { id: params.id },
      data: bUpdateData,
      include: {
        programBeneficiaries: {
          include: {
            program: true,
            qrCodes: true,
            orientationAttendance: true,
            attendanceRecords: true,
          },
        },
        restrictions: true,
        dependents: true,
        documents: true,
      },
    });

    await logAudit({
      userId: user.id,
      action: "BENEFICIARY_UPDATED",
      entityType: "BENEFICIARY",
      entityId: params.id,
      metadata: {
        beneficiaryNumber: updated.beneficiaryNumber,
        fullName: updated.fullName,
        changes: body,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Beneficiary "${updated.fullName}" updated successfully.`,
      beneficiary: updated,
    });
  } catch (error: any) {
    console.error("PATCH /beneficiaries/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

