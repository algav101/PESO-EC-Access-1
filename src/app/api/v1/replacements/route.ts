import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
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
          include: { beneficiary: true },
        },
        replacementProgramBeneficiary: {
          include: { beneficiary: true, qrCodes: true },
        },
        initiatedBy: { select: { fullName: true } },
        approvedBy: { select: { fullName: true } },
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
      include: { beneficiary: true, qrCodes: true },
    });

    if (!originalPb) {
      return NextResponse.json({ error: "Original beneficiary not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark original program beneficiary as REPLACED (Preserves history!)
      await tx.programBeneficiary.update({
        where: { id: originalPb.id },
        data: { participationStatus: "REPLACED" },
      });

      // 2. Retain and transfer the original physical QR code to the new replacement beneficiary
      // The physical printed card/image remains active and fixed to this designated number slot!
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
            fileKey: `id_front_${newBene.id}`,
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
            fileKey: `id_back_${newBene.id}`,
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
          participationStatus: "ACTIVE",
          originalBeneficiary: false,
          tableNumber: originalPb.tableNumber,
          slotGroup: originalPb.slotGroup,
        },
      });

      // 6. Re-bind the original physical QR code to the new active beneficiary slot
      if (activeQr) {
        await tx.qrCode.update({
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
        await tx.qrCode.create({
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

      // 7. Log replacement record
      const rep = await tx.beneficiaryReplacement.create({
        data: {
          programId,
          originalProgramBeneficiaryId: originalPb.id,
          replacementProgramBeneficiaryId: newPb.id,
          reason,
          initiatedById: user.id,
          approvedById: user.role === "PESO_ADMIN" ? user.id : null,
          approvedAt: user.role === "PESO_ADMIN" ? new Date() : null,
          status: user.role === "PESO_ADMIN" ? "APPROVED" : "PENDING",
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
