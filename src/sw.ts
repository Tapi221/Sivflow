/// <reference lib="WebWorker" />

import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  precacheAndRoute,
  matchPrecache,
} from 'workbox-precaching'
import { registerRoute, setCatchHandler } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'

declare let self: ServiceWorkerGlobalScope

declare global {
  interface ServiceWorkerGlobalScope {
    __WB_MANIFEST: Array<{ url: string; revision?: string | null }>
  }
}

const cacheVersion =
  (import.meta as any).env?.VITE_BUILD_VERSION ||
  (import.meta as any).env?.GITHUB_SHA ||
  'dev'

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  ({ request }) => request.mode === 'navigate',
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
)

registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'worker',
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
)

setCatchHandler(async ({ event }) => {
  if (event.request.mode === 'navigate') {
    const response =
      (await matchPrecache('/offline.html')) ??
      (await matchPrecache('offline.html'))
    return response ?? Response.error()
  }

  return Response.error()
})

export {}
