import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const optimizedDependencyIncludes = [
  "@radix-ui/react-alert-dialog",
  "@radix-ui/react-checkbox",
  "@radix-ui/react-collapsible",
  "@radix-ui/react-dialog",
  "@radix-ui/react-dropdown-menu",
  "@radix-ui/react-hover-card",
  "@radix-ui/react-label",
  "@radix-ui/react-popover",
  "@radix-ui/react-progress",
  "@radix-ui/react-radio-group",
  "@radix-ui/react-scroll-area",
  "@radix-ui/react-select",
  "@radix-ui/react-slider",
  "@radix-ui/react-slot",
  "@radix-ui/react-switch",
];

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pdfjsAssetRoute = "/pdfjs/";
const pdfjsAssetDirectories = ["cmaps", "standard_fonts", "wasm"];

const resolveFromRoot = (relativePath: string) => path.resolve(repoRoot, relativePath);

const resolvePdfjsDistPath = (relativePath: string) => resolveFromRoot(path.join("node_modules/pdfjs-dist", relativePath));

const getPdfjsAssetContentType = (filePath: string): string => {
  if (filePath.endsWith(".bcmap")) return "application/octet-stream";
  if (filePath.endsWith(".wasm")) return "application/wasm";
  if (filePath.endsWith(".pfb")) return "application/octet-stream";
  if (filePath.endsWith(".ttf")) return "font/ttf";
  return "application/octet-stream";
};

const createPdfjsAssetsPlugin = (): Plugin => {
  return {
    name: "serve-pdfjs-assets",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const requestUrl = request.url ?? "";
        if (!requestUrl.startsWith(pdfjsAssetRoute)) {
          next();
          return;
        }

        try {
          const rawRelativePath = decodeURIComponent(requestUrl.slice(pdfjsAssetRoute.length).split("?")[0] ?? "");
          const assetFilePath = resolvePdfjsDistPath(rawRelativePath);
          const assetRootPath = resolvePdfjsDistPath("");
          if (!assetFilePath.startsWith(assetRootPath)) {
            response.statusCode = 403;
            response.end();
            return;
          }

          const file = await fs.readFile(assetFilePath);
          response.setHeader("Content-Type", getPdfjsAssetContentType(assetFilePath));
          response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          response.end(file);
        } catch {
          response.statusCode = 404;
          response.end();
        }
      });
    },
    async writeBundle() {
      const outputRoot = resolveFromRoot("dist/pdfjs");
      await fs.mkdir(outputRoot, { recursive: true });
      await Promise.all(pdfjsAssetDirectories.map((directory) => fs.cp(resolvePdfjsDistPath(directory), path.join(outputRoot, directory), { recursive: true })));
    },
  };
};

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  root: resolveFromRoot("apps/web"),
  envDir: repoRoot,
  publicDir: resolveFromRoot("public"),
  plugins: [
    react(),
    createPdfjsAssetsPlugin(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: resolveFromRoot("apps/web/src"),
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: false,
      manifestFilename: "manifest.webmanifest",
      includeAssets: ["favicon.ico", "icon.svg"],
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
          { src: "icon.svg", sizes: "512x512", type: "image/svg+xml" },
          { src: "icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" },
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
  optimizeDeps: {
    include: optimizedDependencyIncludes,
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