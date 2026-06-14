import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORIES = ["src", "apps/web/src", "apps/android/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/android-renderer/src", "shared", "functions/src", "tests", "scripts/dev", "scripts/verify"].map((directory) => path.join(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const EXCLUDED_PATH_PARTS = ["/src/sandbox/"];
const EXCLUDED_FILE_SUFFIXES = [".d.ts"];
const STRICT_EQUALITY_MESSAGE = "等価比較では == / != ではなく === / !== を使ってください。";

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
const isLooseEqualityOperator = (operatorKind) => operatorKind === ts.SyntaxKind.EqualsEqualsToken || operatorKind === ts.SyntaxKind.ExclamationEqualsToken;
const isLooseEqualityExpression = (node) => ts.isBinaryExpression(node) && isLooseEqualityOperator(node.operatorToken.kind);
const isNullKeyword = (node) => node.kind === ts.SyntaxKind.NullKeyword;
const isUndefinedIdentifier = (node) => ts.isIdentifier(node) && node.text === "undefined";
const isNullishSentinel = (node) => isNullKeyword(node) || isUndefinedIdentifier(node);
const isThisExpression = (node) => node.kind === ts.SyntaxKind.ThisKeyword;
const isLiteralElementAccessArgument = (node) => ts.isStringLiteral(node) || ts.isNumericLiteral(node) || node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword;
const isSafeReusableExpression = (node) => {
  if (ts.isIdentifier(node) || isThisExpression(node)) return true;
  if (ts.isPropertyAccessExpression(node)) return isSafeReusableExpression(node.expression);
  if (ts.isElementAccessExpression(node)) {
    const argumentExpression = node.argumentExpression;
    if (!argumentExpression) return false;
    if (!isSafeReusableExpression(node.expression)) return false;
    return isLiteralElementAccessArgument(argumentExpression) || isSafeReusableExpression(argumentExpression);
  }

  return false;
};
const getNullishCheckedExpression = (node) => {
  const leftIsNullishSentinel = isNullishSentinel(node.left);
  const rightIsNullishSentinel = isNullishSentinel(node.right);
  if (leftIsNullishSentinel && !rightIsNullishSentinel) return node.right;
  if (rightIsNullishSentinel && !leftIsNullishSentinel) return node.left;

  return null;
};
const getStrictOperatorText = (node) => node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken ? "===" : "!==";
const getNullishJoinerText = (node) => node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken ? "||" : "&&";
const createOperatorReplacementChange = (sourceFile, node) => ({ start: node.operatorToken.getStart(sourceFile), end: node.operatorToken.getEnd(), text: getStrictOperatorText(node) });
const createNullishReplacementChange = (sourceFile, node, checkedExpression) => {
  const expressionText = checkedExpression.getText(sourceFile);
  const operatorText = getStrictOperatorText(node);
  const joinerText = getNullishJoinerText(node);

  return { start: node.getStart(sourceFile), end: node.getEnd(), text: `(${expressionText} ${operatorText} null ${joinerText} ${expressionText} ${operatorText} undefined)` };
};
const createStrictEqualityChange = (sourceFile, node) => {
  const checkedExpression = getNullishCheckedExpression(node);
  if (!checkedExpression) return createOperatorReplacementChange(sourceFile, node);
  if (!isSafeReusableExpression(checkedExpression)) return null;

  return createNullishReplacementChange(sourceFile, node, checkedExpression);
};
const getStrictEqualityMatches = (filePath, source) => {
  const sourceFile = createSourceFile(filePath, source);
  const matches = [];

  const visit = (node) => {
    if (isLooseEqualityExpression(node)) matches.push({ node, sourceFile });

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return matches;
};
const applyTextChanges = (source, changes) => {
  const orderedChanges = [...changes].sort((a, b) => b.start - a.start || b.end - a.end || b.text.localeCompare(a.text));

  return orderedChanges.reduce((currentSource, change) => `${currentSource.slice(0, change.start)}${change.text}${currentSource.slice(change.end)}`, source);
};
const getStrictEqualityViolations = (filePath, source) => getStrictEqualityMatches(filePath, source).map(({ node, sourceFile }) => ({ filePath, line: getLineNumber(sourceFile, node.getStart(sourceFile)), message: STRICT_EQUALITY_MESSAGE }));
const normalizeStrictEqualities = (filePath, source) => {
  const changes = getStrictEqualityMatches(filePath, source).flatMap(({ node, sourceFile }) => {
    const change = createStrictEqualityChange(sourceFile, node);
    return change ? [change] : [];
  });
  if (changes.length === 0) return source;

  return applyTextChanges(source, changes);
};

export { getRelativePath, getSourceFiles, getStrictEqualityViolations, normalizeStrictEqualities };
