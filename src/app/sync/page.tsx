"use client";

import React, { useEffect, useState } from "react";
import {
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Database,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Layers,
} from "lucide-react";
import { useOffline } from "@/context/OfflineContext";
import { offlineDb, pushSyncQueue, OfflineTransaction } from "@/lib/dexie";
import { formatDate } from "@/lib/utils";

export default function SyncCenterPage() {
  const { isOnline, pendingCount, isSyncing, syncNow, cacheProgramData } = useOffline();

  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [cachedBeneCount, setCachedBeneCount] = useState(0);
  const [queueItems, setQueueItems] = useState<OfflineTransaction[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    fetchPrograms();
    fetchOfflineStats();
  }, [pendingCount]);

  const fetchPrograms = async () => {
    try {
      const res = await fetch("/api/v1/programs");
      if (res.ok) {
        const data = await res.json();
        setPrograms(data.programs || []);
        if (data.programs?.length > 0) {
          setSelectedProgramId(data.programs[0].id);
        }
      }
    } catch (e) {}
  };

  const fetchOfflineStats = async () => {
    try {
      const bCount = await offlineDb.cachedBeneficiaries.count();
      setCachedBeneCount(bCount);

      const items = await offlineDb.offlineQueue.reverse().limit(30).toArray();
      setQueueItems(items);
    } catch (e) {}
  };

  const handleManualSync = async () => {
    const res = await syncNow();
    setLastSyncTime(new Date().toLocaleTimeString());
    fetchOfflineStats();
  };

  const handleCacheProgram = async () => {
    if (!selectedProgramId) return;
    await cacheProgramData(selectedProgramId);
    fetchOfflineStats();
    alert("Program masterlist and QR cryptographic tokens cached offline!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <RefreshCw className="w-6 h-6 text-gov-blue" />
            <span>Offline Synchronization & Conflict Center</span>
          </h1>
          <p className="text-xs text-slate-500">
            Monitor offline queue depth, preload remote datasets, and synchronize field transactions with idempotency
          </p>
        </div>

        <button
          onClick={handleManualSync}
          disabled={!isOnline || isSyncing || pendingCount === 0}
          className="px-4 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-gov-goldLight" : ""}`} />
          <span>{isSyncing ? "Synchronizing..." : "Sync Offline Queue Now"}</span>
        </button>
      </div>

      {/* Connectivity & Status Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className={`gov-card p-5 border-l-4 flex items-center space-x-4 shadow ${
            isOnline ? "border-l-emerald-600 bg-white" : "border-l-rose-600 bg-rose-50/40"
          }`}
        >
          <div
            className={`p-3 rounded-xl ${
              isOnline ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
            }`}
          >
            {isOnline ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Network State</p>
            <p className="text-lg font-black text-slate-900">{isOnline ? "Connected (Online)" : "Offline Mode"}</p>
          </div>
        </div>

        <div className="gov-card p-5 border-l-4 border-l-gov-gold bg-white flex items-center space-x-4 shadow">
          <div className="p-3 bg-amber-100 text-amber-800 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Pending Transactions</p>
            <p className="text-lg font-black text-slate-900">{pendingCount} in Queue</p>
          </div>
        </div>

        <div className="gov-card p-5 border-l-4 border-l-gov-blue bg-white flex items-center space-x-4 shadow">
          <div className="p-3 bg-blue-100 text-gov-blue rounded-xl">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Cached Beneficiaries</p>
            <p className="text-lg font-black text-slate-900">{cachedBeneCount} Records</p>
          </div>
        </div>
      </div>

      {/* Field Preloading Action Card */}
      <div className="gov-card p-6 bg-gradient-to-r from-slate-900 to-gov-blue text-white space-y-4 shadow-xl">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-gov-gold/20 text-gov-goldLight border border-gov-gold/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold tracking-tight text-white">Preload Program Dataset for Field Deployment</h2>
            <p className="text-xs text-blue-100">
              Before heading to remote coastal or mountainous barangays in Dingalan with zero internet, download the program's masterlist into your browser's encrypted IndexedDB storage.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <select
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
            className="flex-1 w-full px-3 py-2 text-xs border border-white/20 rounded-lg bg-slate-800 text-white font-bold focus:outline-none"
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.programCode} - {p.programName}
              </option>
            ))}
          </select>

          <button
            onClick={handleCacheProgram}
            className="w-full sm:w-auto px-5 py-2 bg-gov-gold hover:bg-gov-goldLight text-gov-dark font-extrabold text-xs rounded-lg shadow transition flex items-center justify-center space-x-1.5"
          >
            <Database className="w-4 h-4" />
            <span>Preload Offline Cache</span>
          </button>
        </div>
      </div>

      {/* Offline Queue Items Table */}
      <div className="gov-card overflow-hidden shadow">
        <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Recent Sync Queue Events ({queueItems.length})
          </h2>
          {lastSyncTime && (
            <span className="text-[11px] text-slate-400">Last Sync: {lastSyncTime}</span>
          )}
        </div>

        {queueItems.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">No offline transactions queued.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b">
                <tr>
                  <th className="px-4 py-2.5">Transaction ID</th>
                  <th className="px-4 py-2.5">Entity</th>
                  <th className="px-4 py-2.5">Operation</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {queueItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-bold text-gov-blue">{item.clientTransactionId}</td>
                    <td className="px-4 py-2.5 font-sans font-semibold text-slate-800">{item.entityType}</td>
                    <td className="px-4 py-2.5 text-slate-600">{item.operation}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === "SYNCED"
                            ? "bg-emerald-50 text-emerald-700"
                            : item.status === "PENDING"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{formatDate(item.createdAt, "yyyy-MM-dd HH:mm:ss")}</td>
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
