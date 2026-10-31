// ALHUSAINIA Enterprise Service Worker (v7.4.0) — High-Performance Offline & Auto-Update Engine.
// Network-first for navigations (offline → cached app shell), cache-first for
// static assets, stale-while-revalidate for catalog, and background sync for mutations.
const CACHE = "alhusainia-v7.4.0";
const CATALOG_CACHE = "alhusainia-catalog-v1";
const MUTATION_CACHE = "alhusainia-mutations-v1";

const SHELL = [
  "/",
  "/index.html",
  "/offline.html",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/favicon-32x32.png",
];

// Populated at BUILD time by scripts/build-server.cjs
const PRECACHE_ASSETS = /*__ASSET_MANIFEST__*/ [];

// Discover Vite entry assets from index.html
async function precacheEntryAssets(cache) {
  try {
    const res = await fetch("/index.html");
    if (!res.ok) return;
    const html = await res.text();
    const assetUrls = Array.from(
      html.matchAll(/(?:href|src)="(\/assets\/[^"]+)"/g),
      m => m[1]
    );
    if (assetUrls.length > 0) {
      await cache.addAll(assetUrls).catch(() => {});
    }
  } catch {
    // index.html unreachable at install — assets get cached on first fetch.
  }
}

// ─── Install ──────────────────────────────────────────────────
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE)
      .then(c => c.addAll([...SHELL, ...PRECACHE_ASSETS]).catch(() => {}))
      .then(() => caches.open(CACHE))
      .then(precacheEntryAssets)
  );
});

// ─── Activate: Purge Stale Caches & Claim Clients ────────────
self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(
              k => k !== CACHE && k !== CATALOG_CACHE && k !== MUTATION_CACHE
            )
            .map(k => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
      .then(async () => {
        // Broadcast to clients that activation is complete
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) {
          client.postMessage({ type: "SW_ACTIVATED", version: "v7.4.0" });
        }
      })
  );
});

// ─── Client Messages & Commands ──────────────────────────────
self.addEventListener("message", event => {
  if (!event.data) return;

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data.type === "GET_VERSION") {
    event.ports[0]?.postMessage({ version: "v7.4.0" });
  }

  if (event.data.type === "LOCAL_NOTIFY") {
    const { title, body, tag, data } = event.data;
    self.registration.showNotification(title || "تنبيه الحسينية", {
      body: body || "",
      icon: "/icon-192.png",
      badge: "/favicon-32x32.png",
      tag: tag || "local",
      dir: "rtl",
      lang: "ar",
      data: data || { url: "/app" },
    });
  }
});

// ─── Background Sync for Offline Mutations ────────────────────
self.addEventListener("sync", event => {
  if (event.tag === "sync-mutations") {
    event.waitUntil(
      (async () => {
        try {
          const cache = await caches.open(MUTATION_CACHE);
          const requests = await cache.keys();
          for (const req of requests) {
            try {
              const res = await fetch(req);
              if (res.ok) {
                await cache.delete(req);
              }
            } catch {
              // Retry on next sync event
            }
          }
        } catch (error) {
          console.error("[SW] Sync failed:", error);
        }
      })()
    );
  }
});

// ─── Periodic Background Sync ─────────────────────────────────
self.addEventListener("periodicsync", event => {
  if (event.tag === "periodic-data-sync") {
    event.waitUntil(
      (async () => {
        try {
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: "PERIODIC_SYNC",
              timestamp: Date.now(),
            });
          });
        } catch (error) {
          console.error("[SW] Periodic sync failed:", error);
        }
      })()
    );
  }
});

// ─── Push Notifications ───────────────────────────────────────
self.addEventListener("push", event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : "تنبيه" };
  }
  const title = data.title || "تنبيه من الحسينية لخدمات الأعمال";
  const body = data.body || data.message || "إشعار جديد في نظام Uamex ERP";
  const tag = data.tag || "push";
  const url = data.url || "/app";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/favicon-32x32.png",
      tag,
      dir: "rtl",
      lang: "ar",
      data: { url },
      actions: [
        { action: "view", title: "عرض" },
        { action: "dismiss", title: "تجاهل" },
      ],
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url || "/app";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then(clients => {
      for (const c of clients) {
        if (c.url.includes(self.location.origin) && "focus" in c) {
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

// ─── Fetch Handling with Advanced Routing & Offline Fallback ──
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore cross-origin non-GET requests
  if (url.origin !== self.location.origin && req.method !== "GET") return;

  // Public catalog: stale-while-revalidate
  if (
    url.origin === self.location.origin &&
    url.pathname === "/api/web/catalog"
  ) {
    event.respondWith(
      caches.open(CATALOG_CACHE).then(cache =>
        cache.match(req).then(cached => {
          const network = fetch(req)
            .then(res => {
              if (res && res.ok) {
                const copy = res.clone();
                cache.put(req, copy);
              }
              return res;
            })
            .catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  // Never cache tenant API responses
  if (url.pathname.startsWith("/api/")) {
    if (req.method === "POST" && url.pathname.includes("/api/trpc")) {
      // Offline mutation interceptor
      event.respondWith(
        fetch(req).catch(async () => {
          try {
            const cache = await caches.open(MUTATION_CACHE);
            await cache.put(req, req.clone());
            if ("sync" in self.registration) {
              await self.registration.sync.register("sync-mutations");
            }
          } catch {}
          return new Response(JSON.stringify({ queued: true, offline: true }), {
            status: 202,
            headers: { "Content-Type": "application/json" },
          });
        })
      );
    }
    return;
  }

  // SPA navigation: Network-first with cached shell fallback
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches
            .match("/index.html", { ignoreSearch: true })
            .then(shell => shell || caches.match("/offline.html"))
        )
    );
    return;
  }

  // Static assets: Cache-first with background network update
  if (req.method === "GET") {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req)
          .then(res => {
            const isAsset =
              res &&
              res.ok &&
              (url.pathname.startsWith("/assets/") ||
                /\.(png|svg|webp|ico|webmanifest|css|js|woff2?)$/.test(
                  url.pathname
                ));
            if (isAsset) {
              const copy = res.clone();
              caches.open(CACHE).then(c => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
      })
    );
  }
});
