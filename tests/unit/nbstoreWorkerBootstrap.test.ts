import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const readRepoFile = (relativePath: string) =>
  readFileSync(path.resolve(repoRoot, relativePath), "utf8");

describe("nbstore Worker の bootstrap 境界", () => {
  const workerEntries = [
    "packages/frontend/apps/web/src/nbstore.worker.ts",
    "packages/frontend/apps/mobile/src/nbstore.worker.ts",
  ];

  for (const workerEntry of workerEntries) {
    it(`${workerEntry} は worker bootstrap だけを読む`, () => {
      const source = readRepoFile(workerEntry);

      expect(source).toContain("@affine/core/bootstrap/worker");
      expect(source).not.toContain("@affine/core/bootstrap/browser");
    });
  }

  it("worker bootstrap は browser 専用初期化を読まない", () => {
    const source = readRepoFile("packages/frontend/core/src/bootstrap/worker.ts");

    expect(source).toContain("import './env';");
    expect(source).toContain("import './public-path';");
    expect(source).toContain("import './polyfill/worker';");
    expect(source).not.toContain("telemetry");
    expect(source).not.toContain("polyfill/browser");
    expect(source).not.toContain("development-diagnostics");
  });

  it("worker polyfill は ResizeObserver を含めない", () => {
    const source = readRepoFile(
      "packages/frontend/core/src/bootstrap/polyfill/worker.ts",
    );

    expect(source).toContain("import './request-idle-callback';");
    expect(source).not.toContain("resize-observer");
    expect(source).not.toContain("ResizeObserver");
  });
});
