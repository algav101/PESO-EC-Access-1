# Graph Report - PESO-EC-Access-1  (2026-11-09)

## Corpus Check
- 362 files · ~1,339,182 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 32 file(s) not represented in the graph (top: .csv 26, .css 2, .example 1)

## Summary
- 1764 nodes · 4445 edges · 110 communities (85 shown, 25 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e5ffa24f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- excel-exporter.ts
- IdUploadPanel.tsx
- dependencies
- isAdminUser
- getCurrentUser
- next
- application-schema.ts
- ref_node_module
- dexie.ts
- application-service.ts
- auth.ts
- test-application-workflow.mjs
- login/page.tsx
- utils.ts
- excel-importer.ts
- identity-address.ts
- application-id-mapper.ts
- scripts
- local-id-reader.ts
- test-local-id-reader.mjs
- compilerOptions
- v1/beneficiaries/import/commit/route.ts
- test-program-qr-browser.mjs
- test-application-id-autofill.mjs
- ref_path
- Layout & Components
- @prisma/client
- ref_node_path
- Layout & Components
- inspect-all-sources.js
- test-roster-restriction-preview.mjs
- users/import/route.ts
- check-remote.js
- bcryptjs
- ref_fs
- browser-id-ocr.ts
- manifest.json
- @supabase/supabase-js
- import-final-522-beneficiaries.mjs
- master-sync-all-data.js
- prepare-dole-template.mjs
- restrictions/import/route.ts
- TUPAD application ID autofill and walk-in encoding
- hasPermission
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
- dingalan-groupings.ts
- test-program-qr-postgres.mjs
- reseed-exact-522-beneficiaries.mjs
- Stitch Design System & UI Screen Guide
- encode/route.ts
- inspect-db.js
- Guided ID camera
- test-roster-restriction-browser.mjs
- IdCameraCapture.tsx
- work-program-parser.ts
- Online and walk-in application intake
- test-service-worker-cache.mjs
- update-flagged-beneficiaries.js
- ref_crypto
- test-offline-sync-resilience.mjs
- normalizeBarangayName
- application-storage.ts
- engines
- stubs/page.tsx
- tailwindcss
- test-local-ocr-browser.mjs
- test-masterlist-import-postgres.mjs
- generateBeneficiaryToken
- beneficiaries/page.tsx
- ref_node_assert
- Reusable QR slots and per-program scan history
- inspect-program-details.mjs
- dashboard/page.tsx
- test-dole-reports.mjs
- format1-stub-base-b64.ts
- Bagong Pilipinas transparent footer asset
- inspect-flagged.js
- cleanup-and-deduplicate.js
- identity-profiles.ts
- test-landing-scanner.mjs
- test-dedicated-qr-retention.mjs
- test-attendance-3hours.mjs
- Q: ayusin mo yung sa driver`s license kasi halos walang nababasa
- test-stub-distribution-monitoring.mjs
- test-program-crud.mjs
- check-reference-slots.js
- inspect-db.mjs
- test-public-inquiry.mjs
- test-user-delete.mjs
- check-sep20-evening.mjs
- inspect-sep21-data.mjs

## God Nodes (most connected - your core abstractions)
1. `getCurrentUser()` - 159 edges
2. `isAdminUser()` - 116 edges
3. `next` - 114 edges
4. `hasPermission()` - 112 edges
5. `react` - 82 edges
6. `logAudit()` - 81 edges
7. `lucide-react` - 73 edges
8. `prisma` - 73 edges
9. `useAuth()` - 69 edges
10. `normalizeBarangayName()` - 62 edges

## Surprising Connections (you probably didn't know these)
- `html()` --indirect_call--> `RosterRestrictionDetails()`  [INFERRED]
  test/test-roster-restriction-preview.mjs → src/components/beneficiaries/RosterRestrictionDetails.tsx
- `addressOf()` --calls--> `mapLocalIdentityText()`  [EXTRACTED]
  test/test-local-id-reader.mjs → src/lib/ocr/application-id-mapper.ts
- `mapped()` --calls--> `mapLocalIdentityText()`  [EXTRACTED]
  test/test-local-id-reader.mjs → src/lib/ocr/application-id-mapper.ts
- `run()` --indirect_call--> `selected()`  [INFERRED]
  src/components/reports/DoleReportsPanel.tsx → test/test-local-id-reader.mjs
- `testApi()` --calls--> `signToken()`  [EXTRACTED]
  test/test-users-api.mjs → src/lib/auth.ts

## Import Cycles
- None detected.

## Communities (110 total, 25 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.09
Nodes (22): name, private, version, autoprefixer, clsx, dexie, dexie-react-hooks, @hookform/resolvers (+14 more)

### Community 1 - "excel-exporter.ts"
Cohesion: 0.06
Nodes (52): exceljs, prisma, testExport(), dynamic, ImportConflict, maxDuration, POST(), dynamic (+44 more)

### Community 2 - "IdUploadPanel.tsx"
Cohesion: 0.33
Nodes (9): FieldProps, FilePreview(), IdUploadPanel(), IdUploadPanelProps, OcrResponse, ApplicationFormValues, isAcceptedApplicationFile(), OcrAutofillStatus (+1 more)

### Community 3 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, autoprefixer, bcryptjs, clsx, date-fns, dexie, dexie-react-hooks, exceljs (+33 more)

### Community 4 - "isAdminUser"
Cohesion: 0.09
Nodes (31): dynamic, GET(), POST(), dynamic, GET(), details, dynamic, GET() (+23 more)

### Community 5 - "getCurrentUser"
Cohesion: 0.07
Nodes (46): dynamic, getVal(), POST(), dynamic, POST(), dynamic, POST(), DELETE() (+38 more)

### Community 6 - "next"
Cohesion: 0.06
Nodes (23): next, dynamic, GET(), dynamic, GET(), dynamic, GET(), dynamic (+15 more)

### Community 7 - "application-schema.ts"
Cohesion: 0.11
Nodes (25): OnlineTupadApplicationPage(), ApplicationForm(), ApplicationFormProps, DocumentField, FormErrors, MultiChoice(), Section(), SelectField() (+17 more)

### Community 8 - "ref_node_module"
Cohesion: 0.25
Nodes (6): errors, files, programs, require, saved, writes

### Community 9 - "dexie.ts"
Cohesion: 0.07
Nodes (71): html2canvas, DailyAttendancePage(), OrientationContent(), OrientationPage(), FIELD_OPERATIONS, FieldScannerHubContent(), FieldScannerHubPage(), PayoutScannerPage() (+63 more)

### Community 10 - "application-service.ts"
Cohesion: 0.15
Nodes (19): dynamic, POST(), ApplicationWriteAction, isIdempotentReplay(), applicationDraftSchema, applicationFinalSchema, DOCUMENT_FIELDS, formatApplicantFullName() (+11 more)

### Community 11 - "auth.ts"
Cohesion: 0.17
Nodes (12): dynamic, POST(), dynamic, GET(), dynamic, generateTrackingCode(), POST(), generateCaptchaChallenge() (+4 more)

### Community 12 - "test-application-workflow.mjs"
Cohesion: 0.08
Nodes (23): audits, cache, countQueries, deleted, detail, docs, encode, fakePrisma (+15 more)

### Community 13 - "login/page.tsx"
Cohesion: 0.40
Nodes (5): buildPresetRoleGroups(), DEFAULT_ROLE_GROUPS, LoginPage(), PresetAccount, PresetRoleGroup

### Community 14 - "utils.ts"
Cohesion: 0.11
Nodes (26): lucide-react, react, DINGALAN_BARANGAYS, UserManagementPage(), metadata, PublicInquiryPage(), BeneficiaryProfilePage(), dynamic (+18 more)

### Community 15 - "excel-importer.ts"
Cohesion: 0.16
Nodes (16): dynamic, POST(), ExcelImportPage(), DEFAULT_EXEMPTION_REASONS, MasterlistUploadModalProps, displayDate(), RosterRestrictionDetails(), cleanStr() (+8 more)

### Community 16 - "identity-address.ts"
Cohesion: 0.34
Nodes (14): addressLike(), addressPiece(), addressStart(), barangayPattern(), escape(), IdentityAddress, nearBarangay(), normalize() (+6 more)

### Community 17 - "application-id-mapper.ts"
Cohesion: 0.22
Nodes (24): calculateAge(), applyOcrAutofill(), birthDateValue(), clean(), cleanLocalValue(), cleanPersonName(), explicitLabel(), fieldValue() (+16 more)

### Community 18 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, dev, lint, postinstall, prepare:ocr, prisma:generate, prisma:push (+9 more)

### Community 19 - "local-id-reader.ts"
Cohesion: 0.15
Nodes (22): extractPhilSysNumber(), MappedOcrSide, MergedOcrResult, NON_BIRTH_DATE_LABEL, OcrTextLine, ORDERED_NAME_LABEL, extractProfileNumber(), identityNumberRows() (+14 more)

### Community 20 - "test-local-id-reader.mjs"
Cohesion: 0.05
Nodes (36): run(), addressCrop, addressLines, addressOf(), backStatusRegions, birthCrop, certificate, certificateLayout (+28 more)

### Community 21 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx (+12 more)

### Community 22 - "v1/beneficiaries/import/commit/route.ts"
Cohesion: 0.11
Nodes (41): dynamic, GET(), dynamic, GET(), maxDuration, POST(), canUseDoleReports(), DOLE_REPORT_SHEETS (+33 more)

### Community 23 - "test-program-qr-browser.mjs"
Cohesion: 0.29
Nodes (5): calls, errors, programs, require, roster

### Community 24 - "test-application-id-autofill.mjs"
Cohesion: 0.09
Nodes (27): dynamic, isRateLimited(), maxDuration, POST(), providerMessage(), rateLimit, mergeOcrSides(), analyzeIdentityDocument() (+19 more)

### Community 25 - "ref_path"
Cohesion: 0.08
Nodes (11): __dirname, nextConfig, prisma, fs, path, { PrismaClient }, prisma, fs (+3 more)

### Community 26 - "Layout & Components"
Cohesion: 0.14
Nodes (13): 1. DICT GWT Utility Header, 2. Official Municipal Masthead, 3. Hero Citizen Announcement Card, 4. Telemetry Metric Strip, 5. Public Status Inquiry Module (`#inquiry`), 6. Work Area Assignment Lookup (`#work-assignment`), 7. Direct Feedback Desk (`#inquiry-form`), 8. DICT Standard GWT Footer (+5 more)

### Community 27 - "@prisma/client"
Cohesion: 0.05
Nodes (17): @prisma/client, prisma, prisma, prisma, flaggedReference, prisma, { PrismaClient }, prisma (+9 more)

### Community 28 - "ref_node_path"
Cohesion: 0.25
Nodes (4): core, output, require, root

### Community 29 - "Layout & Components"
Cohesion: 0.14
Nodes (13): 1. DICT GWT Utility Header, 2. Official Municipal Masthead, 3. Hero Citizen Announcement Card, 4. Telemetry Metric Strip, 5. Public Status Inquiry Module (`#inquiry`), 6. Work Area Assignment Lookup (`#work-assignment`), 7. Direct Feedback Desk (`#inquiry-form`), 8. DICT Standard GWT Footer (+5 more)

### Community 30 - "inspect-all-sources.js"
Cohesion: 0.11
Nodes (16): Database, db, fs, summary, tables, Database, db, fs (+8 more)

### Community 31 - "test-roster-restriction-preview.mjs"
Cohesion: 0.12
Nodes (15): react-dom, activeMarkup, book, buffer, cache, globalRoute, load(), names (+7 more)

### Community 32 - "users/import/route.ts"
Cohesion: 0.43
Nodes (6): DINGALAN_BARANGAYS, dynamic, normalizeBarangay(), normalizeRole(), parseCSVLines(), POST()

### Community 33 - "check-remote.js"
Cohesion: 0.15
Nodes (9): isomorphic-git, dir, fs, git, path, dir, fs, git (+1 more)

### Community 34 - "bcryptjs"
Cohesion: 0.17
Nodes (6): bcrypt, prisma, { PrismaClient }, bcryptjs, prisma, prisma

### Community 35 - "ref_fs"
Cohesion: 0.09
Nodes (9): pngjs, backup, fs, prisma, { PrismaClient }, downloadImage(), b64, fs (+1 more)

### Community 36 - "browser-id-ocr.ts"
Cohesion: 0.17
Nodes (25): tesseract.js, detectIdentityDocumentType(), OcrSubject, active(), canvas(), context(), crop(), enhance() (+17 more)

### Community 37 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 38 - "@supabase/supabase-js"
Cohesion: 0.33
Nodes (3): @supabase/supabase-js, supabase, supabaseAdmin

### Community 39 - "import-final-522-beneficiaries.mjs"
Cohesion: 0.18
Nodes (12): DINGALAN_BARANGAYS, main(), MONTH_NAME_MAP, normalizeBarangayName(), normalizeSitioName(), parseCSVLine(), prisma, DINGALAN_BARANGAYS (+4 more)

### Community 40 - "master-sync-all-data.js"
Cohesion: 0.36
Nodes (7): chunkArray(), fs, main(), path, { PrismaClient }, toBool(), toDate()

### Community 41 - "prepare-dole-template.mjs"
Cohesion: 0.12
Nodes (13): jszip, cache, load(), original, output, require, review, root (+5 more)

### Community 42 - "restrictions/import/route.ts"
Cohesion: 0.39
Nodes (7): addDaysToDate(), checkIsAppointive(), dynamic, maxDuration, parseDateToISO(), parseNameParts(), POST()

### Community 43 - "TUPAD application ID autofill and walk-in encoding"
Cohesion: 0.22
Nodes (8): Database migration, Local ID reading (default; no Azure key required), Number recovery and optional close-up, Optional Azure API, Required private storage configuration, TUPAD application ID autofill and walk-in encoding, Verification, What is implemented

### Community 44 - "hasPermission"
Cohesion: 0.09
Nodes (24): DELETE(), dynamic, PATCH(), dynamic, POST(), DELETE(), generateElporControlNo(), GET() (+16 more)

### Community 46 - "ApplicationInbox.tsx"
Cohesion: 0.23
Nodes (10): OnlineApplicationsPage(), WalkInSubmissionsPage(), ApplicationInbox(), ApplicationRecord, dateText(), InboxData, sections, valueText() (+2 more)

### Community 47 - "migration.sql"
Cohesion: 0.33
Nodes (8): "TupadApplicationDocument", TupadApplicationDocument_applicationId_fieldName_idx, TupadApplicationDocument_uploadedById_idx, TupadApplicationRoster_applicationCode_key, TupadApplicationRoster_encodedById_idx, TupadApplicationRoster_idempotencyKey_key, TupadApplicationRoster_source_submissionStatus_idx, TupadApplicationRoster_submittedAt_idx

### Community 48 - "restrictions/route.ts"
Cohesion: 0.38
Nodes (6): DELETE(), dynamic, GET(), maskFullName(), parsePayoutDateToTimestamp(), POST()

### Community 49 - "FieldQrPassGeneratorCard.tsx"
Cohesion: 0.09
Nodes (34): AdminApplicationsPage(), AuditLogsPage(), AdminInquiriesPage(), BalikPinasElporPortalPage(), DINGALAN_BARANGAYS, SupplyItem, CASE_CATEGORIES, DINGALAN_BARANGAYS (+26 more)

### Community 50 - "effects/TextCubeLoader.tsx"
Cohesion: 0.43
Nodes (3): Loading(), TextCubeLoader(), TextCubeLoaderProps

### Community 51 - "vercel.json"
Cohesion: 0.25
Nodes (7): buildCommand, framework, functions, src/app/api/**/*, $schema, includeFiles, maxDuration

### Community 52 - "StubReplacementWizardModal.tsx"
Cohesion: 0.18
Nodes (12): CapturedIdPayload, CaptureSlotKey, compressFileToPayload(), formatMmDdYyyyInput(), ORIGINAL_TO_REPLACEMENT_RELATIONSHIPS, Props, REPLACEMENT_REASON_OPTIONS, StubReplacementTarget (+4 more)

### Community 53 - "flag-replacement/route.ts"
Cohesion: 0.24
Nodes (12): dynamic, POST(), dynamic, POST(), evaluatePersonTupadEligibility(), normalizeBirthdayComparison(), ParsedPersonName, parseEnteredFullName() (+4 more)

### Community 54 - "Reports: supplied DOLE 2026 workbook"
Cohesion: 0.33
Nodes (5): Preservation and source handling, Program isolation and persistence, Reports: supplied DOLE 2026 workbook, User workflow, Verification

### Community 55 - "app/page.tsx"
Cohesion: 0.17
Nodes (15): dynamic, LandingPage(), LandingNavDrawer(), NavDrawerCategory, NavDrawerItem, FacebookUpdatesSection(), PesoOrganizationalChart(), ModuleActionLink (+7 more)

### Community 56 - "migrate-user-plain-password.js"
Cohesion: 0.50
Nodes (4): getPresetPassword(), main(), prisma, { PrismaClient }

### Community 57 - "replacements/page.tsx"
Cohesion: 0.27
Nodes (10): ReplacementsContent(), ReplacementsPage(), ReportCenterPage(), DOC_LABELS, PendingReplacementAssessmentItem, Props, ReplacementApprovalModal(), DoleReportsPanel() (+2 more)

### Community 58 - "dingalan-groupings.ts"
Cohesion: 0.28
Nodes (17): DEFAULT_10_DAY_ACTIVITIES, dynamic, POST(), FieldWorkProgramPage(), WorkProgramManagementPage(), DeploymentGroupingMatrix(), DeploymentGroupingMatrixProps, BarangayGroupingConfig (+9 more)

### Community 59 - "test-program-qr-postgres.mjs"
Cohesion: 0.12
Nodes (14): cacheRoot, dataDir, listener, load(), { PrismaClient }, require, root, cacheRoot (+6 more)

### Community 60 - "reseed-exact-522-beneficiaries.mjs"
Cohesion: 0.36
Nodes (7): DINGALAN_BARANGAYS, formatBday(), main(), normalizeBarangayName(), normalizeSitioName(), prisma, rawData

### Community 61 - "Stitch Design System & UI Screen Guide"
Cohesion: 0.40
Nodes (4): 1. How to Access and Edit in Stitch, 2. Included Local Artifacts, 3. How to Upload a Modified `DESIGN.md` to Stitch in the Future, Stitch Design System & UI Screen Guide

### Community 62 - "encode/route.ts"
Cohesion: 0.23
Nodes (8): dynamic, POST(), dynamic, POST(), WalkInEncodingPage(), ApplicationValidationError, parseApplicationRequest(), canEncodeWalkIn()

### Community 64 - "Guided ID camera"
Cohesion: 0.40
Nodes (4): Browser/privacy requirements, Capture flow, Guided ID camera, Verification

### Community 65 - "test-roster-restriction-browser.mjs"
Cohesion: 0.29
Nodes (6): baseRow, errors, preview, program, require, rows

### Community 66 - "IdCameraCapture.tsx"
Cohesion: 0.35
Nodes (9): cameraError(), IdCameraCapture(), Props, CameraRect, getCameraGuideRect(), getCameraSourceCrop(), getIdCameraPreset(), ID_CAMERA_GUIDES (+1 more)

### Community 67 - "work-program-parser.ts"
Cohesion: 0.09
Nodes (20): xlsx, dynamic, dynamic, POST(), dynamic, DINGALAN_BARANGAYS, normalizeBarangay(), ParsedBarangayWorkProgram (+12 more)

### Community 68 - "Online and walk-in application intake"
Cohesion: 0.33
Nodes (5): Admin review, Database and private storage, Online and walk-in application intake, Pages and roles, Verification

### Community 69 - "test-service-worker-cache.mjs"
Cohesion: 0.07
Nodes (16): typescript, exported, card, module, paper, source, module, expected (+8 more)

### Community 70 - "update-flagged-beneficiaries.js"
Cohesion: 0.40
Nodes (3): flaggedReference, prisma, { PrismaClient }

### Community 71 - "ref_crypto"
Cohesion: 0.21
Nodes (6): jsqr, pdfjs-dist, prisma, metadata, WorkAreaAssignmentInquiryPage(), PublicWorkAssignmentLookupCard()

### Community 73 - "normalizeBarangayName"
Cohesion: 0.12
Nodes (27): date-fns, dynamic, POST(), dynamic, POST(), dynamic, POST(), dynamic (+19 more)

### Community 74 - "application-storage.ts"
Cohesion: 0.33
Nodes (8): ACCEPTED_APPLICATION_FILE_TYPES, MAX_APPLICATION_FILE_SIZE, APPLICATION_DOCUMENT_BUCKET, ensurePrivateBucket(), extensionFor(), getPrivateStorageClient(), removeApplicationDocuments(), uploadApplicationDocument()

### Community 75 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, npm

### Community 76 - "stubs/page.tsx"
Cohesion: 0.17
Nodes (17): PrintTemplateMode, StubsContent(), StubsDesignerPage(), ETUPAD_BASE_IMAGE, ETupadCard, ETupadCardProps, Format1Stub, Format1StubProps (+9 more)

### Community 78 - "test-local-ocr-browser.mjs"
Cohesion: 0.40
Nodes (3): jspdf, qrcode, require

### Community 79 - "test-masterlist-import-postgres.mjs"
Cohesion: 0.24
Nodes (8): cacheRoot, dataDir, get(), listener, load(), { PrismaClient }, require, root

### Community 80 - "generateBeneficiaryToken"
Cohesion: 0.27
Nodes (8): dynamic, POST(), PATCH(), dynamic, GET(), PATCH(), POST(), generateBeneficiaryToken()

### Community 81 - "beneficiaries/page.tsx"
Cohesion: 0.11
Nodes (32): main(), prisma, AttendanceMatrixContent(), AttendanceMatrixPage(), BeneficiariesMasterlistContent(), BeneficiariesMasterlistPage(), RestrictionsPage(), AdminStubOverrideModal() (+24 more)

### Community 82 - "ref_node_assert"
Cohesion: 0.06
Nodes (26): errors, fixture, record, requests, require, errors, require, login() (+18 more)

### Community 83 - "Reusable QR slots and per-program scan history"
Cohesion: 0.40
Nodes (4): More than 522 beneficiaries, Offline devices, Reusable QR slots and per-program scan history, Verification

### Community 89 - "dashboard/page.tsx"
Cohesion: 0.50
Nodes (4): DashboardData, DashboardPage(), dynamic, getDashboardMetrics()

### Community 90 - "test-dole-reports.mjs"
Cohesion: 0.08
Nodes (21): IS_LOCAL_DEVELOPMENT, PRECACHE_ASSETS, api, base, cache, config, data, db (+13 more)

### Community 102 - "identity-profiles.ts"
Cohesion: 0.33
Nodes (4): genericNumbers, IdentityDocumentType, IdentityProfile, PROFILES

### Community 109 - "Q: ayusin mo yung sa driver`s license kasi halos walang nababasa"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ayusin mo yung sa driver`s license kasi halos walang nababasa, Source Nodes

### Community 114 - "check-reference-slots.js"
Cohesion: 0.40
Nodes (3): prisma, { PrismaClient }, referenceSlots

## Knowledge Gaps
- **14 isolated node(s):** `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs`, `@types/jsonwebtoken`, `@types/jszip` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 795 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `@prisma/client` to `package.json`, `excel-exporter.ts`, `isAdminUser`, `application-service.ts`, `v1/beneficiaries/import/commit/route.ts`, `ref_path`, `inspect-all-sources.js`, `bcryptjs`, `ref_fs`, `@supabase/supabase-js`, `import-final-522-beneficiaries.mjs`, `master-sync-all-data.js`, `migrate-user-plain-password.js`, `test-program-qr-postgres.mjs`, `reseed-exact-522-beneficiaries.mjs`, `inspect-db.js`, `work-program-parser.ts`, `update-flagged-beneficiaries.js`, `ref_crypto`, `test-offline-sync-resilience.mjs`, `normalizeBarangayName`, `test-masterlist-import-postgres.mjs`, `beneficiaries/page.tsx`, `inspect-program-details.mjs`, `inspect-flagged.js`, `cleanup-and-deduplicate.js`, `test-landing-scanner.mjs`, `test-dedicated-qr-retention.mjs`, `test-stub-distribution-monitoring.mjs`, `test-program-crud.mjs`, `check-reference-slots.js`, `inspect-db.mjs`, `test-public-inquiry.mjs`, `check-sep20-evening.mjs`, `inspect-sep21-data.mjs`?**
  _High betweenness centrality (0.233) - this node is a cross-community bridge._
- **What connects `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `package.json`, `excel-exporter.ts`, `isAdminUser`, `getCurrentUser`, `dexie.ts`, `application-service.ts`, `auth.ts`, `login/page.tsx`, `utils.ts`, `excel-importer.ts`, `v1/beneficiaries/import/commit/route.ts`, `test-application-id-autofill.mjs`, `users/import/route.ts`, `restrictions/import/route.ts`, `hasPermission`, `middleware.ts`, `restrictions/route.ts`, `FieldQrPassGeneratorCard.tsx`, `flag-replacement/route.ts`, `app/page.tsx`, `replacements/page.tsx`, `dingalan-groupings.ts`, `encode/route.ts`, `work-program-parser.ts`, `ref_crypto`, `normalizeBarangayName`, `stubs/page.tsx`, `generateBeneficiaryToken`, `beneficiaries/page.tsx`, `dashboard/page.tsx`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **Should `excel-exporter.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06169772256728778 - nodes in this community are weakly interconnected._
- **Why does `react` connect `utils.ts` to `package.json`, `IdUploadPanel.tsx`, `application-schema.ts`, `dexie.ts`, `login/page.tsx`, `excel-importer.ts`, `v1/beneficiaries/import/commit/route.ts`, `test-roster-restriction-preview.mjs`, `ApplicationInbox.tsx`, `FieldQrPassGeneratorCard.tsx`, `effects/TextCubeLoader.tsx`, `StubReplacementWizardModal.tsx`, `app/page.tsx`, `replacements/page.tsx`, `dingalan-groupings.ts`, `IdCameraCapture.tsx`, `ref_crypto`, `stubs/page.tsx`, `beneficiaries/page.tsx`, `dashboard/page.tsx`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._