export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { readPrintedQrBindings } from "@/lib/printed-qr-registration";

/** Authenticated clients cache QR ownership as well as the program's slot number. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["qr.generate", "orientation.scan", "attendance.scan", "payout.scan", "stub.distribution.scan"].some((p) => hasPermission(user.role, p))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const references = await prisma.qrCode.findMany({
    where: { status: { not: "INVALIDATED" } },
    select: { id: true, publicToken: true, programId: true, programBeneficiary: { select: { designatedNumber: true } } },
  });
  const bindings = await readPrintedQrBindings(prisma, references);
  return NextResponse.json({ slots: references.flatMap((qr) => {
    const binding = bindings.get(qr.id);
    return binding ? [{ publicToken: qr.publicToken.toUpperCase(), designatedNumber: binding.designatedNumber, programId: binding.programId }] : [];
  }) });
}
