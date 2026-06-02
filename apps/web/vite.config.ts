import { fileURLToPath } from "node:url";
import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const resolveFromRoot = (relativePath: string) => path.resolve(repoRoot, relativePath);

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  root: resolveFromRoot("apps/web"),
  envDir: repoRoot,
  publicDir: resolveFromRoot("public"),
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: resolveFromRoot("apps/web/src"),
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
        name: "Sivflow",
        short_name: "Sivflow",
        description: "Advanced learning app for serious learners",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ],
  resolve: {
    alias: [
      { find: /^@\/services\/localDB$/, replacement: resolveFromRoot("src/services/localdb/index.ts") },
      { find: /^@\/services\/firebase$/, replacement: resolveFromRoot("src/infrastructure/firebase/client.ts") },
      { find: /^@\/features\/tab\/Tab$/, replacement: resolveFromRoot("src/pane.desktop/tab.desktopnative/Tab.ts") },
      { find: "@core", replacement: resolveFromRoot("packages/core/src") },
      { find: "@platform", replacement: resolveFromRoot("packages/platform/src") },
      { find: "@web-renderer", replacement: resolveFromRoot("packages/web-renderer/src") },
      { find: "@shared", replacement: resolveFromRoot("shared") },
      { find: "@", replacement: resolveFromRoot("src") },
      { find: "@constants", replacement: resolveFromRoot("constants") },
    ],
  },
  server: {
    port: 5173,
    strictPort: false,
    middlewareMode: false,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      "Cross-Origin-Embedder-Policy": "unsafe-none",
    },
  },
  esbuild: command === "build" ? { drop: ["console", "debugger"] } : undefined,
  build: {
    outDir: resolveFromRoot("dist"),
    emptyOutDir: true,
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: { output: {} },
  },
  define: {
    "process.env.FORCE_COLOR": true,
  },
}));
