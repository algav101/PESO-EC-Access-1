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

    // Filter only valid rows
    const validRows = rows.filter((r: any) => r.status === "VALID");
    if (validRows.length === 0) {
      return NextResponse.json({ error: "No valid rows available to commit" }, { status: 400 });
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

    await prisma.$transaction(
      async (tx) => {
        const beneMap = new Map<string, any>();
        const chunkSize = 100;

        // Step 1: Query existing beneficiaries
        for (let i = 0; i < validRows.length; i += chunkSize) {
          const chunk = validRows.slice(i, i + chunkSize);
          const found = await tx.beneficiary.findMany({
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

        // Step 2: Prepare new beneficiaries & dependents
        const newBeneficiariesData: any[] = [];
        const newDependentsData: any[] = [];

        for (const r of validRows) {
          const key = `${r.fullName.trim().toUpperCase()}_${r.birthday}`;
          if (!beneMap.has(key)) {
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
          }
        }

        // Step 3: Batch insert new beneficiaries and dependents
        for (let i = 0; i < newBeneficiariesData.length; i += chunkSize) {
          await tx.beneficiary.createMany({
            data: newBeneficiariesData.slice(i, i + chunkSize),
            skipDuplicates: true,
          });
        }

        for (let i = 0; i < newDependentsData.length; i += chunkSize) {
          await tx.dependent.createMany({
            data: newDependentsData.slice(i, i + chunkSize),
            skipDuplicates: true,
          });
        }

        // Step 4: Batch insert / update Program Beneficiaries and QR Codes
        const existingPbs = await tx.programBeneficiary.findMany({
          where: { programId: targetProgramId },
          select: { id: true, beneficiaryId: true, designatedNumber: true },
        });
        const existingPbBeneMap = new Map(existingPbs.map((pb) => [pb.beneficiaryId, pb]));

        const progBeneficiariesData: any[] = [];
        const qrCodesData: any[] = [];

        for (const r of validRows) {
          const key = `${r.fullName.trim().toUpperCase()}_${r.birthday}`;
          const bene = beneMap.get(key);
          if (!bene) continue;

          // Also update base beneficiary profile with fresh details from masterlist
          await tx.beneficiary.updateMany({
            where: { id: bene.id },
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
          });

          const desigNum = parseInt(r.designatedNumber, 10) || 1;
          const assignment = getTableNumber(desigNum);

          const existingPb = existingPbBeneMap.get(bene.id);
          if (existingPb) {
            // Update existing enrollment
            await tx.programBeneficiary.updateMany({
              where: { id: existingPb.id },
              data: {
                designatedNumber: String(r.designatedNumber),
                tableNumber: assignment.table,
                slotGroup: assignment.slotGroup,
              },
            });
            importedCount++;
          } else {
            const progBeneId = crypto.randomUUID();
            progBeneficiariesData.push({
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
            qrCodesData.push({
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

        for (let i = 0; i < progBeneficiariesData.length; i += chunkSize) {
          await tx.programBeneficiary.createMany({
            data: progBeneficiariesData.slice(i, i + chunkSize),
            skipDuplicates: true,
          });
        }

        for (let i = 0; i < qrCodesData.length; i += chunkSize) {
          await tx.qrCode.createMany({
            data: qrCodesData.slice(i, i + chunkSize),
            skipDuplicates: true,
          });
        }

        // Step 5: Update program beneficiary count
        await tx.program.update({
          where: { id: targetProgramId },
          data: { beneficiaryCount: { increment: importedCount } },
        });
      },
      {
        timeout: 60000,
        maxWait: 20000,
      }
    );

    await logAudit({
      userId: user.id,
      action: "FINAL_BENEFICIARIES_MASTERLIST_IMPORTED",
      entityType: "PROGRAM",
      entityId: targetProgramId,
      metadata: { count: importedCount },
    });

    return NextResponse.json({ success: true, importedCount, programId: targetProgramId });
  } catch (error: any) {
    console.error("Masterlist import commit error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
