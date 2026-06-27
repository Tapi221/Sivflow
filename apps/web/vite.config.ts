import fs from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

type ApiRouteHandler = (request: Request) => Promise<Response> | Response;
type ApiRouteModule = {
  GET?: ApiRouteHandler;
  POST?: ApiRouteHandler;
};

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
  "@platejs/basic-nodes/react",
  "@platejs/basic-styles/react",
  "@platejs/indent/react",
  "@platejs/link/react",
  "@platejs/list/react",
  "@platejs/table/react",
  "platejs/react",
];
const apiRouteModulePaths = {
  "/api/ai/command": "src/app/api/ai/command/route.ts",
  "/api/ai/copilot": "src/app/api/ai/copilot/route.ts",
  "/api/uploadthing": "src/app/api/uploadthing/route.ts",
};
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const distOutputPath = "dist";
const pdfjsAssetRoute = "/pdfjs/";
const pdfjsAssetDirectories = ["cmaps", "standard_fonts", "wasm"];
const browserExternalizedWarningText = "has been externalized for browser compatibility";
const nodePathBrowserShimPath = "packages/platform/src/browser/nodePathBrowserShim.cjs";

let hasCleanedDistOutput = false;

const resolveFromRoot = (relativePath: string) => path.resolve(repoRoot, relativePath);
const resolvePdfjsDistPath = (relativePath: string) => resolveFromRoot(path.join("node_modules/pdfjs-dist", relativePath));
const getPdfjsAssetContentType = (filePath: string): string => {
  if (filePath.endsWith(".bcmap")) return "application/octet-stream";
  if (filePath.endsWith(".wasm")) return "application/wasm";
  if (filePath.endsWith(".pfb")) return "application/octet-stream";
  if (filePath.endsWith(".ttf")) return "font/ttf";
  return "application/octet-stream";
};
const readRequestBody = (request: IncomingMessage): Promise<string> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    request.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    request.on("error", reject);
  });
};
const writeJsonResponse = (response: ServerResponse, statusCode: number, payload: unknown) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
};
const createRequestHeaders = (request: IncomingMessage): Headers => {
  const headers = new Headers();
  Object.entries(request.headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => headers.append(key, entry));
      return;
    }
    if (value !== undefined) {
      headers.set(key, value);
    }
  });
  return headers;
};
const writeWebResponse = async (response: ServerResponse, webResponse: Response) => {
  response.statusCode = webResponse.status;
  webResponse.headers.forEach((value, key) => {
    response.setHeader(key, value);
  });
  if (!webResponse.body) {
    response.end(await webResponse.text());
    return;
  }
  const reader = webResponse.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    response.write(value);
  }
  response.end();
};
const createApiRoutesPlugin = (): Plugin => ({
  name: "serve-app-api-routes",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      const requestPath = request.url?.split("?")[0] ?? "";
      const modulePath = apiRouteModulePaths[requestPath as keyof typeof apiRouteModulePaths];
      if (!modulePath) {
        next();
        return;
      }
      try {
        const routeModule = await server.ssrLoadModule(`/@fs/${resolveFromRoot(modulePath)}`) as ApiRouteModule;
        const routeMethod = request.method as keyof ApiRouteModule;
        const routeHandler = routeModule[routeMethod];
        if (!routeHandler) {
          writeJsonResponse(response, 405, { ok: false, error: "Method not allowed" });
          return;
        }
        const body = request.method === "GET" || request.method === "HEAD" ? undefined : await readRequestBody(request);
        const webRequest = new Request(`http://localhost${request.url ?? requestPath}`, {
          body,
          headers: createRequestHeaders(request),
          method: request.method,
        });
        const webResponse = await routeHandler(webRequest);
        await writeWebResponse(response, webResponse);
      } catch (error) {
        writeJsonResponse(response, 500, { ok: false, error: error instanceof Error ? error.message : "Invalid request" });
      }
    });
  },
});
const createDistCleanerPlugin = (): Plugin => ({
  name: "clean-dist-before-build",
  apply: "build",
  enforce: "pre",
  async buildStart() {
    if (hasCleanedDistOutput) return;
    hasCleanedDistOutput = true;
    await fs.rm(resolveFromRoot(distOutputPath), { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  },
});
const createPdfjsAssetsPlugin = (): Plugin => ({
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
    const outputRoot = resolveFromRoot(path.join(distOutputPath, "pdfjs"));
    await fs.mkdir(outputRoot, { recursive: true });
    await Promise.all(pdfjsAssetDirectories.map((directory) => fs.cp(resolvePdfjsDistPath(directory), path.join(outputRoot, directory), { recursive: true })));
  },
});

export default defineConfig(({ command }) => ({
  root: resolveFromRoot("apps/web"),
  envDir: repoRoot,
  publicDir: resolveFromRoot("public"),
  plugins: [
    createDistCleanerPlugin(),
    tailwindcss(),
    react(),
    createPdfjsAssetsPlugin(),
    createApiRoutesPlugin(),
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
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
        type: "module",
      },
      manifest: {
        name: "Sivflow",
        short_name: "Sivflow",
        description: "Advanced learning app for serious learners",
        theme_color: "#fff",
        background_color: "#fff",
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
    dedupe: [
      "@platejs/core",
      "@platejs/table",
      "platejs",
      "react",
      "react-dom",
    ],
    alias: [
      { find: /^node:path$/, replacement: resolveFromRoot(nodePathBrowserShimPath) },
      { find: /^path$/, replacement: resolveFromRoot(nodePathBrowserShimPath) },
      { find: "@/nouse", replacement: resolveFromRoot("nouse") },
      { find: "@core", replacement: resolveFromRoot("packages/core/src") },
      { find: "@platform", replacement: resolveFromRoot("packages/platform/src") },
      { find: "@web-renderer", replacement: resolveFromRoot("nouse/web-renderer/src") },
      { find: "@web", replacement: resolveFromRoot("apps/web/src") },
      { find: "@shared", replacement: resolveFromRoot("shared") },
      { find: "@", replacement: resolveFromRoot("src") },
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
    outDir: resolveFromRoot(distOutputPath),
    emptyOutDir: false,
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.message.includes(browserExternalizedWarningText)) {
          throw new Error(warning.message);
        }
        warn(warning);
      },
      output: {},
    },
  },
  define: {
    "process.env.FORCE_COLOR": true,
  },
}));
