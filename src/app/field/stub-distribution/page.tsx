"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  QrCode,
  ShieldCheck,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Camera,
  RefreshCw,
  KeyRound,
  Users,
  AlertTriangle,
  UserX,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  BarChart3,
  Check,
  TrendingUp,
  Clock,
  ArrowRight,
} from "lucide-react";
import { QrScannerModal } from "@/components/scanner/QrScannerModal";
import { useOffline } from "@/context/OfflineContext";
import { offlineDb, queueOfflineTransaction } from "@/lib/dexie";
import { formatDate, normalizeBarangayName } from "@/lib/utils";

export default function StubDistributionPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Stub Distribution & Monitoring...</div>}>
      <StubDistributionContent />
    </React.Suspense>
  );
}

function StubDistributionContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "monitoring" ? "monitoring" : "scanner";
  const { isOnline } = useOffline();

  const [activeTab, setActiveTab] = useState<"scanner" | "monitoring">(initialTab);
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");

  // Scanner States
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedData, setScannedData] = useState<any | null>(null);
  const [birthdayPin, setBirthdayPin] = useState("");
  const [isFlaggingModalOpen, setIsFlaggingModalOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("UNREACHABLE_PHONE_OR_RESIDENCE");
  const [flagRemarks, setFlagRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // Monitoring States
  const [monitoringData, setMonitoringData] = useState<any | null>(null);
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterFilter, setRosterFilter] = useState("ALL");
  const [selectedBarangayFilter, setSelectedBarangayFilter] = useState("ALL");

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (selectedProgramId) {
      fetchMonitoringData(selectedProgramId);
    }
  }, [selectedProgramId]);

  const fetchPrograms = async () => {
    try {
      const res = await fetch("/api/v1/programs");
      if (res.ok) {
        const data = await res.json();
        const progs = data.programs || [];
        setPrograms(progs);
        if (progs.length > 0 && !selectedProgramId) {
          setSelectedProgramId(progs[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMonitoringData = async (progId: string) => {
    setMonitoringLoading(true);
    try {
      const res = await fetch(`/api/v1/stub-distribution/monitoring?programId=${progId}`);
      if (res.ok) {
        const data = await res.json();
        setMonitoringData(data);
      }
    } catch (e) {
      console.error("Fetch monitoring error:", e);
    } finally {
      setMonitoringLoading(false);
    }
  };

  // 1. Scan Handler
  const handleScan = async (token: string) => {
    setScannerOpen(false);
    setLoading(true);
    setError(null);
    setSuccessResult(null);

    try {
      if (isOnline) {
        const res = await fetch("/api/v1/stub-distribution/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrToken: token }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Invalid QR Stub");

        setScannedData(data.data);
      } else {
        const bene = await offlineDb.cachedBeneficiaries.where("qrToken").equals(token).first();
        if (!bene) throw new Error("QR Stub not found in offline database cache");

        setScannedData({
          qrId: "offline_qr",
          programBeneficiaryId: bene.id,
          designatedNumber: bene.designatedNumber,
          fullName: bene.fullName,
          barangay: bene.barangay,
          sitio: bene.sitio,
          tableNumber: bene.tableNumber,
          programName: "Cached TUPAD Program",
          isDistributed: false,
          offlineExpectedPin: bene.birthdayPin,
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Birthday Affirmation Handler
  const handleVerifyBirthday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedData || !birthdayPin) return;

    setLoading(true);
    setError(null);

    try {
      let geoLat = 15.3941;
      let geoLong = 121.3965;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            geoLat = pos.coords.latitude;
            geoLong = pos.coords.longitude;
          },
          () => {}
        );
      }

      if (isOnline) {
        const res = await fetch("/api/v1/stub-distribution/verify-birthday", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qrId: scannedData.qrId,
            programBeneficiaryId: scannedData.programBeneficiaryId,
            birthdayPin: birthdayPin.trim(),
            latitude: geoLat,
            longitude: geoLong,
            deviceId: localStorage.getItem("tupad_device_id") || "MOBILE_DEVICE",
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Verification failed");

        setSuccessResult({
          message: "✓ Beneficiary Birthday Confirmed! Stub verified as officially distributed & orientation attendance affirmed.",
          data: data.data,
          isOffline: false,
        });
      } else {
        const cleanedEntered = birthdayPin.trim().replace(/\//g, "-");
        if (scannedData.offlineExpectedPin !== cleanedEntered) {
          throw new Error("Incorrect Birthday PIN (Offline Check)");
        }

        await queueOfflineTransaction("STUB_DISTRIBUTION", "CREATE", {
          qrId: scannedData.qrId,
          programBeneficiaryId: scannedData.programBeneficiaryId,
          birthdayPin: cleanedEntered,
          latitude: geoLat,
          longitude: geoLong,
        });

        setSuccessResult({
          message: "✓ Verified & Saved Offline (Queued for Sync)",
          data: scannedData,
          isOffline: true,
        });
      }

      // Refresh monitoring data
      if (selectedProgramId) fetchMonitoringData(selectedProgramId);

      setScannedData(null);
      setBirthdayPin("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Flag as Possible Replacement Handler
  const handleFlagReplacement = async () => {
    if (!scannedData) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/stub-distribution/flag-replacement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programBeneficiaryId: scannedData.programBeneficiaryId,
          reason: flagReason,
          remarks: flagRemarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to flag replacement");

      setIsFlaggingModalOpen(false);
      setSuccessResult({
        message: `Flagged as Possible Onsite Replacement (${flagReason}). Recorded for PESO audit.`,
        data: data.data,
        isFlagged: true,
      });

      setScannedData(null);
      setBirthdayPin("");
      if (selectedProgramId) fetchMonitoringData(selectedProgramId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // CSV Exporter for Distribution Report
  const handleExportCsv = () => {
    if (!monitoringData || !monitoringData.beneficiaries) return;

    const headers = [
      "Designated No.",
      "Beneficiary Name",
      "Barangay",
      "Table Assignment",
      "Contact Number",
      "Distribution Status",
      "Verified At",
      "Verified By",
      "Remarks",
    ];

    const rows = monitoringData.beneficiaries.map((b: any) => [
      `#${b.designatedNumber}`,
      `"${b.fullName}"`,
      `"${b.barangay}"`,
      b.tableNumber,
      `"${b.contactNumber}"`,
      b.status,
      b.distributedAt ? new Date(b.distributedAt).toLocaleString() : "PENDING",
      `"${b.distributedBy || "N/A"}"`,
      `"${b.remarks || ""}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Stub_Distribution_Monitoring_${monitoringData.program?.programCode || "Report"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRoster = (monitoringData?.beneficiaries || []).filter((b: any) => {
    const matchesSearch =
      b.fullName.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      String(b.designatedNumber).includes(rosterSearch);

    const matchesStatus =
      rosterFilter === "ALL"
        ? true
        : rosterFilter === "CONFIRMED"
        ? b.status === "CONFIRMED"
        : rosterFilter === "PENDING"
        ? b.status === "PENDING"
        : b.status === "FLAGGED_REPLACEMENT";

    const matchesBarangay =
      selectedBarangayFilter === "ALL" ||
      normalizeBarangayName(b.barangay).toLowerCase() === normalizeBarangayName(selectedBarangayFilter).toLowerCase();

    return matchesSearch && matchesStatus && matchesBarangay;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <QrCode className="w-6 h-6 text-gov-blue" />
            <span>Stub Distribution & Informed Beneficiary Monitoring</span>
          </h1>
          <p className="text-xs text-slate-500">
            Scan Format 1 printed stubs, verify beneficiary Birthday PIN affirmation, and monitor coordinator field coverage
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-200 p-1 rounded-xl space-x-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("scanner")}
            className={`px-4 py-2 rounded-lg text-xs font-black transition flex items-center space-x-1.5 ${
              activeTab === "scanner"
                ? "bg-gov-blue text-white shadow"
                : "text-slate-700 hover:text-slate-900"
            }`}
          >
            <Camera className="w-4 h-4 text-gov-goldLight" />
            <span>Field Scanner</span>
          </button>
          <button
            onClick={() => setActiveTab("monitoring")}
            className={`px-4 py-2 rounded-lg text-xs font-black transition flex items-center space-x-1.5 ${
              activeTab === "monitoring"
                ? "bg-gov-blue text-white shadow"
                : "text-slate-700 hover:text-slate-900"
            }`}
          >
            <BarChart3 className="w-4 h-4 text-gov-goldLight" />
            <span>Coverage Monitoring</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: MOBILE SCANNER & BIRTHDAY PIN AFFIRMATION
          ========================================================================= */}
      {activeTab === "scanner" && (
        <div className="max-w-md mx-auto space-y-6">
          {/* Primary Big Scan Button */}
          {!scannedData && !successResult && (
            <div className="gov-card p-8 text-center space-y-6 shadow-xl border-t-4 border-t-gov-blue">
              <div className="w-24 h-24 rounded-full bg-blue-50 text-gov-blue flex items-center justify-center mx-auto border-4 border-blue-100 shadow-inner">
                <QrCode className="w-12 h-12" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">Ready for Stub Distribution</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Scan the Format 1 printed verification stub in front of the beneficiary to record affirmation and proof of receipt.
                </p>
              </div>

              <button
                onClick={() => setScannerOpen(true)}
                className="w-full py-3.5 bg-gov-blue hover:bg-gov-light text-white font-extrabold text-sm rounded-xl shadow-lg flex items-center justify-center space-x-2 transition transform active:scale-95"
              >
                <Camera className="w-5 h-5 text-gov-goldLight" />
                <span>SCAN FORMAT 1 STUB QR</span>
              </button>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-xs text-red-700 shadow">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
              <div className="space-y-1">
                <strong className="block font-bold">Verification Notice</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Scanned Beneficiary & Birthday PIN Affirmation Form */}
          {scannedData && (
            <form onSubmit={handleVerifyBirthday} className="gov-card p-6 space-y-5 shadow-xl border-t-4 border-t-gov-gold">
              <div className="text-center space-y-1 pb-3 border-b border-slate-100">
                <span className="text-[10px] font-black font-mono text-gov-blue uppercase bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  DESIGNATED #{scannedData.designatedNumber} • {scannedData.tableNumber || "Table 1"}
                </span>
                <h2 className="text-lg font-black text-slate-900">{scannedData.fullName}</h2>
                <p className="text-xs text-slate-500">
                  Barangay {scannedData.barangay}, Municipality of Dingalan
                </p>
              </div>

              {scannedData.isFlagged && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1.5 shadow-xs">
                  <div className="flex items-center space-x-1.5 font-black text-rose-700">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>CURRENTLY FLAGGED FOR ONSITE REPLACEMENT</span>
                  </div>
                  {scannedData.remarks && (
                    <div className="text-[11px] text-rose-800 bg-white/90 p-2 rounded-lg border border-rose-200">
                      <strong className="block text-[10px] font-bold uppercase text-rose-600 mb-0.5">Recorded Flag Reason & Remarks:</strong>
                      <span>{scannedData.remarks}</span>
                    </div>
                  )}
                  {scannedData.flaggedBy && (
                    <p className="text-[10px] text-rose-600 italic">
                      Flagged by {scannedData.flaggedBy} {scannedData.flaggedAt ? `on ${new Date(scannedData.flaggedAt).toLocaleDateString()}` : ""}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Enter Beneficiary Birthday PIN *</span>
                  <span className="text-[10px] text-slate-400 font-mono">MM-DD-YYYY</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={birthdayPin}
                    onChange={(e) => {
                      let val = e.target.value.replace(/[^0-9]/g, "");
                      if (val.length > 2 && val.length <= 4) {
                        val = `${val.slice(0, 2)}-${val.slice(2)}`;
                      } else if (val.length > 4) {
                        val = `${val.slice(0, 2)}-${val.slice(2, 4)}-${val.slice(4, 8)}`;
                      }
                      setBirthdayPin(val);
                    }}
                    placeholder="MM-DD-YYYY (e.g. 08-15-1987)"
                    maxLength={10}
                    className="w-full pl-9 pr-3 py-2.5 text-sm font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-gov-blue bg-slate-50"
                    autoFocus
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1 italic">
                  Ask beneficiary for their Month-Day-Year of birth as proof of identity and confirmation of orientation attendance.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={loading || birthdayPin.length < 8}
                  className="w-full py-3 bg-gov-blue hover:bg-gov-light text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-gov-goldLight" />}
                  <span>{loading ? "Verifying PIN..." : "Confirm Stub Receipt & Orientation Attendance"}</span>
                </button>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setScannedData(null)}
                    className="flex-1 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border rounded-lg"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsFlaggingModalOpen(true)}
                    className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg border border-rose-200 flex items-center justify-center space-x-1"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Flag Replacement</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Success Feedback View */}
          {successResult && (
            <div className={`gov-card p-6 text-center space-y-4 shadow-xl border-t-4 ${
              successResult.isFlagged ? "border-t-rose-600" : "border-t-emerald-600"
            }`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                successResult.isFlagged ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
              }`}>
                {successResult.isFlagged ? <AlertTriangle className="w-9 h-9" /> : <CheckCircle2 className="w-9 h-9" />}
              </div>

              <div className="space-y-1">
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  successResult.isFlagged ? "text-rose-700" : "text-emerald-700"
                }`}>
                  {successResult.isFlagged ? "FLAGGED FOR ONSITE REPLACEMENT" : "✓ AFFIRMED & DISTRIBUTED"}
                </span>
                <h2 className="text-base font-black text-slate-900">
                  {successResult.data?.fullName} (#{successResult.data?.designatedNumber})
                </h2>
                <p className="text-xs text-slate-600">{successResult.message}</p>
              </div>

              <button
                onClick={() => {
                  setSuccessResult(null);
                  setScannerOpen(true);
                }}
                className="w-full py-3 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow transition"
              >
                Scan Next Beneficiary Stub
              </button>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: COVERAGE MONITORING DASHBOARD & BARANGAY PROGRESS MATRIX
          ========================================================================= */}
      {activeTab === "monitoring" && (
        <div className="space-y-6">
          {/* Program Filter Bar & Exporter */}
          <div className="gov-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Program:</span>
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                className="px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue w-full sm:w-80"
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.programCode} — {p.programName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => selectedProgramId && fetchMonitoringData(selectedProgramId)}
                className="px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 border rounded-lg bg-white flex items-center space-x-1.5"
                title="Refresh Metrics"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${monitoringLoading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow flex items-center space-x-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Distribution Report (.CSV)</span>
              </button>
            </div>
          </div>

          {/* 4 KPI Summary Cards */}
          {monitoringData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Card 1: Total Enrolled */}
              <div className="gov-card p-4 border-l-4 border-l-gov-blue space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Target Beneficiaries
                </span>
                <div className="text-2xl font-black text-slate-900">
                  {monitoringData.summary.totalBeneficiaries}
                </div>
                <p className="text-[11px] text-slate-500">100% Enrolled Roster</p>
              </div>

              {/* Card 2: Distributed & Confirmed */}
              <div className="gov-card p-4 border-l-4 border-l-emerald-600 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Stubs Confirmed & Distributed
                </span>
                <div className="text-2xl font-black text-emerald-700 flex items-baseline space-x-1.5">
                  <span>{monitoringData.summary.totalConfirmed}</span>
                  <span className="text-xs font-bold text-slate-500">
                    ({monitoringData.summary.confirmationRate}%)
                  </span>
                </div>
                <p className="text-[11px] text-emerald-600 font-semibold">Birthday PIN Verified</p>
              </div>

              {/* Card 3: Pending / Uninformed */}
              <div className="gov-card p-4 border-l-4 border-l-amber-500 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  Pending / Uninformed
                </span>
                <div className="text-2xl font-black text-amber-700">
                  {monitoringData.summary.totalPending}
                </div>
                <p className="text-[11px] text-amber-600">Awaiting field distribution</p>
              </div>

              {/* Card 4: Flagged for Replacement */}
              <div className="gov-card p-4 border-l-4 border-l-rose-600 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                  Flagged for Replacement
                </span>
                <div className="text-2xl font-black text-rose-700">
                  {monitoringData.summary.totalFlaggedReplacement}
                </div>
                <p className="text-[11px] text-rose-600">Unreachable / Candidate subs</p>
              </div>
            </div>
          )}

          {/* Barangay Distribution Progress Matrix */}
          <div className="gov-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gov-blue" />
                  <span>Barangay Stub Distribution & Coverage Matrix</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time status of whether TUPAD coordinators have reached and informed beneficiaries per barangay
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b bg-slate-50 text-slate-600 font-bold">
                    <th className="py-2.5 px-3">Barangay</th>
                    <th className="py-2.5 px-3 text-center">Target</th>
                    <th className="py-2.5 px-3 text-center">Confirmed</th>
                    <th className="py-2.5 px-3 text-center">Pending (Uninformed)</th>
                    <th className="py-2.5 px-3 text-center">Flagged Replacement</th>
                    <th className="py-2.5 px-3">Progress</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(monitoringData?.barangays || []).map((brgy: any) => (
                    <tr key={brgy.barangayName} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-extrabold text-slate-900">
                        {brgy.barangayName}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold">{brgy.total}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">
                        {brgy.confirmed}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-amber-700">
                        {brgy.pending}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-rose-700">
                        {brgy.flaggedReplacement}
                      </td>
                      <td className="py-3 px-3 w-48">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-slate-600">
                            <span>{brgy.completionPercentage}%</span>
                            <span>{brgy.confirmed}/{brgy.total}</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                brgy.completionPercentage === 100
                                  ? "bg-emerald-600"
                                  : brgy.completionPercentage >= 50
                                  ? "bg-gov-blue"
                                  : brgy.completionPercentage > 0
                                  ? "bg-amber-500"
                                  : "bg-slate-300"
                              }`}
                              style={{ width: `${brgy.completionPercentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            brgy.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : brgy.status === "IN_PROGRESS"
                              ? "bg-blue-100 text-blue-800 border border-blue-300"
                              : brgy.status === "LAGGING"
                              ? "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {brgy.status === "COMPLETED"
                            ? "✓ 100% Completed"
                            : brgy.status === "IN_PROGRESS"
                            ? "Ongoing"
                            : brgy.status === "LAGGING"
                            ? "Lagging Coverage"
                            : "Not Started"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Searchable Beneficiary Roster Tab */}
          <div className="gov-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center space-x-2">
                <Users className="w-4 h-4 text-gov-blue" />
                <span>Beneficiary Verification & Informed Status Roster ({filteredRoster.length})</span>
              </h3>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    placeholder="Search name or #..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs border rounded-lg bg-slate-50 focus:bg-white"
                  />
                </div>

                <select
                  value={rosterFilter}
                  onChange={(e) => setRosterFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-bold border rounded-lg bg-slate-50"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="CONFIRMED">Confirmed & Distributed</option>
                  <option value="PENDING">Pending (Uninformed)</option>
                  <option value="FLAGGED_REPLACEMENT">Flagged Replacement</option>
                </select>

                <select
                  value={selectedBarangayFilter}
                  onChange={(e) => setSelectedBarangayFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-bold border rounded-lg bg-slate-50"
                >
                  <option value="ALL">All Barangays</option>
                  {[
                    "Aplaya", "Butas na Bato", "Caragsacan", "Davildavilan",
                    "Dikapanikian", "Ibona", "Matawe", "Paltic",
                    "Poblacion", "Tanawan", "Umiray"
                  ].map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b bg-slate-50 text-slate-600 font-bold">
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Beneficiary Full Name</th>
                    <th className="py-2 px-3">Barangay</th>
                    <th className="py-2 px-3">Table</th>
                    <th className="py-2 px-3">Contact Number</th>
                    <th className="py-2 px-3">Distribution Status</th>
                    <th className="py-2 px-3">Remarks / Flag Reason</th>
                    <th className="py-2 px-3">Verified By</th>
                    <th className="py-2 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredRoster.map((b: any) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-mono font-black text-gov-blue">
                        #{b.designatedNumber}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{b.fullName}</td>
                      <td className="py-2.5 px-3 text-slate-600">{b.barangay}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{b.tableNumber}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{b.contactNumber}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            b.status === "CONFIRMED"
                              ? "bg-emerald-100 text-emerald-800"
                              : b.status === "FLAGGED_REPLACEMENT"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {b.status === "CONFIRMED"
                            ? "✓ Confirmed"
                            : b.status === "FLAGGED_REPLACEMENT"
                            ? "⚠ Flagged Replacement"
                            : "Pending (Uninformed)"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {b.status === "FLAGGED_REPLACEMENT" ? (
                          <div className="flex items-start space-x-1 max-w-xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                            <span className="text-[11px] font-bold text-rose-700 line-clamp-2" title={b.remarks || "Flagged for replacement"}>
                              {b.remarks || "Flagged for onsite replacement"}
                            </span>
                          </div>
                        ) : b.remarks ? (
                          <span className="text-[11px] text-slate-600 truncate block max-w-xs" title={b.remarks}>
                            {b.remarks}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-500">
                        {b.distributedBy ? (
                          <span>
                            {b.distributedBy} • {new Date(b.distributedAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not yet verified</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {b.status === "FLAGGED_REPLACEMENT" ? (
                          <Link
                            href={`/replacements?programId=${selectedProgramId}&originalPbId=${b.id}`}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg shadow-sm transition whitespace-nowrap"
                          >
                            <span>Process Replacement</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="text-[10px] text-slate-300 font-mono">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Flag Replacement Modal */}
      {isFlaggingModalOpen && scannedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-rose-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center space-x-2 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-sm font-black text-slate-900">
                Flag as Possible Onsite Replacement
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              Flag <strong>{scannedData.fullName} (#{scannedData.designatedNumber})</strong> if the beneficiary cannot be contacted, refuses the slot, or cannot attend.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Replacement Flag *</label>
                <select
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  className="w-full p-2 border rounded-lg font-bold bg-slate-50"
                >
                  <option value="UNREACHABLE_PHONE_OR_RESIDENCE">Unreachable (Phone uncontactable / not in residence)</option>
                  <option value="MOVED_OUT_OF_TOWN">Relocated / Moved out of Dingalan</option>
                  <option value="REFUSED_EMPLOYMENT">Declined / Not interested in 10-day work program</option>
                  <option value="MEDICAL_UNFIT">Medically unfit / Hospitalized</option>
                  <option value="EMPLOYED_ELSEWHERE">Currently regularly employed elsewhere</option>
                  <option value="OTHER">Other specific reason</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Coordinator Remarks (Optional)</label>
                <textarea
                  rows={2}
                  value={flagRemarks}
                  onChange={(e) => setFlagRemarks(e.target.value)}
                  placeholder="e.g. Visited Sitio 3 times, neighbor stated relocated to Manila..."
                  className="w-full p-2 border rounded-lg bg-slate-50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsFlaggingModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFlagReplacement}
                disabled={loading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow transition"
              >
                {loading ? "Flagging..." : "Confirm Flag as Replacement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scanner Modal */}
      <QrScannerModal
        isOpen={scannerOpen}
        onScan={handleScan}
        onClose={() => setScannerOpen(false)}
        title="Scan Format 1 Stub QR Code"
        subtitle="Align printed verification stub QR in camera viewfinder"
      />
    </div>
  );
}
