"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  offlineDb,
  pushSyncQueue,
  getPendingQueueCount,
  initializeUserOfflineCache,
} from "@/lib/dexie";
import { useAuth } from "./AuthContext";

interface OfflineContextType {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: string | null;
  syncNotice: string | null;
  syncNow: () => Promise<any>;
  cacheProgramData: (programId: string) => Promise<void>;
  refreshOfflineCache: () => Promise<void>;
  dismissNotice: () => void;
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  pendingCount: 0,
  isSyncing: false,
  lastSyncTime: null,
  syncNotice: null,
  syncNow: async () => {},
  cacheProgramData: async () => {},
  refreshOfflineCache: async () => {},
  dismissNotice: () => {},
});

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const refreshPending = useCallback(async () => {
    try {
      const count = await getPendingQueueCount();
      setPendingCount(count);
    } catch (e) {}
  }, []);

  const dismissNotice = () => setSyncNotice(null);

  // Auto-sync function: Pushes pending mutations and refreshes local IndexedDB
  const executeAutoSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      // 1. Push pending offline mutations
      const res = await pushSyncQueue();
      await refreshPending();

      // 2. Refresh local offline cache with newest server data
      if (user) {
        await initializeUserOfflineCache(user);
      }

      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setLastSyncTime(now);

      if (res.accepted && res.accepted > 0) {
        setSyncNotice(`Auto-synced ${res.accepted} offline record(s) to server successfully at ${now}.`);
        setTimeout(() => setSyncNotice(null), 7000);
      }
      return res;
    } catch (error) {
      console.error("Auto-sync error:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshPending, user]);

  const syncNow = async () => {
    return await executeAutoSync();
  };

  const refreshOfflineCache = async () => {
    if (user) {
      setIsSyncing(true);
      try {
        await initializeUserOfflineCache(user);
        const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setLastSyncTime(now);
        setSyncNotice(`Offline cache refreshed for ${user.fullName} (${user.assignedBarangay ? 'Brgy. ' + user.assignedBarangay : 'Municipality-wide'}).`);
        setTimeout(() => setSyncNotice(null), 5000);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const cacheProgramData = async (programId: string) => {
    if (user) {
      await initializeUserOfflineCache(user);
    }
  };

  // Initial user cache bootstrap when user logs in
  useEffect(() => {
    if (user && isOnline) {
      initializeUserOfflineCache(user).then(() => {
        refreshPending();
      });
    }
  }, [user, isOnline, refreshPending]);

  // Online / Offline & Polling Heartbeat
  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const handleOnlineEvent = () => {
      setIsOnline(true);
      executeAutoSync();
    };

    const handleOfflineEvent = () => {
      setIsOnline(false);
      setSyncNotice("Device is now Offline. Changes will be saved locally and auto-synced when connection returns.");
      setTimeout(() => setSyncNotice(null), 6000);
    };

    const handleAttendanceUpdate = () => {
      refreshPending();
    };

    window.addEventListener("online", handleOnlineEvent);
    window.addEventListener("offline", handleOfflineEvent);
    window.addEventListener("tupad-attendance-updated", handleAttendanceUpdate);
    window.addEventListener("tupad-offline-synced", handleAttendanceUpdate);

    // Periodic heartbeat (every 10s) to test real connectivity and auto-sync
    const heartbeatInterval = setInterval(async () => {
      if (typeof navigator === "undefined") return;

      try {
        const pingRes = await fetch("/api/v1/health", { method: "GET", cache: "no-store" });
        if (pingRes.ok) {
          if (!isOnline) {
            setIsOnline(true);
            executeAutoSync();
          } else {
            // If already online and has pending queue, auto-flush
            const pending = await getPendingQueueCount();
            setPendingCount(pending);
            if (pending > 0 && !isSyncing) {
              executeAutoSync();
            }
          }
        } else {
          setIsOnline(false);
        }
      } catch (err) {
        setIsOnline(false);
      }
    }, 10000);

    refreshPending();

    return () => {
      window.removeEventListener("online", handleOnlineEvent);
      window.removeEventListener("offline", handleOfflineEvent);
      window.removeEventListener("tupad-attendance-updated", handleAttendanceUpdate);
      window.removeEventListener("tupad-offline-synced", handleAttendanceUpdate);
      clearInterval(heartbeatInterval);
    };
  }, [executeAutoSync, isOnline, isSyncing, refreshPending]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingCount,
        isSyncing,
        lastSyncTime,
        syncNotice,
        syncNow,
        cacheProgramData,
        refreshOfflineCache,
        dismissNotice,
      }}
    >
      {/* Global Sync Notification Banner */}
      {syncNotice && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700 text-xs flex items-start justify-between space-x-3 animate-fadeIn">
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <p className="font-medium leading-tight">{syncNotice}</p>
          </div>
          <button
            onClick={dismissNotice}
            className="text-slate-400 hover:text-white font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  return useContext(OfflineContext);
}
