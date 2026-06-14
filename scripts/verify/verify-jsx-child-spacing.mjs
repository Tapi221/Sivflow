import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORY_PATTERNS = process.env.SOURCE_CONVENTION_TARGETS?.split(path.delimiter).filter(Boolean) ?? ["src", "apps/web/src", "apps/android/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/android-renderer/src", "shared", "functions/src", "tests"];
const SOURCE_DIRECTORIES = SOURCE_DIRECTORY_PATTERNS.map((directory) => path.resolve(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".tsx", ".jsx"]);
const JSX_CHILD_SPACING_MESSAGE = "JSX 子要素同士の間に意味のない空行を入れないでください。";

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

const getScriptKind = (filePath) => path.extname(filePath) === ".jsx" ? ts.ScriptKind.JSX : ts.ScriptKind.TSX;

const createSourceFile = (filePath, source) => ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, getScriptKind(filePath));

const getLineNumber = (sourceFile, position) => sourceFile.getLineAndCharacterOfPosition(position).line + 1;

const countLineBreaks = (value) => value.match(/\r\n|\n|\r/gu)?.length ?? 0;

const isWhitespaceJsxText = (source, child) => ts.isJsxText(child) && !/\S/u.test(source.slice(child.pos, child.end));

const isJsxTagChild = (child) => ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child);

const findPreviousJsxTagChild = (source, children, startIndex) => {
  for (let index = startIndex - 1; index >= 0; index -= 1) {
    const child = children[index];
    if (isWhitespaceJsxText(source, child)) continue;

    return isJsxTagChild(child) ? child : null;
  }

  return null;
};

const findNextJsxTagChild = (source, children, startIndex) => {
  for (let index = startIndex + 1; index < children.length; index += 1) {
    const child = children[index];
    if (isWhitespaceJsxText(source, child)) continue;

    return isJsxTagChild(child) ? child : null;
  }

  return null;
};

const getJsxChildSpacingViolations = (filePath, source, sourceFile, children) => {
  const violations = [];

  children.forEach((child, index) => {
    if (!isWhitespaceJsxText(source, child)) return;
    if (countLineBreaks(source.slice(child.pos, child.end)) < 2) return;
    if (!findPreviousJsxTagChild(source, children, index)) return;
    if (!findNextJsxTagChild(source, children, index)) return;

    violations.push({ filePath, line: getLineNumber(sourceFile, child.pos), message: JSX_CHILD_SPACING_MESSAGE });
  });

  return violations;
};

const checkJsxChildSpacing = (filePath, source, sourceFile) => {
  const violations = [];

  const visit = (node) => {
    if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
      violations.push(...getJsxChildSpacingViolations(filePath, source, sourceFile, node.children));
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations;
};

const checkSourceFile = (filePath) => {
  const source = readFileSync(filePath, "utf8");
  const sourceFile = createSourceFile(filePath, source);
  if (sourceFile.parseDiagnostics.length > 0) return [];

  return checkJsxChildSpacing(filePath, source, sourceFile);
};

const formatViolation = ({ filePath, line, message }) => `${toPosix(path.relative(ROOT_DIR, filePath))}:${line} ${message}`;

const sourceFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles);
const violations = sourceFiles.flatMap(checkSourceFile);

if (violations.length > 0) {
  console.error("JSX 子要素空行規約違反:");
  for (const violation of violations) {
    console.error(`- ${formatViolation(violation)}`);
  }
  process.exitCode = 1;
}
