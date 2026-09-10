"use client";

import React, { useState } from "react";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Calendar,
  User,
  MapPin,
  FileText,
  ShieldAlert,
  Clock,
  Send,
  Sparkles,
  Info,
  Phone,
  CreditCard,
  Building,
} from "lucide-react";

export function PublicStatusInquiryCard() {
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [extensionName, setExtensionName] = useState("");
  const [birthday, setBirthday] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastName.trim() || !firstName.trim()) {
      setError("Pakilagay ang inyong Last Name at First Name.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/v1/public/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastName,
          firstName,
          middleName,
          extensionName,
          birthday,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "May naganap na error sa pagsusuri ng aplikasyon.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setLastName("");
    setFirstName("");
    setMiddleName("");
    setExtensionName("");
    setBirthday("");
    setResult(null);
    setError(null);
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-gov-blue via-gov-light to-gov-blue p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 bg-gov-gold/20 text-gov-goldLight px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-gov-gold/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>PESO Dingalan Public Citizen Portal</span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight">
              TUPAD Application Status Inquiry
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
              Alamin ang opisyal na estado ng inyong TUPAD application, suriin ang mga kakulangang dokumento, at tingnan ang talaan ng nakaraang TUPAD availment.
            </p>
          </div>

          <div className="flex-shrink-0">
            <a
              href="#inquiry-form"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition inline-flex items-center space-x-1.5"
            >
              <Send className="w-3.5 h-3.5 text-gov-gold" />
              <span>Magpadala ng Mensahe</span>
            </a>
          </div>
        </div>
      </div>

      {/* Inquiry Form */}
      <div className="p-6 sm:p-8 space-y-6">
        <form onSubmit={handleSearch} className="space-y-4" aria-label="TUPAD Application Inquiry Form">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label htmlFor="inquiry-last-name" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Last Name (Apelyido) <span className="text-rose-500">*</span>
              </label>
              <input
                id="inquiry-last-name"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Hal. DELA CRUZ"
                className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue uppercase"
              />
            </div>

            <div>
              <label htmlFor="inquiry-first-name" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                First Name (Pangalan) <span className="text-rose-500">*</span>
              </label>
              <input
                id="inquiry-first-name"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Hal. JUAN"
                className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue uppercase"
              />
            </div>

            <div>
              <label htmlFor="inquiry-middle-name" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Middle Name (Gitnang Pangalan)
              </label>
              <input
                id="inquiry-middle-name"
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="Hal. SANTOS"
                className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue uppercase"
              />
            </div>

            <div>
              <label htmlFor="inquiry-ext-name" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Ext. Name (JR, SR, III)
              </label>
              <input
                id="inquiry-ext-name"
                type="text"
                value={extensionName}
                onChange={(e) => setExtensionName(e.target.value)}
                placeholder="Hal. JR / III"
                className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-1">
            <div className="sm:col-span-2">
              <label htmlFor="inquiry-birthday" className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-gov-blue" aria-hidden="true" />
                <span>Birthday / Kaarawan (Opsyonal bilang Kumpirmasyon)</span>
              </label>
              <input
                id="inquiry-birthday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue"
              />
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 px-6 bg-gov-blue hover:bg-gov-light text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Search className="w-4 h-4 text-gov-gold" aria-hidden="true" />
                <span>{loading ? "Sinisiyasat..." : "Suriin ang Aplikasyon"}</span>
              </button>

              {(result || lastName || firstName) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition"
                >
                  I-clear
                </button>
              )}
            </div>
          </div>
        </form>

        {error && (
          <div 
            role="alert"
            aria-live="assertive"
            className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-3 text-xs text-rose-800 font-medium"
          >
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* RESULTS SECTION */}
        {result && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Case 1: NOT FOUND */}
            {!result.found && (
              <div className="p-6 bg-amber-50/80 border-2 border-amber-300 rounded-2xl space-y-3">
                <div className="flex items-start space-x-3">
                  <Info className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-base font-black text-amber-950">
                      Wala sa Talaan ang Pangalan
                    </h4>
                    <p className="text-sm font-semibold text-amber-900 leading-relaxed">
                      {result.message}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-amber-800">
                    Pangalang Hinanap: <strong>{result.searchedName}</strong>
                  </span>
                  <a
                    href="#inquiry-form"
                    className="font-bold text-gov-blue hover:underline inline-flex items-center space-x-1"
                  >
                    <span>Mag-inquire sa PESO Dingalan</span>
                    <span>→</span>
                  </a>
                </div>
              </div>
            )}

            {/* Case 2: FOUND - WITH LACKING DETAILS */}
            {result.found && result.isLackingDetails && (
              <div className="p-6 bg-amber-50 border-2 border-amber-400 rounded-2xl space-y-4 shadow-sm">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-200 text-amber-950 px-2.5 py-0.5 rounded-full">
                        May Kakulangang Dokumento
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Brgy. {result.applicant?.barangay || "Dingalan"}
                      </span>
                    </div>

                    <h4 className="text-base sm:text-lg font-black text-slate-900">
                      {result.applicant?.fullName}
                    </h4>

                    {/* Verbatim Tagalog Notice */}
                    <div className="p-3.5 bg-white border border-amber-300 rounded-xl text-xs sm:text-sm font-bold text-amber-950 leading-relaxed shadow-xs">
                      "{result.message}"
                    </div>
                  </div>
                </div>

                {/* List of Lacking Fields */}
                {result.lackingFields && result.lackingFields.length > 0 && (
                  <div className="p-4 bg-white/90 border border-amber-200 rounded-xl space-y-2">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                      Mga Kinakailangang Kumpletuhin o Dalhin sa Tanggapan:
                    </span>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                      {result.lackingFields.map((field: string, idx: number) => (
                        <li key={idx} className="flex items-center space-x-2 bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 flex-shrink-0"></span>
                          <span className="font-semibold">{field}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Source File Remarks */}
                {result.sourceRemarks && (
                  <div className="text-xs text-slate-600 bg-white/70 p-3 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-700">Tala / Remarks mula sa Tanggapan: </span>
                    <span>{result.sourceRemarks}</span>
                  </div>
                )}
              </div>
            )}

            {/* Case 3: FOUND - COMPLETE APPLICATION QUEUED */}
            {result.found && !result.isLackingDetails && (
              <div className="p-6 bg-emerald-50 border-2 border-emerald-400 rounded-2xl space-y-4 shadow-sm">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-200 text-emerald-950 px-2.5 py-0.5 rounded-full">
                        Kumpleto ang Aplikasyon • Nakapila
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Brgy. {result.applicant?.barangay || "Dingalan"}
                      </span>
                    </div>

                    <h4 className="text-base sm:text-lg font-black text-slate-900">
                      {result.applicant?.fullName}
                    </h4>

                    {/* Verbatim Tagalog Notice */}
                    <div className="p-3.5 bg-white border border-emerald-300 rounded-xl text-xs sm:text-sm font-black text-emerald-950 leading-relaxed shadow-xs">
                      "{result.message}"
                    </div>
                  </div>
                </div>

                {/* Source File Remarks */}
                {result.sourceRemarks && (
                  <div className="text-xs text-slate-600 bg-white/70 p-3 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-700">Tala / Remarks: </span>
                    <span>{result.sourceRemarks}</span>
                  </div>
                )}
              </div>
            )}

            {/* Additional Details Grid if Found */}
            {result.found && result.applicant && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Barangay / Komunidad</span>
                    <p className="font-bold text-slate-800">
                      Brgy. {result.applicant.barangay}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Contact No. (Masked)</span>
                    <p className="font-mono font-bold text-slate-800">{result.applicant.contactNumber}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Katibayan ng ID</span>
                    <p className="font-bold text-slate-800">
                      {result.applicant.idPresented} <span className="font-mono text-[11px] text-slate-500">({result.applicant.idNumber})</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Dependent (Masked)</span>
                    <p className="font-bold text-slate-800">{result.applicant.dependentFullName}</p>
                  </div>
                </div>

                <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-[10px] text-blue-900 font-medium flex items-center justify-between">
                  <span>🔒 <strong>Data Privacy Act (R.A. 10173):</strong> Naka-mask ang mga personal na detalye para sa seguridad ng aplikante.</span>
                  <span className="font-bold text-gov-blue">PESO Dingalan DPO</span>
                </div>
              </div>
            )}

            {/* Past TUPAD Availment / Validator ADL Record */}
            {result.lastAvailment && (
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2.5 shadow-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black uppercase text-gov-gold flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-gov-gold" />
                    <span>Nakaraang TUPAD Availment & Validator List Record</span>
                  </span>
                  <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                    ADL Reference
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                      Batch / Appointive Position:
                    </span>
                    <p className="font-mono font-bold text-gov-goldLight text-sm">
                      {result.lastAvailment.adlNo}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                      Payout Date:
                    </span>
                    <p className="font-bold text-slate-200">
                      {result.lastAvailment.payoutDate}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                      Work Duration Date:
                    </span>
                    <p className="font-bold text-slate-200">
                      {result.lastAvailment.workDate}
                    </p>
                  </div>
                </div>

                {result.lastAvailment.reason && (
                  <p className="text-[11px] text-slate-400 pt-1">
                    Katayuan: <span className="text-amber-300 font-semibold">{result.lastAvailment.reason}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
