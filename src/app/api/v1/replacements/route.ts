export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { isAdminUser } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { generateBeneficiaryToken } from "@/lib/qr";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");

    const whereClause: any = {};
    if (programId) whereClause.programId = programId;

    const replacements = await prisma.beneficiaryReplacement.findMany({
      where: whereClause,
      include: {
        program: true,
        originalProgramBeneficiary: {
          include: {
            beneficiary: {
              include: { dependents: true },
            },
          },
        },
        replacementProgramBeneficiary: {
          include: {
            beneficiary: {
              include: {
                dependents: true,
                documents: true,
              },
            },
            qrCodes: true,
          },
        },
        initiatedBy: { select: { fullName: true, role: true } },
        approvedBy: { select: { fullName: true, role: true } },
      },
      orderBy: { initiatedAt: "desc" },
    });

    return NextResponse.json({ replacements });
  } catch (error: any) {
    console.error("GET replacements error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "replacement.create")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const {
      programId,
      originalProgramBeneficiaryId,
      reason,
      // Replacement beneficiary details
      fullName,
      lastName,
      firstName,
      middleName,
      birthday,
      sex,
      sitio,
      barangay,
      contactNumber,
      // Document files metadata (simulated/stored)
      idFrontFile,
      idBackFile,
    } = await request.json();

    if (!programId || !originalProgramBeneficiaryId || !reason || !fullName || !birthday) {
      return NextResponse.json({ error: "Original beneficiary, reason, replacement name, and birthday are required" }, { status: 400 });
    }

    // Step 3: Eligibility check for 365-day restriction
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
        { error: `Replacement beneficiary is restricted until ${restriction.restrictionEnd}: ${restriction.reason}` },
        { status: 400 }
      );
    }

    const originalPb = await prisma.programBeneficiary.findUnique({
      where: { id: originalProgramBeneficiaryId },
      include: { beneficiary: true, qrCodes: true, payouts: true },
    });

    if (!originalPb) {
      return NextResponse.json({ error: "Original beneficiary not found" }, { status: 404 });
    }

    if (originalPb.participationStatus === "REPLACED") {
      return NextResponse.json(
        { error: `CANNOT REPLACE: Beneficiary #${originalPb.designatedNumber} has already been replaced.` },
        { status: 400 }
      );
    }

    if (originalPb.payouts?.some((p) => p.status === "PAID")) {
      return NextResponse.json(
        { error: `CANNOT REPLACE: Beneficiary #${originalPb.designatedNumber} has already claimed payout.` },
        { status: 400 }
      );
    }

    const canApproveDirectly = hasPermission(user.role, "replacement.approve") || isAdminUser(user);
    const replacedRemarks = `Replaced - ${originalPb.beneficiary.fullName}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark original program beneficiary as REPLACED if approved directly, or FLAGGED_FOR_REPLACEMENT if pending
      await tx.programBeneficiary.update({
        where: { id: originalPb.id },
        data: { participationStatus: canApproveDirectly ? "REPLACED" : "FLAGGED_FOR_REPLACEMENT" },
      });

      // 2. Retain and transfer the original physical QR code to the new replacement beneficiary once approved
      let activeQr = originalPb.qrCodes.find((q) => q.status === "ACTIVE") || originalPb.qrCodes[0];

      // 3. Create or find replacement beneficiary
      let newBene = await tx.beneficiary.findFirst({
        where: {
          fullName: fullName.trim().toUpperCase(),
          birthday,
        },
      });

      if (!newBene) {
        newBene = await tx.beneficiary.create({
          data: {
            beneficiaryNumber: `BN-REP-${originalPb.designatedNumber}`,
            fullName: fullName.trim().toUpperCase(),
            lastName: lastName?.trim().toUpperCase(),
            firstName: firstName?.trim().toUpperCase(),
            middleName: middleName?.trim().toUpperCase(),
            birthday,
            sex: sex?.trim().toUpperCase(),
            sitio: sitio || originalPb.beneficiary.sitio,
            barangay: barangay || originalPb.beneficiary.barangay,
            municipality: "Dingalan",
            province: "Aurora",
            contactNumber,
            status: "ACTIVE",
          },
        });
      }

      // 4. Save ID documents if provided
      if (idFrontFile) {
        await tx.beneficiaryDocument.create({
          data: {
            beneficiaryId: newBene.id,
            documentType: "ID_FRONT",
            fileKey: idFrontFile.dataUrl || `id_front_${newBene.id}`,
            fileName: idFrontFile.name || "id_front.jpg",
            fileSize: idFrontFile.size || 1024,
            mimeType: idFrontFile.type || "image/jpeg",
            uploadedById: user.id,
            verificationStatus: "VERIFIED",
          },
        });
      }

      if (idBackFile) {
        await tx.beneficiaryDocument.create({
          data: {
            beneficiaryId: newBene.id,
            documentType: "ID_BACK",
            fileKey: idBackFile.dataUrl || `id_back_${newBene.id}`,
            fileName: idBackFile.name || "id_back.jpg",
            fileSize: idBackFile.size || 1024,
            mimeType: idBackFile.type || "image/jpeg",
            uploadedById: user.id,
            verificationStatus: "VERIFIED",
          },
        });
      }

      // 5. Create new ProgramBeneficiary record taking the same designated number and table
      const newPb = await tx.programBeneficiary.create({
        data: {
          programId,
          beneficiaryId: newBene.id,
          designatedNumber: originalPb.designatedNumber,
          participationStatus: canApproveDirectly ? "ACTIVE" : "PENDING_APPROVAL",
          originalBeneficiary: false,
          tableNumber: originalPb.tableNumber,
          slotGroup: originalPb.slotGroup,
        },
      });

      if (canApproveDirectly) {
        // 6. Re-bind the original physical QR code to the new active beneficiary slot
        if (activeQr) {
          activeQr = await tx.qrCode.update({
            where: { id: activeQr.id },
            data: {
              programBeneficiaryId: newPb.id,
              status: "ACTIVE",
              invalidatedAt: null,
              invalidatedById: null,
            },
          });
        } else {
          const qrData = generateBeneficiaryToken(programId, originalPb.designatedNumber);
          activeQr = await tx.qrCode.create({
            data: {
              programId,
              programBeneficiaryId: newPb.id,
              publicToken: qrData.publicToken,
              tokenHash: qrData.tokenHash,
              status: "ACTIVE",
              generatedById: user.id,
            },
          });
        }

        // 7. Create affirmed StubDistribution record with remarks: "Replaced - <Original Beneficiary Name>"
        await tx.stubDistribution.create({
          data: {
            qrId: activeQr.id,
            programBeneficiaryId: newPb.id,
            distributedById: user.id,
            verificationMethod: "ONSITE_REPLACEMENT",
            status: "DISTRIBUTED",
            remarks: replacedRemarks,
          },
        });
      }

      // 8. Log replacement record
      const rep = await tx.beneficiaryReplacement.create({
        data: {
          programId,
          originalProgramBeneficiaryId: originalPb.id,
          replacementProgramBeneficiaryId: newPb.id,
          reason,
          initiatedById: user.id,
          approvedById: canApproveDirectly ? user.id : null,
          approvedAt: canApproveDirectly ? new Date() : null,
          status: canApproveDirectly ? "APPROVED" : "PENDING",
        },
        include: {
          originalProgramBeneficiary: { include: { beneficiary: true } },
          replacementProgramBeneficiary: { include: { beneficiary: true, qrCodes: true } },
        },
      });

      return { rep, activeQr };
    });

    await logAudit({
      userId: user.id,
      action: "BENEFICIARY_REPLACED",
      entityType: "PROGRAM_BENEFICIARY",
      entityId: originalPb.id,
      metadata: {
        originalName: originalPb.beneficiary.fullName,
        replacementName: fullName,
        designatedNumber: originalPb.designatedNumber,
        reason,
      },
    });

    return NextResponse.json({ success: true, replacement: result.rep, qr: result.activeQr }, { status: 201 });
  } catch (error: any) {
    console.error("Replacement POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !hasPermission(user.role, "replacement.approve")) {
      return NextResponse.json(
        { error: "Forbidden: Only Admin and PESO Personnel are authorized to assess and approve replacements." },
        { status: 403 }
      );
    }

    const { id, replacementId, status, approvalRemarks } = await request.json();
    const targetId = id || replacementId;

    if (!targetId || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Replacement ID and valid status (APPROVED or REJECTED) are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.beneficiaryReplacement.findUnique({
      where: { id: targetId },
      include: {
        originalProgramBeneficiary: {
          include: {
            beneficiary: true,
            qrCodes: true,
          },
        },
        replacementProgramBeneficiary: {
          include: {
            beneficiary: {
              include: { dependents: true, documents: true },
            },
            qrCodes: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Replacement record not found" }, { status: 404 });
    }

    const originalBeneficiaryName = existing.originalProgramBeneficiary.beneficiary.fullName;
    const replacedRemarks = `Replaced - ${originalBeneficiaryName}`;

    const updated = await prisma.$transaction(
      async (tx) => {
        if (status === "APPROVED") {
          if (!existing.replacementProgramBeneficiaryId || !existing.replacementProgramBeneficiary) {
            throw new Error("Replacement candidate record is missing and cannot be approved.");
          }

          // 1. Mark Original ProgramBeneficiary as REPLACED
          await tx.programBeneficiary.update({
            where: { id: existing.originalProgramBeneficiaryId },
            data: { participationStatus: "REPLACED" },
          });

          // 2. Activate Replacement ProgramBeneficiary on the same designatedNumber & tableNumber
          await tx.programBeneficiary.update({
            where: { id: existing.replacementProgramBeneficiaryId },
            data: {
              participationStatus: "ACTIVE",
              designatedNumber: existing.originalProgramBeneficiary.designatedNumber,
              tableNumber: existing.originalProgramBeneficiary.tableNumber,
              slotGroup: existing.originalProgramBeneficiary.slotGroup,
            },
          });

          // 3. Transfer / re-bind the slot's active QR code to the newly approved Replacement ProgramBeneficiary
          let activeQr =
            existing.originalProgramBeneficiary.qrCodes.find((q) => q.status === "ACTIVE") ||
            existing.originalProgramBeneficiary.qrCodes[0] ||
            existing.replacementProgramBeneficiary.qrCodes.find((q) => q.status === "ACTIVE") ||
            existing.replacementProgramBeneficiary.qrCodes[0];

          if (activeQr) {
            activeQr = await tx.qrCode.update({
              where: { id: activeQr.id },
              data: {
                programBeneficiaryId: existing.replacementProgramBeneficiaryId,
                status: "ACTIVE",
                invalidatedAt: null,
                invalidatedById: null,
              },
            });
          } else {
            const qrData = generateBeneficiaryToken(
              existing.programId,
              existing.originalProgramBeneficiary.designatedNumber
            );
            activeQr = await tx.qrCode.create({
              data: {
                programId: existing.programId,
                programBeneficiaryId: existing.replacementProgramBeneficiaryId,
                publicToken: qrData.publicToken,
                tokenHash: qrData.tokenHash,
                status: "ACTIVE",
                generatedById: user.id,
              },
            });
          }

          // 4. Update original beneficiary's FLAGGED_REPLACEMENT stub distribution remarks
          await tx.stubDistribution.updateMany({
            where: {
              programBeneficiaryId: existing.originalProgramBeneficiaryId,
              status: "FLAGGED_REPLACEMENT",
            },
            data: {
              remarks: replacedRemarks,
            },
          });

          // 5. Create/update DISTRIBUTED StubDistribution on the replacement beneficiary with remarks "Replaced - <Original Beneficiary Name>"
          await tx.stubDistribution.deleteMany({
            where: { programBeneficiaryId: existing.replacementProgramBeneficiaryId },
          });
          await tx.stubDistribution.create({
            data: {
              qrId: activeQr.id,
              programBeneficiaryId: existing.replacementProgramBeneficiaryId,
              distributedById: user.id,
              verificationMethod: "ONSITE_REPLACEMENT_CONSENT",
              status: "DISTRIBUTED",
              remarks: replacedRemarks,
            },
          });
        } else if (status === "REJECTED") {
          // 1. Restore original beneficiary to ACTIVE
          await tx.programBeneficiary.update({
            where: { id: existing.originalProgramBeneficiaryId },
            data: { participationStatus: "ACTIVE" },
          });

          // 2. Remove FLAGGED_REPLACEMENT StubDistribution on original beneficiary
          await tx.stubDistribution.deleteMany({
            where: {
              programBeneficiaryId: existing.originalProgramBeneficiaryId,
              status: "FLAGGED_REPLACEMENT",
            },
          });

          // 3. Mark replacement candidate as WITHDRAWN and ensure QR code stays on original beneficiary
          if (existing.replacementProgramBeneficiaryId) {
            await tx.programBeneficiary.update({
              where: { id: existing.replacementProgramBeneficiaryId },
              data: { participationStatus: "WITHDRAWN" },
            });
            await tx.qrCode.updateMany({
              where: { programBeneficiaryId: existing.replacementProgramBeneficiaryId },
              data: {
                programBeneficiaryId: existing.originalProgramBeneficiaryId,
                status: "ACTIVE",
              },
            });
          }
        }

        return tx.beneficiaryReplacement.update({
          where: { id: targetId },
          data: {
            status,
            approvedById: user.id,
            approvedAt: new Date(),
            ...(approvalRemarks
              ? { reason: `${existing.reason} | Approval Note: ${approvalRemarks}` }
              : {}),
          },
          include: {
            originalProgramBeneficiary: { include: { beneficiary: true } },
            replacementProgramBeneficiary: {
              include: {
                beneficiary: { include: { dependents: true, documents: true } },
                qrCodes: true,
              },
            },
            initiatedBy: { select: { fullName: true } },
            approvedBy: { select: { fullName: true } },
          },
        });
      },
      { maxWait: 20000, timeout: 45000 }
    );

    await logAudit({
      userId: user.id,
      action: status === "APPROVED" ? "REPLACEMENT_APPROVED" : "REPLACEMENT_REJECTED",
      entityType: "BENEFICIARY_REPLACEMENT",
      entityId: updated.id,
      metadata: {
        status,
        designatedNumber: existing.originalProgramBeneficiary.designatedNumber,
        originalBeneficiaryName,
        replacementBeneficiaryName: existing.replacementProgramBeneficiary?.beneficiary?.fullName,
        remarks: status === "APPROVED" ? replacedRemarks : "REJECTED",
      },
    });

    return NextResponse.json({
      success: true,
      replacement: updated,
      remarks: status === "APPROVED" ? replacedRemarks : null,
      message:
        status === "APPROVED"
          ? `Approved! Slot #${existing.originalProgramBeneficiary.designatedNumber} is now assigned to ${updated.replacementProgramBeneficiary?.beneficiary?.fullName} with Remarks: "${replacedRemarks}".`
          : `Replacement request for Slot #${existing.originalProgramBeneficiary.designatedNumber} was rejected. Original beneficiary ${originalBeneficiaryName} remains active.`,
    });
  } catch (error: any) {
    console.error("Replacement PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
