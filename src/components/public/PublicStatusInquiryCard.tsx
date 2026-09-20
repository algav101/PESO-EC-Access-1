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
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export function PublicStatusInquiryCard() {
  // Dropdown Collapsible State
  const [isOpen, setIsOpen] = useState(false);

  // Form State
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [extensionName, setExtensionName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [dpaConsent, setDpaConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!dpaConsent) {
      setError("Mangyaring lagyan ng tsek ang pahintulot sa ilalim ng Data Privacy Act of 2012 bago magpatuloy.");
      return;
    }

    if (!lastName.trim() || !firstName.trim()) {
      setError("Pakilagay ang inyong Last Name (Apelyido) at First Name (Pangalan).");
      return;
    }

    setLoading(true);
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
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden transition-all">
      {/* Header Bar with Accordion Dropdown Trigger */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 p-5 sm:p-7 text-white relative cursor-pointer select-none transition-colors hover:brightness-105"
      >
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center space-x-1.5 bg-gov-gold/20 text-gov-goldLight px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border border-gov-gold/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>PESO Dingalan Public Citizen Portal</span>
              </div>
              <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-200 border border-blue-400/30 rounded-full text-[11px] font-bold">
                RA 10173 DPA Compliant
              </span>
            </div>

            <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>TUPAD Application Status Inquiry</span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Alamin ang opisyal na estado ng inyong TUPAD application, suriin ang mga kakulangang dokumento, at tingnan ang talaan ng nakaraang TUPAD availment.
            </p>
          </div>

          <div className="p-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-white transition-transform duration-200">
            {isOpen ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
          </div>
        </div>

        {/* Ambient Blur */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none transform translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* Expandable Dropdown Form Content */}
      {isOpen && (
        <div className="p-6 sm:p-8 space-y-6 animate-fadeIn">
          {/* Data Privacy Notice & Consent Header */}
          <div className="p-4 sm:p-5 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-3 text-xs text-slate-700">
            <div className="flex items-start space-x-3">
              <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-extrabold uppercase text-slate-900 text-xs tracking-wider">
                  Pahayag ng Pagsunod sa Data Privacy Act ng 2012 (R.A. 10173)
                </h4>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Ang Tanggapan ng PESO Dingalan ay mahigpit na sumusunod sa Republic Act No. 10173 (Data Privacy Act of 2012). Ang mga personal na impormasyong inyong ilalagay (Pangalan, Kaarawan) ay gagamitin lamang sa pagsusuri ng estado ng inyong TUPAD application at hindi ibabahagi sa ibang partido nang walang pahintulot.
                </p>
              </div>
            </div>

            {/* Consent Form Checkbox */}
            <label className="flex items-start space-x-3 pt-2 border-t border-blue-200/80 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dpaConsent}
                onChange={(e) => {
                  setDpaConsent(e.target.checked);
                  if (e.target.checked && error) setError(null);
                }}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800 leading-snug">
                Sumasang-ayon ako sa pagproseso ng aking impormasyon para sa layunin ng pagsusuri ng aking TUPAD application status alinsunod sa Data Privacy Act ng 2012. <span className="text-rose-600">*</span>
              </span>
            </label>
          </div>

          {/* Search Form */}
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
                  className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue uppercase"
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
                  className="flex-1 py-2.5 px-6 bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <Search className="w-4 h-4 text-gov-gold" aria-hidden="true" />
                  <span>{loading ? "Sinisiyasat..." : "Suriin ang Aplikasyon"}</span>
                </button>

                {(result || lastName || firstName) && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition cursor-pointer"
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
            <div className="space-y-5 animate-in fade-in duration-300 pt-2 border-t border-slate-200">
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
                      className="font-bold text-blue-900 hover:underline inline-flex items-center space-x-1"
                    >
                      <span>Mag-inquire sa PESO Dingalan</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Case 2: FOUND BENEFICIARY */}
              {result.found && result.beneficiary && (
                <div className="space-y-4">
                  <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start space-x-3.5">
                      <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-black text-emerald-800 uppercase tracking-wider block">
                          Opisyal na Talaan sa TUPAD Database
                        </span>
                        <h3 className="text-lg font-black text-slate-900 uppercase">
                          {result.beneficiary.fullName}
                        </h3>
                        <p className="text-xs text-slate-600 flex items-center space-x-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>Brgy. {result.beneficiary.barangay}, {result.beneficiary.sitio || "Centro"}, Dingalan</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex md:flex-col items-center md:items-end justify-between gap-1">
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-700 text-white shadow-xs">
                        {result.beneficiary.status || "ACTIVE"}
                      </span>
                      {result.beneficiary.designatedNumber && (
                        <span className="text-[11px] font-mono font-bold text-slate-600">
                          Slot #{result.beneficiary.designatedNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 365-Day Restriction Compliance Card */}
                  {result.restrictionCheck && (
                    <div className={`p-4 rounded-2xl border text-xs ${
                      result.restrictionCheck.isRestricted
                        ? "bg-rose-50 border-rose-200 text-rose-900"
                        : "bg-emerald-50 border-emerald-200 text-emerald-900"
                    }`}>
                      <div className="flex items-start space-x-2.5">
                        {result.restrictionCheck.isRestricted ? (
                          <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-1">
                          <span className="font-extrabold uppercase text-[11px] tracking-wide block">
                            365-Day TUPAD Availment Rule Check
                          </span>
                          <p>{result.restrictionCheck.message}</p>
                          {result.restrictionCheck.lastAvailmentDate && (
                            <p className="text-[11px] opacity-85">
                              Huling petsa ng pagtanggap: <strong>{result.restrictionCheck.lastAvailmentDate}</strong>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Active Program Enrollments */}
                  {result.enrollments && result.enrollments.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                        <Building className="w-4 h-4 text-blue-900" />
                        <span>Kasalukuyang Programa na Nilalahukan</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {result.enrollments.map((enr: any, idx: number) => (
                          <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-slate-900">{enr.programName}</span>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-bold text-[10px]">
                                {enr.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 space-y-1">
                              <div>Location: <strong>{enr.projectLocation || "Dingalan"}</strong></div>
                              <div>Iskedyul: <strong>{enr.requiredWorkDays} Araw</strong></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
