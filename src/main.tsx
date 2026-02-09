import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import 'katex/dist/katex.min.css'
import App from './App.tsx'

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

// チャンク読み込みエラーのハンドリング
const handleChunkError = (error: any) => {
  const message = error?.message || '';
  if (
    /loading chunk \d+ failed./i.test(message) || 
    /Failed to fetch dynamically imported module/i.test(message) ||
    (error?.target && (error.target as any).src && (error.target as any).src.includes('/assets/')) ||
    message.includes('MIME type of "text/html"')
  ) {
    if (!window.location.hash.includes('retry-chunk')) {
      window.location.hash = 'retry-chunk';
      window.location.reload();
    }
  }
};

window.addEventListener('error', (e) => handleChunkError(e), true);
window.addEventListener('unhandledrejection', (e) => handleChunkError(e.reason));

// Service Workerの登録（本番環境のみ）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
} else if ('serviceWorker' in navigator && import.meta.env.DEV) {
  // 開発環境では既存のService Workerを登録解除 + キャッシュクリア
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
      console.log('SW unregistered in dev mode');
    });
  });
  
  // キャッシュAPI全削除（古いmanifest等を確実に削除）
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => {
        caches.delete(name);
        console.log('[Cache] Deleted cache:', name);
      });
    });
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

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider clientId={googleClientId}>
        <App />
      </GoogleOAuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
