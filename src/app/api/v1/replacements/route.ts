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

    const body = await request.json();
    const {
      programId,
      originalProgramBeneficiaryId,
      programBeneficiaryId,
      reason,
      remarks,
      // Dependent details
      dependentFullName,
      dependentRelationship,
      dependentBirthday,
      dependentAge,
      dependentIdType,
      dependentIdNumber,
      // Consent details
      relationshipWithReplacement,
      originalBirthdayPin,
      originalConsentConfirmed,
      // 4 ID Uploaded Documents
      applicantIdFront,
      applicantIdBack,
      dependentIdFront,
      dependentIdBack,
      idFrontFile,
      idBackFile,
    } = body || {};

    const targetOrigPbId = originalProgramBeneficiaryId || programBeneficiaryId;
    const applicantName = (body?.fullName || body?.applicantFullName || body?.replacementApplicantFullName || "").trim();
    const applicantBday = (body?.birthday || body?.applicantBirthday || body?.replacementApplicantBirthday || "").trim();
    const applicantSex = (body?.sex || body?.applicantSex || body?.replacementApplicantSex || "FEMALE").trim().toUpperCase();
    const applicantSitio = body?.sitio || body?.applicantSitio || body?.replacementApplicantSitio;
    const applicantBrgy = body?.barangay || body?.applicantBarangay || body?.replacementApplicantBarangay;
    const applicantContact = body?.contactNumber || body?.applicantContactNumber || body?.replacementApplicantContact;
    const applicantIdTypeVal = body?.idType || body?.applicantIdType || body?.replacementApplicantIdType;
    const applicantIdNumVal = body?.idNumber || body?.applicantIdNumber || body?.replacementApplicantIdNumber;

    if (!programId || !targetOrigPbId || !reason || !applicantName || !applicantBday) {
      return NextResponse.json(
        { error: "Original beneficiary, reason, replacement applicant full name, and birthday are required." },
        { status: 400 }
      );
    }

    // Step 3: Eligibility check for 365-day restriction
    const todayStr = new Date().toISOString().split("T")[0];
    const restriction = await prisma.beneficiaryRestriction.findFirst({
      where: {
        beneficiary: { fullName: applicantName.toUpperCase(), birthday: applicantBday },
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
      where: { id: targetOrigPbId },
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

    // Collect all documents provided
    const docPayloads: Array<{ docType: string; file: any; defaultName: string }> = [];
    const front = applicantIdFront || idFrontFile;
    const back = applicantIdBack || idBackFile;
    if (front) docPayloads.push({ docType: "ID_FRONT", file: front, defaultName: "applicant_id_front.jpg" });
    if (back) docPayloads.push({ docType: "ID_BACK", file: back, defaultName: "applicant_id_back.jpg" });
    if (dependentIdFront) docPayloads.push({ docType: "DEPENDENT_ID_FRONT", file: dependentIdFront, defaultName: "dependent_id_front.jpg" });
    if (dependentIdBack) docPayloads.push({ docType: "DEPENDENT_ID_BACK", file: dependentIdBack, defaultName: "dependent_id_back.jpg" });

    // Pre-fetch replacement beneficiary outside transaction
    const existingCandidate = await prisma.beneficiary.findFirst({
      where: {
        fullName: applicantName.toUpperCase(),
        birthday: applicantBday,
      },
    });

    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Mark original program beneficiary as REPLACED if approved directly, or FLAGGED_FOR_REPLACEMENT if pending
        await tx.programBeneficiary.update({
          where: { id: originalPb.id },
          data: { participationStatus: canApproveDirectly ? "REPLACED" : "FLAGGED_FOR_REPLACEMENT" },
        });

        // 2. Retain original active QR
        let activeQr = originalPb.qrCodes.find((q) => q.status === "ACTIVE") || originalPb.qrCodes[0];

        // 3. Create or update candidate beneficiary
        let newBene = existingCandidate;
        if (!newBene) {
          newBene = await tx.beneficiary.create({
            data: {
              beneficiaryNumber: `BN-REP-${originalPb.designatedNumber}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
              fullName: applicantName.toUpperCase(),
              lastName: body?.lastName?.trim()?.toUpperCase() || null,
              firstName: body?.firstName?.trim()?.toUpperCase() || null,
              middleName: body?.middleName?.trim()?.toUpperCase() || null,
              birthday: applicantBday,
              sex: applicantSex,
              sitio: applicantSitio || originalPb.beneficiary.sitio,
              barangay: applicantBrgy || originalPb.beneficiary.barangay,
              municipality: "Dingalan",
              province: "Aurora",
              contactNumber: applicantContact || null,
              idType: applicantIdTypeVal || null,
              idNumber: applicantIdNumVal || null,
              status: "ACTIVE",
            },
          });
        } else {
          newBene = await tx.beneficiary.update({
            where: { id: newBene.id },
            data: {
              sex: applicantSex || newBene.sex,
              sitio: applicantSitio || newBene.sitio,
              barangay: applicantBrgy || newBene.barangay,
              contactNumber: applicantContact || newBene.contactNumber,
              idType: applicantIdTypeVal || newBene.idType,
              idNumber: applicantIdNumVal || newBene.idNumber,
              status: "ACTIVE",
            },
          });
        }

        // 4. Upsert Dependent if provided
        if (dependentFullName && String(dependentFullName).trim()) {
          await tx.dependent.deleteMany({ where: { beneficiaryId: newBene.id } });
          await tx.dependent.create({
            data: {
              beneficiaryId: newBene.id,
              fullName: String(dependentFullName).trim().toUpperCase(),
              relationship: (dependentRelationship || "DEPENDENT").trim().toUpperCase(),
              birthday: dependentBirthday || null,
              age: dependentAge ? parseInt(String(dependentAge), 10) || null : null,
            },
          });
        }

        // 5. Batch-create uploaded ID documents
        if (docPayloads.length > 0) {
          const docTypeKeys = docPayloads.map((d) => d.docType);
          await tx.beneficiaryDocument.deleteMany({
            where: {
              beneficiaryId: newBene.id,
              documentType: { in: docTypeKeys },
            },
          });

          await tx.beneficiaryDocument.createMany({
            data: docPayloads.map((item) => {
              const f = item.file || {};
              return {
                beneficiaryId: newBene!.id,
                documentType: item.docType,
                fileKey: f.dataUrl || `rep_${item.docType.toLowerCase()}_${newBene!.id}`,
                fileName: f.name || item.defaultName,
                fileSize: Number(f.size) || 2048,
                mimeType: f.type || "image/jpeg",
                uploadedById: user.id,
                verificationStatus: "VERIFIED",
              };
            }),
          });
        }

        // 6. Create candidate ProgramBeneficiary
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
          // 7. Re-bind active QR code to the new approved candidate
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

          // 8. Create affirmed StubDistribution with remarks "Replaced - <Original Beneficiary Name>"
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
        } else {
          // If pending, record FLAGGED_REPLACEMENT on original beneficiary
          if (activeQr) {
            await tx.stubDistribution.deleteMany({
              where: { programBeneficiaryId: originalPb.id, status: "FLAGGED_REPLACEMENT" },
            });
            await tx.stubDistribution.create({
              data: {
                qrId: activeQr.id,
                programBeneficiaryId: originalPb.id,
                distributedById: user.id,
                verificationMethod: "ORIGINAL_BENEFICIARY_CONSENT_PIN",
                status: "FLAGGED_REPLACEMENT",
                remarks: `Pending Admin/PESO Approval — Candidate: ${applicantName.toUpperCase()} | Reason: ${reason}${
                  remarks ? ` (${remarks})` : ""
                }`,
              },
            });
          }
        }

        // 9. Create BeneficiaryReplacement record
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

        return { rep, activeQr };
      },
      { maxWait: 20000, timeout: 45000 }
    );

    await logAudit({
      userId: user.id,
      action: "BENEFICIARY_REPLACED",
      entityType: "PROGRAM_BENEFICIARY",
      entityId: originalPb.id,
      metadata: {
        originalName: originalPb.beneficiary.fullName,
        replacementName: applicantName,
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
