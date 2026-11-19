# Graph Report - PESO-EC-Access-1  (2026-11-19)

## Corpus Check
- 394 files · ~1,458,531 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 33 file(s) not represented in the graph (top: .csv 26, .css 2, .example 1)

## Summary
- 1986 nodes · 4991 edges · 115 communities (86 shown, 29 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `24827072`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- next
- programs/[id]/route.ts
- dependencies
- test-accomplishment-work-schedule.mjs
- getCurrentUser
- replacements/page.tsx
- application-schema.ts
- stubs/page.tsx
- dexie.ts
- application-service.ts
- ref_node_fs
- test-application-workflow.mjs
- completion-report-template.ts
- programs/[id]/page.tsx
- dingalan-groupings.ts
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
- logAudit
- Layout & Components
- inspect-all-sources.js
- test-roster-restriction-preview.mjs
- v1/applications/route.ts
- check-remote.js
- seed.js
- ref_fs
- browser-id-ocr.ts
- manifest.json
- prisma.ts
- ref_crypto
- master-sync-all-data.js
- prepare-dole-template.mjs
- ref_node_vm
- TUPAD application ID autofill and walk-in encoding
- bulk/route.ts
- middleware.ts
- ApplicationInbox.tsx
- migration.sql
- restrictions/route.ts
- hasPermission
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
- restore-to-postgres.js
- Stitch Design System & UI Screen Guide
- test-monitor-refresh-browser.mjs
- ref_node_fs
- Guided ID camera
- test-application-inbox-browser.mjs
- inspect-flagged.js
- work-program-parser.ts
- Online and walk-in application intake
- test-roster-restriction-browser.mjs
- update-flagged-beneficiaries.js
- cleanup-test-users.mjs
- inspect-db.js
- detailed-consolidated-retrieval.mjs
- list-users-by-role.mjs
- engines
- ref_node_module
- tailwindcss
- test-local-ocr-browser.mjs
- inspect-db.mjs
- check-reference-slots.js
- beneficiaries/page.tsx
- ref_node_assert
- Reusable QR slots and per-program scan history
- test-navbar-landing-link-browser.mjs
- restrictions/import/route.ts
- test-offline-sync-resilience.mjs
- ProgramBeneficiary_active_program_slot_key
- test-dole-reports-browser.mjs
- @supabase/supabase-js
- test-dole-reports.mjs
- format1-stub-base-b64.ts
- Bagong Pilipinas transparent footer asset
- sync-disqualified-entry.mjs
- test-password-view.mjs
- test-public-inquiry.mjs
- dashboard/page.tsx
- auth.ts
- check-demographics.mjs
- test-table-rules.mjs
- test-attendance-3hours.mjs
- Q: ayusin mo yung sa driver`s license kasi halos walang nababasa
- test-matrix-and-sync.mjs
- cleanup-and-deduplicate.js
- test-dedicated-qr-retention.mjs
- test-stub-distribution-monitoring.mjs
- applications/import/route.ts
- extract-and-sync-522-qrs.mjs

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
10. `@prisma/client` - 64 edges

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

## Communities (115 total, 29 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.09
Nodes (22): name, private, version, autoprefixer, clsx, dexie, dexie-react-hooks, @hookform/resolvers (+14 more)

### Community 1 - "next"
Cohesion: 0.11
Nodes (10): next, dynamic, dynamic, dynamic, dynamic, BeneficiaryProfilePage(), dynamic, DeleteBeneficiaryModal() (+2 more)

### Community 2 - "programs/[id]/route.ts"
Cohesion: 0.27
Nodes (10): DELETE(), dynamic, GET(), PATCH(), dynamic, GET(), POST(), buildProgramWorkDays() (+2 more)

### Community 3 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, autoprefixer, bcryptjs, clsx, date-fns, dexie, dexie-react-hooks, exceljs (+33 more)

### Community 4 - "test-accomplishment-work-schedule.mjs"
Cohesion: 0.05
Nodes (37): book, { buildBarangayCompletionDays }, cache, chunks, db, doleBook, downloaded, ExcelJS (+29 more)

### Community 5 - "getCurrentUser"
Cohesion: 0.08
Nodes (38): AdminApplicationsPage(), AdminInquiriesPage(), DELETE(), dynamic, PATCH(), dynamic, GET(), dynamic (+30 more)

### Community 6 - "replacements/page.tsx"
Cohesion: 0.28
Nodes (11): ReplacementsContent(), ReplacementsPage(), ReportCenterPage(), DOC_LABELS, PendingReplacementAssessmentItem, Props, ReplacementApprovalModal(), DoleReportsPanel() (+3 more)

### Community 7 - "application-schema.ts"
Cohesion: 0.07
Nodes (44): zod, WalkInEncodingPage(), OnlineTupadApplicationPage(), ApplicationForm(), ApplicationFormProps, DocumentField, FieldProps, FormErrors (+36 more)

### Community 8 - "stubs/page.tsx"
Cohesion: 0.17
Nodes (17): PrintTemplateMode, StubsContent(), StubsDesignerPage(), ETUPAD_BASE_IMAGE, ETupadCard, ETupadCardProps, Format1Stub, Format1StubProps (+9 more)

### Community 9 - "dexie.ts"
Cohesion: 0.05
Nodes (98): AuditLogsPage(), loadData(), DailyAttendancePage(), OrientationContent(), OrientationPage(), FIELD_OPERATIONS, FieldScannerHubContent(), FieldScannerHubPage() (+90 more)

### Community 10 - "application-service.ts"
Cohesion: 0.10
Nodes (31): dynamic, POST(), dynamic, POST(), ApplicationWriteAction, isIdempotentReplay(), ACCEPTED_APPLICATION_FILE_TYPES, applicationDraftSchema (+23 more)

### Community 11 - "ref_node_fs"
Cohesion: 0.11
Nodes (11): ExcelJS, fixture, programs, require, expected, require, require, errors (+3 more)

### Community 12 - "test-application-workflow.mjs"
Cohesion: 0.08
Nodes (23): audits, cache, countQueries, deleted, detail, docs, encode, fakePrisma (+15 more)

### Community 13 - "completion-report-template.ts"
Cohesion: 0.08
Nodes (42): exceljs, prisma, testExport(), dynamic, dynamic, GET(), maxDuration, AttendanceActivity (+34 more)

### Community 14 - "programs/[id]/page.tsx"
Cohesion: 0.24
Nodes (14): react, DINGALAN_BARANGAYS, UserManagementPage(), ProgramDetailsHub(), ProgramsPage(), StatusBadge(), StatusBadgeProps, DeleteProgramModal() (+6 more)

### Community 15 - "dingalan-groupings.ts"
Cohesion: 0.26
Nodes (18): DEFAULT_10_DAY_ACTIVITIES, dynamic, POST(), FieldWorkProgramPage(), WorkProgramManagementPage(), DeploymentGroupingMatrix(), DeploymentGroupingMatrixProps, BarangayGroupingConfig (+10 more)

### Community 16 - "identity-address.ts"
Cohesion: 0.28
Nodes (16): ADDRESS_LABEL, ADDRESS_STOP, addressLike(), addressPiece(), addressStart(), barangayPattern(), escape(), IdentityAddress (+8 more)

### Community 17 - "application-id-mapper.ts"
Cohesion: 0.26
Nodes (21): birthDateValue(), clean(), cleanLocalValue(), cleanPersonName(), explicitLabel(), fieldValue(), identityValue(), isIdentityLabel() (+13 more)

### Community 18 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, dev, lint, postinstall, prepare:ocr, prisma:generate, prisma:push (+9 more)

### Community 19 - "start-localhost.mjs"
Cohesion: 0.11
Nodes (18): core, output, require, root, main(), openBrowser(), portIsAvailable(), projectDir (+10 more)

### Community 20 - "test-local-id-reader.mjs"
Cohesion: 0.05
Nodes (36): run(), addressCrop, addressLines, addressOf(), backStatusRegions, birthCrop, certificate, certificateLayout (+28 more)

### Community 21 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx (+12 more)

### Community 22 - "v1/beneficiaries/import/commit/route.ts"
Cohesion: 0.11
Nodes (42): dynamic, GET(), dynamic, GET(), maxDuration, POST(), canUseDoleReports(), DOLE_REPORT_SHEETS (+34 more)

### Community 23 - "excel-importer.ts"
Cohesion: 0.21
Nodes (13): ExcelImportPage(), DEFAULT_EXEMPTION_REASONS, MasterlistUploadModalProps, displayDate(), RosterRestrictionDetails(), cleanStr(), ImportPreviewResult, MONTH_NAME_MAP (+5 more)

### Community 24 - "test-application-id-autofill.mjs"
Cohesion: 0.09
Nodes (27): dynamic, isRateLimited(), maxDuration, POST(), providerMessage(), rateLimit, mergeOcrSides(), analyzeIdentityDocument() (+19 more)

### Community 25 - "ref_path"
Cohesion: 0.10
Nodes (8): __dirname, nextConfig, prisma, fs, path, { PrismaClient }, prisma, prisma

### Community 26 - "Layout & Components"
Cohesion: 0.14
Nodes (13): 1. DICT GWT Utility Header, 2. Official Municipal Masthead, 3. Hero Citizen Announcement Card, 4. Telemetry Metric Strip, 5. Public Status Inquiry Module (`#inquiry`), 6. Work Area Assignment Lookup (`#work-assignment`), 7. Direct Feedback Desk (`#inquiry-form`), 8. DICT Standard GWT Footer (+5 more)

### Community 27 - "@prisma/client"
Cohesion: 0.05
Nodes (16): @prisma/client, prisma, flaggedReference, prisma, { PrismaClient }, prisma, prisma, prisma (+8 more)

### Community 28 - "logAudit"
Cohesion: 0.07
Nodes (28): dynamic, POST(), dynamic, POST(), DELETE(), dynamic, GET(), PATCH() (+20 more)

### Community 29 - "Layout & Components"
Cohesion: 0.14
Nodes (13): 1. DICT GWT Utility Header, 2. Official Municipal Masthead, 3. Hero Citizen Announcement Card, 4. Telemetry Metric Strip, 5. Public Status Inquiry Module (`#inquiry`), 6. Work Area Assignment Lookup (`#work-assignment`), 7. Direct Feedback Desk (`#inquiry-form`), 8. DICT Standard GWT Footer (+5 more)

### Community 30 - "inspect-all-sources.js"
Cohesion: 0.11
Nodes (16): Database, db, fs, summary, tables, Database, db, fs (+8 more)

### Community 31 - "test-roster-restriction-preview.mjs"
Cohesion: 0.12
Nodes (16): react-dom, activeMarkup, book, buffer, cache, globalRoute, html(), load() (+8 more)

### Community 32 - "v1/applications/route.ts"
Cohesion: 0.15
Nodes (17): dynamic, GET(), dynamic, POST(), details, dynamic, GET(), PATCH() (+9 more)

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
Cohesion: 0.10
Nodes (47): tesseract.js, normalizeIdLighting(), detectIdentityDocumentType(), extractPhilSysNumber(), MappedOcrSide, MergedOcrResult, NON_BIRTH_DATE_LABEL, OcrSubject (+39 more)

### Community 37 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 38 - "prisma.ts"
Cohesion: 0.10
Nodes (38): date-fns, dynamic, POST(), dynamic, GET(), dynamic, POST(), dynamic (+30 more)

### Community 39 - "ref_crypto"
Cohesion: 0.36
Nodes (7): DINGALAN_BARANGAYS, main(), MONTH_NAME_MAP, normalizeBarangayName(), normalizeSitioName(), parseCSVLine(), prisma

### Community 40 - "master-sync-all-data.js"
Cohesion: 0.36
Nodes (7): chunkArray(), fs, main(), path, { PrismaClient }, toBool(), toDate()

### Community 41 - "prepare-dole-template.mjs"
Cohesion: 0.11
Nodes (15): jszip, cache, load(), original, output, require, review, root (+7 more)

### Community 42 - "ref_node_vm"
Cohesion: 0.14
Nodes (7): card, module, paper, source, module, production, source

### Community 43 - "TUPAD application ID autofill and walk-in encoding"
Cohesion: 0.22
Nodes (8): Database migration, Local ID reading (default; no Azure key required), Number recovery and optional close-up, Optional Azure API, Required private storage configuration, TUPAD application ID autofill and walk-in encoding, Verification, What is implemented

### Community 44 - "bulk/route.ts"
Cohesion: 0.11
Nodes (20): DINGALAN_BARANGAYS, formatBday(), main(), normalizeBarangayName(), normalizeSitioName(), prisma, rawData, DINGALAN_BARANGAYS (+12 more)

### Community 46 - "ApplicationInbox.tsx"
Cohesion: 0.07
Nodes (43): OnlineApplicationsPage(), WalkInSubmissionsPage(), ApplicationInbox(), ApplicationRecord, dateText(), InboxData, sections, valueText() (+35 more)

### Community 47 - "migration.sql"
Cohesion: 0.33
Nodes (8): "TupadApplicationDocument", TupadApplicationDocument_applicationId_fieldName_idx, TupadApplicationDocument_uploadedById_idx, TupadApplicationRoster_applicationCode_key, TupadApplicationRoster_encodedById_idx, TupadApplicationRoster_idempotencyKey_key, TupadApplicationRoster_source_submissionStatus_idx, TupadApplicationRoster_submittedAt_idx

### Community 48 - "restrictions/route.ts"
Cohesion: 0.38
Nodes (6): DELETE(), dynamic, GET(), maskFullName(), parsePayoutDateToTimestamp(), POST()

### Community 49 - "hasPermission"
Cohesion: 0.06
Nodes (40): dynamic, POST(), DELETE(), generateElporControlNo(), GET(), PATCH(), POST(), DELETE() (+32 more)

### Community 50 - "effects/TextCubeLoader.tsx"
Cohesion: 0.43
Nodes (3): Loading(), TextCubeLoader(), TextCubeLoaderProps

### Community 51 - "vercel.json"
Cohesion: 0.25
Nodes (7): buildCommand, framework, functions, src/app/api/**/*, $schema, includeFiles, maxDuration

### Community 52 - "v1/beneficiaries/import/commit/route.ts"
Cohesion: 0.06
Nodes (62): dynamic, ImportConflict, maxDuration, POST(), dynamic, GET(), handleQrPassSearch(), POST() (+54 more)

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
Cohesion: 0.16
Nodes (7): lucide-react, metadata, PublicInquiryPage(), Day, Result, PublicInquiryMessageForm(), PublicStatusInquiryCard()

### Community 58 - "test-auto-qr-browser.mjs"
Cohesion: 0.33
Nodes (6): calls, errors, programs, require, scan(), tokens

### Community 59 - "test-program-qr-postgres.mjs"
Cohesion: 0.11
Nodes (15): cacheRoot, dataDir, get(), listener, load(), { PrismaClient }, require, root (+7 more)

### Community 60 - "restore-to-postgres.js"
Cohesion: 0.40
Nodes (3): fs, path, { PrismaClient }

### Community 61 - "Stitch Design System & UI Screen Guide"
Cohesion: 0.40
Nodes (4): 1. How to Access and Edit in Stitch, 2. Included Local Artifacts, 3. How to Upload a Modified `DESIGN.md` to Stitch in the Future, Stitch Design System & UI Screen Guide

### Community 62 - "test-monitor-refresh-browser.mjs"
Cohesion: 0.33
Nodes (4): calls, errors, program, require

### Community 63 - "ref_node_fs"
Cohesion: 0.09
Nodes (13): typescript, exported, blurred, clearResult, module, normalized, shaded, sharp (+5 more)

### Community 64 - "Guided ID camera"
Cohesion: 0.40
Nodes (4): Browser/privacy requirements, Capture flow, Guided ID camera, Verification

### Community 65 - "test-application-inbox-browser.mjs"
Cohesion: 0.29
Nodes (5): errors, fixture, record, requests, require

### Community 67 - "work-program-parser.ts"
Cohesion: 0.09
Nodes (20): xlsx, dynamic, dynamic, POST(), dynamic, DINGALAN_BARANGAYS, normalizeBarangay(), ParsedBarangayWorkProgram (+12 more)

### Community 68 - "Online and walk-in application intake"
Cohesion: 0.33
Nodes (5): Admin review, Database and private storage, Online and walk-in application intake, Pages and roles, Verification

### Community 69 - "test-roster-restriction-browser.mjs"
Cohesion: 0.29
Nodes (6): baseRow, errors, preview, program, require, rows

### Community 70 - "update-flagged-beneficiaries.js"
Cohesion: 0.40
Nodes (3): flaggedReference, prisma, { PrismaClient }

### Community 75 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, npm

### Community 76 - "ref_node_module"
Cohesion: 0.07
Nodes (19): errors, require, errors, require, errors, require, alerts, pageErrors (+11 more)

### Community 78 - "test-local-ocr-browser.mjs"
Cohesion: 0.40
Nodes (3): jspdf, qrcode, require

### Community 80 - "check-reference-slots.js"
Cohesion: 0.40
Nodes (3): prisma, { PrismaClient }, referenceSlots

### Community 81 - "beneficiaries/page.tsx"
Cohesion: 0.12
Nodes (31): main(), prisma, AttendanceMatrixContent(), AttendanceMatrixPage(), BeneficiariesMasterlistContent(), BeneficiariesMasterlistPage(), RestrictionsPage(), AdminStubOverrideModal() (+23 more)

### Community 82 - "ref_node_assert"
Cohesion: 0.12
Nodes (11): login(), run(), cacheRoot, dataDir, listener, load(), { PrismaClient }, require (+3 more)

### Community 83 - "Reusable QR slots and per-program scan history"
Cohesion: 0.29
Nodes (6): Active masterlist uniqueness, More than 522 beneficiaries, Offline devices, Program-owned QR codes and scan history, Reusing an existing physical card, Verification

### Community 84 - "test-navbar-landing-link-browser.mjs"
Cohesion: 0.33
Nodes (5): errors, expectedLabels, mutations, require, roles

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
Cohesion: 0.08
Nodes (21): IS_LOCAL_DEVELOPMENT, PRECACHE_ASSETS, api, base, cache, config, data, db (+13 more)

### Community 103 - "dashboard/page.tsx"
Cohesion: 0.50
Nodes (4): DashboardData, DashboardPage(), dynamic, getDashboardMetrics()

### Community 104 - "auth.ts"
Cohesion: 0.07
Nodes (27): bcryptjs, dynamic, POST(), dynamic, GET(), dynamic, GET(), dynamic (+19 more)

### Community 109 - "Q: ayusin mo yung sa driver`s license kasi halos walang nababasa"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ayusin mo yung sa driver`s license kasi halos walang nababasa, Source Nodes

### Community 115 - "applications/import/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, getVal(), POST()

### Community 118 - "extract-and-sync-522-qrs.mjs"
Cohesion: 0.21
Nodes (6): jsqr, pdfjs-dist, prisma, metadata, WorkAreaAssignmentInquiryPage(), PublicWorkAssignmentLookupCard()

## Knowledge Gaps
- **14 isolated node(s):** `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs`, `@types/jsonwebtoken`, `@types/jszip` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 909 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `@prisma/client` to `package.json`, `programs/[id]/route.ts`, `application-service.ts`, `completion-report-template.ts`, `v1/beneficiaries/import/commit/route.ts`, `ref_path`, `inspect-all-sources.js`, `v1/applications/route.ts`, `seed.js`, `ref_fs`, `prisma.ts`, `ref_crypto`, `master-sync-all-data.js`, `bulk/route.ts`, `v1/beneficiaries/import/commit/route.ts`, `migrate-user-plain-password.js`, `test-program-qr-postgres.mjs`, `restore-to-postgres.js`, `inspect-flagged.js`, `work-program-parser.ts`, `update-flagged-beneficiaries.js`, `cleanup-test-users.mjs`, `inspect-db.js`, `detailed-consolidated-retrieval.mjs`, `list-users-by-role.mjs`, `inspect-db.mjs`, `check-reference-slots.js`, `beneficiaries/page.tsx`, `ref_node_assert`, `test-offline-sync-resilience.mjs`, `@supabase/supabase-js`, `sync-disqualified-entry.mjs`, `test-password-view.mjs`, `test-public-inquiry.mjs`, `check-demographics.mjs`, `test-table-rules.mjs`, `test-matrix-and-sync.mjs`, `cleanup-and-deduplicate.js`, `test-dedicated-qr-retention.mjs`, `test-stub-distribution-monitoring.mjs`, `extract-and-sync-522-qrs.mjs`?**
  _High betweenness centrality (0.199) - this node is a cross-community bridge._
- **What connects `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `package.json`, `programs/[id]/route.ts`, `getCurrentUser`, `replacements/page.tsx`, `stubs/page.tsx`, `dexie.ts`, `application-service.ts`, `completion-report-template.ts`, `programs/[id]/page.tsx`, `dingalan-groupings.ts`, `v1/beneficiaries/import/commit/route.ts`, `excel-importer.ts`, `test-application-id-autofill.mjs`, `logAudit`, `v1/applications/route.ts`, `prisma.ts`, `bulk/route.ts`, `middleware.ts`, `restrictions/route.ts`, `hasPermission`, `v1/beneficiaries/import/commit/route.ts`, `app/page.tsx`, `react`, `work-program-parser.ts`, `beneficiaries/page.tsx`, `restrictions/import/route.ts`, `dashboard/page.tsx`, `auth.ts`, `applications/import/route.ts`, `extract-and-sync-522-qrs.mjs`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Should `next` be split into smaller, more focused modules?**
  _Cohesion score 0.10822510822510822 - nodes in this community are weakly interconnected._
- **Why does `react` connect `programs/[id]/page.tsx` to `package.json`, `next`, `getCurrentUser`, `replacements/page.tsx`, `application-schema.ts`, `stubs/page.tsx`, `dexie.ts`, `dingalan-groupings.ts`, `v1/beneficiaries/import/commit/route.ts`, `excel-importer.ts`, `test-roster-restriction-preview.mjs`, `ApplicationInbox.tsx`, `hasPermission`, `effects/TextCubeLoader.tsx`, `app/page.tsx`, `react`, `beneficiaries/page.tsx`, `dashboard/page.tsx`, `extract-and-sync-522-qrs.mjs`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._