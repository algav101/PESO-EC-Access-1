"use client";

import React, { useEffect, useState } from "react";
import { ShieldAlert, Search, CheckCircle, Calendar, ArrowRight, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/utils";

export default function RestrictionsPage() {
  const [restrictions, setRestrictions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestrictions();
  }, []);

  const fetchRestrictions = async () => {
    try {
      const res = await fetch("/api/v1/restrictions");
      if (res.ok) {
        const data = await res.json();
        setRestrictions(data.restrictions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = restrictions.filter((r) => {
    const name = r.beneficiary?.fullName?.toLowerCase() || "";
    return name.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
            <span>365-Day Restriction Compliance Database</span>
          </h1>
          <p className="text-xs text-slate-500">
            Automated registry of beneficiaries who received TUPAD payouts within the statutory 365-day lockout window
          </p>
        </div>

        <a
          href="/restrictions/checker"
          className="px-4 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5 transition self-start sm:self-auto"
        >
          <Search className="w-4 h-4 text-gov-goldLight" />
          <span>Real-Time Eligibility Checker</span>
        </a>
      </div>

      {/* Search Bar */}
      <div className="gov-card p-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search restricted beneficiaries by full name..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-gov-blue bg-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="gov-card overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Restricted Individuals ({filtered.length})
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading restriction records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No active restrictions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b">
                <tr>
                  <th className="px-4 py-3">Beneficiary Name</th>
                  <th className="px-4 py-3">Birthday</th>
                  <th className="px-4 py-3">Source Program</th>
                  <th className="px-4 py-3">Payout Date</th>
                  <th className="px-4 py-3">Lockout Start</th>
                  <th className="px-4 py-3">Eligible Again On</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {r.beneficiary?.fullName}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {r.beneficiary?.birthday}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {r.sourceProgram?.programName || "Previous TUPAD Program"}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {formatDate(r.payoutDate, "yyyy-MM-dd")}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {r.restrictionStart}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-rose-700">
                      {r.restrictionEnd}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
