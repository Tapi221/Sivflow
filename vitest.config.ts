import { fileURLToPath } from "node:url";
import path from "path";
import { defineConfig } from "vitest/config";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const resolveFromRoot = (relativePath: string) => path.resolve(repoRoot, relativePath);

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/services\/localDB$/, replacement: resolveFromRoot("src/services/localdb/index.ts") },
      { find: /^@\/services\/firebase$/, replacement: resolveFromRoot("src/infrastructure/firebase/client.ts") },
      { find: "@core", replacement: resolveFromRoot("packages/core/src") },
      { find: "@platform", replacement: resolveFromRoot("packages/platform/src") },
      { find: "@web-renderer", replacement: resolveFromRoot("packages/web-renderer/src") },
      { find: "@shared", replacement: resolveFromRoot("shared") },
      { find: "@constants", replacement: resolveFromRoot("constants") },
      { find: "@", replacement: resolveFromRoot("src") },
    ],
  },
  test: {
    environment: "node",
  },
});
