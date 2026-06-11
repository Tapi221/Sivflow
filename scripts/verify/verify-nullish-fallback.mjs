import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORIES = ["src", "apps/web/src", "apps/mobile/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/mobile-renderer/src", "shared", "functions/src"].map((directory) => path.join(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const EXCLUDED_PATH_PARTS = ["/tests/", "/scripts/", "/src/sandbox/"];
const EXCLUDED_FILE_SUFFIXES = [".d.ts"];
const NULLISH_FALLBACK_MESSAGE = "値がないときだけ代替値を使う処理では || ではなく ?? を使ってください。false / 0 / 空文字を欠落扱いする場合は条件式で明示してください。";

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
  if (EXCLUDED_FILE_SUFFIXES.some((suffix) => relativePath.endsWith(suffix))) return false;

  return !EXCLUDED_PATH_PARTS.some((part) => relativePath.includes(part));
};

const getScriptKind = (filePath) => {
  const extension = path.extname(filePath);
  if (extension === ".tsx") return ts.ScriptKind.TSX;
  if (extension === ".jsx") return ts.ScriptKind.JSX;
  if (extension === ".js" || extension === ".mjs") return ts.ScriptKind.JS;

  return ts.ScriptKind.TS;
};

const createSourceFile = (filePath, source) => ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, getScriptKind(filePath));

const getLineNumber = (sourceFile, position) => sourceFile.getLineAndCharacterOfPosition(position).line + 1;

const isObjectOrArrayLiteral = (node) => ts.isObjectLiteralExpression(node) || ts.isArrayLiteralExpression(node);

const isFallbackLiteral = (node) => ts.isStringLiteralLike(node) || ts.isNumericLiteral(node) || node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword || isObjectOrArrayLiteral(node);

const isValueReturnContext = (node) => {
  const parent = node.parent;
  if (!parent) return false;
  if (ts.isVariableDeclaration(parent)) return true;
  if (ts.isPropertyAssignment(parent) && parent.initializer === node) return true;
  if (ts.isReturnStatement(parent)) return true;
  if (ts.isArrowFunction(parent) && parent.body === node) return true;
  if (ts.isJsxExpression(parent)) return true;
  if (ts.isCallExpression(parent) && parent.arguments.includes(node)) return true;
  if (ts.isBinaryExpression(parent) && parent.operatorToken.kind !== ts.SyntaxKind.BarBarToken) return true;
  if (ts.isConditionalExpression(parent)) return parent.whenTrue === node || parent.whenFalse === node;

  return false;
};

const shouldReportNullishFallback = (node) => ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.BarBarToken && isFallbackLiteral(node.right) && isValueReturnContext(node);

const checkSourceFile = (filePath) => {
  if (!shouldCheckFile(filePath)) return [];

  const source = readFileSync(filePath, "utf8");
  const sourceFile = createSourceFile(filePath, source);
  const violations = [];

  const visit = (node) => {
    if (shouldReportNullishFallback(node)) {
      violations.push({ filePath, line: getLineNumber(sourceFile, node.getStart(sourceFile)), message: NULLISH_FALLBACK_MESSAGE });
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations;
};

const formatViolation = ({ filePath, line, message }) => `${toPosix(path.relative(ROOT_DIR, filePath))}:${line} ${message}`;

const sourceFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles);
const violations = sourceFiles.flatMap(checkSourceFile);

if (violations.length > 0) {
  console.error("nullish fallback 規約違反:");
  for (const violation of violations) {
    console.error(`- ${formatViolation(violation)}`);
  }
  process.exitCode = 1;
}
