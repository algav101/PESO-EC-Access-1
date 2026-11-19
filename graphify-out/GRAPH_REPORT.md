# Graph Report - PESO-EC-Access-1  (2026-11-19)

## Corpus Check
- 397 files · ~1,460,196 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 33 file(s) not represented in the graph (top: .csv 26, .css 2, .example 1)

## Summary
- 1994 nodes · 5011 edges · 120 communities (92 shown, 28 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `db027ef9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- dexie.ts
- programs/[id]/route.ts
- dependencies
- test-accomplishment-work-schedule.mjs
- getCurrentUser
- replacements/page.tsx
- application-schema.ts
- stubs/page.tsx
- stub-distribution/page.tsx
- application-service.ts
- test-program-work-date-browser.mjs
- test-application-workflow.mjs
- completion-report-template.ts
- hasPermission
- dingalan-groupings.ts
- identity-address.ts
- application-id-mapper.ts
- scripts
- start-localhost.mjs
- test-local-id-reader.mjs
- compilerOptions
- v1/beneficiaries/import/commit/route.ts
- ApplicationInbox.tsx
- test-application-id-autofill.mjs
- ref_path
- Layout & Components
- @prisma/client
- beneficiaries/route.ts
- Layout & Components
- inspect-all-sources.js
- test-roster-restriction-preview.mjs
- programs/[id]/page.tsx
- check-remote.js
- seed.js
- ref_fs
- browser-id-ocr.ts
- manifest.json
- prisma.ts
- ref_crypto
- master-sync-all-data.js
- prepare-dole-template.mjs
- start-localhost.mjs
- TUPAD application ID autofill and walk-in encoding
- bulk/route.ts
- middleware.ts
- ApplicationInbox.tsx
- migration.sql
- restrictions/route.ts
- useAuth
- effects/TextCubeLoader.tsx
- vercel.json
- v1/beneficiaries/import/commit/route.ts
- test-bulk-attendance-browser.mjs
- Reports: supplied DOLE 2026 workbook
- app/page.tsx
- migrate-user-plain-password.js
- react
- test-auto-qr-browser.mjs
- test-program-qr-postgres.mjs
- local-id-reader.ts
- Stitch Design System & UI Screen Guide
- ApplicationForm
- ref_node_fs
- Guided ID camera
- replacement-eligibility.ts
- inspect-flagged.js
- work-program-parser.ts
- Online and walk-in application intake
- ocr/route.ts
- update-flagged-beneficiaries.js
- test-application-inbox-browser.mjs
- inspect-db.js
- detailed-consolidated-retrieval.mjs
- application-storage.ts
- engines
- ref_node_assert
- tailwindcss
- test-local-ocr-browser.mjs
- inspect-db.mjs
- check-reference-slots.js
- beneficiaries/page.tsx
- ref_node_assert
- Reusable QR slots and per-program scan history
- extractProfileNumber
- restrictions/import/route.ts
- test-offline-sync-resilience.mjs
- ProgramBeneficiary_active_program_slot_key
- test-dole-reports-browser.mjs
- @supabase/supabase-js
- test-dole-reports.mjs
- format1-stub-base-b64.ts
- Bagong Pilipinas transparent footer asset
- dashboard/page.tsx
- lookup/route.ts
- test-public-inquiry.mjs
- apply/inquiry/page.tsx
- next
- auth.ts
- test-roster-restriction-browser.mjs
- inspect-program-details.mjs
- programs/[id]/route.ts
- Q: ayusin mo yung sa driver`s license kasi halos walang nababasa
- inspect-sep21-data.mjs
- cleanup-and-deduplicate.js
- test-pg-counts.js
- test-program-crud.mjs
- check-demographics.mjs
- heal-qr-codes.mjs
- test-matrix-and-sync.mjs
- test-dedicated-qr-retention.mjs
- extract-and-sync-522-qrs.mjs
- test-attendance-3hours.mjs

## God Nodes (most connected - your core abstractions)
1. `getCurrentUser()` - 163 edges
2. `next` - 116 edges
3. `isAdminUser()` - 116 edges
4. `hasPermission()` - 116 edges
5. `react` - 85 edges
6. `logAudit()` - 83 edges
7. `lucide-react` - 75 edges
8. `prisma` - 75 edges
9. `useAuth()` - 69 edges
10. `@prisma/client` - 65 edges

## Surprising Connections (you probably didn't know these)
- `html()` --indirect_call--> `RosterRestrictionDetails()`  [INFERRED]
  test/test-roster-restriction-preview.mjs → src/components/beneficiaries/RosterRestrictionDetails.tsx
- `addressOf()` --calls--> `mapLocalIdentityText()`  [EXTRACTED]
  test/test-local-id-reader.mjs → src/lib/ocr/application-id-mapper.ts
- `mapped()` --calls--> `mapLocalIdentityText()`  [EXTRACTED]
  test/test-local-id-reader.mjs → src/lib/ocr/application-id-mapper.ts
- `main()` --calls--> `normalizeBarangayName()`  [EXTRACTED]
  scripts/unify-all-sitios-and-puroks.mjs → src/lib/utils.ts
- `run()` --indirect_call--> `selected()`  [INFERRED]
  src/components/reports/DoleReportsPanel.tsx → test/test-local-id-reader.mjs

## Import Cycles
- None detected.

## Communities (120 total, 28 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.08
Nodes (23): name, private, version, autoprefixer, clsx, dexie, dexie-react-hooks, @hookform/resolvers (+15 more)

### Community 1 - "dexie.ts"
Cohesion: 0.12
Nodes (29): SyncCenterPage(), OfflineContext, OfflineContextType, OfflineProvider(), CachedBeneficiary, CachedProgram, CachedWorkDay, CachedWorkProgramItem (+21 more)

### Community 2 - "programs/[id]/route.ts"
Cohesion: 0.50
Nodes (5): PATCH(), reconcileAttendanceScheduleDates(), buildProgramWorkDays(), ProgramScheduleError, rescheduleProgramWorkDays()

### Community 3 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, autoprefixer, bcryptjs, clsx, date-fns, dexie, dexie-react-hooks, exceljs (+33 more)

### Community 4 - "test-accomplishment-work-schedule.mjs"
Cohesion: 0.05
Nodes (37): book, { buildBarangayCompletionDays }, cache, chunks, db, doleBook, downloaded, ExcelJS (+29 more)

### Community 5 - "getCurrentUser"
Cohesion: 0.08
Nodes (43): DELETE(), dynamic, PATCH(), dynamic, GET(), dynamic, GET(), POST() (+35 more)

### Community 6 - "replacements/page.tsx"
Cohesion: 0.25
Nodes (11): ReplacementsContent(), ReplacementsPage(), ReportCenterPage(), DOC_LABELS, PendingReplacementAssessmentItem, Props, ReplacementApprovalModal(), StubReplacementTarget (+3 more)

### Community 7 - "application-schema.ts"
Cohesion: 0.11
Nodes (28): ApplicationFormProps, DocumentField, FieldProps, FormErrors, FilePreview(), IdUploadPanel(), IdUploadPanelProps, OcrResponse (+20 more)

### Community 8 - "stubs/page.tsx"
Cohesion: 0.22
Nodes (14): PrintTemplateMode, StubsContent(), StubsDesignerPage(), ETUPAD_BASE_IMAGE, ETupadCard, ETupadCardProps, Format1Stub, Format1StubProps (+6 more)

### Community 9 - "stub-distribution/page.tsx"
Cohesion: 0.21
Nodes (31): DailyAttendancePage(), OrientationContent(), OrientationPage(), PayoutScannerPage(), photosMemoryCache, PhotosPage(), StubDistributionContent(), StubDistributionPage() (+23 more)

### Community 10 - "application-service.ts"
Cohesion: 0.13
Nodes (23): dynamic, POST(), dynamic, POST(), dynamic, POST(), applicationDraftSchema, applicationFinalSchema (+15 more)

### Community 11 - "test-program-work-date-browser.mjs"
Cohesion: 0.25
Nodes (4): errors, newDates, oldDates, require

### Community 12 - "test-application-workflow.mjs"
Cohesion: 0.08
Nodes (23): audits, cache, countQueries, deleted, detail, docs, encode, fakePrisma (+15 more)

### Community 13 - "completion-report-template.ts"
Cohesion: 0.08
Nodes (42): exceljs, prisma, testExport(), dynamic, dynamic, GET(), maxDuration, AttendanceActivity (+34 more)

### Community 14 - "hasPermission"
Cohesion: 0.07
Nodes (40): DELETE(), generateElporControlNo(), GET(), PATCH(), POST(), DELETE(), generateCaseTrackingCode(), GET() (+32 more)

### Community 15 - "dingalan-groupings.ts"
Cohesion: 0.28
Nodes (17): DEFAULT_10_DAY_ACTIVITIES, dynamic, POST(), FieldWorkProgramPage(), WorkProgramManagementPage(), DeploymentGroupingMatrix(), DeploymentGroupingMatrixProps, BarangayGroupingConfig (+9 more)

### Community 16 - "identity-address.ts"
Cohesion: 0.34
Nodes (14): addressLike(), addressPiece(), addressStart(), barangayPattern(), escape(), IdentityAddress, nearBarangay(), normalize() (+6 more)

### Community 17 - "application-id-mapper.ts"
Cohesion: 0.25
Nodes (22): birthDateValue(), clean(), cleanLocalValue(), cleanPersonName(), detectIdentityDocumentType(), explicitLabel(), fieldValue(), identityValue() (+14 more)

### Community 18 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, dev, lint, postinstall, prepare:ocr, prisma:generate, prisma:push (+9 more)

### Community 19 - "start-localhost.mjs"
Cohesion: 0.14
Nodes (9): core, output, require, root, output, pdfjs, program, require (+1 more)

### Community 20 - "test-local-id-reader.mjs"
Cohesion: 0.05
Nodes (36): run(), addressCrop, addressLines, addressOf(), backStatusRegions, birthCrop, certificate, certificateLayout (+28 more)

### Community 21 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx (+12 more)

### Community 22 - "v1/beneficiaries/import/commit/route.ts"
Cohesion: 0.11
Nodes (42): dynamic, GET(), dynamic, GET(), maxDuration, POST(), canUseDoleReports(), DOLE_REPORT_SHEETS (+34 more)

### Community 23 - "ApplicationInbox.tsx"
Cohesion: 0.18
Nodes (13): OnlineApplicationsPage(), WalkInSubmissionsPage(), ApplicationInbox(), ApplicationRecord, dateText(), InboxData, sections, valueText() (+5 more)

### Community 24 - "test-application-id-autofill.mjs"
Cohesion: 0.10
Nodes (18): ApplicationWriteAction, isIdempotentReplay(), azurePrintedFields, clearFront, conflict, conflictingBack, dateOnly, incomplete (+10 more)

### Community 25 - "ref_path"
Cohesion: 0.08
Nodes (11): __dirname, nextConfig, prisma, fs, path, { PrismaClient }, prisma, fs (+3 more)

### Community 26 - "Layout & Components"
Cohesion: 0.14
Nodes (13): 1. DICT GWT Utility Header, 2. Official Municipal Masthead, 3. Hero Citizen Announcement Card, 4. Telemetry Metric Strip, 5. Public Status Inquiry Module (`#inquiry`), 6. Work Area Assignment Lookup (`#work-assignment`), 7. Direct Feedback Desk (`#inquiry-form`), 8. DICT Standard GWT Footer (+5 more)

### Community 27 - "@prisma/client"
Cohesion: 0.05
Nodes (17): @prisma/client, prisma, prisma, flaggedReference, prisma, { PrismaClient }, prisma, prisma (+9 more)

### Community 28 - "beneficiaries/route.ts"
Cohesion: 0.09
Nodes (32): dynamic, GET(), handleQrPassSearch(), POST(), dynamic, POST(), DELETE(), dynamic (+24 more)

### Community 29 - "Layout & Components"
Cohesion: 0.14
Nodes (13): 1. DICT GWT Utility Header, 2. Official Municipal Masthead, 3. Hero Citizen Announcement Card, 4. Telemetry Metric Strip, 5. Public Status Inquiry Module (`#inquiry`), 6. Work Area Assignment Lookup (`#work-assignment`), 7. Direct Feedback Desk (`#inquiry-form`), 8. DICT Standard GWT Footer (+5 more)

### Community 30 - "inspect-all-sources.js"
Cohesion: 0.11
Nodes (16): Database, db, fs, summary, tables, Database, db, fs (+8 more)

### Community 31 - "test-roster-restriction-preview.mjs"
Cohesion: 0.12
Nodes (15): react-dom, activeMarkup, book, buffer, cache, globalRoute, load(), names (+7 more)

### Community 32 - "programs/[id]/page.tsx"
Cohesion: 0.14
Nodes (20): AuditLogsPage(), DINGALAN_BARANGAYS, UserManagementPage(), ProgramDetailsHub(), ProgramsPage(), BeneficiarySummaryDropdown(), StatusBadge(), StatusBadgeProps (+12 more)

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
Cohesion: 0.18
Nodes (24): tesseract.js, normalizeIdLighting(), active(), canvas(), context(), crop(), enhance(), evenLighting() (+16 more)

### Community 37 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 38 - "prisma.ts"
Cohesion: 0.13
Nodes (27): date-fns, dynamic, POST(), dynamic, POST(), dynamic, POST(), dynamic (+19 more)

### Community 39 - "ref_crypto"
Cohesion: 0.36
Nodes (7): DINGALAN_BARANGAYS, main(), MONTH_NAME_MAP, normalizeBarangayName(), normalizeSitioName(), parseCSVLine(), prisma

### Community 40 - "master-sync-all-data.js"
Cohesion: 0.36
Nodes (7): chunkArray(), fs, main(), path, { PrismaClient }, toBool(), toDate()

### Community 41 - "prepare-dole-template.mjs"
Cohesion: 0.11
Nodes (15): jszip, cache, load(), original, output, require, review, root (+7 more)

### Community 42 - "start-localhost.mjs"
Cohesion: 0.32
Nodes (9): main(), openBrowser(), portIsAvailable(), projectDir, responds(), runNode(), validateSetup(), waitUntilReady() (+1 more)

### Community 43 - "TUPAD application ID autofill and walk-in encoding"
Cohesion: 0.22
Nodes (8): Database migration, Local ID reading (default; no Azure key required), Number recovery and optional close-up, Optional Azure API, Required private storage configuration, TUPAD application ID autofill and walk-in encoding, Verification, What is implemented

### Community 44 - "bulk/route.ts"
Cohesion: 0.09
Nodes (27): DINGALAN_BARANGAYS, formatBday(), main(), normalizeBarangayName(), normalizeSitioName(), prisma, rawData, DINGALAN_BARANGAYS (+19 more)

### Community 46 - "ApplicationInbox.tsx"
Cohesion: 0.11
Nodes (30): cameraError(), IdCameraCapture(), Props, CapturedIdPayload, CaptureSlotKey, compressFileToPayload(), formatMmDdYyyyInput(), ORIGINAL_TO_REPLACEMENT_RELATIONSHIPS (+22 more)

### Community 47 - "migration.sql"
Cohesion: 0.33
Nodes (8): "TupadApplicationDocument", TupadApplicationDocument_applicationId_fieldName_idx, TupadApplicationDocument_uploadedById_idx, TupadApplicationRoster_applicationCode_key, TupadApplicationRoster_encodedById_idx, TupadApplicationRoster_idempotencyKey_key, TupadApplicationRoster_source_submissionStatus_idx, TupadApplicationRoster_submittedAt_idx

### Community 48 - "restrictions/route.ts"
Cohesion: 0.38
Nodes (6): DELETE(), dynamic, GET(), maskFullName(), parsePayoutDateToTimestamp(), POST()

### Community 49 - "useAuth"
Cohesion: 0.08
Nodes (32): AdminApplicationsPage(), AdminInquiriesPage(), metadata, RootLayout(), viewport, buildPresetRoleGroups(), DEFAULT_ROLE_GROUPS, LoginPage() (+24 more)

### Community 50 - "effects/TextCubeLoader.tsx"
Cohesion: 0.43
Nodes (3): Loading(), TextCubeLoader(), TextCubeLoaderProps

### Community 51 - "vercel.json"
Cohesion: 0.25
Nodes (7): buildCommand, framework, functions, src/app/api/**/*, $schema, includeFiles, maxDuration

### Community 52 - "v1/beneficiaries/import/commit/route.ts"
Cohesion: 0.13
Nodes (27): dynamic, ImportConflict, maxDuration, POST(), dynamic, maxDuration, POST(), dynamic (+19 more)

### Community 53 - "test-bulk-attendance-browser.mjs"
Cohesion: 0.29
Nodes (6): calls, days, errors, program, require, roster

### Community 54 - "Reports: supplied DOLE 2026 workbook"
Cohesion: 0.33
Nodes (5): Preservation and source handling, Program isolation and persistence, Reports: supplied DOLE 2026 workbook, User workflow, Verification

### Community 55 - "app/page.tsx"
Cohesion: 0.11
Nodes (23): dynamic, LandingPage(), LandingNavDrawer(), NavDrawerCategory, NavDrawerItem, FacebookUpdatesSection(), BarangaySummary, OngoingTupadDemographicsSection() (+15 more)

### Community 56 - "migrate-user-plain-password.js"
Cohesion: 0.50
Nodes (4): getPresetPassword(), main(), prisma, { PrismaClient }

### Community 57 - "react"
Cohesion: 0.15
Nodes (11): react, FIELD_OPERATIONS, FieldScannerHubContent(), FieldScannerHubPage(), AssignmentContent(), MyAssignmentPage(), DINGALAN_BARANGAYS, FieldQrPassGeneratorCard() (+3 more)

### Community 58 - "test-auto-qr-browser.mjs"
Cohesion: 0.33
Nodes (6): calls, errors, programs, require, scan(), tokens

### Community 59 - "test-program-qr-postgres.mjs"
Cohesion: 0.11
Nodes (15): cacheRoot, dataDir, get(), listener, load(), { PrismaClient }, require, root (+7 more)

### Community 60 - "local-id-reader.ts"
Cohesion: 0.13
Nodes (18): MappedOcrSide, MergedOcrResult, NON_BIRTH_DATE_LABEL, ORDERED_NAME_LABEL, ADDRESS_LABEL, ADDRESS_STOP, genericNumbers, getIdentityProfile() (+10 more)

### Community 61 - "Stitch Design System & UI Screen Guide"
Cohesion: 0.40
Nodes (4): 1. How to Access and Edit in Stitch, 2. Included Local Artifacts, 3. How to Upload a Modified `DESIGN.md` to Stitch in the Future, Stitch Design System & UI Screen Guide

### Community 62 - "ApplicationForm"
Cohesion: 0.17
Nodes (13): WalkInEncodingPage(), OnlineTupadApplicationPage(), ApplicationForm(), MultiChoice(), Section(), SelectField(), SourceBadge(), TextField() (+5 more)

### Community 63 - "ref_node_fs"
Cohesion: 0.06
Nodes (23): typescript, exported, card, module, paper, source, blurred, clearResult (+15 more)

### Community 64 - "Guided ID camera"
Cohesion: 0.40
Nodes (4): Browser/privacy requirements, Capture flow, Guided ID camera, Verification

### Community 65 - "replacement-eligibility.ts"
Cohesion: 0.24
Nodes (12): dynamic, POST(), dynamic, POST(), evaluatePersonTupadEligibility(), normalizeBirthdayComparison(), ParsedPersonName, parseEnteredFullName() (+4 more)

### Community 67 - "work-program-parser.ts"
Cohesion: 0.06
Nodes (34): xlsx, dynamic, dynamic, POST(), dynamic, POST(), dynamic, ExcelImportPage() (+26 more)

### Community 68 - "Online and walk-in application intake"
Cohesion: 0.33
Nodes (5): Admin review, Database and private storage, Online and walk-in application intake, Pages and roles, Verification

### Community 69 - "ocr/route.ts"
Cohesion: 0.20
Nodes (13): dynamic, isRateLimited(), maxDuration, POST(), providerMessage(), rateLimit, mergeOcrSides(), OcrSubject (+5 more)

### Community 70 - "update-flagged-beneficiaries.js"
Cohesion: 0.40
Nodes (3): flaggedReference, prisma, { PrismaClient }

### Community 71 - "test-application-inbox-browser.mjs"
Cohesion: 0.29
Nodes (5): errors, fixture, record, requests, require

### Community 74 - "application-storage.ts"
Cohesion: 0.23
Nodes (12): dynamic, GET(), ACCEPTED_APPLICATION_FILE_TYPES, MAX_APPLICATION_FILE_SIZE, APPLICATION_DOCUMENT_BUCKET, downloadApplicationDocument(), ensurePrivateBucket(), extensionFor() (+4 more)

### Community 75 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, npm

### Community 76 - "ref_node_assert"
Cohesion: 0.04
Nodes (36): ExcelJS, fixture, programs, require, errors, require, login(), run() (+28 more)

### Community 78 - "test-local-ocr-browser.mjs"
Cohesion: 0.40
Nodes (3): jspdf, qrcode, require

### Community 80 - "check-reference-slots.js"
Cohesion: 0.40
Nodes (3): prisma, { PrismaClient }, referenceSlots

### Community 81 - "beneficiaries/page.tsx"
Cohesion: 0.10
Nodes (36): lucide-react, main(), prisma, AttendanceMatrixContent(), AttendanceMatrixPage(), BeneficiariesMasterlistContent(), loadData(), BeneficiariesMasterlistPage() (+28 more)

### Community 82 - "ref_node_assert"
Cohesion: 0.11
Nodes (12): IS_LOCAL_DEVELOPMENT, PRECACHE_ASSETS, assertTimeInRange(), testBulkAttendance(), request(), cacheRoot, dataDir, listener (+4 more)

### Community 83 - "Reusable QR slots and per-program scan history"
Cohesion: 0.29
Nodes (6): Active masterlist uniqueness, More than 522 beneficiaries, Offline devices, Program-owned QR codes and scan history, Reusing an existing physical card, Verification

### Community 84 - "extractProfileNumber"
Cohesion: 0.39
Nodes (8): extractPhilSysNumber(), OcrTextLine, extractProfileNumber(), identityNumberRows(), normalizeNumberText(), NUMERIC_FORMATS, numericNumber(), combineLocalReadings()

### Community 85 - "restrictions/import/route.ts"
Cohesion: 0.39
Nodes (7): addDaysToDate(), checkIsAppointive(), dynamic, maxDuration, parseDateToISO(), parseNameParts(), POST()

### Community 88 - "test-dole-reports-browser.mjs"
Cohesion: 0.25
Nodes (6): errors, files, programs, require, saved, writes

### Community 89 - "@supabase/supabase-js"
Cohesion: 0.33
Nodes (3): @supabase/supabase-js, supabase, supabaseAdmin

### Community 90 - "test-dole-reports.mjs"
Cohesion: 0.10
Nodes (18): api, base, cache, config, data, db, draft, entry (+10 more)

### Community 99 - "dashboard/page.tsx"
Cohesion: 0.50
Nodes (4): DashboardData, DashboardPage(), dynamic, getDashboardMetrics()

### Community 100 - "lookup/route.ts"
Cohesion: 0.43
Nodes (7): dynamic, GET(), handleLookup(), maskFullName(), POST(), verifyMiddleName(), extractCleanQrToken()

### Community 103 - "apply/inquiry/page.tsx"
Cohesion: 0.48
Nodes (4): metadata, PublicInquiryPage(), PublicInquiryMessageForm(), PublicStatusInquiryCard()

### Community 104 - "next"
Cohesion: 0.05
Nodes (34): next, dynamic, GET(), dynamic, dynamic, POST(), dynamic, POST() (+26 more)

### Community 105 - "auth.ts"
Cohesion: 0.10
Nodes (22): bcryptjs, dynamic, getVal(), POST(), dynamic, POST(), dynamic, GET() (+14 more)

### Community 106 - "test-roster-restriction-browser.mjs"
Cohesion: 0.29
Nodes (6): baseRow, errors, preview, program, require, rows

### Community 108 - "programs/[id]/route.ts"
Cohesion: 0.50
Nodes (3): DELETE(), dynamic, GET()

### Community 109 - "Q: ayusin mo yung sa driver`s license kasi halos walang nababasa"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ayusin mo yung sa driver`s license kasi halos walang nababasa, Source Nodes

### Community 118 - "extract-and-sync-522-qrs.mjs"
Cohesion: 0.21
Nodes (6): jsqr, pdfjs-dist, prisma, metadata, WorkAreaAssignmentInquiryPage(), PublicWorkAssignmentLookupCard()

## Knowledge Gaps
- **14 isolated node(s):** `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs`, `@types/jsonwebtoken`, `@types/jszip` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 909 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `@prisma/client` to `package.json`, `programs/[id]/route.ts`, `getCurrentUser`, `application-service.ts`, `completion-report-template.ts`, `v1/beneficiaries/import/commit/route.ts`, `ref_path`, `beneficiaries/route.ts`, `inspect-all-sources.js`, `seed.js`, `ref_fs`, `ref_crypto`, `master-sync-all-data.js`, `bulk/route.ts`, `v1/beneficiaries/import/commit/route.ts`, `migrate-user-plain-password.js`, `test-program-qr-postgres.mjs`, `inspect-flagged.js`, `work-program-parser.ts`, `update-flagged-beneficiaries.js`, `inspect-db.js`, `detailed-consolidated-retrieval.mjs`, `inspect-db.mjs`, `check-reference-slots.js`, `beneficiaries/page.tsx`, `ref_node_assert`, `test-offline-sync-resilience.mjs`, `@supabase/supabase-js`, `test-public-inquiry.mjs`, `next`, `inspect-program-details.mjs`, `inspect-sep21-data.mjs`, `cleanup-and-deduplicate.js`, `test-pg-counts.js`, `test-program-crud.mjs`, `check-demographics.mjs`, `heal-qr-codes.mjs`, `test-matrix-and-sync.mjs`, `test-dedicated-qr-retention.mjs`, `extract-and-sync-522-qrs.mjs`?**
  _High betweenness centrality (0.200) - this node is a cross-community bridge._
- **What connects `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `package.json`, `getCurrentUser`, `replacements/page.tsx`, `stubs/page.tsx`, `stub-distribution/page.tsx`, `application-service.ts`, `completion-report-template.ts`, `hasPermission`, `dingalan-groupings.ts`, `v1/beneficiaries/import/commit/route.ts`, `beneficiaries/route.ts`, `programs/[id]/page.tsx`, `prisma.ts`, `bulk/route.ts`, `middleware.ts`, `restrictions/route.ts`, `useAuth`, `v1/beneficiaries/import/commit/route.ts`, `app/page.tsx`, `react`, `replacement-eligibility.ts`, `work-program-parser.ts`, `ocr/route.ts`, `application-storage.ts`, `beneficiaries/page.tsx`, `restrictions/import/route.ts`, `dashboard/page.tsx`, `lookup/route.ts`, `apply/inquiry/page.tsx`, `auth.ts`, `programs/[id]/route.ts`, `extract-and-sync-522-qrs.mjs`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **Should `dexie.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12299465240641712 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `package.json`, `dexie.ts`, `replacements/page.tsx`, `application-schema.ts`, `stubs/page.tsx`, `stub-distribution/page.tsx`, `hasPermission`, `dingalan-groupings.ts`, `v1/beneficiaries/import/commit/route.ts`, `ApplicationInbox.tsx`, `test-roster-restriction-preview.mjs`, `programs/[id]/page.tsx`, `bulk/route.ts`, `ApplicationInbox.tsx`, `useAuth`, `effects/TextCubeLoader.tsx`, `app/page.tsx`, `work-program-parser.ts`, `beneficiaries/page.tsx`, `dashboard/page.tsx`, `apply/inquiry/page.tsx`, `next`, `extract-and-sync-522-qrs.mjs`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._