export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { registerPrintedQr, registerPrintedQrBatch, PrintedQrRegistrationError } from "@/lib/printed-qr-registration";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser(request);
  if (!user || !hasPermission(user.role, "qr.generate")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json();
    if (typeof body.sourceProgramId === "string" && body.sourceProgramId.trim()) {
      if (body.qrToken) return NextResponse.json({ error: "Choose single-card or batch registration." }, { status: 400 });
      const data = await prisma.$transaction((tx) => registerPrintedQrBatch(tx, { sourceProgramId: body.sourceProgramId.trim(), programId: params.id, userId: user.id }), { timeout: 30000 });
      return NextResponse.json({ success: true, data, message: `Registered ${data.registeredCount} printed QR codes to ${data.programCode}; ${data.alreadyRegisteredCount} already registered; ${data.skippedCount} skipped without an active masterlist slot. Historical scans were preserved.` });
    }
    if (typeof body.qrToken !== "string" || !body.qrToken.trim()) return NextResponse.json({ error: "A printed QR token is required." }, { status: 400 });
    const data = await prisma.$transaction((tx) => registerPrintedQr(tx, { rawToken: body.qrToken, programId: params.id, userId: user.id }), { timeout: 15000 });
    return NextResponse.json({ success: true, data, message: `Registered printed QR #${data.designatedNumber} to ${data.programCode}: ${data.fullName}. Historical scans were preserved.` });
  } catch (error: any) {
    if (error instanceof PrintedQrRegistrationError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Printed QR registration failed. Please retry." }, { status: 500 });
  }
}
