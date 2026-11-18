# Program-owned QR codes and scan history

Select the correct **TUPAD Program** before scanning. Each registered QR belongs to one current program. A 3rd Batch QR scanned under Skilled Workers (or vice versa) returns **WRONG WORK PROGRAM** before beneficiary lookup, sequence checks or writes. Identical stub numbers in different open programs require different QR tokens. A replacement within the same program may retain that program's slot QR; a closed-cycle physical card may be explicitly reissued as described below.

### Reusing an existing physical card

In **Stub / QR Creation**, select the new program and choose **Register Existing Printed QR**. Scan/upload the complete card QR. An admin with `qr.generate` can reissue a card from a **CLOSED/COMPLETED** program to an **ACTIVE/DRAFT** program whose masterlist contains exactly one active beneficiary at that printed number. Cards still assigned to an open program cannot be taken by another program. Registering again to the same program is idempotent.

The registration is a versioned `QR_PROGRAM_BINDING` audit event, not a change to the original QR row or old attendance/orientation/stub/payout records. Scanners and camera links use the latest explicit registration, rather than guessing from the token's old program prefix. Other programs still receive **WRONG WORK PROGRAM**. Run **Master Key Sync** on offline devices after a registration so the QR→current-program reference is updated. Simply selecting another program never reissues a card.

The masterlist, work-program page, stub printing and all four field scanners remember the selected program on the device. Moving from a masterlist to attendance keeps that program instead of silently opening the newest program. An explicit `?programId=...` link overrides the remembered choice; unavailable programs fall back to the available list. Results from a previous program are cleared, and delayed scan responses cannot restore them after a switch. Stub #1 therefore displays the #1 beneficiary from the selected program's masterlist, with that program's own orientation and attendance history.

Masterlist imports require an explicit batch. The upload dialog follows the current masterlist each time it opens and clears the previous file/preview. Preview and commit must target the same batch; neither endpoint silently selects the newest active program. The preview names the target batch and shows existing stub numbers whose names would change. Import audit records retain the previous enrolments and QR bindings, and source snapshots include designated numbers for recovery. Changing a work schedule or scanning/uploading a QR image does not restore an overwritten beneficiary roster.

- New program + uploaded roster: new enrolment IDs and QR records; stub distribution, orientation, daily attendance and payout start pending/zero.
- Existing program + another upload or QR generation: existing scans are **preserved**, not erased. Create a genuinely new program for a new work cycle.
- Archived programs retain their original beneficiaries, scans, dates and payout/restriction history. Their physical cards can serve a new cycle only after explicit registration; historical records stay in the original program.
- A slot missing from the selected roster is rejected. Duplicate active slots are rejected for review. Numeric entries are exact slots, never QR-token substrings. Partial/unregistered and explicitly invalidated tokens are rejected.
- Without a selected program, scanner write requests are rejected. Built-in phone camera links open the QR's registered program. An explicit mismatched program is rejected; these assignment lookups do not record attendance or payout. Numeric manual entries remain exact slots within the selected program.

## More than 522 beneficiaries

The importer generates a QR for every new enrolment, including designated numbers above 522. In **Stub / QR Creation → Generate Designated QR for All**, use **Add missing QR codes (kasama ang #523 pataas)** to repair incomplete/legacy generation. For an uploaded #1–#600 roster with only the first 522 codes, this adds exactly #523–#600. It preserves existing tokens, numbering and scan history. Repeating it adds zero duplicates. Actual uploaded designated numbers are used; there is no fixed 522 cap and no creation of unassigned slots.

Generation is transactional, batch-inserted and serialized against imports for the same program. Force Refresh changes active print tokens, not scan history; old printed slot references work only within their registered program unless explicitly invalidated.

## Offline devices

After deployment and roster upload, run **Master Sync** on each scanner while online. Registered QR→slot references now include `programId`. Legacy caches can use an exact known QR owner; ambiguous references require Master Sync and never guess by matching stub number. A wrong-program offline QR displays an error without creating attendance or queue entries. Existing scans and unsynced transactions are retained. Queued scans include the scanned token; the server checks its program even when a beneficiary ID is supplied. HTTP rejections are shown to the user rather than replayed as offline scans.

## Verification

- `node test/test-program-qr-postgres.mjs`: disposable loopback-only PostgreSQL, 600-row import, wrong-program QR rejection in both directions at all four scanner stages without writes, correct-program acceptance, repeated-scan blocks, #523–#600 extension, history preservation, public assignment routing, authentication and queued-token isolation. Requires local PostgreSQL binaries (`TEST_POSTGRES_BIN` override supported); never uses `.env` database URLs.
- `node test/test-program-qr-offline.mjs`: actual browser IndexedDB/Dexie upgrade, QR ownership checks, ambiguous legacy-cache rejection, separate histories/queues, duplicate checks and invalidation. Synthetic origin, no server requests.
- `node test/test-program-qr-browser.mjs`: real application UI with all API calls mocked; all scanner requests carry selected program, stale results clear after switching programs, and the missing-code action is available. Uses the local dev server (`OCR_TEST_URL` override supported); no real camera or database writes.

No production data reset or database schema migration is required for this change.
