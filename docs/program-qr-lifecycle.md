# Reusable QR slots and per-program scan history

Select the correct **TUPAD Program** before scanning. A registered printed QR is a reusable **designated slot**, not a permanent beneficiary identity. Scanning an old #113 card in a new program resolves the active #113 enrollee in that program, even when a different person now occupies the slot.

- New program + uploaded roster: new enrolment IDs and QR records; stub distribution, orientation, daily attendance and payout start pending/zero.
- Existing program + another upload or QR generation: existing scans are **preserved**, not erased. Create a genuinely new program for a new work cycle.
- Archived programs retain their original beneficiaries, scans, dates and payout/restriction history. Reusing a printed card never transfers that history.
- A slot missing from the selected roster is rejected. Duplicate active slots are rejected for review. Numeric entries are exact slots, never QR-token substrings. Partial/unregistered and explicitly invalidated tokens are rejected.
- Without a selected program, scanner write requests are rejected. Built-in phone camera links use the latest active/draft program unless an explicit program is supplied; these assignment lookups do not record attendance or payout.

## More than 522 beneficiaries

The importer generates a QR for every new enrolment, including designated numbers above 522. In **Stub / QR Creation → Generate Designated QR for All**, use **Add missing QR codes (kasama ang #523 pataas)** to repair incomplete/legacy generation. For an uploaded #1–#600 roster with only the first 522 codes, this adds exactly #523–#600. It preserves existing tokens, numbering and scan history. Repeating it adds zero duplicates. Actual uploaded designated numbers are used; there is no fixed 522 cap and no creation of unassigned slots.

Generation is transactional, batch-inserted and serialized against imports for the same program. Force Refresh changes active print tokens, not scan history; old printed slot references remain reusable unless explicitly invalidated.

## Offline devices

After deployment and roster upload, run **Master Sync** on each scanner while online. Registered QR→slot aliases and the current program roster must be cached before going offline. IndexedDB upgrades retain previous scans and unsynced transactions. Queue entries keep their original program; the server rejects mismatched enrolment/program/work-day combinations. HTTP rejections are shown to the user rather than replayed as offline scans.

## Verification

- `node test/test-program-qr-postgres.mjs`: disposable loopback-only PostgreSQL, 600-row import, zero new-program records, old printed QR mapped to a different new enrollee, all four scan stages, repeated-scan blocks, #523–#600 extension, history preservation, public assignment routing, authentication and sync isolation. Requires local PostgreSQL binaries (`TEST_POSTGRES_BIN` override supported); never uses `.env` database URLs.
- `node test/test-program-qr-offline.mjs`: actual browser IndexedDB/Dexie v2→v3 migration, alias resolution, separate histories/queues, duplicate checks and invalidation. Synthetic origin, no server requests.
- `node test/test-program-qr-browser.mjs`: real application UI with all API calls mocked; all scanner requests carry selected program, stale results clear after switching programs, and the missing-code action is available. Uses the local dev server (`OCR_TEST_URL` override supported); no real camera or database writes.

No production data reset or database schema migration is required for this change.
