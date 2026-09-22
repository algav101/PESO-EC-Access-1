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
  Zap,
  Coffee,
  LogIn,
  LogOut,
  Check,
  ShieldCheck,
} from "lucide-react";
import { QrScannerModal } from "@/components/scanner/QrScannerModal";
import { FieldQrPassGeneratorModal } from "@/components/field/FieldQrPassGeneratorCard";
import { useOffline } from "@/context/OfflineContext";
import { useAuth } from "@/context/AuthContext";
import { isAdminUser } from "@/lib/permissions";
import { offlineDb, queueOfflineTransaction, recordOfflineAttendance } from "@/lib/dexie";
import { format } from "date-fns";
import {
  getPhilippineTime,
  determineAttendanceSlot,
  ATTENDANCE_SLOT_LABELS,
} from "@/lib/utils";

export default function DailyAttendancePage() {
  const { isOnline, masterSyncNow, isSyncing } = useOffline();
  const { user } = useAuth();
  const isUserAdmin = isAdminUser(user);

  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [workDays, setWorkDays] = useState<any[]>([]);
  const [selectedWorkDayId, setSelectedWorkDayId] = useState<string>("");
  const [shiftMode, setShiftMode] = useState<string>("AUTO");

  // Bypass 3-Hour rule state (Default enabled to allow fixing backlogs)
  const [isBypassActive, setIsBypassActive] = useState<boolean>(true);
  const [togglingBypass, setTogglingBypass] = useState<boolean>(false);

  // Work program area assignment state
  const [workPrograms, setWorkPrograms] = useState<any[]>([]);
  const [selectedAreaItemId, setSelectedAreaItemId] = useState<string>("AUTO");

  const [scannerOpen, setScannerOpen] = useState(false);
  const [qrGeneratorOpen, setQrGeneratorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any | null>(null);

  // Philippine Standard Time calculation
  const pht = getPhilippineTime();
  const autoDetectedSlot = determineAttendanceSlot(pht.timeDecimal);
  const activeSlotLabel =
    shiftMode === "AUTO"
      ? `AUTO (${ATTENDANCE_SLOT_LABELS[autoDetectedSlot]})`
      : ATTENDANCE_SLOT_LABELS[shiftMode as keyof typeof ATTENDANCE_SLOT_LABELS] || shiftMode;

  const currentResolvedSlot = shiftMode === "AUTO" ? autoDetectedSlot : shiftMode;

  useEffect(() => {
    fetchPrograms();
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    try {
      if (typeof window !== "undefined") {
        const cachedSetting = localStorage.getItem("tupad_bypass_3hr_rule");
        if (cachedSetting !== null) {
          setIsBypassActive(cachedSetting !== "false" && cachedSetting !== "false_enforce");
        }
      }

      if (typeof navigator === "undefined" || navigator.onLine) {
        const res = await fetch("/api/v1/settings");
        if (res.ok) {
          const data = await res.json();
          const bypassVal =
            data.settings?.bypass_three_hour_rule !== "enforce_3hr" &&
            data.settings?.bypass_three_hour_rule !== "false_enforce";
          setIsBypassActive(bypassVal);
          if (typeof window !== "undefined") {
            localStorage.setItem("tupad_bypass_3hr_rule", String(bypassVal));
          }
        }
      }
    } catch (e) {
      console.warn("Could not fetch settings:", e);
    }
  };

  const handleToggleBypass = async () => {
    if (!isUserAdmin) return;
    const targetState = !isBypassActive;
    const confirmMsg = targetState
      ? "⚡ ENABLE 3-Hour Interval Bypass for ALL System Users?\n\nThis will allow all Field Coordinators and Documentors to scan AM/PM Time-Out backlogs immediately without waiting 3 hours."
      : "🔒 ENFORCE 3-Hour Rule for ALL System Users?\n\nThis will re-enable the 3-hour minimum work duration rule across the system.";

    if (!confirm(confirmMsg)) return;

    setTogglingBypass(true);
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            bypass_three_hour_rule: targetState ? "true" : "enforce_3hr",
          },
        }),
      });

      if (res.ok) {
        setIsBypassActive(targetState);
        if (typeof window !== "undefined") {
          localStorage.setItem("tupad_bypass_3hr_rule", targetState ? "true" : "false_enforce");
        }
      } else {
        const d = await res.json();
        alert(d.error || "Failed to update bypass setting");
      }
    } catch (err: any) {
      alert("Error updating bypass setting: " + err.message);
    } finally {
      setTogglingBypass(false);
    }
  };

  useEffect(() => {
    if (selectedProgramId) {
      const prog = programs.find((p) => p.id === selectedProgramId);
      if (prog && prog.workDays && prog.workDays.length > 0) {
        const sortedDays = [...prog.workDays].sort((a, b) => a.dayNumber - b.dayNumber);
        setWorkDays(sortedDays);
        const todayStr = pht.dateStr;
        const todayWd = sortedDays.find((w: any) => w.workDate === todayStr);
        setSelectedWorkDayId((prev) => {
          if (prev && sortedDays.some((w: any) => w.id === prev)) {
            return prev;
          }
          return todayWd ? todayWd.id : sortedDays[0].id;
        });
      } else {
        fetchProgramDetail(selectedProgramId);
      }
      fetchWorkPrograms(selectedProgramId);
    }
  }, [selectedProgramId, programs]);

  const fetchProgramDetail = async (progId: string) => {
    try {
      if (typeof navigator === "undefined" || navigator.onLine) {
        const res = await fetch(`/api/v1/programs/${progId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.program?.workDays?.length > 0) {
            const sortedDays = [...data.program.workDays].sort((a, b) => a.dayNumber - b.dayNumber);
            setWorkDays(sortedDays);
            const todayStr = pht.dateStr;
            const todayWd = sortedDays.find((w: any) => w.workDate === todayStr);
            setSelectedWorkDayId((prev) => {
              if (prev && sortedDays.some((w: any) => w.id === prev)) return prev;
              return todayWd ? todayWd.id : sortedDays[0].id;
            });
            return;
          }
        }
      }
    } catch (e) {
      console.warn("Could not fetch detailed program work days:", e);
    }

    // Try offline IndexedDB
    try {
      const cachedDays = await offlineDb.cachedWorkDays.where("programId").equals(progId).toArray();
      if (cachedDays && cachedDays.length > 0) {
        const sortedDays = cachedDays.sort((a, b) => a.dayNumber - b.dayNumber);
        setWorkDays(sortedDays);
        const todayStr = pht.dateStr;
        const todayWd = sortedDays.find((w: any) => w.workDate === todayStr);
        setSelectedWorkDayId((prev) => {
          if (prev && sortedDays.some((w: any) => w.id === prev)) return prev;
          return todayWd ? todayWd.id : sortedDays[0].id;
        });
      }
    } catch (err) {
      console.warn("Offline cached work days fetch error:", err);
    }
  };

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

  const selectedWorkDay = workDays.find((w) => w.id === selectedWorkDayId) || workDays[0];
  const currentDayNum = selectedWorkDay?.dayNumber || 1;
  const isSelectedDayToday = selectedWorkDay?.workDate === pht.dateStr;

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
              targetDate: selectedWorkDay?.workDate,
              shiftMode,
              workProgramItemId: selectedAreaItemId !== "AUTO" ? selectedAreaItemId : undefined,
              deviceId: localStorage.getItem("tupad_device_id") || "MOBILE_SCANNER",
              bypass3HourRule: true,
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
          if (
            onlineErr.message &&
            (onlineErr.message.includes("ALREADY SCANNED") ||
              onlineErr.message.includes("SEQUENCE BLOCKED") ||
              onlineErr.message.includes("TIME-OUT BLOCKED") ||
              onlineErr.message.includes("BLOCKED"))
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
        bypass3HourRule: true,
      });

      setScanResult(offlineResult);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-5 pb-10">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center justify-center space-x-2">
          <Clock className="w-6 h-6 text-gov-blue" />
          <span>Daily QR Attendance Scanner</span>
        </h1>
        <p className="text-xs text-slate-500">
          Record Morning &amp; Afternoon time in/out across 10 TUPAD work days
        </p>

        {/* Action Header: Master Key Sync, Generate Pass & Admin Bypass Toggle */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
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
                  await fetchProgramDetail(selectedProgramId);
                }
              }
            }}
            disabled={isSyncing}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs transition flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
            title="Purge local cache and sync authoritative data with PESO Admin database"
          >
            <Key className={`w-3.5 h-3.5 text-slate-950 ${isSyncing ? "animate-spin" : ""}`} />
            <span>Master Key Sync</span>
          </button>

          <button
            type="button"
            onClick={() => setQrGeneratorOpen(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-gov-gold/20 to-amber-100 hover:from-gov-gold/30 hover:to-amber-200 text-gov-dark border border-gov-gold/50 rounded-xl text-xs font-black transition flex items-center space-x-1.5 shadow-xs"
            title="Generate and screenshot official QR code of any beneficiary"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-700" />
            <span>Generate QR Pass</span>
          </button>

          {isUserAdmin && (
            <button
              type="button"
              onClick={handleToggleBypass}
              disabled={togglingBypass}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center space-x-1.5 shadow-xs border ${
                isBypassActive
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
              }`}
              title="Domain Master: Toggle 3-Hour Interval Rule Bypass for all system users to fix scan backlogs"
            >
              <Zap className={`w-3.5 h-3.5 ${isBypassActive ? "text-amber-200 fill-amber-200" : "text-slate-400"}`} />
              <span>3-Hr Bypass: {isBypassActive ? "ON (Active)" : "OFF"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Backlog Recovery Mode Alert Banner (All Users) */}
      {isBypassActive && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-xl flex items-start space-x-2.5 text-xs text-amber-950 shadow-xs">
          <div className="p-1 bg-amber-500 text-slate-950 rounded-lg flex-shrink-0 mt-0.5">
            <Zap className="w-3.5 h-3.5 fill-slate-950" />
          </div>
          <div className="flex-1 space-y-0.5">
            <div className="flex items-center justify-between">
              <strong className="font-black text-amber-900 uppercase tracking-tight">
                ⚡ Backlog Recovery Mode Active
              </strong>
              <span className="text-[9px] font-black uppercase bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded">
                3-Hr Rule Bypassed
              </span>
            </div>
            <p className="text-[11px] text-amber-800 leading-tight">
              The 3-hour minimum interval rule is bypassed. You can freely scan AM In, AM Out, PM In, or PM Out to clear missed or failed QR scans.
            </p>
          </div>
        </div>
      )}

      {/* Program, Work Day & Manual Shift Selector Card */}
      <div className="gov-card p-4 space-y-4 bg-white shadow-md border border-slate-200">
        {/* Target Program Selector */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target Program</label>
          <select
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-900 focus:outline-none focus:border-gov-blue"
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.programCode} - {p.programName}
              </option>
            ))}
          </select>
        </div>

        {/* 1. Day Selector (Day 1 to 10 Interactive Buttons) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-bold text-slate-700 uppercase flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-gov-blue" />
              <span>1. Choose Attendance Day (Day 1 to 10)</span>
            </label>
            {isSelectedDayToday ? (
              <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Today is Day {currentDayNum}</span>
              </span>
            ) : (
              <span className="text-[9px] font-medium text-slate-400">
                Today: {pht.dateStr}
              </span>
            )}
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {workDays.length > 0 ? (
              workDays.map((wd) => {
                const isSelected = wd.id === selectedWorkDayId;
                const isToday = wd.workDate === pht.dateStr;
                return (
                  <button
                    key={wd.id}
                    type="button"
                    onClick={() => setSelectedWorkDayId(wd.id)}
                    className={`py-1.5 px-1 rounded-xl text-center transition flex flex-col items-center justify-center relative ${
                      isSelected
                        ? "bg-gov-blue text-white shadow-md ring-2 ring-gov-gold font-bold scale-[1.02]"
                        : isToday
                        ? "bg-amber-50 text-amber-900 border-2 border-amber-400 hover:bg-amber-100 font-bold"
                        : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-xs font-black">Day {wd.dayNumber}</span>
                    <span
                      className={`text-[9px] font-mono leading-none mt-0.5 ${
                        isSelected ? "text-blue-100" : isToday ? "text-amber-800 font-bold" : "text-slate-400"
                      }`}
                    >
                      {wd.workDate ? wd.workDate.slice(5) : ""}
                    </span>
                    {isToday && (
                      <span
                        className={`absolute -top-1.5 -right-1 text-[7px] font-black px-1 py-0.2 rounded-full uppercase tracking-tight shadow-xs ${
                          isSelected ? "bg-amber-400 text-slate-950" : "bg-amber-500 text-white"
                        }`}
                      >
                        TODAY
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              Array.from({ length: 10 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  disabled
                  className="py-2 px-1 rounded-xl text-center bg-slate-50 border border-slate-200 text-slate-400 text-xs font-bold"
                >
                  Day {i + 1}
                </button>
              ))
            )}
          </div>
        </div>

        {/* 2. Manual Shift & Slot Choice (AM IN, AM OUT, PM IN, PM OUT) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-bold text-slate-700 uppercase flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>2. Select Shift Slot (Time In / Time Out)</span>
            </label>
            <span className="text-[9px] font-mono font-bold text-gov-blue">
              Active: {shiftMode === "AUTO" ? "⚡ AUTO" : shiftMode}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* AM IN */}
            <button
              type="button"
              onClick={() => setShiftMode("MORNING_IN")}
              className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                shiftMode === "MORNING_IN"
                  ? "bg-amber-500/15 border-2 border-amber-500 shadow-sm ring-2 ring-amber-400/40"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Sun className={`w-4 h-4 ${shiftMode === "MORNING_IN" ? "text-amber-600" : "text-slate-500"}`} />
                  <span className="text-xs font-black text-slate-900">AM IN</span>
                </div>
                {shiftMode === "MORNING_IN" && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-1">Morning Time-In</p>
              <span className="text-[9px] font-mono text-amber-700 font-bold mt-0.5">6:00 AM – 11:30 AM</span>
            </button>

            {/* AM OUT */}
            <button
              type="button"
              onClick={() => setShiftMode("MORNING_OUT")}
              className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                shiftMode === "MORNING_OUT"
                  ? "bg-orange-500/15 border-2 border-orange-500 shadow-sm ring-2 ring-orange-400/40"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Coffee className={`w-4 h-4 ${shiftMode === "MORNING_OUT" ? "text-orange-600" : "text-slate-500"}`} />
                  <span className="text-xs font-black text-slate-900">AM OUT</span>
                </div>
                {shiftMode === "MORNING_OUT" && (
                  <span className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-black">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-1">Lunch Break / Out</p>
              <span className="text-[9px] font-mono text-orange-700 font-bold mt-0.5">11:30 AM – 12:45 PM</span>
            </button>

            {/* PM IN */}
            <button
              type="button"
              onClick={() => setShiftMode("AFTERNOON_IN")}
              className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                shiftMode === "AFTERNOON_IN"
                  ? "bg-blue-500/15 border-2 border-gov-blue shadow-sm ring-2 ring-blue-400/40"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <LogIn className={`w-4 h-4 ${shiftMode === "AFTERNOON_IN" ? "text-gov-blue" : "text-slate-500"}`} />
                  <span className="text-xs font-black text-slate-900">PM IN</span>
                </div>
                {shiftMode === "AFTERNOON_IN" && (
                  <span className="w-4 h-4 rounded-full bg-gov-blue text-white flex items-center justify-center text-[10px] font-black">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-1">Afternoon Time-In</p>
              <span className="text-[9px] font-mono text-blue-700 font-bold mt-0.5">12:45 PM – 3:30 PM</span>
            </button>

            {/* PM OUT */}
            <button
              type="button"
              onClick={() => setShiftMode("AFTERNOON_OUT")}
              className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                shiftMode === "AFTERNOON_OUT"
                  ? "bg-emerald-500/15 border-2 border-emerald-600 shadow-sm ring-2 ring-emerald-400/40"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Moon className={`w-4 h-4 ${shiftMode === "AFTERNOON_OUT" ? "text-emerald-700" : "text-slate-500"}`} />
                  <span className="text-xs font-black text-slate-900">PM OUT</span>
                </div>
                {shiftMode === "AFTERNOON_OUT" && (
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-1">Dismissal / Day End</p>
              <span className="text-[9px] font-mono text-emerald-800 font-bold mt-0.5">3:30 PM onwards</span>
            </button>
          </div>

          {/* Auto Detect Option Button */}
          <div className="pt-1.5 flex justify-end">
            <button
              type="button"
              onClick={() => setShiftMode("AUTO")}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition flex items-center space-x-1 ${
                shiftMode === "AUTO"
                  ? "bg-gov-blue text-white border-gov-blue shadow-xs"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Auto-Detect Shift ({ATTENDANCE_SLOT_LABELS[autoDetectedSlot]})</span>
            </button>
          </div>
        </div>

        {/* 3. Work Area / Activity Selector from Work Program */}
        {availableDayAreas.length > 0 && (
          <div>
            <label className="block text-[10px] font-bold text-gov-blue uppercase mb-1 flex items-center justify-between">
              <span>3. Assigned Work Area / Purok</span>
              <span className="text-[9px] font-normal text-slate-400">Day {currentDayNum} Work Program</span>
            </label>
            <select
              value={selectedAreaItemId}
              onChange={(e) => setSelectedAreaItemId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-blue-200 rounded-lg bg-blue-50/50 font-semibold text-slate-800 focus:outline-none focus:border-gov-blue"
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

      {/* Main Scan Trigger Card */}
      {!scanResult && (
        <div className="gov-card p-6 sm:p-8 text-center space-y-5 shadow-xl border-t-4 border-t-gov-blue bg-white">
          <div className="w-20 h-20 rounded-full bg-blue-50 text-gov-blue flex items-center justify-center mx-auto border-4 border-blue-100 shadow-inner">
            <Camera className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex flex-wrap items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-gov-blue border border-blue-200 font-mono text-xs font-black shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>TARGET: DAY {currentDayNum}</span>
              <span className="text-slate-400">•</span>
              <span>{selectedWorkDay?.workDate || pht.dateStr}</span>
              <span className="text-slate-400">•</span>
              <span className="font-extrabold text-amber-700 uppercase">
                {shiftMode === "AUTO" ? activeSlotLabel : ATTENDANCE_SLOT_LABELS[shiftMode as keyof typeof ATTENDANCE_SLOT_LABELS] || shiftMode}
              </span>
            </div>

            <h3 className="text-base font-extrabold text-slate-900 mt-1">Ready for Attendance QR Scan</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Scanning for <strong>Day {currentDayNum} ({selectedWorkDay?.workDate || pht.dateStr})</strong> •{" "}
              <strong>{activeSlotLabel}</strong>. Scan beneficiary's printed QR stub or mobile pass.
            </p>
          </div>

          <button
            onClick={() => setScannerOpen(true)}
            className="w-full py-4 bg-gradient-to-r from-gov-blue to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white font-black text-sm rounded-xl shadow-lg flex items-center justify-center space-x-2 transition transform active:scale-95 border-b-4 border-blue-950"
          >
            <Camera className="w-5 h-5 text-gov-goldLight" />
            <span>
              SCAN QR FOR DAY {currentDayNum} • {shiftMode === "AUTO" ? "AUTO SHIFT" : shiftMode.replace("_", " ")}
            </span>
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

      {/* Error Alert Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-xs text-red-700 shadow">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
          <div className="space-y-2 flex-1">
            <div>
              <strong className="block font-bold text-red-900">Attendance Alert</strong>
              <span className="text-red-800 leading-relaxed">{error}</span>
            </div>
            {error.includes("PM IN") && shiftMode !== "AFTERNOON_IN" && (
              <button
                type="button"
                onClick={() => {
                  setShiftMode("AFTERNOON_IN");
                  setError(null);
                }}
                className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg font-bold text-[11px] border border-red-300 inline-flex items-center space-x-1 transition"
              >
                <span>Switch Shift to PM IN (Afternoon In)</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            {error.includes("AM IN") && shiftMode !== "MORNING_IN" && (
              <button
                type="button"
                onClick={() => {
                  setShiftMode("MORNING_IN");
                  setError(null);
                }}
                className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg font-bold text-[11px] border border-red-300 inline-flex items-center space-x-1 transition"
              >
                <span>Switch Shift to AM IN (Morning In)</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Result Modal View */}
      {scanResult && (
        <div
          className={`gov-card p-6 text-center space-y-4 shadow-xl border-t-4 bg-white ${
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
              </div>
            )}

            <p className="text-xs text-slate-500 mt-1">{scanResult.message}</p>
          </div>

          <button
            onClick={() => {
              setScanResult(null);
              setScannerOpen(true);
            }}
            className="w-full py-3.5 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow transition"
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
        subtitle={`Day ${selectedWorkDay?.dayNumber || 1} • ${shiftMode === "AUTO" ? activeSlotLabel : shiftMode}`}
      />

      {/* Beneficiary QR Pass Generator & Screenshot Modal */}
      <FieldQrPassGeneratorModal
        isOpen={qrGeneratorOpen}
        onClose={() => setQrGeneratorOpen(false)}
      />
    </div>
  );
}
