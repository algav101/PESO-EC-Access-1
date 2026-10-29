import assert from "node:assert/strict";
import {
  applicationDraftSchema,
  applicationFinalSchema,
  calculateAge,
  createEmptyApplication,
  isAcceptedApplicationFile,
} from "../src/lib/application-schema.ts";
import { applyOcrAutofill, mapAzureIdentityResult, mapLocalIdentityText, mergeOcrSides } from "../src/lib/ocr/application-id-mapper.ts";
import { isIdempotentReplay } from "../src/lib/application-idempotency.ts";
import { analyzeIdentityDocument, isAzureDocumentIntelligenceConfigured } from "../src/lib/ocr/azure-document-intelligence.ts";

const clearFront = mapAzureIdentityResult({
  content: "REPUBLIC OF THE PHILIPPINES\nNATIONAL ID\nBARANGAY PALTIC, DINGALAN",
  documents: [{
    docType: "idDocument",
    fields: {
      FirstName: { valueString: "JUAN", confidence: 0.98 },
      MiddleName: { valueString: "SANTOS", confidence: 0.95 },
      LastName: { valueString: "DELA CRUZ", confidence: 0.99 },
      DateOfBirth: { valueDate: "1990-02-03", confidence: 0.98 },
      Sex: { valueString: "M", confidence: 0.96 },
      DocumentNumber: { valueString: "0012-03A", confidence: 0.97 },
      DocumentType: { valueString: "National ID", confidence: 0.95 },
      Address: { valueString: "PUROK 2, BARANGAY PALTIC, DINGALAN", confidence: 0.91 },
    },
  }],
}, "APPLICANT");

assert.equal(clearFront.fields.givenName, "JUAN", "clear ID extracts given name");
assert.equal(clearFront.fields.idNumber, "0012-03A", "ID number preserves leading zeros and meaningful characters");
assert.equal(clearFront.fields.sex, "MALE", "sex is mapped only from an explicit ID field");
assert.equal(clearFront.fields.barangay, "PALTIC", "address is matched to an allowed barangay");
assert.equal(clearFront.fields.idType, "NATIONAL ID", "ID type maps to the reference-form option");

const localPhilSys = mapLocalIdentityText(`
REPUBLIKA NG PILIPINAS
PAMBANSANG PAGKAKAKILANLAN
Apelyido/Last Name DELA CRUZ
Mga Pangalan/Given Names JUAN CARLO
Gitnang Apelyido/Middle Name SANTOS
Petsa ng Kapanganakan/Date of Birth MAY 05, 1982
1234-5678-9012-3456
Kasarian/Sex MALE
Civil Status MARRIED
Address PUROK 2, BARANGAY PALTIC, DINGALAN
`, "APPLICANT");

assert.equal(localPhilSys.fields.givenName, "JUAN CARLO", "local OCR text maps PhilSys given names");
assert.equal(localPhilSys.fields.lastName, "DELA CRUZ", "local OCR text maps PhilSys surname");
assert.equal(localPhilSys.fields.birthDate, "1982-05-05", "local OCR parses written month birth dates");
assert.equal(localPhilSys.fields.idNumber, "1234-5678-9012-3456", "local OCR preserves grouped PhilSys card numbers");
assert.equal(localPhilSys.fields.sex, "MALE", "local OCR only maps explicitly printed sex");
assert.equal(localPhilSys.fields.civilStatus, "MARRIED", "local OCR maps explicit civil status");
assert.equal(localPhilSys.fields.barangay, "PALTIC", "local OCR matches the address to an allowed barangay");
assert.ok(localPhilSys.uncertainFields.includes("givenName"), "local OCR values are marked for human review");

const noSexGuess = mapLocalIdentityText("M. REYES\nUNLABELED ID TEXT", "APPLICANT");
assert.equal(noSexGuess.fields.sex, undefined, "local OCR does not infer sex from an isolated letter or name");

const qrDependent = mapLocalIdentityText("PHILSYS", "DEPENDENT", {
  "subject.fName": "MARIA",
  "subject.mName": "REYES",
  "subject.lName": "SANTOS",
  "subject.DOB": "2010-11-09",
});
assert.equal(qrDependent.fields.dependentGivenName, "MARIA", "decoded QR fields stay in the dependent namespace");
assert.equal(qrDependent.fields.dependentAge, calculateAge("2010-11-09"), "decoded dependent QR birth date calculates dependent age");

const incomplete = mapAzureIdentityResult({ content: "blurred unreadable image", documents: [{ fields: {} }] }, "APPLICANT");
assert.equal(mergeOcrSides(incomplete, null).status, "Unable to Read ID", "blurry/incomplete input falls back to manual encoding");

const conflictingBack = mapAzureIdentityResult({
  documents: [{ fields: { DocumentNumber: { valueString: "0099-Z", confidence: 0.93 } } }],
}, "APPLICANT");
const conflict = mergeOcrSides(clearFront, conflictingBack);
assert.equal(conflict.status, "Needs Review", "front/back mismatch requires review");
assert.equal(conflict.conflicts[0].field, "idNumber", "conflict names the exact field");

const lowQuality = mapAzureIdentityResult({
  documents: [{ fields: { FirstName: { valueString: "MARIA", confidence: 0.41 } } }],
}, "DEPENDENT");
assert.ok(lowQuality.uncertainFields.includes("dependentGivenName"), "provider uncertainty is marked without inventing a score");

const manuallyCorrected = { ...createEmptyApplication(), givenName: "MANUAL NAME", fieldSources: { givenName: "MANUAL" } };
const reapplied = applyOcrAutofill(manuallyCorrected, { givenName: "OCR REPLACEMENT", lastName: "SANTOS" }, new Set(["givenName"]));
assert.equal(reapplied.givenName, "MANUAL NAME", "re-upload never silently overwrites a manually edited value");
assert.equal(reapplied.lastName, "SANTOS", "re-upload can still fill untouched fields");

const dateOnly = applyOcrAutofill(createEmptyApplication(), { birthDate: "1982-05-05" }, new Set());
assert.equal(dateOnly.applicantAge, calculateAge("1982-05-05"), "a birth date alone automatically calculates age");
assert.equal(dateOnly.fieldSources.applicantAge, "CALCULATION");
const preservedBirthday = applyOcrAutofill({ ...createEmptyApplication(), birthDate: "2000-01-02" }, { birthDate: "1982-05-05", applicantAge: 44 }, new Set(["birthDate"]));
assert.equal(preservedBirthday.applicantAge, calculateAge("2000-01-02"), "age follows the manual birthday when OCR has another date");

const azurePrintedFields = mapAzureIdentityResult({
  content: "NATIONAL ID\nLast Name REYES\nGiven Names MARIA\nMiddle Name SANTOS\nDate of Birth MAY O5, 1982\n1234-567B-9O12-3456",
  documents: [{ fields: { FirstName: { valueString: "MARIA TERESA", confidence: 0.99 } } }],
}, "APPLICANT");
assert.equal(azurePrintedFields.fields.givenName, "MARIA TERESA", "Azure structured fields override printed-text fallback");
assert.equal(azurePrintedFields.fields.lastName, "REYES", "Azure text fills a missing structured surname");
assert.equal(azurePrintedFields.fields.middleName, "SANTOS");
assert.equal(azurePrintedFields.fields.birthDate, "1982-05-05", "OCR-confused date digits are normalized");
assert.equal(azurePrintedFields.fields.idNumber, "1234-5678-9012-3456", "printed PCN is recovered when Azure omits DocumentNumber");
assert.equal(azurePrintedFields.fields.applicantAge, calculateAge("1982-05-05"));
assert.ok(azurePrintedFields.uncertainFields.includes("lastName"), "fallback fields require review");

const misplacedNames = mapAzureIdentityResult({ content: "Last Name\nGiven Names\nARMANDO\nMiddle Name\nPUROK GAWAD" }, "APPLICANT");
assert.equal(misplacedNames.fields.lastName, undefined, "surname lookup stops at a different field label");
assert.equal(misplacedNames.fields.middleName, undefined, "address text cannot become a name");
const line = (content, x, y, width = 160) => ({ content, polygon: [x, y, x + width, y, x + width, y + 20, x, y + 20] });
const layoutAzure = mapAzureIdentityResult({
  content: "NATIONAL ID\nLast Name\nARMANDO\nMiddle Name\nPUROK GAWAD",
  pages: [{ lines: [line("Last Name", 400, 100), line("REYES", 400, 125), line("Given Names", 400, 165), line("ARMANDO", 400, 190), line("Middle Name", 400, 230), line("SANTOS", 400, 255), line("PUROK GAWAD", 50, 270)] }],
}, "APPLICANT");
assert.equal(layoutAzure.fields.lastName, "REYES", "Azure coordinates recover surname despite scrambled text order");
assert.equal(layoutAzure.fields.middleName, "SANTOS", "Azure coordinates keep the middle name in its column");

const originalFetch = globalThis.fetch;
const savedEndpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
const savedKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
try {
  delete process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  delete process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
  assert.equal(isAzureDocumentIntelligenceConfigured(), false);
  await assert.rejects(analyzeIdentityDocument(Buffer.from("test")), /OCR_NOT_CONFIGURED/);
  process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT = "https://example.cognitiveservices.azure.com/";
  process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY = "test-only-key";
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return options.method === "POST"
      ? new Response(null, { status: 202, headers: { "operation-location": "https://example.cognitiveservices.azure.com/operation/1" } })
      : Response.json({ status: "succeeded", analyzeResult: { content: "NATIONAL ID" } });
  };
  assert.equal((await analyzeIdentityDocument(Buffer.from("test"))).content, "NATIONAL ID");
  assert.equal(requests.length, 2, "Azure analysis is submitted and polled");
  assert.ok(!requests[0].url.includes("ocrHighResolution"), "Azure requests do not require the paid high-resolution add-on");
  assert.equal(requests[0].options.headers["Ocp-Apim-Subscription-Key"], "test-only-key");
  globalThis.fetch = async () => new Response(null, { status: 401 });
  await assert.rejects(analyzeIdentityDocument(Buffer.from("test")), /OCR_PROVIDER_REJECTED_401/);
} finally {
  globalThis.fetch = originalFetch;
  if (savedEndpoint === undefined) delete process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  else process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT = savedEndpoint;
  if (savedKey === undefined) delete process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
  else process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY = savedKey;
}

const values = createEmptyApplication();
assert.equal(applicationDraftSchema.safeParse(values).success, true, "incomplete drafts are valid");
assert.equal(applicationFinalSchema.safeParse(values).success, false, "required fields are enforced for final submission");
assert.equal(calculateAge("2000-10-29", new Date("2026-10-28T00:00:00")), 25, "age uses the application date");

assert.match(isAcceptedApplicationFile(new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.png", { type: "image/png" })) || "", /10 MB/, "oversized files are rejected");
assert.match(isAcceptedApplicationFile(new File(["x"], "bad.txt", { type: "text/plain" })) || "", /Image o PDF/, "invalid file types are rejected");
assert.equal(isAcceptedApplicationFile(new File(["pdf"], "id.pdf", { type: "application/pdf" })), null, "PDF documents are accepted");
assert.equal(isIdempotentReplay("SUBMITTED", "SUBMIT"), true, "a repeated final submission returns the original application");
assert.equal(isIdempotentReplay("DRAFT", "SUBMIT"), false, "a draft can still be finalized once");

console.log("Application ID autofill tests passed.");
