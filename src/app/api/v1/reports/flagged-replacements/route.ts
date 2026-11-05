export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    const program = await prisma.program.findUnique({
      where: { id: programId },
      select: {
        id: true,
        programName: true,
        programCode: true,
        startDate: true,
        endDate: true,
        beneficiaryCount: true,
        requiredWorkDays: true,
      },
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    const replacements = await prisma.beneficiaryReplacement.findMany({
      where: { programId },
      include: {
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
      orderBy: [
        { originalProgramBeneficiary: { designatedNumber: "asc" } },
        { initiatedAt: "desc" },
      ],
    });

    // Also find any flagged beneficiaries without a replacement record yet
    const existingOrigPbIds = new Set(replacements.map((r) => r.originalProgramBeneficiaryId));
    const unlinkedFlaggedPb = await prisma.programBeneficiary.findMany({
      where: {
        programId,
        participationStatus: "FLAGGED_FOR_REPLACEMENT",
        id: { notIn: Array.from(existingOrigPbIds) },
      },
      include: {
        beneficiary: {
          include: { dependents: true, documents: true },
        },
        stubDistributions: {
          where: { status: "FLAGGED_REPLACEMENT" },
          include: { distributedBy: { select: { fullName: true, role: true } } },
          orderBy: { distributedAt: "desc" },
        },
      },
      orderBy: { designatedNumber: "asc" },
    });

    const items = [];

    for (const rep of replacements) {
      const origPb = rep.originalProgramBeneficiary;
      const candPb = rep.replacementProgramBeneficiary;
      const origBene = origPb?.beneficiary;
      const candBene = candPb?.beneficiary;
      const dep = candBene?.dependents?.[0];

      const isOrigAsDep =
        Boolean(origBene?.fullName) &&
        Boolean(dep?.fullName) &&
        dep!.fullName.trim().toUpperCase() === origBene!.fullName.trim().toUpperCase();

      const isApproved = rep.status === "APPROVED";
      const isPending = rep.status === "PENDING";

      let remarks = "";
      if (isApproved) {
        remarks = `Replaced - ${origBene?.fullName || "Original Beneficiary"}`;
      } else if (isPending) {
        remarks = `Pending Admin/PESO Approval — ${rep.reason}`;
      } else {
        remarks = `Replacement Rejected — ${rep.reason}`;
      }

      items.push({
        id: rep.id,
        designatedNumber: origPb?.designatedNumber || 0,
        tableNumber: origPb?.tableNumber || "Table 1",
        originalBeneficiary: {
          id: origBene?.id,
          fullName: origBene?.fullName || "N/A",
          birthday: origBene?.birthday,
          barangay: origBene?.barangay || "Dingalan",
          sitio: origBene?.sitio || "",
          contactNumber: origBene?.contactNumber || "",
        },
        candidateBeneficiary: candBene
          ? {
              id: candBene.id,
              fullName: candBene.fullName,
              birthday: candBene.birthday,
              sex: candBene.sex,
              barangay: candBene.barangay,
              sitio: candBene.sitio,
              contactNumber: candBene.contactNumber,
              idType: candBene.idType,
              idNumber: candBene.idNumber,
              dependent: dep
                ? {
                    fullName: dep.fullName,
                    relationship: dep.relationship,
                    birthday: dep.birthday,
                    age: dep.age,
                    isOriginalBeneficiary: isOrigAsDep,
                  }
                : null,
              documents: (candBene.documents || []).map((d) => ({
                id: d.id,
                documentType: d.documentType,
                fileName: d.fileName,
                fileKey: d.fileKey,
                mimeType: d.mimeType,
                fileSize: d.fileSize,
              })),
            }
          : null,
        reason: rep.reason,
        remarks,
        status: rep.status, // "APPROVED" | "PENDING" | "REJECTED"
        initiatedBy: rep.initiatedBy?.fullName || "Field Coordinator",
        initiatedAt: rep.initiatedAt,
        approvedBy: rep.approvedBy?.fullName || (isApproved ? "PESO Administrator" : null),
        approvedAt: rep.approvedAt,
      });
    }

    for (const pb of unlinkedFlaggedPb) {
      const dist = pb.stubDistributions?.[0];
      items.push({
        id: `flagged-pb-${pb.id}`,
        designatedNumber: pb.designatedNumber,
        tableNumber: pb.tableNumber || "Table 1",
        originalBeneficiary: {
          id: pb.beneficiary?.id,
          fullName: pb.beneficiary?.fullName || "N/A",
          birthday: pb.beneficiary?.birthday,
          barangay: pb.beneficiary?.barangay || "Dingalan",
          sitio: pb.beneficiary?.sitio || "",
          contactNumber: pb.beneficiary?.contactNumber || "",
        },
        candidateBeneficiary: null,
        reason: dist?.remarks || "Flagged in field stub distribution",
        remarks: "Flagged for Onsite Replacement (Awaiting Candidate Entry)",
        status: "PENDING",
        initiatedBy: dist?.distributedBy?.fullName || "Field Coordinator",
        initiatedAt: dist?.distributedAt || pb.joinedAt,
        approvedBy: null,
        approvedAt: null,
      });
    }

    items.sort((a, b) => Number(a.designatedNumber) - Number(b.designatedNumber));

    const summary = {
      totalFlagged: items.length,
      totalApproved: items.filter((i) => i.status === "APPROVED").length,
      totalPending: items.filter((i) => i.status === "PENDING").length,
      totalRejected: items.filter((i) => i.status === "REJECTED").length,
    };

    return NextResponse.json({
      success: true,
      program,
      summary,
      items,
    });
  } catch (error: any) {
    console.error("GET flagged-replacements error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
