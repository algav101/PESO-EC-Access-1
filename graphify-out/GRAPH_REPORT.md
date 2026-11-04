# Graph Report - PESO-EC-Access-1  (2026-11-04)

## Corpus Check
- 339 files · ~936,331 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 32 file(s) not represented in the graph (top: .csv 26, .css 2, .example 1)

## Summary
- 1645 nodes · 4159 edges · 100 communities (82 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ab47e1da`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- dexie.ts
- qr-pass/route.ts
- dependencies
- useAuth
- logAudit
- next
- application-schema.ts
- ref_node_module
- utils.ts
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
- v1/beneficiaries/import/commit/route.ts
- isAdminUser
- test-application-id-autofill.mjs
- ref_path
- Layout & Components
- @prisma/client
- beneficiaries/route.ts
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
- prepare-dole-template.mjs
- restrictions/import/route.ts
- TUPAD application ID autofill and walk-in encoding
- stubs/page.tsx
- middleware.ts
- ApplicationInbox.tsx
- migration.sql
- restrictions/route.ts
- v1/applications/route.ts
- effects/TextCubeLoader.tsx
- vercel.json
- IdCameraCapture.tsx
- test-roster-restriction-browser.mjs
- Reports: supplied DOLE 2026 workbook
- cleanup-and-deduplicate.js
- migrate-user-plain-password.js
- layout.tsx
- getCurrentUser
- test-program-qr-postgres.mjs
- test-masterlist-import-errors-browser.mjs
- Stitch Design System & UI Screen Guide
- update-522-sitios.mjs
- inspect-db.js
- Guided ID camera
- ref_crypto
- test-application-inbox-browser.mjs
- work-program-parser.ts
- Online and walk-in application intake
- test-service-worker-cache.mjs
- update-flagged-beneficiaries.js
- beneficiaries/page.tsx
- test-offline-sync-resilience.mjs
- inspect-flagged.js
- application-storage.ts
- extractProfileNumber
- hasPermission
- users/import/route.ts
- fast-update-flagged.js
- test-masterlist-import-postgres.mjs
- IdUploadPanel.tsx
- prisma.ts
- test-program-qr-browser.mjs
- Reusable QR slots and per-program scan history
- inspect-all-sitios.mjs
- inspect-program-details.mjs
- inspect-sep21-data.mjs
- test-attendance-3hours.mjs
- test-landing-scanner.mjs
- FieldQrPassGeneratorCard.tsx
- test-dole-reports.mjs
- format1-stub-base-b64.ts
- cleanup-test-users.mjs
- Q: ayusin mo yung sa driver`s license kasi halos walang nababasa

## God Nodes (most connected - your core abstractions)
1. `getCurrentUser()` - 155 edges
2. `isAdminUser()` - 114 edges
3. `hasPermission()` - 112 edges
4. `next` - 109 edges
5. `logAudit()` - 81 edges
6. `react` - 76 edges
7. `prisma` - 71 edges
8. `useAuth()` - 69 edges
9. `lucide-react` - 66 edges
10. `normalizeBarangayName()` - 61 edges

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

## Communities (100 total, 18 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.07
Nodes (26): engines, node, npm, name, private, version, autoprefixer, clsx (+18 more)

### Community 1 - "dexie.ts"
Cohesion: 0.15
Nodes (21): SyncCenterPage(), OfflineContext, OfflineContextType, OfflineProvider(), CachedBeneficiary, CachedProgram, CachedWorkDay, CachedWorkProgramItem (+13 more)

### Community 2 - "qr-pass/route.ts"
Cohesion: 0.06
Nodes (48): exceljs, prisma, testExport(), dynamic, GET(), handleQrPassSearch(), POST(), dynamic (+40 more)

### Community 3 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, autoprefixer, bcryptjs, clsx, date-fns, dexie, dexie-react-hooks, exceljs (+33 more)

### Community 4 - "useAuth"
Cohesion: 0.10
Nodes (27): AdminApplicationsPage(), AdminInquiriesPage(), DINGALAN_BARANGAYS, SupplyItem, CASE_CATEGORIES, DINGALAN_BARANGAYS, OWWA_DMW_REQUIREMENTS, RequirementItem (+19 more)

### Community 5 - "logAudit"
Cohesion: 0.10
Nodes (18): dynamic, POST(), DELETE(), dynamic, PATCH(), POST(), DELETE(), dynamic (+10 more)

### Community 6 - "next"
Cohesion: 0.08
Nodes (17): next, dynamic, getVal(), POST(), dynamic, dynamic, dynamic, POST() (+9 more)

### Community 7 - "application-schema.ts"
Cohesion: 0.09
Nodes (31): zod, WalkInEncodingPage(), OnlineTupadApplicationPage(), ApplicationForm(), ApplicationFormProps, DocumentField, FormErrors, MultiChoice() (+23 more)

### Community 8 - "ref_node_module"
Cohesion: 0.15
Nodes (9): errors, files, programs, require, saved, writes, expected, require (+1 more)

### Community 9 - "utils.ts"
Cohesion: 0.20
Nodes (27): date-fns, DailyAttendancePage(), OrientationContent(), OrientationPage(), PayoutScannerPage(), photosMemoryCache, PhotosPage(), StubDistributionContent() (+19 more)

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
Cohesion: 0.14
Nodes (15): lucide-react, react, DINGALAN_BARANGAYS, dynamic, LandingPage(), EligibilityCheckerPage(), LandingNavDrawer(), NavDrawerCategory (+7 more)

### Community 14 - "programs/[id]/page.tsx"
Cohesion: 0.15
Nodes (19): AuditLogsPage(), DINGALAN_BARANGAYS, UserManagementPage(), ProgramDetailsHub(), ProgramsPage(), ReplacementsContent(), ReplacementsPage(), StatusBadge() (+11 more)

### Community 15 - "prepare-ocr-assets.mjs"
Cohesion: 0.25
Nodes (4): core, output, require, root

### Community 16 - "identity-address.ts"
Cohesion: 0.28
Nodes (16): ADDRESS_LABEL, ADDRESS_STOP, addressLike(), addressPiece(), addressStart(), barangayPattern(), escape(), IdentityAddress (+8 more)

### Community 17 - "application-id-mapper.ts"
Cohesion: 0.19
Nodes (27): calculateAge(), applyOcrAutofill(), birthDateValue(), clean(), cleanLocalValue(), cleanPersonName(), explicitLabel(), fieldValue() (+19 more)

### Community 18 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, dev, lint, postinstall, prepare:ocr, prisma:generate, prisma:push (+9 more)

### Community 19 - "local-id-reader.ts"
Cohesion: 0.13
Nodes (18): ID_TYPES, MappedOcrSide, MergedOcrResult, NON_BIRTH_DATE_LABEL, ORDERED_NAME_LABEL, genericNumbers, getIdentityProfile(), IdentityDocumentType (+10 more)

### Community 20 - "test-local-id-reader.mjs"
Cohesion: 0.05
Nodes (34): run(), addressCrop, addressLines, backStatusRegions, birthCrop, certificate, certificateLayout, conflict (+26 more)

### Community 21 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx (+12 more)

### Community 22 - "v1/beneficiaries/import/commit/route.ts"
Cohesion: 0.08
Nodes (51): dynamic, ImportConflict, maxDuration, POST(), dynamic, GET(), dynamic, maxDuration (+43 more)

### Community 23 - "isAdminUser"
Cohesion: 0.11
Nodes (28): dynamic, GET(), POST(), dynamic, GET(), PATCH(), DELETE(), generateElporControlNo() (+20 more)

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
Cohesion: 0.04
Nodes (21): @prisma/client, prisma, prisma, { PrismaClient }, referenceSlots, prisma, prisma, prisma (+13 more)

### Community 28 - "beneficiaries/route.ts"
Cohesion: 0.16
Nodes (12): dynamic, POST(), DELETE(), dynamic, GET(), PATCH(), POST(), dynamic (+4 more)

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
Cohesion: 0.12
Nodes (10): jspdf, login(), run(), errors, require, require, production, source (+2 more)

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
Nodes (24): tesseract.js, detectIdentityDocumentType(), OcrSubject, active(), canvas(), context(), crop(), enhance() (+16 more)

### Community 37 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 38 - "@supabase/supabase-js"
Cohesion: 0.33
Nodes (3): @supabase/supabase-js, supabase, supabaseAdmin

### Community 39 - "import-final-522-beneficiaries.mjs"
Cohesion: 0.36
Nodes (7): DINGALAN_BARANGAYS, main(), MONTH_NAME_MAP, normalizeBarangayName(), normalizeSitioName(), parseCSVLine(), prisma

### Community 40 - "master-sync-all-data.js"
Cohesion: 0.36
Nodes (7): chunkArray(), fs, main(), path, { PrismaClient }, toBool(), toDate()

### Community 41 - "prepare-dole-template.mjs"
Cohesion: 0.18
Nodes (9): jszip, cache, load(), original, output, require, review, root (+1 more)

### Community 42 - "restrictions/import/route.ts"
Cohesion: 0.39
Nodes (7): addDaysToDate(), checkIsAppointive(), dynamic, maxDuration, parseDateToISO(), parseNameParts(), POST()

### Community 43 - "TUPAD application ID autofill and walk-in encoding"
Cohesion: 0.22
Nodes (8): Database migration, Local ID reading (default; no Azure key required), Number recovery and optional close-up, Optional Azure API, Required private storage configuration, TUPAD application ID autofill and walk-in encoding, Verification, What is implemented

### Community 44 - "stubs/page.tsx"
Cohesion: 0.22
Nodes (14): PrintTemplateMode, StubsContent(), StubsDesignerPage(), ETUPAD_BASE_IMAGE, ETupadCard, ETupadCardProps, Format1Stub, Format1StubProps (+6 more)

### Community 46 - "ApplicationInbox.tsx"
Cohesion: 0.19
Nodes (12): OnlineApplicationsPage(), WalkInSubmissionsPage(), ApplicationInbox(), ApplicationRecord, dateText(), InboxData, sections, valueText() (+4 more)

### Community 47 - "migration.sql"
Cohesion: 0.33
Nodes (8): "TupadApplicationDocument", TupadApplicationDocument_applicationId_fieldName_idx, TupadApplicationDocument_uploadedById_idx, TupadApplicationRoster_applicationCode_key, TupadApplicationRoster_encodedById_idx, TupadApplicationRoster_idempotencyKey_key, TupadApplicationRoster_source_submissionStatus_idx, TupadApplicationRoster_submittedAt_idx

### Community 48 - "restrictions/route.ts"
Cohesion: 0.38
Nodes (6): DELETE(), dynamic, GET(), maskFullName(), parsePayoutDateToTimestamp(), POST()

### Community 49 - "v1/applications/route.ts"
Cohesion: 0.25
Nodes (9): details, dynamic, GET(), PATCH(), DELETE(), dynamic, GET(), isIntakeSource() (+1 more)

### Community 50 - "effects/TextCubeLoader.tsx"
Cohesion: 0.43
Nodes (3): Loading(), TextCubeLoader(), TextCubeLoaderProps

### Community 51 - "vercel.json"
Cohesion: 0.29
Nodes (6): buildCommand, framework, functions, src/app/api/**/*, $schema, maxDuration

### Community 52 - "IdCameraCapture.tsx"
Cohesion: 0.35
Nodes (9): cameraError(), IdCameraCapture(), Props, CameraRect, getCameraGuideRect(), getCameraSourceCrop(), getIdCameraPreset(), ID_CAMERA_GUIDES (+1 more)

### Community 53 - "test-roster-restriction-browser.mjs"
Cohesion: 0.29
Nodes (6): baseRow, errors, preview, program, require, rows

### Community 54 - "Reports: supplied DOLE 2026 workbook"
Cohesion: 0.33
Nodes (5): Preservation and source handling, Program isolation and persistence, Reports: supplied DOLE 2026 workbook, User workflow, Verification

### Community 56 - "migrate-user-plain-password.js"
Cohesion: 0.50
Nodes (4): getPresetPassword(), main(), prisma, { PrismaClient }

### Community 57 - "layout.tsx"
Cohesion: 0.31
Nodes (5): metadata, RootLayout(), viewport, ServiceWorkerRegister(), AuthProvider()

### Community 58 - "getCurrentUser"
Cohesion: 0.09
Nodes (25): dynamic, GET(), DELETE(), dynamic, GET(), PATCH(), dynamic, GET() (+17 more)

### Community 59 - "test-program-qr-postgres.mjs"
Cohesion: 0.22
Nodes (7): cacheRoot, dataDir, listener, load(), { PrismaClient }, require, root

### Community 60 - "test-masterlist-import-errors-browser.mjs"
Cohesion: 0.33
Nodes (5): alerts, pageErrors, preview, require, rows

### Community 61 - "Stitch Design System & UI Screen Guide"
Cohesion: 0.40
Nodes (4): 1. How to Access and Edit in Stitch, 2. Included Local Artifacts, 3. How to Upload a Modified `DESIGN.md` to Stitch in the Future, Stitch Design System & UI Screen Guide

### Community 62 - "update-522-sitios.mjs"
Cohesion: 0.47
Nodes (5): DINGALAN_BARANGAYS, main(), normalizeBarangayName(), normalizeSitioName(), prisma

### Community 64 - "Guided ID camera"
Cohesion: 0.40
Nodes (4): Browser/privacy requirements, Capture flow, Guided ID camera, Verification

### Community 65 - "ref_crypto"
Cohesion: 0.16
Nodes (10): jsqr, pdfjs-dist, prisma, DINGALAN_BARANGAYS, formatBday(), main(), normalizeBarangayName(), normalizeSitioName() (+2 more)

### Community 66 - "test-application-inbox-browser.mjs"
Cohesion: 0.29
Nodes (5): errors, fixture, record, requests, require

### Community 67 - "work-program-parser.ts"
Cohesion: 0.10
Nodes (18): xlsx, dynamic, dynamic, DINGALAN_BARANGAYS, normalizeBarangay(), ParsedBarangayWorkProgram, ParsedWorkProgramItem, parseWorkProgramBuffer() (+10 more)

### Community 68 - "Online and walk-in application intake"
Cohesion: 0.33
Nodes (5): Admin review, Database and private storage, Online and walk-in application intake, Pages and roles, Verification

### Community 69 - "test-service-worker-cache.mjs"
Cohesion: 0.14
Nodes (7): typescript, card, module, paper, source, module, require

### Community 70 - "update-flagged-beneficiaries.js"
Cohesion: 0.40
Nodes (3): flaggedReference, prisma, { PrismaClient }

### Community 71 - "beneficiaries/page.tsx"
Cohesion: 0.07
Nodes (59): main(), prisma, DEFAULT_10_DAY_ACTIVITIES, dynamic, POST(), AttendanceMatrixContent(), AttendanceMatrixPage(), BeneficiariesMasterlistContent() (+51 more)

### Community 74 - "application-storage.ts"
Cohesion: 0.22
Nodes (13): dynamic, GET(), ACCEPTED_APPLICATION_FILE_TYPES, isAcceptedApplicationFile(), MAX_APPLICATION_FILE_SIZE, APPLICATION_DOCUMENT_BUCKET, downloadApplicationDocument(), ensurePrivateBucket() (+5 more)

### Community 75 - "extractProfileNumber"
Cohesion: 0.43
Nodes (7): extractPhilSysNumber(), OcrTextLine, extractProfileNumber(), identityNumberRows(), normalizeNumberText(), NUMERIC_FORMATS, numericNumber()

### Community 76 - "hasPermission"
Cohesion: 0.10
Nodes (23): DELETE(), dynamic, PATCH(), dynamic, GET(), dynamic, GET(), dynamic (+15 more)

### Community 77 - "users/import/route.ts"
Cohesion: 0.43
Nodes (6): DINGALAN_BARANGAYS, dynamic, normalizeBarangay(), normalizeRole(), parseCSVLines(), POST()

### Community 78 - "fast-update-flagged.js"
Cohesion: 0.40
Nodes (3): flaggedReference, prisma, { PrismaClient }

### Community 79 - "test-masterlist-import-postgres.mjs"
Cohesion: 0.22
Nodes (8): cacheRoot, dataDir, get(), listener, load(), { PrismaClient }, require, root

### Community 80 - "IdUploadPanel.tsx"
Cohesion: 0.36
Nodes (8): FieldProps, FilePreview(), IdUploadPanel(), IdUploadPanelProps, OcrResponse, ApplicationFormValues, OcrAutofillStatus, OcrConflict

### Community 81 - "prisma.ts"
Cohesion: 0.12
Nodes (25): dynamic, POST(), dynamic, GET(), dynamic, POST(), dynamic, POST() (+17 more)

### Community 82 - "test-program-qr-browser.mjs"
Cohesion: 0.29
Nodes (5): calls, errors, programs, require, roster

### Community 83 - "Reusable QR slots and per-program scan history"
Cohesion: 0.40
Nodes (4): More than 522 beneficiaries, Offline devices, Reusable QR slots and per-program scan history, Verification

### Community 89 - "FieldQrPassGeneratorCard.tsx"
Cohesion: 0.14
Nodes (17): html2canvas, qrcode, FIELD_OPERATIONS, FieldScannerHubContent(), FieldScannerHubPage(), buildPresetRoleGroups(), DEFAULT_ROLE_GROUPS, LoginPage() (+9 more)

### Community 90 - "test-dole-reports.mjs"
Cohesion: 0.08
Nodes (21): IS_LOCAL_DEVELOPMENT, PRECACHE_ASSETS, api, base, cache, config, data, db (+13 more)

### Community 109 - "Q: ayusin mo yung sa driver`s license kasi halos walang nababasa"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ayusin mo yung sa driver`s license kasi halos walang nababasa, Source Nodes

## Knowledge Gaps
- **14 isolated node(s):** `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs`, `@types/jsonwebtoken`, `@types/jszip` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 740 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `@prisma/client` to `package.json`, `qr-pass/route.ts`, `application-service.ts`, `v1/beneficiaries/import/commit/route.ts`, `ref_path`, `inspect-all-sources.js`, `bcryptjs`, `ref_fs`, `@supabase/supabase-js`, `import-final-522-beneficiaries.mjs`, `master-sync-all-data.js`, `v1/applications/route.ts`, `cleanup-and-deduplicate.js`, `migrate-user-plain-password.js`, `test-program-qr-postgres.mjs`, `update-522-sitios.mjs`, `inspect-db.js`, `ref_crypto`, `work-program-parser.ts`, `update-flagged-beneficiaries.js`, `beneficiaries/page.tsx`, `test-offline-sync-resilience.mjs`, `inspect-flagged.js`, `fast-update-flagged.js`, `test-masterlist-import-postgres.mjs`, `prisma.ts`, `inspect-all-sitios.mjs`, `inspect-program-details.mjs`, `inspect-sep21-data.mjs`, `test-landing-scanner.mjs`, `cleanup-test-users.mjs`?**
  _High betweenness centrality (0.238) - this node is a cross-community bridge._
- **What connects `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `package.json`, `qr-pass/route.ts`, `useAuth`, `logAudit`, `utils.ts`, `application-service.ts`, `auth.ts`, `react`, `programs/[id]/page.tsx`, `v1/beneficiaries/import/commit/route.ts`, `isAdminUser`, `test-application-id-autofill.mjs`, `beneficiaries/route.ts`, `restrictions/import/route.ts`, `stubs/page.tsx`, `middleware.ts`, `restrictions/route.ts`, `v1/applications/route.ts`, `layout.tsx`, `getCurrentUser`, `work-program-parser.ts`, `beneficiaries/page.tsx`, `application-storage.ts`, `hasPermission`, `users/import/route.ts`, `prisma.ts`, `FieldQrPassGeneratorCard.tsx`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Should `qr-pass/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0574400723654455 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `package.json`, `dexie.ts`, `qr-pass/route.ts`, `useAuth`, `next`, `beneficiaries/page.tsx`, `application-schema.ts`, `utils.ts`, `stubs/page.tsx`, `programs/[id]/page.tsx`, `ApplicationInbox.tsx`, `IdUploadPanel.tsx`, `effects/TextCubeLoader.tsx`, `IdCameraCapture.tsx`, `v1/beneficiaries/import/commit/route.ts`, `FieldQrPassGeneratorCard.tsx`, `test-roster-restriction-preview.mjs`, `layout.tsx`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._