"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  QrCode,
  MapPin,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Building,
  Navigation,
  Compass,
  Phone,
  Layers,
  Search,
  ExternalLink,
} from "lucide-react";
import { QrScannerModal } from "@/components/scanner/QrScannerModal";
import { PesoLogo } from "@/components/layout/PesoLogo";

function AssignmentContent() {
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") || searchParams.get("qrToken") || searchParams.get("code") || "";
  const initialNumber = searchParams.get("designatedNumber") || searchParams.get("slot") || "";

  const [inputToken, setInputToken] = useState(initialToken || initialNumber);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    if (initialToken || initialNumber) {
      performLookup(initialToken || initialNumber);
    }
  }, [initialToken, initialNumber]);

  const performLookup = async (tokenOrNumber: string, dayNum?: number) => {
    if (!tokenOrNumber.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (/^\d+$/.test(tokenOrNumber.trim())) {
        queryParams.set("designatedNumber", tokenOrNumber.trim());
      } else {
        queryParams.set("qrToken", tokenOrNumber.trim());
      }
      if (dayNum) {
        queryParams.set("dayNumber", String(dayNum));
      }

      const res = await fetch(`/api/v1/work-assignment/lookup?${queryParams.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setData(json);
        setSelectedDay(json.workDay.dayNumber);
      } else {
        setError(json.error || "Failed to find assignment details for this QR code.");
        setData(null);
      }
    } catch (err: any) {
      setError("Network or server connection error: " + err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (scannedText: string) => {
    setScannerOpen(false);
    setInputToken(scannedText);
    performLookup(scannedText);
  };

  const handleDayChange = (newDay: number) => {
    setSelectedDay(newDay);
    if (inputToken) {
      performLookup(inputToken, newDay);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      {/* Top Government Portal Branding */}
      <div className="max-w-2xl w-full space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <PesoLogo className="w-10 h-10" />
            <div>
              <h1 className="text-sm font-black text-white tracking-wide uppercase">PESO Dingalan • DOLE Region III</h1>
              <p className="text-[11px] text-gov-goldLight font-bold">TUPAD Accomplishment & Work Area Routing System</p>
            </div>
          </div>
          <span className="hidden sm:inline-block px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-bold">
            Live Field Routing
          </span>
        </div>

        {/* Scan & Search Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <QrCode className="w-5 h-5 text-gov-gold" />
              <span>Scan Beneficiary QR Code or Enter Designated Slot #</span>
            </h2>
            <p className="text-xs text-slate-400">
              Instantly resolve your scheduled work area, specific daily activity, and routing guide based on your home Purok/Sitio.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              performLookup(inputToken);
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                placeholder="Scan QR or enter Slot # (e.g. 1, 25, or TUPAD-DGL-...)"
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 text-xs sm:text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-gov-goldLight focus:ring-1 focus:ring-gov-goldLight"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="flex-1 sm:flex-none px-4 py-3 bg-gov-blue hover:bg-gov-light text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-md border border-blue-400/40"
              >
                <QrCode className="w-4 h-4 text-gov-goldLight" />
                <span>Camera Scan</span>
              </button>

              <button
                type="submit"
                disabled={loading || !inputToken.trim()}
                className="flex-1 sm:flex-none px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-md"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Lookup</span>
              </button>
            </div>
          </form>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-950/50 border border-rose-800/80 rounded-2xl flex items-start space-x-3 text-rose-200 animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold">Lookup Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Beneficiary Assignment Details Card */}
        {data && (
          <div className="space-y-4 animate-fadeIn">
            {/* Beneficiary Header Badge */}
            <div className="bg-gradient-to-r from-gov-dark via-slate-900 to-gov-blue border-2 border-gov-gold/50 rounded-2xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-gov-gold/10 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-gov-gold text-gov-dark flex items-center justify-center font-black text-lg shadow-lg border border-amber-300">
                    #{data.beneficiary.designatedNumber}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                      {data.beneficiary.fullName}
                    </h3>
                    <p className="text-xs text-gov-goldLight font-mono">
                      {data.beneficiary.sitio}, Brgy. {data.beneficiary.barangay}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 self-start sm:self-auto">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/40">
                    {data.beneficiary.sex}
                  </span>
                  {data.beneficiary.isSenior && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                      Senior Citizen
                    </span>
                  )}
                  {data.beneficiary.isPwd && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-400/40">
                      PWD
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    Active Participant
                  </span>
                </div>
              </div>

              {/* Day Selector Ribbon */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-bold flex items-center space-x-1 text-gov-goldLight">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Select Work Program Schedule:</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    Viewing Day {data.workDay.dayNumber} of {data.program.requiredWorkDays}
                  </span>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                  {Array.from({ length: data.program.requiredWorkDays || 10 }, (_, i) => i + 1).map((day) => {
                    const isSelected = selectedDay === day;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleDayChange(day)}
                        className={`py-1.5 px-1 rounded-lg text-xs font-black transition text-center ${
                          isSelected
                            ? "bg-gov-gold text-gov-dark shadow-md scale-105 border border-amber-200 font-extrabold"
                            : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50"
                        }`}
                      >
                        Day {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Primary Assignment Focus Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                  <Navigation className="w-4 h-4" />
                  <span>DESIGNATED WORK AREA (DAY {data.workDay.dayNumber})</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-bold">
                  {data.assignment.allocationMethod.replace(/_/g, " ")}
                </span>
              </div>

              {/* Work Area Box */}
              <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-700/80 space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-white leading-snug">
                      {data.assignment.area}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Target Area Sector for Barangay {data.beneficiary.barangay}
                    </p>
                  </div>
                </div>

                {/* Specific Activity Box */}
                <div className="pt-2 border-t border-slate-800 flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-blue-300 tracking-wider">
                      Specific Activity:
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-slate-200 leading-snug">
                      {data.assignment.specificActivity}
                    </p>
                  </div>
                </div>
              </div>

              {/* Working Hours & Shift Timing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-slate-300">Morning Shift</p>
                    <p className="text-gov-goldLight font-mono">{data.program.morningHours}</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-slate-300">Afternoon Shift</p>
                    <p className="text-gov-goldLight font-mono">{data.program.afternoonHours}</p>
                  </div>
                </div>
              </div>

              {/* Proximity & Allocation Explanation Rationale */}
              <div className="p-3.5 bg-gov-blue/20 rounded-xl border border-blue-500/30 text-xs text-blue-200 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-gov-goldLight">
                  <Compass className="w-4 h-4" />
                  <span>Proximity &amp; Gender Allocation Rationale:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {data.assignment.matchingRationale}
                </p>
              </div>

              {/* Attendance Status Today */}
              {data.attendance ? (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-emerald-300 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Attendance Verified Today</span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-900/60 px-2 py-0.5 rounded">
                    {data.attendance.status}
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>Daily Attendance: Awaiting field scanner check-in</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500 space-y-1 pt-4">
          <p className="font-bold text-slate-400">LGU Dingalan Public Employment Service Office (PESO)</p>
          <p>TUPAD Emergency Employment Assistance Program • DOLE Aurora</p>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {scannerOpen && (
        <QrScannerModal
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={handleScan}
          title="Scan Beneficiary QR Code"
        />
      )}
    </div>
  );
}

export default function MyAssignmentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="flex items-center space-x-2 text-xs">
            <RefreshCw className="w-4 h-4 animate-spin text-gov-gold" />
            <span>Loading TUPAD Work Area Routing...</span>
          </div>
        </div>
      }
    >
      <AssignmentContent />
    </Suspense>
  );
}
