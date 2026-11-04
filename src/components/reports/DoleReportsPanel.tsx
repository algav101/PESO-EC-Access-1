"use client";
import React, { useEffect, useState } from "react";
import { Download, Printer, Save, RefreshCw } from "lucide-react";
import { DOLE_REPORT_SHEETS, REPORT_META_FIELDS, REPORT_ROW_FIELDS, type DoleReportData, type DoleReportDraft, type DoleSheetName } from "@/lib/dole-report-config";

export function DoleReportsPanel({ programId }: { programId: string }) {
  const [data, setData] = useState<DoleReportData | null>(null);
  const [draft, setDraft] = useState<DoleReportDraft>({ meta: {}, rows: {}, cells: {} });
  const [selected, setSelected] = useState<DoleSheetName[]>(["FORM 4 FINAL"]);
  const [rowId, setRowId] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cellSheet, setCellSheet] = useState<string>("FORM 4 FINAL"), [cellRef, setCellRef] = useState(""), [cellValue, setCellValue] = useState("");
  const endpoint = `/api/v1/programs/${encodeURIComponent(programId)}/reports`;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setData(null); setError(""); setMessage("");
    fetch(endpoint, { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Unable to load report data.");
      if (!controller.signal.aborted) { setData(json); setDraft(json.draft); setRowId(json.rows[0]?.id || ""); }
    }).catch((e) => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint]);

  async function run(action: "save" | "generate" | "print") {
    if (!data) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, sheets: selected, draft, revision: data.revision }) });
      if (!response.ok) { let json; try { json = await response.json(); } catch {} throw new Error(json?.error || `Report request failed (HTTP ${response.status}).`); }
      if (action === "save") {
        const refreshed = await fetch(endpoint, { cache: "no-store" });
        if (!refreshed.ok) throw new Error("Draft saved, but refresh failed. Reload before editing again.");
        const json = await refreshed.json(); setData(json); setDraft(json.draft); setMessage("Report draft saved for this program. Beneficiary profiles were not changed.");
      } else {
        const blob = await response.blob(), url = URL.createObjectURL(blob);
        const link = document.createElement("a"); link.href = url;
        link.download = `${action === "print" ? "PRINT" : "REPORTS"}_${data.program.programCode.replace(/[^A-Za-z0-9_-]/g, "_")}.xlsx`;
        document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
        setMessage(action === "print"
          ? "Print workbook downloaded. Open in Microsoft Excel 365, wait for recalculation, then Ctrl+P → Print Active Sheets. The selected sheets are grouped; original logos, paper size and layout are retained."
          : "Workbook downloaded. Open in Microsoft Excel 365 and allow the original formulas to recalculate. Only your selected reports are visible; dependency sheets remain in the workbook.");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to generate report."); }
    finally { setBusy(false); }
  }
  const row = data?.rows.find((r) => r.id === rowId);
  const shownRows = data?.rows.filter((r) => `${r.designatedNumber} ${r.fullName}`.toLowerCase().includes(search.toLowerCase())) || [];
  return <section aria-label="DOLE template reports" className="gov-card p-5 space-y-5 border-t-4 border-emerald-600">
    <div className="flex flex-wrap justify-between gap-3">
      <div><h2 className="font-black text-lg">DOLE Reports</h2><p className="text-xs text-slate-600">Original 2026 Excel templates • Masterlist + selected work program • Admin and DOLE</p></div>
      <a className="text-xs font-bold text-gov-blue underline" href="/api/v1/beneficiaries/template">Download Form 4 consolidated upload template</a>
    </div>
    {loading && <p role="status">Loading program report data…</p>}
    {error && <p role="alert" className="p-3 bg-red-50 text-red-800 rounded-xl">{error}</p>}
    {message && <p role="status" className="p-3 bg-emerald-50 text-emerald-900 rounded-xl">{message}</p>}
    {data && <fieldset disabled={busy} className="space-y-5 disabled:opacity-70">
      <p className="text-sm"><strong>{data.program.programName}</strong> · {data.rows.length} beneficiaries · {data.workDays.length} scheduled work days</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {DOLE_REPORT_SHEETS.map((sheet) => <label key={sheet.name} className="flex gap-2 border rounded-xl p-3 text-xs items-start">
          <input type="checkbox" checked={selected.includes(sheet.name)} onChange={(e) => setSelected((old) => e.target.checked ? [...old, sheet.name] : old.filter((s) => s !== sheet.name))}/>
          <span><strong className="block">{sheet.name}</strong>{sheet.label}</span>
        </label>)}
      </div>
      <details className="rounded-xl border p-4">
        <summary className="font-bold cursor-pointer">Program details and signatories</summary>
        <p className="text-xs text-slate-500 my-3">Existing program details are fetched automatically. Fill missing details or adjust this report draft without changing the program or masterlist.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {REPORT_META_FIELDS.map(([key, label]) => <label key={key} className="text-xs font-bold">{label}
            <input className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-gov-blue w-full mt-1 font-normal" aria-label={label} value={draft.meta[key] ?? data.meta[key] ?? ""} onChange={(e) => setDraft((old) => ({ ...old, meta: { ...old.meta, [key]: e.target.value } }))}/>
          </label>)}
        </div>
      </details>
      <details className="rounded-xl border p-4">
        <summary className="font-bold cursor-pointer">Review beneficiary details / fill blanks</summary>
        <div className="grid sm:grid-cols-2 gap-3 my-3">
          <input aria-label="Find report beneficiary" className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-gov-blue" placeholder="Find name or designated number" value={search} onChange={(e) => setSearch(e.target.value)}/>
          <select aria-label="Report beneficiary" className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-gov-blue" value={rowId} onChange={(e) => setRowId(e.target.value)}>
            {shownRows.map((r) => <option key={r.id} value={r.id}>#{r.designatedNumber} — {r.fullName}</option>)}
          </select>
        </div>
        {row && <><p className="text-xs mb-3">Verified attendance days: {row.attendance.reduce<number>((sum, v) => sum + (v || 0), 0)}. Payroll and DTR formulas use these records, not an assumed full attendance.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{REPORT_ROW_FIELDS.map(([key, label]) => <label key={key} className="text-xs font-bold">{label}
            <input className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-gov-blue w-full mt-1 font-normal" aria-label={`Beneficiary ${label}`} value={draft.rows[row.id]?.[key] ?? row[key] ?? ""} onChange={(e) => setDraft((old) => ({ ...old, rows: { ...old.rows, [row.id]: { ...old.rows[row.id], [key]: e.target.value } } }))}/>
          </label>)}</div></>}
      </details>
      <details className="rounded-xl border p-4">
        <summary className="font-bold cursor-pointer">Additional blank header/footer cells</summary>
        <p className="text-xs my-3">Optional: enter a blank header/footer cell address. Formula cells, roster rows and existing content cannot be replaced. Use the fields above for mapped details. Attendance must be recorded/corrected in the selected program.</p>
        <div className="grid sm:grid-cols-4 gap-2">
          <select aria-label="Blank cell sheet" className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-gov-blue" value={cellSheet} onChange={(e) => setCellSheet(e.target.value)}>{DOLE_REPORT_SHEETS.map((s) => <option key={s.name}>{s.name}</option>)}</select>
          <input aria-label="Blank cell address" className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-gov-blue" placeholder="Cell address" value={cellRef} onChange={(e) => setCellRef(e.target.value.toUpperCase())}/>
          <input aria-label="Blank cell value" className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-gov-blue" placeholder="Value" value={cellValue} onChange={(e) => setCellValue(e.target.value)}/>
          <button type="button" className="rounded-lg bg-gov-blue px-4 py-2 text-sm font-bold text-white hover:bg-gov-dark disabled:opacity-50" onClick={() => { if (/^[A-Z]{1,2}[1-9]\d{0,3}$/.test(cellRef)) { setDraft((old) => ({ ...old, cells: { ...old.cells, [cellSheet]: { ...old.cells[cellSheet], [cellRef]: cellValue } } })); setCellRef(""); setCellValue(""); } else setError("Enter a valid cell address."); }}>Add blank-cell edit</button>
        </div>
        {Object.entries(draft.cells).flatMap(([sheet, cells]) => Object.entries(cells).map(([ref, value]) => <div className="flex justify-between text-xs py-2" key={sheet+ref}><span>{sheet}!{ref}: {value}</span><button type="button" onClick={() => setDraft((old) => { const next = { ...old.cells[sheet] }; delete next[ref]; return { ...old, cells: { ...old.cells, [sheet]: next } }; })}>Remove</button></div>))}
      </details>
      <div className="text-xs bg-amber-50 rounded-xl p-3 space-y-1">{data.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100 disabled:opacity-50 flex gap-2 items-center" onClick={() => run("save")}><Save className="w-4 h-4"/>Save report draft</button>
        <button type="button" disabled={!selected.length || !data.rows.length} className="rounded-lg bg-gov-blue px-4 py-2 text-sm font-bold text-white hover:bg-gov-dark disabled:opacity-50 flex gap-2 items-center" onClick={() => run("generate")}><Download className="w-4 h-4"/>Generate Excel</button>
        <button type="button" disabled={!selected.length || !data.rows.length} className="rounded-lg bg-gov-blue px-4 py-2 text-sm font-bold text-white hover:bg-gov-dark disabled:opacity-50 flex gap-2 items-center" onClick={() => run("print")}><Printer className="w-4 h-4"/>Print via Excel</button>
        {busy && <span role="status" className="flex gap-2 items-center text-xs"><RefreshCw className="w-4 h-4 animate-spin"/>Preparing original template…</span>}
      </div>
      <p className="text-xs text-slate-500">Print via Excel prepares a download; it does not open a browser print dialog or send directly to a printer. In Excel 365, wait for recalculation and print the selected active sheets with the original paper/layout settings.</p>
    </fieldset>}
  </section>;
}
