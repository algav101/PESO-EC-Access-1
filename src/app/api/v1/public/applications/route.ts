export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ApplicationValidationError, parseApplicationRequest, saveApplication } from "@/lib/application-service";

export async function POST(request: Request) {
  try {
    const input = await parseApplicationRequest(request);
    const result = await saveApplication({ ...input, applicationId: undefined, action: "SUBMIT", source: "ONLINE", encoderId: null });
    return NextResponse.json({
      success: true,
      applicationCode: result.application.applicationCode,
      status: result.application.status,
      submissionStatus: result.application.submissionStatus,
      message: "Matagumpay na naisumite ang aplikasyon para sa review ng PESO Dingalan.",
      applicant: {
        id: result.application.id,
        fullName: result.application.fullName,
        barangay: result.application.barangay,
        submittedAt: result.application.submittedAt,
      },
      duplicateWarning: result.duplicateWarning,
      idempotent: result.idempotent,
    });
  } catch (error) {
    if (error instanceof ApplicationValidationError) {
      return NextResponse.json({ error: "Pakireview ang mga field na may error.", fieldErrors: error.fieldErrors }, { status: 400 });
    }
    const storageConfigurationError = error instanceof Error && ["PRIVATE_STORAGE_NOT_CONFIGURED", "PRIVATE_STORAGE_CREDENTIALS_REJECTED", "PRIVATE_STORAGE_BUCKET_UNAVAILABLE", "APPLICATION_DOCUMENT_BUCKET_MUST_BE_PRIVATE"].includes(error.message);
    const message = storageConfigurationError
      ? "Hindi available ang private document storage o rejected ang server credentials. Makipag-ugnayan sa PESO staff."
      : "Hindi naisumite ang aplikasyon. Subukan muli.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
