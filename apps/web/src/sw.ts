/// <reference lib="WebWorker" />

import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import type { PrecacheEntry } from "workbox-precaching";
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from "workbox-precaching";
import { registerRoute, setCatchHandler } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";



declare global {
  interface ServiceWorkerGlobalScope {
    // Workbox が定義している型に合わせる（TS2717潰し）
    __WB_MANIFEST: Array<string | PrecacheEntry>;
  }
}
// Vite の import.meta.env を any なしで読む（ESLint no-explicit-any潰し）
type ViteEnv = {
  VITE_BUILD_VERSION?: string;
  GITHUB_SHA?: string;
};



declare let self: ServiceWorkerGlobalScope;
const env = (import.meta as ImportMeta & { env?: ViteEnv; }).env;
const cacheVersion = env?.VITE_BUILD_VERSION ?? env?.GITHUB_SHA ?? "dev";



self.addEventListener("message", (event) => {
  if (event.data && (event.data as { type?: string; }).type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: `html-navigation-cache-${cacheVersion}`,
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60,
      }),
    ],
  }),
);
registerRoute(
  ({ request }) =>
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "worker",
  new CacheFirst({
    cacheName: `static-assets-cache-${cacheVersion}`,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
);
// setCatchHandler の event は型が広くて request が無い扱いになることがあるので、
// Workbox のコールバック引数にある request を使う（TS2339潰し）
setCatchHandler(async ({ request }) => {
  if (request.mode === "navigate") {
    const response =
      (await matchPrecache("/offline.html")) ??
      (await matchPrecache("offline.html"));
    return response ?? Response.error();
  }
  return Response.error();
});



export {};
