# Graph Report - PESO-EC-Access-1  (2026-10-29)

## Corpus Check
- 308 files · ~915,380 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 32 file(s) not represented in the graph (top: .csv 26, .css 2, .example 1)

## Summary
- 1415 nodes · 3648 edges · 110 communities (75 shown, 35 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- package.json
- hasPermission
- qr-pass/route.ts
- dependencies
- useAuth
- getCurrentUser
- next
- ApplicationForm.tsx
- beneficiaries/page.tsx
- FieldQrPassGeneratorCard.tsx
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
- beneficiaries/route.ts
- test-application-id-autofill.mjs
- ref_path
- Layout & Components
- @prisma/client
- dexie.ts
- Layout & Components
- inspect-all-sources.js
- ApplicationInbox.tsx
- ref_node_assert
- check-remote.js
- bcryptjs
- ref_fs
- browser-id-ocr.ts
- manifest.json
- @supabase/supabase-js
- import-final-522-beneficiaries.mjs
- master-sync-all-data.js
- reseed-exact-522-beneficiaries.mjs
- restrictions/import/route.ts
- TUPAD application ID autofill and walk-in encoding
- stubs/page.tsx
- middleware.ts
- extract-and-sync-522-qrs.mjs
- application-storage.ts
- restrictions/route.ts
- layout.tsx
- effects/TextCubeLoader.tsx
- vercel.json
- work-program-parser.ts
- check-reference-slots.js
- export-all-data.js
- cleanup-and-deduplicate.js
- migrate-user-plain-password.js
- ApplicationForm
- isAdminUser
- IdUploadPanel.tsx
- users/import/route.ts
- Stitch Design System & UI Screen Guide
- check-sep20-evening.mjs
- inspect-db.js
- identity-profiles.ts
- ref_node_module
- test-application-inbox-browser.mjs
- compare-datasets.js
- Online and walk-in application intake
- test-service-worker-cache.mjs
- update-flagged-beneficiaries.js
- captcha/route.ts
- test-offline-sync-resilience.mjs
- inspect-flagged.js
- inspect-program-details.mjs
- inspect-sep21-data.mjs
- test-attendance-3hours.mjs
- inspect-db.mjs
- update-522-sitios.mjs
- export-pg-to-files.js
- fast-update-flagged.js
- restore-to-postgres.js
- dashboard/page.tsx
- beneficiaries/template/route.ts
- download-stub-template.mjs
- test-program-crud.mjs
- engines
- check-demographics.mjs
- tailwindcss
- cleanup-test-users.mjs
- sw.js
- format1-stub-base-b64.ts
- heal-qr-codes.mjs
- list-users-by-role.mjs
- test-landing-scanner.mjs
- test-public-inquiry.mjs
- sync-disqualified-entry.mjs
- test-matrix-and-sync.mjs
- test-dedicated-qr-retention.mjs
- test-stub-distribution-monitoring.mjs
- test-table-rules.mjs
- load
- Q: ayusin mo yung sa driver`s license kasi halos walang nababasa
- push/route.ts

## God Nodes (most connected - your core abstractions)
1. `getCurrentUser()` - 150 edges
2. `isAdminUser()` - 114 edges
3. `next` - 108 edges
4. `hasPermission()` - 108 edges
5. `logAudit()` - 85 edges
6. `react` - 72 edges
7. `useAuth()` - 69 edges
8. `prisma` - 68 edges
9. `lucide-react` - 64 edges
10. `normalizeBarangayName()` - 61 edges

## Surprising Connections (you probably didn't know these)
- `addressOf()` --calls--> `mapLocalIdentityText()`  [EXTRACTED]
  test/test-local-id-reader.mjs → src/lib/ocr/application-id-mapper.ts
- `mapped()` --calls--> `mapLocalIdentityText()`  [EXTRACTED]
  test/test-local-id-reader.mjs → src/lib/ocr/application-id-mapper.ts
- `selected()` --calls--> `mapLocalIdentityText()`  [EXTRACTED]
  test/test-local-id-reader.mjs → src/lib/ocr/application-id-mapper.ts
- `testApi()` --calls--> `signToken()`  [EXTRACTED]
  test/test-users-api.mjs → src/lib/auth.ts
- `testFullParser()` --calls--> `parseWorkProgramBuffer()`  [EXTRACTED]
  test/test-full-parser.mjs → src/lib/work-program-parser.ts

## Import Cycles
- None detected.

## Communities (110 total, 35 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.08
Nodes (23): name, private, version, autoprefixer, clsx, dexie, dexie-react-hooks, @hookform/resolvers (+15 more)

### Community 1 - "hasPermission"
Cohesion: 0.10
Nodes (22): dynamic, getVal(), POST(), DELETE(), generateCaseTrackingCode(), GET(), PATCH(), POST() (+14 more)

### Community 2 - "qr-pass/route.ts"
Cohesion: 0.12
Nodes (20): exceljs, prisma, testExport(), dynamic, dynamic, GET(), generateAccomplishmentExcel(), generateAttendanceExcel() (+12 more)

### Community 3 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, autoprefixer, bcryptjs, clsx, date-fns, dexie, dexie-react-hooks, exceljs (+33 more)

### Community 4 - "useAuth"
Cohesion: 0.09
Nodes (33): AdminApplicationsPage(), AdminInquiriesPage(), BalikPinasElporPortalPage(), DINGALAN_BARANGAYS, SupplyItem, CASE_CATEGORIES, DINGALAN_BARANGAYS, OfwSeafarerCaseAssistancePage() (+25 more)

### Community 5 - "getCurrentUser"
Cohesion: 0.08
Nodes (29): dynamic, POST(), dynamic, POST(), dynamic, POST(), dynamic, POST() (+21 more)

### Community 6 - "next"
Cohesion: 0.07
Nodes (23): next, dynamic, GET(), dynamic, dynamic, POST(), dynamic, dynamic (+15 more)

### Community 7 - "ApplicationForm.tsx"
Cohesion: 0.13
Nodes (19): zod, ApplicationFormProps, DocumentField, FormErrors, APPLICATION_SOURCES, BENEFICIARY_TYPES, CIVIL_STATUS_OPTIONS, EMPLOYMENT_INTEREST_OPTIONS (+11 more)

### Community 8 - "beneficiaries/page.tsx"
Cohesion: 0.10
Nodes (36): main(), prisma, AttendanceMatrixContent(), AttendanceMatrixPage(), BeneficiariesMasterlistContent(), BeneficiariesMasterlistPage(), AdminStubOverrideModal(), AdminStubOverrideModalProps (+28 more)

### Community 9 - "FieldQrPassGeneratorCard.tsx"
Cohesion: 0.18
Nodes (14): html2canvas, FIELD_OPERATIONS, FieldScannerHubContent(), FieldScannerHubPage(), buildPresetRoleGroups(), DEFAULT_ROLE_GROUPS, LoginPage(), PresetAccount (+6 more)

### Community 10 - "application-service.ts"
Cohesion: 0.13
Nodes (24): dynamic, POST(), dynamic, POST(), dynamic, POST(), ApplicationWriteAction, isIdempotentReplay() (+16 more)

### Community 11 - "auth.ts"
Cohesion: 0.12
Nodes (15): dynamic, POST(), dynamic, POST(), dynamic, POST(), dynamic, POST() (+7 more)

### Community 12 - "test-application-workflow.mjs"
Cohesion: 0.08
Nodes (22): typescript, audits, cache, countQueries, deleted, detail, docs, encode (+14 more)

### Community 13 - "react"
Cohesion: 0.21
Nodes (10): dynamic, LandingPage(), LandingNavDrawer(), NavDrawerCategory, NavDrawerItem, MigrantsCornerLandingSection(), PesoOrganizationalChart(), PublicInquiryMessageForm() (+2 more)

### Community 14 - "programs/[id]/page.tsx"
Cohesion: 0.10
Nodes (32): lucide-react, qrcode, react, AuditLogsPage(), DINGALAN_BARANGAYS, UserManagementPage(), BeneficiaryProfilePage(), dynamic (+24 more)

### Community 15 - "prepare-ocr-assets.mjs"
Cohesion: 0.25
Nodes (4): core, output, require, root

### Community 16 - "identity-address.ts"
Cohesion: 0.28
Nodes (16): ADDRESS_LABEL, ADDRESS_STOP, addressLike(), addressPiece(), addressStart(), barangayPattern(), escape(), IdentityAddress (+8 more)

### Community 17 - "application-id-mapper.ts"
Cohesion: 0.22
Nodes (24): calculateAge(), applyOcrAutofill(), birthDateValue(), clean(), cleanLocalValue(), cleanPersonName(), explicitLabel(), fieldValue() (+16 more)

### Community 18 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, dev, lint, postinstall, prepare:ocr, prisma:generate, prisma:push (+9 more)

### Community 19 - "local-id-reader.ts"
Cohesion: 0.17
Nodes (21): extractPhilSysNumber(), MappedOcrSide, MergedOcrResult, NON_BIRTH_DATE_LABEL, OcrTextLine, ORDERED_NAME_LABEL, extractProfileNumber(), identityNumberRows() (+13 more)

### Community 20 - "test-local-id-reader.mjs"
Cohesion: 0.05
Nodes (35): addressCrop, addressLines, addressOf(), backStatusRegions, birthCrop, certificate, certificateLayout, conflict (+27 more)

### Community 21 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx (+12 more)

### Community 22 - "dingalan-groupings.ts"
Cohesion: 0.28
Nodes (17): DEFAULT_10_DAY_ACTIVITIES, dynamic, POST(), FieldWorkProgramPage(), WorkProgramManagementPage(), DeploymentGroupingMatrix(), DeploymentGroupingMatrixProps, BarangayGroupingConfig (+9 more)

### Community 23 - "beneficiaries/route.ts"
Cohesion: 0.10
Nodes (30): date-fns, dynamic, GET(), handleQrPassSearch(), POST(), dynamic, POST(), DELETE() (+22 more)

### Community 24 - "test-application-id-autofill.mjs"
Cohesion: 0.08
Nodes (28): dynamic, isRateLimited(), maxDuration, POST(), providerMessage(), rateLimit, applicationFinalSchema, mergeOcrSides() (+20 more)

### Community 25 - "ref_path"
Cohesion: 0.13
Nodes (5): __dirname, nextConfig, prisma, prisma, prisma

### Community 26 - "Layout & Components"
Cohesion: 0.14
Nodes (13): 1. DICT GWT Utility Header, 2. Official Municipal Masthead, 3. Hero Citizen Announcement Card, 4. Telemetry Metric Strip, 5. Public Status Inquiry Module (`#inquiry`), 6. Work Area Assignment Lookup (`#work-assignment`), 7. Direct Feedback Desk (`#inquiry-form`), 8. DICT Standard GWT Footer (+5 more)

### Community 27 - "@prisma/client"
Cohesion: 0.12
Nodes (7): @prisma/client, prisma, prisma, { PrismaClient }, prisma, runE2ETests(), prisma

### Community 28 - "dexie.ts"
Cohesion: 0.11
Nodes (44): DailyAttendancePage(), OrientationContent(), OrientationPage(), PayoutScannerPage(), photosMemoryCache, PhotosPage(), StubDistributionContent(), StubDistributionPage() (+36 more)

### Community 29 - "Layout & Components"
Cohesion: 0.14
Nodes (13): 1. DICT GWT Utility Header, 2. Official Municipal Masthead, 3. Hero Citizen Announcement Card, 4. Telemetry Metric Strip, 5. Public Status Inquiry Module (`#inquiry`), 6. Work Area Assignment Lookup (`#work-assignment`), 7. Direct Feedback Desk (`#inquiry-form`), 8. DICT Standard GWT Footer (+5 more)

### Community 30 - "inspect-all-sources.js"
Cohesion: 0.17
Nodes (10): Database, db, fs, summary, tables, Database, fs, main() (+2 more)

### Community 31 - "ApplicationInbox.tsx"
Cohesion: 0.18
Nodes (13): OnlineApplicationsPage(), WalkInSubmissionsPage(), ApplicationInbox(), ApplicationRecord, dateText(), InboxData, sections, valueText() (+5 more)

### Community 32 - "ref_node_assert"
Cohesion: 0.22
Nodes (6): jspdf, login(), run(), require, login(), run()

### Community 33 - "check-remote.js"
Cohesion: 0.15
Nodes (9): isomorphic-git, dir, fs, git, path, dir, fs, git (+1 more)

### Community 34 - "bcryptjs"
Cohesion: 0.17
Nodes (6): bcrypt, prisma, { PrismaClient }, bcryptjs, prisma, prisma

### Community 35 - "ref_fs"
Cohesion: 0.15
Nodes (4): pngjs, b64, fs, prisma

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

### Community 41 - "reseed-exact-522-beneficiaries.mjs"
Cohesion: 0.36
Nodes (7): DINGALAN_BARANGAYS, formatBday(), main(), normalizeBarangayName(), normalizeSitioName(), prisma, rawData

### Community 42 - "restrictions/import/route.ts"
Cohesion: 0.39
Nodes (7): addDaysToDate(), checkIsAppointive(), dynamic, maxDuration, parseDateToISO(), parseNameParts(), POST()

### Community 43 - "TUPAD application ID autofill and walk-in encoding"
Cohesion: 0.22
Nodes (8): Database migration, Local ID reading (default; no Azure key required), Number recovery and optional close-up, Optional Azure API, Required private storage configuration, TUPAD application ID autofill and walk-in encoding, Verification, What is implemented

### Community 44 - "stubs/page.tsx"
Cohesion: 0.22
Nodes (14): PrintTemplateMode, StubsContent(), StubsDesignerPage(), ETUPAD_BASE_IMAGE, ETupadCard, ETupadCardProps, Format1Stub, Format1StubProps (+6 more)

### Community 46 - "extract-and-sync-522-qrs.mjs"
Cohesion: 0.33
Nodes (3): jsqr, pdfjs-dist, prisma

### Community 47 - "application-storage.ts"
Cohesion: 0.23
Nodes (12): dynamic, GET(), ACCEPTED_APPLICATION_FILE_TYPES, MAX_APPLICATION_FILE_SIZE, APPLICATION_DOCUMENT_BUCKET, downloadApplicationDocument(), ensurePrivateBucket(), extensionFor() (+4 more)

### Community 48 - "restrictions/route.ts"
Cohesion: 0.38
Nodes (6): DELETE(), dynamic, GET(), maskFullName(), parsePayoutDateToTimestamp(), POST()

### Community 49 - "layout.tsx"
Cohesion: 0.31
Nodes (5): metadata, RootLayout(), viewport, ServiceWorkerRegister(), AuthProvider()

### Community 50 - "effects/TextCubeLoader.tsx"
Cohesion: 0.43
Nodes (3): Loading(), TextCubeLoader(), TextCubeLoaderProps

### Community 51 - "vercel.json"
Cohesion: 0.29
Nodes (6): buildCommand, framework, functions, src/app/api/**/*, $schema, maxDuration

### Community 52 - "work-program-parser.ts"
Cohesion: 0.09
Nodes (20): xlsx, dynamic, dynamic, POST(), dynamic, DINGALAN_BARANGAYS, normalizeBarangay(), ParsedBarangayWorkProgram (+12 more)

### Community 53 - "check-reference-slots.js"
Cohesion: 0.40
Nodes (3): prisma, { PrismaClient }, referenceSlots

### Community 54 - "export-all-data.js"
Cohesion: 0.29
Nodes (6): Database, db, fs, fullExport, path, tables

### Community 56 - "migrate-user-plain-password.js"
Cohesion: 0.50
Nodes (4): getPresetPassword(), main(), prisma, { PrismaClient }

### Community 57 - "ApplicationForm"
Cohesion: 0.21
Nodes (10): WalkInEncodingPage(), OnlineTupadApplicationPage(), ApplicationForm(), MultiChoice(), Section(), SelectField(), SourceBadge(), TextField() (+2 more)

### Community 58 - "isAdminUser"
Cohesion: 0.08
Nodes (47): DELETE(), dynamic, PATCH(), dynamic, GET(), dynamic, GET(), POST() (+39 more)

### Community 59 - "IdUploadPanel.tsx"
Cohesion: 0.33
Nodes (9): FieldProps, FilePreview(), IdUploadPanel(), IdUploadPanelProps, OcrResponse, ApplicationFormValues, isAcceptedApplicationFile(), OcrAutofillStatus (+1 more)

### Community 60 - "users/import/route.ts"
Cohesion: 0.43
Nodes (6): DINGALAN_BARANGAYS, dynamic, normalizeBarangay(), normalizeRole(), parseCSVLines(), POST()

### Community 61 - "Stitch Design System & UI Screen Guide"
Cohesion: 0.40
Nodes (4): 1. How to Access and Edit in Stitch, 2. Included Local Artifacts, 3. How to Upload a Modified `DESIGN.md` to Stitch in the Future, Stitch Design System & UI Screen Guide

### Community 64 - "identity-profiles.ts"
Cohesion: 0.29
Nodes (5): ID_TYPES, genericNumbers, IdentityDocumentType, IdentityProfile, PROFILES

### Community 65 - "ref_node_module"
Cohesion: 0.33
Nodes (3): expected, require, require

### Community 66 - "test-application-inbox-browser.mjs"
Cohesion: 0.29
Nodes (5): errors, fixture, record, requests, require

### Community 67 - "compare-datasets.js"
Cohesion: 0.33
Nodes (4): backup, fs, prisma, { PrismaClient }

### Community 68 - "Online and walk-in application intake"
Cohesion: 0.33
Nodes (5): Admin review, Database and private storage, Online and walk-in application intake, Pages and roles, Verification

### Community 70 - "update-flagged-beneficiaries.js"
Cohesion: 0.40
Nodes (3): flaggedReference, prisma, { PrismaClient }

### Community 71 - "captcha/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, GET(), generateCaptchaChallenge()

### Community 78 - "update-522-sitios.mjs"
Cohesion: 0.47
Nodes (5): DINGALAN_BARANGAYS, main(), normalizeBarangayName(), normalizeSitioName(), prisma

### Community 79 - "export-pg-to-files.js"
Cohesion: 0.40
Nodes (3): fs, path, { PrismaClient }

### Community 80 - "fast-update-flagged.js"
Cohesion: 0.40
Nodes (3): flaggedReference, prisma, { PrismaClient }

### Community 81 - "restore-to-postgres.js"
Cohesion: 0.40
Nodes (3): fs, path, { PrismaClient }

### Community 82 - "dashboard/page.tsx"
Cohesion: 0.50
Nodes (4): DashboardData, DashboardPage(), dynamic, getDashboardMetrics()

### Community 86 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, npm

### Community 109 - "Q: ayusin mo yung sa driver`s license kasi halos walang nababasa"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ayusin mo yung sa driver`s license kasi halos walang nababasa, Source Nodes

### Community 110 - "push/route.ts"
Cohesion: 0.32
Nodes (6): dynamic, POST(), dynamic, POST(), formatBirthdayPin(), matchesBirthdayPin()

## Knowledge Gaps
- **15 isolated node(s):** `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs`, `@types/jsonwebtoken`, `@types/jszip` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 632 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `@prisma/client` to `package.json`, `qr-pass/route.ts`, `next`, `beneficiaries/page.tsx`, `application-service.ts`, `ref_path`, `inspect-all-sources.js`, `bcryptjs`, `ref_fs`, `@supabase/supabase-js`, `import-final-522-beneficiaries.mjs`, `master-sync-all-data.js`, `reseed-exact-522-beneficiaries.mjs`, `extract-and-sync-522-qrs.mjs`, `work-program-parser.ts`, `check-reference-slots.js`, `cleanup-and-deduplicate.js`, `migrate-user-plain-password.js`, `isAdminUser`, `check-sep20-evening.mjs`, `inspect-db.js`, `compare-datasets.js`, `update-flagged-beneficiaries.js`, `test-offline-sync-resilience.mjs`, `inspect-flagged.js`, `inspect-program-details.mjs`, `inspect-sep21-data.mjs`, `inspect-db.mjs`, `update-522-sitios.mjs`, `export-pg-to-files.js`, `fast-update-flagged.js`, `restore-to-postgres.js`, `test-program-crud.mjs`, `check-demographics.mjs`, `cleanup-test-users.mjs`, `heal-qr-codes.mjs`, `list-users-by-role.mjs`, `test-landing-scanner.mjs`, `test-public-inquiry.mjs`, `sync-disqualified-entry.mjs`, `test-matrix-and-sync.mjs`, `test-dedicated-qr-retention.mjs`, `test-stub-distribution-monitoring.mjs`, `test-table-rules.mjs`?**
  _High betweenness centrality (0.220) - this node is a cross-community bridge._
- **What connects `@hookform/resolvers`, `@tesseract.js-data/eng`, `@types/bcryptjs` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `package.json`, `hasPermission`, `qr-pass/route.ts`, `useAuth`, `getCurrentUser`, `beneficiaries/page.tsx`, `FieldQrPassGeneratorCard.tsx`, `application-service.ts`, `auth.ts`, `react`, `programs/[id]/page.tsx`, `dingalan-groupings.ts`, `beneficiaries/route.ts`, `test-application-id-autofill.mjs`, `dexie.ts`, `restrictions/import/route.ts`, `stubs/page.tsx`, `middleware.ts`, `application-storage.ts`, `restrictions/route.ts`, `layout.tsx`, `work-program-parser.ts`, `isAdminUser`, `users/import/route.ts`, `captcha/route.ts`, `dashboard/page.tsx`, `beneficiaries/template/route.ts`, `push/route.ts`?**
  _High betweenness centrality (0.162) - this node is a cross-community bridge._
- **Should `hasPermission` be split into smaller, more focused modules?**
  _Cohesion score 0.10098522167487685 - nodes in this community are weakly interconnected._
- **Why does `react` connect `programs/[id]/page.tsx` to `package.json`, `useAuth`, `ApplicationForm.tsx`, `beneficiaries/page.tsx`, `FieldQrPassGeneratorCard.tsx`, `stubs/page.tsx`, `react`, `layout.tsx`, `dashboard/page.tsx`, `effects/TextCubeLoader.tsx`, `dingalan-groupings.ts`, `IdUploadPanel.tsx`, `dexie.ts`, `ApplicationInbox.tsx`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `qr-pass/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12315270935960591 - nodes in this community are weakly interconnected._