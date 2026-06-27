import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORIES = ["src", "apps/web/src", "apps/android/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/android-renderer/src", "shared", "functions/src", "scripts/dev", "scripts/verify"].map((directory) => path.join(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const EXCLUDED_PATH_PARTS = ["/node_modules/", "/dist/", "/build/", "/coverage/", "/.firebase/", "/tmp/", "/tests/"];
const FUNCTION_SYNTAX_MESSAGE = "関数定義は function 構文ではなく const arrow 関数にしてください。";

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

const shouldCheckFile = (filePath) => {
  const relativePath = `/${toPosix(path.relative(ROOT_DIR, filePath))}`;

  return !EXCLUDED_PATH_PARTS.some((part) => relativePath.includes(part));
};

const getLineNumber = (sourceFile, position) => sourceFile.getLineAndCharacterOfPosition(position).line + 1;

const checkFunctionSyntax = (filePath, sourceFile) => {
  const violations = [];

  const visit = (node) => {
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) {
      violations.push({ filePath, line: getLineNumber(sourceFile, node.getStart(sourceFile)), message: FUNCTION_SYNTAX_MESSAGE });
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations;
};

const checkSourceFile = (filePath) => {
  if (!shouldCheckFile(filePath)) return [];

  const source = readFileSync(filePath, "utf8");
  const scriptKind = path.extname(filePath).endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind);

  return checkFunctionSyntax(filePath, sourceFile);
};

const formatViolation = ({ filePath, line, message }) => `${toPosix(path.relative(ROOT_DIR, filePath))}:${line} ${message}`;

const sourceFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles);
const violations = sourceFiles.flatMap(checkSourceFile);

if (violations.length > 0) {
  console.error("const arrow 関数規約違反:");
  for (const violation of violations) {
    console.error(`- ${formatViolation(violation)}`);
  }
  process.exitCode = 1;
}
