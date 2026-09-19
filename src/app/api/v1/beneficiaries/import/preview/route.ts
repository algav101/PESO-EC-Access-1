export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { parseBeneficiaryExcelBuffer } from "@/lib/excel-importer";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "beneficiary.import")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    let programId = formData.get("programId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No Excel or CSV file provided" }, { status: 400 });
    }

    // If no programId provided, resolve to the most recent active program or fallback
    if (!programId || programId === "AUTO" || programId === "undefined") {
      const activeProg = await prisma.program.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      });
      if (activeProg) {
        programId = activeProg.id;
      } else {
        const anyProg = await prisma.program.findFirst({
          orderBy: { createdAt: "desc" },
        });
        programId = anyProg?.id || "temp-program-id";
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const preview = await parseBeneficiaryExcelBuffer(buffer, file.name, programId);

    return NextResponse.json({ success: true, preview, resolvedProgramId: programId });
  } catch (error: any) {
    console.error("Masterlist import preview error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
