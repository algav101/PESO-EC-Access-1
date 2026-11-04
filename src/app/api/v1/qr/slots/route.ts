export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { registeredQrSlot } from "@/lib/program-qr-slot";

/** No names/scan history: authenticated offline clients cache only registered QR→slot references. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["qr.generate", "orientation.scan", "attendance.scan", "payout.scan", "stub.distribution.scan"].some((p) => hasPermission(user.role, p))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const references = await prisma.qrCode.findMany({
    where: { status: { not: "INVALIDATED" } },
    select: { publicToken: true, programBeneficiary: { select: { designatedNumber: true } } },
  });
  return NextResponse.json({ slots: references.flatMap((qr) => {
    const slot = registeredQrSlot(qr.publicToken, qr.programBeneficiary.designatedNumber);
    return slot ? [{ publicToken: qr.publicToken.toUpperCase(), designatedNumber: slot }] : [];
  }) });
}
