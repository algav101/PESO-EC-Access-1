"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Loader2, RotateCcw, X } from "lucide-react";
import { getPhilippineTime, ATTENDANCE_SLOT_LABELS } from "@/lib/utils";
import { MASTERLIST_ATTENDANCE_RANGES } from "@/lib/masterlist-attendance-time";

type Day = { id: string; dayNumber: number; workDate: string; status: string };
type Result = { updatedCount: number; skippedCount: number; slotLabel: string; timeRangeLabel: string; workDay: Day;
  results: { programBeneficiaryId: string; designatedNumber: string; fullName: string; status: string; reason: string; attendanceTime: string | null }[] };

export function BulkAttendanceModal({ programId, programName, selectedIds, onClose, onRecorded, onRestoreSelection }: {
  programId: string; programName: string; selectedIds: string[];
  onClose: () => void; onRecorded: (recordedIds: string[]) => void;
  onRestoreSelection?: () => void;
}) {
  const [days, setDays] = useState<Day[]>([]);
  const [workDayId, setWorkDayId] = useState("");
  const [shiftMode, setShiftMode] = useState("MORNING_IN");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/v1/programs/${programId}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load attendance days.");
        if (data.program?.status !== "ACTIVE") throw new Error("Attendance is available only for an active work program.");
        const available = (data.program.workDays || []).filter((day: Day) => day.status !== "CANCELLED").sort((a: Day, b: Day) => a.dayNumber - b.dayNumber);
        if (!available.length) throw new Error("No attendance days are configured for this program.");
        if (!cancelled) {
          setDays(available);
          setWorkDayId(available.find((day: Day) => day.workDate === getPhilippineTime().dateStr)?.id || available[0].id);
        }
      } catch (error: any) { if (!cancelled) setError(error.message); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [programId]);
  const day = days.find((day) => day.id === workDayId);
  const timeRange = MASTERLIST_ATTENDANCE_RANGES[shiftMode as keyof typeof MASTERLIST_ATTENDANCE_RANGES];
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!day || saving || result) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/v1/programs/${programId}/attendance/bulk`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programBeneficiaryIds: selectedIds, workDayId: day.id, targetDate: day.workDate, shiftMode, remarks: remarks.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Attendance could not be saved. Refresh the masterlist before retrying.");
      setResult(data);
      onRecorded(data.results.filter((row: { status: string }) => row.status === "RECORDED").map((row: { programBeneficiaryId: string }) => row.programBeneficiaryId));
      window.dispatchEvent(new CustomEvent("tupad-attendance-updated"));
      window.dispatchEvent(new CustomEvent("tupad-offline-synced"));
    } catch (error: any) { setError(error.message); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-3 sm:p-5 flex items-center justify-center">
      <section role="dialog" aria-modal="true" aria-labelledby="bulk-attendance-title" className="bg-white rounded-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto shadow-2xl border-t-4 border-gov-blue p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="bulk-attendance-title" className="font-black text-slate-900 flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-gov-blue" />Attendance for Selected Beneficiaries</h2>
            <p className="text-xs text-slate-600 mt-1 break-words">{programName} · {selectedIds.length} selected</p>
          </div>
          <button type="button" aria-label="Close attendance" disabled={saving} onClick={onClose} className="p-1 rounded hover:bg-slate-100 disabled:opacity-40"><X className="w-5 h-5" /></button>
        </div>
        {error && <p role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">{error}</p>}
        {loading ? <p className="text-xs flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading attendance days…</p> : result ? (
          <div className="space-y-3">
            <p role="status" className="p-3 bg-blue-50 rounded-xl font-bold text-sm text-gov-blue">{result.updatedCount} recorded · {result.skippedCount} skipped</p>
            <p className="text-xs">Day {result.workDay.dayNumber} · {result.workDay.workDate} · {result.slotLabel} — {result.timeRangeLabel}</p>
            <ul className="max-h-64 overflow-y-auto divide-y border rounded-lg text-xs">
              {result.results.map((row) => <li key={row.programBeneficiaryId} className="p-2.5 space-y-1">
                <p className="font-semibold">#{row.designatedNumber} — {row.fullName}</p>
                <p className={row.status === "RECORDED" ? "text-emerald-700" : "text-amber-800"}>{row.status === "RECORDED" ? `Attendance recorded · ${row.attendanceTime ? new Date(row.attendanceTime).toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit", second: "2-digit" }) : ""} (Philippine time)` : row.reason}</p>
              </li>)}
            </ul>
            <div className="flex flex-wrap gap-2">
              {onRestoreSelection && <button type="button" onClick={onRestoreSelection} className="flex-1 border border-sky-300 bg-sky-50 text-sky-800 rounded-xl px-3 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"><RotateCcw className="w-3.5 h-3.5" />Previous Selection</button>}
              <button type="button" onClick={onClose} className="flex-1 bg-gov-blue text-white rounded-xl px-3 py-2.5 text-xs font-bold">Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-xs font-bold text-slate-700">Attendance Day
              <select value={workDayId} onChange={(event) => setWorkDayId(event.target.value)} disabled={saving} required className="w-full mt-1 px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-gov-blue disabled:opacity-50">
                {!days.length && <option value="">No available work day</option>}
                {days.map((day) => <option key={day.id} value={day.id}>Day {day.dayNumber} — {day.workDate}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold text-slate-700">Attendance Shift
              <select value={shiftMode} onChange={(event) => setShiftMode(event.target.value)} disabled={saving} className="w-full mt-1 px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-gov-blue disabled:opacity-50">
                {Object.entries(ATTENDANCE_SLOT_LABELS).map(([slot, label]) => <option key={slot} value={slot}>{label} — {MASTERLIST_ATTENDANCE_RANGES[slot as keyof typeof MASTERLIST_ATTENDANCE_RANGES].label}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold text-slate-700">Remarks (Optional)
              <input value={remarks} onChange={(event) => setRemarks(event.target.value)} maxLength={1000} disabled={saving} className="w-full mt-1 px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-gov-blue disabled:opacity-50" />
            </label>
            <p data-testid="masterlist-attendance-time" className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-gov-blue font-semibold">Random time range: {day?.workDate || "—"} · {timeRange.label} (Philippine time)</p>
            <p className="text-xs text-slate-500">Bawat beneficiary ay bibigyan ng random na oras sa range ng napiling shift at attendance date, kahit anong oras mo ito i-save. Makikita ang na-record na oras pagkatapos i-save. Ang may attendance na o kulang sa orientation ay isi-skip.</p>
            <div className="flex gap-2 justify-end border-t pt-3">
              <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-xs font-bold rounded-lg border">Cancel</button>
              <button type="submit" disabled={saving || !day} className="px-4 py-2 text-xs font-bold rounded-lg bg-gov-blue text-white disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}{saving ? "Recording Attendance…" : `Record Attendance (${selectedIds.length})`}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
