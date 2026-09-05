"use client";

import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { DINGALAN_BARANGAYS, normalizeBarangayName } from "@/lib/utils";

interface OrientationMonitoringTableProps {
  summary: {
    totalBeneficiaries: number;
    totalAffirmedStubs: number;
    totalFlagged: number;
    totalOrientationPresent: number;
    totalOrientationPending: number;
    totalOnsiteReplacements: number;
    orientationCompletionRate: string;
    stubAffirmationRate: string;
  };
  barangays: Array<{
    barangayName: string;
    total: number;
    stubsAffirmed: number;
    flaggedForReplacement: number;
    orientationPresent: number;
    orientationPending: number;
    onsiteReplacements: number;
    stubAffirmedRate: number;
    orientationRate: number;
  }>;
  beneficiaries: Array<{
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
  }>;
  onRefresh: () => void;
  loading: boolean;
  onSelectBeneficiaryForDay1?: (beneficiary: any) => void;
}

type FilterStatus =
  | "ALL"
  | "AFFIRMED_STUBS"
  | "FLAGGED_REPLACEMENT"
  | "ORIENTATION_PRESENT"
  | "ORIENTATION_PENDING"
  | "ONSITE_REPLACEMENTS";

export function OrientationMonitoringTable({
  summary,
  barangays,
  beneficiaries,
  onRefresh,
  loading,
  onSelectBeneficiaryForDay1,
}: OrientationMonitoringTableProps) {
  const [search, setSearch] = useState("");
  const [selectedBrgy, setSelectedBrgy] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [sortField, setSortField] = useState<"designatedNumber" | "fullName" | "barangay">("designatedNumber");
  const [sortAsc, setSortAsc] = useState(true);

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
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 truncate">
                <span className="truncate">{brgy.barangayName}</span>
                <span className="font-mono text-[11px] text-slate-500">{brgy.total}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px]">
                <span className="text-emerald-700 font-bold">
                  ✓ {brgy.orientationPresent}
                </span>
                {brgy.flaggedForReplacement > 0 && (
                  <span className="text-amber-700 font-bold">
                    ⚠️ {brgy.flaggedForReplacement}
                  </span>
                )}
                <span className="font-mono text-slate-500 font-medium">
                  {brgy.orientationRate}%
                </span>
              </div>
              {/* Progress mini bar */}
              <div className="w-full bg-slate-200 h-1 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, brgy.orientationRate)}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Search, Barangay Dropdown & Status Filter Tabs */}
      <div className="gov-card p-4 bg-white rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Name, Designated #, Purok/Sitio, or Table #..."
              className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
            />
          </div>

          {/* Barangay Dropdown */}
          <div className="flex items-center space-x-2">
            <select
              value={selectedBrgy}
              onChange={(e) => setSelectedBrgy(e.target.value)}
              className="text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 text-slate-700"
            >
              <option value="ALL">All Barangays (11)</option>
              {DINGALAN_BARANGAYS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition flex items-center space-x-1"
              title="Refresh Roster"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap ${
              statusFilter === "ALL"
                ? "bg-gov-blue text-white border-gov-blue shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            All Beneficiaries ({beneficiaries.length})
          </button>

          <button
            onClick={() => setStatusFilter("AFFIRMED_STUBS")}
            className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center space-x-1.5 ${
              statusFilter === "AFFIRMED_STUBS"
                ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Affirmed Stubs ({summary.totalAffirmedStubs})</span>
          </button>

          <button
            onClick={() => setStatusFilter("FLAGGED_REPLACEMENT")}
            className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center space-x-1.5 ${
              statusFilter === "FLAGGED_REPLACEMENT"
                ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Flagged for Replacement ({summary.totalFlagged})</span>
          </button>

          <button
            onClick={() => setStatusFilter("ORIENTATION_PRESENT")}
            className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center space-x-1.5 ${
              statusFilter === "ORIENTATION_PRESENT"
                ? "bg-indigo-700 text-white border-indigo-700 shadow-xs"
                : "bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100"
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>DOLE Oriented ({summary.totalOrientationPresent})</span>
          </button>

          <button
            onClick={() => setStatusFilter("ORIENTATION_PENDING")}
            className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center space-x-1.5 ${
              statusFilter === "ORIENTATION_PENDING"
                ? "bg-slate-700 text-white border-slate-700 shadow-xs"
                : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Orientation Pending ({summary.totalOrientationPending})</span>
          </button>

          <button
            onClick={() => setStatusFilter("ONSITE_REPLACEMENTS")}
            className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center space-x-1.5 ${
              statusFilter === "ONSITE_REPLACEMENTS"
                ? "bg-purple-700 text-white border-purple-700 shadow-xs"
                : "bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Onsite Replacements ({summary.totalOnsiteReplacements})</span>
          </button>
        </div>
      </div>

      {/* 4. Main Monitoring Roster Table */}
      <div className="gov-card bg-white rounded-2xl shadow-xs overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-bold border-b border-slate-800">
                <th
                  onClick={() => {
                    if (sortField === "designatedNumber") setSortAsc(!sortAsc);
                    else {
                      setSortField("designatedNumber");
                      setSortAsc(true);
                    }
                  }}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition select-none w-20"
                >
                  <div className="flex items-center space-x-1">
                    <span># SLOT</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
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
                  className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>BENEFICIARY NAME</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
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
                  className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>BARANGAY &amp; PUROK</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">STEP 1: STUB STATUS</th>
                <th className="py-3 px-4">STEP 2: ORIENTATION STATUS</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBeneficiaries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-sm text-slate-600">No beneficiaries found</p>
                    <p className="text-xs text-slate-400">
                      Try adjusting your search query or status filter.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBeneficiaries.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-blue-50/40 transition-colors group"
                  >
                    {/* Slot # */}
                    <td className="py-3.5 px-4 font-mono font-black text-slate-900 text-sm">
                      #{b.designatedNumber}
                    </td>

                    {/* Beneficiary Details */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                        <span>{b.fullName}</span>
                        {!b.originalBeneficiary && (
                          <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-bold">
                            REPLACEMENT
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                        <span>Sex: {b.sex}</span>
                        <span>•</span>
                        <span>{b.tableNumber}</span>
                        {b.age && (
                          <>
                            <span>•</span>
                            <span>{b.age} y/o</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Barangay & Purok */}
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
                          <FileCheck className="w-3 h-3" />
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
