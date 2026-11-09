# Graph Report - PESO-EC-Access-1  (2026-11-09)

## Corpus Check
- 371 files · ~1,438,410 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 32 file(s) not represented in the graph (top: .csv 26, .css 2, .example 1)

## Summary
- 1854 nodes · 4596 edges · 118 communities (83 shown, 35 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1496a1ac`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- v1/beneficiaries/import/commit/route.ts
- excel-importer.ts
- dependencies
- test-accomplishment-work-schedule.mjs
- getCurrentUser
- next
- application-schema.ts
- ref_node_module
- dexie.ts
- application-service.ts
- captcha/route.ts
- test-application-workflow.mjs
- completion-report-template.ts
- programs/[id]/page.tsx
- react
- identity-address.ts
- application-id-mapper.ts
- scripts
- export/route.ts
- test-local-id-reader.mjs
- compilerOptions
- v1/beneficiaries/import/commit/route.ts
- test-program-qr-browser.mjs
- test-application-id-autofill.mjs
- ref_path
- Layout & Components
- @prisma/client
- compare-datasets.js
- Layout & Components
- inspect-all-sources.js
- test-roster-restriction-preview.mjs
- work-assignment.ts
- check-remote.js
- bcryptjs
- ref_fs
- browser-id-ocr.ts
- manifest.json
- next.config.mjs
- import-final-522-beneficiaries.mjs
- master-sync-all-data.js
- prepare-dole-template.mjs
- restrictions/import/route.ts
- TUPAD application ID autofill and walk-in encoding
- getCurrentUser
- middleware.ts
- ApplicationInbox.tsx
- migration.sql
- restrictions/route.ts
- FieldQrPassGeneratorCard.tsx
- effects/TextCubeLoader.tsx
- vercel.json
- fast-update-flagged.js
- flag-replacement/route.ts
- Reports: supplied DOLE 2026 workbook
- app/page.tsx
- migrate-user-plain-password.js
- replacements/page.tsx
- dingalan-groupings.ts
- test-program-qr-postgres.mjs
- reseed-exact-522-beneficiaries.mjs
- Stitch Design System & UI Screen Guide
- test-accomplishment-export-browser.mjs
- inspect-db.js
- Guided ID camera
- exceljs
- layout.tsx
- work-program-parser.ts
- Online and walk-in application intake
- test-service-worker-cache.mjs
- update-flagged-beneficiaries.js
- ref_crypto
- cleanup-test-users.mjs
- normalizeBarangayName
- test-matrix-and-sync.mjs
- engines
- stubs/page.tsx
- tailwindcss
- test-local-ocr-browser.mjs
- test-masterlist-import-postgres.mjs
- detailed-consolidated-retrieval.mjs
- beneficiaries/page.tsx
- ref_node_assert
- Reusable QR slots and per-program scan history
- test-application-inbox-browser.mjs
- heal-qr-codes.mjs
- inspect-flagged.js
- test-offline-sync-resilience.mjs
- test-attendance-3hours.mjs
- test-dedicated-qr-retention.mjs
- test-dole-reports.mjs
- format1-stub-base-b64.ts
- Bagong Pilipinas transparent footer asset
- test-sorting-and-templates.mjs
- cleanup-and-deduplicate.js
- inspect-program-details.mjs
- list-users-by-role.mjs
- auth.ts
- sync-disqualified-entry.mjs
- test-landing-scanner.mjs
- update-522-sitios.mjs
- test-pg-counts.js
- Q: ayusin mo yung sa driver`s license kasi halos walang nababasa
- login/page.tsx
- verify-official-qr-scanning.mjs
- test-public-inquiry.mjs
- test-program-crud.mjs
- check-reference-slots.js
- test-table-rules.mjs
- inspect-db.mjs
- check-sep20-evening.mjs

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
- `main()` --calls--> `normalizeBarangayName()`  [EXTRACTED]
  scripts/unify-all-sitios-and-puroks.mjs → src/lib/utils.ts
- `run()` --indirect_call--> `selected()`  [INFERRED]
  src/components/reports/DoleReportsPanel.tsx → test/test-local-id-reader.mjs

## Import Cycles
- None detected.

## Communities (118 total, 35 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.09
Nodes (22): name, private, version, autoprefixer, clsx, dexie, dexie-react-hooks, @hookform/resolvers (+14 more)

### Community 1 - "v1/beneficiaries/import/commit/route.ts"
Cohesion: 0.07
Nodes (47): dynamic, ImportConflict, maxDuration, POST(), dynamic, GET(), handleQrPassSearch(), POST() (+39 more)

### Community 2 - "excel-importer.ts"
Cohesion: 0.26
Nodes (10): ExcelImportPage(), DEFAULT_EXEMPTION_REASONS, MasterlistUploadModal(), MasterlistUploadModalProps, displayDate(), RosterRestrictionDetails(), ImportPreviewResult, ParsedBeneficiaryRow (+2 more)

### Community 3 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, autoprefixer, bcryptjs, clsx, date-fns, dexie, dexie-react-hooks, exceljs (+33 more)

### Community 4 - "test-accomplishment-work-schedule.mjs"
Cohesion: 0.05
Nodes (37): book, { buildBarangayCompletionDays }, cache, chunks, db, doleBook, downloaded, ExcelJS (+29 more)

### Community 5 - "getCurrentUser"
Cohesion: 0.08
Nodes (37): dynamic, getVal(), POST(), dynamic, POST(), DELETE(), dynamic, GET() (+29 more)

### Community 6 - "next"
Cohesion: 0.06
Nodes (30): next, dynamic, GET(), dynamic, dynamic, POST(), dynamic, dynamic (+22 more)

### Community 7 - "application-schema.ts"
Cohesion: 0.07
Nodes (44): zod, WalkInEncodingPage(), OnlineTupadApplicationPage(), ApplicationForm(), ApplicationFormProps, DocumentField, FieldProps, FormErrors (+36 more)

### Community 8 - "ref_node_module"
Cohesion: 0.25
Nodes (6): errors, files, programs, require, saved, writes

### Community 9 - "dexie.ts"
Cohesion: 0.08
Nodes (64): AttendanceMatrixContent(), AttendanceMatrixPage(), DailyAttendancePage(), OrientationContent(), OrientationPage(), PayoutScannerPage(), photosMemoryCache, PhotosPage() (+56 more)

### Community 10 - "application-service.ts"
Cohesion: 0.08
Nodes (35): @supabase/supabase-js, DELETE(), dynamic, POST(), dynamic, POST(), ApplicationWriteAction, isIdempotentReplay() (+27 more)

### Community 11 - "captcha/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, GET(), generateCaptchaChallenge()

### Community 12 - "test-application-workflow.mjs"
Cohesion: 0.08
Nodes (23): audits, cache, countQueries, deleted, detail, docs, encode, fakePrisma (+15 more)

### Community 13 - "completion-report-template.ts"
Cohesion: 0.13
Nodes (28): AttendanceActivity, buildBarangayCompletionDays(), cleanActivity(), completionBarangay(), CompletionDay, CompletionProgram, key(), PhotoActivity (+20 more)

### Community 14 - "programs/[id]/page.tsx"
Cohesion: 0.20
Nodes (14): AuditLogsPage(), DINGALAN_BARANGAYS, UserManagementPage(), ProgramDetailsHub(), ProgramsPage(), StatusBadge(), StatusBadgeProps, DeleteProgramModal() (+6 more)

### Community 15 - "react"
Cohesion: 0.12
Nodes (15): lucide-react, react, metadata, PublicInquiryPage(), BeneficiaryProfilePage(), dynamic, DeleteBeneficiaryModal(), DeleteBeneficiaryModalProps (+7 more)

### Community 16 - "identity-address.ts"
Cohesion: 0.28
Nodes (16): ADDRESS_LABEL, ADDRESS_STOP, addressLike(), addressPiece(), addressStart(), barangayPattern(), escape(), IdentityAddress (+8 more)

### Community 17 - "application-id-mapper.ts"
Cohesion: 0.26
Nodes (21): birthDateValue(), clean(), cleanLocalValue(), cleanPersonName(), explicitLabel(), fieldValue(), identityValue(), isIdentityLabel() (+13 more)

### Community 18 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, dev, lint, postinstall, prepare:ocr, prisma:generate, prisma:push (+9 more)

### Community 19 - "export/route.ts"
Cohesion: 0.31
Nodes (12): prisma, testExport(), dynamic, GET(), maxDuration, generateAccomplishmentExcel(), generateAttendanceExcel(), generateFlaggedReplacementsExcel() (+4 more)

### Community 20 - "test-local-id-reader.mjs"
Cohesion: 0.05
Nodes (37): run(), nationalNumberCrops(), addressCrop, addressLines, addressOf(), backStatusRegions, birthCrop, certificate (+29 more)

### Community 21 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx (+12 more)

### Community 22 - "v1/beneficiaries/import/commit/route.ts"
Cohesion: 0.11
Nodes (42): dynamic, GET(), dynamic, GET(), maxDuration, POST(), canUseDoleReports(), DOLE_REPORT_SHEETS (+34 more)

### Community 23 - "test-program-qr-browser.mjs"
Cohesion: 0.29
Nodes (5): calls, errors, programs, require, roster

### Community 24 - "test-application-id-autofill.mjs"
Cohesion: 0.08
Nodes (28): dynamic, isRateLimited(), maxDuration, POST(), providerMessage(), rateLimit, applicationFinalSchema, mergeOcrSides() (+20 more)

### Community 25 - "ref_path"
Cohesion: 0.10
Nodes (9): prisma, fs, path, { PrismaClient }, prisma, fs, path, { PrismaClient } (+1 more)

### Community 26 - "Layout & Components"
Cohesion: 0.14
Nodes (13): 1. DICT GWT Utility Header, 2. Official Municipal Masthead, 3. Hero Citizen Announcement Card, 4. Telemetry Metric Strip, 5. Public Status Inquiry Module (`#inquiry`), 6. Work Area Assignment Lookup (`#work-assignment`), 7. Direct Feedback Desk (`#inquiry-form`), 8. DICT Standard GWT Footer (+5 more)

### Community 27 - "@prisma/client"
Cohesion: 0.12
Nodes (7): @prisma/client, prisma, prisma, prisma, prisma, runE2ETests(), prisma

### Community 28 - "compare-datasets.js"
Cohesion: 0.33
Nodes (4): backup, fs, prisma, { PrismaClient }

### Community 29 - "Layout & Components"
Cohesion: 0.14
Nodes (13): 1. DICT GWT Utility Header, 2. Official Municipal Masthead, 3. Hero Citizen Announcement Card, 4. Telemetry Metric Strip, 5. Public Status Inquiry Module (`#inquiry`), 6. Work Area Assignment Lookup (`#work-assignment`), 7. Direct Feedback Desk (`#inquiry-form`), 8. DICT Standard GWT Footer (+5 more)

### Community 30 - "inspect-all-sources.js"
Cohesion: 0.11
Nodes (16): Database, db, fs, summary, tables, Database, db, fs (+8 more)

### Community 31 - "test-roster-restriction-preview.mjs"
Cohesion: 0.12
Nodes (16): react-dom, activeMarkup, book, buffer, cache, globalRoute, html(), load() (+8 more)

### Community 32 - "work-assignment.ts"
Cohesion: 0.23
Nodes (8): AssignmentResult, BeneficiaryAllocationInput, calculateProximityScore(), extractAddressTokens(), generateBeneficiaryToken(), prisma, runTests(), verifyTokenHash()

### Community 33 - "check-remote.js"
Cohesion: 0.15
Nodes (9): isomorphic-git, dir, fs, git, path, dir, fs, git (+1 more)

### Community 34 - "bcryptjs"
Cohesion: 0.17
Nodes (6): bcrypt, prisma, { PrismaClient }, bcryptjs, prisma, prisma

### Community 35 - "ref_fs"
Cohesion: 0.15
Nodes (4): pngjs, downloadImage(), b64, fs

### Community 36 - "browser-id-ocr.ts"
Cohesion: 0.11
Nodes (44): tesseract.js, detectIdentityDocumentType(), extractPhilSysNumber(), MappedOcrSide, MergedOcrResult, NON_BIRTH_DATE_LABEL, OcrSubject, OcrTextLine (+36 more)

### Community 37 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 39 - "import-final-522-beneficiaries.mjs"
Cohesion: 0.36
Nodes (7): DINGALAN_BARANGAYS, main(), MONTH_NAME_MAP, normalizeBarangayName(), normalizeSitioName(), parseCSVLine(), prisma

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

### Community 44 - "getCurrentUser"
Cohesion: 0.07
Nodes (52): DELETE(), dynamic, PATCH(), dynamic, GET(), dynamic, GET(), POST() (+44 more)

### Community 46 - "ApplicationInbox.tsx"
Cohesion: 0.09
Nodes (30): OnlineApplicationsPage(), WalkInSubmissionsPage(), ApplicationInbox(), ApplicationRecord, dateText(), InboxData, sections, valueText() (+22 more)

### Community 47 - "migration.sql"
Cohesion: 0.33
Nodes (8): "TupadApplicationDocument", TupadApplicationDocument_applicationId_fieldName_idx, TupadApplicationDocument_uploadedById_idx, TupadApplicationRoster_applicationCode_key, TupadApplicationRoster_encodedById_idx, TupadApplicationRoster_idempotencyKey_key, TupadApplicationRoster_source_submissionStatus_idx, TupadApplicationRoster_submittedAt_idx

### Community 48 - "restrictions/route.ts"
Cohesion: 0.38
Nodes (6): DELETE(), dynamic, GET(), maskFullName(), parsePayoutDateToTimestamp(), POST()

### Community 49 - "FieldQrPassGeneratorCard.tsx"
Cohesion: 0.07
Nodes (41): AdminApplicationsPage(), AdminInquiriesPage(), FIELD_OPERATIONS, FieldScannerHubContent(), FieldScannerHubPage(), BalikPinasElporPortalPage(), DINGALAN_BARANGAYS, SupplyItem (+33 more)

### Community 50 - "effects/TextCubeLoader.tsx"
Cohesion: 0.43
Nodes (3): Loading(), TextCubeLoader(), TextCubeLoaderProps

### Community 51 - "vercel.json"
Cohesion: 0.25
Nodes (7): buildCommand, framework, functions, src/app/api/**/*, $schema, includeFiles, maxDuration

### Community 52 - "fast-update-flagged.js"
Cohesion: 0.40
Nodes (3): flaggedReference, prisma, { PrismaClient }

### Community 53 - "flag-replacement/route.ts"
Cohesion: 0.24
Nodes (12): dynamic, POST(), dynamic, POST(), evaluatePersonTupadEligibility(), normalizeBirthdayComparison(), ParsedPersonName, parseEnteredFullName() (+4 more)

### Community 54 - "Reports: supplied DOLE 2026 workbook"
Cohesion: 0.33
Nodes (5): Preservation and source handling, Program isolation and persistence, Reports: supplied DOLE 2026 workbook, User workflow, Verification

### Community 55 - "app/page.tsx"
Cohesion: 0.13
Nodes (20): dynamic, LandingPage(), LandingNavDrawer(), NavDrawerCategory, NavDrawerItem, FacebookUpdatesSection(), OngoingTupadDemographicsSection(), PesoOrganizationalChart() (+12 more)

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
Cohesion: 0.08
Nodes (18): core, output, require, root, cacheRoot, dataDir, listener, load() (+10 more)

### Community 60 - "reseed-exact-522-beneficiaries.mjs"
Cohesion: 0.36
Nodes (7): DINGALAN_BARANGAYS, formatBday(), main(), normalizeBarangayName(), normalizeSitioName(), prisma, rawData

### Community 61 - "Stitch Design System & UI Screen Guide"
Cohesion: 0.40
Nodes (4): 1. How to Access and Edit in Stitch, 2. Included Local Artifacts, 3. How to Upload a Modified `DESIGN.md` to Stitch in the Future, Stitch Design System & UI Screen Guide

### Community 62 - "test-accomplishment-export-browser.mjs"
Cohesion: 0.40
Nodes (4): ExcelJS, fixture, programs, require

### Community 64 - "Guided ID camera"
Cohesion: 0.40
Nodes (4): Browser/privacy requirements, Capture flow, Guided ID camera, Verification

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
Cohesion: 0.08
Nodes (15): typescript, exported, card, module, paper, source, module, expected (+7 more)

### Community 70 - "update-flagged-beneficiaries.js"
Cohesion: 0.40
Nodes (3): flaggedReference, prisma, { PrismaClient }

### Community 71 - "ref_crypto"
Cohesion: 0.21
Nodes (6): jsqr, pdfjs-dist, prisma, metadata, WorkAreaAssignmentInquiryPage(), PublicWorkAssignmentLookupCard()

### Community 73 - "normalizeBarangayName"
Cohesion: 0.13
Nodes (26): date-fns, dynamic, GET(), PATCH(), dynamic, POST(), dynamic, POST() (+18 more)

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

### Community 81 - "beneficiaries/page.tsx"
Cohesion: 0.12
Nodes (25): main(), prisma, BeneficiariesMasterlistContent(), BeneficiariesMasterlistPage(), RestrictionsPage(), BarangaySummary, BeneficiarySummaryDropdown(), BeneficiarySummaryDropdownProps (+17 more)

### Community 82 - "ref_node_assert"
Cohesion: 0.05
Nodes (33): errors, require, login(), run(), errors, require, errors, require (+25 more)

### Community 83 - "Reusable QR slots and per-program scan history"
Cohesion: 0.40
Nodes (4): More than 522 beneficiaries, Offline devices, Reusable QR slots and per-program scan history, Verification

### Community 84 - "test-application-inbox-browser.mjs"
Cohesion: 0.29
Nodes (5): errors, fixture, record, requests, require

### Community 90 - "test-dole-reports.mjs"
Cohesion: 0.08
Nodes (21): IS_LOCAL_DEVELOPMENT, PRECACHE_ASSETS, api, base, cache, config, data, db (+13 more)

### Community 104 - "auth.ts"
Cohesion: 0.10
Nodes (19): dynamic, POST(), dynamic, POST(), dynamic, POST(), dynamic, generateTrackingCode() (+11 more)

### Community 107 - "update-522-sitios.mjs"
Cohesion: 0.47
Nodes (5): DINGALAN_BARANGAYS, main(), normalizeBarangayName(), normalizeSitioName(), prisma

### Community 109 - "Q: ayusin mo yung sa driver`s license kasi halos walang nababasa"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ayusin mo yung sa driver`s license kasi halos walang nababasa, Source Nodes

### Community 110 - "login/page.tsx"
Cohesion: 0.40
Nodes (5): buildPresetRoleGroups(), DEFAULT_ROLE_GROUPS, LoginPage(), PresetAccount, PresetRoleGroup

### Community 114 - "check-reference-slots.js"
Cohesion: 0.40
Nodes (3): prisma, { PrismaClient }, referenceSlots

## Knowledge Gaps
- **14 isolated node(s):** `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs`, `@types/jsonwebtoken`, `@types/jszip` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 850 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `@prisma/client` to `package.json`, `v1/beneficiaries/import/commit/route.ts`, `next`, `application-service.ts`, `export/route.ts`, `v1/beneficiaries/import/commit/route.ts`, `ref_path`, `compare-datasets.js`, `inspect-all-sources.js`, `work-assignment.ts`, `bcryptjs`, `import-final-522-beneficiaries.mjs`, `master-sync-all-data.js`, `getCurrentUser`, `fast-update-flagged.js`, `migrate-user-plain-password.js`, `test-program-qr-postgres.mjs`, `reseed-exact-522-beneficiaries.mjs`, `inspect-db.js`, `work-program-parser.ts`, `update-flagged-beneficiaries.js`, `ref_crypto`, `cleanup-test-users.mjs`, `test-matrix-and-sync.mjs`, `test-masterlist-import-postgres.mjs`, `detailed-consolidated-retrieval.mjs`, `beneficiaries/page.tsx`, `heal-qr-codes.mjs`, `inspect-flagged.js`, `test-offline-sync-resilience.mjs`, `test-dedicated-qr-retention.mjs`, `test-sorting-and-templates.mjs`, `cleanup-and-deduplicate.js`, `inspect-program-details.mjs`, `list-users-by-role.mjs`, `sync-disqualified-entry.mjs`, `test-landing-scanner.mjs`, `update-522-sitios.mjs`, `test-pg-counts.js`, `verify-official-qr-scanning.mjs`, `test-public-inquiry.mjs`, `test-program-crud.mjs`, `check-reference-slots.js`, `test-table-rules.mjs`, `inspect-db.mjs`, `check-sep20-evening.mjs`?**
  _High betweenness centrality (0.197) - this node is a cross-community bridge._
- **What connects `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `package.json`, `v1/beneficiaries/import/commit/route.ts`, `excel-importer.ts`, `getCurrentUser`, `dexie.ts`, `application-service.ts`, `captcha/route.ts`, `programs/[id]/page.tsx`, `react`, `export/route.ts`, `v1/beneficiaries/import/commit/route.ts`, `test-application-id-autofill.mjs`, `restrictions/import/route.ts`, `getCurrentUser`, `middleware.ts`, `restrictions/route.ts`, `FieldQrPassGeneratorCard.tsx`, `flag-replacement/route.ts`, `app/page.tsx`, `replacements/page.tsx`, `dingalan-groupings.ts`, `exceljs`, `layout.tsx`, `work-program-parser.ts`, `ref_crypto`, `normalizeBarangayName`, `stubs/page.tsx`, `beneficiaries/page.tsx`, `auth.ts`, `login/page.tsx`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **Should `v1/beneficiaries/import/commit/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06939890710382514 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `package.json`, `excel-importer.ts`, `next`, `application-schema.ts`, `dexie.ts`, `programs/[id]/page.tsx`, `v1/beneficiaries/import/commit/route.ts`, `test-roster-restriction-preview.mjs`, `ApplicationInbox.tsx`, `FieldQrPassGeneratorCard.tsx`, `effects/TextCubeLoader.tsx`, `app/page.tsx`, `replacements/page.tsx`, `dingalan-groupings.ts`, `layout.tsx`, `ref_crypto`, `stubs/page.tsx`, `beneficiaries/page.tsx`, `login/page.tsx`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._