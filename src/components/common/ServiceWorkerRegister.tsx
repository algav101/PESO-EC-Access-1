"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Dev chunk URLs are reused across builds and even across local projects.
      // A cache-first worker can mix incompatible React/Next runtimes.
      const isLocalHost = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
      if (process.env.NODE_ENV !== "production" || isLocalHost) {
        let cancelled = false;
        const clearDevWorker = async () => {
          const workerPath = new URL("/sw.js", window.location.origin).href;
          const controller = navigator.serviceWorker.controller;
          const controlledByApp = controller?.scriptURL.split("?")[0] === workerPath;
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations
            .filter((registration) => [registration.active, registration.waiting, registration.installing]
              .some((worker) => worker?.scriptURL.split("?")[0] === workerPath))
            .map((registration) => registration.unregister()));
          if ("caches" in window) {
            const names = await caches.keys();
            await Promise.all(names.filter((name) => name.startsWith("peso-tupad-cache-")).map((name) => caches.delete(name)));
          }
          if (controlledByApp && !cancelled) window.location.reload();
        };
        void clearDevWorker().catch((error) => console.warn("[PWA] Development cache cleanup failed:", error));
        return () => { cancelled = true; };
      }

      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
          });
          console.log("[PWA] Service Worker registered successfully with scope:", registration.scope);

          // Listen for updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("[PWA] New offline update available.");
                }
              };
            }
          };
        } catch (error) {
          console.warn("[PWA] Service Worker registration error:", error);
        }
      };

      // Register immediately or after window load
      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
        return () => window.removeEventListener("load", registerSW);
      }
    }
  }, []);

  return null;
}
