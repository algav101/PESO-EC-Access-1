"use client";

import React, { useState } from "react";
import {
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
  Search,
  Lock,
  FileText,
  AlertTriangle,
  Info,
  Check,
  Award,
} from "lucide-react";

const DINGALAN_BARANGAYS = [
  "ALL",
  "Aplaya",
  "Butas Na Bato",
  "Cabischasan",
  "Caragsacan",
  "Davil-davilan",
  "Dikapanikian",
  "Ibona",
  "Paltic",
  "Poblacion",
  "Tanawan",
  "Umiray",
];

export function PublicWorkAssignmentLookupCard() {
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [barangay, setBarangay] = useState("ALL");
  const [dpaConsent, setDpaConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);

  const handleLookup = async (e?: React.FormEvent, customDay?: number) => {
    if (e) e.preventDefault();

    if (!dpaConsent) {
      setError("Pakisuyong lagyan ng tsek ang Data Privacy Consent bago magpatuloy.");
      return;
    }

    if (!lastName.trim() || !firstName.trim() || !middleName.trim()) {
      setError("Pakilagay ang iyong Apelyido, Pangalan, at Gitnang Pangalan (o 'N/A' kung wala).");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      queryParams.set("lastName", lastName.trim());
      queryParams.set("firstName", firstName.trim());
      queryParams.set("middleName", middleName.trim());
      if (barangay && barangay !== "ALL") {
        queryParams.set("barangay", barangay);
      }
      const targetDay = customDay !== undefined ? customDay : selectedDay;
      if (targetDay) {
        queryParams.set("dayNumber", String(targetDay));
      }

      const res = await fetch(`/api/v1/work-assignment/lookup?${queryParams.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setData(json);
        setSelectedDay(json.workDay.dayNumber || 1);
        setError(null);
      } else if (json.requiresAuth || json.authFailed) {
        setError(json.error || "Maling Gitnang Pangalan. Pakitiyak ang tamang gitnang pangalan na nakarehistro sa iyong TUPAD application.");
        setData(null);
      } else {
        setError(json.error || "Walang nahanap na tala sa pangalang ibinigay. Pakitiyak ang baybay ng iyong pangalan.");
        setData(null);
      }
    } catch (err: any) {
      setError("May naganap na problema sa koneksyon: " + err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDaySwitch = (dayNum: number) => {
    setSelectedDay(dayNum);
    if (data && lastName && firstName && middleName) {
      handleLookup(undefined, dayNum);
    }
  };

  const handleReset = () => {
    setData(null);
    setError(null);
  };

  return (
    <div className="gov-card border-2 border-emerald-600/30 overflow-hidden bg-white shadow-xl rounded-3xl transition-all">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-blue-950 p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 rounded-full text-xs font-black tracking-wide uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              DOLE - PESO TUPAD • Field Operations
            </span>
            <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-200 border border-blue-400/30 rounded-full text-[11px] font-bold">
              RA 10173 DPA Compliant
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
            Suriin ang Iyong TUPAD Work Area Assignment & Iskedyul
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            Para sa mga rehistradong benepisyaryo ng TUPAD sa Bayan ng Dingalan: Ilagay ang iyong kumpletong pangalan upang makita ang iyong itinalagang lugar ng paggawa, uri ng aktibidad (road clearing, coastal cleaning, atbp.), at 10-araw na iskedyul.
          </p>
        </div>

        {/* Decorative Background Elements */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-72 h-72 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* If no verified data is showing yet, show Search Form */}
        {!data ? (
          <form onSubmit={(e) => handleLookup(e)} className="space-y-6">
            {/* Input Grid: Last Name, First Name, Middle Name, Barangay */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Last Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Apelyido (Last Name) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Hal. DELA CRUZ"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition uppercase placeholder:normal-case placeholder:font-normal"
                  />
                </div>
              </div>

              {/* First Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Pangalan (First Name) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Hal. JUAN"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition uppercase placeholder:normal-case placeholder:font-normal"
                  />
                </div>
              </div>

              {/* Middle Name (Auth Shield) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Gitnang Pangalan <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-emerald-700 font-bold lowercase">(o 'N/A')</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-emerald-600 absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="Hal. SANTOS"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-emerald-300/80 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition uppercase placeholder:normal-case placeholder:font-normal"
                  />
                </div>
              </div>

              {/* Barangay Filter */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Barangay (Opsyonal)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                  <select
                    value={barangay}
                    onChange={(e) => setBarangay(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  >
                    {DINGALAN_BARANGAYS.map((b) => (
                      <option key={b} value={b}>
                        {b === "ALL" ? "Lahat ng Barangay" : `Brgy. ${b}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Official Data Privacy Act Notice & User Consent Box */}
            <div className="bg-gradient-to-br from-blue-50/80 via-slate-50 to-emerald-50/60 border-2 border-blue-200/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-xs">
                  <h4 className="font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <span>PAUNAWA UKOL SA DATA PRIVACY (REPUBLIC ACT NO. 10173)</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    Ang Tanggapan ng <strong className="text-slate-900">PESO Dingalan</strong> ay mahigpit na sumusunod sa mga panuntunan ng <em>Data Privacy Act of 2012 (R.A. 10173)</em>. Ang impormasyong iyong ibibigay (Apelyido, Pangalan, Gitnang Pangalan) ay gagamitin <strong>eksklusibo</strong> para sa opisyal na pagberipika ng iyong talaan bilang benepisyaryo ng TUPAD, pagtukoy sa iyong itinalagang Work Area, at pagpapakita ng iyong 10-araw na iskedyul ng paggawa. Ang iyong personal na datos ay protektado at hindi kailanman ibabahagi sa mga hindi awtorisadong tao o ahensya.
                  </p>
                </div>
              </div>

              {/* Interactive User Consent Checkbox */}
              <div className="pt-2 border-t border-blue-200/60">
                <label className="flex items-start space-x-3 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={dpaConsent}
                    onChange={(e) => setDpaConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-900 leading-tight">
                    Nauunawaan ko at <strong className="text-emerald-800 font-black">kusang-loob akong nagbibigay ng pahintulot (User Consent)</strong> sa PESO LGU Dingalan na iproseso ang aking impormasyon para sa paghahanap ng aking TUPAD Work Assignment alinsunod sa Data Privacy Act of 2012.
                  </span>
                </label>
              </div>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-800 text-xs">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Hindi Ma-verify ang Impormasyon:</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-500 font-medium">
                * Ang lahat ng impormasyon ay nabe-beripika nang real-time sa opisyal na PESO Dingalan Masterlist.
              </span>

              <button
                type="submit"
                disabled={loading || !dpaConsent}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-sm shadow-lg flex items-center justify-center space-x-2 transition transform active:scale-95 ${
                  loading || !dpaConsent
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-emerald-600/30"
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Hinahanap ang Talaan...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Suriin ang Aking Work Assignment</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* 3. Verified Assignment Display Card */
          <div className="space-y-6">
            {/* Top Verification Badge & Identity Summary */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-300/80 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start space-x-3.5">
                <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-700 text-white rounded-md text-[11px] font-black tracking-wider uppercase">
                      VERIFIED TUPAD BENEFICIARY
                    </span>
                    <span className="px-2 py-0.5 bg-slate-900 text-gov-gold font-mono font-black rounded-md text-xs">
                      SLOT #{data.beneficiary.designatedNumber}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-900 font-bold rounded-md text-xs">
                      {data.beneficiary.tableNumber || "Table 1"}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 uppercase">
                    {data.beneficiary.fullName}
                  </h3>

                  <p className="text-xs text-slate-600">
                    Tirahan: <strong className="text-slate-800">{data.beneficiary.sitio || "Centro"}, Brgy. {data.beneficiary.barangay}</strong> • Kasarian: <strong className="text-slate-800">{data.beneficiary.sex}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={handleReset}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Maghanap ng Ibang Pangalan</span>
              </button>
            </div>

            {/* Program & Active Work Area Focus Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Assigned Work Area Details */}
              <div className="lg:col-span-2 space-y-4 bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                      Itinalagang Lugar ng Paggawa (Assigned Work Area)
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[11px] font-bold">
                    Araw {data.workDay.dayNumber} ng {data.program.requiredWorkDays || 10}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="text-2xl sm:text-3xl font-black text-white leading-tight">
                    {data.assignment.area || `Brgy. ${data.beneficiary.barangay} Community Work Area`}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300">
                    <strong className="text-emerald-400 font-bold">Partikular na Gawain: </strong>
                    {data.assignment.specificActivity || "Community cleaning, roadside maintenance, and environmental protection."}
                  </p>
                </div>

                {/* Proximity Matching Rationale Tag */}
                <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 flex items-start space-x-3 text-xs">
                  <Compass className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300">Dahilan ng Pagkakatalaga (Proximity Allocation):</span>
                    <p className="text-slate-300 mt-0.5">
                      {data.assignment.matchingRationale || "Itinalaga sa pinakamalapit na purok/sitio sa iyong rehistradong tirahan upang maging maginhawa ang pagpasok."}
                    </p>
                  </div>
                </div>

                {/* Working Hours & Program Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center space-x-3">
                    <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Oras ng Paggawa (Umaga & Hapon)</span>
                      <span className="text-xs font-bold text-slate-100">
                        {data.program.morningHours} • {data.program.afternoonHours}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center space-x-3">
                    <Building className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Programa</span>
                      <span className="text-xs font-bold text-slate-100 truncate block">
                        {data.program.programName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Col: Important Guidelines & Attendance Notice */}
              <div className="space-y-4 bg-amber-50/90 border-2 border-amber-300/80 rounded-3xl p-6 text-amber-950 flex flex-col justify-between shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-amber-900 font-extrabold text-sm uppercase tracking-wide">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span>Mahalagang Paalala</span>
                  </div>

                  <ul className="space-y-2 text-xs text-amber-950 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5 font-black" />
                      <span><strong>Suotin ang PPE:</strong> DOLE TUPAD Long Sleeve shirt at Cap sa bawat araw ng paggawa.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5 font-black" />
                      <span><strong>Magdala ng Valid ID at QR Stub:</strong> Ipakita sa field coordinator tuwing AM at PM attendance scan.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5 font-black" />
                      <span><strong>Pumunta sa Tamang Oras:</strong> 8:00 AM sa itinalagang Work Area ng inyong Barangay.</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-amber-300/80 text-[11px] text-amber-900 font-medium">
                  May katanungan? Makipag-ugnayan sa PESO Dingalan Field Coordinator sa inyong barangay.
                </div>
              </div>
            </div>

            {/* 10-Day Work Schedule Interactive Timeline Switcher */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-emerald-700" />
                  <span>Iskedyul sa Kabuuang 10 Araw ng Programa</span>
                </h4>
                <span className="text-xs text-slate-500 font-medium">I-click ang bawat araw para makita ang assignment</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
                {Array.from({ length: data.program.requiredWorkDays || 10 }, (_, i) => i + 1).map((dayNum) => (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => handleDaySwitch(dayNum)}
                    className={`p-2.5 rounded-xl text-center border transition flex flex-col items-center justify-center ${
                      selectedDay === dayNum
                        ? "bg-emerald-700 text-white border-emerald-700 shadow-md scale-105 font-black"
                        : "bg-slate-50 hover:bg-emerald-50 text-slate-700 border-slate-200 font-bold"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold opacity-80">Araw</span>
                    <span className="text-base font-black font-mono leading-none mt-0.5">{dayNum}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
