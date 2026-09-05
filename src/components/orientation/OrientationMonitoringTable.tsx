"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  CalendarCheck,
  Clock,
  UserCheck,
  Search,
  Filter,
  RefreshCw,
  Building2,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  ArrowUpDown,
  Tag,
  FileCheck,
  Download,
  AlertCircle,
  Eye,
  Compass,
} from "lucide-react";
import { DINGALAN_BARANGAYS, normalizeBarangayName } from "@/lib/utils";

export interface MonitoringSummary {
  totalBeneficiaries: number;
  totalAffirmedStubs: number;
  totalFlagged: number;
  totalOrientationPresent: number;
  totalOrientationPending: number;
  totalOnsiteReplacements: number;
  orientationCompletionRate: string | number;
  stubAffirmationRate: string | number;
}

export interface MonitoringBarangay {
  barangayName: string;
  total: number;
  stubsAffirmed: number;
  flaggedForReplacement: number;
  orientationPresent: number;
  orientationPending: number;
  onsiteReplacements: number;
  stubAffirmedRate: number;
  orientationRate: number;
}

export interface MonitoringBeneficiary {
  id: string;
  designatedNumber: string;
  fullName: string;
  sitio: string;
  barangay: string;
  sex: string;
  age: number | null;
  tableNumber: string;
  originalBeneficiary: boolean;
  participationStatus: string;
  lifecycleStatus: string;
  isAffirmedStub: boolean;
  isFlaggedForReplacement: boolean;
  isOrientationPresent: boolean;
  stubDistributedAt: string | null;
  stubDistributedBy: string | null;
  stubRemarks: string | null;
  orientationScannedAt: string | null;
  orientationScannedBy: string | null;
  qrToken: string | null;
}

interface OrientationMonitoringTableProps {
  summary?: MonitoringSummary;
  barangays?: MonitoringBarangay[];
  beneficiaries?: MonitoringBeneficiary[];
  onRefresh?: () => void;
  loading?: boolean;
  onSelectBeneficiaryForDay1?: (beneficiary: MonitoringBeneficiary) => void;
}

type FilterStatus =
  | "ALL"
  | "AFFIRMED_STUBS"
  | "FLAGGED_REPLACEMENT"
  | "ORIENTATION_PRESENT"
  | "ORIENTATION_PENDING"
  | "ONSITE_REPLACEMENTS";

export function OrientationMonitoringTable({
  summary: propSummary,
  barangays: propBarangays,
  beneficiaries: propBeneficiaries,
  onRefresh: propOnRefresh,
  loading: propLoading,
  onSelectBeneficiaryForDay1,
}: OrientationMonitoringTableProps) {
  // Client-side hydration guard
  const [mounted, setMounted] = useState(false);

  // Internal state for self-fetching if props are omitted
  const [internalSummary, setInternalSummary] = useState<MonitoringSummary | null>(null);
  const [internalBarangays, setInternalBarangays] = useState<MonitoringBarangay[]>([]);
  const [internalBeneficiaries, setInternalBeneficiaries] = useState<MonitoringBeneficiary[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [selectedBrgy, setSelectedBrgy] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [sortField, setSortField] = useState<"designatedNumber" | "fullName" | "barangay">("designatedNumber");
  const [sortAsc, setSortAsc] = useState(true);

  // Self fetch implementation
  const fetchData = useCallback(async () => {
    setInternalLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/v1/orientation/monitoring");
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load orientation monitoring data");
      }
      const data = await res.json();
      setInternalSummary(data.summary);
      setInternalBarangays(data.barangays || []);
      setInternalBeneficiaries(data.beneficiaries || []);
    } catch (err: any) {
      setFetchError(err.message);
    } finally {
      setInternalLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    if (!propBeneficiaries || propBeneficiaries.length === 0) {
      fetchData();
    }
  }, [fetchData, propBeneficiaries]);

  const summary = propSummary || internalSummary || {
    totalBeneficiaries: 0,
    totalAffirmedStubs: 0,
    totalFlagged: 0,
    totalOrientationPresent: 0,
    totalOrientationPending: 0,
    totalOnsiteReplacements: 0,
    orientationCompletionRate: 0,
    stubAffirmationRate: 0,
  };

  const barangays = propBarangays || internalBarangays || [];
  const beneficiaries = propBeneficiaries || internalBeneficiaries || [];
  const loading = propLoading !== undefined ? propLoading : internalLoading;

  const handleRefresh = () => {
    if (propOnRefresh) {
      propOnRefresh();
    } else {
      fetchData();
    }
  };

  // Filter and sort beneficiaries
  const filteredBeneficiaries = useMemo(() => {
    return beneficiaries
      .filter((b) => {
        // Barangay filter
        if (selectedBrgy !== "ALL") {
          if (normalizeBarangayName(b.barangay).toLowerCase() !== selectedBrgy.toLowerCase()) {
            return false;
          }
        }

        // Status tab filter
        if (statusFilter === "AFFIRMED_STUBS" && !b.isAffirmedStub) return false;
        if (statusFilter === "FLAGGED_REPLACEMENT" && !b.isFlaggedForReplacement) return false;
        if (statusFilter === "ORIENTATION_PRESENT" && !b.isOrientationPresent) return false;
        if (statusFilter === "ORIENTATION_PENDING" && (b.isOrientationPresent || b.participationStatus === "REPLACED")) return false;
        if (statusFilter === "ONSITE_REPLACEMENTS" && b.originalBeneficiary) return false;

        // Search filter
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          const matchesName = b.fullName.toLowerCase().includes(q);
          const matchesNum = b.designatedNumber.toLowerCase().includes(q);
          const matchesSitio = (b.sitio || "").toLowerCase().includes(q);
          const matchesTable = (b.tableNumber || "").toLowerCase().includes(q);
          return matchesName || matchesNum || matchesSitio || matchesTable;
        }

        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === "designatedNumber") {
          const numA = parseInt(a.designatedNumber, 10) || 0;
          const numB = parseInt(b.designatedNumber, 10) || 0;
          return sortAsc ? numA - numB : numB - numA;
        }

        if (typeof valA === "string" && typeof valB === "string") {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return 0;
      });
  }, [beneficiaries, selectedBrgy, statusFilter, search, sortField, sortAsc]);

  // Export filtered roster to CSV
  const handleExportCSV = () => {
    const headers = [
      "Designated Number",
      "Full Name",
      "Barangay",
      "Sitio / Purok",
      "Sex",
      "Age",
      "Table #",
      "Type",
      "Stub Status",
      "Stub Distributed At",
      "Stub Remarks / Replacement Reason",
      "DOLE Orientation Status",
      "Orientation Scanned At",
    ];

    const rows = filteredBeneficiaries.map((b) => [
      `#${b.designatedNumber}`,
      `"${b.fullName.replace(/"/g, '""')}"`,
      `"${b.barangay}"`,
      `"${b.sitio || "Centro"}"`,
      b.sex,
      b.age || "N/A",
      b.tableNumber || "Table 1",
      b.originalBeneficiary ? "Original" : "Onsite Replacement",
      b.isFlaggedForReplacement
        ? "FLAGGED_FOR_REPLACEMENT"
        : b.isAffirmedStub
        ? "AFFIRMED_DISTRIBUTED"
        : "PENDING_STUB",
      b.stubDistributedAt ? new Date(b.stubDistributedAt).toLocaleString() : "",
      `"${(b.stubRemarks || "").replace(/"/g, '""')}"`,
      b.isOrientationPresent ? "PRESENT" : "PENDING_ORIENTATION",
      b.orientationScannedAt ? new Date(b.orientationScannedAt).toLocaleString() : "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TUPAD_Orientation_Monitoring_${selectedBrgy}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!mounted) {
    return (
      <div className="gov-card p-12 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-gov-blue animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Initializing Orientation Monitoring Scheme...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. High-Impact Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Target */}
        <div className="gov-card p-4.5 bg-white border-l-4 border-l-gov-blue rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Target
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-gov-blue flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-black text-slate-900 font-mono">
              {summary.totalBeneficiaries}
            </p>
            <span className="text-[11px] font-semibold text-slate-500">11 Barangays</span>
          </div>
        </div>

        {/* Affirmed in Stub Distribution */}
        <div className="gov-card p-4.5 bg-white border-l-4 border-l-emerald-600 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Affirmed Stubs (Step 1)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-black text-emerald-700 font-mono">
              {summary.totalAffirmedStubs}
            </p>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {summary.stubAffirmationRate}%
            </span>
          </div>
        </div>

        {/* Flagged for Replacement */}
        <div className="gov-card p-4.5 bg-white border-l-4 border-l-amber-500 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Flagged for Replacement
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-black text-amber-700 font-mono">
              {summary.totalFlagged}
            </p>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Onsite Action
            </span>
          </div>
        </div>

        {/* Orientation Verified Present */}
        <div className="gov-card p-4.5 bg-white border-l-4 border-l-indigo-600 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              DOLE Oriented (Step 2)
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-black text-indigo-700 font-mono">
              {summary.totalOrientationPresent}
            </p>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              {summary.orientationCompletionRate}%
            </span>
          </div>
        </div>
      </div>

      {/* 2. Barangay Progress Carousel / Summary Strip */}
      <div className="gov-card p-4 bg-white rounded-2xl shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-gov-blue" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Barangay Orientation Verification Summary
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-semibold">
            {barangays.length} Barangays Monitored
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {barangays.map((brgy) => (
            <button
              key={brgy.barangayName}
              onClick={() =>
                setSelectedBrgy(selectedBrgy === brgy.barangayName ? "ALL" : brgy.barangayName)
              }
              className={`p-2.5 rounded-xl border text-left transition-all ${
                selectedBrgy === brgy.barangayName
                  ? "bg-blue-50 border-gov-blue ring-2 ring-blue-400/30"
                  : "bg-slate-50 hover:bg-slate-100 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 truncate">
                  {brgy.barangayName}
                </span>
                <span className="text-[10px] font-bold text-gov-blue font-mono">
                  {brgy.orientationPresent}/{brgy.total}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gov-blue h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(brgy.orientationRate, 100)}%` }}
                />
              </div>

              <div className="mt-1 flex items-center justify-between text-[9px] text-slate-500">
                <span>Stubs: {brgy.stubsAffirmed}</span>
                {brgy.flaggedForReplacement > 0 && (
                  <span className="text-amber-700 font-bold">
                    {brgy.flaggedForReplacement} rep
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {fetchError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3 text-xs text-red-700">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">Data Loading Error</strong>
            <span>{fetchError}</span>
          </div>
        </div>
      )}

      {/* 3. Monitoring Scheme Table & Controls */}
      <div className="gov-card bg-white rounded-2xl shadow-xs overflow-hidden border border-slate-200">
        {/* Top Control Bar */}
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-gov-blue" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Orientation Verification Roster
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time list of affirmed stubs, flagged replacements, and DOLE attendance
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 border border-slate-300"
                title="Export filtered data to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition border border-slate-300 disabled:opacity-50"
                title="Refresh Table"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-gov-blue" : ""}`} />
              </button>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === "ALL"
                  ? "bg-gov-navy text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              All Beneficiaries ({beneficiaries.length})
            </button>

            <button
              onClick={() => setStatusFilter("AFFIRMED_STUBS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                statusFilter === "AFFIRMED_STUBS"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Affirmed Stubs ({summary.totalAffirmedStubs})</span>
            </button>

            <button
              onClick={() => setStatusFilter("FLAGGED_REPLACEMENT")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                statusFilter === "FLAGGED_REPLACEMENT"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Flagged for Replacement ({summary.totalFlagged})</span>
            </button>

            <button
              onClick={() => setStatusFilter("ORIENTATION_PRESENT")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                statusFilter === "ORIENTATION_PRESENT"
                  ? "bg-indigo-700 text-white shadow-xs"
                  : "bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200"
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>DOLE Present ({summary.totalOrientationPresent})</span>
            </button>

            <button
              onClick={() => setStatusFilter("ORIENTATION_PENDING")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                statusFilter === "ORIENTATION_PENDING"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Orientation ({summary.totalOrientationPending})</span>
            </button>

            <button
              onClick={() => setStatusFilter("ONSITE_REPLACEMENTS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                statusFilter === "ONSITE_REPLACEMENTS"
                  ? "bg-purple-700 text-white shadow-xs"
                  : "bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Onsite Replacements ({summary.totalOnsiteReplacements})</span>
            </button>
          </div>

          {/* Search & Barangay Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search beneficiary name, slot # (e.g. 10), sitio, or table..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gov-blue text-slate-800"
              />
            </div>

            <div>
              <select
                value={selectedBrgy}
                onChange={(e) => setSelectedBrgy(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-gov-blue"
              >
                <option value="ALL">All Barangays (11)</option>
                {DINGALAN_BARANGAYS.map((brgy) => (
                  <option key={brgy} value={brgy}>
                    Brgy. {brgy}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th
                  onClick={() => {
                    if (sortField === "designatedNumber") setSortAsc(!sortAsc);
                    else {
                      setSortField("designatedNumber");
                      setSortAsc(true);
                    }
                  }}
                  className="py-3 px-4 cursor-pointer hover:text-slate-800 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Slot #</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortField === "fullName") setSortAsc(!sortAsc);
                    else {
                      setSortField("fullName");
                      setSortAsc(true);
                    }
                  }}
                  className="py-3 px-4 cursor-pointer hover:text-slate-800 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Beneficiary Name</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortField === "barangay") setSortAsc(!sortAsc);
                    else {
                      setSortField("barangay");
                      setSortAsc(true);
                    }
                  }}
                  className="py-3 px-4 cursor-pointer hover:text-slate-800 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Barangay & Sitio</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Step 1: Stub Status</th>
                <th className="py-3 px-4">Step 2: DOLE Orientation</th>
                <th className="py-3 px-4 text-right">Day 1 Deployment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gov-blue" />
                    <span>Loading orientation monitoring data...</span>
                  </td>
                </tr>
              ) : filteredBeneficiaries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-slate-600">No beneficiaries matched the filter criteria</p>
                    <p className="text-[11px] text-slate-400">Try changing status filter or search query.</p>
                  </td>
                </tr>
              ) : (
                filteredBeneficiaries.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Slot # */}
                    <td className="py-3.5 px-4 font-mono font-bold text-gov-blue">
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200">
                          #{b.designatedNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {b.tableNumber || "T1"}
                        </span>
                      </div>
                    </td>

                    {/* Beneficiary Name & Meta */}
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 text-sm">
                        {b.fullName}
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                        <span>{b.sex}</span>
                        <span>•</span>
                        <span>{b.age ? `${b.age} yrs` : "Age N/A"}</span>
                        <span>•</span>
                        {b.originalBeneficiary ? (
                          <span className="text-slate-500">Original</span>
                        ) : (
                          <span className="text-purple-700 font-bold bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                            Onsite Replacement
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Barangay & Sitio */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{b.barangay}</div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {b.sitio ? `Purok / Sitio: ${b.sitio}` : "Centro"}
                      </div>
                    </td>

                    {/* Step 1: Stub Status */}
                    <td className="py-3.5 px-4">
                      {b.isFlaggedForReplacement ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <AlertTriangle className="w-3 h-3 text-amber-700" />
                            <span>FLAGGED FOR REPLACEMENT</span>
                          </span>
                          <p className="text-[10px] text-amber-800 font-medium truncate max-w-xs">
                            {b.stubRemarks || "Flagged during stub distribution"}
                          </p>
                        </div>
                      ) : b.isAffirmedStub ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            <span>AFFIRMED / DISTRIBUTED</span>
                          </span>
                          {b.stubDistributedAt && (
                            <p className="text-[10px] text-slate-500">
                              {new Date(b.stubDistributedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>STUB PENDING</span>
                        </span>
                      )}
                    </td>

                    {/* Step 2: Orientation Status */}
                    <td className="py-3.5 px-4">
                      {b.isOrientationPresent ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
                            <CalendarCheck className="w-3 h-3 text-indigo-700" />
                            <span>DOLE ORIENTED (PRESENT)</span>
                          </span>
                          {b.orientationScannedAt && (
                            <p className="text-[10px] text-slate-500">
                              {new Date(b.orientationScannedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                        </div>
                      ) : b.participationStatus === "REPLACED" ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-900 border border-red-300">
                          <span>DISQUALIFIED / REPLACED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>AWAITING ORIENTATION</span>
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      {onSelectBeneficiaryForDay1 && (
                        <button
                          onClick={() => onSelectBeneficiaryForDay1(b)}
                          className="px-2.5 py-1 bg-gov-blue hover:bg-blue-800 text-white font-bold text-[11px] rounded-lg shadow-xs transition inline-flex items-center space-x-1"
                        >
                          <Compass className="w-3 h-3 text-gov-goldLight" />
                          <span>Day 1 Plan</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-800">{filteredBeneficiaries.length}</strong> of{" "}
            <strong className="text-slate-800">{beneficiaries.length}</strong> registered beneficiaries
          </span>
          <span className="font-semibold text-slate-600">
            PESO Dingalan • Real-Time Orientation Monitoring
          </span>
        </div>
      </div>
    </div>
  );
}
