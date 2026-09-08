"use client";

import React, { useState } from "react";
import {
  QrCode,
  Search,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Layers,
  Lock,
  KeyRound,
  Compass,
  Navigation,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { QrScannerModal } from "@/components/scanner/QrScannerModal";

export function PublicWorkAssignmentScannerCard() {
  const [inputToken, setInputToken] = useState("");
  const [middleNameInput, setMiddleNameInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authChallenge, setAuthChallenge] = useState<any | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(1);

  const performLookup = async (tokenOrNumber: string, dayNum: number = 1, customMiddleName?: string) => {
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
      queryParams.set("dayNumber", String(dayNum));

      const middleNameToUse = customMiddleName !== undefined ? customMiddleName : middleNameInput;
      if (middleNameToUse !== undefined && middleNameToUse !== null && middleNameToUse !== "") {
        queryParams.set("middleName", middleNameToUse.trim());
      }

      const res = await fetch(`/api/v1/work-assignment/lookup?${queryParams.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setData(json);
        setAuthChallenge(null);
        setSelectedDay(json.workDay.dayNumber);
      } else if (json.requiresAuth) {
        setAuthChallenge(json.challenge);
        setData(null);
        setError(null);
      } else {
        setError(json.error || "Hindi nahanap ang talaan ng benepisyaryo sa aktibong programa.");
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
    setMiddleNameInput("");
    setAuthChallenge(null);
    performLookup(scannedText, 1, "");
  };

  const handleVerifyMiddleName = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(inputToken, selectedDay, middleNameInput);
  };

  const handleDayChange = (newDay: number) => {
    setSelectedDay(newDay);
    if (inputToken) {
      performLookup(inputToken, newDay, middleNameInput);
    }
  };

  const handleReset = () => {
    setInputToken("");
    setMiddleNameInput("");
    setData(null);
    setAuthChallenge(null);
    setError(null);
    setSelectedDay(1);
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-gov-dark via-slate-900 to-gov-blue p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-gov-gold/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-gov-gold/20 text-gov-goldLight border border-gov-gold/40 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Opisyal na TUPAD Work Area &amp; Schedule Portal</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
              I-scan ang Iyong QR Code: Alamin ang Assigned Work Area &amp; Schedule
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Gamitin ang camera ng iyong cellphone upang i-scan ang iyong orihinal na TUPAD QR Code Card o ilagay ang iyong Slot # para makita ang nakatalagang lugar at 10-araw na schedule.
            </p>
          </div>

          <div className="flex-shrink-0">
            <a
              href="/my-assignment"
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition shadow-sm"
            >
              <span>Full-Screen Scanner</span>
              <ExternalLink className="w-3.5 h-3.5 text-gov-goldLight" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-6 sm:p-8 space-y-6">
        {/* Search / Scan Controls */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setAuthChallenge(null);
            performLookup(inputToken, 1);
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              placeholder="I-scan ang QR Code o ilagay ang Slot # (hal. 1, 8, o TUPAD-DGL-...)"
              className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 rounded-2xl px-4 py-3.5 text-xs sm:text-sm font-semibold placeholder-slate-400 focus:outline-none focus:border-gov-blue focus:bg-white focus:ring-2 focus:ring-blue-100 transition shadow-inner"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="flex-1 sm:flex-none px-5 py-3.5 bg-gradient-to-r from-gov-blue to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl text-xs sm:text-sm font-black transition flex items-center justify-center space-x-2 shadow-md border border-blue-500/30 active:scale-95"
            >
              <QrCode className="w-4 h-4 text-gov-goldLight" />
              <span>Buksan ang Camera Scanner</span>
            </button>

            <button
              type="submit"
              disabled={loading || !inputToken.trim()}
              className="flex-1 sm:flex-none px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl text-xs sm:text-sm font-black transition flex items-center justify-center space-x-2 shadow-md active:scale-95"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Hanapin</span>
            </button>
          </div>
        </form>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-800 animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold">May Suliranin sa Paghahanap</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* DATA PRIVACY AUTHENTICATION CHALLENGE */}
        {authChallenge && !data && (
          <div className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-5 sm:p-6 shadow-md space-y-4 animate-fadeIn">
            <div className="flex items-start space-x-3 border-b border-amber-200 pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-800 border border-amber-400 flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="inline-flex items-center space-x-1 text-[10px] font-black text-amber-900 uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Proteksyon sa Data Privacy Act</span>
                </div>
                <h4 className="text-sm sm:text-base font-black text-slate-900">
                  Ilagay ang Rehistradong Middle Name ng Benepisyaryo
                </h4>
                <p className="text-xs text-slate-600">
                  Upang maprotektahan ang iyong personal na impormasyon, patunayan ang iyong pagkakakilanlan sa pamamagitan ng paglalagay ng iyong apelyido sa pagkadalaga o gitnang pangalan (Middle Name).
                </p>
              </div>
            </div>

            {/* Masked Record Preview */}
            <div className="p-3.5 bg-white rounded-xl border border-amber-200 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Nakatugmang Talaan ng Benepisyaryo</span>
                <p className="text-sm font-black text-slate-900 tracking-wide font-mono">{authChallenge.maskedName}</p>
                <p className="text-[11px] text-emerald-700 font-bold">
                  Slot #{authChallenge.designatedNumber} • Brgy. {authChallenge.barangay}
                </p>
              </div>
              <div className="px-2.5 py-1 bg-amber-100 border border-amber-300 rounded-lg text-amber-900 font-extrabold text-[10px]">
                Kailangan ng Pagpapatunay
              </div>
            </div>

            <form onSubmit={handleVerifyMiddleName} className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">
                  Middle Name ng Benepisyaryo <span className="text-slate-500 font-normal">(Hindi case-sensitive, kahit maliit o malaking letra)</span>:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoFocus
                    value={middleNameInput}
                    onChange={(e) => setMiddleNameInput(e.target.value)}
                    placeholder="Ilagay ang Middle Name (hal. Santos, Villegas, o 'N/A' kung wala)"
                    className="w-full bg-white border-2 border-slate-300 text-slate-900 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm font-bold placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  Halimbawa: <strong>Santos</strong>, <strong>VILLEGAS</strong>, <strong>de guzman</strong>, o <strong>N/A</strong> kung walang middle name sa birth certificate.
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs sm:text-sm transition flex items-center justify-center space-x-2 shadow-md active:scale-95"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Patunayan at Buksan ang Assigned Work Area</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* UNLOCKED WORK ASSIGNMENT DISPLAY */}
        {data && (
          <div className="space-y-5 animate-fadeIn">
            {/* Beneficiary Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-gov-blue text-white rounded-2xl p-5 sm:p-6 shadow-lg space-y-4 border border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gov-gold text-gov-dark flex items-center justify-center font-black text-lg shadow-md border border-amber-200">
                    #{data.beneficiary.designatedNumber}
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-black text-white leading-tight">
                      {data.beneficiary.fullName}
                    </h4>
                    <p className="text-xs text-gov-goldLight font-bold">
                      {data.beneficiary.sitio}, Brgy. {data.beneficiary.barangay}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 self-start sm:self-auto">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-200 border border-blue-400/40">
                    {data.beneficiary.sex}
                  </span>
                  {data.beneficiary.isSenior && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/40">
                      Senior Citizen
                    </span>
                  )}
                  {data.beneficiary.isPwd && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-200 border border-purple-400/40">
                      PWD
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Napatunayan</span>
                  </span>
                </div>
              </div>

              {/* Day Selector Ribbon (Day 1 to 10) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-bold flex items-center space-x-1.5 text-gov-goldLight">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Piliin ang Araw ng Work Program:</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-300">
                    Day {data.workDay.dayNumber} of {data.program.requiredWorkDays} Days
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
                        className={`py-2 px-1 rounded-xl text-xs font-black transition text-center ${
                          isSelected
                            ? "bg-gov-gold text-gov-dark shadow-md scale-105 border border-amber-200 font-extrabold"
                            : "bg-slate-800/90 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700"
                        }`}
                      >
                        Day {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Work Assignment & Details Card */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center space-x-2 text-emerald-800 font-black text-xs uppercase tracking-wider">
                  <Navigation className="w-4 h-4 text-emerald-600" />
                  <span>DESIGNATED WORK AREA (DAY {data.workDay.dayNumber})</span>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                  {data.assignment.allocationMethod.replace(/_/g, " ")}
                </span>
              </div>

              {/* Area Box */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 shadow-2xs">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h5 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                      {data.assignment.area}
                    </h5>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Itinalagang Sona/Purok sa Barangay {data.beneficiary.barangay}
                    </p>
                  </div>
                </div>

                {/* Specific Activity Box */}
                <div className="pt-3 border-t border-slate-100 flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 border border-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Layers className="w-5 h-5 text-blue-700" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider">
                      Partikular na Gawain (Specific Activity):
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                      {data.assignment.specificActivity}
                    </p>
                  </div>
                </div>
              </div>

              {/* Working Hours / Shift Schedule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center space-x-3 shadow-2xs">
                  <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-slate-500">Oras sa Umaga (Morning Shift)</p>
                    <p className="text-slate-900 font-mono font-bold">{data.program.morningHours}</p>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center space-x-3 shadow-2xs">
                  <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-slate-500">Oras sa Hapon (Afternoon Shift)</p>
                    <p className="text-slate-900 font-mono font-bold">{data.program.afternoonHours}</p>
                  </div>
                </div>
              </div>

              {/* Proximity & Allocation Rationale */}
              <div className="p-4 bg-blue-50/80 rounded-xl border border-blue-200 text-xs text-blue-950 space-y-1">
                <div className="flex items-center space-x-1.5 font-black text-blue-900">
                  <Compass className="w-4 h-4 text-blue-700" />
                  <span>Dahilan ng Pagkatalaga (Proximity &amp; Gender Rationale):</span>
                </div>
                <p className="text-xs leading-relaxed text-blue-900/90 font-medium">
                  {data.assignment.matchingRationale}
                </p>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Mag-scan ng Ibang Benepisyaryo</span>
                </button>

                <a
                  href="/my-assignment"
                  className="text-xs font-bold text-gov-blue hover:underline flex items-center space-x-1"
                >
                  <span>Buksan sa Dedicated Mobile Portal</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      {scannerOpen && (
        <QrScannerModal
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={handleScan}
          title="I-scan ang Iyong TUPAD QR Code Badge"
        />
      )}
    </div>
  );
}
