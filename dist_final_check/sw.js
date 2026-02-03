// Service Worker for Flash Master
const CACHE_NAME = 'flash-master-v3';
const RUNTIME_CACHE = 'flash-master-runtime-v3';

// キャッシュするリソース
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// インストール時の処理
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// アクティベート時の処理
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// フェッチ時の処理（Network First戦略）
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Firebase関連、エミュレータ、Chrome拡張機能のリクエストはキャッシュせずパススルー
  if (
    event.request.url.includes('firebase') ||
    event.request.url.includes('googleapis') ||
    event.request.url.includes('firebaseio') ||
    event.request.url.includes('firebasestorage.googleapis.com') ||
    url.hostname === 'localhost' && (url.port === '9199' || url.port === '8080' || url.port === '9099') ||
    event.request.url.startsWith('chrome-extension://') ||
    event.request.method !== 'GET' ||
    // ハッシュ付きアセット（Viteビルド物）はRuntime Cacheに入れない。
    // Firebase HostingのCache-Control: immutable でブラウザキャッシュに任せる。
    url.pathname.includes('/assets/')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // レスポンスをクローンしてキャッシュに保存
        // index.htmlはキャッシュしない（常にネットワーク最新を優先し、バージョン不整合を防ぐ）
        if (response && response.status === 200 && !url.pathname.endsWith('/') && !url.pathname.endsWith('index.html')) {
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // ネットワークエラー時はキャッシュから取得
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // キャッシュにもない場合はオフライン用のフォールバック
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
