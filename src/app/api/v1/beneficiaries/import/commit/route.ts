export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { generateBeneficiaryToken } from "@/lib/qr";
import { normalizeBarangayName } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "beneficiary.import")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { rows, programId: requestedProgramId } = await request.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided for import" }, { status: 400 });
    }

    // Filter valid and exempted rows
    const validRows = rows.filter(
      (r: any) => r.status === "VALID" || r.status === "EXEMPTED" || Boolean(r.isExempted)
    );
    if (validRows.length === 0) {
      return NextResponse.json({ error: "No valid or exempted rows available to commit" }, { status: 400 });
    }

    // Resolve or create program
    let targetProgramId = requestedProgramId;
    if (!targetProgramId || targetProgramId === "AUTO") {
      let prog = await prisma.program.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      });
      if (!prog) {
        prog = await prisma.program.findFirst({
          orderBy: { createdAt: "desc" },
        });
      }
      if (!prog) {
        // Create initial default program for 2026
        prog = await prisma.program.create({
          data: {
            programCode: `TUPAD-DINGALAN-${new Date().getFullYear()}-B1`,
            programName: `DOLE-TUPAD Community Employment Program ${new Date().getFullYear()}`,
            municipality: "Dingalan",
            province: "Aurora",
            requiredWorkDays: 10,
            dailyHours: 8.0,
            status: "ACTIVE",
            createdById: user.id,
          },
        });
      }
      targetProgramId = prog.id;
    }

    // Get Table Rules for the program
    const tableRules = await prisma.tableAssignmentRule.findMany({
      where: { programId: targetProgramId },
      orderBy: { priority: "desc" },
    });

    const getTableNumber = (num: number) => {
      for (const rule of tableRules) {
        if (num >= rule.startNumber && num <= rule.endNumber) {
          return { table: rule.tableNumber, slotGroup: rule.slotGroup || "Main" };
        }
      }
      return { table: `Table ${Math.ceil(num / 100)}`, slotGroup: "Main" };
    };

    let importedCount = 0;
    let exemptedCount = 0;
    const beneMap = new Map<string, any>();
    const chunkSize = 100;

    // Step 1: Query existing beneficiaries in chunks
    for (let i = 0; i < validRows.length; i += chunkSize) {
      const chunk = validRows.slice(i, i + chunkSize);
      const found = await prisma.beneficiary.findMany({
        where: {
          OR: chunk.map((r: any) => ({
            fullName: r.fullName.trim().toUpperCase(),
            birthday: r.birthday,
          })),
        },
      });
      found.forEach((b) => {
        beneMap.set(`${b.fullName}_${b.birthday}`, b);
      });
    }

    // Step 2: Separate new vs existing beneficiaries
    const newBeneficiariesData: any[] = [];
    const newDependentsData: any[] = [];
    const existingToUpdate: { id: string; r: any }[] = [];

    for (const r of validRows) {
      const key = `${r.fullName.trim().toUpperCase()}_${r.birthday}`;
      const existing = beneMap.get(key);

      if (!existing) {
        const newId = crypto.randomUUID();
        const beneObj = {
          id: newId,
          beneficiaryNumber: `BN-${String(r.designatedNumber).padStart(4, "0")}`,
          fullName: r.fullName.trim().toUpperCase(),
          lastName: r.lastName?.trim().toUpperCase(),
          firstName: r.firstName?.trim().toUpperCase(),
          middleName: r.middleName?.trim().toUpperCase(),
          extensionName: r.extensionName?.trim().toUpperCase(),
          birthday: r.birthday,
          sex: r.sex?.trim().toUpperCase(),
          civilStatus: r.civilStatus,
          age: r.age,
          monthlyIncome: r.monthlyIncome,
          typeOfBeneficiary: r.typeOfBeneficiary,
          occupation: r.occupation,
          idType: r.idType,
          idNumber: r.idNumber,
          barangay: normalizeBarangayName(r.barangay),
          sitio: r.sitio,
          municipality: "Dingalan",
          province: "Aurora",
          contactNumber: r.contactNumber,
          isSenior: Boolean(r.isSenior),
          isPwd: Boolean(r.isPwd),
          is4Ps: Boolean(r.is4Ps),
          isIp: Boolean(r.isIp),
          skillsTraining: r.skillsTraining,
          status: "ACTIVE",
        };
        beneMap.set(key, beneObj);
        newBeneficiariesData.push(beneObj);

        if (r.dependentFullName) {
          newDependentsData.push({
            id: crypto.randomUUID(),
            beneficiaryId: newId,
            firstName: r.dependentFirstName,
            middleName: r.dependentMiddleName,
            lastName: r.dependentLastName,
            extensionName: r.dependentExtensionName,
            fullName: r.dependentFullName,
            relationship: r.dependentRelationship,
            age: r.dependentAge,
          });
        }
      } else {
        existingToUpdate.push({ id: existing.id, r });
      }

      if (r.isExempted || r.status === "EXEMPTED") {
        exemptedCount++;
      }
    }

    // Step 3: Batch insert new beneficiaries and dependents
    for (let i = 0; i < newBeneficiariesData.length; i += chunkSize) {
      await prisma.beneficiary.createMany({
        data: newBeneficiariesData.slice(i, i + chunkSize),
        skipDuplicates: true,
      });
    }

    for (let i = 0; i < newDependentsData.length; i += chunkSize) {
      await prisma.dependent.createMany({
        data: newDependentsData.slice(i, i + chunkSize),
        skipDuplicates: true,
      });
    }

    // Step 4: Batch update existing beneficiaries profile in parallel sub-batches
    const updateBatchSize = 25;
    for (let i = 0; i < existingToUpdate.length; i += updateBatchSize) {
      const batch = existingToUpdate.slice(i, i + updateBatchSize);
      await Promise.all(
        batch.map(({ id, r }) =>
          prisma.beneficiary.updateMany({
            where: { id },
            data: {
              barangay: normalizeBarangayName(r.barangay),
              sitio: r.sitio || undefined,
              contactNumber: r.contactNumber || undefined,
              civilStatus: r.civilStatus || undefined,
              occupation: r.occupation || undefined,
              isSenior: Boolean(r.isSenior),
              isPwd: Boolean(r.isPwd),
              is4Ps: Boolean(r.is4Ps),
              isIp: Boolean(r.isIp),
            },
          })
        )
      );
    }

    // Step 5: Handle program beneficiaries & QR codes
    const existingPbs = await prisma.programBeneficiary.findMany({
      where: { programId: targetProgramId },
      select: { id: true, beneficiaryId: true, designatedNumber: true },
    });
    const existingPbBeneMap = new Map(existingPbs.map((pb) => [pb.beneficiaryId, pb]));

    const progBeneficiariesToInsert: any[] = [];
    const qrCodesToInsert: any[] = [];
    const pbsToUpdate: { id: string; designatedNumber: string; tableNumber: string; slotGroup: string }[] = [];

    for (const r of validRows) {
      const key = `${r.fullName.trim().toUpperCase()}_${r.birthday}`;
      const bene = beneMap.get(key);
      if (!bene) continue;

      const desigNum = parseInt(r.designatedNumber, 10) || 1;
      const assignment = getTableNumber(desigNum);

      const existingPb = existingPbBeneMap.get(bene.id);
      if (existingPb) {
        pbsToUpdate.push({
          id: existingPb.id,
          designatedNumber: String(r.designatedNumber),
          tableNumber: assignment.table,
          slotGroup: assignment.slotGroup,
        });
        importedCount++;
      } else {
        const progBeneId = crypto.randomUUID();
        progBeneficiariesToInsert.push({
          id: progBeneId,
          programId: targetProgramId,
          beneficiaryId: bene.id,
          designatedNumber: String(r.designatedNumber),
          participationStatus: "ACTIVE",
          originalBeneficiary: true,
          tableNumber: assignment.table,
          slotGroup: assignment.slotGroup,
        });

        const qrData = generateBeneficiaryToken(targetProgramId, String(r.designatedNumber));
        qrCodesToInsert.push({
          id: crypto.randomUUID(),
          programId: targetProgramId,
          programBeneficiaryId: progBeneId,
          publicToken: qrData.publicToken,
          tokenHash: qrData.tokenHash,
          status: "ACTIVE",
          generatedById: user.id,
        });

        importedCount++;
      }

      // If exempted, override any active restrictions for this beneficiary
      if (r.isExempted || r.status === "EXEMPTED") {
        await prisma.beneficiaryRestriction.updateMany({
          where: {
            beneficiaryId: bene.id,
            status: "ACTIVE",
          },
          data: {
            status: "OVERRIDDEN",
            reason: r.exemptionReason
              ? `Authorized Exemption: ${r.exemptionReason}`
              : "Authorized Exemption for Final Masterlist Implementation",
          },
        });
      }
    }

    // Batch insert new program beneficiaries and QR codes
    for (let i = 0; i < progBeneficiariesToInsert.length; i += chunkSize) {
      await prisma.programBeneficiary.createMany({
        data: progBeneficiariesToInsert.slice(i, i + chunkSize),
        skipDuplicates: true,
      });
    }

    for (let i = 0; i < qrCodesToInsert.length; i += chunkSize) {
      await prisma.qrCode.createMany({
        data: qrCodesToInsert.slice(i, i + chunkSize),
        skipDuplicates: true,
      });
    }

    // Batch update existing program beneficiaries
    for (let i = 0; i < pbsToUpdate.length; i += updateBatchSize) {
      const batch = pbsToUpdate.slice(i, i + updateBatchSize);
      await Promise.all(
        batch.map((pb) =>
          prisma.programBeneficiary.updateMany({
            where: { id: pb.id },
            data: {
              designatedNumber: pb.designatedNumber,
              tableNumber: pb.tableNumber,
              slotGroup: pb.slotGroup,
            },
          })
        )
      );
    }

    // Step 6: Update program total beneficiary count
    const totalProgramBenes = await prisma.programBeneficiary.count({
      where: { programId: targetProgramId, participationStatus: { not: "REPLACED" } },
    });

    await prisma.program.update({
      where: { id: targetProgramId },
      data: { beneficiaryCount: totalProgramBenes },
    });

    await logAudit({
      userId: user.id,
      action: "FINAL_BENEFICIARIES_MASTERLIST_IMPORTED",
      entityType: "PROGRAM",
      entityId: targetProgramId,
      metadata: { count: importedCount, exemptedCount },
    });

    return NextResponse.json({
      success: true,
      importedCount,
      exemptedCount,
      totalProgramBeneficiaries: totalProgramBenes,
      programId: targetProgramId,
    });
  } catch (error: any) {
    console.error("Masterlist import commit error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
