# Reports: supplied DOLE 2026 workbook

## User workflow

1. Admin: create/select the TUPAD program and download **Form 4 for consolidated** from its masterlist import screen. Fill the two-header-row sheet, keeping `No.` and the individual beneficiary/dependent name columns. Upload, preview and commit to the correct program. Previous CSV layouts still work. The blank grid includes 600 starter rows; additional rows may be appended up to the existing 2,000-row import limit.
2. Admin or DOLE: open **EC TUPAD Management → Reports**, select the program and choose the required report sheets. Existing operational exports remain available below the new DOLE section.
3. Expand **Program details and signatories** to complete missing fields, including approved daily wage rate and TUPAD ID prefix/start. Review beneficiary fields and fill blanks. Edits are report-only; they do not change beneficiary profiles, program dates, attendance, payouts or QR history.
4. **Save report draft** stores a versioned draft for that program. **Generate Excel** downloads the populated original workbook. **Print via Excel** prepares the same native-layout workbook with the chosen sheets visible/grouped.
5. Open the download in **Microsoft Excel 365**, wait for full recalculation, and review the output. Use **Ctrl+P → Print Active Sheets**, keeping the original paper/orientation/scale/margins. This is not direct PDF, browser printing, silent printing or a browser reconstruction of the template.

All twelve source sheets are supported. Non-selected dependency sheets are hidden rather than deleted, preserving cross-sheet formulas. The source uses LET, XLOOKUP and dynamic arrays; older Excel engines may not calculate it correctly. There are no external formula links introduced by the application.

## Preservation and source handling

- The source workbook in Downloads is never overwritten. `public/templates/dole-2026-all-forms.xlsx` is a sanitized reusable asset prepared with `scripts/prepare-dole-template.mjs`.
- Original source SHA256: `ebedd1e75df2cadc8fd0b491c07ebb396f6cd3e11f2e9300c8365fa8b79ebe4b`.
- Sample beneficiary data, unused shared strings containing private values, cached formula results, private annotation text/authors and document author metadata are removed. Original formula text, image/media bytes, drawings, cell styles, logos, row heights, column widths, merges and paper settings are preserved. The obsolete calculation chain is removed and full native recalculation is requested on open.
- With the user's approval, the source USSC PAYROLL print area is corrected from column A only to A:I, and LIST MED print titles are corrected from `#REF!` to rows 5:6.
- Program metadata and real masterlist fields fill the working sheet. Native lookup, phone cleanup, TUPAD ID sequencing, date/age, senior filtering, summary, DTR totals and payroll formulas remain in Excel. Wage rates are not assumed from the example workbook.
- DTR inputs use completed AM and PM sessions in the chosen program (0.5 day per completed session). Missing scans are not copied from another program or converted to ten completed days. Payroll uses the original DTR→days→rate formulas; rate is required before payroll/salary exports. Attendance corrections use the existing program workflow, not arbitrary report-cell overrides.
- Original data blocks expand when needed (tested with 600 and 1,200 beneficiaries), with translated row formulas and shifted signature/footer rows. Existing cell styles/drawings remain intact. Unused fixed-grid rows are hidden for printing. The original DTR has ten day columns; exports depending on it reject programs over ten days instead of silently truncating attendance or changing the approved layout.
- Additional edits by cell address are restricted to existing blank header/footer cells. Formulas, populated cells and roster/attendance rows cannot be overwritten this way. Standard signatory fields are preferred because they track expanding footers automatically.

## Program isolation and persistence

No shared database migration is required. The existing private AuditLog store contains immutable, program-scoped report source snapshots (`PROGRAM_REPORT_MASTERLIST`) and drafts (`PROGRAM_REPORT_DRAFT`). They are not written to the publicly readable system-settings endpoint.

Source snapshot capture is inside the masterlist commit transaction; a failed import leaves neither roster changes nor a partial report source. Later imports merge snapshots by beneficiary ID within that program. Reports use these program snapshots first, so an edit/import in another program does not silently replace the original source details. Older programs without snapshots fall back to their linked beneficiary/dependent profiles; missing extra fields can be completed in the report draft or supplied by a fresh masterlist upload.

Draft row edits are keyed by program-enrolment ID, not array position. Removed/replaced enrollee edits are ignored; posted IDs from another program are rejected. Save operations share the program import lock and enforce draft revision checks. Only Domain Master, PESO Admin and DOLE Coordinator can access the new APIs/panel. Exports carry private/no-store headers and source formula-like text is written as literal text, not executed as an Excel formula.

## Verification

- `node test/test-dole-reports.mjs`: privacy cleanup, all source formula strings, selected native tabs, program-scoped report fields, source logo/drawing/style hashes, typed zero income, literal formula-like IDs, 600/1,200-row expansion, Form 4 column offsets/dependent names, draft revision/role isolation, print preparation.
- `node test/test-dole-reports-browser.mjs`: actual app UI with all API requests mocked; 12 sheet choices, DOLE access, program autofill, editable blanks, draft save, downloads, print instructions, role gating and switching-program isolation.
- `node test/test-masterlist-import-postgres.mjs`: disposable loopback PostgreSQL; atomic masterlist/source snapshot capture, saved draft retrieval and stale-draft protection in addition to existing import rollback/QR checks. Shared Supabase/production database is not used.
- Source header previews were inspected with the spreadsheet artifact renderer using a header-only review copy, because importing the entire original full-column/formula-heavy workbook exhausted the preview engine heap. Generated workbook XML was independently parsed with the Windows XML parser. Formula/media/style preservation is checked structurally. Full Excel 365 recalculation and a physical printer have not been exercised in this environment; they remain a native-client check before official release.

No new Excel engine, PDF conversion service, database package or paid API was added.
