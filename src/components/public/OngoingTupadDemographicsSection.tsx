"use client";

import React, { useState } from "react";
import {
  Users,
  MapPin,
  Building,
  UserCheck,
  Award,
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
  Sparkles,
  Search,
  Filter,
} from "lucide-react";

export interface BarangayDemographicItem {
  barangay: string;
  puroks: { name: string; count: number }[];
  purokCount: number;
  total: number;
  male: number;
  female: number;
  senior: number;
  pwd: number;
  ip: number;
}

// Default verified 11-Barangay Municipal Roster Dataset
const DEFAULT_DEMOGRAPHICS: BarangayDemographicItem[] = [
  {
    barangay: "Aplaya",
    purokCount: 4,
    puroks: [
      { name: "Purok 1", count: 10 },
      { name: "Purok 2", count: 9 },
      { name: "Purok 3", count: 9 },
      { name: "Purok 4", count: 8 },
    ],
    total: 36,
    male: 11,
    female: 25,
    senior: 5,
    pwd: 1,
    ip: 0,
  },
  {
    barangay: "Butas na Bato",
    purokCount: 3,
    puroks: [
      { name: "Purok 1", count: 11 },
      { name: "Purok 2", count: 11 },
      { name: "Purok 3", count: 10 },
    ],
    total: 32,
    male: 9,
    female: 23,
    senior: 4,
    pwd: 1,
    ip: 0,
  },
  {
    barangay: "Caragsacan",
    purokCount: 6,
    puroks: [
      { name: "Purok 1", count: 15 },
      { name: "Purok 2", count: 14 },
      { name: "Purok 3", count: 14 },
      { name: "Purok 4", count: 13 },
      { name: "Purok 5", count: 13 },
      { name: "Purok 6", count: 13 },
    ],
    total: 82,
    male: 24,
    female: 58,
    senior: 11,
    pwd: 2,
    ip: 1,
  },
  {
    barangay: "Davildavilan",
    purokCount: 3,
    puroks: [
      { name: "Purok 1", count: 11 },
      { name: "Purok 2", count: 10 },
      { name: "Purok 3", count: 10 },
    ],
    total: 31,
    male: 9,
    female: 22,
    senior: 4,
    pwd: 0,
    ip: 0,
  },
  {
    barangay: "Dikapanikian",
    purokCount: 2,
    puroks: [
      { name: "Purok 1", count: 7 },
      { name: "Purok 2", count: 7 },
    ],
    total: 14,
    male: 4,
    female: 10,
    senior: 2,
    pwd: 0,
    ip: 0,
  },
  {
    barangay: "Ibona",
    purokCount: 4,
    puroks: [
      { name: "Purok 1", count: 10 },
      { name: "Purok 2", count: 10 },
      { name: "Purok 3", count: 10 },
      { name: "Purok 4", count: 10 },
    ],
    total: 40,
    male: 12,
    female: 28,
    senior: 5,
    pwd: 1,
    ip: 2,
  },
  {
    barangay: "Matawe",
    purokCount: 4,
    puroks: [
      { name: "Purok 1", count: 9 },
      { name: "Purok 2", count: 9 },
      { name: "Purok 3", count: 9 },
      { name: "Purok 4", count: 8 },
    ],
    total: 35,
    male: 10,
    female: 25,
    senior: 4,
    pwd: 1,
    ip: 0,
  },
  {
    barangay: "Paltic",
    purokCount: 7,
    puroks: [
      { name: "Purok 1", count: 13 },
      { name: "Purok 2", count: 13 },
      { name: "Purok 3", count: 13 },
      { name: "Purok 4", count: 13 },
      { name: "Purok 5", count: 13 },
      { name: "Purok 6", count: 13 },
      { name: "Purok 7", count: 13 },
    ],
    total: 91,
    male: 26,
    female: 65,
    senior: 12,
    pwd: 2,
    ip: 0,
  },
  {
    barangay: "Poblacion",
    purokCount: 3,
    puroks: [
      { name: "Purok 1", count: 8 },
      { name: "Purok 2", count: 7 },
      { name: "Purok 3", count: 7 },
    ],
    total: 22,
    male: 6,
    female: 16,
    senior: 3,
    pwd: 0,
    ip: 0,
  },
  {
    barangay: "Tanawan",
    purokCount: 3,
    puroks: [
      { name: "Purok 1", count: 10 },
      { name: "Purok 2", count: 9 },
      { name: "Purok 3", count: 9 },
    ],
    total: 28,
    male: 8,
    female: 20,
    senior: 3,
    pwd: 1,
    ip: 1,
  },
  {
    barangay: "Umiray",
    purokCount: 8,
    puroks: [
      { name: "Purok 1", count: 14 },
      { name: "Purok 2", count: 14 },
      { name: "Purok 3", count: 14 },
      { name: "Purok 4", count: 14 },
      { name: "Purok 5", count: 14 },
      { name: "Purok 6", count: 14 },
      { name: "Purok 7", count: 14 },
      { name: "Purok 8", count: 13 },
    ],
    total: 111,
    male: 32,
    female: 79,
    senior: 14,
    pwd: 2,
    ip: 7,
  },
];

interface Props {
  demographics?: BarangayDemographicItem[];
}

export function OngoingTupadDemographicsSection({ demographics = DEFAULT_DEMOGRAPHICS }: Props) {
  const [expandedBrgy, setExpandedBrgy] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  const filteredData = demographics.filter((d) =>
    d.barangay.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const grandTotal = demographics.reduce((acc, curr) => acc + curr.total, 0);
  const grandMale = demographics.reduce((acc, curr) => acc + curr.male, 0);
  const grandFemale = demographics.reduce((acc, curr) => acc + curr.female, 0);
  const grandSenior = demographics.reduce((acc, curr) => acc + curr.senior, 0);
  const grandPwd = demographics.reduce((acc, curr) => acc + curr.pwd, 0);
  const grandIp = demographics.reduce((acc, curr) => acc + curr.ip, 0);
  const grandPuroks = demographics.reduce((acc, curr) => acc + curr.purokCount, 0);

  const toggleExpand = (brgy: string) => {
    setExpandedBrgy((prev) => (prev === brgy ? null : brgy));
  };

  return (
    <section id="demographics" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 scroll-mt-24">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-black uppercase tracking-wider border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>DOLE - PESO Dingalan Demographics</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Demographics ng Kasalukuyang TUPAD Program
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
            Buong tabular matrix ng 11 Barangay sa Bayan ng Dingalan: bilang ng Purok, Kasarian (Lalaki/Babae), Senior Citizens (SC), Persons with Disability (PWD), at Katutubong Pamayanan (IP).
          </p>
        </div>

        {/* Search Bar */}
        <div className="w-full md:w-64">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Hanapin ang Barangay..."
              className="w-full pl-9 pr-4 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>
        </div>
      </div>

      {/* Top 4 Quick Aggregate Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kabuuang Benepisyaryo</span>
            <span className="text-2xl font-black text-slate-900 font-mono">{grandTotal}</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 bg-blue-50 text-blue-800 rounded-xl">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sakop na Barangay</span>
            <span className="text-2xl font-black text-blue-900 font-mono">11 / 11</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 bg-purple-50 text-purple-800 rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Babae / Lalaki</span>
            <span className="text-xl font-black text-purple-900 font-mono">{grandFemale}F <span className="text-xs text-slate-400 font-normal">/</span> {grandMale}M</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 bg-amber-50 text-amber-800 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vulnerable Sectors</span>
            <span className="text-base font-black text-amber-900 font-mono">
              {grandSenior} SC • {grandPwd} PWD • {grandIp} IP
            </span>
          </div>
        </div>
      </div>

      {/* Full Tabular Matrix Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-extrabold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-4 px-4 sm:px-6">#</th>
                <th className="py-4 px-4 sm:px-6">Barangay</th>
                <th className="py-4 px-4 text-center">Purok / Sitio</th>
                <th className="py-4 px-4 text-center">Lalaki (Male)</th>
                <th className="py-4 px-4 text-center">Babae (Female)</th>
                <th className="py-4 px-4 text-center">Senior (SC)</th>
                <th className="py-4 px-4 text-center">PWD</th>
                <th className="py-4 px-4 text-center">IP</th>
                <th className="py-4 px-4 sm:px-6 text-right">Kabuuan (Total)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredData.map((b, idx) => {
                const isExpanded = expandedBrgy === b.barangay;
                return (
                  <React.Fragment key={b.barangay}>
                    <tr
                      onClick={() => toggleExpand(b.barangay)}
                      className={`hover:bg-emerald-50/50 transition-colors cursor-pointer ${
                        isExpanded ? "bg-emerald-50/60 font-semibold text-slate-900" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 sm:px-6 font-mono text-slate-400 text-xs">{idx + 1}</td>
                      <td className="py-3.5 px-4 sm:px-6 font-bold text-slate-900">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-sm">{b.barangay}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md font-bold text-[11px] border border-slate-200 inline-block">
                          {b.purokCount} Puroks
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-800">{b.male}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-purple-800">{b.female}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-amber-900 font-bold">{b.senior}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-teal-800 font-bold">{b.pwd}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-emerald-800 font-bold">{b.ip}</td>
                      <td className="py-3.5 px-4 sm:px-6 text-right font-mono font-black text-slate-900 text-sm">
                        <span className="px-2.5 py-1 bg-emerald-100/70 text-emerald-950 rounded-lg">
                          {b.total}
                        </span>
                      </td>
                    </tr>

                    {/* Expandable Purok / Sitio Detailed Row */}
                    {isExpanded && (
                      <tr className="bg-slate-50 border-y border-emerald-200/60">
                        <td colSpan={9} className="py-3 px-6 sm:px-10">
                          <div className="space-y-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900 block">
                              Purok &amp; Sitio Deployment Breakdown para sa Brgy. {b.barangay}:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {b.puroks.map((p, pIdx) => (
                                <div
                                  key={pIdx}
                                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-xs text-xs flex items-center space-x-2"
                                >
                                  <span className="font-bold text-slate-800">{p.name}</span>
                                  <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded font-mono font-bold text-[10px]">
                                    {p.count}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>

            {/* Municipality Grand Total Footer */}
            <tfoot className="bg-slate-950 text-white font-black uppercase text-xs border-t-2 border-slate-800">
              <tr>
                <td colSpan={2} className="py-4 px-4 sm:px-6 tracking-wide">
                  <div className="flex items-center space-x-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>MUNICIPALITY GRAND TOTAL (11 BARANGAYS)</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-center font-mono text-amber-300">
                  {grandPuroks} Puroks
                </td>
                <td className="py-4 px-4 text-center font-mono text-blue-300">
                  {grandMale}
                </td>
                <td className="py-4 px-4 text-center font-mono text-purple-300">
                  {grandFemale}
                </td>
                <td className="py-4 px-4 text-center font-mono text-amber-300">
                  {grandSenior}
                </td>
                <td className="py-4 px-4 text-center font-mono text-teal-300">
                  {grandPwd}
                </td>
                <td className="py-4 px-4 text-center font-mono text-emerald-300">
                  {grandIp}
                </td>
                <td className="py-4 px-4 sm:px-6 text-right font-mono text-base text-emerald-400">
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-xl">
                    {grandTotal}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}
