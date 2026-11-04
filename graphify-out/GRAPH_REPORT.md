# Graph Report - PESO-EC-Access-1  (2026-11-04)

## Corpus Check
- 321 files · ~924,086 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 32 file(s) not represented in the graph (top: .csv 26, .css 2, .example 1)

## Summary
- 1510 nodes · 3812 edges · 104 communities (77 shown, 27 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0e5d4ef6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- hasPermission
- qr-pass/route.ts
- dependencies
- useAuth
- logAudit
- next
- application-schema.ts
- beneficiaries/page.tsx
- utils.ts
- application-service.ts
- auth.ts
- test-application-workflow.mjs
- app/page.tsx
- programs/[id]/page.tsx
- prepare-ocr-assets.mjs
- identity-address.ts
- application-id-mapper.ts
- scripts
- local-id-reader.ts
- test-local-id-reader.mjs
- compilerOptions
- v1/applications/route.ts
- generateBeneficiaryToken
- test-application-id-autofill.mjs
- next.config.mjs
- Layout & Components
- @prisma/client
- dexie.ts
- Layout & Components
- inspect-all-sources.js
- test-roster-restriction-preview.mjs
- ref_node_assert
- check-remote.js
- seed.js
- ref_fs
- browser-id-ocr.ts
- manifest.json
- @supabase/supabase-js
- import-final-522-beneficiaries.mjs
- master-sync-all-data.js
- ApplicationForm
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
- IdCameraCapture.tsx
- check-reference-slots.js
- qrcode
- cleanup-and-deduplicate.js
- migrate-user-plain-password.js
- layout.tsx
- getCurrentUser
- identity-profiles.ts
- test-masterlist-import-errors-browser.mjs
- Stitch Design System & UI Screen Guide
- check-sep20-evening.mjs
- inspect-db.js
- Guided ID camera
- v1/beneficiaries/import/commit/route.ts
- test-application-inbox-browser.mjs
- work-program-parser.ts
- Online and walk-in application intake
- test-service-worker-cache.mjs
- update-flagged-beneficiaries.js
- lucide-react
- test-offline-sync-resilience.mjs
- inspect-flagged.js
- application-storage.ts
- export-pg-to-files.js
- test-attendance-3hours.mjs
- fast-update-flagged.js
- restore-to-postgres.js
- test-masterlist-import-postgres.mjs
- IdUploadPanel.tsx
- normalizeBarangayName
- check-demographics.mjs
- inspect-all-sitios.mjs
- sync-all-password-hashes.mjs
- test-program-crud.mjs
- engines
- sync-disqualified-entry.mjs
- tailwindcss
- FieldQrPassGeneratorCard.tsx
- sw.js
- format1-stub-base-b64.ts
- test-matrix-and-sync.mjs
- test-dedicated-qr-retention.mjs
- test-stub-distribution-monitoring.mjs
- test-public-inquiry.mjs
- test-sorting-and-templates.mjs
- Q: ayusin mo yung sa driver`s license kasi halos walang nababasa

## God Nodes (most connected - your core abstractions)
1. `getCurrentUser()` - 150 edges
2. `isAdminUser()` - 114 edges
3. `next` - 108 edges
4. `hasPermission()` - 108 edges
5. `logAudit()` - 83 edges
6. `react` - 75 edges
7. `useAuth()` - 69 edges
8. `prisma` - 68 edges
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

## Communities (104 total, 27 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.08
Nodes (23): name, private, version, autoprefixer, clsx, dexie, dexie-react-hooks, @hookform/resolvers (+15 more)

### Community 1 - "hasPermission"
Cohesion: 0.12
Nodes (17): DELETE(), generateElporControlNo(), GET(), PATCH(), POST(), dynamic, POST(), DELETE() (+9 more)

### Community 2 - "qr-pass/route.ts"
Cohesion: 0.08
Nodes (35): exceljs, prisma, testExport(), dynamic, GET(), handleQrPassSearch(), POST(), POST() (+27 more)

### Community 3 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, autoprefixer, bcryptjs, clsx, date-fns, dexie, dexie-react-hooks, exceljs (+33 more)

### Community 4 - "useAuth"
Cohesion: 0.08
Nodes (37): AdminApplicationsPage(), AdminInquiriesPage(), BalikPinasElporPortalPage(), DINGALAN_BARANGAYS, SupplyItem, CASE_CATEGORIES, DINGALAN_BARANGAYS, OfwSeafarerCaseAssistancePage() (+29 more)

### Community 5 - "logAudit"
Cohesion: 0.08
Nodes (28): dynamic, getVal(), POST(), dynamic, POST(), dynamic, POST(), dynamic (+20 more)

### Community 6 - "next"
Cohesion: 0.07
Nodes (25): next, dynamic, GET(), dynamic, GET(), dynamic, dynamic, POST() (+17 more)

### Community 7 - "application-schema.ts"
Cohesion: 0.13
Nodes (20): zod, ApplicationFormProps, DocumentField, FormErrors, APPLICATION_SOURCES, applicationFinalSchema, BENEFICIARY_TYPES, CIVIL_STATUS_OPTIONS (+12 more)

### Community 8 - "beneficiaries/page.tsx"
Cohesion: 0.07
Nodes (52): main(), prisma, dynamic, DEFAULT_10_DAY_ACTIVITIES, dynamic, POST(), BeneficiariesMasterlistContent(), BeneficiariesMasterlistPage() (+44 more)

### Community 9 - "utils.ts"
Cohesion: 0.20
Nodes (23): DailyAttendancePage(), OrientationContent(), OrientationPage(), PayoutScannerPage(), photosMemoryCache, PhotosPage(), StubDistributionContent(), StubDistributionPage() (+15 more)

### Community 10 - "application-service.ts"
Cohesion: 0.13
Nodes (24): dynamic, POST(), dynamic, POST(), dynamic, POST(), ApplicationWriteAction, isIdempotentReplay() (+16 more)

### Community 11 - "auth.ts"
Cohesion: 0.12
Nodes (19): bcryptjs, dynamic, POST(), dynamic, GET(), dynamic, generateTrackingCode(), POST() (+11 more)

### Community 12 - "test-application-workflow.mjs"
Cohesion: 0.08
Nodes (23): audits, cache, countQueries, deleted, detail, docs, encode, fakePrisma (+15 more)

### Community 13 - "app/page.tsx"
Cohesion: 0.07
Nodes (26): jsqr, pdfjs-dist, prisma, DINGALAN_BARANGAYS, formatBday(), main(), normalizeBarangayName(), normalizeSitioName() (+18 more)

### Community 14 - "programs/[id]/page.tsx"
Cohesion: 0.16
Nodes (18): react, AuditLogsPage(), DINGALAN_BARANGAYS, UserManagementPage(), ProgramDetailsHub(), ProgramsPage(), StatusBadge(), StatusBadgeProps (+10 more)

### Community 15 - "prepare-ocr-assets.mjs"
Cohesion: 0.15
Nodes (7): core, output, require, root, expected, require, require

### Community 16 - "identity-address.ts"
Cohesion: 0.34
Nodes (14): addressLike(), addressPiece(), addressStart(), barangayPattern(), escape(), IdentityAddress, nearBarangay(), normalize() (+6 more)

### Community 17 - "application-id-mapper.ts"
Cohesion: 0.22
Nodes (24): calculateAge(), applyOcrAutofill(), birthDateValue(), clean(), cleanLocalValue(), cleanPersonName(), explicitLabel(), fieldValue() (+16 more)

### Community 18 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, dev, lint, postinstall, prepare:ocr, prisma:generate, prisma:push (+9 more)

### Community 19 - "local-id-reader.ts"
Cohesion: 0.15
Nodes (22): extractPhilSysNumber(), MappedOcrSide, MergedOcrResult, NON_BIRTH_DATE_LABEL, OcrTextLine, ORDERED_NAME_LABEL, extractProfileNumber(), identityNumberRows() (+14 more)

### Community 20 - "test-local-id-reader.mjs"
Cohesion: 0.05
Nodes (35): addressCrop, addressLines, addressOf(), backStatusRegions, birthCrop, certificate, certificateLayout, conflict (+27 more)

### Community 21 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx (+12 more)

### Community 22 - "v1/applications/route.ts"
Cohesion: 0.20
Nodes (12): dynamic, GET(), details, dynamic, GET(), PATCH(), dynamic, GET() (+4 more)

### Community 23 - "generateBeneficiaryToken"
Cohesion: 0.10
Nodes (22): date-fns, dynamic, POST(), DELETE(), dynamic, GET(), PATCH(), POST() (+14 more)

### Community 24 - "test-application-id-autofill.mjs"
Cohesion: 0.09
Nodes (27): dynamic, isRateLimited(), maxDuration, POST(), providerMessage(), rateLimit, mergeOcrSides(), analyzeIdentityDocument() (+19 more)

### Community 26 - "Layout & Components"
Cohesion: 0.14
Nodes (13): 1. DICT GWT Utility Header, 2. Official Municipal Masthead, 3. Hero Citizen Announcement Card, 4. Telemetry Metric Strip, 5. Public Status Inquiry Module (`#inquiry`), 6. Work Area Assignment Lookup (`#work-assignment`), 7. Direct Feedback Desk (`#inquiry-form`), 8. DICT Standard GWT Footer (+5 more)

### Community 27 - "@prisma/client"
Cohesion: 0.05
Nodes (14): @prisma/client, prisma, prisma, prisma, prisma, prisma, prisma, prisma (+6 more)

### Community 28 - "dexie.ts"
Cohesion: 0.17
Nodes (18): SyncCenterPage(), OfflineContext, OfflineContextType, OfflineProvider(), CachedBeneficiary, CachedProgram, CachedWorkDay, CachedWorkProgramItem (+10 more)

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
Cohesion: 0.24
Nodes (6): login(), run(), errors, require, login(), run()

### Community 33 - "check-remote.js"
Cohesion: 0.09
Nodes (12): isomorphic-git, dir, fs, git, path, dir, fs, git (+4 more)

### Community 34 - "seed.js"
Cohesion: 0.40
Nodes (3): bcrypt, prisma, { PrismaClient }

### Community 35 - "ref_fs"
Cohesion: 0.09
Nodes (9): pngjs, backup, fs, prisma, { PrismaClient }, downloadImage(), b64, fs (+1 more)

### Community 36 - "browser-id-ocr.ts"
Cohesion: 0.17
Nodes (25): tesseract.js, detectIdentityDocumentType(), OcrSubject, active(), canvas(), context(), crop(), enhance() (+17 more)

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

### Community 41 - "ApplicationForm"
Cohesion: 0.21
Nodes (10): WalkInEncodingPage(), OnlineTupadApplicationPage(), ApplicationForm(), MultiChoice(), Section(), SelectField(), SourceBadge(), TextField() (+2 more)

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
Cohesion: 0.21
Nodes (11): OnlineApplicationsPage(), WalkInSubmissionsPage(), ApplicationInbox(), ApplicationRecord, dateText(), InboxData, sections, valueText() (+3 more)

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

### Community 52 - "IdCameraCapture.tsx"
Cohesion: 0.35
Nodes (9): cameraError(), IdCameraCapture(), Props, CameraRect, getCameraGuideRect(), getCameraSourceCrop(), getIdCameraPreset(), ID_CAMERA_GUIDES (+1 more)

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
Nodes (37): DELETE(), dynamic, PATCH(), dynamic, GET(), POST(), dynamic, GET() (+29 more)

### Community 59 - "identity-profiles.ts"
Cohesion: 0.29
Nodes (5): ID_TYPES, genericNumbers, IdentityDocumentType, IdentityProfile, PROFILES

### Community 60 - "test-masterlist-import-errors-browser.mjs"
Cohesion: 0.33
Nodes (5): alerts, pageErrors, preview, require, rows

### Community 61 - "Stitch Design System & UI Screen Guide"
Cohesion: 0.40
Nodes (4): 1. How to Access and Edit in Stitch, 2. Included Local Artifacts, 3. How to Upload a Modified `DESIGN.md` to Stitch in the Future, Stitch Design System & UI Screen Guide

### Community 64 - "Guided ID camera"
Cohesion: 0.40
Nodes (4): Browser/privacy requirements, Capture flow, Guided ID camera, Verification

### Community 65 - "v1/beneficiaries/import/commit/route.ts"
Cohesion: 0.24
Nodes (11): dynamic, ImportConflict, maxDuration, POST(), dynamic, maxDuration, POST(), BeneficiaryImportUpdate (+3 more)

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
Cohesion: 0.14
Nodes (8): typescript, card, module, paper, source, module, production, source

### Community 70 - "update-flagged-beneficiaries.js"
Cohesion: 0.40
Nodes (3): flaggedReference, prisma, { PrismaClient }

### Community 71 - "lucide-react"
Cohesion: 0.21
Nodes (12): lucide-react, AttendanceMatrixContent(), AttendanceMatrixPage(), ReplacementsContent(), ReplacementsPage(), AdminStubOverrideModal(), AdminStubOverrideModalProps, REPLACEMENT_REASONS (+4 more)

### Community 74 - "application-storage.ts"
Cohesion: 0.27
Nodes (10): DELETE(), ACCEPTED_APPLICATION_FILE_TYPES, MAX_APPLICATION_FILE_SIZE, APPLICATION_DOCUMENT_BUCKET, downloadApplicationDocument(), ensurePrivateBucket(), extensionFor(), getPrivateStorageClient() (+2 more)

### Community 75 - "export-pg-to-files.js"
Cohesion: 0.40
Nodes (3): fs, path, { PrismaClient }

### Community 77 - "fast-update-flagged.js"
Cohesion: 0.40
Nodes (3): flaggedReference, prisma, { PrismaClient }

### Community 78 - "restore-to-postgres.js"
Cohesion: 0.40
Nodes (3): fs, path, { PrismaClient }

### Community 79 - "test-masterlist-import-postgres.mjs"
Cohesion: 0.20
Nodes (8): cacheRoot, dataDir, get(), listener, load(), { PrismaClient }, require, root

### Community 80 - "IdUploadPanel.tsx"
Cohesion: 0.33
Nodes (9): FieldProps, FilePreview(), IdUploadPanel(), IdUploadPanelProps, OcrResponse, ApplicationFormValues, isAcceptedApplicationFile(), OcrAutofillStatus (+1 more)

### Community 81 - "normalizeBarangayName"
Cohesion: 0.12
Nodes (16): dynamic, POST(), dynamic, GET(), dynamic, POST(), dynamic, POST() (+8 more)

### Community 86 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, npm

### Community 89 - "FieldQrPassGeneratorCard.tsx"
Cohesion: 0.16
Nodes (15): FIELD_OPERATIONS, FieldScannerHubContent(), FieldScannerHubPage(), buildPresetRoleGroups(), DEFAULT_ROLE_GROUPS, LoginPage(), PresetAccount, PresetRoleGroup (+7 more)

### Community 109 - "Q: ayusin mo yung sa driver`s license kasi halos walang nababasa"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ayusin mo yung sa driver`s license kasi halos walang nababasa, Source Nodes

## Knowledge Gaps
- **14 isolated node(s):** `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs`, `@types/jsonwebtoken`, `@types/jszip` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 680 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `@prisma/client` to `package.json`, `qr-pass/route.ts`, `next`, `beneficiaries/page.tsx`, `application-service.ts`, `app/page.tsx`, `v1/applications/route.ts`, `inspect-all-sources.js`, `check-remote.js`, `seed.js`, `ref_fs`, `@supabase/supabase-js`, `import-final-522-beneficiaries.mjs`, `master-sync-all-data.js`, `check-reference-slots.js`, `cleanup-and-deduplicate.js`, `migrate-user-plain-password.js`, `check-sep20-evening.mjs`, `inspect-db.js`, `v1/beneficiaries/import/commit/route.ts`, `work-program-parser.ts`, `update-flagged-beneficiaries.js`, `test-offline-sync-resilience.mjs`, `inspect-flagged.js`, `export-pg-to-files.js`, `fast-update-flagged.js`, `restore-to-postgres.js`, `test-masterlist-import-postgres.mjs`, `check-demographics.mjs`, `inspect-all-sitios.mjs`, `sync-all-password-hashes.mjs`, `test-program-crud.mjs`, `sync-disqualified-entry.mjs`, `test-matrix-and-sync.mjs`, `test-dedicated-qr-retention.mjs`, `test-stub-distribution-monitoring.mjs`, `test-public-inquiry.mjs`, `test-sorting-and-templates.mjs`?**
  _High betweenness centrality (0.249) - this node is a cross-community bridge._
- **What connects `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `package.json`, `hasPermission`, `qr-pass/route.ts`, `useAuth`, `logAudit`, `beneficiaries/page.tsx`, `utils.ts`, `application-service.ts`, `auth.ts`, `app/page.tsx`, `programs/[id]/page.tsx`, `v1/applications/route.ts`, `generateBeneficiaryToken`, `test-application-id-autofill.mjs`, `restrictions/import/route.ts`, `stubs/page.tsx`, `middleware.ts`, `restrictions/route.ts`, `layout.tsx`, `getCurrentUser`, `v1/beneficiaries/import/commit/route.ts`, `work-program-parser.ts`, `lucide-react`, `normalizeBarangayName`, `FieldQrPassGeneratorCard.tsx`?**
  _High betweenness centrality (0.148) - this node is a cross-community bridge._
- **Should `hasPermission` be split into smaller, more focused modules?**
  _Cohesion score 0.11956521739130435 - nodes in this community are weakly interconnected._
- **Why does `react` connect `programs/[id]/page.tsx` to `package.json`, `useAuth`, `next`, `lucide-react`, `beneficiaries/page.tsx`, `utils.ts`, `application-schema.ts`, `stubs/page.tsx`, `app/page.tsx`, `ApplicationInbox.tsx`, `test-roster-restriction-preview.mjs`, `IdUploadPanel.tsx`, `effects/TextCubeLoader.tsx`, `IdCameraCapture.tsx`, `FieldQrPassGeneratorCard.tsx`, `dexie.ts`, `layout.tsx`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Should `qr-pass/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08405797101449275 - nodes in this community are weakly interconnected._