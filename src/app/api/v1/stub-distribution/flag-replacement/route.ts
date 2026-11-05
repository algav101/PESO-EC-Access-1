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
    const pendingRemarks = `Pending Admin/PESO Approval — Candidate: ${applicantEval.normalizedFullName} (Dependent: ${dependentEval.normalizedFullName}) | Reason: ${reason}${remarks ? ` (${remarks})` : ""} | Consent Verified (${relationshipWithReplacement.trim().toUpperCase()})`;

    // Pre-fetch existing replacement beneficiary outside the transaction to minimize transaction time
    const existingReplacementBene = await prisma.beneficiary.findFirst({
      where: {
        fullName: applicantEval.normalizedFullName,
        birthday: isoApplicantBirthday,
      },
    });

    const docPayloads = [
      { docType: "ID_FRONT", file: applicantIdFront, defaultName: "applicant_id_front.jpg" },
      { docType: "ID_BACK", file: applicantIdBack, defaultName: "applicant_id_back.jpg" },
      { docType: "DEPENDENT_ID_FRONT", file: dependentIdFront, defaultName: "dependent_id_front.jpg" },
      { docType: "DEPENDENT_ID_BACK", file: dependentIdBack, defaultName: "dependent_id_back.jpg" },
    ];

    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Mark original ProgramBeneficiary as FLAGGED_FOR_REPLACEMENT
        // (Original beneficiary details/data & QR code remain active on the slot until Admin/PESO approves!)
        await tx.programBeneficiary.update({
          where: { id: pb.id },
          data: { participationStatus: "FLAGGED_FOR_REPLACEMENT" },
        });

        // 2. Supersede any earlier PENDING replacement requests for this original beneficiary
        const existingPendingReps = await tx.beneficiaryReplacement.findMany({
          where: {
            originalProgramBeneficiaryId: pb.id,
            status: "PENDING",
          },
        });
        for (const prevRep of existingPendingReps) {
          if (prevRep.replacementProgramBeneficiaryId) {
            await tx.programBeneficiary.update({
              where: { id: prevRep.replacementProgramBeneficiaryId },
              data: { participationStatus: "WITHDRAWN" },
            });
          }
          await tx.beneficiaryReplacement.update({
            where: { id: prevRep.id },
            data: { status: "REJECTED" },
          });
        }

        // 3. Record FLAGGED_REPLACEMENT StubDistribution on original beneficiary while awaiting approval
        let qrForFlag = activeQr;
        if (!qrForFlag) {
          const qrData = generateBeneficiaryToken(pb.programId, pb.designatedNumber);
          qrForFlag = await tx.qrCode.create({
            data: {
              programId: pb.programId,
              programBeneficiaryId: pb.id,
              publicToken: qrData.publicToken,
              tokenHash: qrData.tokenHash,
              status: "ACTIVE",
              generatedById: user.id,
            },
          });
        }

        await tx.stubDistribution.deleteMany({
          where: { programBeneficiaryId: pb.id, status: "FLAGGED_REPLACEMENT" },
        });
        await tx.stubDistribution.create({
          data: {
            qrId: qrForFlag.id,
            programBeneficiaryId: pb.id,
            distributedById: user.id,
            verificationMethod: "ORIGINAL_BENEFICIARY_CONSENT_PIN",
            status: "FLAGGED_REPLACEMENT",
            remarks: pendingRemarks,
          },
        });

        // 4. Create or update Candidate Replacement Beneficiary
        let newBene = existingReplacementBene;
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

        // 5. Upsert Dependent for Candidate Replacement Beneficiary
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

        // 6. Batch-insert all 4 ID Documents in a single query
        await tx.beneficiaryDocument.deleteMany({
          where: {
            beneficiaryId: newBene.id,
            documentType: { in: ["ID_FRONT", "ID_BACK", "DEPENDENT_ID_FRONT", "DEPENDENT_ID_BACK"] },
          },
        });
        await tx.beneficiaryDocument.createMany({
          data: docPayloads.map((item) => {
            const f = item.file || {};
            return {
              beneficiaryId: newBene!.id,
              documentType: item.docType,
              fileKey: f.dataUrl || `replacement_${item.docType.toLowerCase()}_${newBene!.id}`,
              fileName: f.name || item.defaultName,
              fileSize: Number(f.size) || 2048,
              mimeType: f.type || "image/jpeg",
              uploadedById: user.id,
              verificationStatus: "VERIFIED",
            };
          }),
        });

        // 7. Create Candidate Replacement ProgramBeneficiary with PENDING_APPROVAL status
        // (Does NOT replace the active slot occupant until Admin / PESO Personnel approves!)
        const newPb = await tx.programBeneficiary.create({
          data: {
            programId: pb.programId,
            beneficiaryId: newBene.id,
            designatedNumber: pb.designatedNumber,
            participationStatus: "PENDING_APPROVAL",
            originalBeneficiary: false,
            tableNumber: pb.tableNumber,
            slotGroup: pb.slotGroup,
          },
        });

        // 8. Create BeneficiaryReplacement record with PENDING status for Admin / PESO assessment & approval
        const replacementRecord = await tx.beneficiaryReplacement.create({
          data: {
            programId: pb.programId,
            originalProgramBeneficiaryId: pb.id,
            replacementProgramBeneficiaryId: newPb.id,
            reason: `${reason} | Original Consent Relationship: ${relationshipWithReplacement.trim().toUpperCase()} | Dependent: ${dependentEval.normalizedFullName}${remarks ? ` | ${remarks}` : ""}`,
            initiatedById: user.id,
            approvedById: null,
            approvedAt: null,
            status: "PENDING",
          },
        });

        return {
          newBene,
          newPb,
          createdDependent,
          qrForFlag,
          replacementRecord,
        };
      },
      { maxWait: 20000, timeout: 45000 }
    );

    await logAudit({
      userId: user.id,
      action: "STUB_DISTRIBUTION_REPLACEMENT_SUBMITTED_FOR_APPROVAL",
      entityType: "BENEFICIARY_REPLACEMENT",
      entityId: result.replacementRecord.id,
      metadata: {
        designatedNumber: pb.designatedNumber,
        originalProgramBeneficiaryId: pb.id,
        originalBeneficiaryName: pb.beneficiary.fullName,
        relationshipWithReplacement: relationshipWithReplacement.trim().toUpperCase(),
        originalConsentVerifiedByBirthday: true,
        candidateProgramBeneficiaryId: result.newPb.id,
        candidateBeneficiaryName: result.newBene.fullName,
        dependentName: result.createdDependent.fullName,
        dependentRelationship: result.createdDependent.relationship,
        reason,
        remarks,
        status: "PENDING",
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
      status: "PENDING_APPROVAL",
      message: `Slot #${pb.designatedNumber} (${pb.beneficiary.fullName}) is now flagged for replacement with candidate ${result.newBene.fullName} (Dependent: ${result.createdDependent.fullName}). Awaiting assessment and approval by Admin / PESO Personnel before slot data is changed.`,
      data: {
        replacementId: result.replacementRecord.id,
        status: "PENDING",
        designatedNumber: pb.designatedNumber,
        fullName: pb.beneficiary.fullName,
        candidateFullName: result.newBene.fullName,
        originalFullName: pb.beneficiary.fullName,
        originalBeneficiaryName: pb.beneficiary.fullName,
        dependentFullName: result.createdDependent.fullName,
        relationshipWithReplacement: relationshipWithReplacement.trim().toUpperCase(),
        barangay: resolvedBarangay,
        reason,
        qrToken: result.qrForFlag.publicToken,
        programBeneficiaryId: pb.id,
        candidateProgramBeneficiaryId: result.newPb.id,
      },
    });
  } catch (error: any) {
    console.error("Flag replacement error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
