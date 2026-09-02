import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { generateBeneficiaryToken } from "@/lib/qr";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "beneficiary.import")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { rows } = await request.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided for import" }, { status: 400 });
    }

    // Filter only valid rows
    const validRows = rows.filter((r: any) => r.status === "VALID");
    if (validRows.length === 0) {
      return NextResponse.json({ error: "No valid rows available to commit" }, { status: 400 });
    }

    // Get Table Rules for the program
    const tableRules = await prisma.tableAssignmentRule.findMany({
      where: { programId: params.id },
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

    await prisma.$transaction(async (tx) => {
      for (const r of validRows) {
        // Upsert beneficiary
        let bene = await tx.beneficiary.findFirst({
          where: {
            fullName: r.fullName.trim().toUpperCase(),
            birthday: r.birthday,
          },
        });

        if (!bene) {
          bene = await tx.beneficiary.create({
            data: {
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
              barangay: r.barangay,
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
            },
          });

          // Create dependent if provided in template
          if (r.dependentFullName) {
            await tx.dependent.create({
              data: {
                beneficiaryId: bene.id,
                firstName: r.dependentFirstName,
                middleName: r.dependentMiddleName,
                lastName: r.dependentLastName,
                extensionName: r.dependentExtensionName,
                fullName: r.dependentFullName,
                relationship: r.dependentRelationship,
                age: r.dependentAge,
              },
            });
          }
        }

        const desigNum = parseInt(r.designatedNumber, 10) || 1;
        const assignment = getTableNumber(desigNum);

        const progBene = await tx.programBeneficiary.create({
          data: {
            programId: params.id,
            beneficiaryId: bene.id,
            designatedNumber: String(r.designatedNumber),
            participationStatus: "ACTIVE",
            originalBeneficiary: true,
            tableNumber: assignment.table,
            slotGroup: assignment.slotGroup,
          },
        });

        // Auto-generate Cryptographic QR token
        const qrData = generateBeneficiaryToken(params.id, String(r.designatedNumber));
        await tx.qrCode.create({
          data: {
            programId: params.id,
            programBeneficiaryId: progBene.id,
            publicToken: qrData.publicToken,
            tokenHash: qrData.tokenHash,
            status: "ACTIVE",
            generatedById: user.id,
          },
        });

        importedCount++;
      }

      // Update program beneficiary count
      await tx.program.update({
        where: { id: params.id },
        data: { beneficiaryCount: { increment: importedCount } },
      });
    }, {
      timeout: 60000,
      maxWait: 20000,
    });

    await logAudit({
      userId: user.id,
      action: "BENEFICIARIES_IMPORTED",
      entityType: "PROGRAM",
      entityId: params.id,
      metadata: { count: importedCount },
    });

    return NextResponse.json({ success: true, importedCount });
  } catch (error: any) {
    console.error("Import commit error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
