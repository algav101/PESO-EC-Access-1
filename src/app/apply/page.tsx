"use client";

import React, { useState } from "react";
import {
  FileText,
  User,
  MapPin,
  Phone,
  CreditCard,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  HelpCircle,
  RotateCcw,
  Send,
  Printer,
  Calendar,
  Layers,
  Info,
  Building,
  HeartHandshake,
  Check,
  ChevronRight,
  ArrowLeft,
  Search,
} from "lucide-react";
import { PesoLogo } from "@/components/layout/PesoLogo";

export default function OnlineTupadApplicationPage() {
  const [step, setStep] = useState(1);

  // Form Fields
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [extensionName, setExtensionName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [sex, setSex] = useState("MALE");
  const [civilStatus, setCivilStatus] = useState("SINGLE");
  const [contactNumber, setContactNumber] = useState("");
  const [streetSitio, setStreetSitio] = useState("");
  const [barangay, setBarangay] = useState("Paltic");

  // Step 2: Socio-Economic & ID
  const [idPresented, setIdPresented] = useState("UMID");
  const [idNumber, setIdNumber] = useState("");
  const [is4ps, setIs4ps] = useState("N");
  const [isIp, setIsIp] = useState("N");
  const [isSenior, setIsSenior] = useState(false);
  const [isPwd, setIsPwd] = useState(false);
  const [occupation, setOccupation] = useState("LABORER");
  const [monthlyIncome, setMonthlyIncome] = useState("4500");

  // Step 3: Dependent
  const [dependentFullName, setDependentFullName] = useState("");
  const [dependentAge, setDependentAge] = useState("");
  const [dependentRelationship, setDependentRelationship] = useState("SPOUSE");
  const [remarks, setRemarks] = useState("");

  // Step 4: Consent
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Submission State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);

  const BARANGAYS = [
    "Aplaya",
    "Butas na Bato",
    "Caragsacan",
    "Davildavilan",
    "Dikapanikian",
    "Ibona",
    "Matawe",
    "Paltic",
    "Poblacion",
    "Tanawan",
    "Umiray",
  ];

  const ID_TYPES = [
    "UMID",
    "VOTERS ID / CERTIFICATION",
    "PHILHEALTH ID",
    "NATIONAL ID (PHILSYS)",
    "DRIVERS LICENSE",
    "BARANGAY CERTIFICATION WITH PHOTO",
    "SENIOR CITIZEN ID",
    "PWD ID",
    "SSS / GSIS ID",
  ];

  // ---------------------------------------------------------------------------
  // 🧪 DUMMY PRESETS FOR LOGIC PLANNING & DEBUGGING
  // ---------------------------------------------------------------------------
  const applyPreset = (presetType: string) => {
    setError(null);
    if (presetType === "ELIGIBLE_COMPLETE") {
      setLastName("DELA CRUZ");
      setFirstName("JUAN");
      setMiddleName("SANTOS");
      setExtensionName("");
      setBirthday("1988-05-14");
      setSex("MALE");
      setCivilStatus("MARRIED");
      setContactNumber("09123456789");
      setStreetSitio("Centro");
      setBarangay("Paltic");
      setIdPresented("UMID");
      setIdNumber("CRN-0111-2222-3333");
      setIs4ps("N");
      setIsIp("N");
      setIsSenior(false);
      setIsPwd(false);
      setOccupation("CONSTRUCTION LABORER");
      setMonthlyIncome("4500");
      setDependentFullName("MARIA DELA CRUZ");
      setDependentAge("34");
      setDependentRelationship("SPOUSE");
      setRemarks("Complete requirements submitted");
      setAgreedToTerms(true);
    } else if (presetType === "INCOMPLETE_MISSING_ID") {
      setLastName("SANTOS");
      setFirstName("MARIA");
      setMiddleName("GOMEZ");
      setExtensionName("");
      setBirthday("1994-11-22");
      setSex("FEMALE");
      setCivilStatus("SINGLE");
      setContactNumber(""); // Missing contact
      setStreetSitio("Purok 2");
      setBarangay("Aplaya");
      setIdPresented(""); // Missing ID
      setIdNumber(""); // Missing ID #
      setIs4ps("N");
      setIsIp("N");
      setIsSenior(false);
      setIsPwd(false);
      setOccupation("HOUSEWIFE");
      setMonthlyIncome("2000");
      setDependentFullName(""); // Missing dependent
      setDependentAge("");
      setDependentRelationship("");
      setRemarks("Applicant will follow up valid ID photocopy");
      setAgreedToTerms(true);
    } else if (presetType === "RESTRICTED_RECENT") {
      setLastName("DELA CRUZ");
      setFirstName("JUAN");
      setMiddleName("SANTOS");
      setExtensionName("");
      setBirthday("1988-05-14");
      setSex("MALE");
      setCivilStatus("MARRIED");
      setContactNumber("09123456789");
      setStreetSitio("Sitio Caragsacan");
      setBarangay("Caragsacan");
      setIdPresented("NATIONAL ID (PHILSYS)");
      setIdNumber("1234-5678-9012-3456");
      setIs4ps("N");
      setIsIp("N");
      setOccupation("FARMER");
      setMonthlyIncome("3500");
      setDependentFullName("ELENA DELA CRUZ");
      setDependentAge("16");
      setDependentRelationship("DAUGHTER");
      setRemarks("Testing 365-Day Restriction Trigger");
      setAgreedToTerms(true);
    } else if (presetType === "IP_DUMAGAT") {
      setLastName("KATALBAS");
      setFirstName("DANILO");
      setMiddleName("RAMOS");
      setExtensionName("");
      setBirthday("1976-03-20");
      setSex("MALE");
      setCivilStatus("MARRIED");
      setContactNumber("09456789012");
      setStreetSitio("Sitio Cabog");
      setBarangay("Umiray");
      setIdPresented("BARANGAY CERTIFICATION WITH PHOTO");
      setIdNumber("BRGY-UMIRAY-2026-088");
      setIs4ps("Y");
      setIsIp("Y");
      setIsSenior(false);
      setIsPwd(false);
      setOccupation("INDIGENOUS HANDICRAFT & FARMING");
      setMonthlyIncome("3000");
      setDependentFullName("LITA KATALBAS");
      setDependentAge("46");
      setDependentRelationship("SPOUSE");
      setRemarks("Dumagat-Remontado IP community applicant");
      setAgreedToTerms(true);
    } else if (presetType === "RANDOM") {
      const firstNames = ["ARNEL", "JOCELYN", "RODEL", "MARILOU", "CHRISTOPHER", "GINA", "EDWARD", "TERESA"];
      const lastNames = ["BAUTISTA", "MENDOZA", "PASCUAL", "VILLANUEVA", "RAMIREZ", "CORTEZ", "DOMINGO"];
      const rFirst = firstNames[Math.floor(Math.random() * firstNames.length)];
      const rLast = lastNames[Math.floor(Math.random() * lastNames.length)];
      const rBrgy = BARANGAYS[Math.floor(Math.random() * BARANGAYS.length)];
      const rYear = Math.floor(Math.random() * 35) + 1965;
      const rMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
      const rDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");

      setLastName(rLast);
      setFirstName(rFirst);
      setMiddleName("B");
      setExtensionName("");
      setBirthday(`${rYear}-${rMonth}-${rDay}`);
      setSex(Math.random() > 0.5 ? "MALE" : "FEMALE");
      setCivilStatus("MARRIED");
      setContactNumber(`09${Math.floor(Math.random() * 899999999 + 100000000)}`);
      setStreetSitio(`Purok ${Math.floor(Math.random() * 5) + 1}`);
      setBarangay(rBrgy);
      setIdPresented(ID_TYPES[Math.floor(Math.random() * ID_TYPES.length)]);
      setIdNumber(`ID-${Math.floor(Math.random() * 899999 + 100000)}`);
      setIs4ps(Math.random() > 0.7 ? "Y" : "N");
      setIsIp(Math.random() > 0.8 ? "Y" : "N");
      setOccupation("SELF EMPLOYED / LABORER");
      setMonthlyIncome("4000");
      setDependentFullName(`BENEFICIARY OF ${rFirst} ${rLast}`);
      setDependentAge("20");
      setDependentRelationship("CHILD");
      setRemarks("Randomized Test Submission");
      setAgreedToTerms(true);
    } else if (presetType === "CLEAR") {
      setLastName("");
      setFirstName("");
      setMiddleName("");
      setExtensionName("");
      setBirthday("");
      setSex("MALE");
      setCivilStatus("SINGLE");
      setContactNumber("");
      setStreetSitio("");
      setBarangay("Paltic");
      setIdPresented("UMID");
      setIdNumber("");
      setIs4ps("N");
      setIsIp("N");
      setIsSenior(false);
      setIsPwd(false);
      setOccupation("");
      setMonthlyIncome("");
      setDependentFullName("");
      setDependentAge("");
      setDependentRelationship("SPOUSE");
      setRemarks("");
      setAgreedToTerms(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastName.trim() || !firstName.trim()) {
      setError("Pakilagay ang inyong Last Name at First Name.");
      setStep(1);
      return;
    }

    if (!agreedToTerms) {
      setError("Pakisuyong basahin at lagyan ng tsek ang kasunduan / Data Privacy consent bago magsumite.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/public/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastName,
          firstName,
          middleName,
          extensionName,
          birthday,
          sex,
          civilStatus,
          contactNumber,
          streetSitio,
          barangay,
          idPresented,
          idNumber,
          is4ps,
          isIp,
          occupation,
          monthlyIncome,
          dependentFullName,
          dependentAge,
          dependentRelationship,
          remarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "May error sa pagsusumite ng aplikasyon.");

      setSubmissionResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-8 px-4 sm:px-6 lg:px-8 selection:bg-gov-blue selection:text-white">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Back Link */}
        <div className="flex items-center justify-between">
          <a
            href="/"
            className="text-xs font-bold text-slate-600 hover:text-gov-blue flex items-center space-x-1.5 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Bumalik sa Landing Page</span>
          </a>

          <a
            href="/#inquiry"
            className="text-xs font-bold text-gov-blue hover:underline flex items-center space-x-1"
          >
            <Search className="w-3.5 h-3.5 text-gov-gold" />
            <span>May Aplikasyon Na? Suriin ang Status</span>
          </a>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* 🧪 TESTING & LOGIC PLANNING DUMMY TOOLBAR */}
        {/* ----------------------------------------------------------------- */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 p-4 rounded-3xl text-white shadow-lg space-y-2.5 border-2 border-amber-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-400/40 pb-2">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-amber-900/40 rounded-xl text-amber-200">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider">
                  🧪 Logic Planning & Debugging Quick Autofill Sandbox
                </h3>
                <p className="text-[11px] text-amber-100">
                  Subukan ang iba't ibang validation scenarios at restriction triggers sa isang pindot lamang:
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => applyPreset("CLEAR")}
              className="text-[10px] font-bold bg-amber-900/60 hover:bg-amber-950 text-white px-2.5 py-1 rounded-lg transition border border-amber-300/40"
            >
              I-clear ang Form
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => applyPreset("ELIGIBLE_COMPLETE")}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 border border-emerald-400"
            >
              <span>🟢 1. Kumpleto at Karapat-dapat (Juan Dela Cruz)</span>
            </button>

            <button
              type="button"
              onClick={() => applyPreset("INCOMPLETE_MISSING_ID")}
              className="px-3 py-1.5 bg-amber-900 hover:bg-amber-950 text-amber-100 text-[11px] font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 border border-amber-400"
            >
              <span>🟡 2. May Kakulangang ID at Contact (Maria Santos)</span>
            </button>

            <button
              type="button"
              onClick={() => applyPreset("RESTRICTED_RECENT")}
              className="px-3 py-1.5 bg-rose-800 hover:bg-rose-900 text-rose-100 text-[11px] font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 border border-rose-400"
            >
              <span>🔴 3. 365-Day Restriction Trigger (Recent Payout)</span>
            </button>

            <button
              type="button"
              onClick={() => applyPreset("IP_DUMAGAT")}
              className="px-3 py-1.5 bg-purple-800 hover:bg-purple-900 text-purple-100 text-[11px] font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 border border-purple-400"
            >
              <span>🟣 4. IP Sector (Dumagat-Remontado)</span>
            </button>

            <button
              type="button"
              onClick={() => applyPreset("RANDOM")}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-gov-goldLight text-[11px] font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 border border-slate-700"
            >
              <span>🎲 5. Random Resident Generator</span>
            </button>
          </div>
        </div>

        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-gov-blue via-gov-light to-gov-blue text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-300 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center space-x-4">
              <PesoLogo className="h-14 w-14 flex-shrink-0" size={56} />
              <div className="space-y-1">
                <span className="bg-gov-gold/20 text-gov-goldLight text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-gov-gold/30">
                  LGU Dingalan • DOLE Emergency Employment
                </span>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight">
                  Online TUPAD Application Portal
                </h1>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  Opisyal na pampublikong portal para sa pagpapalista at aplikasyon sa programang TUPAD ng Bayan ng Dingalan.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* SUBMISSION RESULT SLIP MODAL */}
        {/* ----------------------------------------------------------------- */}
        {submissionResult ? (
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-gov-blue p-6 sm:p-8 space-y-6 animate-in zoom-in-95">
            <div className="text-center space-y-2 border-b pb-6">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-inner ${
                  submissionResult.isLackingDetails
                    ? "bg-amber-100 text-amber-600 border-2 border-amber-300"
                    : "bg-emerald-100 text-emerald-600 border-2 border-emerald-300"
                }`}
              >
                {submissionResult.isLackingDetails ? (
                  <AlertTriangle className="w-9 h-9" />
                ) : (
                  <CheckCircle2 className="w-9 h-9" />
                )}
              </div>

              <h2 className="text-2xl font-black text-slate-900">
                {submissionResult.isLackingDetails
                  ? "Aplikasyon ay Naitala (May Kakulangang Dokumento)"
                  : "Matagumpay na Naisumite ang Inyong Aplikasyon!"}
              </h2>

              <div
                className={`p-4 rounded-2xl max-w-xl mx-auto text-xs sm:text-sm font-bold shadow-xs ${
                  submissionResult.isLackingDetails
                    ? "bg-amber-50 text-amber-950 border border-amber-300"
                    : "bg-emerald-50 text-emerald-950 border border-emerald-300"
                }`}
              >
                "{submissionResult.message}"
              </div>
            </div>

            {/* Application Reference Card */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase block">
                  Application Reference Code:
                </span>
                <span className="text-xl font-mono font-black text-gov-blue">
                  {submissionResult.applicationCode}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase block">
                  Aplikante:
                </span>
                <span className="text-base font-black text-slate-800">
                  {submissionResult.applicant?.fullName}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase block">
                  Barangay & Contact:
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  Brgy. {submissionResult.applicant?.barangay} • {submissionResult.applicant?.contactNumber || "Walang Contact"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase block">
                  Petsa ng Pagsumite:
                </span>
                <span className="text-xs font-mono text-slate-700">
                  {new Date(submissionResult.applicant?.submittedAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Lacking Items Warning */}
            {submissionResult.lackingFields && submissionResult.lackingFields.length > 0 && (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                <span className="text-xs font-black text-amber-950 uppercase tracking-wider block flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Mga Kailangang Dalhin sa Tanggapan ng PESO-Dingalan:</span>
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-amber-900">
                  {submissionResult.lackingFields.map((f: string, i: number) => (
                    <li key={i} className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 flex-shrink-0"></span>
                      <span className="font-bold">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Restriction Warning if matched */}
            {submissionResult.restrictionWarning && (
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
                <span className="text-xs font-black uppercase text-gov-gold flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-gov-gold" />
                  <span>365-Day Restriction / Validator Notice</span>
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ang pangalan ay may nakatalang nakaraang TUPAD availment sa ilalim ng ADL No.:{" "}
                  <strong className="text-gov-goldLight font-mono">{submissionResult.restrictionWarning.adlNo}</strong> (Payout: {submissionResult.restrictionWarning.payoutDate}).
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
              <a
                href="/"
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Bumalik sa Homepage
              </a>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4 text-gov-gold" />
                  <span>I-print ang Acknowledgment Slip</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSubmissionResult(null);
                    applyPreset("CLEAR");
                    setStep(1);
                  }}
                  className="px-6 py-2.5 bg-gov-blue hover:bg-gov-light text-white text-xs font-bold rounded-xl shadow transition"
                >
                  Mag-apply Muli
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ----------------------------------------------------------------- */
          /* MULTI-STEP APPLICATION FORM */
          /* ----------------------------------------------------------------- */
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            {/* Step Progress Bar */}
            <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200">
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {[
                  { num: 1, label: "1. Personal Details", icon: User },
                  { num: 2, label: "2. IDs & Sektor", icon: CreditCard },
                  { num: 3, label: "3. Dependent", icon: Users },
                  { num: 4, label: "4. Review & Submit", icon: ShieldCheck },
                ].map(({ num, label, icon: Icon }) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setStep(num)}
                    className={`p-2.5 rounded-xl font-bold transition flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 ${
                      step === num
                        ? "bg-gov-blue text-white shadow-sm"
                        : step > num
                        ? "bg-blue-50 text-gov-blue border border-blue-200"
                        : "bg-white text-slate-400 border border-slate-200"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-[11px] truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* STEP 1: PERSONAL DETAILS */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="border-b pb-2">
                    <h3 className="text-base font-black text-slate-900">
                      Hakbang 1: Impormasyon ng Aplikante (Personal Details)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pakilagay ang buong pangalan at opisyal na tirahan sa Dingalan, Aurora.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Last Name (Apelyido) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value.toUpperCase())}
                        placeholder="DELA CRUZ"
                        className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl uppercase focus:border-gov-blue focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        First Name (Pangalan) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value.toUpperCase())}
                        placeholder="JUAN"
                        className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl uppercase focus:border-gov-blue focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Middle Name (Gitna)
                      </label>
                      <input
                        type="text"
                        value={middleName}
                        onChange={(e) => setMiddleName(e.target.value.toUpperCase())}
                        placeholder="SANTOS"
                        className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl uppercase focus:border-gov-blue focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Ext. Name (JR / SR / III)
                      </label>
                      <input
                        type="text"
                        value={extensionName}
                        onChange={(e) => setExtensionName(e.target.value.toUpperCase())}
                        placeholder="JR"
                        className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl uppercase focus:border-gov-blue focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Birthday / Kaarawan <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:border-gov-blue focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Kasarian (Sex)
                      </label>
                      <select
                        value={sex}
                        onChange={(e) => setSex(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:border-gov-blue focus:outline-none"
                      >
                        <option value="MALE">Male (Lalaki)</option>
                        <option value="FEMALE">Female (Babae)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Civil Status
                      </label>
                      <select
                        value={civilStatus}
                        onChange={(e) => setCivilStatus(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:border-gov-blue focus:outline-none"
                      >
                        <option value="SINGLE">Single</option>
                        <option value="MARRIED">Married</option>
                        <option value="WIDOWED">Widowed</option>
                        <option value="SEPARATED">Separated</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Barangay (Dingalan) <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={barangay}
                        onChange={(e) => setBarangay(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:border-gov-blue focus:outline-none bg-slate-50"
                      >
                        {BARANGAYS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Street / Sitio / Purok
                      </label>
                      <input
                        type="text"
                        value={streetSitio}
                        onChange={(e) => setStreetSitio(e.target.value)}
                        placeholder="Hal. Purok Mulawin"
                        className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:border-gov-blue focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Active Contact / Mobile No. <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        placeholder="09123456789"
                        className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:border-gov-blue focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-6 py-2.5 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5"
                    >
                      <span>Susunod: IDs & Sektor</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: IDS & SOCIO-ECONOMIC SECTOR */}
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="border-b pb-2">
                    <h3 className="text-base font-black text-slate-900">
                      Hakbang 2: Valid ID at Katayuan sa Trabaho (Socio-Economic)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Kailangan ang wastong ID para sa validation at insurance coverage sa ilalim ng DOLE TUPAD.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Valid ID Presented
                      </label>
                      <select
                        value={idPresented}
                        onChange={(e) => setIdPresented(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:border-gov-blue focus:outline-none"
                      >
                        {ID_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Valid ID Number
                      </label>
                      <input
                        type="text"
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value.toUpperCase())}
                        placeholder="Hal. CRN-0111-2222-3333"
                        className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:border-gov-blue focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Kasalukuyang Hanapbuhay / Trabaho
                      </label>
                      <input
                        type="text"
                        value={occupation}
                        onChange={(e) => setOccupation(e.target.value.toUpperCase())}
                        placeholder="Hal. Magsasaka, Mangingisda, Laborer, Self-Employed"
                        className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:border-gov-blue focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Tinatayang Buwanang Kita (Monthly Income)
                      </label>
                      <input
                        type="number"
                        value={monthlyIncome}
                        onChange={(e) => setMonthlyIncome(e.target.value)}
                        placeholder="Hal. 4500"
                        className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:border-gov-blue focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Vulnerability Sector Checkboxes */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                      Katayuan sa Sektor (Vulnerability Categories):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <label className="flex items-center space-x-2 bg-white p-3 rounded-xl border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={is4ps === "Y"}
                          onChange={(e) => setIs4ps(e.target.checked ? "Y" : "N")}
                          className="w-4 h-4 accent-gov-blue rounded"
                        />
                        <span className="font-bold text-slate-800">4Ps Beneficiary (Y/N)</span>
                      </label>

                      <label className="flex items-center space-x-2 bg-white p-3 rounded-xl border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isIp === "Y"}
                          onChange={(e) => setIsIp(e.target.checked ? "Y" : "N")}
                          className="w-4 h-4 accent-gov-blue rounded"
                        />
                        <span className="font-bold text-slate-800">
                          Katutubo / IP (Indigenous Peoples - Dumagat)
                        </span>
                      </label>

                      <label className="flex items-center space-x-2 bg-white p-3 rounded-xl border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSenior}
                          onChange={(e) => setIsSenior(e.target.checked)}
                          className="w-4 h-4 accent-gov-blue rounded"
                        />
                        <span className="font-bold text-slate-800">Senior Citizen (60+ yo)</span>
                      </label>

                      <label className="flex items-center space-x-2 bg-white p-3 rounded-xl border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isPwd}
                          onChange={(e) => setIsPwd(e.target.checked)}
                          className="w-4 h-4 accent-gov-blue rounded"
                        />
                        <span className="font-bold text-slate-800">Person with Disability (PWD)</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-5 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold text-xs rounded-xl transition"
                    >
                      Bumalik
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-6 py-2.5 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5"
                    >
                      <span>Susunod: Dependent</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: DESIGNATED DEPENDENT */}
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="border-b pb-2">
                    <h3 className="text-base font-black text-slate-900">
                      Hakbang 3: Itinalagang Dependent / Next-of-Kin
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pangalan ng kapamilya o legal na dependent para sa opisyal na GSIS / DOLE insurance coverage.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Buong Pangalan ng Dependent <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={dependentFullName}
                        onChange={(e) => setDependentFullName(e.target.value.toUpperCase())}
                        placeholder="MARIA DELA CRUZ"
                        className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl uppercase focus:border-gov-blue focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Edad ng Dependent (Age)
                      </label>
                      <input
                        type="number"
                        value={dependentAge}
                        onChange={(e) => setDependentAge(e.target.value)}
                        placeholder="Hal. 34"
                        className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:border-gov-blue focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Relasyon sa Aplikante (Relationship)
                      </label>
                      <select
                        value={dependentRelationship}
                        onChange={(e) => setDependentRelationship(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:border-gov-blue focus:outline-none"
                      >
                        <option value="SPOUSE">Asawa (Spouse)</option>
                        <option value="CHILD">Anak (Child)</option>
                        <option value="PARENT">Magulang (Parent)</option>
                        <option value="SIBLING">Kapatid (Sibling)</option>
                        <option value="OTHER">Iba pa (Other Relative)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Karagdagang Tala o Remarks
                      </label>
                      <input
                        type="text"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Opsyonal na tala para sa PESO Dingalan"
                        className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:border-gov-blue focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-5 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold text-xs rounded-xl transition"
                    >
                      Bumalik
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="px-6 py-2.5 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5"
                    >
                      <span>Susunod: Review & Submit</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW, CONSENT & SUBMISSION */}
              {step === 4 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="border-b pb-2">
                    <h3 className="text-base font-black text-slate-900">
                      Hakbang 4: Pagsusuri at Kasunduan (Review & Consent)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pakitiyak na tama ang lahat ng impormasyon bago pindutin ang Isumite.
                    </p>
                  </div>

                  {/* Summary Review Card */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">Pangalan</span>
                      <p className="font-black text-slate-900">
                        {lastName}, {firstName} {middleName} {extensionName}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">Tirahan</span>
                      <p className="font-bold text-slate-800">
                        Brgy. {barangay} ({streetSitio || "Centro"})
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">Contact #</span>
                      <p className="font-mono font-bold text-slate-800">{contactNumber || "None"}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">Dependent</span>
                      <p className="font-bold text-slate-800">{dependentFullName || "None"}</p>
                    </div>
                  </div>

                  {/* Terms & Data Privacy Consent */}
                  <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-3">
                    <label className="flex items-start space-x-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        required
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="w-5 h-5 accent-gov-blue rounded mt-0.5"
                      />
                      <div className="text-xs text-slate-800 leading-relaxed font-medium">
                        <strong className="block text-gov-blue font-bold">
                          KAPAYAGAN AT DEKLARASYON (Data Privacy Act of 2012 & DOLE Compliance):
                        </strong>
                        Pinatutunayan ko na totoo at wasto ang lahat ng impormasyong aking inilagay sa aplikasyong ito. Pinapahintulutan ko ang Tanggapan ng PESO Dingalan at Kagawaran ng Paggawa at Empleo (DOLE) na iproseso ang aking impormasyon para sa pagpili, pag-insure, at monitoring ng programang TUPAD.
                      </div>
                    </label>
                  </div>

                  {error && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-5 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold text-xs rounded-xl transition"
                    >
                      Bumalik
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-3 bg-gov-blue hover:bg-gov-light text-white font-black text-xs rounded-xl shadow-lg transition flex items-center space-x-2 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4 text-gov-gold" />
                      <span>{loading ? "Isinusumite sa PESO..." : "Isumite ang Aplikasyon sa TUPAD"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
