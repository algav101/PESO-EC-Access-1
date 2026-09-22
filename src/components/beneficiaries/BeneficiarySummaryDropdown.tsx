"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  MapPin,
  Users,
  UserCheck,
  Award,
  HeartHandshake,
  ShieldCheck,
  Search,
  Printer,
  Table as TableIcon,
  Layers,
  Sparkles,
  X,
  PieChart,
  Filter,
} from "lucide-react";

import {
  normalizeBarangayName,
  normalizeSitioName,
} from "@/lib/dingalan-groupings";

interface BeneficiarySummaryDropdownProps {
  beneficiaries: any[];
  programTitle?: string;
}

export interface PurokSummary {
  purokName: string;
  total: number;
  male: number;
  female: number;
  senior: number;
  pwd: number;
  ip: number;
  fourPs: number;
}

export interface BarangaySummary {
  barangayName: string;
  total: number;
  male: number;
  female: number;
  senior: number;
  pwd: number;
  ip: number;
  fourPs: number;
  puroks: PurokSummary[];
}

export function BeneficiarySummaryDropdown({
  beneficiaries,
  programTitle = "10-Day TUPAD Emergency Community Employment",
}: BeneficiarySummaryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBarangayFilter, setSelectedBarangayFilter] = useState("ALL");
  const [expandedBarangays, setExpandedBarangays] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"CARDS" | "TABLE">("CARDS");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Only close if click is not inside modal
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Calculate comprehensive demographic statistics
  const summaryData = useMemo(() => {
    const total = beneficiaries.length;
    let totalMale = 0;
    let totalFemale = 0;
    let totalSenior = 0;
    let totalPwd = 0;
    let totalIp = 0;
    let total4Ps = 0;

    const brgyMap: Record<string, {
      total: number;
      male: number;
      female: number;
      senior: number;
      pwd: number;
      ip: number;
      fourPs: number;
      puroks: Record<string, PurokSummary>;
    }> = {};

    beneficiaries.forEach((pb) => {
      const b = pb.beneficiary || {};
      const brgyName = normalizeBarangayName(b.barangay) || "Unspecified";
      const purokName = normalizeSitioName(b.sitio, b.barangay) || "Centro / General";
      const sex = (b.sex || "").toUpperCase();
      const isMale = sex.startsWith("M");
      const isFemale = sex.startsWith("F");
      const isSenior = Boolean(b.isSenior || (typeof b.age === "number" && b.age >= 60));
      const isPwd = Boolean(b.isPwd);
      const isIp = Boolean(b.isIp);
      const is4Ps = Boolean(b.is4Ps);

      if (isMale) totalMale++;
      if (isFemale) totalFemale++;
      if (isSenior) totalSenior++;
      if (isPwd) totalPwd++;
      if (isIp) totalIp++;
      if (is4Ps) total4Ps++;

      if (!brgyMap[brgyName]) {
        brgyMap[brgyName] = {
          total: 0,
          male: 0,
          female: 0,
          senior: 0,
          pwd: 0,
          ip: 0,
          fourPs: 0,
          puroks: {},
        };
      }

      const brgy = brgyMap[brgyName];
      brgy.total++;
      if (isMale) brgy.male++;
      if (isFemale) brgy.female++;
      if (isSenior) brgy.senior++;
      if (isPwd) brgy.pwd++;
      if (isIp) brgy.ip++;
      if (is4Ps) brgy.fourPs++;

      if (!brgy.puroks[purokName]) {
        brgy.puroks[purokName] = {
          purokName,
          total: 0,
          male: 0,
          female: 0,
          senior: 0,
          pwd: 0,
          ip: 0,
          fourPs: 0,
        };
      }

      const prk = brgy.puroks[purokName];
      prk.total++;
      if (isMale) prk.male++;
      if (isFemale) prk.female++;
      if (isSenior) prk.senior++;
      if (isPwd) prk.pwd++;
      if (isIp) prk.ip++;
      if (is4Ps) prk.fourPs++;
    });

    const barangays: BarangaySummary[] = Object.entries(brgyMap)
      .map(([barangayName, data]) => ({
        barangayName,
        total: data.total,
        male: data.male,
        female: data.female,
        senior: data.senior,
        pwd: data.pwd,
        ip: data.ip,
        fourPs: data.fourPs,
        puroks: Object.values(data.puroks).sort((a, b) => b.total - a.total || a.purokName.localeCompare(b.purokName)),
      }))
      .sort((a, b) => a.barangayName.localeCompare(b.barangayName));

    return {
      total,
      totalMale,
      totalFemale,
      totalSenior,
      totalPwd,
      totalIp,
      total4Ps,
      barangays,
    };
  }, [beneficiaries]);

  // Filter barangays for search/filter within dropdown
  const filteredBarangays = useMemo(() => {
    return summaryData.barangays.filter((b) => {
      const matchesSearch =
        searchTerm === "" ||
        b.barangayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.puroks.some((p) => p.purokName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesFilter =
        selectedBarangayFilter === "ALL" || b.barangayName === selectedBarangayFilter;
      return matchesSearch && matchesFilter;
    });
  }, [summaryData.barangays, searchTerm, selectedBarangayFilter]);

  const toggleBarangayExpand = (barangayName: string) => {
    setExpandedBarangays((prev) => ({
      ...prev,
      [barangayName]: !prev[barangayName],
    }));
  };

  const handleExpandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    summaryData.barangays.forEach((b) => {
      allExpanded[b.barangayName] = true;
    });
    setExpandedBarangays(allExpanded);
  };

  const handleCollapseAll = () => {
    setExpandedBarangays({});
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* 1. Main Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3.5 py-2 rounded-xl text-xs font-black shadow-sm flex items-center space-x-2 transition border ${
          isOpen
            ? "bg-slate-900 text-gov-gold border-amber-400 ring-2 ring-amber-400/30"
            : "bg-gradient-to-r from-slate-900 to-gov-blue text-white hover:brightness-110 border-slate-700"
        }`}
        title="View comprehensive summary of beneficiaries per barangay, purok, gender, SC, PWD, and IP"
      >
        <BarChart3 className="w-4 h-4 text-gov-gold" />
        <span className="tracking-tight">Summary of Beneficiaries</span>
        <span className="px-1.5 py-0.2 bg-gov-gold/20 text-gov-gold border border-gov-gold/40 rounded text-[10px] font-mono font-bold">
          {summaryData.total}
        </span>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-gov-gold" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
        )}
      </button>

      {/* 2. Interactive Demographic Summary Dropdown Panel / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full my-6 p-6 sm:p-8 space-y-6 shadow-2xl border-t-4 border-t-gov-blue max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-slate-900 text-gov-gold rounded-2xl border border-gov-gold/30 shadow-md">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                      Beneficiaries Demographic &amp; Geographic Summary
                    </h2>
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-300">
                      Official Masterlist
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Municipal summary per Barangay and Purok with Gender, Senior Citizen, PWD, and Indigenous Peoples (IP) metrics
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-xs border border-slate-200"
                  title="Print summary sheet"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Print / Save</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  title="Close summary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Container */}
            <div className="overflow-y-auto flex-1 space-y-6 pr-1">
              {/* Top Overview KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Total Beneficiaries */}
                <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Beneficiaries
                  </span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl sm:text-3xl font-black text-gov-gold font-mono">
                      {summaryData.total}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">11 Barangays</span>
                  </div>
                </div>

                {/* Male Beneficiaries */}
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">
                    Male (Kalalakihan)
                  </span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl sm:text-3xl font-black text-gov-blue font-mono">
                      {summaryData.totalMale}
                    </span>
                    <span className="text-[10px] font-bold text-blue-700">
                      {summaryData.total > 0
                        ? `${((summaryData.totalMale / summaryData.total) * 100).toFixed(1)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>

                {/* Female Beneficiaries */}
                <div className="p-3.5 bg-pink-50 border border-pink-200 rounded-2xl shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-pink-900 uppercase tracking-wider">
                    Female (Kababaihan)
                  </span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl sm:text-3xl font-black text-pink-700 font-mono">
                      {summaryData.totalFemale}
                    </span>
                    <span className="text-[10px] font-bold text-pink-700">
                      {summaryData.total > 0
                        ? `${((summaryData.totalFemale / summaryData.total) * 100).toFixed(1)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>

                {/* Senior Citizens */}
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1">
                    <Award className="w-3 h-3 text-amber-600" />
                    <span>Senior Citizens (SC)</span>
                  </span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl sm:text-3xl font-black text-amber-800 font-mono">
                      {summaryData.totalSenior}
                    </span>
                    <span className="text-[10px] font-bold text-amber-700">
                      {summaryData.total > 0
                        ? `${((summaryData.totalSenior / summaryData.total) * 100).toFixed(1)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>

                {/* PWD */}
                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider flex items-center space-x-1">
                    <HeartHandshake className="w-3 h-3 text-purple-600" />
                    <span>PWD</span>
                  </span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl sm:text-3xl font-black text-purple-800 font-mono">
                      {summaryData.totalPwd}
                    </span>
                    <span className="text-[10px] font-bold text-purple-700">
                      {summaryData.total > 0
                        ? `${((summaryData.totalPwd / summaryData.total) * 100).toFixed(1)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>

                {/* Indigenous Peoples (IP) */}
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>Katutubo (IP)</span>
                  </span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono">
                      {summaryData.totalIp}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700">
                      {summaryData.total > 0
                        ? `${((summaryData.totalIp / summaryData.total) * 100).toFixed(1)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Controls Bar: Search, View Mode, Expand/Collapse */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  {/* Search filter */}
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Filter by Barangay or Purok name..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-gov-blue"
                    />
                  </div>

                  {/* Barangay quick select */}
                  <select
                    value={selectedBarangayFilter}
                    onChange={(e) => setSelectedBarangayFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-gov-blue"
                  >
                    <option value="ALL">All Barangays (11)</option>
                    {summaryData.barangays.map((b) => (
                      <option key={b.barangayName} value={b.barangayName}>
                        {b.barangayName} ({b.total})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  {/* View Mode Toggle */}
                  <div className="flex bg-slate-200/80 p-0.5 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setActiveTab("CARDS")}
                      className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1 ${
                        activeTab === "CARDS"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Barangay &amp; Purok Cards</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("TABLE")}
                      className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1 ${
                        activeTab === "TABLE"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                      <span>Consolidated Table</span>
                    </button>
                  </div>

                  {activeTab === "CARDS" && (
                    <div className="hidden md:flex items-center space-x-1 text-xs">
                      <button
                        type="button"
                        onClick={handleExpandAll}
                        className="px-2.5 py-1 text-slate-600 hover:text-slate-900 font-bold hover:underline"
                      >
                        Expand All
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={handleCollapseAll}
                        className="px-2.5 py-1 text-slate-600 hover:text-slate-900 font-bold hover:underline"
                      >
                        Collapse All
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* VIEW 1: ACCORDION / CARDS VIEW WITH NESTED PUROK DETAILS */}
              {activeTab === "CARDS" && (
                <div className="space-y-3">
                  {filteredBarangays.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                      Walang nahanap na barangay o purok sa keyword na hinanap.
                    </div>
                  ) : (
                    filteredBarangays.map((b) => {
                      const isExpanded = Boolean(expandedBarangays[b.barangayName]);
                      const percentOfTotal =
                        summaryData.total > 0 ? ((b.total / summaryData.total) * 100).toFixed(1) : "0";

                      return (
                        <div
                          key={b.barangayName}
                          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-slate-300"
                        >
                          {/* Barangay Header Ribbon */}
                          <div
                            onClick={() => toggleBarangayExpand(b.barangayName)}
                            className="p-4 bg-gradient-to-r from-slate-50 via-white to-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-100/70 transition"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center flex-shrink-0 shadow-xs">
                                <MapPin className="w-4 h-4 text-gov-gold" />
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h3 className="text-sm font-black text-slate-900 uppercase">
                                    Barangay {b.barangayName}
                                  </h3>
                                  <span className="px-2 py-0.5 bg-blue-100 text-gov-blue font-mono font-black text-xs rounded-md">
                                    {b.total} Pax ({percentOfTotal}%)
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {b.puroks.length} Puroks/Sitios registered
                                </p>
                              </div>
                            </div>

                            {/* Demographics Pill Badges */}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              {/* Male / Female */}
                              <span className="px-2.5 py-1 bg-blue-50 text-gov-blue border border-blue-200 rounded-lg text-[11px] font-bold">
                                ♂ {b.male} Male
                              </span>
                              <span className="px-2.5 py-1 bg-pink-50 text-pink-700 border border-pink-200 rounded-lg text-[11px] font-bold">
                                ♀ {b.female} Female
                              </span>

                              {/* SC */}
                              <span
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                  b.senior > 0
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : "bg-slate-50 text-slate-400 border-slate-200"
                                }`}
                                title="Senior Citizens"
                              >
                                SC: {b.senior}
                              </span>

                              {/* PWD */}
                              <span
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                  b.pwd > 0
                                    ? "bg-purple-50 text-purple-800 border-purple-200"
                                    : "bg-slate-50 text-slate-400 border-slate-200"
                                }`}
                                title="Persons with Disability"
                              >
                                PWD: {b.pwd}
                              </span>

                              {/* IP */}
                              <span
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                  b.ip > 0
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-black"
                                    : "bg-slate-50 text-slate-400 border-slate-200"
                                }`}
                                title="Indigenous Peoples (Katutubo)"
                              >
                                IP: {b.ip}
                              </span>

                              <div className="pl-2">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-slate-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Nested Purok Table Breakdown */}
                          {isExpanded && (
                            <div className="border-t border-slate-200 bg-slate-50/50 p-4 animate-in fade-in">
                              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                                  Purok / Sitio Breakdown for Brgy. {b.barangayName} ({b.puroks.length} Areas)
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Total: {b.total} Beneficiaries
                                </span>
                              </div>

                              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                                    <tr>
                                      <th className="px-3 py-2">Purok / Sitio Name</th>
                                      <th className="px-3 py-2 text-center">Total Pax</th>
                                      <th className="px-3 py-2 text-center">Male (♂)</th>
                                      <th className="px-3 py-2 text-center">Female (♀)</th>
                                      <th className="px-3 py-2 text-center">Senior (SC)</th>
                                      <th className="px-3 py-2 text-center">PWD</th>
                                      <th className="px-3 py-2 text-center">Katutubo (IP)</th>
                                      <th className="px-3 py-2 text-center">4Ps Beneficiary</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                                    {b.puroks.map((prk) => (
                                      <tr key={prk.purokName} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-3 py-2 font-bold text-slate-900 flex items-center space-x-1.5">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                          <span>{prk.purokName}</span>
                                        </td>
                                        <td className="px-3 py-2 text-center font-mono font-bold text-gov-blue">
                                          {prk.total}
                                        </td>
                                        <td className="px-3 py-2 text-center font-mono text-slate-600">
                                          {prk.male}
                                        </td>
                                        <td className="px-3 py-2 text-center font-mono text-slate-600">
                                          {prk.female}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          {prk.senior > 0 ? (
                                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 font-bold rounded text-[10px]">
                                              {prk.senior}
                                            </span>
                                          ) : (
                                            <span className="text-slate-300">-</span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          {prk.pwd > 0 ? (
                                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-900 font-bold rounded text-[10px]">
                                              {prk.pwd}
                                            </span>
                                          ) : (
                                            <span className="text-slate-300">-</span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          {prk.ip > 0 ? (
                                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-900 font-bold rounded text-[10px]">
                                              {prk.ip}
                                            </span>
                                          ) : (
                                            <span className="text-slate-300">-</span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          {prk.fourPs > 0 ? (
                                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-900 font-bold rounded text-[10px]">
                                              {prk.fourPs}
                                            </span>
                                          ) : (
                                            <span className="text-slate-300">-</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* VIEW 2: CONSOLIDATED FULL-MUNICIPALITY TABLE MATRIX */}
              {activeTab === "TABLE" && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
                  <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-gov-gold">
                      Dingalan Consolidated Masterlist Summary Table (11 Barangays)
                    </span>
                    <span className="text-[11px] text-slate-300 font-mono">
                      Total: {summaryData.total} Beneficiaries
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">Barangay Name</th>
                          <th className="px-4 py-3 text-center">Puroks Count</th>
                          <th className="px-4 py-3 text-center font-mono">Total Beneficiaries</th>
                          <th className="px-4 py-3 text-center">Male (♂)</th>
                          <th className="px-4 py-3 text-center">Female (♀)</th>
                          <th className="px-4 py-3 text-center">Senior (SC)</th>
                          <th className="px-4 py-3 text-center">PWD</th>
                          <th className="px-4 py-3 text-center">Katutubo (IP)</th>
                          <th className="px-4 py-3 text-center">% of Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {summaryData.barangays.map((b, idx) => {
                          const pct =
                            summaryData.total > 0 ? ((b.total / summaryData.total) * 100).toFixed(1) : "0";
                          return (
                            <tr key={b.barangayName} className="hover:bg-slate-50 transition-colors font-medium">
                              <td className="px-4 py-2.5 font-mono text-slate-400 font-bold">{idx + 1}</td>
                              <td className="px-4 py-2.5 font-bold text-slate-900">
                                Barangay {b.barangayName}
                              </td>
                              <td className="px-4 py-2.5 text-center font-mono text-slate-600">
                                {b.puroks.length}
                              </td>
                              <td className="px-4 py-2.5 text-center font-mono font-black text-gov-blue">
                                {b.total}
                              </td>
                              <td className="px-4 py-2.5 text-center font-mono text-slate-700">{b.male}</td>
                              <td className="px-4 py-2.5 text-center font-mono text-slate-700">{b.female}</td>
                              <td className="px-4 py-2.5 text-center font-mono">
                                {b.senior > 0 ? (
                                  <span className="font-bold text-amber-800">{b.senior}</span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-center font-mono">
                                {b.pwd > 0 ? (
                                  <span className="font-bold text-purple-800">{b.pwd}</span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-center font-mono">
                                {b.ip > 0 ? (
                                  <span className="font-bold text-emerald-800">{b.ip}</span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-500">
                                {pct}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* Grand Total Footer */}
                      <tfoot className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-700">
                        <tr>
                          <td className="px-4 py-3" colSpan={2}>
                            MUNICIPALITY GRAND TOTAL (DINGALAN)
                          </td>
                          <td className="px-4 py-3 text-center font-mono">
                            {summaryData.barangays.reduce((acc, b) => acc + b.puroks.length, 0)} Puroks
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-gov-gold text-sm">
                            {summaryData.total}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-blue-300">
                            {summaryData.totalMale}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-pink-300">
                            {summaryData.totalFemale}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-amber-300">
                            {summaryData.totalSenior}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-purple-300">
                            {summaryData.totalPwd}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-emerald-300">
                            {summaryData.totalIp}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-gov-gold">100.0%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>* Data source: Official PESO Dingalan Masterlist Roster.</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow transition"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
