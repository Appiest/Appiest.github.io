// Offline support for OA Practice IDE.
// The page itself is network-first, so updates show when online. Everything else is cache-first.
const VENDOR = "oa-vendor-v1";
const PAGES = "oa-pages-v1";
const VENDOR_FILES = [
 "vendor/codemirror/matchbrackets.js",
 "vendor/codemirror/closebrackets.js",
 "vendor/codemirror/active-line.js",
 "vendor/codemirror/codemirror.js",
 "vendor/codemirror/python.js",
 "vendor/pyodide/pyodide.asm.wasm",
 "vendor/pyodide/pyodide-lock.json",
 "vendor/pyodide/pyodide.js",
 "vendor/pyodide/pyodide.asm.js",
 "vendor/pyodide/python_stdlib.zip"
];
const PAGE_FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const pages = await caches.open(PAGES);
    await pages.addAll(PAGE_FILES);
    self.skipWaiting();
    try {
      const v = await caches.open(VENDOR);
      await v.addAll(VENDOR_FILES);
      notify("cached");
    } catch (err) {
      await caches.delete(VENDOR);
      notify("cache-failed");
    }
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keep = [VENDOR, PAGES];
    for (const k of await caches.keys()) if (!keep.includes(k)) await caches.delete(k);
    await self.clients.claim();
    if (await caches.has(VENDOR)) notify("cached");
  })());
});

async function notify(type) {
  for (const c of await self.clients.matchAll({ includeUncontrolled: true })) c.postMessage({ type });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isPage = req.mode === "navigate" || url.pathname.endsWith("/index.html");
  if (isPage) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const c = await caches.open(PAGES);
        c.put("index.html", res.clone());
        return res;
      } catch (err) {
        return (await caches.match("index.html")) || (await caches.match("./"));
      }
    })());
    return;
  }
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok || res.type === "opaque") {
        const c = await caches.open(PAGES);
        c.put(req, res.clone());
      }
      return res;
    } catch (err) {
      return new Response("", { status: 504 });
    }
  })());
});
