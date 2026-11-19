# Graph Report - PESO-EC-Access-1  (2026-11-19)

## Corpus Check
- 382 files · ~1,448,886 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 33 file(s) not represented in the graph (top: .csv 26, .css 2, .example 1)

## Summary
- 1929 nodes · 4826 edges · 116 communities (90 shown, 26 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a113f1d4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- next
- dexie.ts
- dependencies
- test-accomplishment-work-schedule.mjs
- getCurrentUser
- replacements/page.tsx
- application-schema.ts
- stubs/page.tsx
- stub-distribution/page.tsx
- application-service.ts
- beneficiaries/route.ts
- test-application-workflow.mjs
- completion-report-template.ts
- programs/[id]/page.tsx
- ref_node_path
- identity-address.ts
- application-id-mapper.ts
- scripts
- start-localhost.mjs
- test-local-id-reader.mjs
- compilerOptions
- v1/beneficiaries/import/commit/route.ts
- excel-importer.ts
- test-application-id-autofill.mjs
- ref_path
- Layout & Components
- @prisma/client
- test-application-inbox-browser.mjs
- Layout & Components
- inspect-all-sources.js
- test-roster-restriction-preview.mjs
- ApplicationInbox.tsx
- local-id-reader.ts
- seed.js
- ref_fs
- browser-id-ocr.ts
- manifest.json
- prisma.ts
- ref_crypto
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
- lookup/route.ts
- flag-replacement/route.ts
- Reports: supplied DOLE 2026 workbook
- app/page.tsx
- migrate-user-plain-password.js
- apply/inquiry/page.tsx
- test-masterlist-import-postgres.mjs
- test-program-qr-postgres.mjs
- reseed-exact-522-beneficiaries.mjs
- Stitch Design System & UI Screen Guide
- test-monitor-refresh-browser.mjs
- ref_node_fs
- Guided ID camera
- test-program-qr-browser.mjs
- inspect-flagged.js
- work-program-parser.ts
- Online and walk-in application intake
- typescript
- update-flagged-beneficiaries.js
- test-roster-restriction-browser.mjs
- inspect-db.js
- v1/beneficiaries/import/commit/route.ts
- inspect-program-details.mjs
- engines
- check-demographics.mjs
- tailwindcss
- test-local-ocr-browser.mjs
- inspect-db.mjs
- test-matrix-and-sync.mjs
- beneficiaries/page.tsx
- ref_node_assert
- Reusable QR slots and per-program scan history
- test-pg-counts.js
- restrictions/import/route.ts
- test-user-delete.mjs
- ApplicationForm
- test-dole-reports-browser.mjs
- @supabase/supabase-js
- test-dole-reports.mjs
- format1-stub-base-b64.ts
- Bagong Pilipinas transparent footer asset
- test-final-masterlist-and-work-program.mjs
- IdUploadPanel.tsx
- application-storage.ts
- identity-profiles.ts
- auth.ts
- export-pg-to-files.js
- check-sep20-evening.mjs
- restore-to-postgres.js
- dashboard/page.tsx
- Q: ayusin mo yung sa driver`s license kasi halos walang nababasa
- test-landing-scanner.mjs
- cleanup-and-deduplicate.js
- test-program-crud.mjs
- test-public-inquiry.mjs
- extract-and-sync-522-qrs.mjs
- test-stub-distribution-monitoring.mjs

## God Nodes (most connected - your core abstractions)
1. `getCurrentUser()` - 161 edges
2. `isAdminUser()` - 116 edges
3. `hasPermission()` - 116 edges
4. `next` - 115 edges
5. `react` - 84 edges
6. `logAudit()` - 81 edges
7. `lucide-react` - 74 edges
8. `prisma` - 74 edges
9. `useAuth()` - 69 edges
10. `normalizeBarangayName()` - 64 edges

## Surprising Connections (you probably didn't know these)
- `html()` --indirect_call--> `RosterRestrictionDetails()`  [INFERRED]
  test/test-roster-restriction-preview.mjs → src/components/beneficiaries/RosterRestrictionDetails.tsx
- `main()` --calls--> `normalizeBarangayName()`  [EXTRACTED]
  scripts/unify-all-sitios-and-puroks.mjs → src/lib/utils.ts
- `run()` --indirect_call--> `selected()`  [INFERRED]
  src/components/reports/DoleReportsPanel.tsx → test/test-local-id-reader.mjs
- `testApi()` --calls--> `signToken()`  [EXTRACTED]
  test/test-users-api.mjs → src/lib/auth.ts
- `addressOf()` --calls--> `mapLocalIdentityText()`  [EXTRACTED]
  test/test-local-id-reader.mjs → src/lib/ocr/application-id-mapper.ts

## Import Cycles
- None detected.

## Communities (116 total, 26 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.09
Nodes (22): name, private, version, autoprefixer, clsx, dexie, dexie-react-hooks, @hookform/resolvers (+14 more)

### Community 1 - "next"
Cohesion: 0.06
Nodes (25): next, dynamic, GET(), dynamic, dynamic, POST(), dynamic, dynamic (+17 more)

### Community 2 - "dexie.ts"
Cohesion: 0.09
Nodes (34): metadata, RootLayout(), viewport, SyncCenterPage(), ServiceWorkerRegister(), AuthProvider(), OfflineContext, OfflineContextType (+26 more)

### Community 3 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, autoprefixer, bcryptjs, clsx, date-fns, dexie, dexie-react-hooks, exceljs (+33 more)

### Community 4 - "test-accomplishment-work-schedule.mjs"
Cohesion: 0.05
Nodes (39): exceljs, dynamic, book, { buildBarangayCompletionDays }, cache, chunks, db, doleBook (+31 more)

### Community 5 - "getCurrentUser"
Cohesion: 0.06
Nodes (51): dynamic, GET(), POST(), dynamic, getVal(), POST(), dynamic, POST() (+43 more)

### Community 6 - "replacements/page.tsx"
Cohesion: 0.20
Nodes (13): ReplacementsContent(), ReplacementsPage(), ReportCenterPage(), TableScrollWrapper(), TableScrollWrapperProps, DOC_LABELS, PendingReplacementAssessmentItem, Props (+5 more)

### Community 7 - "application-schema.ts"
Cohesion: 0.14
Nodes (18): ApplicationFormProps, DocumentField, FormErrors, APPLICATION_SOURCES, applicationFinalSchema, BENEFICIARY_TYPES, CIVIL_STATUS_OPTIONS, EMPLOYMENT_INTEREST_OPTIONS (+10 more)

### Community 8 - "stubs/page.tsx"
Cohesion: 0.24
Nodes (13): PrintTemplateMode, StubsContent(), StubsDesignerPage(), ETUPAD_BASE_IMAGE, ETupadCard, ETupadCardProps, Format1Stub, Format1StubProps (+5 more)

### Community 9 - "stub-distribution/page.tsx"
Cohesion: 0.21
Nodes (29): DailyAttendancePage(), OrientationContent(), OrientationPage(), PayoutScannerPage(), photosMemoryCache, PhotosPage(), StubDistributionContent(), StubDistributionPage() (+21 more)

### Community 10 - "application-service.ts"
Cohesion: 0.13
Nodes (24): dynamic, POST(), dynamic, POST(), dynamic, POST(), ApplicationWriteAction, isIdempotentReplay() (+16 more)

### Community 11 - "beneficiaries/route.ts"
Cohesion: 0.16
Nodes (13): dynamic, POST(), DELETE(), dynamic, GET(), PATCH(), POST(), dynamic (+5 more)

### Community 12 - "test-application-workflow.mjs"
Cohesion: 0.08
Nodes (23): audits, cache, countQueries, deleted, detail, docs, encode, fakePrisma (+15 more)

### Community 13 - "completion-report-template.ts"
Cohesion: 0.09
Nodes (40): prisma, testExport(), dynamic, GET(), maxDuration, AttendanceActivity, buildBarangayCompletionDays(), cleanActivity() (+32 more)

### Community 14 - "programs/[id]/page.tsx"
Cohesion: 0.14
Nodes (22): AuditLogsPage(), DINGALAN_BARANGAYS, UserManagementPage(), ProgramDetailsHub(), ProgramsPage(), StatusBadge(), StatusBadgeProps, DeleteProgramModal() (+14 more)

### Community 15 - "ref_node_path"
Cohesion: 0.14
Nodes (9): core, output, require, root, output, pdfjs, program, require (+1 more)

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
Cohesion: 0.32
Nodes (9): main(), openBrowser(), portIsAvailable(), projectDir, responds(), runNode(), validateSetup(), waitUntilReady() (+1 more)

### Community 20 - "test-local-id-reader.mjs"
Cohesion: 0.05
Nodes (34): run(), addressCrop, addressLines, backStatusRegions, birthCrop, certificate, certificateLayout, conflict (+26 more)

### Community 21 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx (+12 more)

### Community 22 - "v1/beneficiaries/import/commit/route.ts"
Cohesion: 0.11
Nodes (41): dynamic, GET(), dynamic, GET(), maxDuration, POST(), canUseDoleReports(), DOLE_REPORT_SHEETS (+33 more)

### Community 23 - "excel-importer.ts"
Cohesion: 0.18
Nodes (16): ExcelImportPage(), DEFAULT_EXEMPTION_REASONS, MasterlistUploadModal(), MasterlistUploadModalProps, displayDate(), RosterRestrictionDetails(), cleanStr(), ImportPreviewResult (+8 more)

### Community 24 - "test-application-id-autofill.mjs"
Cohesion: 0.09
Nodes (27): dynamic, isRateLimited(), maxDuration, POST(), providerMessage(), rateLimit, mergeOcrSides(), analyzeIdentityDocument() (+19 more)

### Community 25 - "ref_path"
Cohesion: 0.07
Nodes (14): __dirname, nextConfig, isomorphic-git, dir, fs, git, path, dir (+6 more)

### Community 26 - "Layout & Components"
Cohesion: 0.14
Nodes (13): 1. DICT GWT Utility Header, 2. Official Municipal Masthead, 3. Hero Citizen Announcement Card, 4. Telemetry Metric Strip, 5. Public Status Inquiry Module (`#inquiry`), 6. Work Area Assignment Lookup (`#work-assignment`), 7. Direct Feedback Desk (`#inquiry-form`), 8. DICT Standard GWT Footer (+5 more)

### Community 27 - "@prisma/client"
Cohesion: 0.04
Nodes (21): @prisma/client, prisma, { PrismaClient }, referenceSlots, prisma, prisma, flaggedReference, prisma (+13 more)

### Community 28 - "test-application-inbox-browser.mjs"
Cohesion: 0.29
Nodes (5): errors, fixture, record, requests, require

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

### Community 33 - "local-id-reader.ts"
Cohesion: 0.18
Nodes (17): extractPhilSysNumber(), MappedOcrSide, MergedOcrResult, NON_BIRTH_DATE_LABEL, OcrTextLine, ORDERED_NAME_LABEL, extractProfileNumber(), identityNumberRows() (+9 more)

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

### Community 38 - "prisma.ts"
Cohesion: 0.12
Nodes (24): dynamic, GET(), dynamic, POST(), dynamic, GET(), dynamic, POST() (+16 more)

### Community 39 - "ref_crypto"
Cohesion: 0.36
Nodes (7): DINGALAN_BARANGAYS, main(), MONTH_NAME_MAP, normalizeBarangayName(), normalizeSitioName(), parseCSVLine(), prisma

### Community 40 - "master-sync-all-data.js"
Cohesion: 0.36
Nodes (7): chunkArray(), fs, main(), path, { PrismaClient }, toBool(), toDate()

### Community 41 - "prepare-dole-template.mjs"
Cohesion: 0.11
Nodes (15): jszip, cache, load(), original, output, require, review, root (+7 more)

### Community 42 - "v1/applications/route.ts"
Cohesion: 0.18
Nodes (13): dynamic, GET(), details, dynamic, GET(), PATCH(), DELETE(), dynamic (+5 more)

### Community 43 - "TUPAD application ID autofill and walk-in encoding"
Cohesion: 0.22
Nodes (8): Database migration, Local ID reading (default; no Azure key required), Number recovery and optional close-up, Optional Azure API, Required private storage configuration, TUPAD application ID autofill and walk-in encoding, Verification, What is implemented

### Community 44 - "getCurrentUser"
Cohesion: 0.08
Nodes (44): DELETE(), dynamic, PATCH(), dynamic, GET(), GET(), PATCH(), dynamic (+36 more)

### Community 46 - "ApplicationInbox.tsx"
Cohesion: 0.11
Nodes (31): cameraError(), IdCameraCapture(), Props, CapturedIdPayload, CaptureSlotKey, compressFileToPayload(), formatMmDdYyyyInput(), ORIGINAL_TO_REPLACEMENT_RELATIONSHIPS (+23 more)

### Community 47 - "migration.sql"
Cohesion: 0.33
Nodes (8): "TupadApplicationDocument", TupadApplicationDocument_applicationId_fieldName_idx, TupadApplicationDocument_uploadedById_idx, TupadApplicationRoster_applicationCode_key, TupadApplicationRoster_encodedById_idx, TupadApplicationRoster_idempotencyKey_key, TupadApplicationRoster_source_submissionStatus_idx, TupadApplicationRoster_submittedAt_idx

### Community 48 - "restrictions/route.ts"
Cohesion: 0.47
Nodes (5): dynamic, GET(), maskFullName(), parsePayoutDateToTimestamp(), POST()

### Community 49 - "FieldQrPassGeneratorCard.tsx"
Cohesion: 0.06
Nodes (48): html2canvas, lucide-react, react, AdminApplicationsPage(), AdminInquiriesPage(), FIELD_OPERATIONS, FieldScannerHubContent(), FieldScannerHubPage() (+40 more)

### Community 50 - "effects/TextCubeLoader.tsx"
Cohesion: 0.43
Nodes (3): Loading(), TextCubeLoader(), TextCubeLoaderProps

### Community 51 - "vercel.json"
Cohesion: 0.25
Nodes (7): buildCommand, framework, functions, src/app/api/**/*, $schema, includeFiles, maxDuration

### Community 52 - "lookup/route.ts"
Cohesion: 0.07
Nodes (45): date-fns, runTests(), validateDuration(), dynamic, GET(), handleQrPassSearch(), POST(), dynamic (+37 more)

### Community 53 - "flag-replacement/route.ts"
Cohesion: 0.24
Nodes (12): dynamic, POST(), dynamic, POST(), evaluatePersonTupadEligibility(), normalizeBirthdayComparison(), ParsedPersonName, parseEnteredFullName() (+4 more)

### Community 54 - "Reports: supplied DOLE 2026 workbook"
Cohesion: 0.33
Nodes (5): Preservation and source handling, Program isolation and persistence, Reports: supplied DOLE 2026 workbook, User workflow, Verification

### Community 55 - "app/page.tsx"
Cohesion: 0.11
Nodes (23): dynamic, LandingPage(), LandingNavDrawer(), NavDrawerCategory, NavDrawerItem, FacebookUpdatesSection(), BarangaySummary, OngoingTupadDemographicsSection() (+15 more)

### Community 56 - "migrate-user-plain-password.js"
Cohesion: 0.50
Nodes (4): getPresetPassword(), main(), prisma, { PrismaClient }

### Community 57 - "apply/inquiry/page.tsx"
Cohesion: 0.48
Nodes (4): metadata, PublicInquiryPage(), PublicInquiryMessageForm(), PublicStatusInquiryCard()

### Community 58 - "test-masterlist-import-postgres.mjs"
Cohesion: 0.24
Nodes (8): cacheRoot, dataDir, get(), listener, load(), { PrismaClient }, require, root

### Community 59 - "test-program-qr-postgres.mjs"
Cohesion: 0.12
Nodes (14): cacheRoot, dataDir, listener, load(), { PrismaClient }, require, root, cacheRoot (+6 more)

### Community 60 - "reseed-exact-522-beneficiaries.mjs"
Cohesion: 0.36
Nodes (7): DINGALAN_BARANGAYS, formatBday(), main(), normalizeBarangayName(), normalizeSitioName(), prisma, rawData

### Community 61 - "Stitch Design System & UI Screen Guide"
Cohesion: 0.40
Nodes (4): 1. How to Access and Edit in Stitch, 2. Included Local Artifacts, 3. How to Upload a Modified `DESIGN.md` to Stitch in the Future, Stitch Design System & UI Screen Guide

### Community 62 - "test-monitor-refresh-browser.mjs"
Cohesion: 0.33
Nodes (4): calls, errors, program, require

### Community 63 - "ref_node_fs"
Cohesion: 0.09
Nodes (13): typescript, exported, card, module, paper, source, expected, require (+5 more)

### Community 64 - "Guided ID camera"
Cohesion: 0.40
Nodes (4): Browser/privacy requirements, Capture flow, Guided ID camera, Verification

### Community 65 - "test-program-qr-browser.mjs"
Cohesion: 0.29
Nodes (5): calls, errors, programs, require, roster

### Community 67 - "work-program-parser.ts"
Cohesion: 0.10
Nodes (18): xlsx, dynamic, dynamic, DINGALAN_BARANGAYS, normalizeBarangay(), ParsedBarangayWorkProgram, ParsedWorkProgramItem, parseWorkProgramBuffer() (+10 more)

### Community 68 - "Online and walk-in application intake"
Cohesion: 0.33
Nodes (5): Admin review, Database and private storage, Online and walk-in application intake, Pages and roles, Verification

### Community 69 - "typescript"
Cohesion: 0.11
Nodes (10): blurred, clearResult, module, normalized, shaded, sharp, untouched, module (+2 more)

### Community 70 - "update-flagged-beneficiaries.js"
Cohesion: 0.40
Nodes (3): flaggedReference, prisma, { PrismaClient }

### Community 71 - "test-roster-restriction-browser.mjs"
Cohesion: 0.29
Nodes (6): baseRow, errors, preview, program, require, rows

### Community 73 - "v1/beneficiaries/import/commit/route.ts"
Cohesion: 0.21
Nodes (14): dynamic, ImportConflict, maxDuration, POST(), dynamic, maxDuration, POST(), saveImportedReportRows() (+6 more)

### Community 75 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, npm

### Community 78 - "test-local-ocr-browser.mjs"
Cohesion: 0.40
Nodes (3): jspdf, qrcode, require

### Community 81 - "beneficiaries/page.tsx"
Cohesion: 0.11
Nodes (41): main(), prisma, DEFAULT_10_DAY_ACTIVITIES, dynamic, POST(), AttendanceMatrixContent(), AttendanceMatrixPage(), BeneficiariesMasterlistContent() (+33 more)

### Community 82 - "ref_node_assert"
Cohesion: 0.07
Nodes (23): ExcelJS, fixture, programs, require, errors, require, errors, require (+15 more)

### Community 83 - "Reusable QR slots and per-program scan history"
Cohesion: 0.33
Nodes (5): More than 522 beneficiaries, Offline devices, Program-owned QR codes and scan history, Reusing an existing physical card, Verification

### Community 85 - "restrictions/import/route.ts"
Cohesion: 0.39
Nodes (7): addDaysToDate(), checkIsAppointive(), dynamic, maxDuration, parseDateToISO(), parseNameParts(), POST()

### Community 87 - "ApplicationForm"
Cohesion: 0.21
Nodes (10): WalkInEncodingPage(), OnlineTupadApplicationPage(), ApplicationForm(), MultiChoice(), Section(), SelectField(), SourceBadge(), TextField() (+2 more)

### Community 88 - "test-dole-reports-browser.mjs"
Cohesion: 0.25
Nodes (6): errors, files, programs, require, saved, writes

### Community 89 - "@supabase/supabase-js"
Cohesion: 0.33
Nodes (3): @supabase/supabase-js, supabase, supabaseAdmin

### Community 90 - "test-dole-reports.mjs"
Cohesion: 0.08
Nodes (21): IS_LOCAL_DEVELOPMENT, PRECACHE_ASSETS, api, base, cache, config, data, db (+13 more)

### Community 100 - "IdUploadPanel.tsx"
Cohesion: 0.33
Nodes (9): FieldProps, FilePreview(), IdUploadPanel(), IdUploadPanelProps, OcrResponse, ApplicationFormValues, isAcceptedApplicationFile(), OcrAutofillStatus (+1 more)

### Community 102 - "application-storage.ts"
Cohesion: 0.33
Nodes (8): ACCEPTED_APPLICATION_FILE_TYPES, MAX_APPLICATION_FILE_SIZE, APPLICATION_DOCUMENT_BUCKET, ensurePrivateBucket(), extensionFor(), getPrivateStorageClient(), removeApplicationDocuments(), uploadApplicationDocument()

### Community 103 - "identity-profiles.ts"
Cohesion: 0.29
Nodes (5): ID_TYPES, genericNumbers, IdentityDocumentType, IdentityProfile, PROFILES

### Community 104 - "auth.ts"
Cohesion: 0.12
Nodes (19): bcryptjs, dynamic, POST(), dynamic, GET(), dynamic, generateTrackingCode(), POST() (+11 more)

### Community 105 - "export-pg-to-files.js"
Cohesion: 0.40
Nodes (3): fs, path, { PrismaClient }

### Community 107 - "restore-to-postgres.js"
Cohesion: 0.40
Nodes (3): fs, path, { PrismaClient }

### Community 108 - "dashboard/page.tsx"
Cohesion: 0.50
Nodes (4): DashboardData, DashboardPage(), dynamic, getDashboardMetrics()

### Community 109 - "Q: ayusin mo yung sa driver`s license kasi halos walang nababasa"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ayusin mo yung sa driver`s license kasi halos walang nababasa, Source Nodes

### Community 118 - "extract-and-sync-522-qrs.mjs"
Cohesion: 0.13
Nodes (11): jsqr, pdfjs-dist, prisma, DINGALAN_BARANGAYS, main(), normalizeBarangayName(), normalizeSitioName(), prisma (+3 more)

## Knowledge Gaps
- **14 isolated node(s):** `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs`, `@types/jsonwebtoken`, `@types/jszip` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 880 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `@prisma/client` to `package.json`, `next`, `application-service.ts`, `completion-report-template.ts`, `v1/beneficiaries/import/commit/route.ts`, `ref_path`, `inspect-all-sources.js`, `seed.js`, `ref_fs`, `ref_crypto`, `master-sync-all-data.js`, `v1/applications/route.ts`, `lookup/route.ts`, `migrate-user-plain-password.js`, `test-masterlist-import-postgres.mjs`, `test-program-qr-postgres.mjs`, `reseed-exact-522-beneficiaries.mjs`, `inspect-flagged.js`, `work-program-parser.ts`, `update-flagged-beneficiaries.js`, `inspect-db.js`, `v1/beneficiaries/import/commit/route.ts`, `inspect-program-details.mjs`, `check-demographics.mjs`, `inspect-db.mjs`, `test-matrix-and-sync.mjs`, `beneficiaries/page.tsx`, `test-pg-counts.js`, `@supabase/supabase-js`, `export-pg-to-files.js`, `check-sep20-evening.mjs`, `restore-to-postgres.js`, `test-landing-scanner.mjs`, `cleanup-and-deduplicate.js`, `test-program-crud.mjs`, `test-public-inquiry.mjs`, `extract-and-sync-522-qrs.mjs`, `test-stub-distribution-monitoring.mjs`?**
  _High betweenness centrality (0.184) - this node is a cross-community bridge._
- **What connects `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `package.json`, `dexie.ts`, `test-accomplishment-work-schedule.mjs`, `getCurrentUser`, `replacements/page.tsx`, `stubs/page.tsx`, `stub-distribution/page.tsx`, `application-service.ts`, `beneficiaries/route.ts`, `completion-report-template.ts`, `programs/[id]/page.tsx`, `v1/beneficiaries/import/commit/route.ts`, `excel-importer.ts`, `test-application-id-autofill.mjs`, `prisma.ts`, `v1/applications/route.ts`, `getCurrentUser`, `middleware.ts`, `restrictions/route.ts`, `FieldQrPassGeneratorCard.tsx`, `lookup/route.ts`, `flag-replacement/route.ts`, `app/page.tsx`, `apply/inquiry/page.tsx`, `work-program-parser.ts`, `v1/beneficiaries/import/commit/route.ts`, `beneficiaries/page.tsx`, `restrictions/import/route.ts`, `auth.ts`, `dashboard/page.tsx`, `extract-and-sync-522-qrs.mjs`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **Should `next` be split into smaller, more focused modules?**
  _Cohesion score 0.05858585858585859 - nodes in this community are weakly interconnected._
- **Why does `react` connect `FieldQrPassGeneratorCard.tsx` to `package.json`, `next`, `dexie.ts`, `replacements/page.tsx`, `application-schema.ts`, `stubs/page.tsx`, `stub-distribution/page.tsx`, `programs/[id]/page.tsx`, `v1/beneficiaries/import/commit/route.ts`, `excel-importer.ts`, `test-roster-restriction-preview.mjs`, `ApplicationInbox.tsx`, `getCurrentUser`, `ApplicationInbox.tsx`, `effects/TextCubeLoader.tsx`, `app/page.tsx`, `apply/inquiry/page.tsx`, `beneficiaries/page.tsx`, `IdUploadPanel.tsx`, `dashboard/page.tsx`, `extract-and-sync-522-qrs.mjs`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Should `dexie.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09191583610188261 - nodes in this community are weakly interconnected._