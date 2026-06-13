import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORY_PATTERNS = process.env.SOURCE_CONVENTION_TARGETS?.split(path.delimiter).filter(Boolean) ?? ["src", "apps/web/src", "apps/mobile/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/mobile-renderer/src", "shared", "functions/src", "tests"];
const SOURCE_DIRECTORIES = SOURCE_DIRECTORY_PATTERNS.map((directory) => path.resolve(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".tsx", ".jsx"]);
const MAX_SINGLE_CHILD_FRAGMENT_FIX_ITERATIONS = 10;

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

const getColumnNumber = (sourceFile, position) => sourceFile.getLineAndCharacterOfPosition(position).character;

const countLineBreaks = (value) => value.match(/\r\n|\n|\r/gu)?.length ?? 0;

const isWhitespaceJsxText = (source, child) => ts.isJsxText(child) && !/\S/u.test(source.slice(child.pos, child.end));

const isEmptyJsxExpression = (child) => ts.isJsxExpression(child) && !child.expression;

const isJsxTagChild = (child) => ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child);

const isDirectJsxChild = (node) => Boolean(node.parent && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent)));

const getMeaningfulJsxChildren = (source, children) => children.filter((child) => {
  if (isWhitespaceJsxText(source, child)) return false;
  if (isEmptyJsxExpression(child)) return false;

  return true;
});

const removeIndentation = (indentation, count) => {
  let index = 0;
  let remaining = count;

  while (index < indentation.length && remaining > 0) {
    const character = indentation[index];
    if (character !== " " && character !== "\t") break;

    index += 1;
    remaining -= 1;
  }

  return indentation.slice(index);
};

const normalizeReplacementIndentation = (sourceFile, node, child, replacement) => {
  const indentToRemove = Math.max(0, getColumnNumber(sourceFile, child.getStart(sourceFile)) - getColumnNumber(sourceFile, node.getStart(sourceFile)));
  if (indentToRemove === 0) return replacement;

  return replacement.replace(/(\r\n|\n|\r)([ \t]*)/gu, (_match, lineBreak, indentation) => `${lineBreak}${removeIndentation(indentation, indentToRemove)}`);
};

const getSingleChildFragmentReplacementRange = (sourceFile, node, child) => {
  if (ts.isJsxText(child)) return null;

  if (!isDirectJsxChild(node) && ts.isJsxExpression(child)) {
    if (!child.expression) return null;

    return {
      start: child.expression.getStart(sourceFile),
      end: child.expression.getEnd(),
    };
  }

  return {
    start: child.getStart(sourceFile),
    end: child.getEnd(),
  };
};

const createSingleChildFragmentReplacement = (source, sourceFile, node, child) => {
  const replacementRange = getSingleChildFragmentReplacementRange(sourceFile, node, child);
  if (!replacementRange) return null;

  const replacement = source.slice(replacementRange.start, replacementRange.end);
  return normalizeReplacementIndentation(sourceFile, node, child, replacement);
};

const collectSingleChildFragmentFixes = (source, sourceFile) => {
  const fixes = [];

  const visit = (node) => {
    if (ts.isJsxFragment(node)) {
      const meaningfulChildren = getMeaningfulJsxChildren(source, node.children);
      if (meaningfulChildren.length === 1) {
        const replacement = createSingleChildFragmentReplacement(source, sourceFile, node, meaningfulChildren[0]);
        if (replacement) {
          fixes.push({ start: node.getStart(sourceFile), end: node.getEnd(), text: replacement });
          return;
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return fixes;
};

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

const fixSingleChildFragments = (filePath, source) => {
  let nextSource = source;

  for (let iteration = 0; iteration < MAX_SINGLE_CHILD_FRAGMENT_FIX_ITERATIONS; iteration += 1) {
    const sourceFile = createSourceFile(filePath, nextSource);
    if (sourceFile.parseDiagnostics.length > 0) return nextSource;

    const fixes = collectSingleChildFragmentFixes(nextSource, sourceFile);
    if (fixes.length === 0) return nextSource;

    nextSource = applyFixes(nextSource, fixes);
  }

  return nextSource;
};

const fixJsxChildSpacing = (filePath, source) => {
  const sourceWithoutSingleChildFragments = fixSingleChildFragments(filePath, source);
  const sourceFile = createSourceFile(filePath, sourceWithoutSingleChildFragments);
  if (sourceFile.parseDiagnostics.length > 0) return sourceWithoutSingleChildFragments;

  return applyFixes(sourceWithoutSingleChildFragments, collectJsxChildSpacingFixes(sourceWithoutSingleChildFragments, sourceFile));
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
  console.log(`JSX 子要素の整形を ${updatedFiles.length} file(s) 修正しました。`);
}
