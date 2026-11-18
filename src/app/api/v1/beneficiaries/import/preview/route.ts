export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { parseBeneficiaryExcelBuffer } from "@/lib/excel-importer";
import { normalizeQrSlot } from "@/lib/program-qr-slot";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "beneficiary.import")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const programId = formData.get("programId");

    if (!file) {
      return NextResponse.json({ error: "No Excel or CSV file provided" }, { status: 400 });
    }

    if (typeof programId !== "string" || !programId.trim() || ["AUTO", "undefined"].includes(programId)) {
      return NextResponse.json({ error: "Select the exact program batch before previewing a masterlist." }, { status: 400 });
    }
    const program = await prisma.program.findUnique({ where: { id: programId }, select: { id: true } });
    if (!program) return NextResponse.json({ error: "Selected program not found." }, { status: 404 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const preview = await parseBeneficiaryExcelBuffer(buffer, file.name, programId);
    const roster = await prisma.programBeneficiary.findMany({
      where: { programId, participationStatus: { in: ["ACTIVE", "ENROLLED", "FLAGGED_FOR_REPLACEMENT"] } },
      select: { designatedNumber: true, beneficiary: { select: { fullName: true } } },
    });
    const slots = new Map(roster.map((pb) => [normalizeQrSlot(pb.designatedNumber), pb.beneficiary.fullName]));
    preview.slotReplacements = preview.rows.flatMap((row) => {
      const previousFullName = slots.get(normalizeQrSlot(row.designatedNumber));
      return previousFullName && previousFullName.trim().toUpperCase() !== row.fullName.trim().toUpperCase()
        ? [{ designatedNumber: row.designatedNumber, previousFullName, fullName: row.fullName }] : [];
    });

    return NextResponse.json({ success: true, preview, resolvedProgramId: programId });
  } catch (error: any) {
    console.error("Masterlist import preview error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
