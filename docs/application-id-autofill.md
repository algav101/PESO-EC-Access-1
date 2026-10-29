# TUPAD application ID autofill and walk-in encoding

## What is implemented

- `/apply` uses the shared TUPAD application form for public online applications.
- `/admin/applications/walk-in` uses the same fields and validation for authorized staff, with Save Draft, Review Application, Submit Application, and Encode Next Applicant.
- Applicant and dependent ID extraction are separate. Front/back conflicts and provider-uncertain fields are marked for manual review.
- Manual values are never replaced by a later OCR upload. OCR never submits, approves, determines fitness to work, or invents fields that are not on an ID.
- Final submission is idempotent through a unique `idempotencyKey`; a replay returns the previously submitted record.
- Possible duplicates are warnings only. Checks require an ID number, or a full-name match together with birth date/contact number.
- Application documents are stored in a private Supabase Storage bucket and streamed only through the authenticated `application.download` API.
- Each saved application records `ONLINE` or `WALK_IN`, the encoder for walk-ins, timestamps, OCR/manual/calculation provenance, and document metadata.

## Database migration

The additive migration is in:

`prisma/migrations/20261028000100_application_id_autofill/migration.sql`

It preserves all existing `TupadApplicationRoster` fields and records, backfills old source values from `batchName`, and adds structured fields/documents. Apply it in the target environment after a database backup:

```powershell
npx prisma migrate deploy --schema=./prisma/schema.prisma
npx prisma generate --schema=./prisma/schema.prisma
```

The migration was not automatically deployed to the connected remote database during development.

## Required private storage configuration

Set these server-side variables:

```dotenv
SUPABASE_SERVICE_ROLE_KEY="..."
TUPAD_APPLICATION_DOCUMENTS_BUCKET="tupad-application-documents"
```

`SUPABASE_URL` or the existing `NEXT_PUBLIC_SUPABASE_URL` must also be present. The server creates the bucket through the Storage API if needed with `public: false`, a 10 MB per-file limit, and image/PDF MIME restrictions. Never expose the service-role key with a `NEXT_PUBLIC_` prefix.

Documents are uploaded by the server with unique, non-overwriting keys. Browsers never receive the storage key or service credential. Staff downloads go through `/api/v1/applications/documents/[id]`, which rechecks the current application permission before returning `private, no-store` content.

## Local ID reading (default; no Azure key required)

The form reads IDs in the browser using self-hosted Tesseract.js 7 and jsQR. The worker, best-int English language model, WASM cores, and PDF.js worker are copied from installed packages into the generated, git-ignored `public/ocr/local-v1` directory by `npm run prepare:ocr`. Preparation also runs during install, development startup, and production builds.

The pipeline reads QR identity fields, checks orientation, compares original and contrast-enhanced OCR, and rereads label-bounded name/date/number regions. Philippine national ID text can receive additional name-column and card-number passes; adaptive thresholding helps recover faint text. Two pages per PDF are supported, with a notice when a longer PDF is truncated. Unsupported/encrypted QR contents fall back to printed-text OCR. QR decoding does not authenticate an ID or verify its signature.

All locally extracted values require review. Birthday is validated and age is computed from the accepted date. Replacing an upload clears old OCR values and conflicts for that person, while preserving manual edits and the other person's fields. Cancelling an old scan prevents it from replacing a newer result. A failed side does not discard fields read from the other side.

Images are not sent to an external OCR provider during extraction. Application documents are still uploaded to private storage when the application is saved or submitted. Initial model loading and OCR speed depend on the browser/device. Very blurred, cropped, obstructed, or unsupported layouts may still need manual encoding.

### Number recovery and optional close-up

Driver's-license recovery conservatively isolates a large light card against a dark background and checks right-angle orientation using both personal fields and recognized license headings. The original upload remains unchanged. Driver OCR also compares sparse-text and automatic page segmentation, separating wide-gap table columns using word geometry. A recognized LTO title plus DOB-column placement can enable focused name/DOB/sex/address/license-number passes for the current portrait-on-left front layout; other layouts retain label-based recovery.

The explicit Last / First / Middle heading supports a surname-first value such as `REYES, MARIA ANA DE LA CRUZ`, including OCR periods in the heading. Broken headings cannot become person-name values in combined-name crops. Driver numbers must match the license-token shape, excluding adjacent expiration dates; only limited numeric-position glyph confusion is corrected, never missing digits. Civil status remains empty when not printed. All recovered values remain Needs Review.

Voter-certificate combined names are supported for both applicant and dependent fields when the printed `Name` value has an explicit surname-first comma. Multiword given names and middle-name particles such as `DELA` / `DE LA` are retained, suffixes are separated, and a middle initial is never expanded into a made-up full name. Ambiguous unseparated names remain for manual encoding; parsed names remain Needs Review.

Table values on the same baseline to the right of a label are read before looking below it. Birthday geometry is authoritative when a DOB label is located: an empty value cannot fall back to flattened OCR order. Birthday crops stop at registration/issue/expiry labels (including common OCR misspellings), and place-of-birth headings are not treated as birthday headings. A missing DOB leaves calculated age empty instead of borrowing a registration date. Dependent extraction remains namespaced and cannot populate applicant fields.

Colored security-print recovery adds dark-ink masks at several cutoffs and isolates the strongest text baseline for PCN recognition. Two agreeing complete PCN reads are required before promoting these region-specific alternatives. Dense card QR codes are also tried at medium/native-like resolutions with color-ink masks; decoding remains unverified and is not identity authentication. A decoded PhilSys PCN can enable a bounded physical-back civil-status recovery pass, which accepts only an explicitly recognized status word, never a partial word or an inferred status.

Address recovery ignores isolated numeric security-print noise before the first meaningful address line. A unique near-match to the configured barangay list is allowed only in a bounded barangay position with an explicit Dingalan locality (at most one edit for shorter names or two for longer names, no more than 20%). Such values remain marked for review. These corrections are not applied to person names or used to manufacture missing ID digits.

For a landscape physical National ID, the reader also checks the upper-left PCN band and derives a tighter region above-left of the surname label. Agreement between original and thresholded reads in that region can outweigh an unrelated whole-page number; the draft still requires human review. These physical-card coordinates are never used for voter cards, portrait voter certificates, or other agencies. Specific agency labels (including VIN / V.I.N.) take priority over generic ID-number labels, and precinct/contact/receipt labels are excluded from number crops. Existing broad-band recovery remains available for other layouts.

The selected ID profile is used throughout OCR, caching, number normalization and tight-region rereads. Number crops include inline values as well as the area below a label. PhilSys groups split into separate OCR lines are reconstructed only when complete; visual baseline ordering prevents swapping groups or joining distant columns. Number rescue searches upper, middle and lower bands instead of assuming a single card layout.

For supported numeric agencies, complete number-only rows can be read even when the label is missing. Ambiguous rows, incomplete lengths, dates, contact numbers and address text must not silently become ID numbers. Agency length references: [PSA PCN advisory](https://psa.gov.ph/content/advisory-1), [SSS My.SSS guide](https://www.sss.gov.ph/sss/DownloadContent?fileName=SSSForm_MySSS_Brochure.pdf), [PhilHealth circular 2019-0002](https://www.philhealth.gov.ph/circulars/2019/circ2019-0002.pdf), and [Pag-IBIG Member's Data Form](https://www.pagibigfund.gov.ph/document/pdf/dlforms/providentrelated/PFF039_MembersDataForm_V12.pdf). These rules aid parsing; they do not authenticate the card or its number.

An applicant may add an optional **Close-up ID number** image/PDF for local OCR. This extra file is kept only in browser state and is not added to the submission's document payload or private storage. It contributes only `idNumber`, never names or addresses. Full front/back documents are still required. Conflicting readings require review, manual corrections are preserved, and removing the close-up clears its OCR-only number. The panel lists details that were not read or may not be printed on the ID.

A manually edited (including manually cleared) ID number is never silently replaced. If OCR has a different candidate, the form displays it and provides **Gamitin ang nabasang ID number** for explicit acceptance. Changing the ID type, replacing the source documents, or clearing the form clears the candidate.

## Optional Azure API

The existing server endpoint can separately use Azure AI Document Intelligence v4.0 with `prebuilt-idDocument`. It is not called by the default upload panel. To configure that optional API, use these server-side variables:

```dotenv
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT="https://YOUR-RESOURCE.cognitiveservices.azure.com"
AZURE_DOCUMENT_INTELLIGENCE_KEY="..."
AZURE_DOCUMENT_INTELLIGENCE_MODEL="prebuilt-idDocument"
AZURE_DOCUMENT_INTELLIGENCE_API_VERSION="2024-11-30"
```

Credentials stay on the server. This optional API returns a configuration or reading error when credentials are absent or the provider cannot read a document. The local form does not require these credentials. Azure's free tier may reject documents larger than its tier limit even though the application accepts files up to 10 MB.

Azure structured fields take priority. Missing fields can be recovered from printed labels and Azure line coordinates; those fallback values are marked for review. Address words are rejected from name fields. Printed PhilSys PCNs and written birth dates are normalized, and age is calculated from the accepted birth date, including manually corrected dates. Email, phone, income, occupation, beneficiary category, IP/4Ps, disability, relationship, and training choices are never inferred.

Get the endpoint and either access key from the Document Intelligence resource's **Keys and Endpoint** page in Azure Portal. Keep the key server-side; do not use a `NEXT_PUBLIC_` variable. Requests omit paid high-resolution add-ons by default. The optional API reports configuration, authentication, and quota problems without exposing the key. See [Microsoft's ID document model documentation](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/id-document?view=doc-intel-4.0.0).

## Verification

```powershell
npm run test:applications
npm run test:ocr
npm run test:pwa
npx prisma validate --schema=./prisma/schema.prisma
npx tsc --noEmit
npm run build
```

The targeted tests cover clear structured extraction, leading-zero ID numbers, incomplete/blurry fallback, low-quality uncertainty, conflicting front/back values, age calculation, invalid type/size, PDF acceptance, manual-edit preservation after re-upload, and duplicate-submit replay behavior.

Real-image quality still needs testing with approved ID samples. Browser regression tests use synthetic cards and QR data, including rotated/dim images, PDF rendering, manual-edit preservation, and separate dependent fields. Run them against the local server with `npm run test:ocr:browser`; the test file documents installing an isolated Playwright driver. These checks do not guarantee correct extraction from every real ID.

For approved local samples, `test/test-local-ocr-sample.mjs` accepts `OCR_SAMPLE_FRONT`, optional `OCR_SAMPLE_BACK`, and `OCR_SAMPLE_EXPECTED_JSON` containing `front`/`combined` field expectations through process environment variables. It logs only field pass/fail, blocks non-read HTTP requests, and verifies no cloud OCR call occurs. Real photos and personal expectations must not be copied into the repository or committed. A passing sample verifies that sample only, not every camera/ID/layout.

Set `OCR_SAMPLE_SUBJECT=DEPENDENT` and the selected `OCR_SAMPLE_ID_TYPE` to verify a dependent sample; expectations may include `dependentGivenName`, `dependentMiddleName`, `dependentLastName`, `dependentBirthDate`, `dependentAge`, and unchanged applicant fields.
