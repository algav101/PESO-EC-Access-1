"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RefreshCw,
  UploadCloud,
  Download,
  FileSpreadsheet,
  Building,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Info,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function EligibilityCheckerPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "PESO_ADMIN";

  // Form Fields
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [extensionName, setExtensionName] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  // Live suggestions state
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);

  // Upload Modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Debounced suggestion fetcher
  useEffect(() => {
    const combinedQuery = `${lastName} ${firstName} ${middleName}`.trim();
    if (combinedQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setFetchingSuggestions(true);
      try {
        const res = await fetch(
          `/api/v1/restrictions?suggestions=1&q=${encodeURIComponent(combinedQuery)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setShowSuggestions((data.suggestions || []).length > 0);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setFetchingSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [firstName, middleName, lastName]);

  // Click outside listener for suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (item: any) => {
    setLastName(item.lastName || "");
    setFirstName(item.firstName || "");
    setMiddleName(item.middleName || "");
    setExtensionName(item.extensionName || "");
    setShowSuggestions(false);

    // Immediately trigger check
    executeCheck({
      firstName: item.firstName,
      middleName: item.middleName,
      lastName: item.lastName,
      extensionName: item.extensionName,
      fullName: item.fullName,
    });
  };

  const executeCheck = async (params: {
    firstName: string;
    middleName: string;
    lastName: string;
    extensionName: string;
    fullName?: string;
  }) => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/v1/restrictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        alert(data.error || "Failed to verify eligibility");
      }
    } catch (e) {
      alert("Error checking eligibility");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName && !lastName) {
      alert("Please enter at least a First Name or Last Name.");
      return;
    }

    setShowSuggestions(false);
    executeCheck({
      firstName,
      middleName,
      lastName,
      extensionName,
    });
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadMessage(null);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);

      const res = await fetch("/api/v1/restrictions/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setUploadSuccess(true);
        setUploadMessage(`✓ ${data.message}`);
        setUploadFile(null);
        setTimeout(() => {
          setIsUploadOpen(false);
          setUploadMessage(null);
          setUploadSuccess(false);
        }, 2200);
      } else {
        alert(data.error || "Upload failed");
      }
    } catch (e) {
      alert("Error uploading reference template");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Back to Landing Page */}
      <div className="flex items-center justify-between">
        <a
          href="/"
          className="text-xs font-bold text-slate-600 hover:text-gov-blue flex items-center space-x-1.5 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Bumalik sa Landing Page</span>
        </a>

        <a
          href="/apply"
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Online Application Portal</span>
        </a>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Search className="w-6 h-6 text-gov-blue" />
            <span>TUPAD 320-Day & Appointive Eligibility Checker</span>
          </h1>
          <p className="text-xs text-slate-500">
            Real-time validation against the 320-day payout interval rule & Barangay Appointive Personnel registry
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/v1/restrictions/template"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 border border-slate-300 shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Template (.XLSX)</span>
          </a>

          {isAdmin && (
            <button
              onClick={() => {
                setIsUploadOpen(true);
                setUploadMessage(null);
                setUploadSuccess(false);
              }}
              className="px-4 py-2 bg-gov-blue hover:bg-gov-dark text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow"
            >
              <UploadCloud className="w-4 h-4 text-gov-goldLight" />
              <span>Upload Reference List</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Query Card */}
      <div className="gov-card p-6 shadow-xl border-t-4 border-t-gov-blue relative space-y-5 bg-white">
        <div className="flex items-center justify-between border-b pb-3">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
            <User className="w-4 h-4 text-gov-blue" />
            <span>Beneficiary Inquiring Information</span>
          </span>
          <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded">
            No Birthday Required
          </span>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 relative" ref={suggestionsRef}>
            {/* Last Name */}
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Last Name (Apelyido) *
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. ALCANTARA"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold uppercase focus:outline-none focus:border-gov-blue bg-slate-50"
                required
              />
            </div>

            {/* First Name */}
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                First Name (Pangalan) *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. VILMA"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold uppercase focus:outline-none focus:border-gov-blue bg-slate-50"
                required
              />
            </div>

            {/* Middle Name */}
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Middle Name (Gitna)
              </label>
              <input
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="e.g. SANTILESES"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold uppercase focus:outline-none focus:border-gov-blue bg-slate-50"
              />
            </div>

            {/* Extension */}
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Ext.
              </label>
              <input
                type="text"
                value={extensionName}
                onChange={(e) => setExtensionName(e.target.value)}
                placeholder="JR."
                className="w-full px-2 py-2 text-xs border border-slate-300 rounded-lg font-bold uppercase text-center focus:outline-none focus:border-gov-blue bg-slate-50"
              />
            </div>

            {/* Live Name Suggestions Dropdown (≥ 5 Items) */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-slate-300 rounded-xl shadow-2xl overflow-hidden animate-fadeIn">
                <div className="p-2 bg-slate-100 border-b flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span className="flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-gov-gold" />
                    <span>Matching Beneficiaries in Disqualification Database ({suggestions.length} Found)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSuggestions(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {suggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className="w-full text-left p-3 hover:bg-blue-50/70 transition flex items-center justify-between group"
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs font-extrabold text-slate-900 group-hover:text-gov-blue">
                          {item.fullName}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 font-mono text-slate-700">
                            {item.adlNo}
                          </span>
                          <span>• 📍 {item.barangay}, {item.municipality}</span>
                          {item.payoutDate && <span>• Payout: {item.payoutDate}</span>}
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-gov-blue group-hover:translate-x-0.5 transition flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gov-blue hover:bg-gov-dark text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-gov-goldLight" />
                  <span>Checking 320-Day Lockout & Registry...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-gov-goldLight" />
                  <span>Verify Eligibility Status</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Return Data Display Card */}
      {result && (
        <div
          className={`gov-card p-6 shadow-2xl border-t-4 animate-fadeIn space-y-5 ${
            result.disqualified ? "border-t-rose-600 bg-white" : "border-t-emerald-600 bg-white"
          }`}
        >
          {/* Top Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div className="flex items-center space-x-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner flex-shrink-0 ${
                  result.disqualified
                    ? "bg-rose-100 text-rose-700 border border-rose-200"
                    : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                }`}
              >
                {result.disqualified ? (
                  <XCircle className="w-7 h-7" />
                ) : (
                  <CheckCircle2 className="w-7 h-7" />
                )}
              </div>

              <div>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    result.disqualified
                      ? "bg-rose-100 text-rose-800 border border-rose-300"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  }`}
                >
                  {result.disqualified ? "✕ DISQUALIFIED / NOT ELIGIBLE" : "✓ ELIGIBLE FOR ENROLLMENT"}
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-0.5">{result.name}</h2>
              </div>
            </div>

            <div className="text-right sm:self-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Verification Date:</span>
              <p className="text-xs font-mono font-bold text-slate-700">{result.presentDate || "Present Date"}</p>
            </div>
          </div>

          {/* Detailed Verification Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Work Duration Date */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>Work Duration Date</span>
              </span>
              <p className="font-extrabold text-slate-800">{result.workDurationDate || "N/A"}</p>
            </div>

            {/* Payout Date */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center space-x-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>Payout Date</span>
              </span>
              <p className="font-extrabold text-slate-800">{result.payoutDate || "N/A"}</p>
            </div>

            {/* ADL No. or Barangay Appointive Position */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center space-x-1">
                <FileSpreadsheet className="w-3 h-3 text-slate-500" />
                <span>ADL No. / Position</span>
              </span>
              <p className="font-extrabold text-gov-blue truncate" title={result.adlNo}>
                {result.adlNo || "Clean"}
              </p>
            </div>

            {/* Barangay & Municipality */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center space-x-1">
                <Building className="w-3 h-3 text-slate-500" />
                <span>Barangay & City</span>
              </span>
              <p className="font-extrabold text-slate-800">
                {result.barangay}, {result.municipality}
              </p>
            </div>
          </div>

          {/* Exact Reason & Statutory Lockout Box */}
          <div
            className={`p-4 rounded-xl text-xs space-y-2 border ${
              result.disqualified
                ? "bg-rose-50/80 border-rose-200 text-rose-950"
                : "bg-emerald-50/80 border-emerald-200 text-emerald-950"
            }`}
          >
            <div className="flex items-center space-x-2 font-black uppercase text-[11px] tracking-wide">
              {result.disqualified ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-700 flex-shrink-0" />
                  <span className="text-rose-800">Disqualification Findings & DOLE Statutory Rule:</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  <span className="text-emerald-800">Eligibility Clearance:</span>
                </>
              )}
            </div>

            <p className="text-xs leading-relaxed font-semibold">
              {result.reason}
            </p>

            {result.disqualified && result.daysRemaining > 0 && (
              <div className="pt-2 border-t border-rose-200/80 grid grid-cols-2 gap-2 text-[11px] font-bold">
                <div>
                  <span className="text-slate-500 block">Days Elapsed Since Payout:</span>
                  <span className="font-mono text-slate-900">{result.daysElapsed} Days</span>
                </div>
                <div>
                  <span className="text-rose-700 block">Eligible for Next Availment On:</span>
                  <span className="font-mono text-rose-700">{result.eligibilityDate} ({result.daysRemaining} days left)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* High-Speed Upload Reference Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Fast Upload Reference File (Disqualified Masterlist)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1 text-blue-950">
              <p className="font-bold flex items-center space-x-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700" />
                <span>Required 7-Column Excel Layout:</span>
              </p>
              <p className="text-[11px] text-blue-900 font-mono leading-tight">
                [A] NAME OF BENEFICIARIES • [B] ADL NO. • [C] ORIENTATION DATE • [D] WORK DATE • [E] PAYOUT DATE • [F] Barangay • [G] City/ Municipality
              </p>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Choose Excel Workbook (.XLSX / .CSV) *
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setUploadFile(f);
                    setUploadMessage(null);
                  }}
                  className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gov-blue file:text-white hover:file:bg-gov-dark cursor-pointer border rounded-xl p-2 bg-slate-50"
                  required
                />
              </div>

              {uploading && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold flex items-center space-x-2 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-600 flex-shrink-0" />
                  <span>⚡ Fast Importing & Syncing Records to Database...</span>
                </div>
              )}

              {uploadMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                    uploadSuccess
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border border-rose-200 text-rose-800"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{uploadMessage}</span>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 text-xs font-bold border rounded-lg hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="px-4 py-2 bg-gov-blue hover:bg-gov-dark text-white font-bold text-xs rounded-lg shadow disabled:opacity-50 flex items-center space-x-1.5 transition"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{uploading ? "Importing Records..." : "Upload & Sync Database"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
