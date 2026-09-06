// Kasette service worker.
// Makes the app installable and serves it 100% offline (cache-first shell).
// Imported audio does NOT live here: it lives as a Blob in IndexedDB (store.js).
const CACHE = "kasette-v1";
const SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./store.js",
  "./meta.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // blob:/data: URIs are not intercepted (local audio and cover art).
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  e.respondWith(
    caches.match(e.request).then((hit) =>
      hit || fetch(e.request).then((res) => {
        if (res.ok && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match("./index.html")),
    ),
  );
});
