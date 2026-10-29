// PESO Dingalan - TUPAD Management System Service Worker
// Version: 1.0.2

const CACHE_NAME = "peso-tupad-cache-v4";
const IS_LOCAL_DEVELOPMENT = ["localhost", "127.0.0.1", "[::1]"].includes(self.location.hostname);
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  "/offline.html",
  "/manifest.json",
  "/images/peso-ec-access-emblem.gif",
];

// Install Event: Pre-cache core app shell & offline fallback assets
self.addEventListener("install", (event) => {
  if (IS_LOCAL_DEVELOPMENT) {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log("[SW] Pre-caching lightweight offline shell assets...");
      for (const url of PRECACHE_ASSETS) {
        try {
          const response = await fetch(url, { cache: "no-cache" });
          if (response.ok) {
            await cache.put(url, response);
          }
        } catch (err) {
          console.warn("[SW] Failed to pre-cache:", url, err);
        }
      }
    })
  );
  self.skipWaiting();
});

// Activate Event: Clear old cache versions and claim clients
self.addEventListener("activate", (event) => {
  if (IS_LOCAL_DEVELOPMENT) {
    // Runs even when stale React bundles stop the page from hydrating.
    event.waitUntil((async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name.startsWith("peso-tupad-cache-")).map((name) => caches.delete(name)));
      await self.clients.claim();
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      await Promise.all(clients.map((client) => client.navigate(client.url)));
    })());
    return;
  }
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith("peso-tupad-cache-") && cacheName !== CACHE_NAME) {
            console.log("[SW] Removing old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Handle Navigation and Asset Caching
self.addEventListener("fetch", (event) => {
  if (IS_LOCAL_DEVELOPMENT) return;

  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and internal extensions/browser schemes
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // 1. Navigation Requests (User opening pages e.g. /dashboard, /field/attendance)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          console.log("[SW] Network offline, serving cached navigation:", request.url);
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }

          // Try match dashboard or root
          const cachedDashboard = await caches.match("/dashboard");
          if (cachedDashboard) {
            return cachedDashboard;
          }

          // Fallback to offline page
          const offlinePage = await caches.match(OFFLINE_URL);
          return offlinePage || new Response("Offline Mode Active", { status: 200, headers: { "Content-Type": "text/html" } });
        })
    );
    return;
  }

  // 2. Next.js Static Bundles & CSS/JS Chunks (Cache-First with Background Update)
  if (url.pathname.startsWith("/_next/static/") || url.pathname.endsWith(".js") || url.pathname.endsWith(".css")) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch update in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse.ok) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            return new Response("", { status: 408 });
          });
      })
    );
    return;
  }

  // 3. Static Images, Logos, and Fonts
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|gif|ico|woff|woff2|ttf|eot)$/) ||
    url.pathname === "/manifest.json"
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        }).catch(() => new Response("", { status: 404 }));
      })
    );
    return;
  }

  // 4. API Requests (/api/v1/*) - Network Only (Handled by client-side Dexie IndexedDB when offline)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: "Offline mode active. Using local IndexedDB cache.", offline: true }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      })
    );
    return;
  }

  // Default fallback for any other requests
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
