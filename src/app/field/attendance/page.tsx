"use client";

import React, { useEffect, useState } from "react";
import {
  Clock,
  QrCode,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Camera,
  RefreshCw,
  Sun,
  Moon,
  ArrowRight,
  FileSpreadsheet,
  MapPin,
  RotateCcw,
  Key,
} from "lucide-react";
import { QrScannerModal } from "@/components/scanner/QrScannerModal";
import { FieldQrPassGeneratorModal } from "@/components/field/FieldQrPassGeneratorCard";
import { useOffline } from "@/context/OfflineContext";
import { offlineDb, queueOfflineTransaction, recordOfflineAttendance } from "@/lib/dexie";
import { format } from "date-fns";

export default function DailyAttendancePage() {
  const { isOnline, masterSyncNow, isSyncing } = useOffline();

  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [workDays, setWorkDays] = useState<any[]>([]);
  const [selectedWorkDayId, setSelectedWorkDayId] = useState<string>("");
  const [shiftMode, setShiftMode] = useState<string>("AUTO");

  // Work program area assignment state
  const [workPrograms, setWorkPrograms] = useState<any[]>([]);
  const [selectedAreaItemId, setSelectedAreaItemId] = useState<string>("AUTO");

  const [scannerOpen, setScannerOpen] = useState(false);
  const [qrGeneratorOpen, setQrGeneratorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any | null>(null);

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (selectedProgramId) {
      const prog = programs.find((p) => p.id === selectedProgramId);
      if (prog) {
        setWorkDays(prog.workDays || []);
        if (prog.workDays?.length > 0) {
          const todayStr = format(new Date(), "yyyy-MM-dd");
          const todayWd = prog.workDays.find((w: any) => w.workDate === todayStr);
          setSelectedWorkDayId(todayWd ? todayWd.id : prog.workDays[0].id);
        }
      }
      fetchWorkPrograms(selectedProgramId);
    }
  }, [selectedProgramId, programs]);

  const fetchPrograms = async () => {
    try {
      if (typeof navigator === "undefined" || navigator.onLine) {
        const res = await fetch("/api/v1/programs");
        if (res.ok) {
          const data = await res.json();
          const progs = data.programs || [];
          if (progs.length > 0) {
            setPrograms(progs);
            setSelectedProgramId((prev) => prev || progs[0].id);
            return;
          }
        }
      }
    } catch (e) {
      console.warn("Online programs fetch failed, falling back to offline storage:", e);
    }

    // Offline fallback from IndexedDB on installed unit
    try {
      const cachedProgs = await offlineDb.cachedPrograms.toArray();
      const allCachedWorkDays = await offlineDb.cachedWorkDays.toArray();

      const progsWithDays = cachedProgs.map((p) => ({
        ...p,
        workDays: allCachedWorkDays
          .filter((w) => w.programId === p.id)
          .sort((a, b) => a.dayNumber - b.dayNumber),
      }));

      if (progsWithDays.length > 0) {
        setPrograms(progsWithDays);
        setSelectedProgramId((prev) => prev || progsWithDays[0].id);
      }
    } catch (err) {
      console.error("Failed to load offline programs from IndexedDB:", err);
    }
  };

  const fetchWorkPrograms = async (progId: string) => {
    try {
      if (typeof navigator === "undefined" || navigator.onLine) {
        const res = await fetch(`/api/v1/programs/${progId}/work-program`);
        if (res.ok) {
          const data = await res.json();
          if (data.workPrograms && data.workPrograms.length > 0) {
            setWorkPrograms(data.workPrograms);
            return;
          }
        }
      }
    } catch (e) {
      console.warn("Online work programs fetch failed, falling back to offline cache:", e);
    }

    // Offline fallback from Dexie
    try {
      const cachedItems = await offlineDb.cachedWorkProgramItems.where("programId").equals(progId).toArray();
      if (cachedItems.length > 0) {
        const grouped: Record<string, any[]> = {};
        cachedItems.forEach((it) => {
          if (!grouped[it.barangay]) grouped[it.barangay] = [];
          grouped[it.barangay].push(it);
        });

        const wpList = Object.entries(grouped).map(([brgy, items]) => ({
          id: `WP-${brgy}`,
          barangay: brgy,
          items,
        }));
        setWorkPrograms(wpList);
      }
    } catch (err) {
      console.error("Failed to load offline work programs:", err);
    }
  };

  const selectedWorkDay = workDays.find((w) => w.id === selectedWorkDayId);
  const currentDayNum = selectedWorkDay?.dayNumber || 1;

  // Aggregate available work program activities/areas for current selected day
  const availableDayAreas = workPrograms.flatMap((wp) =>
    (wp.items || [])
      .filter((it: any) => it.dayNumber === currentDayNum)
      .map((it: any) => ({
        id: it.id,
        barangay: wp.barangay,
        area: it.area,
        activity: it.specificActivities,
        totalQuota: it.totalCount || it.maleCount + it.femaleCount,
      }))
  );

  const handleScan = async (token: string) => {
    setScannerOpen(false);
    setLoading(true);
    setError(null);
    setScanResult(null);

    try {
      if (isOnline) {
        try {
          const res = await fetch("/api/v1/attendance/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              qrToken: token,
              workDayId: selectedWorkDayId,
              shiftMode,
              workProgramItemId: selectedAreaItemId !== "AUTO" ? selectedAreaItemId : undefined,
              deviceId: localStorage.getItem("tupad_device_id") || "MOBILE_SCANNER",
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Attendance scan failed");

          setScanResult({
            isDuplicate: data.isDuplicate,
            slotRecorded: data.slotRecorded,
            message: data.message,
            data: data.data,
            isOffline: false,
          });
          return;
        } catch (onlineErr: any) {
          // If sequence blocked or already scanned reported by server, rethrow error to user
          if (
            onlineErr.message &&
            (onlineErr.message.includes("ALREADY SCANNED") ||
              onlineErr.message.includes("SEQUENCE BLOCKED") ||
              onlineErr.message.includes("CANNOT"))
          ) {
            throw onlineErr;
          }
          console.warn("Online scan request failed, switching to local offline unit engine:", onlineErr);
        }
      }

      // Offline Attendance Engine (Stored to Installed Unit)
      const offlineResult = await recordOfflineAttendance({
        rawToken: token,
        programId: selectedProgramId,
        workDayId: selectedWorkDayId,
        shiftMode,
        workProgramItemId: selectedAreaItemId !== "AUTO" ? selectedAreaItemId : undefined,
        deviceId: localStorage.getItem("tupad_device_id") || "MOBILE_SCANNER",
      });

      setScanResult(offlineResult);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center justify-center space-x-2">
          <Clock className="w-6 h-6 text-gov-blue" />
          <span>Daily QR Attendance Scanner</span>
        </h1>
        <p className="text-xs text-slate-500">
          Record Morning &amp; Afternoon time in/out across 10 TUPAD work days
        </p>

        {/* Quick QR Generator & Master Key Sync Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={async () => {
              if (
                confirm(
                  "Execute Master Key Sync?\n\nThis will purge local offline device cache and re-download fresh data from the PESO Admin central database (scoped to your assigned barangay)."
                )
              ) {
                await masterSyncNow();
                await fetchPrograms();
                if (selectedProgramId) {
                  await fetchWorkPrograms(selectedProgramId);
                }
              }
            }}
            disabled={isSyncing}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs transition flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
            title="Purge local cache and sync authoritative data with PESO Admin database"
          >
            <Key className={`w-3.5 h-3.5 text-slate-950 ${isSyncing ? "animate-spin" : ""}`} />
            <span>Master Key Sync</span>
          </button>

          <button
            type="button"
            onClick={() => setQrGeneratorOpen(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-gov-gold/20 to-amber-100 hover:from-gov-gold/30 hover:to-amber-200 text-gov-dark border border-gov-gold/50 rounded-xl text-xs font-black transition flex items-center space-x-1.5 shadow-xs"
            title="Generate and screenshot official QR code of any beneficiary"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-700" />
            <span>Generate QR Pass</span>
          </button>
        </div>
      </div>

      {/* Program, WorkDay & Work Area Selector Card */}
      <div className="gov-card p-4 space-y-3 bg-white">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target Program</label>
          <select
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 font-bold focus:outline-none focus:border-gov-blue"
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.programCode} - {p.programName}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Work Day #</label>
            <select
              value={selectedWorkDayId}
              onChange={(e) => setSelectedWorkDayId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 font-bold focus:outline-none focus:border-gov-blue"
            >
              {workDays.map((wd) => (
                <option key={wd.id} value={wd.id}>
                  Day {wd.dayNumber} ({wd.workDate})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Shift / Slot</label>
            <select
              value={shiftMode}
              onChange={(e) => setShiftMode(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 font-semibold focus:outline-none focus:border-gov-blue"
            >
              <option value="AUTO">Auto Detect Time</option>
              <option value="MORNING_IN">AM IN (Morning In)</option>
              <option value="MORNING_OUT">AM OUT (Lunch Break)</option>
              <option value="AFTERNOON_IN">PM IN (Afternoon In)</option>
              <option value="AFTERNOON_OUT">PM OUT (Day End)</option>
            </select>
          </div>
        </div>

        {/* Work Area / Activity Selector from Work Program */}
        {availableDayAreas.length > 0 && (
          <div>
            <label className="block text-[10px] font-bold text-gov-blue uppercase mb-1 flex items-center justify-between">
              <span>Assigned Work Area / Purok</span>
              <span className="text-[9px] font-normal text-slate-400">TUPAD Work Program Basis</span>
            </label>
            <select
              value={selectedAreaItemId}
              onChange={(e) => setSelectedAreaItemId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-blue-200 rounded-lg bg-blue-50/50 font-semibold text-slate-800 focus:outline-none focus:border-gov-blue"
            >
              <option value="AUTO">⚡ Auto-Match by Beneficiary Sitio/Purok</option>
              {availableDayAreas.map((a) => (
                <option key={a.id} value={a.id}>
                  [{a.barangay}] {a.area} ({a.totalQuota} Pax)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Scan Trigger */}
      {!scanResult && (
        <div className="gov-card p-8 text-center space-y-6 shadow-xl border-t-4 border-t-gov-blue">
          <div className="w-24 h-24 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border-4 border-amber-100 shadow-inner">
            <Clock className="w-12 h-12" />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded bg-blue-50 text-gov-blue border border-blue-200">
              Active Session: Day {selectedWorkDay?.dayNumber || 1} • {shiftMode}
            </span>
            <h3 className="text-base font-extrabold text-slate-900 mt-1">Ready for Attendance</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Scan the beneficiary's QR code on their printed stub or mobile pass.
            </p>
          </div>

          <button
            onClick={() => setScannerOpen(true)}
            className="w-full py-3.5 bg-gov-blue hover:bg-gov-light text-white font-extrabold text-sm rounded-xl shadow-lg flex items-center justify-center space-x-2 transition transform active:scale-95"
          >
            <Camera className="w-5 h-5 text-gov-goldLight" />
            <span>SCAN ATTENDANCE QR</span>
          </button>

          <a
            href={`/attendance/matrix?programId=${selectedProgramId}`}
            className="inline-flex items-center space-x-1 text-xs font-bold text-gov-blue hover:underline"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>View 10-Day Attendance Matrix</span>
          </a>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-xs text-red-700 shadow">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
          <div className="space-y-1">
            <strong className="block font-bold">Attendance Alert</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Result Modal View */}
      {scanResult && (
        <div
          className={`gov-card p-6 text-center space-y-4 shadow-xl border-t-4 ${
            scanResult.isDuplicate ? "border-t-amber-500" : "border-t-emerald-600"
          }`}
        >
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
              scanResult.isDuplicate
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                scanResult.isDuplicate ? "text-amber-700" : "text-emerald-700"
              }`}
            >
              {scanResult.isOffline
                ? "OFFLINE — SAVED LOCALLY"
                : scanResult.isDuplicate
                ? "! ALREADY RECORDED"
                : "✓ ATTENDANCE LOGGED"}
            </span>
            <h2 className="text-base font-black text-slate-900">
              {scanResult.data.fullName}
            </h2>
            <div className="flex items-center justify-center space-x-2 text-xs font-mono font-bold text-gov-blue">
              <span>Designated #{scanResult.data.designatedNumber}</span>
              <span>•</span>
              <span>Day {scanResult.data.dayNumber}</span>
            </div>

            {scanResult.data.workArea && (
              <div className="p-2.5 bg-blue-50/70 rounded-lg border border-blue-100 text-xs space-y-1">
                <div className="flex items-center justify-center space-x-1 font-bold text-gov-blue">
                  <MapPin className="w-3.5 h-3.5 text-gov-gold" />
                  <span>Work Area: {scanResult.data.workArea}</span>
                </div>
                {scanResult.data.activityName && (
                  <p className="text-[11px] text-slate-600 italic">
                    "{scanResult.data.activityName}"
                  </p>
                )}
                {scanResult.data.areaTargetCapacity > 0 && (
                  <div className="pt-1 flex items-center justify-center space-x-2 text-[10px] font-mono text-slate-500">
                    <span>Area Tally:</span>
                    <strong className="text-gov-blue">{scanResult.data.areaScannedCount} / {scanResult.data.areaTargetCapacity} Beneficiaries</strong>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-slate-500 mt-1">{scanResult.message}</p>
          </div>

          <button
            onClick={() => {
              setScanResult(null);
              setScannerOpen(true);
            }}
            className="w-full py-3 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow transition"
          >
            Scan Next Beneficiary
          </button>
        </div>
      )}

      {/* Scanner Modal */}
      <QrScannerModal
        isOpen={scannerOpen}
        onScan={handleScan}
        onClose={() => setScannerOpen(false)}
        title="Attendance QR Scanner"
        subtitle={`Scanning for Day ${selectedWorkDay?.dayNumber || 1} • ${shiftMode}`}
      />

      {/* Beneficiary QR Pass Generator & Screenshot Modal */}
      <FieldQrPassGeneratorModal
        isOpen={qrGeneratorOpen}
        onClose={() => setQrGeneratorOpen(false)}
      />
    </div>
  );
}
