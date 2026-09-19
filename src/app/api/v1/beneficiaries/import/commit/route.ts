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

    const {
      rows,
      programId: requestedProgramId,
      duplicateStrategy = "MERGE_AND_REPLACE",
    } = await request.json();

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

    // Step 1: Parallel upfront lookup for existing records and table rules
    const candidateNames = Array.from(
      new Set(validRows.map((r: any) => r.fullName?.trim().toUpperCase()).filter(Boolean))
    );

    const [tableRules, existingDbBeneficiaries, existingPbs] = await Promise.all([
      prisma.tableAssignmentRule.findMany({
        where: { programId: targetProgramId },
        orderBy: { priority: "desc" },
      }),
      prisma.beneficiary.findMany({
        where: { fullName: { in: candidateNames } },
      }),
      prisma.programBeneficiary.findMany({
        where: { programId: targetProgramId },
        select: {
          id: true,
          beneficiaryId: true,
          designatedNumber: true,
          participationStatus: true,
          beneficiary: {
            select: { id: true, fullName: true, birthday: true },
          },
        },
      }),
    ]);

    const getTableNumber = (num: number) => {
      for (const rule of tableRules) {
        if (num >= rule.startNumber && num <= rule.endNumber) {
          return { table: rule.tableNumber, slotGroup: rule.slotGroup || "Main" };
        }
      }
      return { table: `Table ${Math.ceil(num / 100)}`, slotGroup: "Main" };
    };

    let importedCount = 0;
    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let exemptedCount = 0;

    const beneMap = new Map<string, any>();
    existingDbBeneficiaries.forEach((b) => {
      beneMap.set(`${b.fullName}_${b.birthday}`, b);
      if (!beneMap.has(b.fullName)) {
        beneMap.set(b.fullName, b);
      }
    });

    const existingPbDesigMap = new Map<string, any>();
    const existingPbBeneMap = new Map<string, any>();

    existingPbs.forEach((pb) => {
      const d = String(pb.designatedNumber).trim();
      if (d && pb.participationStatus !== "REPLACED") {
        existingPbDesigMap.set(d, pb);
      }
      existingPbBeneMap.set(pb.beneficiaryId, pb);
    });

    // Step 2: Separate new vs existing beneficiaries & assemble data in-memory
    const newBeneficiariesData: any[] = [];
    const newDependentsData: any[] = [];
    const beneUpdateOps: any[] = [];
    const exemptedBeneIds: string[] = [];

    for (const r of validRows) {
      const key = `${r.fullName.trim().toUpperCase()}_${r.birthday}`;
      const existing = beneMap.get(key) || beneMap.get(r.fullName.trim().toUpperCase());

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
        beneMap.set(beneObj.fullName, beneObj);
        newBeneficiariesData.push(beneObj);
        newCount++;

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
        if (duplicateStrategy === "MERGE_AND_REPLACE") {
          beneUpdateOps.push(
            prisma.beneficiary.update({
              where: { id: existing.id },
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
          );
          updatedCount++;
        } else {
          skippedCount++;
        }
      }

      if (r.isExempted || r.status === "EXEMPTED") {
        exemptedCount++;
        const beneId = existing ? existing.id : beneMap.get(key)?.id;
        if (beneId) exemptedBeneIds.push(beneId);
      }
    }

    // Step 3: Execute all insertions in parallel in a single network round-trip
    await Promise.all([
      newBeneficiariesData.length > 0
        ? prisma.beneficiary.createMany({
            data: newBeneficiariesData,
            skipDuplicates: true,
          })
        : Promise.resolve(),
      newDependentsData.length > 0
        ? prisma.dependent.createMany({
            data: newDependentsData,
            skipDuplicates: true,
          })
        : Promise.resolve(),
    ]);

    // Step 4: Assemble program beneficiaries with Designated Number reference slot resolution
    const progBeneficiariesToInsert: any[] = [];
    const qrCodesToInsert: any[] = [];
    const pbUpdateOps: any[] = [];
    const replacementLogsToInsert: any[] = [];

    for (const r of validRows) {
      const desigStr = String(r.designatedNumber).trim();
      const key = `${r.fullName.trim().toUpperCase()}_${r.birthday}`;
      const bene = beneMap.get(key) || beneMap.get(r.fullName.trim().toUpperCase());
      if (!bene) continue;

      const desigNum = parseInt(r.designatedNumber, 10) || 1;
      const assignment = getTableNumber(desigNum);

      // Check if another beneficiary originally occupied this designated slot number
      const existingPbAtSlot = existingPbDesigMap.get(desigStr);
      const isDifferentPersonAtSlot =
        existingPbAtSlot &&
        existingPbAtSlot.beneficiaryId !== bene.id &&
        existingPbAtSlot.beneficiary?.fullName?.trim().toUpperCase() !== bene.fullName.trim().toUpperCase();

      if (isDifferentPersonAtSlot) {
        // Newly uploaded beneficiary is considered the FINAL beneficiary for this slot number.
        // Original beneficiary at this slot is marked REPLACED with replacement audit trail.
        pbUpdateOps.push(
          prisma.programBeneficiary.update({
            where: { id: existingPbAtSlot.id },
            data: {
              participationStatus: "REPLACED",
            },
          })
        );

        replacementLogsToInsert.push({
          id: crypto.randomUUID(),
          programId: targetProgramId,
          originalProgramBeneficiaryId: existingPbAtSlot.id,
          reason: `Replaced by newly uploaded beneficiary in Final Masterlist: ${bene.fullName} (Slot #${desigStr})`,
          status: "APPROVED",
          approvedAt: new Date(),
          approvedById: user.id,
          initiatedById: user.id,
        });
      }

      // Check if this beneficiary already has a program enrollment
      const existingPbOfBene = existingPbBeneMap.get(bene.id);

      if (existingPbOfBene) {
        if (duplicateStrategy === "MERGE_AND_REPLACE" || isDifferentPersonAtSlot) {
          pbUpdateOps.push(
            prisma.programBeneficiary.update({
              where: { id: existingPbOfBene.id },
              data: {
                designatedNumber: desigStr,
                participationStatus: "ACTIVE",
                tableNumber: assignment.table,
                slotGroup: assignment.slotGroup,
              },
            })
          );
          importedCount++;
        }
      } else {
        const progBeneId = crypto.randomUUID();
        progBeneficiariesToInsert.push({
          id: progBeneId,
          programId: targetProgramId,
          beneficiaryId: bene.id,
          designatedNumber: desigStr,
          participationStatus: "ACTIVE",
          originalBeneficiary: true,
          tableNumber: assignment.table,
          slotGroup: assignment.slotGroup,
        });

        const qrData = generateBeneficiaryToken(targetProgramId, desigStr);
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
    }

    // Step 5: Execute Program Beneficiary bulk insertions first to satisfy FK constraints
    if (progBeneficiariesToInsert.length > 0) {
      await prisma.programBeneficiary.createMany({
        data: progBeneficiariesToInsert,
        skipDuplicates: true,
      });
    }

    // Step 6: Execute child insertions (QR Codes, Replacement logs), batch updates, and exemption updates in parallel
    const allUpdateOps = [...beneUpdateOps, ...pbUpdateOps];
    const updatePromises: Promise<any>[] = [];

    const TX_BATCH_SIZE = 250;
    for (let i = 0; i < allUpdateOps.length; i += TX_BATCH_SIZE) {
      const batch = allUpdateOps.slice(i, i + TX_BATCH_SIZE);
      updatePromises.push(prisma.$transaction(batch));
    }

    await Promise.all([
      qrCodesToInsert.length > 0
        ? prisma.qrCode.createMany({
            data: qrCodesToInsert,
            skipDuplicates: true,
          })
        : Promise.resolve(),
      replacementLogsToInsert.length > 0
        ? prisma.beneficiaryReplacement.createMany({
            data: replacementLogsToInsert,
            skipDuplicates: true,
          })
        : Promise.resolve(),
      ...updatePromises,
      exemptedBeneIds.length > 0
        ? prisma.beneficiaryRestriction.updateMany({
            where: {
              beneficiaryId: { in: exemptedBeneIds },
              status: "ACTIVE",
            },
            data: {
              status: "OVERRIDDEN",
              reason: "Authorized Exemption for Final Masterlist Implementation",
            },
          })
        : Promise.resolve(),
    ]);

    // Step 6: Update program total beneficiary count & audit log
    const totalProgramBenes = await prisma.programBeneficiary.count({
      where: { programId: targetProgramId, participationStatus: { not: "REPLACED" } },
    });

    await Promise.all([
      prisma.program.update({
        where: { id: targetProgramId },
        data: { beneficiaryCount: totalProgramBenes },
      }),
      logAudit({
        userId: user.id,
        action: "FINAL_BENEFICIARIES_MASTERLIST_IMPORTED",
        entityType: "PROGRAM",
        entityId: targetProgramId,
        metadata: { count: importedCount, newCount, updatedCount, skippedCount, exemptedCount, duplicateStrategy },
      }),
    ]);

    return NextResponse.json({
      success: true,
      importedCount,
      newCount,
      updatedCount,
      skippedCount,
      exemptedCount,
      totalProgramBeneficiaries: totalProgramBenes,
      programId: targetProgramId,
    });
  } catch (error: any) {
    console.error("Masterlist import commit error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
