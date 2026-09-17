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
  MapPin,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useOffline } from "@/context/OfflineContext";
import { useAuth } from "@/context/AuthContext";
import { offlineDb, OfflineTransaction } from "@/lib/dexie";
import { formatDate } from "@/lib/utils";

export default function SyncCenterPage() {
  const { user } = useAuth();
  const {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncTime,
    syncNow,
    refreshOfflineCache,
  } = useOffline();

  const [cachedBeneCount, setCachedBeneCount] = useState(0);
  const [cachedProgramCount, setCachedProgramCount] = useState(0);
  const [cachedWpCount, setCachedWpCount] = useState(0);
  const [cachedAttendanceCount, setCachedAttendanceCount] = useState(0);
  const [queueItems, setQueueItems] = useState<OfflineTransaction[]>([]);
  const [activeScope, setActiveScope] = useState<string>("Municipality-wide");

  useEffect(() => {
    fetchOfflineStats();
  }, [pendingCount, isSyncing]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const scope = localStorage.getItem("tupad_offline_scope");
      if (scope) setActiveScope(scope);
      else if (user?.role === "TUPAD_COORDINATOR" && user.assignedBarangay) {
        setActiveScope(`Barangay ${user.assignedBarangay}`);
      }
    }
  }, [user]);

  const fetchOfflineStats = async () => {
    try {
      const bCount = await offlineDb.cachedBeneficiaries.count();
      const pCount = await offlineDb.cachedPrograms.count();
      const wpCount = await offlineDb.cachedWorkProgramItems.count();
      const attCount = await offlineDb.offlineAttendanceRecords.count();
      setCachedBeneCount(bCount);
      setCachedProgramCount(pCount);
      setCachedWpCount(wpCount);
      setCachedAttendanceCount(attCount);

      const items = await offlineDb.offlineQueue.reverse().limit(50).toArray();
      setQueueItems(items);
    } catch (e) {}
  };

  const handleManualSync = async () => {
    await syncNow();
    fetchOfflineStats();
  };

  const handleRefreshCache = async () => {
    await refreshOfflineCache();
    fetchOfflineStats();
  };

  const handleClearSyncedQueue = async () => {
    try {
      await offlineDb.offlineQueue.where("status").equals("SYNCED").delete();
      fetchOfflineStats();
    } catch (e) {}
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
            Automated offline-first database with instant auto-sync on reconnect for Dingalan field staff
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={handleRefreshCache}
            disabled={!isOnline || isSyncing}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-sm flex items-center space-x-1.5 transition disabled:opacity-50"
            title="Download latest programs and assigned barangay beneficiaries"
          >
            <Database className="w-3.5 h-3.5 text-gov-blue" />
            <span>Refresh Offline Cache</span>
          </button>

          <button
            onClick={handleManualSync}
            disabled={!isOnline || isSyncing || pendingCount === 0}
            className="px-4 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-gov-goldLight" : ""}`} />
            <span>{isSyncing ? "Synchronizing..." : `Sync Queue (${pendingCount})`}</span>
          </button>
        </div>
      </div>

      {/* User Scope & Auto-Sync Status Card */}
      <div className="p-4 bg-gradient-to-r from-slate-900 to-gov-blue text-white rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-white/10 rounded-xl border border-white/20">
            <UserCheck className="w-6 h-6 text-gov-goldLight" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-white">{user?.fullName || "Staff Account"}</span>
              <span className="px-2 py-0.5 bg-gov-gold/20 text-gov-goldLight border border-gov-gold/30 rounded text-[10px] font-mono font-bold uppercase">
                {user?.role ? user.role.replace(/_/g, " ") : "Coordinator"}
              </span>
            </div>
            <p className="text-xs text-blue-100 flex items-center space-x-1 mt-0.5">
              <MapPin className="w-3 h-3 text-amber-300" />
              <span>Offline Database Scope: <strong>{activeScope}</strong></span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs bg-black/20 p-2.5 rounded-xl border border-white/10">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <div className="leading-tight">
            <span className="font-bold text-white block">Auto-Sync Engine Active</span>
            <span className="text-[11px] text-blue-200">
              {lastSyncTime ? `Last Synced: ${lastSyncTime}` : "Auto-flushes queue whenever signal connects"}
            </span>
          </div>
        </div>
      </div>

      {/* Connectivity & Status Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className={`gov-card p-4 border-l-4 flex items-center space-x-3.5 shadow ${
            isOnline ? "border-l-emerald-600 bg-white" : "border-l-rose-600 bg-rose-50/40"
          }`}
        >
          <div
            className={`p-2.5 rounded-xl ${
              isOnline ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
            }`}
          >
            {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Connection State</p>
            <p className="text-sm font-black text-slate-900">{isOnline ? "Online (Auto-Sync)" : "Offline Mode"}</p>
          </div>
        </div>

        <div className="gov-card p-4 border-l-4 border-l-gov-gold bg-white flex items-center space-x-3.5 shadow">
          <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Pending Sync Queue</p>
            <p className="text-sm font-black text-slate-900">{pendingCount} Offline Action(s)</p>
          </div>
        </div>

        <div className="gov-card p-4 border-l-4 border-l-gov-blue bg-white flex items-center space-x-3.5 shadow">
          <div className="p-2.5 bg-blue-100 text-gov-blue rounded-xl">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Installed Unit Roster</p>
            <p className="text-sm font-black text-slate-900">{cachedBeneCount} Beneficiaries</p>
          </div>
        </div>

        <div className="gov-card p-4 border-l-4 border-l-purple-600 bg-white flex items-center space-x-3.5 shadow">
          <div className="p-2.5 bg-purple-100 text-purple-800 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Local Attendance Logs</p>
            <p className="text-sm font-black text-slate-900">{cachedAttendanceCount} Scanned Logs</p>
          </div>
        </div>
      </div>

      {/* Offline Queue Items Table */}
      <div className="gov-card overflow-hidden shadow">
        <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Offline Transaction Journal ({queueItems.length})
          </h2>
          {queueItems.some((q) => q.status === "SYNCED") && (
            <button
              onClick={handleClearSyncedQueue}
              className="text-[11px] text-slate-500 hover:text-rose-600 font-semibold flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Synced Logs</span>
            </button>
          )}
        </div>

        {queueItems.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            No offline transactions queued. All field operations are completely synchronized with the central database.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b">
                <tr>
                  <th className="px-4 py-2.5">Client Transaction ID</th>
                  <th className="px-4 py-2.5">Entity</th>
                  <th className="px-4 py-2.5">Operation</th>
                  <th className="px-4 py-2.5">Sync Status</th>
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
