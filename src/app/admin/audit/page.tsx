"use client";

import React, { useEffect, useState } from "react";
import { History, Search, Filter, ShieldCheck, User, Calendar, FileText, ShieldAlert, ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { isAdminUser } from "@/lib/permissions";

export default function AuditLogsPage() {
  const { user, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && isAdminUser(user)) {
      fetchLogs();
    } else if (!authLoading && user && !isAdminUser(user)) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/v1/audit");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Role Gate: Only DOMAIN_MASTER and PESO_ADMIN can view this page
  if (!authLoading && user && !isAdminUser(user)) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="gov-card p-8 text-center space-y-4 border-t-4 border-t-rose-600 bg-white shadow-xl">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-black text-slate-900 tracking-tight">Access Restricted</h1>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              The Immutable System Audit Trail contains privileged government operational event records and is strictly restricted to <strong className="text-slate-900">PESO Dingalan Admin Officers</strong>.
            </p>
          </div>
          <div className="pt-3">
            <a
              href="/dashboard"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-gov-blue hover:bg-gov-dark text-white rounded-xl text-xs font-bold transition shadow"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const filtered = logs.filter((l) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      l.action.toLowerCase().includes(q) ||
      (l.user?.fullName && l.user.fullName.toLowerCase().includes(q)) ||
      (l.metadata && l.metadata.toLowerCase().includes(q));
    const matchesAction = actionFilter === "ALL" || l.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
          <History className="w-6 h-6 text-gov-blue" />
          <span>Immutable System Audit Trail</span>
        </h1>
        <p className="text-xs text-slate-500">
          Append-only government event log tracking all authentication, imports, QR generations, attendances, and payouts
        </p>
      </div>

      {/* Filter Bar */}
      <div className="gov-card p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit trail by actor, action, or metadata..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-gov-blue bg-white"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500">Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 font-semibold focus:outline-none focus:border-gov-blue"
          >
            <option value="ALL">All Actions</option>
            <option value="LOGIN_SUCCESS">Login Success</option>
            <option value="PROGRAM_CREATED">Program Created</option>
            <option value="BENEFICIARIES_IMPORTED">Beneficiaries Imported</option>
            <option value="QR_BATCH_GENERATED">QR Batch Generated</option>
            <option value="STUB_DISTRIBUTED">Stub Distributed</option>
            <option value="ORIENTATION_SCANNED">Orientation Scanned</option>
            <option value="ATTENDANCE_SCANNED">Attendance Scanned</option>
            <option value="BENEFICIARY_REPLACED">Beneficiary Replaced</option>
            <option value="PAYOUT_VERIFIED">Payout Verified</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="gov-card overflow-hidden shadow">
        <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Displaying {filtered.length} Audit Events
          </span>
          <span className="text-[11px] text-slate-400 italic">Append-Only • Non-Deletable</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading audit records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No matching audit events found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Actor / User</th>
                  <th className="px-4 py-3">Entity Type</th>
                  <th className="px-4 py-3">Metadata & Diffs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatDate(log.createdAt, "yyyy-MM-dd HH:mm:ss")}
                    </td>
                    <td className="px-4 py-3 font-bold text-gov-blue">
                      <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-sans font-bold text-slate-900">
                      {log.user?.fullName || "System Engine"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-sans">
                      {log.entityType || "SYSTEM"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                      {log.metadata || log.newData || "-"}
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
