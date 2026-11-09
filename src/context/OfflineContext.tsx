"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { pushSyncQueue, getPendingQueueCount, initializeUserOfflineCache, forceMasterSyncWithServer, recoverInterruptedSync } from "@/lib/dexie";
import { useAuth } from "./AuthContext";

interface OfflineContextType {
  isOnline: boolean; pendingCount: number; isSyncing: boolean; lastSyncTime: string | null; syncNotice: string | null;
  syncNow: () => Promise<any>; masterSyncNow: () => Promise<any>;
  cacheProgramData: (programId: string) => Promise<void>; refreshOfflineCache: () => Promise<void>; dismissNotice: () => void;
}
const OfflineContext = createContext<OfflineContextType>({
  isOnline: true, pendingCount: 0, isSyncing: false, lastSyncTime: null, syncNotice: null,
  syncNow: async () => {}, masterSyncNow: async () => {}, cacheProgramData: async () => {},
  refreshOfflineCache: async () => {}, dismissNotice: () => {},
});

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const busy = useRef(false);
  const authBlocked = useRef(false);
  const refreshPending = useCallback(async () => {
    try { setPendingCount(await getPendingQueueCount()); }
    catch { setSyncNotice("Cannot read this device's offline queue. Do not clear browser data."); }
  }, []);
  const markSuccess = () => setLastSyncTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

  const executeAutoSync = useCallback(async (manual = false) => {
    if (!user || busy.current || !navigator.onLine || (authBlocked.current && !manual)) return;
    busy.current = true;
    setIsSyncing(true);
    try {
      const result = await pushSyncQueue();
      authBlocked.current = result.authRequired;
      await refreshPending();
      const uploaded = result.accepted.length + result.duplicates.length;
      if (result.authRequired) setSyncNotice("Upload needs an authorized login. Sign in again on this device, then retry. Your unsynced records are still saved here.");
      else if (result.remaining) setSyncNotice(uploaded + " acknowledged; " + result.remaining + " still on this device. Open Offline Sync Center for failed uploads or conflicts.");
      else {
        markSuccess();
        if (uploaded || manual) setSyncNotice(uploaded + " record(s) acknowledged by the server. Queue is clear.");
      }
      if (!result.remaining) {
        try { await initializeUserOfflineCache(user); }
        catch { setSyncNotice("Uploads checked, but the latest server cache could not be downloaded. Existing cache was kept."); }
      }
      return result;
    } catch (error: any) { setSyncNotice(error.message || "Sync interrupted. Records remain on this device; please retry."); }
    finally { busy.current = false; setIsSyncing(false); await refreshPending(); }
  }, [user, refreshPending]);

  const masterSyncNow = async () => {
    if (!user || busy.current) return;
    busy.current = true;
    setIsSyncing(true);
    try {
      const result = await forceMasterSyncWithServer(user);
      if (result.success) {
        markSuccess();
        setSyncNotice("Master Sync complete: " + result.beneficiariesCount + " beneficiaries and " + result.attendanceCount + " attendance records downloaded (" + result.scope + ").");
      } else setSyncNotice(result.error);
      return result;
    } finally { busy.current = false; setIsSyncing(false); await refreshPending(); }
  };

  const refreshOfflineCache = async () => {
    if (!user || busy.current) return;
    busy.current = true;
    setIsSyncing(true);
    try {
      await initializeUserOfflineCache(user);
      setSyncNotice("Server cache downloaded. Unsynced scans are retained separately until acknowledged.");
    } catch (error: any) { setSyncNotice(error.message || "Cache download failed. Existing cache was kept."); }
    finally { busy.current = false; setIsSyncing(false); await refreshPending(); }
  };

  useEffect(() => {
    authBlocked.current = false;
    if (!user) return;
    const timer = setTimeout(() => {
      void recoverInterruptedSync().then(() => executeAutoSync()).catch(() => refreshPending());
    }, 1500);
    return () => clearTimeout(timer);
  }, [user, executeAutoSync, refreshPending]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const attempt = () => { if (!document.hidden && navigator.onLine) void executeAutoSync(); };
    const online = () => { setIsOnline(true); attempt(); };
    const offline = () => {
      setIsOnline(false);
      setSyncNotice("Offline: scans are saved on this device only until the server acknowledges their upload.");
    };
    const queueChanged = (event: Event) => {
      void refreshPending();
      if ((event as CustomEvent).detail?.enqueued) {
        clearTimeout(debounce);
        debounce = setTimeout(attempt, 1000);
      }
    };
    const refresh = () => { void refreshPending(); };
    const heartbeat = setInterval(async () => {
      if (document.hidden || !user) return;
      try {
        const response = await fetch("/api/v1/health", { cache: "no-store", signal: AbortSignal.timeout(10000) });
        setIsOnline(response.ok);
        if (response.ok && await getPendingQueueCount() > 0) attempt();
      } catch { setIsOnline(false); }
    }, 45000);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    window.addEventListener("focus", attempt);
    document.addEventListener("visibilitychange", attempt);
    window.addEventListener("tupad-queue-updated", queueChanged);
    window.addEventListener("tupad-offline-synced", refresh);
    window.addEventListener("tupad-attendance-updated", refresh);
    void refreshPending();
    return () => {
      clearInterval(heartbeat);
      clearTimeout(debounce);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.removeEventListener("focus", attempt);
      document.removeEventListener("visibilitychange", attempt);
      window.removeEventListener("tupad-queue-updated", queueChanged);
      window.removeEventListener("tupad-offline-synced", refresh);
      window.removeEventListener("tupad-attendance-updated", refresh);
    };
  }, [executeAutoSync, refreshPending, user]);

  return (
    <OfflineContext.Provider value={{
      isOnline, pendingCount, isSyncing, lastSyncTime, syncNotice,
      syncNow: () => executeAutoSync(true), masterSyncNow,
      cacheProgramData: async () => { await refreshOfflineCache(); },
      refreshOfflineCache, dismissNotice: () => setSyncNotice(null),
    }}>
      {syncNotice && (
        <div role="status" className="fixed bottom-4 right-4 z-50 max-w-sm bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700 text-xs flex items-start justify-between gap-3">
          <p className="font-medium leading-tight">{syncNotice}</p>
          <button aria-label="Dismiss sync notice" onClick={() => setSyncNotice(null)} className="text-slate-300">Close</button>
        </div>
      )}
      {children}
    </OfflineContext.Provider>
  );
}
export function useOffline() { return useContext(OfflineContext); }
