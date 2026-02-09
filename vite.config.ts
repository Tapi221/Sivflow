import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifestFilename: 'manifest.webmanifest',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      devOptions: {
        enabled: false, // 開発環境ではPWA無効化（manifest生成は行われる）
        type: 'module',
      },
      manifest: {
        name: 'Flashcard Master',
        short_name: 'Flashcard',
        description: 'Advanced flashcard app for serious learners',
        theme_color: '#689A98',
        background_color: '#F8FAFB',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    middlewareMode: false,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
  },
  build: {
    sourcemap: true,
    // チャンクサイズ警告の閾値を緩和（実用的なライン）
    chunkSizeWarningLimit: 1000,
    
    rollupOptions: {
      output: {
        // 関数型での定義：将来のライブラリ追加に自動追従可能にする
        manualChunks: (id) => {
          // node_modules のみを対象にする
          if (id.includes('node_modules')) {
            
            // 1. Core Framework (React Ecosystem) & Charts
            // recharts等もReactに密結合しているため、分割せず同じチャンクに含めることで
            // forwardRef などの初期化順序エラーを防止する。
            if (
              id.includes('react') || 
              id.includes('react-dom') || 
              id.includes('react-router-dom') ||
              id.includes('recharts') || 
              id.includes('chart.js') || 
              id.includes('d3')
            ) {
              return 'vendor-react';
            }

            // 2. Firebase (Infrastructure)
            if (id.includes('firebase') || id.includes('@firebase')) {
              return 'vendor-firebase';
            }

            // 3. Editor & Math (Heavy Weight)
            if (
              id.includes('katex') || 
              id.includes('prism') || 
              id.includes('html-to-image') ||
              id.includes('heic2any')
            ) {
              return 'vendor-editor';
            }

            // 5. Animations
            // UI全体のインタラクションで使うならMainでも良いが、サイズが大きい場合は分離
            if (id.includes('framer-motion') || id.includes('react-spring')) {
              return 'vendor-motion';
            }
            
            // 6. UI Components (Headless UI / Radix)
            // 複数のコンポーネントで散見されるため、キャッシュ効率のためにまとめる
            if (id.includes('@radix-ui') || id.includes('lucide-react') || id.includes('vaul') || id.includes('sonner')) {
              return 'vendor-ui';
            }

            // その他（utilsなど）は自動的にエントリーポイントごとのChunk、
            // またはViteのデフォルト戦略（vendor）に振り分けられるため、明示指定しない。
          }
        },
      },
    },
  },
  // Fix case-sensitivity issues on Windows
  define: {
    'process.env.FORCE_COLOR': true,
  },
})
