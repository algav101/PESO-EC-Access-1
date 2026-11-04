import type { Prisma } from "@prisma/client";

export interface BeneficiaryImportUpdate {
  id: string;
  barangay?: string | null;
  sitio?: string;
  contactNumber?: string;
  civilStatus?: string;
  occupation?: string;
  isSenior: boolean;
  isPwd: boolean;
  is4Ps: boolean;
  isIp: boolean;
}

export interface ProgramImportUpdate {
  id: string;
  designatedNumber?: string;
  participationStatus: string;
  tableNumber?: string;
  slotGroup?: string;
}

// Constant SQL + bound JSON values: one round trip, not one query per row.
// Keep Prisma's @updatedAt behavior when using SQL for the beneficiary update.
export async function updateImportedBeneficiaries(tx: Prisma.TransactionClient, updates: BeneficiaryImportUpdate[]) {
  if (!updates.length) return;
  const data = [...new Map(updates.map((row) => [row.id, row])).values()];
  const count = await tx.$executeRaw`
    UPDATE "Beneficiary" AS b SET
      "barangay" = COALESCE(v."barangay", b."barangay"),
      "sitio" = COALESCE(v."sitio", b."sitio"),
      "contactNumber" = COALESCE(v."contactNumber", b."contactNumber"),
      "civilStatus" = COALESCE(v."civilStatus", b."civilStatus"),
      "occupation" = COALESCE(v."occupation", b."occupation"),
      "isSenior" = v."isSenior", "isPwd" = v."isPwd",
      "is4Ps" = v."is4Ps", "isIp" = v."isIp", "updatedAt" = CURRENT_TIMESTAMP
    FROM jsonb_to_recordset(${JSON.stringify(data)}::jsonb) AS v(
      id text, "barangay" text, "sitio" text, "contactNumber" text,
      "civilStatus" text, "occupation" text, "isSenior" boolean,
      "isPwd" boolean, "is4Ps" boolean, "isIp" boolean
    ) WHERE b.id = v.id
  `;
  if (count !== data.length) throw new Error("Beneficiary records changed during import");
}

export async function updateImportedEnrollments(tx: Prisma.TransactionClient, programId: string, updates: ProgramImportUpdate[]) {
  if (!updates.length) return;
  const data = [...new Map(updates.map((row) => [row.id, row])).values()];
  const count = await tx.$executeRaw`
    UPDATE "ProgramBeneficiary" AS p SET
      "designatedNumber" = COALESCE(v."designatedNumber", p."designatedNumber"),
      "participationStatus" = v."participationStatus",
      "tableNumber" = COALESCE(v."tableNumber", p."tableNumber"),
      "slotGroup" = COALESCE(v."slotGroup", p."slotGroup")
    FROM jsonb_to_recordset(${JSON.stringify(data)}::jsonb) AS v(
      id text, "designatedNumber" text, "participationStatus" text,
      "tableNumber" text, "slotGroup" text
    ) WHERE p.id = v.id AND p."programId" = ${programId}
  `;
  if (count !== data.length) throw new Error("Program roster changed during import");
}
