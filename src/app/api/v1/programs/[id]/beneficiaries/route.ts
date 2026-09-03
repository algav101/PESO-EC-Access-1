import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const barangay = searchParams.get("barangay");
    const status = searchParams.get("status");
    const query = searchParams.get("q");

    const whereClause: any = { programId: params.id };
    if (status) whereClause.participationStatus = status;

    // Enforce coordinator barangay-level isolation
    if (user.role === "TUPAD_COORDINATOR" && user.assignedBarangay) {
      whereClause.beneficiary = { barangay: user.assignedBarangay };
    } else if (barangay) {
      whereClause.beneficiary = { barangay };
    }

    if (query) {
      whereClause.OR = [
        { designatedNumber: { contains: query } },
        { beneficiary: { fullName: { contains: query } } },
        { tableNumber: { contains: query } },
      ];
    }

    const beneficiaries = await prisma.programBeneficiary.findMany({
      where: whereClause,
      include: {
        beneficiary: {
          select: {
            id: true,
            beneficiaryNumber: true,
            fullName: true,
            lastName: true,
            firstName: true,
            middleName: true,
            extensionName: true,
            birthday: true,
            sex: true,
            civilStatus: true,
            contactNumber: true,
            barangay: true,
            sitio: true,
            municipality: true,
            province: true,
            occupation: true,
            idType: true,
            idNumber: true,
            isSenior: true,
            isPwd: true,
            is4Ps: true,
            isIp: true,
            status: true,
            restrictions: {
              where: { status: "ACTIVE" },
              select: { id: true, status: true, restrictionEnd: true, reason: true },
            },
          },
        },
        qrCodes: {
          where: { status: "ACTIVE" },
          select: { id: true, publicToken: true, status: true },
        },
        stubDistributions: {
          select: { id: true, status: true, distributedAt: true, verificationMethod: true, remarks: true },
        },
        orientationAttendance: {
          select: { id: true, status: true, scannedAt: true },
        },
        attendanceRecords: {
          select: { id: true, workDayId: true, morningTimeIn: true, morningTimeOut: true, afternoonTimeIn: true, afternoonTimeOut: true, status: true },
        },
        payouts: {
          select: { id: true, status: true, payoutDate: true, verifiedAt: true, remarks: true },
        },
      },
    });

    // Sort naturally by designated number (1, 2, 3, ... 10, 11, ... 100)
    beneficiaries.sort((a, b) => {
      const numA = parseInt(a.designatedNumber, 10);
      const numB = parseInt(b.designatedNumber, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return String(a.designatedNumber).localeCompare(String(b.designatedNumber), undefined, { numeric: true });
    });

    return NextResponse.json({ beneficiaries });
  } catch (error: any) {
    console.error("GET /programs/[id]/beneficiaries error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "beneficiary.create")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const {
      designatedNumber,
      fullName,
      lastName,
      firstName,
      middleName,
      birthday,
      sex,
      sitio,
      barangay,
      municipality = "Dingalan",
      province = "Aurora",
      contactNumber,
      tableNumber,
      slotGroup,
    } = body;

    if (!designatedNumber || !fullName || !birthday) {
      return NextResponse.json({ error: "Designated Number, Full Name, and Birthday are required" }, { status: 400 });
    }

    // Check 365-day restriction
    const todayStr = new Date().toISOString().split("T")[0];
    const restriction = await prisma.beneficiaryRestriction.findFirst({
      where: {
        beneficiary: { fullName: fullName.trim().toUpperCase(), birthday },
        status: "ACTIVE",
        restrictionEnd: { gte: todayStr },
      },
    });

    if (restriction) {
      return NextResponse.json(
        { error: `Beneficiary is restricted until ${restriction.restrictionEnd}: ${restriction.reason}` },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      let beneficiary = await tx.beneficiary.findFirst({
        where: {
          fullName: fullName.trim().toUpperCase(),
          birthday,
        },
      });

      if (!beneficiary) {
        beneficiary = await tx.beneficiary.create({
          data: {
            beneficiaryNumber: `BN-${String(designatedNumber).padStart(4, "0")}`,
            fullName: fullName.trim().toUpperCase(),
            lastName: lastName?.trim().toUpperCase(),
            firstName: firstName?.trim().toUpperCase(),
            middleName: middleName?.trim().toUpperCase(),
            birthday,
            sex: sex?.trim().toUpperCase(),
            sitio,
            barangay,
            municipality,
            province,
            contactNumber,
            status: "ACTIVE",
          },
        });
      }

      const progBeneficiary = await tx.programBeneficiary.create({
        data: {
          programId: params.id,
          beneficiaryId: beneficiary.id,
          designatedNumber: String(designatedNumber).trim(),
          participationStatus: "ACTIVE",
          originalBeneficiary: true,
          tableNumber,
          slotGroup: slotGroup || "Main",
        },
        include: {
          beneficiary: true,
        },
      });

      // Update program beneficiary count
      await tx.program.update({
        where: { id: params.id },
        data: { beneficiaryCount: { increment: 1 } },
      });

      return progBeneficiary;
    });

    await logAudit({
      userId: user.id,
      action: "BENEFICIARY_CREATED",
      entityType: "PROGRAM_BENEFICIARY",
      entityId: result.id,
      newData: { designatedNumber, name: fullName },
    });

    return NextResponse.json({ success: true, beneficiary: result }, { status: 201 });
  } catch (error: any) {
    console.error("POST /programs/[id]/beneficiaries error:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Designated number already assigned in this program" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "beneficiary.delete")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const programBeneficiaryId = searchParams.get("programBeneficiaryId");
    const beneficiaryId = searchParams.get("beneficiaryId");
    const deleteGlobal = searchParams.get("deleteGlobal") === "true";

    if (!programBeneficiaryId && !beneficiaryId) {
      return NextResponse.json(
        { error: "programBeneficiaryId or beneficiaryId is required" },
        { status: 400 }
      );
    }

    const targetPb = await prisma.programBeneficiary.findFirst({
      where: {
        programId: params.id,
        ...(programBeneficiaryId ? { id: programBeneficiaryId } : { beneficiaryId: beneficiaryId! }),
      },
      include: {
        beneficiary: true,
      },
    });

    if (!targetPb) {
      return NextResponse.json({ error: "Beneficiary entry not found in this program" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Delete child relations
      await tx.attendanceRecord.deleteMany({ where: { programBeneficiaryId: targetPb.id } });
      await tx.orientationAttendance.deleteMany({ where: { programBeneficiaryId: targetPb.id } });
      await tx.stubDistribution.deleteMany({ where: { programBeneficiaryId: targetPb.id } });
      await tx.payout.deleteMany({ where: { programBeneficiaryId: targetPb.id } });
      await tx.qrCode.deleteMany({ where: { programBeneficiaryId: targetPb.id } });
      await tx.beneficiaryReplacement.deleteMany({
        where: {
          OR: [
            { originalProgramBeneficiaryId: targetPb.id },
            { replacementProgramBeneficiaryId: targetPb.id },
          ],
        },
      });

      // Delete the ProgramBeneficiary entry
      await tx.programBeneficiary.delete({
        where: { id: targetPb.id },
      });

      // Decrement program beneficiary count
      await tx.program.update({
        where: { id: params.id },
        data: { beneficiaryCount: { decrement: 1 } },
      });

      // If deleteGlobal requested or if beneficiary has no other program enrollments, delete global beneficiary record
      if (deleteGlobal) {
        await tx.dependent.deleteMany({ where: { beneficiaryId: targetPb.beneficiaryId } });
        await tx.beneficiaryDocument.deleteMany({ where: { beneficiaryId: targetPb.beneficiaryId } });
        await tx.beneficiaryRestriction.deleteMany({ where: { beneficiaryId: targetPb.beneficiaryId } });
        await tx.beneficiary.delete({ where: { id: targetPb.beneficiaryId } });
      }
    });

    await logAudit({
      userId: user.id,
      action: "BENEFICIARY_DELETED",
      entityType: "PROGRAM_BENEFICIARY",
      entityId: targetPb.id,
      metadata: {
        programId: params.id,
        designatedNumber: targetPb.designatedNumber,
        fullName: targetPb.beneficiary.fullName,
        deleteGlobal,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted beneficiary #${targetPb.designatedNumber} (${targetPb.beneficiary.fullName})`,
    });
  } catch (error: any) {
    console.error("DELETE /programs/[id]/beneficiaries error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "PESO_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only PESO Admin accounts are authorized to manually edit beneficiary records." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      programBeneficiaryId,
      beneficiaryId,
      // Program Beneficiary fields
      participationStatus,
      designatedNumber,
      tableNumber,
      slotGroup,
      orientationStatus, // "PRESENT", "PENDING", "ABSENT"
      // Administrative Distribution & Replacement Override fields
      distributionStatus, // "DISTRIBUTED", "PENDING", "FLAGGED_REPLACEMENT"
      distributionMethod, // "MANUAL_ADMIN_OVERRIDE", "BIRTHDAY_PIN"
      replacementReason,
      replacementRemarks,
      // Beneficiary fields
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
      masterStatus,
    } = body;

    if (!programBeneficiaryId && !beneficiaryId) {
      return NextResponse.json(
        { error: "programBeneficiaryId or beneficiaryId is required" },
        { status: 400 }
      );
    }

    const targetPb = await prisma.programBeneficiary.findFirst({
      where: {
        programId: params.id,
        ...(programBeneficiaryId ? { id: programBeneficiaryId } : { beneficiaryId: beneficiaryId! }),
      },
      include: {
        beneficiary: true,
        orientationAttendance: true,
        qrCodes: true,
        stubDistributions: true,
      },
    });

    if (!targetPb) {
      return NextResponse.json({ error: "Beneficiary entry not found in this program" }, { status: 404 });
    }

    // Check designated number uniqueness if changed
    if (designatedNumber && String(designatedNumber).trim() !== targetPb.designatedNumber) {
      const duplicateDesig = await prisma.programBeneficiary.findFirst({
        where: {
          programId: params.id,
          designatedNumber: String(designatedNumber).trim(),
          id: { not: targetPb.id },
        },
      });
      if (duplicateDesig) {
        return NextResponse.json(
          { error: `Designated #${designatedNumber} is already assigned to another beneficiary in this program.` },
          { status: 400 }
        );
      }
    }

    const updatedPb = await prisma.$transaction(async (tx) => {
      // 1. Update ProgramBeneficiary fields
      const pbUpdateData: any = {};
      if (participationStatus !== undefined) pbUpdateData.participationStatus = participationStatus;
      if (designatedNumber !== undefined) pbUpdateData.designatedNumber = String(designatedNumber).trim();
      if (tableNumber !== undefined) pbUpdateData.tableNumber = tableNumber?.trim() || null;
      if (slotGroup !== undefined) pbUpdateData.slotGroup = slotGroup?.trim() || null;

      const updatedProgramBeneficiary = await tx.programBeneficiary.update({
        where: { id: targetPb.id },
        data: pbUpdateData,
      });

      // 2. Update underlying Beneficiary fields
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
      if (masterStatus !== undefined) bUpdateData.status = masterStatus;

      // Auto-compute fullName if names provided but fullName not explicitly set
      if ((lastName || firstName) && !fullName) {
        bUpdateData.fullName = `${lastName || ""}, ${firstName || ""} ${middleName || ""}`.trim().replace(/\s+/g, " ").toUpperCase();
      }

      if (Object.keys(bUpdateData).length > 0) {
        await tx.beneficiary.update({
          where: { id: targetPb.beneficiaryId },
          data: bUpdateData,
        });
      }

      // 3. Update Orientation status if requested
      if (orientationStatus !== undefined) {
        if (orientationStatus === "PRESENT") {
          await tx.orientationAttendance.upsert({
            where: {
              programId_programBeneficiaryId: {
                programId: params.id,
                programBeneficiaryId: targetPb.id,
              },
            },
            update: { status: "PRESENT", scannedAt: new Date() },
            create: {
              programId: params.id,
              programBeneficiaryId: targetPb.id,
              status: "PRESENT",
              scannedById: user.id,
            },
          });
        } else if (orientationStatus === "PENDING" || orientationStatus === "ABSENT") {
          await tx.orientationAttendance.deleteMany({
            where: {
              programId: params.id,
              programBeneficiaryId: targetPb.id,
            },
          });
        }
      }

      // 4. Update Stub Distribution & Affirmation / Flag for Replacement status if requested
      if (distributionStatus !== undefined) {
        if (distributionStatus === "DISTRIBUTED") {
          let activeQr = targetPb.qrCodes.find((q: any) => q.status === "ACTIVE") || targetPb.qrCodes[0];
          if (!activeQr) {
            const qrData = generateBeneficiaryToken(params.id, targetPb.designatedNumber);
            activeQr = await tx.qrCode.create({
              data: {
                programId: params.id,
                programBeneficiaryId: targetPb.id,
                publicToken: qrData.publicToken,
                tokenHash: qrData.tokenHash,
                status: "ACTIVE",
              },
            });
          }

          // Clear any existing distribution/flagging
          await tx.stubDistribution.deleteMany({
            where: { programBeneficiaryId: targetPb.id },
          });

          await tx.stubDistribution.create({
            data: {
              qrId: activeQr.id,
              programBeneficiaryId: targetPb.id,
              distributedById: user.id,
              verificationMethod: distributionMethod || "MANUAL_ADMIN_OVERRIDE",
              status: "DISTRIBUTED",
              remarks: replacementRemarks || "PESO Admin manual distribution & affirmation override",
              latitude: 15.3941,
              longitude: 121.3965,
              deviceId: "ADMIN_CONSOLE",
            },
          });

          // Ensure participation status is ACTIVE
          await tx.programBeneficiary.update({
            where: { id: targetPb.id },
            data: { participationStatus: "ACTIVE" },
          });
        } else if (distributionStatus === "PENDING") {
          // Reset / clear distribution records
          await tx.stubDistribution.deleteMany({
            where: { programBeneficiaryId: targetPb.id },
          });

          // Restore participation status to ACTIVE if it was FLAGGED_FOR_REPLACEMENT
          if (targetPb.participationStatus === "FLAGGED_FOR_REPLACEMENT") {
            await tx.programBeneficiary.update({
              where: { id: targetPb.id },
              data: { participationStatus: "ACTIVE" },
            });
          }
        } else if (distributionStatus === "FLAGGED_REPLACEMENT") {
          let activeQr = targetPb.qrCodes.find((q: any) => q.status === "ACTIVE") || targetPb.qrCodes[0];
          if (!activeQr) {
            const qrData = generateBeneficiaryToken(params.id, targetPb.designatedNumber);
            activeQr = await tx.qrCode.create({
              data: {
                programId: params.id,
                programBeneficiaryId: targetPb.id,
                publicToken: qrData.publicToken,
                tokenHash: qrData.tokenHash,
                status: "ACTIVE",
              },
            });
          }

          await tx.stubDistribution.deleteMany({
            where: { programBeneficiaryId: targetPb.id },
          });

          const combinedReason = replacementReason
            ? `${replacementReason}${replacementRemarks ? ` - ${replacementRemarks}` : ""}`
            : replacementRemarks || "Flagged for replacement by PESO Admin";

          await tx.stubDistribution.create({
            data: {
              qrId: activeQr.id,
              programBeneficiaryId: targetPb.id,
              distributedById: user.id,
              verificationMethod: "ADMIN_FLAG",
              status: "FLAGGED_REPLACEMENT",
              remarks: combinedReason,
              latitude: 15.3941,
              longitude: 121.3965,
              deviceId: "ADMIN_CONSOLE",
            },
          });

          await tx.programBeneficiary.update({
            where: { id: targetPb.id },
            data: { participationStatus: "FLAGGED_FOR_REPLACEMENT" },
          });
        }
      }

      // Fetch the full updated record to return
      return await tx.programBeneficiary.findUnique({
        where: { id: targetPb.id },
        include: {
          beneficiary: {
            include: {
              restrictions: { where: { status: "ACTIVE" } },
              dependents: true,
              documents: true,
            },
          },
          qrCodes: true,
          stubDistributions: true,
          orientationAttendance: true,
          attendanceRecords: true,
          payouts: true,
        },
      });
    });

    await logAudit({
      userId: user.id,
      action: "BENEFICIARY_UPDATED",
      entityType: "PROGRAM_BENEFICIARY",
      entityId: targetPb.id,
      metadata: {
        programId: params.id,
        designatedNumber: updatedPb?.designatedNumber,
        fullName: updatedPb?.beneficiary?.fullName,
        changes: body,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Beneficiary #${updatedPb?.designatedNumber} (${updatedPb?.beneficiary?.fullName}) updated successfully.`,
      beneficiary: updatedPb,
    });
  } catch (error: any) {
    console.error("PATCH /programs/[id]/beneficiaries error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
