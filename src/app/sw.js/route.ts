/**
 * Service worker, served at /sw.js. After the first visit Slyd runs from the
 * browser's cache: app code, fonts and the editor pages load locally, so a
 * returning visitor costs the server next to nothing and works offline.
 *
 * Generated at build time so every deploy gets a new cache version.
 */
export const dynamic = "force-static";

const VERSION = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.SOURCE_COMMIT || String(Date.now())).slice(0, 12);

const sw = (v: string) => `/* Slyd service worker ${v} */
const V = "slyd-${v}";
const STATIC = V + "-static", PAGES = V + "-pages", FONTS = "slyd-fonts";
const SHELL = ["/", "/app", "/app/new", "/app/edit", "/agents", "/manifest.webmanifest", "/icon-192.png", "/icon.svg"];
const SIX_HOURS = 6 * 3600 * 1000;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(PAGES).then((c) => Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("slyd-") && k !== FONTS && !k.startsWith(V)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

const stamp = async (res) => {
  const h = new Headers(res.headers);
  h.set("x-slyd-cached-at", String(Date.now()));
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: h });
};

async function cacheFirst(cacheName, req) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") cache.put(req, res.clone());
  return res;
}

/** Answer from the cache instantly; refresh it in the background at most every six hours. */
async function staleWhileRevalidate(key, req) {
  const cache = await caches.open(PAGES);
  const hit = await cache.match(key);
  const refresh = () =>
    fetch(req.mode === "navigate" ? new Request(key, { credentials: "same-origin" }) : req)
      .then(async (res) => {
        if (res.ok) await cache.put(key, await stamp(res.clone()));
        return res;
      });
  if (hit) {
    const age = Date.now() - Number(hit.headers.get("x-slyd-cached-at") || 0);
    if (age > SIX_HOURS) refresh().catch(() => {});
    return hit;
  }
  return refresh();
}

/** Fresh when online (marketing pages change), the cached copy when not. */
async function networkFirst(key, req) {
  const cache = await caches.open(PAGES);
  try {
    const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error("slow")), 3000))]);
    if (res.ok) cache.put(key, await stamp(res.clone()));
    return res;
  } catch (err) {
    const hit = await cache.match(key);
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) {
    if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") e.respondWith(cacheFirst(FONTS, req));
    return; // photos, GitHub, etc. go straight to their own servers
  }
  const p = url.pathname;
  if (p.startsWith("/mcp") || p.startsWith("/api/") || p === "/sw.js" || p.startsWith("/_vercel/")) return;

  // Hashed build files never change: keep them forever.
  if (p.startsWith("/_next/static/") || /\.(?:woff2?|png|svg|ico|jpg|webp)$/.test(p)) return e.respondWith(cacheFirst(STATIC, req));

  // The editor's pages: carousel links (/c/<name>) are the /app/new page; the query string is read in the browser.
  const isApp = p === "/app" || p.startsWith("/app/") || p.startsWith("/c/");
  const page = p.startsWith("/c/") ? "/app/new" : p;
  if (req.mode === "navigate") return e.respondWith(isApp ? staleWhileRevalidate(page, req) : networkFirst(page, req));
  if (isApp && (req.headers.get("RSC") === "1" || url.searchParams.has("_rsc"))) return e.respondWith(staleWhileRevalidate(page + "::rsc", req));
});
`;

export function GET() {
  return new Response(sw(VERSION), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
