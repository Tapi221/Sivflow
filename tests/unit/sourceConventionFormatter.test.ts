import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT_DIR = process.cwd();
const FIX_IMPORT_SPACING_SCRIPT = path.join(ROOT_DIR, "scripts/verify/fix-import-spacing.mjs");

const runFormatterOnSource = (source: string) => {
  const tempDirectory = mkdtempSync(path.join(tmpdir(), "sivflow-source-convention-"));
  const filePath = path.join(tempDirectory, "fixture.ts");

  try {
    writeFileSync(filePath, source);
    execFileSync(process.execPath, [FIX_IMPORT_SPACING_SCRIPT], {
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

describe("source convention formatter", () => {
  it("分割代入の宣言時 export を末尾 export に移動する", () => {
    const formatted = runFormatterOnSource(`const createHelpers = () => ({ uploadFiles: () => undefined, useUploadThing: () => undefined });\n\nexport const { uploadFiles, useUploadThing } = createHelpers();\n`);

    expect(formatted).toBe(`const createHelpers = () => ({ uploadFiles: () => undefined, useUploadThing: () => undefined });\nconst { uploadFiles, useUploadThing } = createHelpers();\n\nexport { uploadFiles, useUploadThing };\n`);
  });

  it("ブロック開始直後の文を次の行へ分ける", () => {
    const formatted = runFormatterOnSource(`const getValue = () => { const value = 1;\n\n  return value;\n};\n`);

    expect(formatted).toBe(`const getValue = () => {\n  const value = 1;\n\n  return value;\n};\n`);
  });
});
