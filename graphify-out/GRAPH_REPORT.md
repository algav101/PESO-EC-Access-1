# Graph Report - PESO-EC-Access-1  (2026-11-18)

## Corpus Check
- 379 files · ~1,444,743 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 33 file(s) not represented in the graph (top: .csv 26, .css 2, .example 1)

## Summary
- 1908 nodes · 4760 edges · 123 communities (94 shown, 29 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `957d9858`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- next
- dexie.ts
- dependencies
- test-accomplishment-work-schedule.mjs
- getCurrentUser
- dingalan-groupings.ts
- ApplicationForm.tsx
- stubs/page.tsx
- stub-distribution/page.tsx
- application-service.ts
- MasterlistUploadModal.tsx
- test-application-workflow.mjs
- completion-report-template.ts
- react
- v1/beneficiaries/import/commit/route.ts
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
- prisma.ts
- ref_crypto
- master-sync-all-data.js
- prepare-dole-template.mjs
- v1/applications/route.ts
- TUPAD application ID autofill and walk-in encoding
- isAdminUser
- middleware.ts
- ApplicationInbox.tsx
- migration.sql
- restrictions/route.ts
- FieldQrPassGeneratorCard.tsx
- effects/TextCubeLoader.tsx
- vercel.json
- qr-pass/route.ts
- flag-replacement/route.ts
- Reports: supplied DOLE 2026 workbook
- app/page.tsx
- migrate-user-plain-password.js
- replacements/page.tsx
- test-suite.mjs
- test-program-qr-postgres.mjs
- reseed-exact-522-beneficiaries.mjs
- Stitch Design System & UI Screen Guide
- application-schema.ts
- export/route.ts
- Guided ID camera
- application-storage.ts
- inspect-flagged.js
- work-program-parser.ts
- Online and walk-in application intake
- test-service-worker-cache.mjs
- update-flagged-beneficiaries.js
- IdUploadPanel.tsx
- ocr/route.ts
- hasPermission
- inspect-program-details.mjs
- engines
- local-id-reader.ts
- tailwindcss
- test-local-ocr-browser.mjs
- test-masterlist-import-postgres.mjs
- beneficiaries/[id]/page.tsx
- normalizeBarangayName
- ref_node_assert
- Reusable QR slots and per-program scan history
- layout.tsx
- restrictions/import/route.ts
- test-template-parser.mjs
- test-offline-sync-resilience.mjs
- test-dole-reports-browser.mjs
- @supabase/supabase-js
- test-dole-reports.mjs
- format1-stub-base-b64.ts
- Bagong Pilipinas transparent footer asset
- update-522-sitios.mjs
- cleanup-and-deduplicate.js
- identity-profiles.ts
- login/page.tsx
- auth.ts
- test-navbar-landing-link-browser.mjs
- check-sep20-evening.mjs
- heal-qr-codes.mjs
- sync-all-password-hashes.mjs
- Q: ayusin mo yung sa driver`s license kasi halos walang nababasa
- test-landing-scanner.mjs
- test-public-inquiry.mjs
- cleanup-test-users.mjs
- detailed-consolidated-retrieval.mjs
- check-reference-slots.js
- test-sorting-and-templates.mjs
- inspect-all-sitios.mjs
- list-users-by-role.mjs
- my-assignment/inquiry/page.tsx
- test-attendance-3hours.mjs
- test-dedicated-qr-retention.mjs
- test-password-view.mjs
- test-stub-distribution-monitoring.mjs

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

## Communities (123 total, 29 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.09
Nodes (22): name, private, version, autoprefixer, clsx, dexie, dexie-react-hooks, @hookform/resolvers (+14 more)

### Community 1 - "next"
Cohesion: 0.07
Nodes (18): next, dynamic, GET(), dynamic, GET(), dynamic, dynamic, dynamic (+10 more)

### Community 2 - "dexie.ts"
Cohesion: 0.12
Nodes (30): SyncCenterPage(), OfflineContext, OfflineContextType, OfflineProvider(), CachedBeneficiary, CachedProgram, CachedWorkDay, CachedWorkProgramItem (+22 more)

### Community 3 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, autoprefixer, bcryptjs, clsx, date-fns, dexie, dexie-react-hooks, exceljs (+33 more)

### Community 4 - "test-accomplishment-work-schedule.mjs"
Cohesion: 0.05
Nodes (37): book, { buildBarangayCompletionDays }, cache, chunks, db, doleBook, downloaded, ExcelJS (+29 more)

### Community 5 - "getCurrentUser"
Cohesion: 0.07
Nodes (41): dynamic, getVal(), POST(), PATCH(), dynamic, POST(), dynamic, POST() (+33 more)

### Community 6 - "dingalan-groupings.ts"
Cohesion: 0.26
Nodes (18): DEFAULT_10_DAY_ACTIVITIES, dynamic, POST(), FieldWorkProgramPage(), WorkProgramManagementPage(), DeploymentGroupingMatrix(), DeploymentGroupingMatrixProps, BarangayGroupingConfig (+10 more)

### Community 7 - "ApplicationForm.tsx"
Cohesion: 0.17
Nodes (17): WalkInEncodingPage(), OnlineTupadApplicationPage(), ApplicationForm(), ApplicationFormProps, DocumentField, FormErrors, MultiChoice(), Section() (+9 more)

### Community 8 - "stubs/page.tsx"
Cohesion: 0.21
Nodes (15): PrintTemplateMode, StubsContent(), StubsDesignerPage(), ETUPAD_BASE_IMAGE, ETupadCard, ETupadCardProps, Format1Stub, Format1StubProps (+7 more)

### Community 9 - "stub-distribution/page.tsx"
Cohesion: 0.17
Nodes (33): DailyAttendancePage(), OrientationContent(), OrientationPage(), PayoutScannerPage(), photosMemoryCache, PhotosPage(), StubDistributionContent(), StubDistributionPage() (+25 more)

### Community 10 - "application-service.ts"
Cohesion: 0.14
Nodes (21): dynamic, POST(), dynamic, POST(), applicationDraftSchema, applicationFinalSchema, DOCUMENT_FIELDS, formatApplicantFullName() (+13 more)

### Community 11 - "MasterlistUploadModal.tsx"
Cohesion: 0.19
Nodes (15): ExcelImportPage(), DEFAULT_EXEMPTION_REASONS, MasterlistUploadModal(), MasterlistUploadModalProps, displayDate(), RosterRestrictionDetails(), cleanStr(), ImportPreviewResult (+7 more)

### Community 12 - "test-application-workflow.mjs"
Cohesion: 0.08
Nodes (23): audits, cache, countQueries, deleted, detail, docs, encode, fakePrisma (+15 more)

### Community 13 - "completion-report-template.ts"
Cohesion: 0.13
Nodes (28): AttendanceActivity, buildBarangayCompletionDays(), cleanActivity(), completionBarangay(), CompletionDay, CompletionProgram, key(), PhotoActivity (+20 more)

### Community 14 - "react"
Cohesion: 0.10
Nodes (24): lucide-react, react, AuditLogsPage(), DINGALAN_BARANGAYS, UserManagementPage(), metadata, PublicInquiryPage(), ProgramDetailsHub() (+16 more)

### Community 15 - "v1/beneficiaries/import/commit/route.ts"
Cohesion: 0.20
Nodes (17): dynamic, ImportConflict, maxDuration, POST(), dynamic, maxDuration, POST(), saveImportedReportRows() (+9 more)

### Community 16 - "identity-address.ts"
Cohesion: 0.34
Nodes (14): addressLike(), addressPiece(), addressStart(), barangayPattern(), escape(), IdentityAddress, nearBarangay(), normalize() (+6 more)

### Community 17 - "application-id-mapper.ts"
Cohesion: 0.26
Nodes (21): birthDateValue(), clean(), cleanLocalValue(), cleanPersonName(), explicitLabel(), fieldValue(), identityValue(), isIdentityLabel() (+13 more)

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
Nodes (16): @prisma/client, prisma, flaggedReference, prisma, { PrismaClient }, prisma, prisma, { PrismaClient } (+8 more)

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
Cohesion: 0.18
Nodes (24): tesseract.js, normalizeIdLighting(), detectIdentityDocumentType(), active(), canvas(), context(), crop(), enhance() (+16 more)

### Community 37 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 38 - "prisma.ts"
Cohesion: 0.09
Nodes (40): date-fns, dynamic, GET(), dynamic, POST(), dynamic, GET(), dynamic (+32 more)

### Community 39 - "ref_crypto"
Cohesion: 0.16
Nodes (10): jsqr, pdfjs-dist, prisma, DINGALAN_BARANGAYS, main(), MONTH_NAME_MAP, normalizeBarangayName(), normalizeSitioName() (+2 more)

### Community 40 - "master-sync-all-data.js"
Cohesion: 0.36
Nodes (7): chunkArray(), fs, main(), path, { PrismaClient }, toBool(), toDate()

### Community 41 - "prepare-dole-template.mjs"
Cohesion: 0.11
Nodes (15): jszip, cache, load(), original, output, require, review, root (+7 more)

### Community 42 - "v1/applications/route.ts"
Cohesion: 0.15
Nodes (16): dynamic, GET(), dynamic, POST(), details, dynamic, GET(), PATCH() (+8 more)

### Community 43 - "TUPAD application ID autofill and walk-in encoding"
Cohesion: 0.22
Nodes (8): Database migration, Local ID reading (default; no Azure key required), Number recovery and optional close-up, Optional Azure API, Required private storage configuration, TUPAD application ID autofill and walk-in encoding, Verification, What is implemented

### Community 44 - "isAdminUser"
Cohesion: 0.09
Nodes (27): DELETE(), dynamic, PATCH(), dynamic, GET(), dynamic, GET(), POST() (+19 more)

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
Cohesion: 0.08
Nodes (40): AdminApplicationsPage(), AdminInquiriesPage(), FIELD_OPERATIONS, FieldScannerHubContent(), FieldScannerHubPage(), BalikPinasElporPortalPage(), DINGALAN_BARANGAYS, SupplyItem (+32 more)

### Community 50 - "effects/TextCubeLoader.tsx"
Cohesion: 0.43
Nodes (3): Loading(), TextCubeLoader(), TextCubeLoaderProps

### Community 51 - "vercel.json"
Cohesion: 0.25
Nodes (7): buildCommand, framework, functions, src/app/api/**/*, $schema, includeFiles, maxDuration

### Community 52 - "qr-pass/route.ts"
Cohesion: 0.19
Nodes (16): dynamic, GET(), handleQrPassSearch(), POST(), dynamic, maxDuration, POST(), formatBeneficiaryQrPayload() (+8 more)

### Community 53 - "flag-replacement/route.ts"
Cohesion: 0.14
Nodes (19): dynamic, POST(), dynamic, GET(), PATCH(), POST(), dynamic, POST() (+11 more)

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

### Community 58 - "test-suite.mjs"
Cohesion: 0.22
Nodes (6): exceljs, dynamic, generateBeneficiaryToken(), prisma, runTests(), verifyTokenHash()

### Community 59 - "test-program-qr-postgres.mjs"
Cohesion: 0.12
Nodes (14): cacheRoot, dataDir, listener, load(), { PrismaClient }, require, root, cacheRoot (+6 more)

### Community 60 - "reseed-exact-522-beneficiaries.mjs"
Cohesion: 0.36
Nodes (7): DINGALAN_BARANGAYS, formatBday(), main(), normalizeBarangayName(), normalizeSitioName(), prisma, rawData

### Community 61 - "Stitch Design System & UI Screen Guide"
Cohesion: 0.40
Nodes (4): 1. How to Access and Edit in Stitch, 2. Included Local Artifacts, 3. How to Upload a Modified `DESIGN.md` to Stitch in the Future, Stitch Design System & UI Screen Guide

### Community 62 - "application-schema.ts"
Cohesion: 0.13
Nodes (13): zod, APPLICATION_SOURCES, BENEFICIARY_TYPES, CIVIL_STATUS_OPTIONS, EMPLOYMENT_INTEREST_OPTIONS, OCCUPATION_OPTIONS, optionalContact, optionalDate (+5 more)

### Community 63 - "export/route.ts"
Cohesion: 0.31
Nodes (12): prisma, testExport(), dynamic, GET(), maxDuration, generateAccomplishmentExcel(), generateAttendanceExcel(), generateFlaggedReplacementsExcel() (+4 more)

### Community 64 - "Guided ID camera"
Cohesion: 0.40
Nodes (4): Browser/privacy requirements, Capture flow, Guided ID camera, Verification

### Community 65 - "application-storage.ts"
Cohesion: 0.31
Nodes (9): ACCEPTED_APPLICATION_FILE_TYPES, MAX_APPLICATION_FILE_SIZE, APPLICATION_DOCUMENT_BUCKET, downloadApplicationDocument(), ensurePrivateBucket(), extensionFor(), getPrivateStorageClient(), removeApplicationDocuments() (+1 more)

### Community 67 - "work-program-parser.ts"
Cohesion: 0.14
Nodes (12): xlsx, dynamic, dynamic, DINGALAN_BARANGAYS, normalizeBarangay(), ParsedBarangayWorkProgram, ParsedWorkProgramItem, parseWorkProgramBuffer() (+4 more)

### Community 68 - "Online and walk-in application intake"
Cohesion: 0.33
Nodes (5): Admin review, Database and private storage, Online and walk-in application intake, Pages and roles, Verification

### Community 69 - "test-service-worker-cache.mjs"
Cohesion: 0.05
Nodes (26): typescript, ExcelJS, fixture, programs, require, exported, card, module (+18 more)

### Community 70 - "update-flagged-beneficiaries.js"
Cohesion: 0.40
Nodes (3): flaggedReference, prisma, { PrismaClient }

### Community 71 - "IdUploadPanel.tsx"
Cohesion: 0.33
Nodes (9): FieldProps, FilePreview(), IdUploadPanel(), IdUploadPanelProps, OcrResponse, ApplicationFormValues, isAcceptedApplicationFile(), OcrAutofillStatus (+1 more)

### Community 72 - "ocr/route.ts"
Cohesion: 0.20
Nodes (13): dynamic, isRateLimited(), maxDuration, POST(), providerMessage(), rateLimit, mergeOcrSides(), OcrSubject (+5 more)

### Community 73 - "hasPermission"
Cohesion: 0.10
Nodes (22): dynamic, POST(), DELETE(), generateElporControlNo(), GET(), PATCH(), POST(), DELETE() (+14 more)

### Community 75 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, npm

### Community 76 - "local-id-reader.ts"
Cohesion: 0.14
Nodes (23): extractPhilSysNumber(), MappedOcrSide, MergedOcrResult, NON_BIRTH_DATE_LABEL, OcrTextLine, ORDERED_NAME_LABEL, extractProfileNumber(), identityNumberRows() (+15 more)

### Community 78 - "test-local-ocr-browser.mjs"
Cohesion: 0.40
Nodes (3): jspdf, qrcode, require

### Community 79 - "test-masterlist-import-postgres.mjs"
Cohesion: 0.24
Nodes (8): cacheRoot, dataDir, get(), listener, load(), { PrismaClient }, require, root

### Community 80 - "beneficiaries/[id]/page.tsx"
Cohesion: 0.33
Nodes (6): BeneficiaryProfilePage(), dynamic, DeleteBeneficiaryModal(), DeleteBeneficiaryModalProps, EditBeneficiaryButton(), EditBeneficiaryButtonProps

### Community 81 - "normalizeBarangayName"
Cohesion: 0.15
Nodes (20): main(), prisma, BeneficiariesMasterlistContent(), loadData(), BeneficiariesMasterlistPage(), BarangaySummary, BeneficiarySummaryDropdown(), BeneficiarySummaryDropdownProps (+12 more)

### Community 82 - "ref_node_assert"
Cohesion: 0.05
Nodes (33): errors, fixture, record, requests, require, errors, require, login() (+25 more)

### Community 83 - "Reusable QR slots and per-program scan history"
Cohesion: 0.40
Nodes (4): More than 522 beneficiaries, Offline devices, Program-owned QR codes and scan history, Verification

### Community 84 - "layout.tsx"
Cohesion: 0.31
Nodes (5): metadata, RootLayout(), viewport, ServiceWorkerRegister(), AuthProvider()

### Community 85 - "restrictions/import/route.ts"
Cohesion: 0.39
Nodes (7): addDaysToDate(), checkIsAppointive(), dynamic, maxDuration, parseDateToISO(), parseNameParts(), POST()

### Community 86 - "test-template-parser.mjs"
Cohesion: 0.38
Nodes (6): DINGALAN_BARANGAYS, MONTH_NAME_MAP, normalizeBarangayName(), parseBeneficiaryExcelBuffer(), prisma, run()

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
Cohesion: 0.29
Nodes (5): ID_TYPES, genericNumbers, IdentityDocumentType, IdentityProfile, PROFILES

### Community 103 - "login/page.tsx"
Cohesion: 0.40
Nodes (5): buildPresetRoleGroups(), DEFAULT_ROLE_GROUPS, LoginPage(), PresetAccount, PresetRoleGroup

### Community 104 - "auth.ts"
Cohesion: 0.12
Nodes (19): bcryptjs, dynamic, POST(), dynamic, GET(), dynamic, generateTrackingCode(), POST() (+11 more)

### Community 105 - "test-navbar-landing-link-browser.mjs"
Cohesion: 0.33
Nodes (5): errors, expectedLabels, mutations, require, roles

### Community 109 - "Q: ayusin mo yung sa driver`s license kasi halos walang nababasa"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ayusin mo yung sa driver`s license kasi halos walang nababasa, Source Nodes

### Community 114 - "check-reference-slots.js"
Cohesion: 0.40
Nodes (3): prisma, { PrismaClient }, referenceSlots

### Community 118 - "my-assignment/inquiry/page.tsx"
Cohesion: 0.60
Nodes (3): metadata, WorkAreaAssignmentInquiryPage(), PublicWorkAssignmentLookupCard()

## Knowledge Gaps
- **14 isolated node(s):** `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs`, `@types/jsonwebtoken`, `@types/jszip` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 869 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `@prisma/client` to `package.json`, `application-service.ts`, `v1/beneficiaries/import/commit/route.ts`, `v1/beneficiaries/import/commit/route.ts`, `ref_path`, `inspect-all-sources.js`, `seed.js`, `ref_fs`, `prisma.ts`, `ref_crypto`, `master-sync-all-data.js`, `v1/applications/route.ts`, `migrate-user-plain-password.js`, `test-suite.mjs`, `test-program-qr-postgres.mjs`, `reseed-exact-522-beneficiaries.mjs`, `export/route.ts`, `inspect-flagged.js`, `work-program-parser.ts`, `update-flagged-beneficiaries.js`, `inspect-program-details.mjs`, `test-masterlist-import-postgres.mjs`, `normalizeBarangayName`, `test-template-parser.mjs`, `test-offline-sync-resilience.mjs`, `@supabase/supabase-js`, `update-522-sitios.mjs`, `cleanup-and-deduplicate.js`, `check-sep20-evening.mjs`, `heal-qr-codes.mjs`, `sync-all-password-hashes.mjs`, `test-landing-scanner.mjs`, `test-public-inquiry.mjs`, `cleanup-test-users.mjs`, `detailed-consolidated-retrieval.mjs`, `check-reference-slots.js`, `test-sorting-and-templates.mjs`, `inspect-all-sitios.mjs`, `list-users-by-role.mjs`, `test-dedicated-qr-retention.mjs`, `test-password-view.mjs`, `test-stub-distribution-monitoring.mjs`?**
  _High betweenness centrality (0.207) - this node is a cross-community bridge._
- **What connects `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `package.json`, `getCurrentUser`, `dingalan-groupings.ts`, `stubs/page.tsx`, `stub-distribution/page.tsx`, `application-service.ts`, `MasterlistUploadModal.tsx`, `react`, `v1/beneficiaries/import/commit/route.ts`, `v1/beneficiaries/import/commit/route.ts`, `matrix/page.tsx`, `prisma.ts`, `v1/applications/route.ts`, `isAdminUser`, `middleware.ts`, `restrictions/route.ts`, `FieldQrPassGeneratorCard.tsx`, `qr-pass/route.ts`, `flag-replacement/route.ts`, `app/page.tsx`, `replacements/page.tsx`, `test-suite.mjs`, `export/route.ts`, `work-program-parser.ts`, `ocr/route.ts`, `hasPermission`, `beneficiaries/[id]/page.tsx`, `normalizeBarangayName`, `layout.tsx`, `restrictions/import/route.ts`, `login/page.tsx`, `auth.ts`, `my-assignment/inquiry/page.tsx`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **Should `next` be split into smaller, more focused modules?**
  _Cohesion score 0.07226890756302522 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `package.json`, `dexie.ts`, `dingalan-groupings.ts`, `ApplicationForm.tsx`, `stubs/page.tsx`, `stub-distribution/page.tsx`, `MasterlistUploadModal.tsx`, `v1/beneficiaries/import/commit/route.ts`, `matrix/page.tsx`, `test-roster-restriction-preview.mjs`, `ApplicationInbox.tsx`, `isAdminUser`, `ApplicationInbox.tsx`, `FieldQrPassGeneratorCard.tsx`, `effects/TextCubeLoader.tsx`, `app/page.tsx`, `replacements/page.tsx`, `IdUploadPanel.tsx`, `beneficiaries/[id]/page.tsx`, `normalizeBarangayName`, `layout.tsx`, `login/page.tsx`, `my-assignment/inquiry/page.tsx`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Should `dexie.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._