import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORY_PATTERNS = process.env.SOURCE_CONVENTION_TARGETS?.split(path.delimiter).filter(Boolean) ?? ["src", "apps/web/src", "apps/mobile/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/mobile-renderer/src", "shared", "functions/src", "tests"];
const SOURCE_DIRECTORIES = SOURCE_DIRECTORY_PATTERNS.map((directory) => path.resolve(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".tsx", ".jsx"]);

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

const getScriptKind = (filePath) => path.extname(filePath) === ".jsx" ? ts.ScriptKind.JSX : ts.ScriptKind.TSX;

const createSourceFile = (filePath, source) => ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, getScriptKind(filePath));

const getNewline = (source) => source.includes("\r\n") ? "\r\n" : "\n";

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

const getTrailingIndentation = (value) => value.match(/[^\r\n]*$/u)?.[0] ?? "";

const createWhitespaceReplacement = (source, whitespace) => `${getNewline(source)}${getTrailingIndentation(whitespace)}`;

const getJsxChildSpacingFixes = (source, children) => {
  const fixes = [];

  children.forEach((child, index) => {
    if (!isWhitespaceJsxText(source, child)) return;

    const whitespace = source.slice(child.pos, child.end);
    if (countLineBreaks(whitespace) < 2) return;
    if (!findPreviousJsxTagChild(source, children, index)) return;
    if (!findNextJsxTagChild(source, children, index)) return;

    fixes.push({ start: child.pos, end: child.end, text: createWhitespaceReplacement(source, whitespace) });
  });

  return fixes;
};

const collectJsxChildSpacingFixes = (source, sourceFile) => {
  const fixes = [];

  const visit = (node) => {
    if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
      fixes.push(...getJsxChildSpacingFixes(source, node.children));
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return fixes;
};

const applyFixes = (source, fixes) => {
  return [...fixes].sort((first, second) => second.start - first.start).reduce((nextSource, fix) => {
    return `${nextSource.slice(0, fix.start)}${fix.text}${nextSource.slice(fix.end)}`;
  }, source);
};

const fixJsxChildSpacing = (filePath, source) => {
  const sourceFile = createSourceFile(filePath, source);
  if (sourceFile.parseDiagnostics.length > 0) return source;

  return applyFixes(source, collectJsxChildSpacingFixes(source, sourceFile));
};

const updateFile = (filePath) => {
  const originalSource = readFileSync(filePath, "utf8");
  const nextSource = fixJsxChildSpacing(filePath, originalSource);

  if (nextSource === originalSource) return false;

  writeFileSync(filePath, nextSource);
  return true;
};

const updatedFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles).filter(updateFile);

if (updatedFiles.length > 0) {
  console.log(`JSX 子要素間の空行を ${updatedFiles.length} file(s) 修正しました。`);
}
