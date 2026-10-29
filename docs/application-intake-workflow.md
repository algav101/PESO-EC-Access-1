# Online and walk-in application intake

New submissions are stored as `SUBMITTED` / `PENDING_REVIEW`. Submission and OCR
never approve an applicant, create a beneficiary, or enroll anyone in a batch.

## Pages and roles

| Page | Access | Purpose |
| --- | --- | --- |
| `/apply` | Public | Online application; receipt points to admin review |
| `/applications/walk-in` | Domain Master, PESO Admin, PESO Staff, TUPAD Coordinator, Assisting Documentor, DOLE Coordinator | Encode a walk-in application |
| `/admin/applications/online` | Domain Master / PESO Admin only | All submitted ONLINE records |
| `/admin/applications/walk-in-submissions` | Domain Master / PESO Admin only | All submitted WALK_IN records, including encoder attribution |
| `/admin/applications` | Existing application-roster roles | Spreadsheet imports only |

The old `/admin/applications/walk-in` encoder URL remains a compatible alias.
Walk-in intake uses the dedicated `application.encode` permission. It does not
grant non-admin roles access to either submission inbox or admin review actions.
Drafts remain outside both inboxes. Historical submitted statuses are preserved;
only new final submissions enter pending review.

## Admin review

Each inbox supports name/reference/contact/ID search, barangay/status filters,
25-row pagination, source-scoped counts, and full application/document review.
`Mark reviewed & queue` sets `QUEUED`; `For completion` sets `INCOMPLETE` and
requires notes. Neither action is beneficiary approval. Final decisions cannot
be changed here. A database transaction commits the status change and audit
record together; stale `updatedAt` versions return 409 instead of overwriting
another review. Refresh/reopen the record after a conflict.

List, detail, review, encode, and document endpoints enforce roles server-side.
Non-admin encoders may open only their own walk-in documents, never online
documents or another encoder's documents. Spreadsheet import/replace/clear
operations are scoped to IMPORT so they cannot remove or overwrite intake data.
Repeated final submissions remain idempotent, but cannot cross source/encoder
boundaries, and draft saves cannot overwrite a submitted application.

Public status inquiry displays a pending-review message instead of claiming a
new submission is already complete, verified, approved, or queued.

## Database and private storage

The existing Prisma migration
`20261028000100_application_id_autofill` adds the intake columns, indexes,
encoder relation, and private document table. Existing roster values are
preserved, with source/submitted timestamp backfilled. It also enables RLS and
revokes Supabase Data API client-role grants on the two application tables:
this app uses server-side Prisma and custom signed role sessions, not direct
browser access to application tables. Do not add permissive public policies.

The migration was applied to the configured remote project on 2026-10-29 with
the user's approval and recorded using Prisma migrate resolve. The 67 existing
roster records were fingerprint-checked before/after; their existing values
were unchanged. Do not re-run its SQL against an already migrated database.

Private ID uploads also require a valid server-only
`SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` for the same project as
`SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`). Never use `NEXT_PUBLIC_` for a
server key. If both key variables exist, SERVICE_ROLE_KEY takes precedence.
The application bucket must be private (`tupad-application-documents` by
default). Credentials rejected with 401/403 block submission; the app does
not fall back to public storage. Replace rejected credentials in `.env` and
restart/reload the dev environment, then verify private bucket access again.

## Verification

- `npm run test:applications:workflow`: isolated API/service tests, fake auth,
  database and storage. No writes to the configured remote database.
- `npm run test:applications:browser`: run against `npm run dev`; synthetic
  users/records, intercepted writes, four encoder roles, admin inbox/review,
  pagination, mobile width, errors, and real unauthenticated API denials.
- `npm run test:applications`, `npm run test:ocr`, `npm run test:pwa`.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`.

Do not use the general `npm test` suite for safe read-only verification: it
contains database writes unrelated to intake.
