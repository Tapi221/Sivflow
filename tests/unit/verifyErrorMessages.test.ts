import { readFileSync } from "node:fs";

import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT_DIR = process.cwd();
const VERIFY_SCRIPT_PATHS = [
  "scripts/verify/verify-source-conventions.mjs",
  "scripts/verify/verify-const-arrow-functions.mjs",
  "scripts/verify/verify-pdf-zoom-constants.mjs",
  "scripts/verify/verify-module-constant-names.mjs",
];
const FORBIDDEN_ENGLISH_MESSAGES = [
  "Source convention violations:",
  "Const arrow function violations:",
  "PDF zoom constant violations:",
  "Module constant naming violations:",
  "Use an alias for cross-folder imports",
  "Use an alias for child-folder imports",
  "Use a same-directory relative import",
  "Do not import from @constants",
  "Keep each import/export-from declaration on one line.",
  "Move ",
  "Put exactly one blank line between",
  "Use <>...</> instead of explicit Fragment.",
  "Do not wrap a single child in <>...</>.",
  "Do not use a div only as a wrapper.",
  "Use a const arrow function instead of function syntax.",
  "Missing shared PDF zoom constant",
  "Module-scope constants must use UPPER_SNAKE_CASE",
];
const REQUIRED_JAPANESE_MESSAGES = [
  "ソース規約違反:",
  "const arrow 関数規約違反:",
  "PDF ズーム定数規約違反:",
  "module 定数命名規約違反:",
];

const readVerifyScriptSources = () => VERIFY_SCRIPT_PATHS.map((scriptPath) => readFileSync(path.join(ROOT_DIR, scriptPath), "utf8"));

describe("verify error messages", () => {
  it("検証エラーメッセージは日本語で直接定義する", () => {
    const combinedSource = readVerifyScriptSources().join("\n");

    for (const message of FORBIDDEN_ENGLISH_MESSAGES) {
      expect(combinedSource).not.toContain(message);
    }

    for (const message of REQUIRED_JAPANESE_MESSAGES) {
      expect(combinedSource).toContain(message);
    }
  });
});
