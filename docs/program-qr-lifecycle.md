# Program-owned QR codes and scan history

All four field scanners automatically identify the registered QR's **current program and masterlist enrolment**, without requiring a program selection. A 3rd Batch card scanned while Skilled Workers is displayed identifies 3rd Batch and uses only its beneficiary and workflow records. The selector continues to control monitoring/date preferences; the detected identity panel explicitly names the program used for the scan. Identical stub numbers across programs do not share a QR identity.

New cards use `TUPAD-V2-<printed slot>-<192-bit random identifier>`. The globally unique `QrCode` row holds the full program ID, enrolment ID and verification hash. The QR contains no beneficiary name or birthday. V2 tokens are validated by exact registered lookup, structural validation and constant-time HMAC verification. Legacy registered tokens remain valid without regeneration; historical imports used differing hash conventions, so legacy verification uses the exact registered token. Unregistered tokens, invalidated cards, inactive programs and inactive/missing masterlist enrolments are rejected before writes.

Every verified scan response includes the detected program ID/code/name, enrolment/beneficiary IDs, printed number, full name, QR ID/version, verification status and timestamp. The interface displays the identity even when an existing sequence or duplicate rule blocks the operation. Successful scan audit metadata includes the verified identity, operator, timestamp and result.

Number-only QR codes carry no program identity. They are checked across masterlists; multiple matching enrolments produce **AMBIGUOUS QR**, regardless of the displayed program. Use a registered program-specific QR. Strict program matching remains available internally for queued transactions and confirmations: an existing queued operation must never migrate to another program when a physical card is later reissued.

### Reusing an existing physical card

In **Stub / QR Creation**, select the new program and choose **Register Existing Printed QR**. Scan/upload the complete card QR. An admin with `qr.generate` can reissue a card from a **CLOSED/COMPLETED** program to an **ACTIVE/DRAFT** program whose masterlist contains exactly one active beneficiary at that printed number. Cards still assigned to an open program cannot be taken by another program. Registering again to the same program is idempotent.

The registration is a versioned `QR_PROGRAM_BINDING` audit event, not a change to the original QR row or old attendance/orientation/stub/payout records. Scanners and camera links use the latest explicit registration, rather than guessing from the token's old prefix or the displayed program. Run **Master Key Sync** on offline devices after a registration so the QR→current-program reference is updated. Simply selecting another program never reissues a card.

For a whole reused set, select the **closed source program** in Stub / QR Creation and click **Register All Matching Printed QRs**. This explicitly registers every non-invalidated source QR with a matching active number in the selected masterlist, including cards beyond #1. Missing/inactive slots are skipped; duplicate active slots and cards currently registered to another open program reject the entire transaction. Repeating the operation does not create duplicate registrations. A single-card registration transfers only that card.

The masterlist, work-program page, printing and scanner monitoring remember the displayed program. An explicit `?programId=...` link chooses the displayed monitoring context. QR interpretation always follows its registered identity. Results clear after a manual context change, and delayed responses cannot restore a stale preview. Birthday and payout confirmations retain the scanned enrolment's program, and reject an identity changed after preview. Attendance uses a work day for the detected program on the requested date; another displayed program's work-day/area IDs are discarded. A missing date is rejected rather than silently recording the first work day.

Masterlist imports require an explicit batch. The upload dialog follows the current masterlist each time it opens and clears the previous file/preview. Preview and commit must target the same batch; neither endpoint silently selects the newest active program. The preview names the target batch and shows existing stub numbers whose names would change. Import audit records retain the previous enrolments and QR bindings, and source snapshots include designated numbers for recovery. Changing a work schedule or scanning/uploading a QR image does not restore an overwritten beneficiary roster.

- New program + uploaded roster: new enrolment IDs and QR records; stub distribution, orientation, daily attendance and payout start pending/zero.
- Existing program + another upload or QR generation: existing scans are **preserved**, not erased. Create a genuinely new program for a new work cycle.
- Archived programs retain their original beneficiaries, scans, dates and payout/restriction history. Their physical cards can serve a new cycle only after explicit registration; historical records stay in the original program.
- A slot missing from the selected roster is rejected. Duplicate active slots are rejected for review. Numeric entries are exact slots, never QR-token substrings. Partial/unregistered and explicitly invalidated tokens are rejected.
- Without a selected program, registered QR scans and phone camera links still resolve their owner. Public assignment lookup retains its existing beneficiary authentication/privacy checks and never records attendance or payout.

## Active masterlist uniqueness

`prisma/migrations/20261119000100_qr_active_roster_identity/migration.sql` adds a partial unique index for active/enrolled/flagged slots per program. Numeric `001` and `1` are the same slot. Replaced/inactive historical enrolments remain intact. Index creation fails safely on conflicting existing active rows; it never deletes or renames records. The importer vacates affected slots transactionally before swaps/replacements so a valid roster change satisfies the constraint.

Apply this additive index when releasing to another database:

```powershell
npx prisma db execute --file prisma/migrations/20261119000100_qr_active_roster_identity/migration.sql --schema prisma/schema.prisma
```

## More than 522 beneficiaries

The importer generates a QR for every new enrolment, including designated numbers above 522. In **Stub / QR Creation → Generate Designated QR for All**, use **Add missing QR codes (kasama ang #523 pataas)** to repair incomplete/legacy generation. For an uploaded #1–#600 roster with only the first 522 codes, this adds exactly #523–#600. It preserves existing tokens, numbering and scan history. Repeating it adds zero duplicates. Actual uploaded designated numbers are used; there is no fixed 522 cap and no creation of unassigned slots.

Generation is transactional, batch-inserted and serialized against imports for the same program. Force Refresh changes active print tokens, not scan history; old printed slot references work only within their registered program unless explicitly invalidated.

## Offline devices

After deployment and roster upload, run **Master Sync** on each scanner while online. Registered QR references include `programId`. Offline scanners automatically identify the registered owner and resolve its cached active masterlist. Legacy caches may use an exact known QR owner; unknown ownership requires Master Sync. Number-only ambiguity and inactive programs are rejected. Offline pass generation uses registered cached tokens only, never number-only or invented fallback tokens. Existing scans/queues are retained. Queued scans include the original program, enrolment and scanned token; server sync verifies all three and never silently redirects a queued operation. HTTP rejections remain errors rather than being replayed as offline scans.

## Verification

- `node test/test-program-qr-postgres.mjs`: disposable loopback-only PostgreSQL, 600-row import, 100 programs sharing #001, automatic/strict resolution, HMAC and invalid token checks, active-slot uniqueness, imports/replacements, duplicate protection, date/payout isolation, audit identity, legacy reissue, history preservation and queued-token isolation. Requires local PostgreSQL binaries (`TEST_POSTGRES_BIN` override supported); never uses `.env` database URLs.
- `node test/test-program-qr-offline.mjs`: actual browser IndexedDB/Dexie upgrade, QR ownership checks, ambiguous legacy-cache rejection, separate histories/queues, duplicate checks and invalidation. Synthetic origin, no server requests.
- `node test/test-program-qr-browser.mjs`: real application UI with all API calls mocked; all scanner requests carry selected program, stale results clear after switching programs, and the missing-code action is available. Uses the local dev server (`OCR_TEST_URL` override supported); no real camera or database writes.
- `node test/test-auto-qr-browser.mjs`: real QR PNG upload and four scanner interfaces, program C while A is displayed, correct birthday/payout confirmations, A/B/C sharing #001, no-selection scanning, ambiguity/unknown/sequence errors, and mobile layout. APIs mocked; no live writes.

No data reset or regeneration of existing printed cards is required.
