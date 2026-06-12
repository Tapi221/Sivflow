import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORY_PATTERNS = process.env.SOURCE_CONVENTION_TARGETS?.split(path.delimiter).filter(Boolean) ?? ["src", "apps/web/src", "apps/mobile/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/mobile-renderer/src", "shared", "functions/src"];
const SOURCE_DIRECTORIES = SOURCE_DIRECTORY_PATTERNS.map((directory) => path.resolve(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const ORDER_EXCLUDED_PATH_PARTS = ["/tests/", "/scripts/", "/src/sandbox/"];
const ORDER_EXCLUDED_FILE_SUFFIXES = [".d.ts"];

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

const shouldFixMergedExports = (filePath) => {
  const relativePath = `/${toPosix(path.relative(ROOT_DIR, filePath))}`;
  if (ORDER_EXCLUDED_FILE_SUFFIXES.some((suffix) => relativePath.endsWith(suffix))) return false;

  return !ORDER_EXCLUDED_PATH_PARTS.some((part) => relativePath.includes(part));
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

const collapseRepeatedBlankLines = (source) => {
  const newline = getNewline(source);
  const repeatedBlankLinePattern = newline === "\r\n" ? /\r\n[\t ]*(?:\r\n[\t ]*){2,}/gu : /\n[\t ]*(?:\n[\t ]*){2,}/gu;

  return source.replace(repeatedBlankLinePattern, `${newline}${newline}`);
};

const isMergeableLocalNamedExportDeclaration = (statement) => {
  if (!ts.isExportDeclaration(statement)) return false;
  if (statement.moduleSpecifier) return false;
  if (!statement.exportClause || !ts.isNamedExports(statement.exportClause)) return false;
  if (statement.exportClause.elements.length === 0) return false;

  return statement.exportClause.elements.every((specifier) => !specifier.isTypeOnly);
};

const getExportDeclarationKind = (statement) => statement.isTypeOnly ? "type" : "value";

const getExportSpecifierText = (source, sourceFile, specifier) => source.slice(specifier.getStart(sourceFile), specifier.getEnd()).trim();

const getExportDeclarationEntries = (source, sourceFile, statement) => statement.exportClause.elements.map((specifier) => getExportSpecifierText(source, sourceFile, specifier));

const getUniqueEntries = (entries) => [...new Set(entries)];

const createReplacement = (start, end, text) => ({ end, start, text });

const rangesOverlap = (left, right) => left.start < right.end && right.start < left.end;

const applyNonOverlappingReplacements = (source, replacements) => {
  const acceptedReplacements = [];

  for (const replacement of [...replacements].sort((left, right) => right.start - left.start)) {
    if (acceptedReplacements.some((acceptedReplacement) => rangesOverlap(replacement, acceptedReplacement))) continue;

    acceptedReplacements.push(replacement);
  }

  return acceptedReplacements.reduce((nextSource, replacement) => `${nextSource.slice(0, replacement.start)}${replacement.text}${nextSource.slice(replacement.end)}`, source);
};

const collectMergeableExportDeclarations = (sourceFile) => {
  const groups = {
    type: [],
    value: [],
  };

  for (const statement of sourceFile.statements) {
    if (!isMergeableLocalNamedExportDeclaration(statement)) continue;

    groups[getExportDeclarationKind(statement)].push(statement);
  }

  return groups;
};

const collectMergedExportReplacements = (source, sourceFile, declarations, kind) => {
  if (declarations.length <= 1) return [];

  const entries = getUniqueEntries(declarations.flatMap((statement) => getExportDeclarationEntries(source, sourceFile, statement)));
  const firstDeclaration = declarations[0];
  const exportKeyword = kind === "type" ? "export type" : "export";
  const replacements = [createReplacement(firstDeclaration.getStart(sourceFile), firstDeclaration.getEnd(), `${exportKeyword} { ${entries.join(", ")} };`)];

  for (const statement of declarations.slice(1)) {
    replacements.push(createReplacement(statement.getStart(sourceFile), statement.getEnd(), ""));
  }

  return replacements;
};

const applyMergedExportFix = (filePath, source) => {
  if (!shouldFixMergedExports(filePath)) return source;

  const sourceFile = createSourceFile(filePath, source);
  if (sourceFile.parseDiagnostics.length > 0) return source;

  const groups = collectMergeableExportDeclarations(sourceFile);
  const replacements = [
    ...collectMergedExportReplacements(source, sourceFile, groups.value, "value"),
    ...collectMergedExportReplacements(source, sourceFile, groups.type, "type"),
  ];
  if (replacements.length === 0) return source;

  return collapseRepeatedBlankLines(applyNonOverlappingReplacements(source, replacements));
};

const updateFile = (filePath) => {
  const originalSource = readFileSync(filePath, "utf8");
  const nextSource = applyMergedExportFix(filePath, originalSource);

  if (nextSource === originalSource) return false;

  writeFileSync(filePath, nextSource);
  return true;
};

const updatedFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles).filter(updateFile);

if (updatedFiles.length > 0) {
  console.log(`local named export を ${updatedFiles.length} file(s) 統合しました。`);
}
