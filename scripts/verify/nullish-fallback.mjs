import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORIES = ["src", "apps/web/src", "apps/android/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/android-renderer/src", "shared", "functions/src"].map((directory) => path.join(ROOT_DIR, directory));
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
const getRelativePath = (filePath) => toPosix(path.relative(ROOT_DIR, filePath));
const shouldCheckFile = (filePath) => {
  const relativePath = `/${getRelativePath(filePath)}`;
  if (EXCLUDED_FILE_SUFFIXES.some((suffix) => relativePath.endsWith(suffix))) return false;

  return !EXCLUDED_PATH_PARTS.some((part) => relativePath.includes(part));
};
const getSourceFiles = () => SOURCE_DIRECTORIES.flatMap(walkSourceFiles).filter(shouldCheckFile);
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
const isLogicalOrAndBinaryExpression = (node) => ts.isBinaryExpression(node) && (node.operatorToken.kind === ts.SyntaxKind.BarBarToken || node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken);
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
const createReplacementChange = (sourceFile, node) => ({ start: node.operatorToken.getStart(sourceFile), end: node.operatorToken.getEnd(), text: "??" });
const createLeftParenthesesChanges = (sourceFile, node) => {
  if (!isLogicalOrAndBinaryExpression(node.left)) return [];

  return [
    { start: node.left.getStart(sourceFile), end: node.left.getStart(sourceFile), text: "(" },
    { start: node.left.getEnd(), end: node.left.getEnd(), text: ")" },
  ];
};
const createParentParenthesesChanges = (sourceFile, node) => {
  if (!isLogicalOrAndBinaryExpression(node.parent)) return [];

  return [
    { start: node.getStart(sourceFile), end: node.getStart(sourceFile), text: "(" },
    { start: node.getEnd(), end: node.getEnd(), text: ")" },
  ];
};
const applyTextChanges = (source, changes) => {
  const orderedChanges = [...changes].sort((a, b) => b.start - a.start || b.end - a.end || b.text.localeCompare(a.text));

  return orderedChanges.reduce((currentSource, change) => `${currentSource.slice(0, change.start)}${change.text}${currentSource.slice(change.end)}`, source);
};
const getNullishFallbackMatches = (filePath, source) => {
  const sourceFile = createSourceFile(filePath, source);
  const matches = [];

  const visit = (node) => {
    if (shouldReportNullishFallback(node)) matches.push({ node, sourceFile });

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return matches;
};
const getNullishFallbackViolations = (filePath, source) => getNullishFallbackMatches(filePath, source).map(({ node, sourceFile }) => ({ filePath, line: getLineNumber(sourceFile, node.getStart(sourceFile)), message: NULLISH_FALLBACK_MESSAGE }));
const normalizeNullishFallbacks = (filePath, source) => {
  const changes = getNullishFallbackMatches(filePath, source).flatMap(({ node, sourceFile }) => [createReplacementChange(sourceFile, node), ...createLeftParenthesesChanges(sourceFile, node), ...createParentParenthesesChanges(sourceFile, node)]);
  if (changes.length === 0) return source;

  return applyTextChanges(source, changes);
};

export { getNullishFallbackViolations, getRelativePath, getSourceFiles, normalizeNullishFallbacks };
