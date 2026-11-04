# Graph Report - PESO-EC-Access-1  (2026-11-04)

## Corpus Check
- 329 files · ~927,516 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 32 file(s) not represented in the graph (top: .csv 26, .css 2, .example 1)

## Summary
- 1552 nodes · 3940 edges · 107 communities (82 shown, 25 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `860dfe32`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- stubs/route.ts
- qr-pass/route.ts
- dependencies
- useAuth
- logAudit
- next
- application-schema.ts
- isAdminUser
- normalizeBarangayName
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
- excel-importer.ts
- hasPermission
- test-application-id-autofill.mjs
- ref_path
- Layout & Components
- @prisma/client
- ocr/route.ts
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
- excel-exporter.ts
- restrictions/import/route.ts
- TUPAD application ID autofill and walk-in encoding
- stubs/page.tsx
- middleware.ts
- ApplicationInbox.tsx
- migration.sql
- restrictions/route.ts
- beneficiaries/[id]/page.tsx
- effects/TextCubeLoader.tsx
- vercel.json
- IdCameraCapture.tsx
- check-reference-slots.js
- qrcode
- cleanup-and-deduplicate.js
- migrate-user-plain-password.js
- layout.tsx
- getCurrentUser
- test-program-qr-postgres.mjs
- test-masterlist-import-errors-browser.mjs
- Stitch Design System & UI Screen Guide
- check-sep20-evening.mjs
- inspect-db.js
- Guided ID camera
- reseed-exact-522-beneficiaries.mjs
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
- v1/beneficiaries/import/preview/route.ts
- users/import/route.ts
- restore-to-postgres.js
- test-masterlist-import-postgres.mjs
- IdUploadPanel.tsx
- verify-birthday/route.ts
- test-program-qr-browser.mjs
- Reusable QR slots and per-program scan history
- dashboard/page.tsx
- test-program-crud.mjs
- engines
- records/route.ts
- tailwindcss
- FieldQrPassGeneratorCard.tsx
- sw.js
- format1-stub-base-b64.ts
- test-matrix-and-sync.mjs
- test-dedicated-qr-retention.mjs
- cleanup-test-users.mjs
- test-public-inquiry.mjs
- detailed-consolidated-retrieval.mjs
- inspect-db.mjs
- test-pg-counts.js
- test-final-masterlist-and-work-program.mjs
- Q: ayusin mo yung sa driver`s license kasi halos walang nababasa

## God Nodes (most connected - your core abstractions)
1. `getCurrentUser()` - 152 edges
2. `isAdminUser()` - 114 edges
3. `hasPermission()` - 112 edges
4. `next` - 109 edges
5. `logAudit()` - 79 edges
6. `react` - 75 edges
7. `prisma` - 70 edges
8. `useAuth()` - 69 edges
9. `lucide-react` - 65 edges
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
- `main()` --calls--> `normalizeBarangayName()`  [EXTRACTED]
  scripts/unify-all-sitios-and-puroks.mjs → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (107 total, 25 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.08
Nodes (23): name, private, version, autoprefixer, clsx, dexie, dexie-react-hooks, @hookform/resolvers (+15 more)

### Community 2 - "qr-pass/route.ts"
Cohesion: 0.07
Nodes (42): exceljs, dynamic, ImportConflict, maxDuration, POST(), dynamic, GET(), handleQrPassSearch() (+34 more)

### Community 3 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, autoprefixer, bcryptjs, clsx, date-fns, dexie, dexie-react-hooks, exceljs (+33 more)

### Community 4 - "useAuth"
Cohesion: 0.10
Nodes (33): next, GET(), GET(), BalikPinasElporPortalPage(), DINGALAN_BARANGAYS, SupplyItem, CASE_CATEGORIES, DINGALAN_BARANGAYS (+25 more)

### Community 5 - "logAudit"
Cohesion: 0.08
Nodes (27): dynamic, POST(), dynamic, POST(), dynamic, POST(), DELETE(), dynamic (+19 more)

### Community 6 - "next"
Cohesion: 0.08
Nodes (19): dynamic, GET(), dynamic, getVal(), POST(), dynamic, GET(), dynamic (+11 more)

### Community 7 - "application-schema.ts"
Cohesion: 0.10
Nodes (29): zod, OnlineTupadApplicationPage(), ApplicationForm(), ApplicationFormProps, DocumentField, FormErrors, MultiChoice(), Section() (+21 more)

### Community 8 - "isAdminUser"
Cohesion: 0.29
Nodes (18): DEFAULT_10_DAY_ACTIVITIES, dynamic, POST(), FieldWorkProgramPage(), WorkProgramManagementPage(), DeploymentGroupingMatrix(), DeploymentGroupingMatrixProps, BarangayGroupingConfig (+10 more)

### Community 9 - "normalizeBarangayName"
Cohesion: 0.07
Nodes (73): date-fns, runTests(), validateDuration(), dynamic, POST(), dynamic, GET(), dynamic (+65 more)

### Community 10 - "application-service.ts"
Cohesion: 0.14
Nodes (22): dynamic, POST(), dynamic, POST(), dynamic, POST(), applicationDraftSchema, DOCUMENT_FIELDS (+14 more)

### Community 11 - "auth.ts"
Cohesion: 0.17
Nodes (12): dynamic, POST(), dynamic, GET(), dynamic, generateTrackingCode(), POST(), generateCaptchaChallenge() (+4 more)

### Community 12 - "test-application-workflow.mjs"
Cohesion: 0.08
Nodes (23): audits, cache, countQueries, deleted, detail, docs, encode, fakePrisma (+15 more)

### Community 13 - "react"
Cohesion: 0.13
Nodes (15): lucide-react, react, AdminApplicationsPage(), AdminInquiriesPage(), dynamic, LandingPage(), EligibilityCheckerPage(), LandingNavDrawer() (+7 more)

### Community 14 - "programs/[id]/page.tsx"
Cohesion: 0.19
Nodes (15): AuditLogsPage(), DINGALAN_BARANGAYS, UserManagementPage(), ExcelImportPage(), ProgramDetailsHub(), ProgramsPage(), StatusBadge(), StatusBadgeProps (+7 more)

### Community 15 - "prepare-ocr-assets.mjs"
Cohesion: 0.25
Nodes (4): core, output, require, root

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

### Community 22 - "excel-importer.ts"
Cohesion: 0.17
Nodes (13): dynamic, DEFAULT_EXEMPTION_REASONS, MasterlistUploadModal(), MasterlistUploadModalProps, displayDate(), RosterRestrictionDetails(), FINAL_BENEFICIARIES_CSV_TEMPLATE, ImportPreviewResult (+5 more)

### Community 23 - "hasPermission"
Cohesion: 0.08
Nodes (30): DELETE(), dynamic, PATCH(), DELETE(), generateElporControlNo(), PATCH(), POST(), DELETE() (+22 more)

### Community 24 - "test-application-id-autofill.mjs"
Cohesion: 0.10
Nodes (19): ApplicationWriteAction, isIdempotentReplay(), applicationFinalSchema, azurePrintedFields, clearFront, conflict, conflictingBack, dateOnly (+11 more)

### Community 25 - "ref_path"
Cohesion: 0.08
Nodes (11): __dirname, nextConfig, jsqr, pdfjs-dist, prisma, fs, path, { PrismaClient } (+3 more)

### Community 26 - "Layout & Components"
Cohesion: 0.14
Nodes (13): 1. DICT GWT Utility Header, 2. Official Municipal Masthead, 3. Hero Citizen Announcement Card, 4. Telemetry Metric Strip, 5. Public Status Inquiry Module (`#inquiry`), 6. Work Area Assignment Lookup (`#work-assignment`), 7. Direct Feedback Desk (`#inquiry-form`), 8. DICT Standard GWT Footer (+5 more)

### Community 27 - "@prisma/client"
Cohesion: 0.05
Nodes (17): @prisma/client, prisma, flaggedReference, prisma, { PrismaClient }, prisma, prisma, prisma (+9 more)

### Community 28 - "ocr/route.ts"
Cohesion: 0.20
Nodes (13): dynamic, isRateLimited(), maxDuration, POST(), providerMessage(), rateLimit, mergeOcrSides(), OcrSubject (+5 more)

### Community 29 - "Layout & Components"
Cohesion: 0.14
Nodes (13): 1. DICT GWT Utility Header, 2. Official Municipal Masthead, 3. Hero Citizen Announcement Card, 4. Telemetry Metric Strip, 5. Public Status Inquiry Module (`#inquiry`), 6. Work Area Assignment Lookup (`#work-assignment`), 7. Direct Feedback Desk (`#inquiry-form`), 8. DICT Standard GWT Footer (+5 more)

### Community 30 - "inspect-all-sources.js"
Cohesion: 0.11
Nodes (16): Database, db, fs, summary, tables, Database, db, fs (+8 more)

### Community 31 - "test-roster-restriction-preview.mjs"
Cohesion: 0.13
Nodes (14): activeMarkup, book, buffer, cache, globalRoute, load(), names, { parseBeneficiaryExcelBuffer } (+6 more)

### Community 32 - "ref_node_assert"
Cohesion: 0.14
Nodes (11): errors, require, require, baseRow, errors, preview, program, require (+3 more)

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
Cohesion: 0.33
Nodes (3): @supabase/supabase-js, supabase, supabaseAdmin

### Community 39 - "import-final-522-beneficiaries.mjs"
Cohesion: 0.18
Nodes (12): DINGALAN_BARANGAYS, main(), MONTH_NAME_MAP, normalizeBarangayName(), normalizeSitioName(), parseCSVLine(), prisma, DINGALAN_BARANGAYS (+4 more)

### Community 40 - "master-sync-all-data.js"
Cohesion: 0.36
Nodes (7): chunkArray(), fs, main(), path, { PrismaClient }, toBool(), toDate()

### Community 41 - "excel-exporter.ts"
Cohesion: 0.37
Nodes (10): prisma, testExport(), dynamic, GET(), generateAccomplishmentExcel(), generateAttendanceExcel(), generateOrientationExcel(), generatePayoutExcel() (+2 more)

### Community 42 - "restrictions/import/route.ts"
Cohesion: 0.39
Nodes (7): addDaysToDate(), checkIsAppointive(), dynamic, maxDuration, parseDateToISO(), parseNameParts(), POST()

### Community 43 - "TUPAD application ID autofill and walk-in encoding"
Cohesion: 0.22
Nodes (8): Database migration, Local ID reading (default; no Azure key required), Number recovery and optional close-up, Optional Azure API, Required private storage configuration, TUPAD application ID autofill and walk-in encoding, Verification, What is implemented

### Community 44 - "stubs/page.tsx"
Cohesion: 0.17
Nodes (17): PrintTemplateMode, StubsContent(), StubsDesignerPage(), ETUPAD_BASE_IMAGE, ETupadCard, ETupadCardProps, Format1Stub, Format1StubProps (+9 more)

### Community 46 - "ApplicationInbox.tsx"
Cohesion: 0.11
Nodes (22): OnlineApplicationsPage(), WalkInSubmissionsPage(), details, dynamic, GET(), PATCH(), dynamic, GET() (+14 more)

### Community 47 - "migration.sql"
Cohesion: 0.33
Nodes (8): "TupadApplicationDocument", TupadApplicationDocument_applicationId_fieldName_idx, TupadApplicationDocument_uploadedById_idx, TupadApplicationRoster_applicationCode_key, TupadApplicationRoster_encodedById_idx, TupadApplicationRoster_idempotencyKey_key, TupadApplicationRoster_source_submissionStatus_idx, TupadApplicationRoster_submittedAt_idx

### Community 48 - "restrictions/route.ts"
Cohesion: 0.38
Nodes (6): DELETE(), dynamic, GET(), maskFullName(), parsePayoutDateToTimestamp(), POST()

### Community 49 - "beneficiaries/[id]/page.tsx"
Cohesion: 0.23
Nodes (9): BeneficiaryProfilePage(), dynamic, DeleteBeneficiaryModal(), DeleteBeneficiaryModalProps, EditBeneficiaryButton(), EditBeneficiaryButtonProps, EditBeneficiaryModal(), EditBeneficiaryModalProps (+1 more)

### Community 50 - "effects/TextCubeLoader.tsx"
Cohesion: 0.43
Nodes (3): Loading(), TextCubeLoader(), TextCubeLoaderProps

### Community 51 - "vercel.json"
Cohesion: 0.29
Nodes (6): buildCommand, framework, functions, src/app/api/**/*, $schema, maxDuration

### Community 52 - "IdCameraCapture.tsx"
Cohesion: 0.30
Nodes (10): react-dom, cameraError(), IdCameraCapture(), Props, CameraRect, getCameraGuideRect(), getCameraSourceCrop(), getIdCameraPreset() (+2 more)

### Community 53 - "check-reference-slots.js"
Cohesion: 0.40
Nodes (3): prisma, { PrismaClient }, referenceSlots

### Community 54 - "qrcode"
Cohesion: 0.40
Nodes (3): jspdf, qrcode, require

### Community 56 - "migrate-user-plain-password.js"
Cohesion: 0.50
Nodes (4): getPresetPassword(), main(), prisma, { PrismaClient }

### Community 57 - "layout.tsx"
Cohesion: 0.31
Nodes (5): metadata, RootLayout(), viewport, ServiceWorkerRegister(), AuthProvider()

### Community 58 - "getCurrentUser"
Cohesion: 0.10
Nodes (25): dynamic, GET(), POST(), DELETE(), dynamic, GET(), PATCH(), DELETE() (+17 more)

### Community 59 - "test-program-qr-postgres.mjs"
Cohesion: 0.22
Nodes (7): cacheRoot, dataDir, listener, load(), { PrismaClient }, require, root

### Community 60 - "test-masterlist-import-errors-browser.mjs"
Cohesion: 0.33
Nodes (5): alerts, pageErrors, preview, require, rows

### Community 61 - "Stitch Design System & UI Screen Guide"
Cohesion: 0.40
Nodes (4): 1. How to Access and Edit in Stitch, 2. Included Local Artifacts, 3. How to Upload a Modified `DESIGN.md` to Stitch in the Future, Stitch Design System & UI Screen Guide

### Community 64 - "Guided ID camera"
Cohesion: 0.40
Nodes (4): Browser/privacy requirements, Capture flow, Guided ID camera, Verification

### Community 65 - "reseed-exact-522-beneficiaries.mjs"
Cohesion: 0.36
Nodes (7): DINGALAN_BARANGAYS, formatBday(), main(), normalizeBarangayName(), normalizeSitioName(), prisma, rawData

### Community 66 - "test-application-inbox-browser.mjs"
Cohesion: 0.29
Nodes (5): errors, fixture, record, requests, require

### Community 67 - "work-program-parser.ts"
Cohesion: 0.09
Nodes (20): xlsx, dynamic, dynamic, POST(), dynamic, DINGALAN_BARANGAYS, normalizeBarangay(), ParsedBarangayWorkProgram (+12 more)

### Community 68 - "Online and walk-in application intake"
Cohesion: 0.33
Nodes (5): Admin review, Database and private storage, Online and walk-in application intake, Pages and roles, Verification

### Community 69 - "test-service-worker-cache.mjs"
Cohesion: 0.10
Nodes (11): typescript, card, module, paper, source, module, expected, require (+3 more)

### Community 70 - "update-flagged-beneficiaries.js"
Cohesion: 0.40
Nodes (3): flaggedReference, prisma, { PrismaClient }

### Community 71 - "beneficiaries/page.tsx"
Cohesion: 0.10
Nodes (30): main(), prisma, AttendanceMatrixContent(), AttendanceMatrixPage(), BeneficiariesMasterlistContent(), BeneficiariesMasterlistPage(), ReplacementsContent(), ReplacementsPage() (+22 more)

### Community 74 - "application-storage.ts"
Cohesion: 0.21
Nodes (13): dynamic, GET(), DELETE(), ACCEPTED_APPLICATION_FILE_TYPES, MAX_APPLICATION_FILE_SIZE, APPLICATION_DOCUMENT_BUCKET, downloadApplicationDocument(), ensurePrivateBucket() (+5 more)

### Community 75 - "extractProfileNumber"
Cohesion: 0.46
Nodes (7): extractPhilSysNumber(), extractProfileNumber(), identityNumberRows(), normalizeNumberText(), NUMERIC_FORMATS, numericNumber(), combineLocalReadings()

### Community 76 - "v1/beneficiaries/import/preview/route.ts"
Cohesion: 0.38
Nodes (5): dynamic, POST(), dynamic, POST(), parseBeneficiaryExcelBuffer()

### Community 77 - "users/import/route.ts"
Cohesion: 0.43
Nodes (6): DINGALAN_BARANGAYS, dynamic, normalizeBarangay(), normalizeRole(), parseCSVLines(), POST()

### Community 78 - "restore-to-postgres.js"
Cohesion: 0.40
Nodes (3): fs, path, { PrismaClient }

### Community 79 - "test-masterlist-import-postgres.mjs"
Cohesion: 0.22
Nodes (8): cacheRoot, dataDir, get(), listener, load(), { PrismaClient }, require, root

### Community 80 - "IdUploadPanel.tsx"
Cohesion: 0.33
Nodes (9): FieldProps, FilePreview(), IdUploadPanel(), IdUploadPanelProps, OcrResponse, ApplicationFormValues, isAcceptedApplicationFile(), OcrAutofillStatus (+1 more)

### Community 81 - "verify-birthday/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, POST(), matchesBirthdayPin()

### Community 82 - "test-program-qr-browser.mjs"
Cohesion: 0.29
Nodes (5): calls, errors, programs, require, roster

### Community 83 - "Reusable QR slots and per-program scan history"
Cohesion: 0.40
Nodes (4): More than 522 beneficiaries, Offline devices, Reusable QR slots and per-program scan history, Verification

### Community 84 - "dashboard/page.tsx"
Cohesion: 0.50
Nodes (4): DashboardData, DashboardPage(), dynamic, getDashboardMetrics()

### Community 86 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, npm

### Community 87 - "records/route.ts"
Cohesion: 0.50
Nodes (3): dynamic, GET(), PATCH()

### Community 89 - "FieldQrPassGeneratorCard.tsx"
Cohesion: 0.19
Nodes (12): FIELD_OPERATIONS, FieldScannerHubContent(), FieldScannerHubPage(), buildPresetRoleGroups(), DEFAULT_ROLE_GROUPS, LoginPage(), PresetAccount, PresetRoleGroup (+4 more)

### Community 109 - "Q: ayusin mo yung sa driver`s license kasi halos walang nababasa"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ayusin mo yung sa driver`s license kasi halos walang nababasa, Source Nodes

## Knowledge Gaps
- **14 isolated node(s):** `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs`, `@types/jsonwebtoken`, `@types/jszip` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 701 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `@prisma/client` to `package.json`, `qr-pass/route.ts`, `next`, `application-service.ts`, `ref_path`, `inspect-all-sources.js`, `bcryptjs`, `ref_fs`, `@supabase/supabase-js`, `import-final-522-beneficiaries.mjs`, `master-sync-all-data.js`, `excel-exporter.ts`, `ApplicationInbox.tsx`, `check-reference-slots.js`, `cleanup-and-deduplicate.js`, `migrate-user-plain-password.js`, `test-program-qr-postgres.mjs`, `check-sep20-evening.mjs`, `inspect-db.js`, `reseed-exact-522-beneficiaries.mjs`, `work-program-parser.ts`, `update-flagged-beneficiaries.js`, `beneficiaries/page.tsx`, `test-offline-sync-resilience.mjs`, `inspect-flagged.js`, `restore-to-postgres.js`, `test-masterlist-import-postgres.mjs`, `test-program-crud.mjs`, `test-matrix-and-sync.mjs`, `test-dedicated-qr-retention.mjs`, `cleanup-test-users.mjs`, `test-public-inquiry.mjs`, `detailed-consolidated-retrieval.mjs`, `inspect-db.mjs`, `test-pg-counts.js`?**
  _High betweenness centrality (0.268) - this node is a cross-community bridge._
- **What connects `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Why does `next` connect `useAuth` to `package.json`, `stubs/route.ts`, `qr-pass/route.ts`, `logAudit`, `next`, `isAdminUser`, `normalizeBarangayName`, `application-service.ts`, `auth.ts`, `react`, `programs/[id]/page.tsx`, `excel-importer.ts`, `hasPermission`, `ocr/route.ts`, `excel-exporter.ts`, `restrictions/import/route.ts`, `stubs/page.tsx`, `middleware.ts`, `ApplicationInbox.tsx`, `restrictions/route.ts`, `beneficiaries/[id]/page.tsx`, `layout.tsx`, `getCurrentUser`, `work-program-parser.ts`, `beneficiaries/page.tsx`, `application-storage.ts`, `v1/beneficiaries/import/preview/route.ts`, `users/import/route.ts`, `verify-birthday/route.ts`, `dashboard/page.tsx`, `records/route.ts`, `FieldQrPassGeneratorCard.tsx`?**
  _High betweenness centrality (0.156) - this node is a cross-community bridge._
- **Should `qr-pass/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06516290726817042 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `package.json`, `useAuth`, `beneficiaries/page.tsx`, `isAdminUser`, `normalizeBarangayName`, `application-schema.ts`, `stubs/page.tsx`, `programs/[id]/page.tsx`, `ApplicationInbox.tsx`, `IdUploadPanel.tsx`, `beneficiaries/[id]/page.tsx`, `effects/TextCubeLoader.tsx`, `dashboard/page.tsx`, `IdCameraCapture.tsx`, `excel-importer.ts`, `FieldQrPassGeneratorCard.tsx`, `test-roster-restriction-preview.mjs`, `layout.tsx`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._