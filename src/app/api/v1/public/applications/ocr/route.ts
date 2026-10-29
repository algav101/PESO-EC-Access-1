export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { isAcceptedApplicationFile } from "@/lib/application-schema";
import { analyzeIdentityDocument, isAzureDocumentIntelligenceConfigured } from "@/lib/ocr/azure-document-intelligence";
import { mapAzureIdentityResult, mergeOcrSides, type OcrSubject } from "@/lib/ocr/application-id-mapper";

const rateLimit = new Map<string, { count: number; resetAt: number }>();

function providerMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : "";
  if (/_(401|403)$/.test(code)) return "Azure could not authenticate. Check the server's Azure endpoint, key, and resource access settings.";
  if (/_429$/.test(code)) return "Azure's request limit or quota was reached. Please try again later.";
  if (/_413$/.test(code)) return "The ID exceeds Azure's file-size limit. Try a smaller image or PDF.";
  if (/_404$/.test(code)) return "Azure could not find the OCR resource or model. Check the server configuration.";
  if (/TIMEOUT/i.test(code) || (error instanceof Error && error.name === "TimeoutError")) return "Azure took too long to read the ID. Please try again.";
  return "Azure could not read the ID. Try a clearer image or continue with manual encoding.";
}

function isRateLimited(request: Request): boolean {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const current = rateLimit.get(key);
  if (!current || current.resetAt <= now) {
    rateLimit.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 12;
}

export async function POST(request: Request) {
  if (isRateLimited(request)) return NextResponse.json({ error: "Too many OCR requests. Please try again shortly." }, { status: 429 });
  if (!(request.headers.get("content-type") || "").includes("multipart/form-data")) {
    return NextResponse.json({ error: "OCR requests must include an ID image or PDF." }, { status: 415 });
  }

  try {
    const formData = await request.formData();
    const subject: OcrSubject = formData.get("subject") === "DEPENDENT" ? "DEPENDENT" : "APPLICANT";
    const front = formData.get("front");
    const back = formData.get("back");
    const files = [front, back].filter((item): item is File => item instanceof File && item.size > 0);
    if (files.length === 0) return NextResponse.json({ error: "Upload at least one ID image or PDF." }, { status: 400 });

    for (const file of files) {
      const validationError = isAcceptedApplicationFile(file);
      if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (!isAzureDocumentIntelligenceConfigured()) {
      return NextResponse.json({
        configured: false,
        status: "Unable to Read ID",
        fields: {},
        uncertainFields: [],
        conflicts: [],
        provider: "AZURE_DOCUMENT_INTELLIGENCE",
        message: "Azure OCR is not configured. Set AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY on the server, then restart the app.",
      });
    }

    const readSide = async (candidate: FormDataEntryValue | null) => {
      if (!(candidate instanceof File) || candidate.size === 0) return null;
      const result = await analyzeIdentityDocument(Buffer.from(await candidate.arrayBuffer()));
      return mapAzureIdentityResult(result, subject);
    };

    const [frontResult, backResult] = await Promise.allSettled([readSide(front), readSide(back)]);
    const merged = mergeOcrSides(
      frontResult.status === "fulfilled" ? frontResult.value : null,
      backResult.status === "fulfilled" ? backResult.value : null
    );

    const failures = [frontResult, backResult].filter((result) => result.status === "rejected");
    const firstFailure = failures[0];
    const message = firstFailure?.status === "rejected"
      ? `${providerMessage(firstFailure.reason)}${Object.keys(merged.fields).length ? " Review the fields extracted from the other side." : ""}`
      : merged.status === "Unable to Read ID"
        ? "Azure could not identify clear ID fields. Try a clearer image or continue with manual encoding."
        : "Azure ID reading completed. Review the extracted details before submitting.";
    if (failures.length && merged.status !== "Unable to Read ID") merged.status = "Needs Review";
    return NextResponse.json({ configured: true, ...merged, provider: "AZURE_DOCUMENT_INTELLIGENCE", message });
  } catch (error) {
    return NextResponse.json({
      configured: true,
      status: "Unable to Read ID",
      fields: {},
      uncertainFields: [],
      conflicts: [],
      provider: "AZURE_DOCUMENT_INTELLIGENCE",
      message: providerMessage(error),
    });
  }
}
