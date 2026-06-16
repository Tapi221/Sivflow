import { fileURLToPath } from "node:url";
import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const resolveFromRoot = (relativePath: string) => path.resolve(repoRoot, relativePath);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@\/services\/localDB$/, replacement: resolveFromRoot("src/services/localdb/index.ts") },
      { find: "@core", replacement: resolveFromRoot("packages/core/src") },
      { find: "@platform", replacement: resolveFromRoot("packages/platform/src") },
      { find: "@web-renderer", replacement: resolveFromRoot("packages/web-renderer/src") },
      { find: "@shared", replacement: resolveFromRoot("shared") },
      { find: "@", replacement: resolveFromRoot("src") },
    ],
  },
  test: {
    environment: "jsdom",
    exclude: ["**/node_modules/**", "**/dist/**", "nouse/**"],
    maxWorkers: 1,
    pool: "threads",
  },
});
