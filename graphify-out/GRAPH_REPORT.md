# Graph Report - PESO-EC-Access-1  (2026-11-18)

## Corpus Check
- 378 files · ~1,444,575 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 33 file(s) not represented in the graph (top: .csv 26, .css 2, .example 1)

## Summary
- 1905 nodes · 4746 edges · 116 communities (92 shown, 24 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2269e4df`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- next
- dexie.ts
- dependencies
- test-accomplishment-work-schedule.mjs
- logAudit
- dashboard/page.tsx
- application-schema.ts
- stubs/page.tsx
- stub-distribution/page.tsx
- application-service.ts
- MasterlistUploadModal.tsx
- test-application-workflow.mjs
- completion-report-template.ts
- react
- apply/inquiry/page.tsx
- identity-address.ts
- application-id-mapper.ts
- scripts
- start-localhost.mjs
- test-local-id-reader.mjs
- compilerOptions
- v1/beneficiaries/import/commit/route.ts
- test-roster-restriction-browser.mjs
- test-application-id-autofill.mjs
- ref_path
- Layout & Components
- @prisma/client
- matrix/page.tsx
- Layout & Components
- inspect-all-sources.js
- test-roster-restriction-preview.mjs
- ApplicationInbox.tsx
- check-remote.js
- seed.js
- ref_fs
- browser-id-ocr.ts
- manifest.json
- utils.ts
- import-final-522-beneficiaries.mjs
- master-sync-all-data.js
- prepare-dole-template.mjs
- v1/applications/route.ts
- TUPAD application ID autofill and walk-in encoding
- getCurrentUser
- middleware.ts
- ApplicationInbox.tsx
- migration.sql
- restrictions/route.ts
- FieldQrPassGeneratorCard.tsx
- effects/TextCubeLoader.tsx
- vercel.json
- StubReplacementWizardModal.tsx
- flag-replacement/route.ts
- Reports: supplied DOLE 2026 workbook
- app/page.tsx
- migrate-user-plain-password.js
- replacements/page.tsx
- test-accomplishment-export-browser.mjs
- test-program-qr-postgres.mjs
- reseed-exact-522-beneficiaries.mjs
- Stitch Design System & UI Screen Guide
- application-workflow.ts
- inspect-db.js
- Guided ID camera
- application-storage.ts
- inspect-flagged.js
- work-program-parser.ts
- Online and walk-in application intake
- test-service-worker-cache.mjs
- update-flagged-beneficiaries.js
- IdUploadPanel.tsx
- inspect-db.mjs
- getCurrentUser
- inspect-program-details.mjs
- engines
- local-id-reader.ts
- tailwindcss
- test-local-ocr-browser.mjs
- test-masterlist-import-postgres.mjs
- inspect-sep21-data.mjs
- normalizeBarangayName
- ref_node_assert
- Reusable QR slots and per-program scan history
- test-application-inbox-browser.mjs
- restrictions/import/route.ts
- test-program-qr-browser.mjs
- test-offline-sync-resilience.mjs
- test-dole-reports-browser.mjs
- @supabase/supabase-js
- test-dole-reports.mjs
- format1-stub-base-b64.ts
- Bagong Pilipinas transparent footer asset
- update-522-sitios.mjs
- cleanup-and-deduplicate.js
- identity-profiles.ts
- fast-update-flagged.js
- auth.ts
- applications/import/route.ts
- beneficiaries/[id]/route.ts
- heal-qr-codes.mjs
- sync-all-password-hashes.mjs
- Q: ayusin mo yung sa driver`s license kasi halos walang nababasa
- test-landing-scanner.mjs
- test-public-inquiry.mjs
- check-reference-slots.js
- test-sorting-and-templates.mjs
- ref_crypto
- test-program-crud.mjs

## God Nodes (most connected - your core abstractions)
1. `getCurrentUser()` - 159 edges
2. `isAdminUser()` - 116 edges
3. `next` - 114 edges
4. `hasPermission()` - 114 edges
5. `react` - 84 edges
6. `logAudit()` - 81 edges
7. `lucide-react` - 74 edges
8. `prisma` - 73 edges
9. `useAuth()` - 69 edges
10. `normalizeBarangayName()` - 64 edges

## Surprising Connections (you probably didn't know these)
- `html()` --indirect_call--> `RosterRestrictionDetails()`  [INFERRED]
  test/test-roster-restriction-preview.mjs → src/components/beneficiaries/RosterRestrictionDetails.tsx
- `run()` --indirect_call--> `selected()`  [INFERRED]
  src/components/reports/DoleReportsPanel.tsx → test/test-local-id-reader.mjs
- `testApi()` --calls--> `signToken()`  [EXTRACTED]
  test/test-users-api.mjs → src/lib/auth.ts
- `addressOf()` --calls--> `mapLocalIdentityText()`  [EXTRACTED]
  test/test-local-id-reader.mjs → src/lib/ocr/application-id-mapper.ts
- `mapped()` --calls--> `mapLocalIdentityText()`  [EXTRACTED]
  test/test-local-id-reader.mjs → src/lib/ocr/application-id-mapper.ts

## Import Cycles
- None detected.

## Communities (116 total, 24 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.09
Nodes (21): name, private, version, autoprefixer, clsx, dexie-react-hooks, @hookform/resolvers, html2canvas (+13 more)

### Community 1 - "next"
Cohesion: 0.06
Nodes (29): next, dynamic, GET(), dynamic, dynamic, POST(), dynamic, dynamic (+21 more)

### Community 2 - "dexie.ts"
Cohesion: 0.09
Nodes (35): dexie, metadata, RootLayout(), viewport, SyncCenterPage(), ServiceWorkerRegister(), AuthProvider(), OfflineContext (+27 more)

### Community 3 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, autoprefixer, bcryptjs, clsx, date-fns, dexie, dexie-react-hooks, exceljs (+33 more)

### Community 4 - "test-accomplishment-work-schedule.mjs"
Cohesion: 0.05
Nodes (37): book, { buildBarangayCompletionDays }, cache, chunks, db, doleBook, downloaded, ExcelJS (+29 more)

### Community 5 - "logAudit"
Cohesion: 0.06
Nodes (33): dynamic, POST(), dynamic, POST(), dynamic, POST(), dynamic, POST() (+25 more)

### Community 6 - "dashboard/page.tsx"
Cohesion: 0.50
Nodes (4): DashboardData, DashboardPage(), dynamic, getDashboardMetrics()

### Community 7 - "application-schema.ts"
Cohesion: 0.11
Nodes (26): zod, OnlineTupadApplicationPage(), ApplicationForm(), ApplicationFormProps, DocumentField, FormErrors, MultiChoice(), Section() (+18 more)

### Community 8 - "stubs/page.tsx"
Cohesion: 0.21
Nodes (15): PrintTemplateMode, StubsContent(), StubsDesignerPage(), ETUPAD_BASE_IMAGE, ETupadCard, ETupadCardProps, Format1Stub, Format1StubProps (+7 more)

### Community 9 - "stub-distribution/page.tsx"
Cohesion: 0.21
Nodes (27): DailyAttendancePage(), OrientationContent(), OrientationPage(), PayoutScannerPage(), photosMemoryCache, PhotosPage(), StubDistributionContent(), StubDistributionPage() (+19 more)

### Community 10 - "application-service.ts"
Cohesion: 0.13
Nodes (24): dynamic, POST(), dynamic, POST(), dynamic, POST(), ApplicationWriteAction, isIdempotentReplay() (+16 more)

### Community 11 - "MasterlistUploadModal.tsx"
Cohesion: 0.23
Nodes (12): ExcelImportPage(), DEFAULT_EXEMPTION_REASONS, MasterlistUploadModal(), MasterlistUploadModalProps, displayDate(), RosterRestrictionDetails(), ImportPreviewResult, ParsedBeneficiaryRow (+4 more)

### Community 12 - "test-application-workflow.mjs"
Cohesion: 0.08
Nodes (23): audits, cache, countQueries, deleted, detail, docs, encode, fakePrisma (+15 more)

### Community 13 - "completion-report-template.ts"
Cohesion: 0.09
Nodes (40): prisma, testExport(), dynamic, GET(), maxDuration, AttendanceActivity, buildBarangayCompletionDays(), cleanActivity() (+32 more)

### Community 14 - "react"
Cohesion: 0.11
Nodes (24): lucide-react, react, AuditLogsPage(), DINGALAN_BARANGAYS, UserManagementPage(), BeneficiaryProfilePage(), dynamic, ProgramDetailsHub() (+16 more)

### Community 15 - "apply/inquiry/page.tsx"
Cohesion: 0.48
Nodes (4): metadata, PublicInquiryPage(), PublicInquiryMessageForm(), PublicStatusInquiryCard()

### Community 16 - "identity-address.ts"
Cohesion: 0.28
Nodes (16): ADDRESS_LABEL, ADDRESS_STOP, addressLike(), addressPiece(), addressStart(), barangayPattern(), escape(), IdentityAddress (+8 more)

### Community 17 - "application-id-mapper.ts"
Cohesion: 0.20
Nodes (26): calculateAge(), applyOcrAutofill(), birthDateValue(), clean(), cleanLocalValue(), cleanPersonName(), explicitLabel(), fieldValue() (+18 more)

### Community 18 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, dev, lint, postinstall, prepare:ocr, prisma:generate, prisma:push (+9 more)

### Community 19 - "start-localhost.mjs"
Cohesion: 0.16
Nodes (13): core, output, require, root, main(), openBrowser(), portIsAvailable(), projectDir (+5 more)

### Community 20 - "test-local-id-reader.mjs"
Cohesion: 0.05
Nodes (34): run(), addressCrop, addressLines, backStatusRegions, birthCrop, certificate, certificateLayout, conflict (+26 more)

### Community 21 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx (+12 more)

### Community 22 - "v1/beneficiaries/import/commit/route.ts"
Cohesion: 0.11
Nodes (42): dynamic, GET(), dynamic, GET(), maxDuration, POST(), canUseDoleReports(), DOLE_REPORT_SHEETS (+34 more)

### Community 23 - "test-roster-restriction-browser.mjs"
Cohesion: 0.29
Nodes (6): baseRow, errors, preview, program, require, rows

### Community 24 - "test-application-id-autofill.mjs"
Cohesion: 0.08
Nodes (28): dynamic, isRateLimited(), maxDuration, POST(), providerMessage(), rateLimit, applicationFinalSchema, mergeOcrSides() (+20 more)

### Community 25 - "ref_path"
Cohesion: 0.08
Nodes (11): __dirname, nextConfig, prisma, fs, path, { PrismaClient }, prisma, fs (+3 more)

### Community 26 - "Layout & Components"
Cohesion: 0.14
Nodes (13): 1. DICT GWT Utility Header, 2. Official Municipal Masthead, 3. Hero Citizen Announcement Card, 4. Telemetry Metric Strip, 5. Public Status Inquiry Module (`#inquiry`), 6. Work Area Assignment Lookup (`#work-assignment`), 7. Direct Feedback Desk (`#inquiry-form`), 8. DICT Standard GWT Footer (+5 more)

### Community 27 - "@prisma/client"
Cohesion: 0.05
Nodes (16): @prisma/client, prisma, prisma, prisma, prisma, prisma, prisma, prisma (+8 more)

### Community 28 - "matrix/page.tsx"
Cohesion: 0.20
Nodes (12): AttendanceMatrixContent(), AttendanceMatrixPage(), RestrictionsPage(), AdminStubOverrideModal(), AdminStubOverrideModalProps, REPLACEMENT_REASONS, MultiSelectFilter(), MultiSelectFilterProps (+4 more)

### Community 29 - "Layout & Components"
Cohesion: 0.14
Nodes (13): 1. DICT GWT Utility Header, 2. Official Municipal Masthead, 3. Hero Citizen Announcement Card, 4. Telemetry Metric Strip, 5. Public Status Inquiry Module (`#inquiry`), 6. Work Area Assignment Lookup (`#work-assignment`), 7. Direct Feedback Desk (`#inquiry-form`), 8. DICT Standard GWT Footer (+5 more)

### Community 30 - "inspect-all-sources.js"
Cohesion: 0.11
Nodes (16): Database, db, fs, summary, tables, Database, db, fs (+8 more)

### Community 31 - "test-roster-restriction-preview.mjs"
Cohesion: 0.12
Nodes (15): react-dom, activeMarkup, book, buffer, cache, globalRoute, load(), names (+7 more)

### Community 32 - "ApplicationInbox.tsx"
Cohesion: 0.21
Nodes (11): OnlineApplicationsPage(), WalkInSubmissionsPage(), ApplicationInbox(), ApplicationRecord, dateText(), InboxData, sections, valueText() (+3 more)

### Community 33 - "check-remote.js"
Cohesion: 0.15
Nodes (9): isomorphic-git, dir, fs, git, path, dir, fs, git (+1 more)

### Community 34 - "seed.js"
Cohesion: 0.40
Nodes (3): bcrypt, prisma, { PrismaClient }

### Community 35 - "ref_fs"
Cohesion: 0.09
Nodes (9): pngjs, backup, fs, prisma, { PrismaClient }, downloadImage(), b64, fs (+1 more)

### Community 36 - "browser-id-ocr.ts"
Cohesion: 0.15
Nodes (30): tesseract.js, normalizeIdLighting(), detectIdentityDocumentType(), OcrSubject, active(), canvas(), context(), crop() (+22 more)

### Community 37 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 38 - "utils.ts"
Cohesion: 0.06
Nodes (63): date-fns, runTests(), validateDuration(), dynamic, POST(), dynamic, ImportConflict, maxDuration (+55 more)

### Community 39 - "import-final-522-beneficiaries.mjs"
Cohesion: 0.36
Nodes (7): DINGALAN_BARANGAYS, main(), MONTH_NAME_MAP, normalizeBarangayName(), normalizeSitioName(), parseCSVLine(), prisma

### Community 40 - "master-sync-all-data.js"
Cohesion: 0.36
Nodes (7): chunkArray(), fs, main(), path, { PrismaClient }, toBool(), toDate()

### Community 41 - "prepare-dole-template.mjs"
Cohesion: 0.11
Nodes (15): jszip, cache, load(), original, output, require, review, root (+7 more)

### Community 42 - "v1/applications/route.ts"
Cohesion: 0.25
Nodes (9): details, dynamic, GET(), PATCH(), DELETE(), dynamic, GET(), isIntakeSource() (+1 more)

### Community 43 - "TUPAD application ID autofill and walk-in encoding"
Cohesion: 0.22
Nodes (8): Database migration, Local ID reading (default; no Azure key required), Number recovery and optional close-up, Optional Azure API, Required private storage configuration, TUPAD application ID autofill and walk-in encoding, Verification, What is implemented

### Community 44 - "getCurrentUser"
Cohesion: 0.08
Nodes (47): DELETE(), dynamic, PATCH(), dynamic, GET(), dynamic, GET(), PATCH() (+39 more)

### Community 46 - "ApplicationInbox.tsx"
Cohesion: 0.17
Nodes (22): cameraError(), IdCameraCapture(), Props, CameraRect, getCameraGuideRect(), getCameraSourceCrop(), getIdCameraPreset(), ID_CAMERA_GUIDES (+14 more)

### Community 47 - "migration.sql"
Cohesion: 0.33
Nodes (8): "TupadApplicationDocument", TupadApplicationDocument_applicationId_fieldName_idx, TupadApplicationDocument_uploadedById_idx, TupadApplicationRoster_applicationCode_key, TupadApplicationRoster_encodedById_idx, TupadApplicationRoster_idempotencyKey_key, TupadApplicationRoster_source_submissionStatus_idx, TupadApplicationRoster_submittedAt_idx

### Community 48 - "restrictions/route.ts"
Cohesion: 0.47
Nodes (5): dynamic, GET(), maskFullName(), parsePayoutDateToTimestamp(), POST()

### Community 49 - "FieldQrPassGeneratorCard.tsx"
Cohesion: 0.07
Nodes (38): AdminApplicationsPage(), AdminInquiriesPage(), FIELD_OPERATIONS, FieldScannerHubContent(), FieldScannerHubPage(), buildPresetRoleGroups(), DEFAULT_ROLE_GROUPS, LoginPage() (+30 more)

### Community 50 - "effects/TextCubeLoader.tsx"
Cohesion: 0.43
Nodes (3): Loading(), TextCubeLoader(), TextCubeLoaderProps

### Community 51 - "vercel.json"
Cohesion: 0.25
Nodes (7): buildCommand, framework, functions, src/app/api/**/*, $schema, includeFiles, maxDuration

### Community 52 - "StubReplacementWizardModal.tsx"
Cohesion: 0.20
Nodes (11): CapturedIdPayload, CaptureSlotKey, compressFileToPayload(), formatMmDdYyyyInput(), ORIGINAL_TO_REPLACEMENT_RELATIONSHIPS, Props, REPLACEMENT_REASON_OPTIONS, StubReplacementTarget (+3 more)

### Community 53 - "flag-replacement/route.ts"
Cohesion: 0.24
Nodes (12): dynamic, POST(), dynamic, POST(), evaluatePersonTupadEligibility(), normalizeBirthdayComparison(), ParsedPersonName, parseEnteredFullName() (+4 more)

### Community 54 - "Reports: supplied DOLE 2026 workbook"
Cohesion: 0.33
Nodes (5): Preservation and source handling, Program isolation and persistence, Reports: supplied DOLE 2026 workbook, User workflow, Verification

### Community 55 - "app/page.tsx"
Cohesion: 0.13
Nodes (19): dynamic, LandingPage(), LandingNavDrawer(), NavDrawerCategory, NavDrawerItem, FacebookUpdatesSection(), PesoOrganizationalChart(), PEOPLE (+11 more)

### Community 56 - "migrate-user-plain-password.js"
Cohesion: 0.50
Nodes (4): getPresetPassword(), main(), prisma, { PrismaClient }

### Community 57 - "replacements/page.tsx"
Cohesion: 0.27
Nodes (10): ReplacementsContent(), ReplacementsPage(), ReportCenterPage(), DOC_LABELS, PendingReplacementAssessmentItem, Props, ReplacementApprovalModal(), DoleReportsPanel() (+2 more)

### Community 58 - "test-accomplishment-export-browser.mjs"
Cohesion: 0.22
Nodes (6): exceljs, dynamic, ExcelJS, fixture, programs, require

### Community 59 - "test-program-qr-postgres.mjs"
Cohesion: 0.12
Nodes (14): cacheRoot, dataDir, listener, load(), { PrismaClient }, require, root, cacheRoot (+6 more)

### Community 60 - "reseed-exact-522-beneficiaries.mjs"
Cohesion: 0.36
Nodes (7): DINGALAN_BARANGAYS, formatBday(), main(), normalizeBarangayName(), normalizeSitioName(), prisma, rawData

### Community 61 - "Stitch Design System & UI Screen Guide"
Cohesion: 0.40
Nodes (4): 1. How to Access and Edit in Stitch, 2. Included Local Artifacts, 3. How to Upload a Modified `DESIGN.md` to Stitch in the Future, Stitch Design System & UI Screen Guide

### Community 62 - "application-workflow.ts"
Cohesion: 0.29
Nodes (7): dynamic, GET(), WalkInEncodingPage(), downloadApplicationDocument(), canEncodeWalkIn(), canReadApplication(), INTAKE_SOURCES

### Community 64 - "Guided ID camera"
Cohesion: 0.40
Nodes (4): Browser/privacy requirements, Capture flow, Guided ID camera, Verification

### Community 65 - "application-storage.ts"
Cohesion: 0.31
Nodes (9): ACCEPTED_APPLICATION_FILE_TYPES, isAcceptedApplicationFile(), MAX_APPLICATION_FILE_SIZE, APPLICATION_DOCUMENT_BUCKET, ensurePrivateBucket(), extensionFor(), getPrivateStorageClient(), removeApplicationDocuments() (+1 more)

### Community 67 - "work-program-parser.ts"
Cohesion: 0.09
Nodes (20): xlsx, dynamic, dynamic, POST(), dynamic, DINGALAN_BARANGAYS, normalizeBarangay(), ParsedBarangayWorkProgram (+12 more)

### Community 68 - "Online and walk-in application intake"
Cohesion: 0.33
Nodes (5): Admin review, Database and private storage, Online and walk-in application intake, Pages and roles, Verification

### Community 69 - "test-service-worker-cache.mjs"
Cohesion: 0.06
Nodes (22): typescript, exported, card, module, paper, source, blurred, clearResult (+14 more)

### Community 70 - "update-flagged-beneficiaries.js"
Cohesion: 0.40
Nodes (3): flaggedReference, prisma, { PrismaClient }

### Community 71 - "IdUploadPanel.tsx"
Cohesion: 0.36
Nodes (8): FieldProps, FilePreview(), IdUploadPanel(), IdUploadPanelProps, OcrResponse, ApplicationFormValues, OcrAutofillStatus, OcrConflict

### Community 73 - "getCurrentUser"
Cohesion: 0.10
Nodes (25): dynamic, GET(), POST(), dynamic, POST(), DELETE(), dynamic, GET() (+17 more)

### Community 75 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, npm

### Community 76 - "local-id-reader.ts"
Cohesion: 0.18
Nodes (17): extractPhilSysNumber(), MappedOcrSide, MergedOcrResult, NON_BIRTH_DATE_LABEL, OcrTextLine, ORDERED_NAME_LABEL, extractProfileNumber(), identityNumberRows() (+9 more)

### Community 78 - "test-local-ocr-browser.mjs"
Cohesion: 0.40
Nodes (3): jspdf, qrcode, require

### Community 79 - "test-masterlist-import-postgres.mjs"
Cohesion: 0.24
Nodes (8): cacheRoot, dataDir, get(), listener, load(), { PrismaClient }, require, root

### Community 81 - "normalizeBarangayName"
Cohesion: 0.12
Nodes (40): main(), prisma, POST(), BeneficiariesMasterlistContent(), loadData(), BeneficiariesMasterlistPage(), FieldWorkProgramPage(), WorkProgramManagementPage() (+32 more)

### Community 82 - "ref_node_assert"
Cohesion: 0.06
Nodes (28): errors, require, login(), run(), errors, require, errors, require (+20 more)

### Community 83 - "Reusable QR slots and per-program scan history"
Cohesion: 0.40
Nodes (4): More than 522 beneficiaries, Offline devices, Program-owned QR codes and scan history, Verification

### Community 84 - "test-application-inbox-browser.mjs"
Cohesion: 0.29
Nodes (5): errors, fixture, record, requests, require

### Community 85 - "restrictions/import/route.ts"
Cohesion: 0.39
Nodes (7): addDaysToDate(), checkIsAppointive(), dynamic, maxDuration, parseDateToISO(), parseNameParts(), POST()

### Community 86 - "test-program-qr-browser.mjs"
Cohesion: 0.29
Nodes (5): calls, errors, programs, require, roster

### Community 88 - "test-dole-reports-browser.mjs"
Cohesion: 0.25
Nodes (6): errors, files, programs, require, saved, writes

### Community 89 - "@supabase/supabase-js"
Cohesion: 0.33
Nodes (3): @supabase/supabase-js, supabase, supabaseAdmin

### Community 90 - "test-dole-reports.mjs"
Cohesion: 0.08
Nodes (21): IS_LOCAL_DEVELOPMENT, PRECACHE_ASSETS, api, base, cache, config, data, db (+13 more)

### Community 99 - "update-522-sitios.mjs"
Cohesion: 0.47
Nodes (5): DINGALAN_BARANGAYS, main(), normalizeBarangayName(), normalizeSitioName(), prisma

### Community 102 - "identity-profiles.ts"
Cohesion: 0.33
Nodes (4): genericNumbers, IdentityDocumentType, IdentityProfile, PROFILES

### Community 103 - "fast-update-flagged.js"
Cohesion: 0.40
Nodes (3): flaggedReference, prisma, { PrismaClient }

### Community 104 - "auth.ts"
Cohesion: 0.12
Nodes (19): bcryptjs, dynamic, POST(), dynamic, GET(), dynamic, generateTrackingCode(), POST() (+11 more)

### Community 105 - "applications/import/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, getVal(), POST()

### Community 106 - "beneficiaries/[id]/route.ts"
Cohesion: 0.50
Nodes (3): DELETE(), dynamic, GET()

### Community 109 - "Q: ayusin mo yung sa driver`s license kasi halos walang nababasa"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ayusin mo yung sa driver`s license kasi halos walang nababasa, Source Nodes

### Community 114 - "check-reference-slots.js"
Cohesion: 0.40
Nodes (3): prisma, { PrismaClient }, referenceSlots

### Community 118 - "ref_crypto"
Cohesion: 0.21
Nodes (6): jsqr, pdfjs-dist, prisma, metadata, WorkAreaAssignmentInquiryPage(), PublicWorkAssignmentLookupCard()

## Knowledge Gaps
- **14 isolated node(s):** `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs`, `@types/jsonwebtoken`, `@types/jszip` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 868 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `@prisma/client` to `package.json`, `next`, `test-program-crud.mjs`, `application-service.ts`, `completion-report-template.ts`, `v1/beneficiaries/import/commit/route.ts`, `ref_path`, `inspect-all-sources.js`, `seed.js`, `ref_fs`, `utils.ts`, `import-final-522-beneficiaries.mjs`, `master-sync-all-data.js`, `v1/applications/route.ts`, `migrate-user-plain-password.js`, `test-program-qr-postgres.mjs`, `reseed-exact-522-beneficiaries.mjs`, `inspect-db.js`, `inspect-flagged.js`, `work-program-parser.ts`, `update-flagged-beneficiaries.js`, `inspect-db.mjs`, `inspect-program-details.mjs`, `test-masterlist-import-postgres.mjs`, `inspect-sep21-data.mjs`, `normalizeBarangayName`, `test-offline-sync-resilience.mjs`, `@supabase/supabase-js`, `update-522-sitios.mjs`, `cleanup-and-deduplicate.js`, `fast-update-flagged.js`, `heal-qr-codes.mjs`, `sync-all-password-hashes.mjs`, `test-landing-scanner.mjs`, `test-public-inquiry.mjs`, `check-reference-slots.js`, `test-sorting-and-templates.mjs`, `ref_crypto`?**
  _High betweenness centrality (0.210) - this node is a cross-community bridge._
- **What connects `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `package.json`, `dexie.ts`, `logAudit`, `dashboard/page.tsx`, `stubs/page.tsx`, `stub-distribution/page.tsx`, `application-service.ts`, `MasterlistUploadModal.tsx`, `completion-report-template.ts`, `react`, `apply/inquiry/page.tsx`, `v1/beneficiaries/import/commit/route.ts`, `test-application-id-autofill.mjs`, `matrix/page.tsx`, `utils.ts`, `v1/applications/route.ts`, `getCurrentUser`, `middleware.ts`, `restrictions/route.ts`, `FieldQrPassGeneratorCard.tsx`, `flag-replacement/route.ts`, `app/page.tsx`, `replacements/page.tsx`, `test-accomplishment-export-browser.mjs`, `application-workflow.ts`, `work-program-parser.ts`, `getCurrentUser`, `normalizeBarangayName`, `restrictions/import/route.ts`, `auth.ts`, `applications/import/route.ts`, `beneficiaries/[id]/route.ts`, `ref_crypto`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **Should `next` be split into smaller, more focused modules?**
  _Cohesion score 0.06285714285714286 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `package.json`, `dexie.ts`, `dashboard/page.tsx`, `application-schema.ts`, `stubs/page.tsx`, `stub-distribution/page.tsx`, `MasterlistUploadModal.tsx`, `apply/inquiry/page.tsx`, `v1/beneficiaries/import/commit/route.ts`, `matrix/page.tsx`, `test-roster-restriction-preview.mjs`, `ApplicationInbox.tsx`, `getCurrentUser`, `ApplicationInbox.tsx`, `FieldQrPassGeneratorCard.tsx`, `effects/TextCubeLoader.tsx`, `StubReplacementWizardModal.tsx`, `app/page.tsx`, `replacements/page.tsx`, `IdUploadPanel.tsx`, `normalizeBarangayName`, `ref_crypto`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Should `dexie.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08879492600422834 - nodes in this community are weakly interconnected._