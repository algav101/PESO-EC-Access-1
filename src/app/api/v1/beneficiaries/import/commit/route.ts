export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { generateBeneficiaryToken } from "@/lib/qr";
import { normalizeBarangayName } from "@/lib/utils";
import { updateImportedBeneficiaries, updateImportedEnrollments, type BeneficiaryImportUpdate, type ProgramImportUpdate } from "@/lib/masterlist-bulk-updates";

class ImportConflict extends Error {}

export async function POST(request: Request) {
  let awaitingCommitConfirmation = false;
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "beneficiary.import")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid import request." }, { status: 400 });
    const {
      rows,
      programId: requestedProgramId,
      duplicateStrategy = "MERGE_AND_REPLACE",
    } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided for import" }, { status: 400 });
    }
    if (rows.length > 2000 || !["MERGE_AND_REPLACE", "SKIP"].includes(duplicateStrategy)) {
      return NextResponse.json({ error: "Use a roster of at most 2,000 rows and a valid duplicate strategy." }, { status: 400 });
    }
    if (requestedProgramId != null && typeof requestedProgramId !== "string") {
      return NextResponse.json({ error: "Invalid program ID." }, { status: 400 });
    }

    // Filter valid and exempted rows
    const validRows = rows.filter(
      (r: any) => r && (r.status === "VALID" || r.status === "EXEMPTED" || Boolean(r.isExempted))
    );
    if (validRows.length === 0) {
      return NextResponse.json({ error: "No valid or exempted rows available to commit" }, { status: 400 });
    }
    const seenPeople = new Set<string>(), seenSlots = new Set<string>();
    for (const row of validRows) {
      if (typeof row.fullName !== "string" || !row.fullName.trim() || typeof row.birthday !== "string" || !row.birthday.trim() || !/^\d+$/.test(String(row.designatedNumber ?? "").trim())) {
        return NextResponse.json({ error: "Every import row needs a name, birth date and numeric designated number. Preview the file again." }, { status: 400 });
      }
      const person = `${row.fullName.trim().toUpperCase()}_${row.birthday}`;
      const slot = String(row.designatedNumber).trim();
      if (seenPeople.has(person) || seenSlots.has(slot)) {
        return NextResponse.json({ error: "Duplicate beneficiary or designated number in the import. Preview and correct the file first." }, { status: 400 });
      }
      seenPeople.add(person); seenSlots.add(slot);
    }

    // All roster, dependent, QR, replacement, exemption and audit writes are atomic.
    return await prisma.$transaction(async (tx) => {
      // Resolve or create program
      let targetProgramId = requestedProgramId;
      if (!targetProgramId || targetProgramId === "AUTO") {
        let prog = await tx.program.findFirst({
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
        });
        if (!prog) {
          prog = await tx.program.findFirst({
            orderBy: { createdAt: "desc" },
          });
        }
        if (!prog) {
          // Create initial default program for 2026
          prog = await tx.program.create({
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

      // One importer per program at a time; release automatically on commit/rollback.
      const [lock] = await tx.$queryRaw<{ locked: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(hashtextextended(${targetProgramId}, 0)) AS locked
      `;
      if (!lock?.locked) throw new ImportConflict('Another masterlist import is running for this program. Wait for it to finish before retrying.');

      // Step 1: Parallel upfront lookup for existing records and table rules
      const candidateNames = Array.from(
        new Set(validRows.map((r: any) => r.fullName?.trim().toUpperCase()).filter(Boolean))
      );

      const [tableRules, existingDbBeneficiaries, existingPbs] = await Promise.all([
        tx.tableAssignmentRule.findMany({
          where: { programId: targetProgramId },
          orderBy: { priority: "desc" },
        }),
        tx.beneficiary.findMany({
          where: { fullName: { in: candidateNames } },
        }),
        tx.programBeneficiary.findMany({
          where: { programId: targetProgramId },
          select: {
            id: true,
            beneficiaryId: true,
            designatedNumber: true,
            participationStatus: true,
            qrCodes: { where: { status: { in: ["ACTIVE", "REPRINTED"] } }, select: { id: true }, take: 1 },
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
      const beneUpdateOps: BeneficiaryImportUpdate[] = [];
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
            beneUpdateOps.push({
              id: existing.id,
              barangay: normalizeBarangayName(r.barangay),
              sitio: r.sitio || undefined,
              contactNumber: r.contactNumber || undefined,
              civilStatus: r.civilStatus || undefined,
              occupation: r.occupation || undefined,
              isSenior: Boolean(r.isSenior),
              isPwd: Boolean(r.isPwd),
              is4Ps: Boolean(r.is4Ps),
              isIp: Boolean(r.isIp),
            });
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

      // Parent records must exist before inserting dependents (foreign keys).
      if (newBeneficiariesData.length) await tx.beneficiary.createMany({ data: newBeneficiariesData });
      if (newDependentsData.length) await tx.dependent.createMany({ data: newDependentsData });

      // Step 4: Assemble program beneficiaries with Designated Number reference slot resolution
      const progBeneficiariesToInsert: any[] = [];
      const qrCodesToInsert: any[] = [];
      const pbUpdateOps: ProgramImportUpdate[] = [];
      const replacementLogsToInsert: any[] = [];
      const incomingBeneficiaryIds = new Set(validRows.map((r: any) => {
        const key = `${r.fullName.trim().toUpperCase()}_${r.birthday}`;
        return (beneMap.get(key) || beneMap.get(r.fullName.trim().toUpperCase()))?.id;
      }));

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

        // An existing enrollee moving to another slot in this upload is not replaced.
        if (isDifferentPersonAtSlot && !incomingBeneficiaryIds.has(existingPbAtSlot.beneficiaryId)) {
          // Newly uploaded beneficiary is considered the FINAL beneficiary for this slot number.
          // Original beneficiary at this slot is marked REPLACED with replacement audit trail.
          pbUpdateOps.push({ id: existingPbAtSlot.id, participationStatus: "REPLACED" });

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
        let qrProgramBeneficiaryId: string | undefined;

        if (existingPbOfBene) {
          if (duplicateStrategy === "MERGE_AND_REPLACE" || isDifferentPersonAtSlot) {
            pbUpdateOps.push({
              id: existingPbOfBene.id,
              designatedNumber: desigStr,
              participationStatus: "ACTIVE",
              tableNumber: assignment.table,
              slotGroup: assignment.slotGroup,
            });
            if (!existingPbOfBene.qrCodes?.length) qrProgramBeneficiaryId = existingPbOfBene.id;
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
          qrProgramBeneficiaryId = progBeneId;
          importedCount++;
        }
        // Also repair an enrollment left without a QR by a legacy partial import.
        if (qrProgramBeneficiaryId) {
          const qrData = generateBeneficiaryToken(targetProgramId, desigStr);
          qrCodesToInsert.push({
            id: crypto.randomUUID(),
            programId: targetProgramId,
            programBeneficiaryId: qrProgramBeneficiaryId,
            publicToken: qrData.publicToken,
            tokenHash: qrData.tokenHash,
            status: "ACTIVE",
            generatedById: user.id,
          });
        }
      }

      // Step 5: Execute Program Beneficiary bulk insertions first to satisfy FK constraints
      if (progBeneficiariesToInsert.length > 0) {
        await tx.programBeneficiary.createMany({
          data: progBeneficiariesToInsert,
        });
      }

      // Bulk updates avoid hundreds of sequential UPDATE round trips for a 500-row roster.
      await updateImportedBeneficiaries(tx, beneUpdateOps);
      await updateImportedEnrollments(tx, targetProgramId, pbUpdateOps);
      if (qrCodesToInsert.length) await tx.qrCode.createMany({ data: qrCodesToInsert });
      if (replacementLogsToInsert.length) await tx.beneficiaryReplacement.createMany({ data: replacementLogsToInsert });
      if (exemptedBeneIds.length) {
        await tx.beneficiaryRestriction.updateMany({
          where: { beneficiaryId: { in: exemptedBeneIds }, status: "ACTIVE" },
          data: { status: "OVERRIDDEN", reason: "Authorized Exemption for Final Masterlist Implementation" },
        });
      }

      // Step 6: Update program total beneficiary count & audit log
      const totalProgramBenes = await tx.programBeneficiary.count({
        where: { programId: targetProgramId, participationStatus: { not: "REPLACED" } },
      });

      await tx.program.update({
        where: { id: targetProgramId },
        data: { beneficiaryCount: totalProgramBenes },
      });
      await tx.auditLog.create({ data: {
          userId: user.id,
          action: "FINAL_BENEFICIARIES_MASTERLIST_IMPORTED",
          entityType: "PROGRAM",
          entityId: targetProgramId,
          metadata: JSON.stringify({ count: importedCount, newCount, updatedCount, skippedCount, exemptedCount, duplicateStrategy }),
      } });

      awaitingCommitConfirmation = true;
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
    }, { maxWait: 5000, timeout: 45000 });
  } catch (error: any) {
    // Do not expose database queries, roster PII or credentials in the response/log.
    console.error("Masterlist import commit failed", { code: error?.code || error?.name || "UNKNOWN" });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid import JSON. Preview the file again." }, { status: 400 });
    if (error instanceof ImportConflict) return NextResponse.json({ error: error.message }, { status: 409 });
    if (awaitingCommitConfirmation) return NextResponse.json({ code: "IMPORT_RESULT_UNKNOWN", error: "The server could not confirm whether the import was saved. Check the program roster before retrying; do not repeatedly click Commit." }, { status: 503 });
    return NextResponse.json({ code: "IMPORT_ROLLED_BACK", error: "The import was not saved. Roster changes were rolled back. Please retry once or contact your administrator if the error continues." }, { status: 503 });
  }
}
