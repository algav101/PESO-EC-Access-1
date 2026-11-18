export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { registerPrintedQr, PrintedQrRegistrationError } from "@/lib/printed-qr-registration";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser(request);
  if (!user || !hasPermission(user.role, "qr.generate")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json();
    if (typeof body.qrToken !== "string" || !body.qrToken.trim()) return NextResponse.json({ error: "A printed QR token is required." }, { status: 400 });
    const data = await prisma.$transaction((tx) => registerPrintedQr(tx, { rawToken: body.qrToken, programId: params.id, userId: user.id }), { timeout: 15000 });
    return NextResponse.json({ success: true, data, message: `Registered printed QR #${data.designatedNumber} to ${data.programCode}: ${data.fullName}. Historical scans were preserved.` });
  } catch (error: any) {
    if (error instanceof PrintedQrRegistrationError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Printed QR registration failed. Please retry." }, { status: 500 });
  }
}
