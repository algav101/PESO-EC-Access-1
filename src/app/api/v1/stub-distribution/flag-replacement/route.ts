export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { generateBeneficiaryToken } from "@/lib/qr";
import { normalizeBarangayName } from "@/lib/utils";
import {
  evaluatePersonTupadEligibility,
  normalizeBirthdayComparison,
  toIsoBirthday,
} from "@/lib/replacement-eligibility";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      programBeneficiaryId,
      reason,
      remarks,
      // Dependent fields
      dependentFullName,
      dependentRelationship,
      dependentBirthday,
      dependentAge,
      dependentIdType,
      dependentIdNumber,
      // Original Beneficiary Consent fields
      relationshipWithReplacement,
      // 4 ID Captures (Front & Back of Replacement Applicant and Dependent)
      applicantIdFront,
      applicantIdBack,
      dependentIdFront,
      dependentIdBack,
    } = body || {};

    const applicantFullName =
      body?.applicantFullName ?? body?.replacementApplicantFullName;
    const applicantBirthday =
      body?.applicantBirthday ?? body?.replacementApplicantBirthday;
    const applicantSex =
      body?.applicantSex ?? body?.replacementApplicantSex;
    const applicantContactNumber =
      body?.applicantContactNumber ?? body?.replacementApplicantContact;
    const applicantBarangay =
      body?.applicantBarangay ?? body?.replacementApplicantBarangay;
    const applicantSitio =
      body?.applicantSitio ?? body?.replacementApplicantSitio;
    const applicantIdType =
      body?.applicantIdType ?? body?.replacementApplicantIdType;
    const applicantIdNumber =
      body?.applicantIdNumber ?? body?.replacementApplicantIdNumber;
    const originalBirthdayPin =
      body?.originalBirthdayPin ?? body?.originalBeneficiaryBirthdayPin;
    const originalConsentConfirmed =
      body?.originalConsentConfirmed ?? body?.consentConfirmed;

    if (!programBeneficiaryId || !reason) {
      return NextResponse.json(
        { error: "Original beneficiary ID and reason for replacement are required." },
        { status: 400 }
      );
    }

    if (!String(applicantFullName || "").trim() || !String(dependentFullName || "").trim()) {
      return NextResponse.json(
        { error: "Full Name of both the Replacement Applicant and Dependent are required." },
        { status: 400 }
      );
    }

    if (!String(applicantBirthday || "").trim()) {
      return NextResponse.json(
        { error: "Replacement Applicant birthday is required." },
        { status: 400 }
      );
    }

    if (!String(originalBirthdayPin || "").trim() || !String(relationshipWithReplacement || "").trim() || !originalConsentConfirmed) {
      return NextResponse.json(
        {
          error:
            "Original beneficiary consent is required (enter Original Beneficiary's Birthday PIN, relationship with the replacement, and confirm consent).",
        },
        { status: 400 }
      );
    }

    if (!applicantIdFront || !applicantIdBack || !dependentIdFront || !dependentIdBack) {
      return NextResponse.json(
        {
          error:
            "Front and Back ID captures for both the Replacement Applicant and Dependent are required.",
        },
        { status: 400 }
      );
    }

    const pb = await prisma.programBeneficiary.findUnique({
      where: { id: programBeneficiaryId },
      include: {
        beneficiary: true,
        qrCodes: { where: { status: "ACTIVE" } },
        payouts: true,
      },
    });

    if (!pb) {
      return NextResponse.json({ error: "Original beneficiary not found." }, { status: 404 });
    }

    if (pb.participationStatus === "REPLACED") {
      return NextResponse.json(
        { error: `Beneficiary #${pb.designatedNumber} has already been replaced.` },
        { status: 400 }
      );
    }

    if (pb.payouts?.some((p) => p.status === "PAID")) {
      return NextResponse.json(
        { error: `Cannot replace Beneficiary #${pb.designatedNumber} because payout was already claimed.` },
        { status: 400 }
      );
    }

    // 1. Verify Original Beneficiary's Birthday PIN for Consent
    const expectedPin = normalizeBirthdayComparison(pb.beneficiary.birthday);
    const enteredPin = normalizeBirthdayComparison(originalBirthdayPin);
    if (!enteredPin || (expectedPin && enteredPin !== expectedPin)) {
      return NextResponse.json(
        {
          error: `Original Beneficiary Birthday PIN (${originalBirthdayPin}) does not match our official record for ${pb.beneficiary.fullName}. Consent verification failed.`,
        },
        { status: 400 }
      );
    }

    // 2. Verify Eligibility of Replacement Applicant AND Dependent
    const [applicantEval, dependentEval] = await Promise.all([
      evaluatePersonTupadEligibility({
        fullName: applicantFullName,
        birthday: applicantBirthday,
        programId: pb.programId,
        excludeProgramBeneficiaryId: pb.id,
        roleLabel: "APPLICANT",
      }),
      evaluatePersonTupadEligibility({
        fullName: dependentFullName,
        birthday: dependentBirthday,
        programId: pb.programId,
        excludeProgramBeneficiaryId: pb.id,
        roleLabel: "DEPENDENT",
      }),
    ]);

    if (!applicantEval.eligible) {
      return NextResponse.json({ error: `Replacement Applicant — ${applicantEval.reason}` }, { status: 400 });
    }

    if (!dependentEval.eligible) {
      return NextResponse.json({ error: `Dependent — ${dependentEval.reason}` }, { status: 400 });
    }

    if (applicantEval.normalizedFullName === dependentEval.normalizedFullName) {
      return NextResponse.json(
        { error: "Replacement Applicant and Dependent cannot be the same person." },
        { status: 400 }
      );
    }

    const isoApplicantBirthday = toIsoBirthday(applicantBirthday) || String(applicantBirthday).trim();
    const resolvedBarangay = normalizeBarangayName(applicantBarangay || pb.beneficiary.barangay || "Dingalan");
    const resolvedSitio = (applicantSitio || pb.beneficiary.sitio || "Centro").trim();
    const activeQr = pb.qrCodes[0];
    const parsedDepAge = dependentAge ? parseInt(String(dependentAge), 10) || null : null;
    const summaryRemarks = `Replaced ${pb.beneficiary.fullName} (Consent Verified via Birthday PIN • Relationship: ${relationshipWithReplacement.trim().toUpperCase()}) with ${applicantEval.normalizedFullName} (Dependent: ${dependentEval.normalizedFullName}) — Reason: ${reason}${remarks ? ` (${remarks})` : ""}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark original ProgramBeneficiary as REPLACED
      await tx.programBeneficiary.update({
        where: { id: pb.id },
        data: { participationStatus: "REPLACED" },
      });

      // 2. Record audit StubDistribution on original beneficiary
      if (activeQr) {
        await tx.stubDistribution.create({
          data: {
            qrId: activeQr.id,
            programBeneficiaryId: pb.id,
            distributedById: user.id,
            verificationMethod: "ORIGINAL_BENEFICIARY_CONSENT_PIN",
            status: "FLAGGED_REPLACEMENT",
            remarks: summaryRemarks,
          },
        });
      }

      // 3. Create or update Replacement Beneficiary
      let newBene = await tx.beneficiary.findFirst({
        where: {
          fullName: applicantEval.normalizedFullName,
          birthday: isoApplicantBirthday,
        },
      });

      if (!newBene) {
        newBene = await tx.beneficiary.create({
          data: {
            beneficiaryNumber: `BN-REP-${pb.designatedNumber}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
            fullName: applicantEval.normalizedFullName,
            lastName: applicantEval.parsedName.lastName,
            firstName: applicantEval.parsedName.firstName,
            middleName: applicantEval.parsedName.middleName || null,
            extensionName: applicantEval.parsedName.extensionName || null,
            birthday: isoApplicantBirthday,
            sex: (applicantSex || pb.beneficiary.sex || "FEMALE").toUpperCase(),
            barangay: resolvedBarangay,
            sitio: resolvedSitio,
            municipality: "Dingalan",
            province: "Aurora",
            contactNumber: applicantContactNumber || null,
            idType: applicantIdType || null,
            idNumber: applicantIdNumber || null,
            status: "ACTIVE",
          },
        });
      } else {
        newBene = await tx.beneficiary.update({
          where: { id: newBene.id },
          data: {
            sex: (applicantSex || newBene.sex || "FEMALE").toUpperCase(),
            barangay: resolvedBarangay,
            sitio: resolvedSitio,
            contactNumber: applicantContactNumber || newBene.contactNumber,
            idType: applicantIdType || newBene.idType,
            idNumber: applicantIdNumber || newBene.idNumber,
            status: "ACTIVE",
          },
        });
      }

      // 4. Upsert Dependent for Replacement Beneficiary
      await tx.dependent.deleteMany({ where: { beneficiaryId: newBene.id } });
      const createdDependent = await tx.dependent.create({
        data: {
          beneficiaryId: newBene.id,
          fullName: dependentEval.normalizedFullName,
          lastName: dependentEval.parsedName.lastName,
          firstName: dependentEval.parsedName.firstName,
          middleName: dependentEval.parsedName.middleName || null,
          extensionName: dependentEval.parsedName.extensionName || null,
          relationship: (dependentRelationship || "DEPENDENT").trim().toUpperCase(),
          birthday: toIsoBirthday(dependentBirthday) || dependentBirthday || null,
          age: parsedDepAge,
        },
      });

      // 5. Save all 4 ID Documents (Applicant Front/Back & Dependent Front/Back)
      const docPayloads = [
        { docType: "ID_FRONT", file: applicantIdFront, defaultName: "applicant_id_front.jpg" },
        { docType: "ID_BACK", file: applicantIdBack, defaultName: "applicant_id_back.jpg" },
        { docType: "DEPENDENT_ID_FRONT", file: dependentIdFront, defaultName: "dependent_id_front.jpg" },
        { docType: "DEPENDENT_ID_BACK", file: dependentIdBack, defaultName: "dependent_id_back.jpg" },
      ];

      for (const item of docPayloads) {
        const f = item.file || {};
        await tx.beneficiaryDocument.create({
          data: {
            beneficiaryId: newBene.id,
            documentType: item.docType,
            fileKey: f.dataUrl || `replacement_${item.docType.toLowerCase()}_${newBene.id}`,
            fileName: f.name || item.defaultName,
            fileSize: Number(f.size) || 2048,
            mimeType: f.type || "image/jpeg",
            uploadedById: user.id,
            verificationStatus: "VERIFIED",
          },
        });
      }

      // 6. Create Replacement ProgramBeneficiary occupying the same slot & table
      const newPb = await tx.programBeneficiary.create({
        data: {
          programId: pb.programId,
          beneficiaryId: newBene.id,
          designatedNumber: pb.designatedNumber,
          participationStatus: "ACTIVE",
          originalBeneficiary: false,
          tableNumber: pb.tableNumber,
          slotGroup: pb.slotGroup,
        },
      });

      // 7. Re-bind the slot's active QR code to the replacement ProgramBeneficiary
      let assignedQr = activeQr;
      if (assignedQr) {
        assignedQr = await tx.qrCode.update({
          where: { id: assignedQr.id },
          data: {
            programBeneficiaryId: newPb.id,
            status: "ACTIVE",
            invalidatedAt: null,
            invalidatedById: null,
          },
        });
      } else {
        const qrData = generateBeneficiaryToken(pb.programId, pb.designatedNumber);
        assignedQr = await tx.qrCode.create({
          data: {
            programId: pb.programId,
            programBeneficiaryId: newPb.id,
            publicToken: qrData.publicToken,
            tokenHash: qrData.tokenHash,
            status: "ACTIVE",
            generatedById: user.id,
          },
        });
      }

      // 8. Create StubDistribution record for the replacement beneficiary
      await tx.stubDistribution.create({
        data: {
          qrId: assignedQr.id,
          programBeneficiaryId: newPb.id,
          distributedById: user.id,
          verificationMethod: "ONSITE_REPLACEMENT_CONSENT",
          status: "DISTRIBUTED",
          remarks: summaryRemarks,
        },
      });

      // 9. Create BeneficiaryReplacement audit record
      const replacementRecord = await tx.beneficiaryReplacement.create({
        data: {
          programId: pb.programId,
          originalProgramBeneficiaryId: pb.id,
          replacementProgramBeneficiaryId: newPb.id,
          reason: `${reason} | Original Consent Relationship: ${relationshipWithReplacement.trim().toUpperCase()} | Dependent: ${dependentEval.normalizedFullName}${remarks ? ` | ${remarks}` : ""}`,
          initiatedById: user.id,
          approvedById: user.id,
          approvedAt: new Date(),
          status: "APPROVED",
        },
      });

      return {
        newBene,
        newPb,
        createdDependent,
        assignedQr,
        replacementRecord,
      };
    });

    await logAudit({
      userId: user.id,
      action: "STUB_DISTRIBUTION_REPLACEMENT_COMPLETED",
      entityType: "PROGRAM_BENEFICIARY",
      entityId: result.newPb.id,
      metadata: {
        designatedNumber: pb.designatedNumber,
        originalProgramBeneficiaryId: pb.id,
        originalBeneficiaryName: pb.beneficiary.fullName,
        relationshipWithReplacement: relationshipWithReplacement.trim().toUpperCase(),
        originalConsentVerifiedByBirthday: true,
        replacementProgramBeneficiaryId: result.newPb.id,
        replacementBeneficiaryName: result.newBene.fullName,
        dependentName: result.createdDependent.fullName,
        dependentRelationship: result.createdDependent.relationship,
        reason,
        remarks,
        documentsCaptured: [
          "ID_FRONT",
          "ID_BACK",
          "DEPENDENT_ID_FRONT",
          "DEPENDENT_ID_BACK",
        ],
      },
    });

    return NextResponse.json({
      success: true,
      message: `Slot #${pb.designatedNumber} replacement confirmed! ${result.newBene.fullName} (with dependent ${result.createdDependent.fullName}) is now enrolled with original beneficiary consent and verified IDs.`,
      data: {
        designatedNumber: pb.designatedNumber,
        fullName: result.newBene.fullName,
        originalFullName: pb.beneficiary.fullName,
        originalBeneficiaryName: pb.beneficiary.fullName,
        dependentFullName: result.createdDependent.fullName,
        relationshipWithReplacement: relationshipWithReplacement.trim().toUpperCase(),
        barangay: resolvedBarangay,
        reason,
        qrToken: result.assignedQr.publicToken,
        programBeneficiaryId: result.newPb.id,
      },
    });
  } catch (error: any) {
    console.error("Flag replacement error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
