"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CalendarCheck,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Camera,
  Users,
  UserPlus,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Check,
  Layers,
  MapPin,
  Calendar,
  XCircle,
  FileCheck,
} from "lucide-react";
import { QrScannerModal } from "@/components/scanner/QrScannerModal";
import { FieldQrPassGeneratorModal } from "@/components/field/FieldQrPassGeneratorCard";
import { useOffline } from "@/context/OfflineContext";
import { offlineDb, queueOfflineTransaction } from "@/lib/dexie";
import { formatDate, normalizeBarangayName } from "@/lib/utils";

export default function OrientationPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Orientation Scanner & Monitoring...</div>}>
      <OrientationContent />
    </React.Suspense>
  );
}

function OrientationContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "monitoring" ? "monitoring" : "scanner";
  const { isOnline } = useOffline();

  const [activeTab, setActiveTab] = useState<"scanner" | "monitoring">(initialTab);
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");

  // Scanner States
  const [scannerOpen, setScannerOpen] = useState(false);
  const [qrGeneratorOpen, setQrGeneratorOpen] = useState(false);
  const [manualSlot, setManualSlot] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any | null>(null);

  // Monitoring States
  const [monitoringData, setMonitoringData] = useState<any | null>(null);
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterFilter, setRosterFilter] = useState("ALL");
  const [selectedBarangayFilter, setSelectedBarangayFilter] = useState("ALL");
  const [selectedTableFilter, setSelectedTableFilter] = useState("ALL");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (selectedProgramId) {
      fetchMonitoringData(selectedProgramId);
    }
  }, [selectedProgramId]);

  // Auto-refresh interval when enabled
  useEffect(() => {
    let interval: any = null;
    if (autoRefresh && selectedProgramId) {
      interval = setInterval(() => {
        fetchMonitoringData(selectedProgramId, true);
      }, 10000); // Poll every 10 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, selectedProgramId]);

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
      console.error("Failed to load programs:", e);
    }
  };

  const fetchMonitoringData = async (progId: string, silent = false) => {
    if (!silent) setMonitoringLoading(true);
    try {
      const res = await fetch(`/api/v1/orientation/monitoring?programId=${progId}`);
      if (res.ok) {
        const data = await res.json();
        setMonitoringData(data);
        setLastRefreshedAt(new Date());
      }
    } catch (e) {
      console.error("Failed to load orientation monitoring data:", e);
    } finally {
      if (!silent) setMonitoringLoading(false);
    }
  };

  const handleScan = async (tokenOrSlot: string) => {
    setScannerOpen(false);
    setLoading(true);
    setError(null);
    setScanResult(null);

    try {
      if (isOnline) {
        const res = await fetch("/api/v1/orientation/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qrToken: tokenOrSlot,
            programId: selectedProgramId,
            deviceId: localStorage.getItem("tupad_device_id") || "MOBILE_BROWSER",
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Orientation verification failed");

        setScanResult({
          alreadyRecorded: data.alreadyScanned,
          message: data.message,
          data: data.data,
          isOffline: false,
        });

        // Refresh monitoring data in background
        if (selectedProgramId) {
          fetchMonitoringData(selectedProgramId, true);
        }
      } else {
        // Offline mode check
        const bene = await offlineDb.cachedBeneficiaries
          .where("qrToken")
          .equals(tokenOrSlot)
          .or("designatedNumber")
          .equals(tokenOrSlot)
          .first();

        if (!bene) throw new Error("Beneficiary not found in offline database");

        await queueOfflineTransaction("ORIENTATION", "CREATE", {
          programId: bene.programId || selectedProgramId,
          programBeneficiaryId: bene.id,
          status: "PRESENT",
        });

        setScanResult({
          alreadyRecorded: false,
          message: "Orientation Attendance Saved Offline (Queued for Sync)",
          data: {
            designatedNumber: bene.designatedNumber,
            fullName: bene.fullName,
            barangay: bene.barangay,
            tableNumber: bene.tableNumber || "Table 1",
            status: "PRESENT",
            scannedAt: new Date().toISOString(),
          },
          isOffline: true,
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualSlot.trim()) {
      handleScan(manualSlot.trim());
      setManualSlot("");
    }
  };

  // Filter Beneficiaries in Monitoring Table
  const filteredBeneficiaries = (monitoringData?.beneficiaries || []).filter((b: any) => {
    // 1. Text Search Filter (Name, Designated #, Contact, QR Token)
    const matchesSearch =
      !rosterSearch.trim() ||
      b.fullName.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      String(b.designatedNumber).toLowerCase().includes(rosterSearch.toLowerCase()) ||
      b.barangay.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      (b.qrToken && b.qrToken.toLowerCase().includes(rosterSearch.toLowerCase())) ||
      (b.tableNumber && b.tableNumber.toLowerCase().includes(rosterSearch.toLowerCase()));

    // 2. Status Filter
    let matchesStatus = true;
    if (rosterFilter === "NOT_SCANNED_PENDING") {
      // Affirmed in stub distribution but NOT yet scanned for orientation
      matchesStatus = b.isStubAffirmed && !b.isOrientationScanned;
    } else if (rosterFilter === "SCANNED_PRESENT") {
      matchesStatus = b.isOrientationScanned;
    } else if (rosterFilter === "FLAGGED_REPLACEMENT") {
      matchesStatus = b.isFlagged;
    } else if (rosterFilter === "STUBS_AFFIRMED") {
      matchesStatus = b.isStubAffirmed;
    } else if (rosterFilter === "PENDING_STUB") {
      matchesStatus = !b.isStubAffirmed && !b.isFlagged;
    }

    // 3. Barangay Filter
    const matchesBarangay =
      selectedBarangayFilter === "ALL" ||
      b.barangay.toLowerCase() === selectedBarangayFilter.toLowerCase();

    // 4. Table Filter
    const matchesTable =
      selectedTableFilter === "ALL" ||
      (b.tableNumber && b.tableNumber.toLowerCase() === selectedTableFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesBarangay && matchesTable;
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredBeneficiaries.length) return;
    const headers = [
      "Designated Number",
      "Full Name",
      "Barangay",
      "Table Number",
      "Contact Number",
      "Stub Status",
      "Orientation Status",
      "Orientation Scanned At",
      "Orientation Scanned By",
    ];

    const rows = filteredBeneficiaries.map((b: any) => [
      `"${b.designatedNumber}"`,
      `"${b.fullName}"`,
      `"${b.barangay}"`,
      `"${b.tableNumber || ""}"`,
      `"${b.contactNumber || ""}"`,
      `"${b.isStubAffirmed ? "AFFIRMED" : b.isFlagged ? "FLAGGED_REPLACEMENT" : "PENDING"}"`,
      `"${b.isOrientationScanned ? "VERIFIED_PRESENT" : "NOT_SCANNED_PENDING"}"`,
      `"${b.orientationScannedAt ? new Date(b.orientationScannedAt).toLocaleString() : ""}"`,
      `"${b.orientationScannedBy || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `TUPAD_Orientation_Monitoring_${monitoringData?.program?.programCode || "Report"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = monitoringData?.summary;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header & Program Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <CalendarCheck className="w-7 h-7 text-gov-blue" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              TUPAD Program Orientation Verification
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Step 2: Real-time verification of beneficiaries attending the official LGU Dingalan TUPAD Orientation
          </p>
        </div>

        {/* Program Selector & QR Generator */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setQrGeneratorOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-gov-gold/20 to-amber-100 hover:from-gov-gold/30 hover:to-amber-200 text-gov-dark border border-gov-gold/50 rounded-xl text-xs font-black transition flex items-center space-x-1.5 shadow-xs"
            title="Generate and screenshot official QR code of any beneficiary"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-700" />
            <span>Generate / Screenshot QR</span>
          </button>

          <label className="text-xs font-bold text-slate-600 whitespace-nowrap hidden sm:inline">
            Work Program:
          </label>
          <select
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
            className="text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 shadow-xs focus:ring-2 focus:ring-gov-blue focus:border-gov-blue"
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.programCode} - {p.programName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex items-center space-x-2 bg-slate-200/80 p-1 rounded-2xl max-w-md mx-auto sm:mx-0 shadow-inner">
        <button
          onClick={() => setActiveTab("scanner")}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-extrabold transition ${
            activeTab === "scanner"
              ? "bg-white text-gov-blue shadow-md"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>QR Scanner & Verification</span>
        </button>

        <button
          onClick={() => setActiveTab("monitoring")}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-extrabold transition relative ${
            activeTab === "monitoring"
              ? "bg-white text-emerald-700 shadow-md"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Live Monitoring Scheme</span>
          {summary?.totalOrientationPending > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold">
              {summary.totalOrientationPending}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: QR SCANNER & LIVE VERIFICATION VIEW                                */}
      {/* ========================================================================= */}
      {activeTab === "scanner" && (
        <div className="max-w-xl mx-auto space-y-6">
          {/* Main Scanner Action Card */}
          <div className="gov-card p-6 sm:p-8 text-center space-y-6 shadow-xl border-t-4 border-t-gov-blue">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center mx-auto border-4 border-teal-100 shadow-inner">
              <CalendarCheck className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Scan Beneficiary Orientation QR
              </h2>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Scan beneficiary's QR code token or enter designated slot number to mark verified presence at orientation.
              </p>
            </div>

            <button
              onClick={() => setScannerOpen(true)}
              disabled={loading}
              className="w-full py-4 bg-gov-blue hover:bg-gov-light text-white font-black text-sm rounded-2xl shadow-lg flex items-center justify-center space-x-2 transition transform active:scale-95"
            >
              <Camera className="w-5 h-5 text-gov-goldLight" />
              <span>{loading ? "PROCESSING SCAN..." : "LAUNCH CAMERA QR SCANNER"}</span>
            </button>

            {/* Manual Slot Number Fast-Entry */}
            <form onSubmit={handleManualScanSubmit} className="pt-3 border-t border-slate-100 space-y-2">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Or Enter Designated Slot Number / Token
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={manualSlot}
                  onChange={(e) => setManualSlot(e.target.value)}
                  placeholder="e.g. 1, 45, or DGL-TUPAD-..."
                  className="flex-1 text-xs border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-gov-blue font-mono font-bold"
                />
                <button
                  type="submit"
                  disabled={!manualSlot.trim() || loading}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition"
                >
                  Verify
                </button>
              </div>
            </form>
          </div>

          {/* Scanning Alert Notice */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3 text-xs text-red-700 shadow-sm animate-fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
              <div className="space-y-1">
                <strong className="block font-bold">Orientation Scan Alert</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Scan Success Result Card */}
          {scanResult && (
            <div
              className={`gov-card p-6 text-center space-y-4 shadow-xl border-t-4 animate-fade-in ${
                scanResult.alreadyRecorded ? "border-t-amber-500" : "border-t-emerald-600"
              }`}
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                  scanResult.alreadyRecorded
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-block ${
                    scanResult.isOffline
                      ? "bg-blue-100 text-blue-800"
                      : scanResult.alreadyRecorded
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {scanResult.isOffline
                    ? "OFFLINE — SAVED LOCALLY"
                    : scanResult.alreadyRecorded
                    ? "! ALREADY RECORDED"
                    : "✓ VERIFIED PRESENT"}
                </span>

                <h2 className="text-lg font-black text-slate-900">
                  {scanResult.data.fullName}
                </h2>

                <div className="flex items-center justify-center space-x-2 text-xs font-mono font-bold text-gov-blue">
                  <span>Slot #{scanResult.data.designatedNumber}</span>
                  <span>•</span>
                  <span>Barangay {scanResult.data.barangay}</span>
                  <span>•</span>
                  <span>{scanResult.data.tableNumber || "Table 1"}</span>
                </div>

                <p className="text-xs text-slate-500 mt-1">{scanResult.message}</p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => {
                    setScanResult(null);
                    setScannerOpen(true);
                  }}
                  className="flex-1 py-3 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow transition"
                >
                  Scan Next Beneficiary
                </button>
                <button
                  onClick={() => setActiveTab("monitoring")}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  View Monitoring Roster
                </button>
              </div>
            </div>
          )}

          {/* Quick Monitoring Preview Banner */}
          {summary && (
            <div className="gov-card p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-md">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  Orientation Attendance Progress
                </span>
                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-emerald-400 font-black text-base">
                    {summary.totalOrientationScanned} Verified
                  </span>
                  <span>•</span>
                  <span className="text-amber-400 font-black text-base">
                    {summary.totalOrientationPending} Pending
                  </span>
                  <span>•</span>
                  <span className="text-slate-300 font-bold">
                    {summary.attendanceRate}% Scanned
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("monitoring")}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-lg transition flex items-center space-x-1"
              >
                <span>Full Scheme</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LIVE ORIENTATION MONITORING SCHEME & ROSTER VIEW                    */}
      {/* ========================================================================= */}
      {activeTab === "monitoring" && (
        <div className="space-y-6 animate-fade-in">
          {/* Monitoring Top Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-700">
                Live Monitoring Scheme • {monitoringData?.program?.programName || "Active Program"}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Updated: {lastRefreshedAt.toLocaleTimeString()}
              </span>
            </div>

            <div className="flex items-center space-x-2 flex-wrap">
              <label className="inline-flex items-center space-x-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded text-gov-blue focus:ring-gov-blue w-3.5 h-3.5"
                />
                <span className="text-[11px] font-semibold">Auto-poll (10s)</span>
              </label>

              <button
                onClick={() => selectedProgramId && fetchMonitoringData(selectedProgramId)}
                disabled={monitoringLoading}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition text-xs font-bold flex items-center space-x-1"
                title="Refresh Orientation Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${monitoringLoading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl transition text-xs font-bold flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("scanner");
                  setScannerOpen(true);
                }}
                className="px-3.5 py-2 bg-gov-blue hover:bg-gov-light text-white rounded-xl transition text-xs font-bold flex items-center space-x-1 shadow-sm"
              >
                <Camera className="w-3.5 h-3.5 text-gov-goldLight" />
                <span>Open Scanner</span>
              </button>
            </div>
          </div>

          {/* 5-Key Summary Metrics KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Card 1: Total Enrolled */}
            <div className="gov-card p-4 bg-white border-l-4 border-l-slate-600 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Total Enrolled</span>
                <Users className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-2xl font-black text-slate-900">
                {summary?.totalBeneficiaries || 0}
              </p>
              <p className="text-[10px] text-slate-500">Official Roster Count</p>
            </div>

            {/* Card 2: Stubs Affirmed (Step 1 Complete) */}
            <div className="gov-card p-4 bg-white border-l-4 border-l-blue-600 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Stubs Affirmed</span>
                <FileCheck className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-blue-900">
                {summary?.totalStubsAffirmed || 0}
              </p>
              <p className="text-[10px] text-slate-500">Step 1 Distributed</p>
            </div>

            {/* Card 3: Flagged for Replacement */}
            <div className="gov-card p-4 bg-white border-l-4 border-l-rose-500 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Flagged Replace</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl font-black text-rose-700">
                {summary?.totalFlaggedReplacement || 0}
              </p>
              <p className="text-[10px] text-slate-500">Replacement Needed</p>
            </div>

            {/* Card 4: Orientation Scanned (Present) */}
            <div className="gov-card p-4 bg-white border-l-4 border-l-emerald-600 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Scanned Present</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-700">
                {summary?.totalOrientationScanned || 0}
              </p>
              <p className="text-[10px] text-emerald-700 font-bold">
                {summary?.attendanceRate || "0"}% Verified
              </p>
            </div>

            {/* Card 5: NOT YET SCANNED (Pending Orientation) - Prominent Focus */}
            <div className="gov-card p-4 bg-amber-50/70 border-2 border-amber-400 border-l-4 border-l-amber-500 rounded-2xl shadow-sm space-y-1 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-amber-700">
                <span className="text-[10px] font-black uppercase tracking-wider">Pending Scans</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-black text-amber-900">
                {summary?.totalOrientationPending || 0}
              </p>
              <p className="text-[10px] text-amber-800 font-bold">
                Not Yet Scanned
              </p>
            </div>
          </div>

          {/* Barangay Progress Matrix (All 11 Dingalan Barangays) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <MapPin className="w-4 h-4 text-gov-blue" />
                <span>11 Dingalan Barangays Orientation Breakdown</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-medium">
                Click any barangay to filter list
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {(monitoringData?.barangays || []).map((brgy: any) => {
                const isSelected = selectedBarangayFilter.toLowerCase() === brgy.barangayName.toLowerCase();
                return (
                  <button
                    key={brgy.barangayName}
                    onClick={() =>
                      setSelectedBarangayFilter(isSelected ? "ALL" : brgy.barangayName)
                    }
                    className={`p-2.5 rounded-xl border text-left transition ${
                      isSelected
                        ? "bg-blue-50 border-gov-blue ring-2 ring-blue-300"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {brgy.barangayName}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                          brgy.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : brgy.orientationPending > 0
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {brgy.completionPercentage}%
                      </span>
                    </div>

                    <div className="text-[10px] space-y-0.5 font-medium text-slate-600">
                      <div className="flex justify-between">
                        <span>Scanned:</span>
                        <strong className="text-emerald-700">{brgy.orientationScanned}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Pending:</span>
                        <strong className="text-amber-700">{brgy.orientationPending}</strong>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Affirmed:</span>
                        <span>{brgy.stubsAffirmed}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${brgy.completionPercentage}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Roster Controls: Search, Filter Tabs & Dropdowns */}
          <div className="space-y-3">
            {/* Quick Status Pill Filters */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                onClick={() => setRosterFilter("ALL")}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition ${
                  rosterFilter === "ALL"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                All Roster ({monitoringData?.beneficiaries?.length || 0})
              </button>

              <button
                onClick={() => setRosterFilter("NOT_SCANNED_PENDING")}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${
                  rosterFilter === "NOT_SCANNED_PENDING"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Not Yet Scanned ({summary?.totalOrientationPending || 0})</span>
              </button>

              <button
                onClick={() => setRosterFilter("SCANNED_PRESENT")}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${
                  rosterFilter === "SCANNED_PRESENT"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Present ({summary?.totalOrientationScanned || 0})</span>
              </button>

              <button
                onClick={() => setRosterFilter("FLAGGED_REPLACEMENT")}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${
                  rosterFilter === "FLAGGED_REPLACEMENT"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Flagged for Replacement ({summary?.totalFlaggedReplacement || 0})</span>
              </button>

              <button
                onClick={() => setRosterFilter("STUBS_AFFIRMED")}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition ${
                  rosterFilter === "STUBS_AFFIRMED"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200"
                }`}
              >
                Stubs Affirmed ({summary?.totalStubsAffirmed || 0})
              </button>
            </div>

            {/* Live Search & Filter Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="sm:col-span-6 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Search by name, slot #, token, or table..."
                  className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-gov-blue focus:bg-white"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={selectedBarangayFilter}
                  onChange={(e) => setSelectedBarangayFilter(e.target.value)}
                  className="w-full text-xs font-semibold py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-gov-blue text-slate-800"
                >
                  <option value="ALL">All Barangays (11)</option>
                  {(monitoringData?.barangays || []).map((b: any) => (
                    <option key={b.barangayName} value={b.barangayName}>
                      Barangay {b.barangayName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <select
                  value={selectedTableFilter}
                  onChange={(e) => setSelectedTableFilter(e.target.value)}
                  className="w-full text-xs font-semibold py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-gov-blue text-slate-800"
                >
                  <option value="ALL">All Assigned Tables</option>
                  <option value="Table 1">Table 1</option>
                  <option value="Table 2">Table 2</option>
                  <option value="Table 3">Table 3</option>
                  <option value="Table 4">Table 4</option>
                  <option value="Table 5">Table 5</option>
                </select>
              </div>
            </div>
          </div>

          {/* Monitoring Table Roster */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="text-xs font-bold text-slate-700">
                Displaying{" "}
                <span className="text-gov-blue font-black">{filteredBeneficiaries.length}</span>{" "}
                of {monitoringData?.beneficiaries?.length || 0} Beneficiaries
              </div>

              {selectedBarangayFilter !== "ALL" && (
                <button
                  onClick={() => setSelectedBarangayFilter("ALL")}
                  className="text-[11px] font-bold text-blue-700 hover:underline"
                >
                  Reset Barangay Filter ({selectedBarangayFilter})
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5">Slot #</th>
                    <th className="py-3 px-3.5">Beneficiary Information</th>
                    <th className="py-3 px-3.5">Barangay & Table</th>
                    <th className="py-3 px-3.5">Step 1: Stub Status</th>
                    <th className="py-3 px-3.5">Step 2: Orientation Status</th>
                    <th className="py-3 px-3.5 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredBeneficiaries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 space-y-1">
                        <Users className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="font-bold text-slate-600">No beneficiaries matching filters.</p>
                        <p className="text-[11px]">Try adjusting your search query or status filter.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredBeneficiaries.map((b: any) => {
                      return (
                        <tr
                          key={b.id}
                          className={`hover:bg-slate-50 transition ${
                            b.isOrientationScanned
                              ? "bg-emerald-50/20"
                              : b.isFlagged
                              ? "bg-rose-50/20"
                              : b.isStubAffirmed
                              ? "bg-amber-50/20"
                              : ""
                          }`}
                        >
                          {/* Slot Number */}
                          <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                            <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                              #{b.designatedNumber}
                            </span>
                          </td>

                          {/* Beneficiary Info */}
                          <td className="py-3 px-3.5 space-y-0.5">
                            <div className="font-extrabold text-slate-900 text-xs">
                              {b.fullName}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                              <span>📞 {b.contactNumber || "No contact"}</span>
                              {b.birthday && <span>• 🎂 {b.birthday}</span>}
                            </div>
                          </td>

                          {/* Barangay & Table */}
                          <td className="py-3 px-3.5 space-y-0.5">
                            <div className="font-bold text-slate-800 text-xs">
                              {b.barangay}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {b.tableNumber || "Table 1"}
                            </div>
                          </td>

                          {/* Step 1: Stub Status */}
                          <td className="py-3 px-3.5">
                            {b.isFlagged ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>FLAGGED FOR REPLACEMENT</span>
                              </span>
                            ) : b.isStubAffirmed ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                  <Check className="w-3 h-3 text-blue-600" />
                                  <span>STUB AFFIRMED</span>
                                </span>
                                {b.stubDistributedAt && (
                                  <div className="text-[9px] text-slate-400">
                                    {new Date(b.stubDistributedAt).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                <span>NOT DISTRIBUTED</span>
                              </span>
                            )}
                          </td>

                          {/* Step 2: Orientation Status */}
                          <td className="py-3 px-3.5">
                            {b.isOrientationScanned ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>VERIFIED PRESENT</span>
                                </span>
                                <div className="text-[10px] text-emerald-800 font-mono">
                                  {b.orientationScannedAt
                                    ? new Date(b.orientationScannedAt).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "Recorded"}
                                  {b.orientationScannedBy && ` • by ${b.orientationScannedBy}`}
                                </div>
                              </div>
                            ) : b.isFlagged ? (
                              <span className="text-[10px] text-rose-700 font-semibold">
                                Blocked (Pending Replacement)
                              </span>
                            ) : b.isStubAffirmed ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>NOT YET SCANNED</span>
                                </span>
                                <p className="text-[10px] text-amber-700">Awaiting Orientation Attendance</p>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                Ineligible (Complete Step 1 First)
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3.5 text-right">
                            {!b.isOrientationScanned && b.isStubAffirmed && !b.isFlagged ? (
                              <button
                                onClick={() => handleScan(b.qrToken || b.designatedNumber)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center space-x-1 ml-auto"
                              >
                                <Check className="w-3 h-3" />
                                <span>Verify Present</span>
                              </button>
                            ) : b.isOrientationScanned ? (
                              <span className="text-[11px] text-emerald-700 font-bold">
                                ✓ Scanned
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">N/A</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Camera QR Scanner Modal */}
      <QrScannerModal
        isOpen={scannerOpen}
        onScan={handleScan}
        onClose={() => setScannerOpen(false)}
        title="Orientation QR Scanner"
        subtitle="Align beneficiary QR code inside viewfinder"
      />

      {/* Beneficiary QR Pass Generator & Screenshot Modal */}
      <FieldQrPassGeneratorModal
        isOpen={qrGeneratorOpen}
        onClose={() => setQrGeneratorOpen(false)}
      />
    </div>
  );
}
