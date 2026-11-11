# Graph Report - PESO-EC-Access-1  (2026-11-11)

## Corpus Check
- 377 files · ~1,442,113 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 33 file(s) not represented in the graph (top: .csv 26, .css 2, .example 1)

## Summary
- 1900 nodes · 4689 edges · 123 communities (97 shown, 26 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1e682a28`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- getCurrentUser
- dexie.ts
- dependencies
- test-accomplishment-work-schedule.mjs
- logAudit
- next
- application-schema.ts
- ref_node_module
- stub-distribution/page.tsx
- application-service.ts
- v1/applications/route.ts
- test-application-workflow.mjs
- completion-report-template.ts
- react
- react
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
- compare-datasets.js
- Layout & Components
- inspect-all-sources.js
- test-roster-restriction-preview.mjs
- update-522-sitios.mjs
- check-remote.js
- bcryptjs
- ref_fs
- browser-id-ocr.ts
- manifest.json
- qr-pass/route.ts
- import-final-522-beneficiaries.mjs
- master-sync-all-data.js
- prepare-dole-template.mjs
- restrictions/import/route.ts
- TUPAD application ID autofill and walk-in encoding
- isAdminUser
- middleware.ts
- ApplicationInbox.tsx
- migration.sql
- restrictions/route.ts
- FieldQrPassGeneratorCard.tsx
- effects/TextCubeLoader.tsx
- vercel.json
- hasPermission
- flag-replacement/route.ts
- Reports: supplied DOLE 2026 workbook
- app/page.tsx
- migrate-user-plain-password.js
- replacements/page.tsx
- test-accomplishment-export-browser.mjs
- test-program-qr-postgres.mjs
- reseed-exact-522-beneficiaries.mjs
- Stitch Design System & UI Screen Guide
- export-all-data.js
- inspect-db.js
- Guided ID camera
- v1/beneficiaries/import/commit/route.ts
- layout.tsx
- work-program-parser.ts
- Online and walk-in application intake
- test-service-worker-cache.mjs
- update-flagged-beneficiaries.js
- ApplicationForm
- users/import/route.ts
- normalizeBarangayName
- ApplicationInbox.tsx
- engines
- local-id-reader.ts
- tailwindcss
- test-local-ocr-browser.mjs
- test-masterlist-import-postgres.mjs
- fast-update-flagged.js
- normalizeBarangayName
- ref_node_assert
- Reusable QR slots and per-program scan history
- test-application-inbox-browser.mjs
- application-storage.ts
- test-program-qr-browser.mjs
- test-offline-sync-resilience.mjs
- test-attendance-3hours.mjs
- @supabase/supabase-js
- test-dole-reports.mjs
- format1-stub-base-b64.ts
- Bagong Pilipinas transparent footer asset
- applications/import/route.ts
- cleanup-and-deduplicate.js
- test-suite.mjs
- login/page.tsx
- auth.ts
- beneficiaries/route.ts
- ocr/route.ts
- export-pg-to-files.js
- inspect-all-sitios.mjs
- Q: ayusin mo yung sa driver`s license kasi halos walang nababasa
- list-users-by-role.mjs
- test-matrix-and-sync.mjs
- test-pg-counts.js
- test-public-inquiry.mjs
- check-reference-slots.js
- test-sorting-and-templates.mjs
- IdUploadPanel.tsx
- ref_crypto
- check-demographics.mjs
- heal-qr-codes.mjs
- sync-disqualified-entry.mjs
- test-landing-scanner.mjs
- test-program-crud.mjs

## God Nodes (most connected - your core abstractions)
1. `getCurrentUser()` - 159 edges
2. `isAdminUser()` - 116 edges
3. `next` - 114 edges
4. `hasPermission()` - 114 edges
5. `react` - 83 edges
6. `logAudit()` - 81 edges
7. `lucide-react` - 74 edges
8. `prisma` - 73 edges
9. `useAuth()` - 69 edges
10. `normalizeBarangayName()` - 64 edges

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

## Communities (123 total, 26 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.09
Nodes (22): name, private, version, autoprefixer, clsx, dexie, dexie-react-hooks, @hookform/resolvers (+14 more)

### Community 1 - "getCurrentUser"
Cohesion: 0.09
Nodes (25): dynamic, GET(), DELETE(), dynamic, GET(), PATCH(), dynamic, GET() (+17 more)

### Community 2 - "dexie.ts"
Cohesion: 0.14
Nodes (26): SyncCenterPage(), OfflineContext, OfflineContextType, OfflineProvider(), CachedBeneficiary, CachedProgram, CachedWorkDay, CachedWorkProgramItem (+18 more)

### Community 3 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, autoprefixer, bcryptjs, clsx, date-fns, dexie, dexie-react-hooks, exceljs (+33 more)

### Community 4 - "test-accomplishment-work-schedule.mjs"
Cohesion: 0.05
Nodes (37): book, { buildBarangayCompletionDays }, cache, chunks, db, doleBook, downloaded, ExcelJS (+29 more)

### Community 5 - "logAudit"
Cohesion: 0.10
Nodes (21): dynamic, POST(), DELETE(), dynamic, GET(), PATCH(), dynamic, POST() (+13 more)

### Community 6 - "next"
Cohesion: 0.10
Nodes (12): next, dynamic, dynamic, dynamic, POST(), dynamic, dynamic, DashboardData (+4 more)

### Community 7 - "application-schema.ts"
Cohesion: 0.12
Nodes (21): zod, ApplicationFormProps, DocumentField, FormErrors, APPLICATION_SOURCES, applicationFinalSchema, BARANGAYS, BENEFICIARY_TYPES (+13 more)

### Community 8 - "ref_node_module"
Cohesion: 0.25
Nodes (6): errors, files, programs, require, saved, writes

### Community 9 - "stub-distribution/page.tsx"
Cohesion: 0.18
Nodes (29): DailyAttendancePage(), OrientationContent(), OrientationPage(), PayoutScannerPage(), PhotosPage(), StubDistributionContent(), StubDistributionPage(), DINGALAN_BARANGAYS (+21 more)

### Community 10 - "application-service.ts"
Cohesion: 0.13
Nodes (22): dynamic, POST(), dynamic, POST(), ApplicationWriteAction, isIdempotentReplay(), applicationDraftSchema, DOCUMENT_FIELDS (+14 more)

### Community 11 - "v1/applications/route.ts"
Cohesion: 0.15
Nodes (16): dynamic, GET(), dynamic, POST(), details, dynamic, GET(), PATCH() (+8 more)

### Community 12 - "test-application-workflow.mjs"
Cohesion: 0.08
Nodes (23): audits, cache, countQueries, deleted, detail, docs, encode, fakePrisma (+15 more)

### Community 13 - "completion-report-template.ts"
Cohesion: 0.09
Nodes (40): prisma, testExport(), dynamic, GET(), maxDuration, AttendanceActivity, buildBarangayCompletionDays(), cleanActivity() (+32 more)

### Community 14 - "react"
Cohesion: 0.13
Nodes (23): AuditLogsPage(), DINGALAN_BARANGAYS, UserManagementPage(), photosMemoryCache, ProgramDetailsHub(), ProgramsPage(), StatusBadge(), StatusBadgeProps (+15 more)

### Community 15 - "react"
Cohesion: 0.13
Nodes (15): lucide-react, react, metadata, PublicInquiryPage(), BeneficiaryProfilePage(), dynamic, AdminStubOverrideModalProps, REPLACEMENT_REASONS (+7 more)

### Community 16 - "identity-address.ts"
Cohesion: 0.28
Nodes (16): ADDRESS_LABEL, ADDRESS_STOP, addressLike(), addressPiece(), addressStart(), barangayPattern(), escape(), IdentityAddress (+8 more)

### Community 17 - "application-id-mapper.ts"
Cohesion: 0.25
Nodes (22): calculateAge(), birthDateValue(), clean(), cleanLocalValue(), cleanPersonName(), explicitLabel(), fieldValue(), identityValue() (+14 more)

### Community 18 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, dev, lint, postinstall, prepare:ocr, prisma:generate, prisma:push (+9 more)

### Community 19 - "start-localhost.mjs"
Cohesion: 0.16
Nodes (13): core, output, require, root, main(), openBrowser(), portIsAvailable(), projectDir (+5 more)

### Community 20 - "test-local-id-reader.mjs"
Cohesion: 0.05
Nodes (36): run(), addressCrop, addressLines, addressOf(), backStatusRegions, birthCrop, certificate, certificateLayout (+28 more)

### Community 21 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx (+12 more)

### Community 22 - "v1/beneficiaries/import/commit/route.ts"
Cohesion: 0.11
Nodes (41): dynamic, GET(), dynamic, GET(), maxDuration, POST(), canUseDoleReports(), DOLE_REPORT_SHEETS (+33 more)

### Community 23 - "test-roster-restriction-browser.mjs"
Cohesion: 0.29
Nodes (6): baseRow, errors, preview, program, require, rows

### Community 24 - "test-application-id-autofill.mjs"
Cohesion: 0.11
Nodes (16): azurePrintedFields, clearFront, conflict, conflictingBack, dateOnly, incomplete, layoutAzure, localPhilSys (+8 more)

### Community 25 - "ref_path"
Cohesion: 0.10
Nodes (8): __dirname, nextConfig, prisma, prisma, fs, path, { PrismaClient }, prisma

### Community 26 - "Layout & Components"
Cohesion: 0.14
Nodes (13): 1. DICT GWT Utility Header, 2. Official Municipal Masthead, 3. Hero Citizen Announcement Card, 4. Telemetry Metric Strip, 5. Public Status Inquiry Module (`#inquiry`), 6. Work Area Assignment Lookup (`#work-assignment`), 7. Direct Feedback Desk (`#inquiry-form`), 8. DICT Standard GWT Footer (+5 more)

### Community 27 - "@prisma/client"
Cohesion: 0.06
Nodes (14): @prisma/client, prisma, prisma, prisma, prisma, prisma, { PrismaClient }, prisma (+6 more)

### Community 28 - "compare-datasets.js"
Cohesion: 0.33
Nodes (4): backup, fs, prisma, { PrismaClient }

### Community 29 - "Layout & Components"
Cohesion: 0.14
Nodes (13): 1. DICT GWT Utility Header, 2. Official Municipal Masthead, 3. Hero Citizen Announcement Card, 4. Telemetry Metric Strip, 5. Public Status Inquiry Module (`#inquiry`), 6. Work Area Assignment Lookup (`#work-assignment`), 7. Direct Feedback Desk (`#inquiry-form`), 8. DICT Standard GWT Footer (+5 more)

### Community 30 - "inspect-all-sources.js"
Cohesion: 0.17
Nodes (10): Database, db, fs, summary, tables, Database, fs, main() (+2 more)

### Community 31 - "test-roster-restriction-preview.mjs"
Cohesion: 0.12
Nodes (15): react-dom, activeMarkup, book, buffer, cache, globalRoute, load(), names (+7 more)

### Community 32 - "update-522-sitios.mjs"
Cohesion: 0.47
Nodes (5): DINGALAN_BARANGAYS, main(), normalizeBarangayName(), normalizeSitioName(), prisma

### Community 33 - "check-remote.js"
Cohesion: 0.15
Nodes (9): isomorphic-git, dir, fs, git, path, dir, fs, git (+1 more)

### Community 34 - "bcryptjs"
Cohesion: 0.17
Nodes (6): bcrypt, prisma, { PrismaClient }, bcryptjs, prisma, prisma

### Community 35 - "ref_fs"
Cohesion: 0.12
Nodes (5): pngjs, downloadImage(), b64, fs, prisma

### Community 36 - "browser-id-ocr.ts"
Cohesion: 0.17
Nodes (26): tesseract.js, normalizeIdLighting(), detectIdentityDocumentType(), active(), canvas(), context(), crop(), enhance() (+18 more)

### Community 37 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 38 - "qr-pass/route.ts"
Cohesion: 0.15
Nodes (22): dynamic, GET(), handleQrPassSearch(), POST(), dynamic, maxDuration, POST(), dynamic (+14 more)

### Community 39 - "import-final-522-beneficiaries.mjs"
Cohesion: 0.36
Nodes (7): DINGALAN_BARANGAYS, main(), MONTH_NAME_MAP, normalizeBarangayName(), normalizeSitioName(), parseCSVLine(), prisma

### Community 40 - "master-sync-all-data.js"
Cohesion: 0.36
Nodes (7): chunkArray(), fs, main(), path, { PrismaClient }, toBool(), toDate()

### Community 41 - "prepare-dole-template.mjs"
Cohesion: 0.11
Nodes (15): jszip, cache, load(), original, output, require, review, root (+7 more)

### Community 42 - "restrictions/import/route.ts"
Cohesion: 0.39
Nodes (7): addDaysToDate(), checkIsAppointive(), dynamic, maxDuration, parseDateToISO(), parseNameParts(), POST()

### Community 43 - "TUPAD application ID autofill and walk-in encoding"
Cohesion: 0.22
Nodes (8): Database migration, Local ID reading (default; no Azure key required), Number recovery and optional close-up, Optional Azure API, Required private storage configuration, TUPAD application ID autofill and walk-in encoding, Verification, What is implemented

### Community 44 - "isAdminUser"
Cohesion: 0.09
Nodes (28): dynamic, GET(), dynamic, GET(), POST(), dynamic, GET(), PATCH() (+20 more)

### Community 46 - "ApplicationInbox.tsx"
Cohesion: 0.11
Nodes (31): cameraError(), IdCameraCapture(), Props, CapturedIdPayload, CaptureSlotKey, compressFileToPayload(), formatMmDdYyyyInput(), ORIGINAL_TO_REPLACEMENT_RELATIONSHIPS (+23 more)

### Community 47 - "migration.sql"
Cohesion: 0.33
Nodes (8): "TupadApplicationDocument", TupadApplicationDocument_applicationId_fieldName_idx, TupadApplicationDocument_uploadedById_idx, TupadApplicationRoster_applicationCode_key, TupadApplicationRoster_encodedById_idx, TupadApplicationRoster_idempotencyKey_key, TupadApplicationRoster_source_submissionStatus_idx, TupadApplicationRoster_submittedAt_idx

### Community 48 - "restrictions/route.ts"
Cohesion: 0.38
Nodes (6): DELETE(), dynamic, GET(), maskFullName(), parsePayoutDateToTimestamp(), POST()

### Community 49 - "FieldQrPassGeneratorCard.tsx"
Cohesion: 0.07
Nodes (42): AdminApplicationsPage(), AdminInquiriesPage(), FIELD_OPERATIONS, FieldScannerHubContent(), FieldScannerHubPage(), BalikPinasElporPortalPage(), DINGALAN_BARANGAYS, SupplyItem (+34 more)

### Community 50 - "effects/TextCubeLoader.tsx"
Cohesion: 0.43
Nodes (3): Loading(), TextCubeLoader(), TextCubeLoaderProps

### Community 51 - "vercel.json"
Cohesion: 0.25
Nodes (7): buildCommand, framework, functions, src/app/api/**/*, $schema, includeFiles, maxDuration

### Community 52 - "hasPermission"
Cohesion: 0.10
Nodes (20): DELETE(), dynamic, PATCH(), dynamic, POST(), dynamic, POST(), DELETE() (+12 more)

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
Cohesion: 0.25
Nodes (11): ReplacementsContent(), ReplacementsPage(), ReportCenterPage(), DOC_LABELS, PendingReplacementAssessmentItem, Props, ReplacementApprovalModal(), StubReplacementTarget (+3 more)

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

### Community 62 - "export-all-data.js"
Cohesion: 0.29
Nodes (6): Database, db, fs, fullExport, path, tables

### Community 64 - "Guided ID camera"
Cohesion: 0.40
Nodes (4): Browser/privacy requirements, Capture flow, Guided ID camera, Verification

### Community 65 - "v1/beneficiaries/import/commit/route.ts"
Cohesion: 0.21
Nodes (14): dynamic, ImportConflict, maxDuration, POST(), dynamic, maxDuration, POST(), saveImportedReportRows() (+6 more)

### Community 66 - "layout.tsx"
Cohesion: 0.31
Nodes (5): metadata, RootLayout(), viewport, ServiceWorkerRegister(), AuthProvider()

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

### Community 71 - "ApplicationForm"
Cohesion: 0.21
Nodes (10): WalkInEncodingPage(), OnlineTupadApplicationPage(), ApplicationForm(), MultiChoice(), Section(), SelectField(), SourceBadge(), TextField() (+2 more)

### Community 72 - "users/import/route.ts"
Cohesion: 0.43
Nodes (6): DINGALAN_BARANGAYS, dynamic, normalizeBarangay(), normalizeRole(), parseCSVLines(), POST()

### Community 73 - "normalizeBarangayName"
Cohesion: 0.12
Nodes (25): date-fns, dynamic, POST(), dynamic, POST(), dynamic, POST(), dynamic (+17 more)

### Community 74 - "ApplicationInbox.tsx"
Cohesion: 0.23
Nodes (10): OnlineApplicationsPage(), WalkInSubmissionsPage(), ApplicationInbox(), ApplicationRecord, dateText(), InboxData, sections, valueText() (+2 more)

### Community 75 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, npm

### Community 76 - "local-id-reader.ts"
Cohesion: 0.17
Nodes (18): extractPhilSysNumber(), MappedOcrSide, MergedOcrResult, NON_BIRTH_DATE_LABEL, OcrTextLine, ORDERED_NAME_LABEL, extractProfileNumber(), identityNumberRows() (+10 more)

### Community 78 - "test-local-ocr-browser.mjs"
Cohesion: 0.40
Nodes (3): jspdf, qrcode, require

### Community 79 - "test-masterlist-import-postgres.mjs"
Cohesion: 0.24
Nodes (8): cacheRoot, dataDir, get(), listener, load(), { PrismaClient }, require, root

### Community 80 - "fast-update-flagged.js"
Cohesion: 0.40
Nodes (3): flaggedReference, prisma, { PrismaClient }

### Community 81 - "normalizeBarangayName"
Cohesion: 0.06
Nodes (75): main(), prisma, DEFAULT_10_DAY_ACTIVITIES, dynamic, POST(), AttendanceMatrixContent(), AttendanceMatrixPage(), BeneficiariesMasterlistContent() (+67 more)

### Community 82 - "ref_node_assert"
Cohesion: 0.06
Nodes (28): errors, require, login(), run(), errors, require, errors, require (+20 more)

### Community 83 - "Reusable QR slots and per-program scan history"
Cohesion: 0.40
Nodes (4): More than 522 beneficiaries, Offline devices, Reusable QR slots and per-program scan history, Verification

### Community 84 - "test-application-inbox-browser.mjs"
Cohesion: 0.29
Nodes (5): errors, fixture, record, requests, require

### Community 85 - "application-storage.ts"
Cohesion: 0.29
Nodes (10): ACCEPTED_APPLICATION_FILE_TYPES, isAcceptedApplicationFile(), MAX_APPLICATION_FILE_SIZE, APPLICATION_DOCUMENT_BUCKET, downloadApplicationDocument(), ensurePrivateBucket(), extensionFor(), getPrivateStorageClient() (+2 more)

### Community 86 - "test-program-qr-browser.mjs"
Cohesion: 0.29
Nodes (5): calls, errors, programs, require, roster

### Community 89 - "@supabase/supabase-js"
Cohesion: 0.33
Nodes (3): @supabase/supabase-js, supabase, supabaseAdmin

### Community 90 - "test-dole-reports.mjs"
Cohesion: 0.08
Nodes (21): IS_LOCAL_DEVELOPMENT, PRECACHE_ASSETS, api, base, cache, config, data, db (+13 more)

### Community 99 - "applications/import/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, getVal(), POST()

### Community 102 - "test-suite.mjs"
Cohesion: 0.38
Nodes (4): generateBeneficiaryToken(), prisma, runTests(), verifyTokenHash()

### Community 103 - "login/page.tsx"
Cohesion: 0.40
Nodes (5): buildPresetRoleGroups(), DEFAULT_ROLE_GROUPS, LoginPage(), PresetAccount, PresetRoleGroup

### Community 104 - "auth.ts"
Cohesion: 0.17
Nodes (12): dynamic, POST(), dynamic, GET(), dynamic, generateTrackingCode(), POST(), generateCaptchaChallenge() (+4 more)

### Community 105 - "beneficiaries/route.ts"
Cohesion: 0.17
Nodes (12): dynamic, POST(), DELETE(), dynamic, GET(), PATCH(), POST(), dynamic (+4 more)

### Community 106 - "ocr/route.ts"
Cohesion: 0.20
Nodes (13): dynamic, isRateLimited(), maxDuration, POST(), providerMessage(), rateLimit, mergeOcrSides(), OcrSubject (+5 more)

### Community 107 - "export-pg-to-files.js"
Cohesion: 0.40
Nodes (3): fs, path, { PrismaClient }

### Community 109 - "Q: ayusin mo yung sa driver`s license kasi halos walang nababasa"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ayusin mo yung sa driver`s license kasi halos walang nababasa, Source Nodes

### Community 114 - "check-reference-slots.js"
Cohesion: 0.40
Nodes (3): prisma, { PrismaClient }, referenceSlots

### Community 117 - "IdUploadPanel.tsx"
Cohesion: 0.18
Nodes (14): FieldProps, FilePreview(), IdUploadPanel(), IdUploadPanelProps, OcrResponse, ApplicationFormValues, ID_TYPES, OcrAutofillStatus (+6 more)

### Community 118 - "ref_crypto"
Cohesion: 0.19
Nodes (6): jsqr, pdfjs-dist, prisma, metadata, WorkAreaAssignmentInquiryPage(), PublicWorkAssignmentLookupCard()

## Knowledge Gaps
- **14 isolated node(s):** `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs`, `@types/jsonwebtoken`, `@types/jszip` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 869 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `@prisma/client` to `package.json`, `test-program-crud.mjs`, `next`, `application-service.ts`, `v1/applications/route.ts`, `completion-report-template.ts`, `v1/beneficiaries/import/commit/route.ts`, `ref_path`, `compare-datasets.js`, `inspect-all-sources.js`, `update-522-sitios.mjs`, `bcryptjs`, `ref_fs`, `qr-pass/route.ts`, `import-final-522-beneficiaries.mjs`, `master-sync-all-data.js`, `migrate-user-plain-password.js`, `test-program-qr-postgres.mjs`, `reseed-exact-522-beneficiaries.mjs`, `inspect-db.js`, `v1/beneficiaries/import/commit/route.ts`, `work-program-parser.ts`, `update-flagged-beneficiaries.js`, `test-masterlist-import-postgres.mjs`, `fast-update-flagged.js`, `normalizeBarangayName`, `test-offline-sync-resilience.mjs`, `@supabase/supabase-js`, `cleanup-and-deduplicate.js`, `test-suite.mjs`, `export-pg-to-files.js`, `inspect-all-sitios.mjs`, `list-users-by-role.mjs`, `test-matrix-and-sync.mjs`, `test-pg-counts.js`, `test-public-inquiry.mjs`, `check-reference-slots.js`, `test-sorting-and-templates.mjs`, `ref_crypto`, `check-demographics.mjs`, `heal-qr-codes.mjs`, `sync-disqualified-entry.mjs`, `test-landing-scanner.mjs`?**
  _High betweenness centrality (0.222) - this node is a cross-community bridge._
- **What connects `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `package.json`, `getCurrentUser`, `logAudit`, `stub-distribution/page.tsx`, `application-service.ts`, `v1/applications/route.ts`, `completion-report-template.ts`, `react`, `react`, `v1/beneficiaries/import/commit/route.ts`, `qr-pass/route.ts`, `restrictions/import/route.ts`, `isAdminUser`, `middleware.ts`, `restrictions/route.ts`, `FieldQrPassGeneratorCard.tsx`, `hasPermission`, `flag-replacement/route.ts`, `app/page.tsx`, `replacements/page.tsx`, `test-accomplishment-export-browser.mjs`, `v1/beneficiaries/import/commit/route.ts`, `layout.tsx`, `work-program-parser.ts`, `users/import/route.ts`, `normalizeBarangayName`, `normalizeBarangayName`, `applications/import/route.ts`, `login/page.tsx`, `auth.ts`, `beneficiaries/route.ts`, `ocr/route.ts`, `ref_crypto`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **Should `getCurrentUser` be split into smaller, more focused modules?**
  _Cohesion score 0.0855614973262032 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `package.json`, `dexie.ts`, `next`, `application-schema.ts`, `stub-distribution/page.tsx`, `react`, `v1/beneficiaries/import/commit/route.ts`, `test-roster-restriction-preview.mjs`, `ApplicationInbox.tsx`, `FieldQrPassGeneratorCard.tsx`, `effects/TextCubeLoader.tsx`, `app/page.tsx`, `replacements/page.tsx`, `layout.tsx`, `ApplicationInbox.tsx`, `normalizeBarangayName`, `login/page.tsx`, `IdUploadPanel.tsx`, `ref_crypto`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Should `dexie.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14022988505747128 - nodes in this community are weakly interconnected._