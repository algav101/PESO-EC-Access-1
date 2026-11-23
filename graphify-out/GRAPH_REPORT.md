# Graph Report - PESO-EC-Access-1  (2026-11-23)

## Corpus Check
- 401 files · ~1,475,266 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 33 file(s) not represented in the graph (top: .csv 26, .css 2, .example 1)

## Summary
- 2039 nodes · 5153 edges · 119 communities (92 shown, 27 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6fc99696`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- excel-importer.ts
- program-work-days.ts
- dependencies
- test-accomplishment-work-schedule.mjs
- hasPermission
- replacements/page.tsx
- application-schema.ts
- stubs/page.tsx
- dexie.ts
- application-service.ts
- test-program-work-date-browser.mjs
- test-application-workflow.mjs
- completion-report-template.ts
- getCurrentUser
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
- logAudit
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
- react
- Reports: supplied DOLE 2026 workbook
- app/page.tsx
- migrate-user-plain-password.js
- login/page.tsx
- test-auto-qr-browser.mjs
- test-program-qr-postgres.mjs
- AccomplishmentReportBuilderModal.tsx
- Stitch Design System & UI Screen Guide
- local-id-reader.ts
- ref_node_fs
- Guided ID camera
- replacement-eligibility.ts
- inspect-flagged.js
- work-program-parser.ts
- Online and walk-in application intake
- v1/applications/route.ts
- update-flagged-beneficiaries.js
- test-application-inbox-browser.mjs
- inspect-db.js
- reseed-exact-522-beneficiaries.mjs
- test-program-qr-browser.mjs
- engines
- ref_node_module
- tailwindcss
- test-local-ocr-browser.mjs
- inspect-db.mjs
- check-reference-slots.js
- beneficiaries/page.tsx
- ref_node_assert
- Reusable QR slots and per-program scan history
- sync-disqualified-entry.mjs
- restrictions/import/route.ts
- test-offline-sync-resilience.mjs
- ProgramBeneficiary_active_program_slot_key
- test-masterlist-import-errors-browser.mjs
- @supabase/supabase-js
- test-dole-reports.mjs
- format1-stub-base-b64.ts
- Bagong Pilipinas transparent footer asset
- dashboard/page.tsx
- test-navbar-landing-link-browser.mjs
- test-public-inquiry.mjs
- export-pg-to-files.js
- next
- auth.ts
- test-roster-restriction-browser.mjs
- test-accomplishment-export-browser.mjs
- stubs/route.ts
- Q: ayusin mo yung sa driver`s license kasi halos walang nababasa
- check-sep20-evening.mjs
- cleanup-and-deduplicate.js
- inspect-program-details.mjs
- inspect-sep21-data.mjs
- check-demographics.mjs
- test-program-crud.mjs
- test-matrix-and-sync.mjs
- test-sorting-and-templates.mjs
- extract-and-sync-522-qrs.mjs

## God Nodes (most connected - your core abstractions)
1. `getCurrentUser()` - 166 edges
2. `hasPermission()` - 119 edges
3. `isAdminUser()` - 118 edges
4. `next` - 117 edges
5. `react` - 87 edges
6. `logAudit()` - 85 edges
7. `lucide-react` - 77 edges
8. `prisma` - 76 edges
9. `useAuth()` - 71 edges
10. `normalizeBarangayName()` - 69 edges

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

## Communities (119 total, 27 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.09
Nodes (22): name, private, version, autoprefixer, clsx, dexie, dexie-react-hooks, @hookform/resolvers (+14 more)

### Community 1 - "excel-importer.ts"
Cohesion: 0.19
Nodes (14): ExcelImportPage(), DEFAULT_EXEMPTION_REASONS, MasterlistUploadModalProps, displayDate(), RosterRestrictionDetails(), cleanStr(), ImportPreviewResult, MONTH_NAME_MAP (+6 more)

### Community 2 - "program-work-days.ts"
Cohesion: 0.50
Nodes (5): PATCH(), reconcileAttendanceScheduleDates(), buildProgramWorkDays(), ProgramScheduleError, rescheduleProgramWorkDays()

### Community 3 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, autoprefixer, bcryptjs, clsx, date-fns, dexie, dexie-react-hooks, exceljs (+33 more)

### Community 4 - "test-accomplishment-work-schedule.mjs"
Cohesion: 0.05
Nodes (37): book, { buildBarangayCompletionDays }, cache, chunks, db, doleBook, downloaded, ExcelJS (+29 more)

### Community 5 - "hasPermission"
Cohesion: 0.10
Nodes (34): DELETE(), dynamic, PATCH(), dynamic, GET(), dynamic, getVal(), POST() (+26 more)

### Community 6 - "replacements/page.tsx"
Cohesion: 0.27
Nodes (10): ReplacementsContent(), ReplacementsPage(), ReportCenterPage(), DOC_LABELS, PendingReplacementAssessmentItem, Props, ReplacementApprovalModal(), DoleReportsPanel() (+2 more)

### Community 7 - "application-schema.ts"
Cohesion: 0.07
Nodes (42): OnlineTupadApplicationPage(), ApplicationForm(), ApplicationFormProps, DocumentField, FieldProps, FormErrors, MultiChoice(), Section() (+34 more)

### Community 8 - "stubs/page.tsx"
Cohesion: 0.17
Nodes (17): PrintTemplateMode, StubsContent(), StubsDesignerPage(), ETUPAD_BASE_IMAGE, ETupadCard, ETupadCardProps, Format1Stub, Format1StubProps (+9 more)

### Community 9 - "dexie.ts"
Cohesion: 0.07
Nodes (76): date-fns, runTests(), validateDuration(), loadData(), DailyAttendancePage(), OrientationContent(), OrientationPage(), PayoutScannerPage() (+68 more)

### Community 10 - "application-service.ts"
Cohesion: 0.07
Nodes (41): dynamic, GET(), dynamic, POST(), dynamic, POST(), dynamic, POST() (+33 more)

### Community 11 - "test-program-work-date-browser.mjs"
Cohesion: 0.25
Nodes (4): errors, newDates, oldDates, require

### Community 12 - "test-application-workflow.mjs"
Cohesion: 0.08
Nodes (23): audits, cache, countQueries, deleted, detail, docs, encode, fakePrisma (+15 more)

### Community 13 - "completion-report-template.ts"
Cohesion: 0.08
Nodes (51): prisma, testExport(), dynamic, GET(), maxDuration, AttendanceActivity, buildBarangayCompletionDays(), cleanActivity() (+43 more)

### Community 14 - "getCurrentUser"
Cohesion: 0.09
Nodes (27): dynamic, GET(), POST(), DELETE(), dynamic, GET(), PATCH(), dynamic (+19 more)

### Community 15 - "dingalan-groupings.ts"
Cohesion: 0.26
Nodes (18): DEFAULT_10_DAY_ACTIVITIES, dynamic, POST(), FieldWorkProgramPage(), WorkProgramManagementPage(), DeploymentGroupingMatrix(), DeploymentGroupingMatrixProps, BarangayGroupingConfig (+10 more)

### Community 16 - "identity-address.ts"
Cohesion: 0.28
Nodes (16): ADDRESS_LABEL, ADDRESS_STOP, addressLike(), addressPiece(), addressStart(), barangayPattern(), escape(), IdentityAddress (+8 more)

### Community 17 - "application-id-mapper.ts"
Cohesion: 0.24
Nodes (23): calculateAge(), birthDateValue(), clean(), cleanLocalValue(), cleanPersonName(), detectIdentityDocumentType(), explicitLabel(), fieldValue() (+15 more)

### Community 18 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, dev, lint, postinstall, prepare:ocr, prisma:generate, prisma:push (+9 more)

### Community 19 - "start-localhost.mjs"
Cohesion: 0.14
Nodes (9): core, output, require, root, output, pdfjs, program, require (+1 more)

### Community 20 - "test-local-id-reader.mjs"
Cohesion: 0.05
Nodes (37): run(), nationalNumberCrops(), addressCrop, addressLines, addressOf(), backStatusRegions, birthCrop, certificate (+29 more)

### Community 21 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx (+12 more)

### Community 22 - "v1/beneficiaries/import/commit/route.ts"
Cohesion: 0.11
Nodes (42): dynamic, GET(), dynamic, GET(), maxDuration, POST(), canUseDoleReports(), DOLE_REPORT_SHEETS (+34 more)

### Community 23 - "ApplicationInbox.tsx"
Cohesion: 0.29
Nodes (8): OnlineApplicationsPage(), WalkInSubmissionsPage(), ApplicationInbox(), ApplicationRecord, dateText(), InboxData, sections, valueText()

### Community 24 - "test-application-id-autofill.mjs"
Cohesion: 0.08
Nodes (29): dynamic, isRateLimited(), maxDuration, POST(), providerMessage(), rateLimit, applicationFinalSchema, isAcceptedApplicationFile() (+21 more)

### Community 25 - "ref_path"
Cohesion: 0.10
Nodes (8): __dirname, nextConfig, prisma, prisma, fs, path, { PrismaClient }, prisma

### Community 26 - "Layout & Components"
Cohesion: 0.14
Nodes (13): 1. DICT GWT Utility Header, 2. Official Municipal Masthead, 3. Hero Citizen Announcement Card, 4. Telemetry Metric Strip, 5. Public Status Inquiry Module (`#inquiry`), 6. Work Area Assignment Lookup (`#work-assignment`), 7. Direct Feedback Desk (`#inquiry-form`), 8. DICT Standard GWT Footer (+5 more)

### Community 27 - "@prisma/client"
Cohesion: 0.04
Nodes (18): @prisma/client, prisma, prisma, flaggedReference, prisma, { PrismaClient }, prisma, prisma (+10 more)

### Community 28 - "logAudit"
Cohesion: 0.10
Nodes (24): dynamic, POST(), DELETE(), dynamic, PATCH(), POST(), dynamic, POST() (+16 more)

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
Cohesion: 0.23
Nodes (13): DINGALAN_BARANGAYS, UserManagementPage(), ProgramDetailsHub(), ProgramsPage(), StatusBadge(), StatusBadgeProps, DeleteProgramModal(), DeleteProgramModalProps (+5 more)

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
Nodes (29): tesseract.js, normalizeIdLighting(), OcrSubject, active(), canvas(), context(), crop(), enhance() (+21 more)

### Community 37 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 38 - "prisma.ts"
Cohesion: 0.14
Nodes (25): dynamic, POST(), dynamic, GET(), dynamic, POST(), dynamic, POST() (+17 more)

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
Cohesion: 0.26
Nodes (9): BulkAttendanceError, dynamic, POST(), ATTENDANCE_FIELDS, AttendanceSlot, Row, writeAttendanceSlot(), getMasterlistAttendanceRange() (+1 more)

### Community 46 - "ApplicationInbox.tsx"
Cohesion: 0.11
Nodes (31): cameraError(), IdCameraCapture(), Props, CapturedIdPayload, CaptureSlotKey, compressFileToPayload(), formatMmDdYyyyInput(), ORIGINAL_TO_REPLACEMENT_RELATIONSHIPS (+23 more)

### Community 47 - "migration.sql"
Cohesion: 0.33
Nodes (8): "TupadApplicationDocument", TupadApplicationDocument_applicationId_fieldName_idx, TupadApplicationDocument_uploadedById_idx, TupadApplicationRoster_applicationCode_key, TupadApplicationRoster_encodedById_idx, TupadApplicationRoster_idempotencyKey_key, TupadApplicationRoster_source_submissionStatus_idx, TupadApplicationRoster_submittedAt_idx

### Community 48 - "restrictions/route.ts"
Cohesion: 0.38
Nodes (6): DELETE(), dynamic, GET(), maskFullName(), parsePayoutDateToTimestamp(), POST()

### Community 49 - "useAuth"
Cohesion: 0.07
Nodes (42): html2canvas, AdminApplicationsPage(), AuditLogsPage(), AdminInquiriesPage(), FIELD_OPERATIONS, FieldScannerHubContent(), FieldScannerHubPage(), BalikPinasElporPortalPage() (+34 more)

### Community 50 - "effects/TextCubeLoader.tsx"
Cohesion: 0.43
Nodes (3): Loading(), TextCubeLoader(), TextCubeLoaderProps

### Community 51 - "vercel.json"
Cohesion: 0.25
Nodes (7): buildCommand, framework, functions, src/app/api/**/*, $schema, includeFiles, maxDuration

### Community 52 - "v1/beneficiaries/import/commit/route.ts"
Cohesion: 0.06
Nodes (56): exceljs, dynamic, ImportConflict, maxDuration, POST(), dynamic, GET(), handleQrPassSearch() (+48 more)

### Community 53 - "react"
Cohesion: 0.13
Nodes (14): lucide-react, react, metadata, PublicInquiryPage(), BeneficiaryProfilePage(), dynamic, AssignmentContent(), MyAssignmentPage() (+6 more)

### Community 54 - "Reports: supplied DOLE 2026 workbook"
Cohesion: 0.33
Nodes (5): Preservation and source handling, Program isolation and persistence, Reports: supplied DOLE 2026 workbook, User workflow, Verification

### Community 55 - "app/page.tsx"
Cohesion: 0.13
Nodes (19): dynamic, LandingPage(), LandingNavDrawer(), NavDrawerCategory, NavDrawerItem, FacebookUpdatesSection(), PesoOrganizationalChart(), PEOPLE (+11 more)

### Community 56 - "migrate-user-plain-password.js"
Cohesion: 0.50
Nodes (4): getPresetPassword(), main(), prisma, { PrismaClient }

### Community 57 - "login/page.tsx"
Cohesion: 0.40
Nodes (5): buildPresetRoleGroups(), DEFAULT_ROLE_GROUPS, LoginPage(), PresetAccount, PresetRoleGroup

### Community 58 - "test-auto-qr-browser.mjs"
Cohesion: 0.33
Nodes (6): calls, errors, programs, require, scan(), tokens

### Community 59 - "test-program-qr-postgres.mjs"
Cohesion: 0.11
Nodes (15): cacheRoot, dataDir, get(), listener, load(), { PrismaClient }, require, root (+7 more)

### Community 60 - "AccomplishmentReportBuilderModal.tsx"
Cohesion: 0.14
Nodes (24): AccomplishmentExcelPreviewEditor(), buildDefaultSlotCaption(), cleanAccomplishmentDayText(), PreviewBarangayDoc, PreviewDayRow, PreviewLayoutConfig, PreviewPhotoItem, PreviewSelectedSlot (+16 more)

### Community 61 - "Stitch Design System & UI Screen Guide"
Cohesion: 0.40
Nodes (4): 1. How to Access and Edit in Stitch, 2. Included Local Artifacts, 3. How to Upload a Modified `DESIGN.md` to Stitch in the Future, Stitch Design System & UI Screen Guide

### Community 62 - "local-id-reader.ts"
Cohesion: 0.20
Nodes (16): extractPhilSysNumber(), MappedOcrSide, MergedOcrResult, NON_BIRTH_DATE_LABEL, OcrTextLine, ORDERED_NAME_LABEL, extractProfileNumber(), identityNumberRows() (+8 more)

### Community 63 - "ref_node_fs"
Cohesion: 0.05
Nodes (26): typescript, errors, files, programs, require, saved, writes, exported (+18 more)

### Community 64 - "Guided ID camera"
Cohesion: 0.40
Nodes (4): Browser/privacy requirements, Capture flow, Guided ID camera, Verification

### Community 65 - "replacement-eligibility.ts"
Cohesion: 0.24
Nodes (12): dynamic, POST(), dynamic, POST(), evaluatePersonTupadEligibility(), normalizeBirthdayComparison(), ParsedPersonName, parseEnteredFullName() (+4 more)

### Community 67 - "work-program-parser.ts"
Cohesion: 0.09
Nodes (20): xlsx, dynamic, dynamic, POST(), dynamic, DINGALAN_BARANGAYS, normalizeBarangay(), ParsedBarangayWorkProgram (+12 more)

### Community 68 - "Online and walk-in application intake"
Cohesion: 0.33
Nodes (5): Admin review, Database and private storage, Online and walk-in application intake, Pages and roles, Verification

### Community 69 - "v1/applications/route.ts"
Cohesion: 0.25
Nodes (9): details, dynamic, GET(), PATCH(), DELETE(), dynamic, GET(), isIntakeSource() (+1 more)

### Community 70 - "update-flagged-beneficiaries.js"
Cohesion: 0.40
Nodes (3): flaggedReference, prisma, { PrismaClient }

### Community 71 - "test-application-inbox-browser.mjs"
Cohesion: 0.14
Nodes (9): errors, fixture, record, requests, require, calls, errors, program (+1 more)

### Community 73 - "reseed-exact-522-beneficiaries.mjs"
Cohesion: 0.36
Nodes (7): DINGALAN_BARANGAYS, formatBday(), main(), normalizeBarangayName(), normalizeSitioName(), prisma, rawData

### Community 74 - "test-program-qr-browser.mjs"
Cohesion: 0.29
Nodes (5): calls, errors, programs, require, roster

### Community 75 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, npm

### Community 76 - "ref_node_module"
Cohesion: 0.07
Nodes (19): calls, days, errors, otherProgram, program, require, roster, errors (+11 more)

### Community 78 - "test-local-ocr-browser.mjs"
Cohesion: 0.40
Nodes (3): jspdf, qrcode, require

### Community 80 - "check-reference-slots.js"
Cohesion: 0.40
Nodes (3): prisma, { PrismaClient }, referenceSlots

### Community 81 - "beneficiaries/page.tsx"
Cohesion: 0.09
Nodes (36): main(), prisma, AttendanceMatrixContent(), AttendanceMatrixPage(), BeneficiariesMasterlistContent(), BeneficiariesMasterlistPage(), RestrictionsPage(), AdminStubOverrideModal() (+28 more)

### Community 82 - "ref_node_assert"
Cohesion: 0.11
Nodes (13): assertTimeInRange(), testBulkAttendance(), login(), run(), cacheRoot, dataDir, listener, load() (+5 more)

### Community 83 - "Reusable QR slots and per-program scan history"
Cohesion: 0.29
Nodes (6): Active masterlist uniqueness, More than 522 beneficiaries, Offline devices, Program-owned QR codes and scan history, Reusing an existing physical card, Verification

### Community 85 - "restrictions/import/route.ts"
Cohesion: 0.39
Nodes (7): addDaysToDate(), checkIsAppointive(), dynamic, maxDuration, parseDateToISO(), parseNameParts(), POST()

### Community 88 - "test-masterlist-import-errors-browser.mjs"
Cohesion: 0.33
Nodes (5): alerts, pageErrors, preview, require, rows

### Community 89 - "@supabase/supabase-js"
Cohesion: 0.33
Nodes (3): @supabase/supabase-js, supabase, supabaseAdmin

### Community 90 - "test-dole-reports.mjs"
Cohesion: 0.08
Nodes (21): IS_LOCAL_DEVELOPMENT, PRECACHE_ASSETS, api, base, cache, config, data, db (+13 more)

### Community 99 - "dashboard/page.tsx"
Cohesion: 0.50
Nodes (4): DashboardData, DashboardPage(), dynamic, getDashboardMetrics()

### Community 100 - "test-navbar-landing-link-browser.mjs"
Cohesion: 0.33
Nodes (5): errors, expectedLabels, mutations, require, roles

### Community 103 - "export-pg-to-files.js"
Cohesion: 0.40
Nodes (3): fs, path, { PrismaClient }

### Community 104 - "next"
Cohesion: 0.06
Nodes (33): next, dynamic, GET(), dynamic, dynamic, POST(), dynamic, POST() (+25 more)

### Community 105 - "auth.ts"
Cohesion: 0.12
Nodes (19): bcryptjs, dynamic, POST(), dynamic, GET(), dynamic, generateTrackingCode(), POST() (+11 more)

### Community 106 - "test-roster-restriction-browser.mjs"
Cohesion: 0.29
Nodes (6): baseRow, errors, preview, program, require, rows

### Community 107 - "test-accomplishment-export-browser.mjs"
Cohesion: 0.40
Nodes (4): ExcelJS, fixture, programs, require

### Community 109 - "Q: ayusin mo yung sa driver`s license kasi halos walang nababasa"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ayusin mo yung sa driver`s license kasi halos walang nababasa, Source Nodes

### Community 118 - "extract-and-sync-522-qrs.mjs"
Cohesion: 0.13
Nodes (11): jsqr, pdfjs-dist, prisma, DINGALAN_BARANGAYS, main(), normalizeBarangayName(), normalizeSitioName(), prisma (+3 more)

## Knowledge Gaps
- **14 isolated node(s):** `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs`, `@types/jsonwebtoken`, `@types/jszip` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 920 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `@prisma/client` to `package.json`, `program-work-days.ts`, `application-service.ts`, `completion-report-template.ts`, `v1/beneficiaries/import/commit/route.ts`, `ref_path`, `inspect-all-sources.js`, `seed.js`, `ref_fs`, `ref_crypto`, `master-sync-all-data.js`, `bulk/route.ts`, `v1/beneficiaries/import/commit/route.ts`, `migrate-user-plain-password.js`, `test-program-qr-postgres.mjs`, `inspect-flagged.js`, `work-program-parser.ts`, `v1/applications/route.ts`, `update-flagged-beneficiaries.js`, `inspect-db.js`, `reseed-exact-522-beneficiaries.mjs`, `inspect-db.mjs`, `check-reference-slots.js`, `beneficiaries/page.tsx`, `ref_node_assert`, `sync-disqualified-entry.mjs`, `test-offline-sync-resilience.mjs`, `@supabase/supabase-js`, `test-public-inquiry.mjs`, `export-pg-to-files.js`, `next`, `check-sep20-evening.mjs`, `cleanup-and-deduplicate.js`, `inspect-program-details.mjs`, `inspect-sep21-data.mjs`, `check-demographics.mjs`, `test-program-crud.mjs`, `test-matrix-and-sync.mjs`, `test-sorting-and-templates.mjs`, `extract-and-sync-522-qrs.mjs`?**
  _High betweenness centrality (0.187) - this node is a cross-community bridge._
- **What connects `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `package.json`, `excel-importer.ts`, `hasPermission`, `replacements/page.tsx`, `stubs/page.tsx`, `dexie.ts`, `application-service.ts`, `completion-report-template.ts`, `getCurrentUser`, `dingalan-groupings.ts`, `v1/beneficiaries/import/commit/route.ts`, `test-application-id-autofill.mjs`, `logAudit`, `programs/[id]/page.tsx`, `prisma.ts`, `bulk/route.ts`, `middleware.ts`, `restrictions/route.ts`, `useAuth`, `v1/beneficiaries/import/commit/route.ts`, `react`, `app/page.tsx`, `login/page.tsx`, `replacement-eligibility.ts`, `work-program-parser.ts`, `v1/applications/route.ts`, `beneficiaries/page.tsx`, `restrictions/import/route.ts`, `dashboard/page.tsx`, `auth.ts`, `stubs/route.ts`, `extract-and-sync-522-qrs.mjs`?**
  _High betweenness centrality (0.146) - this node is a cross-community bridge._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `package.json`, `excel-importer.ts`, `replacements/page.tsx`, `application-schema.ts`, `stubs/page.tsx`, `dexie.ts`, `dingalan-groupings.ts`, `v1/beneficiaries/import/commit/route.ts`, `ApplicationInbox.tsx`, `test-roster-restriction-preview.mjs`, `programs/[id]/page.tsx`, `ApplicationInbox.tsx`, `useAuth`, `effects/TextCubeLoader.tsx`, `app/page.tsx`, `login/page.tsx`, `AccomplishmentReportBuilderModal.tsx`, `beneficiaries/page.tsx`, `dashboard/page.tsx`, `extract-and-sync-522-qrs.mjs`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Should `test-accomplishment-work-schedule.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.04994192799070848 - nodes in this community are weakly interconnected._