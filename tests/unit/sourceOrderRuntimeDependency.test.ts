import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT_DIR = process.cwd();
const FIX_SOURCE_ORDER_SCRIPT = path.join(ROOT_DIR, "scripts/verify/fix-source-order.mjs");

const runSourceOrderFix = (source: string) => {
  const tempDirectory = mkdtempSync(path.join(tmpdir(), "sivflow-source-order-runtime-"));
  const filePath = path.join(tempDirectory, "fixture.ts");

  try {
    writeFileSync(filePath, source);
    execFileSync(process.execPath, [FIX_SOURCE_ORDER_SCRIPT], {
      cwd: ROOT_DIR,
      env: {
        ...process.env,
        SOURCE_CONVENTION_TARGETS: tempDirectory,
      },
    });

    return readFileSync(filePath, "utf8");
  } finally {
    rmSync(tempDirectory, { force: true, recursive: true });
  }
};

describe("source order runtime dependency fixer", () => {
  it("トップレベル実行文を参照先宣言の後ろへ移動する", () => {
    const formatted = runSourceOrderFix(`if (shouldRender) {
  render(AppBootstrap);
}

const AppBootstrap = () => null;
`);

    expect(formatted).toBe(`const AppBootstrap = () => null;

if (shouldRender) {
  render(AppBootstrap);
}
`);
  });
});
