import '@/services/localdb';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './styles/index.css'
import 'katex/dist/katex.min.css'
import App from './App'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { startTabPresence } from '@/utils/tabPresence'

// Manifest検証（デバッグ用・開発環境のみ）
if (import.meta.env.DEV && typeof window !== 'undefined') {
  fetch('/manifest.webmanifest')
    .then(async (res) => {
      const text = await res.text();
      console.log('[Manifest Debug] Status:', res.status);
      console.log('[Manifest Debug] Content-Type:', res.headers.get('content-type'));
      console.log('[Manifest Debug] First 100 chars:', text.substring(0, 100));
      if (!text.trim().startsWith('{')) {
        console.error('[Manifest Debug] ⚠️ Manifest is NOT JSON! Got HTML or other format.');
      } else {
        console.log('[Manifest Debug] ✅ Manifest appears to be valid JSON');
      }
    })
    .catch((err) => {
      console.error('[Manifest Debug] ❌ Failed to fetch manifest:', err);
    });
}

const CHUNK_RELOAD_KEY = '__hard_reload_once__'
const VITE_PRELOAD_RELOAD_KEY = '__vite_preload_reload__'
const SW_CONTROLLER_RELOAD_KEY = '__sw_controller_reload__'
const BUILD_VERSION = import.meta.env.VITE_BUILD_VERSION ?? import.meta.env.MODE

startTabPresence()

const CHUNK_ERROR_PATTERNS = [
  'Loading chunk',
  'ChunkLoadError',
  'dynamically imported module',
  'Failed to fetch dynamically imported module',
  'Unexpected token <',
  'MIME type of "text/html"',
]

function toErrorText(input: unknown): string {
  if (typeof input === 'string') return input
  if (input instanceof Error) return `${input.name}: ${input.message}`
  if (input && typeof input === 'object') {
    try {
      return JSON.stringify(input)
    } catch {
      return String(input)
    }
  }
  return String(input ?? '')
}

function isChunkLoadError(input: unknown): boolean {
  const text = toErrorText(input)
  return CHUNK_ERROR_PATTERNS.some((pattern) => text.includes(pattern))
}

function hardReloadOnce(key = CHUNK_RELOAD_KEY): void {
  if (sessionStorage.getItem(key)) return
  sessionStorage.setItem(key, '1')
  window.location.reload()
}

function logBootstrapFault(kind: string, detail: Record<string, unknown>): void {
  const payload = {
    kind,
    detail,
    buildVersion: BUILD_VERSION,
    href: window.location.href,
    online: navigator.onLine,
    timestamp: new Date().toISOString(),
  }

  console.error('[Bootstrap Fault]', payload)

  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.getRegistration().then((registration) => {
      console.error('[Bootstrap Fault:SW]', {
        hasController: Boolean(navigator.serviceWorker.controller),
        scope: registration?.scope,
        activeState: registration?.active?.state ?? null,
        waitingState: registration?.waiting?.state ?? null,
        installingState: registration?.installing?.state ?? null,
      })
    })
  }
}

window.addEventListener(
  'error',
  (event) => {
    const errorEvent = event as ErrorEvent
    const target = event.target as HTMLScriptElement | null
    const hasAssetScriptTarget = Boolean(target?.src && target.src.includes('/assets/'))
    const message = [errorEvent.message, errorEvent.error, target?.src].filter(Boolean).map(toErrorText).join(' ')

    if (isChunkLoadError(message) || hasAssetScriptTarget) {
      logBootstrapFault('window.error', {
        message,
        filename: errorEvent.filename,
        lineno: errorEvent.lineno,
        colno: errorEvent.colno,
      })
      hardReloadOnce()
    }
  },
  true,
)

window.addEventListener('unhandledrejection', (event) => {
  const reason = toErrorText(event.reason)
  if (isChunkLoadError(reason)) {
    logBootstrapFault('window.unhandledrejection', { reason })
    hardReloadOnce()
  }
})

window.addEventListener('vite:preloadError' as any, () => {
  logBootstrapFault('vite.preloadError', {})
  hardReloadOnce(VITE_PRELOAD_RELOAD_KEY)
})

// Service Workerの登録（本番環境のみ）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // Production verification:
  // - DevTools Console: `typeof window.repairTags`
  // - DevTools Console: `await window.repairTags()` or `await window.repairTags('<uid>')`
  // - Application > Service Workers に `waiting` が残る場合:
  //   1. この起動処理が `SKIP_WAITING` を送る
  //   2. 反映されない場合は `registration.waiting?.postMessage({ type: 'SKIP_WAITING' })`
  //   3. その後 `controllerchange` により一度だけ reload される
  const applyWaitingWorker = (registration: ServiceWorkerRegistration) => {
    const waiting = registration.waiting
    if (!waiting) return
    waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  const installUpdateFlow = (registration: ServiceWorkerRegistration) => {
    const installing = registration.installing
    if (!installing) return

    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed' && navigator.serviceWorker.controller) {
        logBootstrapFault('sw.update.installed', {
          scope: registration.scope,
          state: installing.state,
        })
        applyWaitingWorker(registration)
      }
    })
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('SW registered: ', registration)

      registration.addEventListener('updatefound', () => {
        installUpdateFlow(registration)
      })

      if (registration.waiting) {
        applyWaitingWorker(registration)
      }

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        hardReloadOnce(SW_CONTROLLER_RELOAD_KEY)
      })

      installUpdateFlow(registration)
      void registration.update()
      window.setInterval(() => {
        void registration.update()
      }, 1000 * 60 * 60)
    }).catch((registrationError) => {
      console.log('SW registration failed: ', registrationError)
      logBootstrapFault('sw.register.error', { registrationError: toErrorText(registrationError) })
    })
  })
} else if ('serviceWorker' in navigator && import.meta.env.DEV) {
  // 開発環境では既存のService Workerを登録解除 + キャッシュクリア
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister()
      console.log('SW unregistered in dev mode')
    })
  })
  
  // キャッシュAPI全削除（古いmanifest等を確実に削除）
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => {
        caches.delete(name)
        console.log('[Cache] Deleted cache:', name)
      })
    })
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5分間キャッシュ
      gcTime: 1000 * 60 * 30,   // 30分間保持
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
