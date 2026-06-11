import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORIES = ["src", "apps/web/src", "apps/mobile/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/mobile-renderer/src", "shared", "functions/src", "tests", "scripts/dev", "scripts/verify"].map((directory) => path.join(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);

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
  const replacements = collectTypeOnlyImportReplacements(filePath, source);

  return replacements.length === 0 ? source : applyReplacements(source, replacements);
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
  console.log(`type-only import 規約の整形を ${updatedFiles.length} file(s) 修正しました。`);
}
