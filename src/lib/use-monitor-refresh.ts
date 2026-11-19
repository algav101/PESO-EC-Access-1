"use client";

import { useEffect, useRef } from "react";

/** DOM events only reach this window. Poll for writes made on other devices. */
export function useMonitorRefresh(refresh: () => Promise<unknown>, enabled: boolean, intervalMs = 15000) {
  const callback = useRef(refresh);
  callback.current = refresh;
  useEffect(() => {
    if (!enabled) return;
    let running = false;
    let stopped = false;
    const run = async () => {
      if (stopped || document.hidden || running) return;
      running = true;
      try { await callback.current(); } catch { /* Keep the view's existing data. */ }
      finally { running = false; }
    };
    const timer = setInterval(run, intervalMs);
    const events = ["focus", "online", "tupad-offline-synced", "tupad-cache-updated", "tupad-queue-updated", "tupad-photos-updated", "tupad-program-updated"];
    events.forEach(name => window.addEventListener(name, run));
    const onStorage = (event: StorageEvent) => { if (event.key === "tupad_program_schedule_updated") void run(); };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", run);
    return () => {
      stopped = true;
      clearInterval(timer);
      events.forEach(name => window.removeEventListener(name, run));
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", run);
    };
  }, [enabled, intervalMs]);
}
