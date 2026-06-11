import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT_DIR = process.cwd();
const FIX_IMPORT_SPACING_SCRIPT = path.join(ROOT_DIR, "scripts/verify/fix-import-spacing.mjs");
const FIX_KNOWN_LINT_ERRORS_SCRIPT = path.join(ROOT_DIR, "scripts/verify/fix-known-lint-errors.mjs");
const FIX_REPEATED_BLANK_LINES_SCRIPT = path.join(ROOT_DIR, "scripts/verify/fix-repeated-blank-lines.mjs");

const runFormatterOnSource = (source: string, scriptPath = FIX_IMPORT_SPACING_SCRIPT) => {
  const tempDirectory = mkdtempSync(path.join(tmpdir(), "sivflow-source-convention-"));
  const filePath = path.join(tempDirectory, "fixture.ts");

  try {
    writeFileSync(filePath, source);
    execFileSync(process.execPath, [scriptPath], {
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
    const formatted = runFormatterOnSource(`const createHelpers = () => ({ uploadFiles: () => undefined, useUploadThing: () => undefined });

export const { uploadFiles, useUploadThing } = createHelpers();
`);

    expect(formatted).toBe(`const createHelpers = () => ({ uploadFiles: () => undefined, useUploadThing: () => undefined });

const { uploadFiles, useUploadThing } = createHelpers();

export { uploadFiles, useUploadThing };
`);
  });

  it("export 文の前に空行を1行入れる", () => {
    const formatted = runFormatterOnSource(`const Component = () => null;
Component.displayName = "Component";
export { Component };
`);

    expect(formatted).toBe(`const Component = () => null;

Component.displayName = "Component";

export { Component };
`);
  });

  it("export 文同士の間の空行を削除する", () => {
    const formatted = runFormatterOnSource(`const value = 1;
type Value = typeof value;


export { value };

export type { Value };
`);

    expect(formatted).toBe(`const value = 1;

type Value = typeof value;

export { value };
export type { Value };
`);
  });

  it("ブロック開始直後の文を次の行へ分ける", () => {
    const formatted = runFormatterOnSource(`const getValue = () => { const value = 1;

  return value;
};
`);

    expect(formatted).toBe(`const getValue = () => {
  const value = 1;

  return value;
};
`);
  });

  it("同じ行で入れ子になったブロック開始直後の文を反復修正する", () => {
    const formatted = runFormatterOnSource(`const getValue = () => { try { const value = 1;

  return value;
} catch { return 0;
}
};
`);

    expect(formatted).toBe(`const getValue = () => {
  try {
    const value = 1;

  return value;
} catch {
  return 0;
}
};
`);
  });

  it("連続空行を1行に正規化する", () => {
    const formatted = runFormatterOnSource(`import * as React from "react";



const useValue = () => React.useState(false);



export { useValue };
`, FIX_REPEATED_BLANK_LINES_SCRIPT);

    expect(formatted).toBe(`import * as React from "react";

const useValue = () => React.useState(false);

export { useValue };
`);
  });

  it("既知 lint の constant nullish fallback を自動修正する", () => {
    const formatted = runFormatterOnSource(`const path = folderPath.join(" / ") ?? "未分類";
const orderIndex = Number(cardSet.orderIndex) ?? 0;
`, FIX_KNOWN_LINT_ERRORS_SCRIPT);

    expect(formatted).toBe(`const path = folderPath.length > 0 ? folderPath.join(" / ") : "未分類";
const orderIndex = Number.isFinite(Number(cardSet.orderIndex)) ? Number(cardSet.orderIndex) : 0;
`);
  });
});
