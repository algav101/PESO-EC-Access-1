"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Compass,
  CheckCircle2,
  Clock,
  Users,
  Search,
  RefreshCw,
  MapPin,
  ShieldCheck,
  Award,
  Download,
  AlertCircle,
  Eye,
  ArrowUpDown,
  Filter,
  Sparkles,
} from "lucide-react";
import { DINGALAN_BARANGAYS, normalizeBarangayName } from "@/lib/utils";

export interface Day1DeploymentItem {
  id: string;
  beneficiaryId: string;
  designatedNumber: string;
  fullName: string;
  barangay: string;
  sitio: string;
  sex: string;
  age: number | null;
  isSenior: boolean;
  isPwd: boolean;
  tableNumber: string;
  isOriginal: boolean;
  isOriented: boolean;
  isAuthorized: boolean;
  isDeployed: boolean;
  deployedAt: string | null;
  deployedBy: string | null;
  assignedArea: string;
  activityName: string;
  proximityScore: number;
  purokRank: string;
  qrToken: string;
}

export interface Day1WorkArea {
  id: string;
  barangay: string;
  area: string;
  specificActivities: string;
  targetQuota: number;
  maleQuota: number;
  femaleQuota: number;
  currentDeployed: number;
  currentMale: number;
  currentFemale: number;
}

interface Day1DeploymentBoardProps {
  onSelectBeneficiary: (token: string) => void;
  refreshTrigger?: number;
}

type FilterMode = "ALL" | "DEPLOYED" | "PENDING" | "DIRECT_PUROK";

export function Day1DeploymentBoard({
  onSelectBeneficiary,
  refreshTrigger,
}: Day1DeploymentBoardProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState({
    totalTarget: 0,
    totalOriented: 0,
    totalDay1Deployed: 0,
    pendingDeployment: 0,
    maleDeployed: 0,
    femaleDeployed: 0,
    scPwdDeployed: 0,
    deploymentRate: "0.0",
  });

  const [workAreas, setWorkAreas] = useState<Day1WorkArea[]>([]);
  const [deployments, setDeployments] = useState<Day1DeploymentItem[]>([]);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [selectedBrgy, setSelectedBrgy] = useState("ALL");
  const [filterMode, setFilterMode] = useState<FilterMode>("ALL");
  const [sortField, setSortField] = useState<"designatedNumber" | "fullName" | "deployedAt">("designatedNumber");
  const [sortAsc, setSortAsc] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/orientation/day1-deployment");
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load Day 1 deployment tracking board");
      }
      const data = await res.json();
      setSummary(data.summary || {});
      setWorkAreas(data.workAreas || []);
      setDeployments(data.deployments || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [fetchData, refreshTrigger]);

  const filteredList = useMemo(() => {
    return deployments
      .filter((d) => {
        if (selectedBrgy !== "ALL") {
          if (normalizeBarangayName(d.barangay).toLowerCase() !== selectedBrgy.toLowerCase()) {
            return false;
          }
        }

        if (filterMode === "DEPLOYED" && !d.isDeployed) return false;
        if (filterMode === "PENDING" && d.isDeployed) return false;
        if (filterMode === "DIRECT_PUROK" && d.proximityScore < 60) return false;

        if (search.trim()) {
          const q = search.toLowerCase().trim();
          const matchName = d.fullName.toLowerCase().includes(q);
          const matchSlot = d.designatedNumber.toLowerCase().includes(q);
          const matchSitio = d.sitio.toLowerCase().includes(q);
          const matchArea = d.assignedArea.toLowerCase().includes(q);
          return matchName || matchSlot || matchSitio || matchArea;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortField === "designatedNumber") {
          const numA = parseInt(a.designatedNumber, 10) || 0;
          const numB = parseInt(b.designatedNumber, 10) || 0;
          return sortAsc ? numA - numB : numB - numA;
        }
        if (sortField === "fullName") {
          return sortAsc ? a.fullName.localeCompare(b.fullName) : b.fullName.localeCompare(a.fullName);
        }
        if (sortField === "deployedAt") {
          const tA = a.deployedAt ? new Date(a.deployedAt).getTime() : 0;
          const tB = b.deployedAt ? new Date(b.deployedAt).getTime() : 0;
          return sortAsc ? tA - tB : tB - tA;
        }
        return 0;
      });
  }, [deployments, selectedBrgy, filterMode, search, sortField, sortAsc]);

  const handleExportCSV = () => {
    const headers = [
      "Designated Slot #",
      "Full Name",
      "Barangay",
      "Sitio / Purok",
      "Sex",
      "Age",
      "Day 1 Deployment Status",
      "Assigned Purok / Location",
      "Priority Match Rank",
      "Specific Work Activity",
      "Deployed At",
    ];

    const rows = filteredList.map((d) => [
      `#${d.designatedNumber}`,
      `"${d.fullName.replace(/"/g, '""')}"`,
      `"${d.barangay}"`,
      `"${d.sitio}"`,
      d.sex,
      d.age || "N/A",
      d.isDeployed ? "DEPLOYED_DAY_1" : "AWAITING_DEPLOYMENT_SCAN",
      `"${d.assignedArea.replace(/"/g, '""')}"`,
      d.purokRank,
      `"${d.activityName.replace(/"/g, '""')}"`,
      d.deployedAt ? new Date(d.deployedAt).toLocaleString() : "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TUPAD_Day1_Deployment_Roster_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {/* 1. High-Impact KPI Grid for Day 1 Deployment */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Deployed Day 1 */}
        <div className="gov-card p-4.5 bg-white border-l-4 border-l-teal-600 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Day 1 Scanned & Deployed
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-black text-teal-700 font-mono">
              {summary.totalDay1Deployed}
            </p>
            <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
              {summary.deploymentRate}%
            </span>
          </div>
        </div>

        {/* Pending Deployment */}
        <div className="gov-card p-4.5 bg-white border-l-4 border-l-amber-500 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Pending Day 1 Scan
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-black text-amber-700 font-mono">
              {summary.pendingDeployment}
            </p>
            <span className="text-[11px] font-semibold text-slate-500">
              Of {summary.totalTarget} Total
            </span>
          </div>
        </div>

        {/* Male / Female Deployed */}
        <div className="gov-card p-4.5 bg-white border-l-4 border-l-gov-blue rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Gender Allocation
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-gov-blue flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-lg font-black text-slate-900 font-mono">
              <span className="text-blue-700">{summary.maleDeployed}M</span>
              <span className="text-slate-400 mx-1">•</span>
              <span className="text-pink-600">{summary.femaleDeployed}F</span>
            </p>
            <span className="text-[10px] text-slate-500 font-bold">
              Team Balance
            </span>
          </div>
        </div>

        {/* SC / PWD Deployed */}
        <div className="gov-card p-4.5 bg-white border-l-4 border-l-indigo-600 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              SC / PWD Deployed
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-black text-indigo-700 font-mono">
              {summary.scPwdDeployed}
            </p>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              Inclusive
            </span>
          </div>
        </div>
      </div>

      {/* 2. Work Program Area & Purok Quota Capacity Cards */}
      {workAreas.length > 0 && (
        <div className="gov-card p-4 bg-white rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-teal-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Purok / Sector Deployment Quota Progress
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">
              {workAreas.length} Work Program Sectors
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {workAreas.map((wa) => (
              <div
                key={wa.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 hover:border-teal-400 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-teal-700 uppercase block">
                      Brgy. {wa.barangay}
                    </span>
                    <h4 className="text-xs font-black text-slate-900 truncate">
                      {wa.area}
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 bg-teal-100 text-teal-900 rounded-md font-mono text-[10px] font-black shrink-0">
                    {wa.currentDeployed}/{wa.targetQuota}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-teal-600 h-1.5 rounded-full transition-all"
                    style={{
                      width: `${wa.targetQuota > 0 ? Math.min((wa.currentDeployed / wa.targetQuota) * 100, 100) : 0}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 font-mono">
                  <span>M: {wa.currentMale}/{wa.maleQuota}</span>
                  <span>F: {wa.currentFemale}/{wa.femaleQuota}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3 text-xs text-red-700">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">Tracking Board Error</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 3. Retracking Roster Table & Controls */}
      <div className="gov-card bg-white rounded-2xl shadow-xs overflow-hidden border border-slate-200">
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-2">
              <Compass className="w-5 h-5 text-teal-600" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Day 1 Activity Deployment Retracking Log
                </h3>
                <p className="text-xs text-slate-500">
                  Live tracking list of beneficiaries scanned, assigned Purok sectors, and timestamps
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 border border-slate-300"
                title="Export Day 1 Roster"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={fetchData}
                disabled={loading}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition border border-slate-300 disabled:opacity-50"
                title="Refresh Table"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-teal-600" : ""}`} />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              onClick={() => setFilterMode("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filterMode === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              All Beneficiaries ({deployments.length})
            </button>

            <button
              onClick={() => setFilterMode("DEPLOYED")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                filterMode === "DEPLOYED"
                  ? "bg-teal-700 text-white shadow-xs"
                  : "bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Scanned & Deployed ({summary.totalDay1Deployed})</span>
            </button>

            <button
              onClick={() => setFilterMode("PENDING")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                filterMode === "PENDING"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Day 1 Scan ({summary.pendingDeployment})</span>
            </button>

            <button
              onClick={() => setFilterMode("DIRECT_PUROK")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                filterMode === "DIRECT_PUROK"
                  ? "bg-indigo-700 text-white shadow-xs"
                  : "bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Nearest Purok Priority Match</span>
            </button>
          </div>

          {/* Search & Barangay Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, slot # (e.g. 10), sitio, or assigned area..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-600 text-slate-800"
              />
            </div>

            <div>
              <select
                value={selectedBrgy}
                onChange={(e) => setSelectedBrgy(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
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
                    <span>Beneficiary</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Home Sitio / Purok</th>
                <th className="py-3 px-4">Day 1 Assigned Location</th>
                <th className="py-3 px-4">Deployment Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    <span>Loading Day 1 deployment tracking board...</span>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Compass className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-slate-600">No records found matching filters</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Slot # */}
                    <td className="py-3.5 px-4 font-mono font-bold text-gov-blue">
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2 py-0.5 rounded-lg bg-teal-50 text-teal-900 border border-teal-200">
                          #{d.designatedNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {d.tableNumber || "T1"}
                        </span>
                      </div>
                    </td>

                    {/* Beneficiary */}
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 text-sm">
                        {d.fullName}
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                        <span>{d.sex}</span>
                        <span>•</span>
                        <span>{d.age ? `${d.age} yrs` : "Age N/A"}</span>
                        <span>•</span>
                        <span className="font-medium text-slate-700">{d.barangay}</span>
                      </div>
                    </td>

                    {/* Home Sitio */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">Sitio {d.sitio}</div>
                      <span className="text-[10px] text-slate-500">Registered Zone</span>
                    </td>

                    {/* Assigned Area & Nearest Purok Match */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
                          <span>{d.assignedArea}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`px-2 py-0.2 rounded-md text-[9px] font-bold ${
                              d.proximityScore >= 60
                                ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                : "bg-blue-100 text-blue-900 border border-blue-200"
                            }`}
                          >
                            {d.proximityScore >= 60 ? "🎯 Nearest Purok" : "📍 Sector"}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono truncate max-w-xs">
                            {d.activityName}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Deployment Status */}
                    <td className="py-3.5 px-4">
                      {d.isDeployed ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            <span>DEPLOYED (DAY 1)</span>
                          </span>
                          {d.deployedAt && (
                            <p className="text-[10px] text-slate-500">
                              {new Date(d.deployedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>AWAITING DAY 1 SCAN</span>
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onSelectBeneficiary(d.qrToken || d.designatedNumber)}
                        className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white font-bold text-[11px] rounded-lg shadow-xs transition inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3 h-3 text-gov-goldLight" />
                        <span>Format 2 Card</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-800">{filteredList.length}</strong> of{" "}
            <strong className="text-slate-800">{deployments.length}</strong> beneficiaries
          </span>
          <span className="font-semibold text-slate-600">
            PESO Dingalan • Day 1 Activity Deployment Board
          </span>
        </div>
      </div>
    </div>
  );
}
