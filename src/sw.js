const cacheName = "GridFarmer-v1";
const cacheData = [
  "/src/main.js",
  "/src/style.css",
  "/icon.svg",
  "/index.html"
];

self.addEventListener("install", (e) => {
  console.log("[Service Worker] Install");
  e.waitUntil((async () => {
    console.log("[Service Worker] Opening cache");
    const cache = await caches.open(cacheName);
    console.log("[Service Worker] Caching files");
    await cache.addAll(cacheData);
    console.log("[Service Worker] Cached files");
  })());
});

self.addEventListener("fetch", (e) => {
  e.respondWith((async () => {
    console.log(`[Service Worker] Looking up file: ${e.request.url}`);
    let response = await caches.match(e.request);
    if (response && response.ok) {
      console.log(`[Service Worker] File ${e.request.url} already cached`);
    } else {
      console.log(`[Service Worker] Fetching file ${e.request.url} from remote`);
      response = await fetch(e.request);
      if (response && response.ok) {
        console.log(`[Service Worker] Opening cache`);
        const cache = await caches.open(cacheName);
        console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
        cache.put(e.request, response.clone());
      } else {
        console.log(`[Service Worker] Failed to fetch file ${e.request.url}`);
      }
    }
    return response;
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key !== cacheName) {
        caches.delete(key);
      }
    }
  }));
});