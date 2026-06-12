import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORIES = ["src", "apps/web/src", "apps/mobile/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/mobile-renderer/src", "shared", "functions/src", "tests", "scripts/dev", "scripts/verify"].map((directory) => path.join(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const CONFLICT_MARKER_PATTERN = /^(?:<{7}|={7}|>{7})(?:\s|$)/u;
const INLINE_OPENING_BRACE_COMMENT_PATTERN = /\{\s*\/\//u;

const walkSourceFiles = (directory) => {
  if (!existsSync(directory)) return [];

  return readdirSync(directory).flatMap((entry) => {
    const entryPath = path.join(directory, entry);
    const stat = statSync(entryPath);

    if (stat.isDirectory()) return walkSourceFiles(entryPath);
    if (!stat.isFile()) return [];
    if (!SOURCE_EXTENSIONS.has(path.extname(entryPath))) return [];

    return [entryPath];
  });
};

const toPosix = (value) => value.split(path.sep).join("/");

const getScriptKind = (filePath) => {
  const extension = path.extname(filePath);
  if (extension === ".tsx") return ts.ScriptKind.TSX;
  if (extension === ".jsx") return ts.ScriptKind.JSX;
  if (extension === ".js" || extension === ".mjs") return ts.ScriptKind.JS;

  return ts.ScriptKind.TS;
};

const createSourceFile = (filePath, source) => ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, getScriptKind(filePath));

const getLineNumber = (sourceFile, position) => sourceFile.getLineAndCharacterOfPosition(position).line + 1;

const checkSourceLayout = (filePath) => {
  const source = readFileSync(filePath, "utf8");
  const violations = [];
  const lines = source.split(/\r?\n/u);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    if (CONFLICT_MARKER_PATTERN.test(line.trimStart())) {
      violations.push({ filePath, line: lineNumber, message: "merge conflict marker を残さないでください。" });
    }

    if (INLINE_OPENING_BRACE_COMMENT_PATTERN.test(line)) {
      violations.push({ filePath, line: lineNumber, message: "{ の直後に // コメントを同じ行で置かず、次の行へ分けてください。" });
    }
  });

  return violations;
};

const checkTypeOnlyNamedImports = (filePath) => {
  const source = readFileSync(filePath, "utf8");
  const sourceFile = createSourceFile(filePath, source);
  const violations = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;

    const namedBindings = statement.importClause?.namedBindings;
    if (!namedBindings || !ts.isNamedImports(namedBindings)) continue;

    for (const specifier of namedBindings.elements) {
      if (!specifier.isTypeOnly) continue;

      violations.push({ filePath, line: getLineNumber(sourceFile, specifier.getStart(sourceFile)), message: "named import 内の type 修飾子は禁止です。import type を使うか、値 import と type import を分けてください。" });
    }
  }

  return violations;
};

const formatViolation = ({ filePath, line, message }) => `${toPosix(path.relative(ROOT_DIR, filePath))}:${line} ${message}`;

const sourceFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles);
const sourceLayoutViolations = sourceFiles.flatMap(checkSourceLayout);
const typeOnlyViolations = sourceLayoutViolations.length > 0 ? [] : sourceFiles.flatMap(checkTypeOnlyNamedImports);
const violations = [...sourceLayoutViolations, ...typeOnlyViolations];

if (violations.length > 0) {
  console.error("type-only import 規約違反:");
  for (const violation of violations) {
    console.error(`- ${formatViolation(violation)}`);
  }
  process.exitCode = 1;
}
