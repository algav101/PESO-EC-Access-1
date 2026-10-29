const DEFAULT_API_VERSION = "2024-11-30";
const DEFAULT_MODEL = "prebuilt-idDocument";

export interface AzureDocumentResult {
  content?: string;
  pages?: Array<{
    lines?: Array<{ content?: string; polygon?: number[] }>;
  }>;
  documents?: Array<{
    docType?: string;
    confidence?: number;
    fields?: Record<string, AzureDocumentField>;
  }>;
}

export interface AzureDocumentField {
  content?: string;
  confidence?: number;
  valueString?: string;
  valueDate?: string;
  valueCountryRegion?: string;
  valueSelectionMark?: string;
  valueObject?: Record<string, AzureDocumentField>;
}

export function isAzureDocumentIntelligenceConfigured(): boolean {
  return Boolean(process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT?.trim() && process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY?.trim());
}

export async function analyzeIdentityDocument(buffer: Buffer): Promise<AzureDocumentResult> {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT?.trim().replace(/\/$/, "");
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY?.trim();
  const model = process.env.AZURE_DOCUMENT_INTELLIGENCE_MODEL || DEFAULT_MODEL;
  const apiVersion = process.env.AZURE_DOCUMENT_INTELLIGENCE_API_VERSION || DEFAULT_API_VERSION;

  if (!endpoint || !key) throw new Error("OCR_NOT_CONFIGURED");
  const signal = AbortSignal.timeout(55_000);

  // Omit paid add-ons so the default can also use an F0 resource.
  const analyzeUrl = `${endpoint}/documentintelligence/documentModels/${encodeURIComponent(model)}:analyze?api-version=${encodeURIComponent(apiVersion)}`;
  const response = await fetch(analyzeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": key,
    },
    body: JSON.stringify({ base64Source: buffer.toString("base64") }),
    cache: "no-store",
    signal,
  });

  if (response.status !== 202) throw new Error(`OCR_PROVIDER_REJECTED_${response.status}`);
  const operationLocation = response.headers.get("operation-location");
  if (!operationLocation) throw new Error("OCR_PROVIDER_MISSING_OPERATION");

  for (let attempt = 0; attempt < 40; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, attempt < 3 ? 500 : 900));
    const poll = await fetch(operationLocation, {
      headers: { "Ocp-Apim-Subscription-Key": key },
      cache: "no-store",
      signal,
    });
    if (!poll.ok) throw new Error(`OCR_PROVIDER_POLL_${poll.status}`);
    const result = await poll.json();
    if (result.status === "succeeded") return result.analyzeResult || {};
    if (result.status === "failed") throw new Error("OCR_PROVIDER_ANALYSIS_FAILED");
  }

  throw new Error("OCR_PROVIDER_TIMEOUT");
}
