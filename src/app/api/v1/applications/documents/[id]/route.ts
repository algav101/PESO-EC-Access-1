export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canReadApplication } from "@/lib/application-workflow";
import { downloadApplicationDocument } from "@/lib/application-storage";

export async function GET(request: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const document = await prisma.tupadApplicationDocument.findUnique({ where: { id }, include: { application: { select: { source: true, encodedById: true } } } });
    if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });
    if (!canReadApplication(user, document.application)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const blob = await downloadApplicationDocument(document.storageBucket, document.storageKey);
    return new NextResponse(await blob.arrayBuffer(), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to open the private document." }, { status: 500 });
  }
}
