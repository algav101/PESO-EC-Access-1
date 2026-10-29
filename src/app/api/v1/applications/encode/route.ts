export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canEncodeWalkIn } from "@/lib/application-workflow";
import { ApplicationValidationError, parseApplicationRequest, saveApplication } from "@/lib/application-service";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || !canEncodeWalkIn(user)) {
    return NextResponse.json({ error: "Forbidden: Walk-in encoding access is required." }, { status: 403 });
  }

  try {
    const input = await parseApplicationRequest(request);
    const result = await saveApplication({ ...input, source: "WALK_IN", encoderId: user.id });
    await logAudit({
      userId: user.id,
      action: input.action === "DRAFT" ? "APPLICATION_DRAFT_SAVED" : "WALK_IN_APPLICATION_SUBMITTED",
      entityType: "TupadApplicationRoster",
      entityId: result.application.id,
      metadata: { source: "WALK_IN", duplicateWarning: result.duplicateWarning },
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof ApplicationValidationError) {
      return NextResponse.json({ error: "Please review the highlighted fields.", fieldErrors: error.fieldErrors }, { status: 400 });
    }
    const storageConfigurationError = error instanceof Error && ["PRIVATE_STORAGE_NOT_CONFIGURED", "PRIVATE_STORAGE_CREDENTIALS_REJECTED", "PRIVATE_STORAGE_BUCKET_UNAVAILABLE", "APPLICATION_DOCUMENT_BUCKET_MUST_BE_PRIVATE"].includes(error.message);
    const message = storageConfigurationError
      ? "Private document storage is unavailable or its server credentials were rejected. The application was not submitted."
      : "Unable to save the walk-in application.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
