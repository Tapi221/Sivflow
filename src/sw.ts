/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope;

self.addEventListener("install", (event) => {
  // Workbox InjectManifest marker: keep this in emitted JS
  const manifest = (self as any).__WB_MANIFEST;
  event.waitUntil(Promise.resolve(manifest));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// （任意）sw が空扱いされないように最低限の fetch フック
self.addEventListener("fetch", () => {});
