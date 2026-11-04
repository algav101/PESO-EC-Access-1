# Graph Report - PESO-EC-Access-1  (2026-11-04)

## Corpus Check
- 316 files · ~919,941 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 32 file(s) not represented in the graph (top: .csv 26, .css 2, .example 1)

## Summary
- 1485 nodes · 3770 edges · 105 communities (81 shown, 24 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e1a615c5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- hasPermission
- qr-pass/route.ts
- dependencies
- useAuth
- next
- next
- application-schema.ts
- normalizeBarangayName
- orientation/page.tsx
- application-service.ts
- auth.ts
- test-application-workflow.mjs
- react
- programs/[id]/page.tsx
- prepare-ocr-assets.mjs
- identity-address.ts
- application-id-mapper.ts
- scripts
- local-id-reader.ts
- test-local-id-reader.mjs
- compilerOptions
- dingalan-groupings.ts
- generateBeneficiaryToken
- test-application-id-autofill.mjs
- ref_path
- Layout & Components
- @prisma/client
- utils.ts
- Layout & Components
- inspect-all-sources.js
- test-roster-restriction-preview.mjs
- ref_node_assert
- check-remote.js
- bcryptjs
- ref_fs
- browser-id-ocr.ts
- manifest.json
- @supabase/supabase-js
- import-final-522-beneficiaries.mjs
- master-sync-all-data.js
- ref_crypto
- restrictions/import/route.ts
- TUPAD application ID autofill and walk-in encoding
- stubs/page.tsx
- middleware.ts
- ApplicationInbox.tsx
- migration.sql
- restrictions/route.ts
- test-roster-restriction-browser.mjs
- effects/TextCubeLoader.tsx
- vercel.json
- excel-importer.ts
- check-reference-slots.js
- qrcode
- cleanup-and-deduplicate.js
- migrate-user-plain-password.js
- OfflineContext.tsx
- getCurrentUser
- useAuth
- users/import/route.ts
- Stitch Design System & UI Screen Guide
- check-sep20-evening.mjs
- inspect-db.js
- ocr/route.ts
- v1/beneficiaries/import/commit/route.ts
- test-application-inbox-browser.mjs
- work-program-parser.ts
- Online and walk-in application intake
- test-service-worker-cache.mjs
- update-flagged-beneficiaries.js
- matrix/page.tsx
- test-offline-sync-resilience.mjs
- inspect-flagged.js
- application-storage.ts
- inspect-sep21-data.mjs
- test-attendance-3hours.mjs
- inspect-db.mjs
- update-522-sitios.mjs
- test-masterlist-import-postgres.mjs
- IdUploadPanel.tsx
- push/route.ts
- dashboard/page.tsx
- extractProfileNumber
- xlsx
- test-program-crud.mjs
- engines
- test-template-parser.mjs
- tailwindcss
- login/page.tsx
- sw.js
- format1-stub-base-b64.ts
- applications/import/route.ts
- test-local-e2e.mjs
- test-landing-scanner.mjs
- test-public-inquiry.mjs
- test-sorting-and-templates.mjs
- test-table-rules.mjs
- Q: ayusin mo yung sa driver`s license kasi halos walang nababasa

## God Nodes (most connected - your core abstractions)
1. `getCurrentUser()` - 150 edges
2. `isAdminUser()` - 114 edges
3. `next` - 108 edges
4. `hasPermission()` - 108 edges
5. `logAudit()` - 83 edges
6. `react` - 74 edges
7. `useAuth()` - 69 edges
8. `prisma` - 68 edges
9. `lucide-react` - 64 edges
10. `normalizeBarangayName()` - 61 edges

## Surprising Connections (you probably didn't know these)
- `html()` --indirect_call--> `RosterRestrictionDetails()`  [INFERRED]
  test/test-roster-restriction-preview.mjs → src/components/beneficiaries/RosterRestrictionDetails.tsx
- `addressOf()` --calls--> `mapLocalIdentityText()`  [EXTRACTED]
  test/test-local-id-reader.mjs → src/lib/ocr/application-id-mapper.ts
- `mapped()` --calls--> `mapLocalIdentityText()`  [EXTRACTED]
  test/test-local-id-reader.mjs → src/lib/ocr/application-id-mapper.ts
- `selected()` --calls--> `mapLocalIdentityText()`  [EXTRACTED]
  test/test-local-id-reader.mjs → src/lib/ocr/application-id-mapper.ts
- `testApi()` --calls--> `signToken()`  [EXTRACTED]
  test/test-users-api.mjs → src/lib/auth.ts

## Import Cycles
- None detected.

## Communities (105 total, 24 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.09
Nodes (22): name, private, version, autoprefixer, clsx, dexie, dexie-react-hooks, @hookform/resolvers (+14 more)

### Community 1 - "hasPermission"
Cohesion: 0.09
Nodes (29): DELETE(), dynamic, PATCH(), DELETE(), generateElporControlNo(), PATCH(), POST(), DELETE() (+21 more)

### Community 2 - "qr-pass/route.ts"
Cohesion: 0.10
Nodes (28): exceljs, prisma, testExport(), dynamic, dynamic, GET(), dynamic, GET() (+20 more)

### Community 3 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, autoprefixer, bcryptjs, clsx, date-fns, dexie, dexie-react-hooks, exceljs (+33 more)

### Community 4 - "useAuth"
Cohesion: 0.10
Nodes (28): react, AdminApplicationsPage(), AuditLogsPage(), AdminInquiriesPage(), GET(), GET(), BalikPinasElporPortalPage(), DINGALAN_BARANGAYS (+20 more)

### Community 5 - "next"
Cohesion: 0.17
Nodes (10): next, dynamic, PATCH(), BeneficiaryProfilePage(), dynamic, DeleteBeneficiaryModal(), DeleteBeneficiaryModalProps, EditBeneficiaryButton() (+2 more)

### Community 6 - "next"
Cohesion: 0.07
Nodes (22): dynamic, GET(), dynamic, GET(), dynamic, GET(), dynamic, dynamic (+14 more)

### Community 7 - "application-schema.ts"
Cohesion: 0.09
Nodes (32): zod, WalkInEncodingPage(), OnlineTupadApplicationPage(), ApplicationForm(), ApplicationFormProps, DocumentField, FormErrors, MultiChoice() (+24 more)

### Community 8 - "normalizeBarangayName"
Cohesion: 0.16
Nodes (22): main(), prisma, GET(), BeneficiariesMasterlistContent(), BeneficiariesMasterlistPage(), AdminStubOverrideModal(), BarangaySummary, BeneficiarySummaryDropdown() (+14 more)

### Community 9 - "orientation/page.tsx"
Cohesion: 0.16
Nodes (22): html2canvas, OrientationContent(), OrientationPage(), FIELD_OPERATIONS, FieldScannerHubContent(), FieldScannerHubPage(), PayoutScannerPage(), StubDistributionContent() (+14 more)

### Community 10 - "application-service.ts"
Cohesion: 0.13
Nodes (23): dynamic, POST(), dynamic, POST(), dynamic, POST(), ApplicationWriteAction, isIdempotentReplay() (+15 more)

### Community 11 - "auth.ts"
Cohesion: 0.17
Nodes (12): dynamic, POST(), dynamic, GET(), dynamic, generateTrackingCode(), POST(), generateCaptchaChallenge() (+4 more)

### Community 12 - "test-application-workflow.mjs"
Cohesion: 0.08
Nodes (23): audits, cache, countQueries, deleted, detail, docs, encode, fakePrisma (+15 more)

### Community 13 - "react"
Cohesion: 0.21
Nodes (10): dynamic, LandingPage(), LandingNavDrawer(), NavDrawerCategory, NavDrawerItem, MigrantsCornerLandingSection(), PesoOrganizationalChart(), PublicInquiryMessageForm() (+2 more)

### Community 14 - "programs/[id]/page.tsx"
Cohesion: 0.14
Nodes (18): lucide-react, DINGALAN_BARANGAYS, UserManagementPage(), photosMemoryCache, PhotosPage(), ProgramDetailsHub(), ProgramsPage(), StatusBadge() (+10 more)

### Community 15 - "prepare-ocr-assets.mjs"
Cohesion: 0.15
Nodes (7): core, output, require, root, expected, require, require

### Community 16 - "identity-address.ts"
Cohesion: 0.31
Nodes (15): OcrTextLine, addressLike(), addressPiece(), addressStart(), barangayPattern(), escape(), IdentityAddress, nearBarangay() (+7 more)

### Community 17 - "application-id-mapper.ts"
Cohesion: 0.25
Nodes (22): calculateAge(), birthDateValue(), clean(), cleanLocalValue(), cleanPersonName(), explicitLabel(), fieldValue(), identityValue() (+14 more)

### Community 18 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, dev, lint, postinstall, prepare:ocr, prisma:generate, prisma:push (+9 more)

### Community 19 - "local-id-reader.ts"
Cohesion: 0.12
Nodes (19): ID_TYPES, MappedOcrSide, MergedOcrResult, NON_BIRTH_DATE_LABEL, ORDERED_NAME_LABEL, ADDRESS_LABEL, ADDRESS_STOP, genericNumbers (+11 more)

### Community 20 - "test-local-id-reader.mjs"
Cohesion: 0.05
Nodes (35): addressCrop, addressLines, addressOf(), backStatusRegions, birthCrop, certificate, certificateLayout, conflict (+27 more)

### Community 21 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx (+12 more)

### Community 22 - "dingalan-groupings.ts"
Cohesion: 0.28
Nodes (17): DEFAULT_10_DAY_ACTIVITIES, dynamic, POST(), FieldWorkProgramPage(), WorkProgramManagementPage(), DeploymentGroupingMatrix(), DeploymentGroupingMatrixProps, BarangayGroupingConfig (+9 more)

### Community 23 - "generateBeneficiaryToken"
Cohesion: 0.13
Nodes (20): dynamic, GET(), handleQrPassSearch(), POST(), dynamic, POST(), dynamic, POST() (+12 more)

### Community 24 - "test-application-id-autofill.mjs"
Cohesion: 0.11
Nodes (17): applicationFinalSchema, azurePrintedFields, clearFront, conflict, conflictingBack, dateOnly, incomplete, layoutAzure (+9 more)

### Community 25 - "ref_path"
Cohesion: 0.08
Nodes (11): __dirname, nextConfig, prisma, fs, path, { PrismaClient }, prisma, fs (+3 more)

### Community 26 - "Layout & Components"
Cohesion: 0.14
Nodes (13): 1. DICT GWT Utility Header, 2. Official Municipal Masthead, 3. Hero Citizen Announcement Card, 4. Telemetry Metric Strip, 5. Public Status Inquiry Module (`#inquiry`), 6. Work Area Assignment Lookup (`#work-assignment`), 7. Direct Feedback Desk (`#inquiry-form`), 8. DICT Standard GWT Footer (+5 more)

### Community 27 - "@prisma/client"
Cohesion: 0.05
Nodes (16): @prisma/client, prisma, prisma, prisma, flaggedReference, prisma, { PrismaClient }, prisma (+8 more)

### Community 28 - "utils.ts"
Cohesion: 0.13
Nodes (25): date-fns, dynamic, POST(), DailyAttendancePage(), SyncCenterPage(), AdminStubOverrideModalProps, REPLACEMENT_REASONS, CachedBeneficiary (+17 more)

### Community 29 - "Layout & Components"
Cohesion: 0.14
Nodes (13): 1. DICT GWT Utility Header, 2. Official Municipal Masthead, 3. Hero Citizen Announcement Card, 4. Telemetry Metric Strip, 5. Public Status Inquiry Module (`#inquiry`), 6. Work Area Assignment Lookup (`#work-assignment`), 7. Direct Feedback Desk (`#inquiry-form`), 8. DICT Standard GWT Footer (+5 more)

### Community 30 - "inspect-all-sources.js"
Cohesion: 0.11
Nodes (16): Database, db, fs, summary, tables, Database, db, fs (+8 more)

### Community 31 - "test-roster-restriction-preview.mjs"
Cohesion: 0.12
Nodes (15): react-dom, activeMarkup, book, buffer, cache, globalRoute, load(), names (+7 more)

### Community 32 - "ref_node_assert"
Cohesion: 0.18
Nodes (9): login(), run(), alerts, pageErrors, preview, require, rows, login() (+1 more)

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
Cohesion: 0.18
Nodes (23): tesseract.js, detectIdentityDocumentType(), active(), canvas(), context(), crop(), enhance(), fileCache (+15 more)

### Community 37 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 38 - "@supabase/supabase-js"
Cohesion: 0.50
Nodes (3): @supabase/supabase-js, supabase, supabaseAdmin

### Community 39 - "import-final-522-beneficiaries.mjs"
Cohesion: 0.36
Nodes (7): DINGALAN_BARANGAYS, main(), MONTH_NAME_MAP, normalizeBarangayName(), normalizeSitioName(), parseCSVLine(), prisma

### Community 40 - "master-sync-all-data.js"
Cohesion: 0.36
Nodes (7): chunkArray(), fs, main(), path, { PrismaClient }, toBool(), toDate()

### Community 41 - "ref_crypto"
Cohesion: 0.16
Nodes (10): jsqr, pdfjs-dist, prisma, DINGALAN_BARANGAYS, formatBday(), main(), normalizeBarangayName(), normalizeSitioName() (+2 more)

### Community 42 - "restrictions/import/route.ts"
Cohesion: 0.39
Nodes (7): addDaysToDate(), checkIsAppointive(), dynamic, maxDuration, parseDateToISO(), parseNameParts(), POST()

### Community 43 - "TUPAD application ID autofill and walk-in encoding"
Cohesion: 0.22
Nodes (8): Database migration, Local ID reading (default; no Azure key required), Number recovery and optional close-up, Optional Azure API, Required private storage configuration, TUPAD application ID autofill and walk-in encoding, Verification, What is implemented

### Community 44 - "stubs/page.tsx"
Cohesion: 0.21
Nodes (15): PrintTemplateMode, StubsContent(), StubsDesignerPage(), ETUPAD_BASE_IMAGE, ETupadCard, ETupadCardProps, Format1Stub, Format1StubProps (+7 more)

### Community 46 - "ApplicationInbox.tsx"
Cohesion: 0.12
Nodes (22): OnlineApplicationsPage(), WalkInSubmissionsPage(), details, dynamic, GET(), PATCH(), DELETE(), dynamic (+14 more)

### Community 47 - "migration.sql"
Cohesion: 0.33
Nodes (8): "TupadApplicationDocument", TupadApplicationDocument_applicationId_fieldName_idx, TupadApplicationDocument_uploadedById_idx, TupadApplicationRoster_applicationCode_key, TupadApplicationRoster_encodedById_idx, TupadApplicationRoster_idempotencyKey_key, TupadApplicationRoster_source_submissionStatus_idx, TupadApplicationRoster_submittedAt_idx

### Community 48 - "restrictions/route.ts"
Cohesion: 0.38
Nodes (6): DELETE(), dynamic, GET(), maskFullName(), parsePayoutDateToTimestamp(), POST()

### Community 49 - "test-roster-restriction-browser.mjs"
Cohesion: 0.29
Nodes (6): baseRow, errors, preview, program, require, rows

### Community 50 - "effects/TextCubeLoader.tsx"
Cohesion: 0.43
Nodes (3): Loading(), TextCubeLoader(), TextCubeLoaderProps

### Community 51 - "vercel.json"
Cohesion: 0.29
Nodes (6): buildCommand, framework, functions, src/app/api/**/*, $schema, maxDuration

### Community 52 - "excel-importer.ts"
Cohesion: 0.17
Nodes (14): dynamic, ExcelImportPage(), DEFAULT_EXEMPTION_REASONS, MasterlistUploadModal(), MasterlistUploadModalProps, displayDate(), RosterRestrictionDetails(), FINAL_BENEFICIARIES_CSV_TEMPLATE (+6 more)

### Community 53 - "check-reference-slots.js"
Cohesion: 0.40
Nodes (3): prisma, { PrismaClient }, referenceSlots

### Community 54 - "qrcode"
Cohesion: 0.40
Nodes (3): jspdf, qrcode, require

### Community 56 - "migrate-user-plain-password.js"
Cohesion: 0.50
Nodes (4): getPresetPassword(), main(), prisma, { PrismaClient }

### Community 57 - "OfflineContext.tsx"
Cohesion: 0.19
Nodes (13): metadata, RootLayout(), viewport, ServiceWorkerRegister(), AuthProvider(), OfflineContext, OfflineContextType, OfflineProvider() (+5 more)

### Community 58 - "getCurrentUser"
Cohesion: 0.06
Nodes (54): dynamic, GET(), POST(), dynamic, GET(), PATCH(), dynamic, POST() (+46 more)

### Community 59 - "useAuth"
Cohesion: 0.29
Nodes (13): ReplacementsContent(), ReplacementsPage(), ReportCenterPage(), BottomNav(), ClientLayout(), Navbar(), NavbarProps, DummyModule (+5 more)

### Community 60 - "users/import/route.ts"
Cohesion: 0.43
Nodes (6): DINGALAN_BARANGAYS, dynamic, normalizeBarangay(), normalizeRole(), parseCSVLines(), POST()

### Community 61 - "Stitch Design System & UI Screen Guide"
Cohesion: 0.40
Nodes (4): 1. How to Access and Edit in Stitch, 2. Included Local Artifacts, 3. How to Upload a Modified `DESIGN.md` to Stitch in the Future, Stitch Design System & UI Screen Guide

### Community 64 - "ocr/route.ts"
Cohesion: 0.20
Nodes (13): dynamic, isRateLimited(), maxDuration, POST(), providerMessage(), rateLimit, mergeOcrSides(), OcrSubject (+5 more)

### Community 65 - "v1/beneficiaries/import/commit/route.ts"
Cohesion: 0.24
Nodes (11): dynamic, ImportConflict, maxDuration, POST(), dynamic, maxDuration, POST(), BeneficiaryImportUpdate (+3 more)

### Community 66 - "test-application-inbox-browser.mjs"
Cohesion: 0.29
Nodes (5): errors, fixture, record, requests, require

### Community 67 - "work-program-parser.ts"
Cohesion: 0.22
Nodes (10): dynamic, POST(), DINGALAN_BARANGAYS, normalizeBarangay(), ParsedWorkProgramItem, parseWorkProgramBuffer(), WorkProgramPreviewResult, prisma (+2 more)

### Community 68 - "Online and walk-in application intake"
Cohesion: 0.33
Nodes (5): Admin review, Database and private storage, Online and walk-in application intake, Pages and roles, Verification

### Community 69 - "test-service-worker-cache.mjs"
Cohesion: 0.22
Nodes (4): typescript, module, production, source

### Community 70 - "update-flagged-beneficiaries.js"
Cohesion: 0.40
Nodes (3): flaggedReference, prisma, { PrismaClient }

### Community 71 - "matrix/page.tsx"
Cohesion: 0.26
Nodes (9): AttendanceMatrixContent(), AttendanceMatrixPage(), RestrictionsPage(), MultiSelectFilter(), MultiSelectFilterProps, MultiSelectOption, TableScrollWrapper(), TableScrollWrapperProps (+1 more)

### Community 74 - "application-storage.ts"
Cohesion: 0.24
Nodes (11): dynamic, GET(), ACCEPTED_APPLICATION_FILE_TYPES, MAX_APPLICATION_FILE_SIZE, APPLICATION_DOCUMENT_BUCKET, downloadApplicationDocument(), ensurePrivateBucket(), extensionFor() (+3 more)

### Community 78 - "update-522-sitios.mjs"
Cohesion: 0.47
Nodes (5): DINGALAN_BARANGAYS, main(), normalizeBarangayName(), normalizeSitioName(), prisma

### Community 79 - "test-masterlist-import-postgres.mjs"
Cohesion: 0.20
Nodes (8): cacheRoot, dataDir, get(), listener, load(), { PrismaClient }, require, root

### Community 80 - "IdUploadPanel.tsx"
Cohesion: 0.33
Nodes (9): FieldProps, FilePreview(), IdUploadPanel(), IdUploadPanelProps, OcrResponse, ApplicationFormValues, isAcceptedApplicationFile(), OcrAutofillStatus (+1 more)

### Community 81 - "push/route.ts"
Cohesion: 0.32
Nodes (6): dynamic, POST(), dynamic, POST(), formatBirthdayPin(), matchesBirthdayPin()

### Community 82 - "dashboard/page.tsx"
Cohesion: 0.50
Nodes (4): DashboardData, DashboardPage(), dynamic, getDashboardMetrics()

### Community 83 - "extractProfileNumber"
Cohesion: 0.46
Nodes (7): extractPhilSysNumber(), extractProfileNumber(), identityNumberRows(), normalizeNumberText(), NUMERIC_FORMATS, numericNumber(), combineLocalReadings()

### Community 84 - "xlsx"
Cohesion: 0.29
Nodes (3): xlsx, dynamic, dynamic

### Community 86 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, npm

### Community 87 - "test-template-parser.mjs"
Cohesion: 0.38
Nodes (6): DINGALAN_BARANGAYS, MONTH_NAME_MAP, normalizeBarangayName(), parseBeneficiaryExcelBuffer(), prisma, run()

### Community 89 - "login/page.tsx"
Cohesion: 0.40
Nodes (5): buildPresetRoleGroups(), DEFAULT_ROLE_GROUPS, LoginPage(), PresetAccount, PresetRoleGroup

### Community 98 - "applications/import/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, getVal(), POST()

### Community 109 - "Q: ayusin mo yung sa driver`s license kasi halos walang nababasa"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ayusin mo yung sa driver`s license kasi halos walang nababasa, Source Nodes

## Knowledge Gaps
- **14 isolated node(s):** `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs`, `@types/jsonwebtoken`, `@types/jszip` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 667 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `@prisma/client` to `package.json`, `qr-pass/route.ts`, `next`, `normalizeBarangayName`, `application-service.ts`, `ref_path`, `inspect-all-sources.js`, `bcryptjs`, `ref_fs`, `import-final-522-beneficiaries.mjs`, `master-sync-all-data.js`, `ref_crypto`, `ApplicationInbox.tsx`, `check-reference-slots.js`, `cleanup-and-deduplicate.js`, `migrate-user-plain-password.js`, `check-sep20-evening.mjs`, `inspect-db.js`, `v1/beneficiaries/import/commit/route.ts`, `work-program-parser.ts`, `update-flagged-beneficiaries.js`, `test-offline-sync-resilience.mjs`, `inspect-flagged.js`, `inspect-sep21-data.mjs`, `inspect-db.mjs`, `update-522-sitios.mjs`, `test-masterlist-import-postgres.mjs`, `test-program-crud.mjs`, `test-template-parser.mjs`, `test-local-e2e.mjs`, `test-landing-scanner.mjs`, `test-public-inquiry.mjs`, `test-sorting-and-templates.mjs`, `test-table-rules.mjs`?**
  _High betweenness centrality (0.254) - this node is a cross-community bridge._
- **What connects `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `package.json`, `hasPermission`, `qr-pass/route.ts`, `useAuth`, `next`, `normalizeBarangayName`, `orientation/page.tsx`, `application-service.ts`, `auth.ts`, `react`, `programs/[id]/page.tsx`, `dingalan-groupings.ts`, `generateBeneficiaryToken`, `utils.ts`, `restrictions/import/route.ts`, `stubs/page.tsx`, `middleware.ts`, `ApplicationInbox.tsx`, `restrictions/route.ts`, `excel-importer.ts`, `OfflineContext.tsx`, `getCurrentUser`, `useAuth`, `users/import/route.ts`, `ocr/route.ts`, `v1/beneficiaries/import/commit/route.ts`, `work-program-parser.ts`, `matrix/page.tsx`, `application-storage.ts`, `push/route.ts`, `dashboard/page.tsx`, `xlsx`, `login/page.tsx`, `applications/import/route.ts`?**
  _High betweenness centrality (0.153) - this node is a cross-community bridge._
- **Should `hasPermission` be split into smaller, more focused modules?**
  _Cohesion score 0.08888888888888889 - nodes in this community are weakly interconnected._
- **Why does `react` connect `useAuth` to `package.json`, `next`, `application-schema.ts`, `normalizeBarangayName`, `orientation/page.tsx`, `react`, `programs/[id]/page.tsx`, `dingalan-groupings.ts`, `utils.ts`, `test-roster-restriction-preview.mjs`, `stubs/page.tsx`, `ApplicationInbox.tsx`, `effects/TextCubeLoader.tsx`, `excel-importer.ts`, `OfflineContext.tsx`, `useAuth`, `matrix/page.tsx`, `IdUploadPanel.tsx`, `dashboard/page.tsx`, `login/page.tsx`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Should `qr-pass/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09957325746799431 - nodes in this community are weakly interconnected._