"use client";

import React, { useState } from "react";
import { Search, ShieldCheck, ShieldAlert, CheckCircle2, XCircle, ArrowLeft, RefreshCw } from "lucide-react";

export default function EligibilityCheckerPage() {
  const [fullName, setFullName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !birthday) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/v1/restrictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, birthday }),
      });

      const data = await res.json();
      setResult(data);
    } catch (e) {
      alert("Failed to check eligibility");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center justify-center space-x-2">
          <Search className="w-6 h-6 text-gov-blue" />
          <span>Real-Time TUPAD Eligibility Checker</span>
        </h1>
        <p className="text-xs text-slate-500">
          Verify individual eligibility against the national 365-day TUPAD restriction registry
        </p>
      </div>

      {/* Query Form */}
      <form onSubmit={handleCheck} className="gov-card p-6 space-y-4 shadow-xl border-t-4 border-t-gov-blue">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Applicant Full Name (Last Name, First Name Middle Name) *
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. DELA CRUZ, JUAN M."
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold focus:outline-none focus:border-gov-blue bg-slate-50"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Date of Birth (YYYY-MM-DD) *
          </label>
          <input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-gov-blue bg-slate-50"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gov-blue hover:bg-gov-light text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2 transition disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Verifying Registry...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 text-gov-goldLight" />
              <span>Check Eligibility Status</span>
            </>
          )}
        </button>
      </form>

      {/* Result Card */}
      {result && (
        <div
          className={`gov-card p-6 text-center space-y-4 shadow-xl border-t-4 ${
            result.eligible ? "border-t-emerald-600" : "border-t-rose-600"
          }`}
        >
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
              result.eligible ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            }`}
          >
            {result.eligible ? <CheckCircle2 className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
          </div>

          <div className="space-y-1">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                result.eligible ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {result.eligible ? "✓ ELIGIBLE FOR ENROLLMENT" : "✕ RESTRICTED BENEFICIARY"}
            </span>
            <h2 className="text-base font-black text-slate-900">{fullName.toUpperCase()}</h2>
            <p className="text-xs text-slate-500">{result.message || result.reason}</p>
          </div>

          {!result.eligible && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1 text-rose-900 font-medium text-left">
              <p><strong>Lockout Reason:</strong> {result.reason}</p>
              <p><strong>Eligible for Next Payout On:</strong> <span className="font-bold text-rose-700">{result.restrictionEnd}</span></p>
              {result.programName && <p><strong>Source Program:</strong> {result.programName}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
