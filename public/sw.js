// ImmonIQ Service Worker — Offline-Cache für Dashboard & Tresor
// Strategie: Network-First für HTML/API, Cache-First für statische Assets
const VERSION = "immoniq-v1";
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;
const HTML_CACHE = `html-${VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/icon-512.png",
];

// Routen die offline verfügbar sein sollen
const OFFLINE_ROUTES = ["/app", "/app/vault", "/install"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => null))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => !n.endsWith(VERSION))
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Nur GET, nur same-origin
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // OAuth-Routen NIEMALS cachen
  if (url.pathname.startsWith("/~oauth")) return;
  // Auth/Supabase-Calls nie cachen
  if (url.pathname.startsWith("/auth")) return;

  // HTML / Navigation: Network-First mit 3s-Timeout, Fallback Cache
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await Promise.race([
            fetch(request),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
          ]);
          const cache = await caches.open(HTML_CACHE);
          cache.put(request, (fresh as Response).clone());
          return fresh as Response;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          // Fallback: Root-HTML (SPA-Shell)
          const shell = await caches.match("/");
          if (shell) return shell;
          return new Response(
            "<h1>Offline</h1><p>Bitte Verbindung prüfen.</p>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        }
      })()
    );
    return;
  }

  // Statische Assets (JS/CSS/Fonts/Bilder): Cache-First
  if (/\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }
});

// Update-Trigger vom Client
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

// Push-Empfang (optional, für künftige Server-Push via VAPID)
self.addEventListener("push", (event) => {
  let data = { title: "ImmonIQ", body: "Neue Aktivität", url: "/app" };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-512.png",
      badge: "/icon-512.png",
      data: { url: data.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/app";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) { c.navigate(url); return c.focus(); }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
