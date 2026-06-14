import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORIES = ["src", "apps/web/src", "apps/android/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/android-renderer/src", "shared", "functions/src", "tests", "scripts/dev", "scripts/verify"].map((directory) => path.join(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const CONFLICT_MARKER_PATTERN = /^(?:<{7}|={7}|>{7})(?:\s|$)/u;
const INLINE_MEMBER_CONTAINER_PATTERNS = [
  /^(\s*(?:export\s+)?(?:declare\s+)?(?:abstract\s+)?(?:class|interface)\b[^{}]*\{\s*)(\S.*)$/u,
  /^(\s*(?:export\s+)?type\b[^=]*=\s*\{\s*)(\S.*)$/u,
];
const INLINE_COMMENT_CODE_PATTERN = /^(.*?)(\s+(?:return|const|let|var|if|for|while|switch|throw|await|try)\b[\s\S]*)$/u;

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

const getScriptKind = (filePath) => {
  const extension = path.extname(filePath);
  if (extension === ".tsx") return ts.ScriptKind.TSX;
  if (extension === ".jsx") return ts.ScriptKind.JSX;
  if (extension === ".js" || extension === ".mjs") return ts.ScriptKind.JS;

  return ts.ScriptKind.TS;
};

const createSourceFile = (filePath, source) => ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, getScriptKind(filePath));

const getNewline = (source) => source.includes("\r\n") ? "\r\n" : "\n";

const splitLines = (source) => source.split(/\r?\n/u);

const isConflictMarkerLine = (line) => CONFLICT_MARKER_PATTERN.test(line.trimStart());

const stripEmptyConflictMarkerBlocks = (source) => {
  const newline = getNewline(source);
  const lines = splitLines(source);
  const nextLines = [];
  let changed = false;

  for (let index = 0; index < lines.length;) {
    const line = lines[index];

    if (!isConflictMarkerLine(line)) {
      nextLines.push(line);
      index += 1;
      continue;
    }

    let endIndex = index;
    let hasMarker = false;
    let hasNonBlankContent = false;

    while (endIndex < lines.length && (lines[endIndex].trim() === "" || isConflictMarkerLine(lines[endIndex]))) {
      if (isConflictMarkerLine(lines[endIndex])) {
        hasMarker = true;
      } else if (lines[endIndex].trim() !== "") {
        hasNonBlankContent = true;
      }
      endIndex += 1;
    }

    if (hasMarker && !hasNonBlankContent) {
      changed = true;
      index = endIndex;
      continue;
    }

    nextLines.push(line);
    index += 1;
  }

  return changed ? nextLines.join(newline) : source;
};

const splitCommentAndCode = (value) => {
  const match = value.match(INLINE_COMMENT_CODE_PATTERN);
  if (!match) return { codeText: null, commentText: value.trim() };

  return {
    codeText: match[2].trim(),
    commentText: match[1].trimEnd(),
  };
};

const splitInlineOpeningBraceCommentLines = (source) => {
  const newline = getNewline(source);
  const nextLines = [];
  let changed = false;

  for (const line of splitLines(source)) {
    const match = line.match(/^(?<prefix>.*\{\s*)\/\/\s*(?<comment>.*)$/u);
    if (!match?.groups) {
      nextLines.push(line);
      continue;
    }

    const indentation = line.match(/^\s*/u)?.[0] ?? "";
    const childIndentation = `${indentation}  `;
    const { codeText, commentText } = splitCommentAndCode(match.groups.comment);

    nextLines.push(match.groups.prefix.trimEnd());
    if (commentText.length > 0) nextLines.push(`${childIndentation}// ${commentText}`);
    if (codeText) nextLines.push(`${childIndentation}${codeText}`);
    changed = true;
  }

  return changed ? nextLines.join(newline) : source;
};

const matchInlineMemberContainer = (line) => {
  for (const pattern of INLINE_MEMBER_CONTAINER_PATTERNS) {
    const match = line.match(pattern);
    if (match) return match;
  }

  return null;
};

const splitInlineMemberContainerLines = (source) => {
  const newline = getNewline(source);
  const nextLines = [];
  let changed = false;

  for (const line of splitLines(source)) {
    const match = matchInlineMemberContainer(line);
    if (!match || match[2].trim() === "}") {
      nextLines.push(line);
      continue;
    }

    const indentation = line.match(/^\s*/u)?.[0] ?? "";
    nextLines.push(match[1].trimEnd());
    nextLines.push(`${indentation}  ${match[2]}`);
    changed = true;
  }

  return changed ? nextLines.join(newline) : source;
};

const applySourceLayoutFix = (source) => {
  let nextSource = source;
  const maxPassCount = 20;

  for (let pass = 0; pass < maxPassCount; pass += 1) {
    const fixedSource = splitInlineMemberContainerLines(splitInlineOpeningBraceCommentLines(stripEmptyConflictMarkerBlocks(nextSource)));
    if (fixedSource === nextSource) return nextSource;
    nextSource = fixedSource;
  }

  return nextSource;
};

const isNamedImports = (namedBindings) => Boolean(namedBindings && ts.isNamedImports(namedBindings));

const hasTypeOnlyImportSpecifier = (node) => {
  const importClause = node.importClause;
  if (!importClause || !isNamedImports(importClause.namedBindings)) return false;

  return importClause.namedBindings.elements.some((specifier) => specifier.isTypeOnly);
};

const getImportNameText = (name, sourceFile) => name.getText(sourceFile);

const getImportSpecifierText = (specifier, sourceFile) => {
  const importedName = specifier.propertyName ? getImportNameText(specifier.propertyName, sourceFile) : null;
  const localName = getImportNameText(specifier.name, sourceFile);

  return importedName ? `${importedName} as ${localName}` : localName;
};

const getNamedImportsText = (specifiers, sourceFile) => specifiers.map((specifier) => getImportSpecifierText(specifier, sourceFile)).join(", ");

const getModuleSuffixText = (source, sourceFile, node) => source.slice(node.moduleSpecifier.getEnd(sourceFile), node.getEnd()).replace(/;\s*$/u, "");

const createImportText = ({ defaultName, importKind, moduleSpecifierText, moduleSuffixText, sourceFile, specifiers }) => {
  const prefix = importKind === "type" ? "import type" : "import";
  const clauses = [];
  if (defaultName) clauses.push(defaultName);
  if (specifiers.length > 0) clauses.push(`{ ${getNamedImportsText(specifiers, sourceFile)} }`);
  if (clauses.length === 0) return null;

  return `${prefix} ${clauses.join(", ")} from ${moduleSpecifierText}${moduleSuffixText};`;
};

const getTypeOnlyImportReplacementText = (source, sourceFile, node) => {
  const importClause = node.importClause;
  const namedImports = importClause.namedBindings;
  const defaultName = importClause.name?.getText(sourceFile) ?? null;
  const moduleSpecifierText = node.moduleSpecifier.getText(sourceFile);
  const moduleSuffixText = getModuleSuffixText(source, sourceFile, node);

  if (importClause.isTypeOnly) {
    return createImportText({ defaultName, importKind: "type", moduleSpecifierText, moduleSuffixText, sourceFile, specifiers: [...namedImports.elements] });
  }

  const valueSpecifiers = namedImports.elements.filter((specifier) => !specifier.isTypeOnly);
  const typeSpecifiers = namedImports.elements.filter((specifier) => specifier.isTypeOnly);
  const importTexts = [
    createImportText({ defaultName, importKind: "value", moduleSpecifierText, moduleSuffixText, sourceFile, specifiers: valueSpecifiers }),
    createImportText({ defaultName: null, importKind: "type", moduleSpecifierText, moduleSuffixText, sourceFile, specifiers: typeSpecifiers }),
  ].filter(Boolean);

  return importTexts.join(getNewline(source));
};

const applyReplacements = (source, replacements) => replacements.sort((left, right) => right.start - left.start).reduce((nextSource, replacement) => `${nextSource.slice(0, replacement.start)}${replacement.text}${nextSource.slice(replacement.end)}`, source);

const collectTypeOnlyImportReplacements = (filePath, source) => {
  const sourceFile = createSourceFile(filePath, source);

  return sourceFile.statements.flatMap((statement) => {
    if (!ts.isImportDeclaration(statement)) return [];
    if (!hasTypeOnlyImportSpecifier(statement)) return [];

    return [{ end: statement.getEnd(), start: statement.getStart(sourceFile), text: getTypeOnlyImportReplacementText(source, sourceFile, statement) }];
  });
};

const applyTypeOnlyImportFix = (filePath, source) => {
  const sourceLayoutSource = applySourceLayoutFix(source);
  const replacements = collectTypeOnlyImportReplacements(filePath, sourceLayoutSource);

  return replacements.length === 0 ? sourceLayoutSource : applyReplacements(sourceLayoutSource, replacements);
};

const updateFile = (filePath) => {
  const originalSource = readFileSync(filePath, "utf8");
  const nextSource = applyTypeOnlyImportFix(filePath, originalSource);

  if (nextSource === originalSource) return false;

  writeFileSync(filePath, nextSource);
  return true;
};

const updatedFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles).filter(updateFile);

if (updatedFiles.length > 0) {
  console.log(`type-only import / source layout 規約の整形を ${updatedFiles.length} file(s) 修正しました。`);
}
