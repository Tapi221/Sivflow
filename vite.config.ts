import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: false,
      manifestFilename: "manifest.webmanifest",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      injectManifest: {
        globIgnores: ["**/index.html"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
        type: "module",
      },
      manifest: {
        name: "manifolmia",
        short_name: "manifolmia",
        description: "Advanced learning app for serious learners",
        theme_color: "#35507b",
        background_color: "#F8FAFB",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@constants": path.resolve(__dirname, "./constants"),
      "@config": path.resolve(__dirname, "./config"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    middlewareMode: false,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      "Cross-Origin-Embedder-Policy": "unsafe-none",
    },
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {},
    },
  },
  define: {
    "process.env.FORCE_COLOR": true,
  },
});
