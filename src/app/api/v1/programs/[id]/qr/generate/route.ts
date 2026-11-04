export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { ensureProgramQrCodes } from "@/lib/program-qr-generation";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "qr.generate")) return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    const body = await request.text();
    let options: any = {};
    try { options = body ? JSON.parse(body) : {}; }
    catch { return NextResponse.json({ error: "Invalid JSON request" }, { status: 400 }); }
    const stats = await prisma.$transaction((tx) => ensureProgramQrCodes(tx, params.id, user.id, {
      barangay: typeof options.barangay === "string" && options.barangay !== "ALL" ? options.barangay : null,
    }), { maxWait: 5000, timeout: 45000 });
    return NextResponse.json({ success: true, ...stats, message: stats.generatedCount
      ? `Added ${stats.generatedCount} missing QR codes: #${stats.firstGeneratedSlot}–#${stats.lastGeneratedSlot}. Existing QR codes and scan history were preserved.`
      : "Complete na ang QR codes ng uploaded roster. Walang idinagdag o ni-reset na scan history." });
  } catch (error: any) {
    if (error.message === "QR_GENERATION_BUSY") return NextResponse.json({ error: "May ongoing import/QR generation sa program. Hintaying matapos." }, { status: 409 });
    if (error.message === "QR_PROGRAM_NOT_FOUND") return NextResponse.json({ error: "Program not found" }, { status: 404 });
    console.error("QR generation failed", { code: error.code || error.name });
    return NextResponse.json({ error: "Hindi makumpirma ang QR generation. I-refresh muna ang roster bago ulitin." }, { status: 503 });
  }
}
