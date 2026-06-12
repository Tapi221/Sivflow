import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORIES = ["src", "apps/web/src", "apps/mobile/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/mobile-renderer/src", "shared", "functions/src", "tests", "scripts/dev", "scripts/verify"].map((directory) => path.join(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const RESOLVABLE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".css", ".scss", ".sass", ".less"];
const INDEX_FILE_NAMES = new Set(["index.ts", "index.tsx", "index.js", "index.jsx", "index.mjs"]);
const EXCLUDED_FILE_SUFFIXES = [".d.ts"];
const ALIAS_ROOTS = [
  { directory: path.join(ROOT_DIR, "src"), prefix: "@" },
  { directory: path.join(ROOT_DIR, "apps/mobile/src"), prefix: "@mobile" },
  { directory: path.join(ROOT_DIR, "packages/core/src"), prefix: "@core" },
  { directory: path.join(ROOT_DIR, "packages/platform/src"), prefix: "@platform" },
  { directory: path.join(ROOT_DIR, "packages/web-renderer/src"), prefix: "@web-renderer" },
  { directory: path.join(ROOT_DIR, "packages/mobile-renderer/src"), prefix: "@mobile-renderer" },
  { directory: path.join(ROOT_DIR, "shared"), prefix: "@shared" },
];

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

const withoutResolvableExtension = (filePath) => {
  const extension = path.extname(filePath);
  if (!RESOLVABLE_EXTENSIONS.includes(extension)) return filePath;

  return filePath.slice(0, -extension.length);
};

const withoutIndexSegment = (filePath) => {
  const parsed = path.parse(filePath);
  return parsed.name === "index" ? parsed.dir : filePath;
};

const toModulePath = (filePath) => toPosix(withoutIndexSegment(withoutResolvableExtension(filePath)));

const fileExists = (filePath) => {
  try {
    return statSync(filePath).isFile();
  } catch {
    return false;
  }
};

const resolveExistingModulePath = (basePath) => {
  if (fileExists(basePath)) return basePath;

  for (const extension of RESOLVABLE_EXTENSIONS) {
    if (fileExists(`${basePath}${extension}`)) return `${basePath}${extension}`;
  }

  for (const extension of RESOLVABLE_EXTENSIONS) {
    const indexPath = path.join(basePath, `index${extension}`);
    if (fileExists(indexPath)) return indexPath;
  }

  return null;
};

const findAliasRootByPrefix = (specifier) => ALIAS_ROOTS.find(({ prefix }) => specifier === prefix || specifier.startsWith(`${prefix}/`));

const resolveSpecifierPath = (filePath, specifier) => {
  const aliasRoot = findAliasRootByPrefix(specifier);
  if (aliasRoot) return resolveExistingModulePath(path.join(aliasRoot.directory, specifier.slice(aliasRoot.prefix.length + 1)));
  if (specifier.startsWith(".")) return resolveExistingModulePath(path.resolve(path.dirname(filePath), specifier));

  return null;
};

const findAliasRootByFilePath = (filePath) => {
  return [...ALIAS_ROOTS].sort((first, second) => second.directory.length - first.directory.length).find(({ directory }) => filePath === directory || filePath.startsWith(`${directory}${path.sep}`));
};

const getModuleSpecifierForTarget = (fromFilePath, targetFilePath, fallbackSpecifier) => {
  if (!targetFilePath) return fallbackSpecifier;

  const fromDirectory = path.dirname(fromFilePath);
  const targetDirectory = path.dirname(targetFilePath);
  const targetModulePath = toModulePath(targetFilePath);

  if (fromDirectory === targetDirectory) {
    const relativeTarget = toPosix(path.relative(fromDirectory, targetModulePath));
    return relativeTarget.startsWith(".") ? relativeTarget : `./${relativeTarget}`;
  }

  const aliasRoot = findAliasRootByFilePath(targetFilePath);
  if (aliasRoot) {
    const relativeTarget = toPosix(path.relative(aliasRoot.directory, targetModulePath));
    return `${aliasRoot.prefix}/${relativeTarget}`;
  }

  const relativeTarget = toPosix(path.relative(fromDirectory, targetModulePath));
  return relativeTarget.startsWith(".") ? relativeTarget : `./${relativeTarget}`;
};

const getScriptKind = (filePath) => {
  const extension = path.extname(filePath);
  if (extension === ".tsx") return ts.ScriptKind.TSX;
  if (extension === ".jsx") return ts.ScriptKind.JSX;
  if (extension === ".js" || extension === ".mjs") return ts.ScriptKind.JS;

  return ts.ScriptKind.TS;
};

const createSourceFile = (filePath, source) => ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, getScriptKind(filePath));

const shouldCheckFile = (filePath) => {
  const fileName = path.basename(filePath);
  if (INDEX_FILE_NAMES.has(fileName)) return false;

  return !EXCLUDED_FILE_SUFFIXES.some((suffix) => filePath.endsWith(suffix));
};

const isDirectiveStatement = (statement) => ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression);

const getCheckStatements = (sourceFile) => sourceFile.statements.filter((statement) => !isDirectiveStatement(statement));

const getExportedName = (exportSpecifier) => exportSpecifier.name.text;

const getTargetName = (exportSpecifier) => exportSpecifier.propertyName?.text ?? exportSpecifier.name.text;

const getDirectExportMappings = (filePath, sourceFile) => {
  if (!shouldCheckFile(filePath)) return null;

  const statements = getCheckStatements(sourceFile);
  if (statements.length === 0) return null;
  if (!statements.every((statement) => ts.isExportDeclaration(statement) && Boolean(statement.moduleSpecifier) && statement.exportClause && ts.isNamedExports(statement.exportClause))) return null;

  const mappings = new Map();

  for (const statement of statements) {
    const moduleSpecifier = statement.moduleSpecifier.text;
    const targetFilePath = resolveSpecifierPath(filePath, moduleSpecifier);

    for (const element of statement.exportClause.elements) {
      mappings.set(getExportedName(element), {
        isTypeOnly: Boolean(statement.isTypeOnly || element.isTypeOnly),
        targetFilePath,
        targetModuleSpecifier: moduleSpecifier,
        targetName: getTargetName(element),
      });
    }
  }

  return mappings;
};

const collectCompatFiles = (sourceFiles) => {
  const compatFiles = new Map();

  for (const filePath of sourceFiles) {
    const source = readFileSync(filePath, "utf8");
    const sourceFile = createSourceFile(filePath, source);
    if (sourceFile.parseDiagnostics.length > 0) continue;

    const directMappings = getDirectExportMappings(filePath, sourceFile);
    if (!directMappings) continue;

    compatFiles.set(filePath, { directMappings, filePath });
  }

  return compatFiles;
};

const resolveExportMapping = (compatFiles, filePath, exportedName, visited = new Set()) => {
  const visitKey = `${filePath}:${exportedName}`;
  if (visited.has(visitKey)) return null;

  const compatFile = compatFiles.get(filePath);
  if (!compatFile) return null;

  const directMapping = compatFile.directMappings.get(exportedName);
  if (!directMapping) return null;

  if (directMapping.targetFilePath && compatFiles.has(directMapping.targetFilePath)) {
    const nestedMapping = resolveExportMapping(compatFiles, directMapping.targetFilePath, directMapping.targetName, new Set([...visited, visitKey]));
    if (nestedMapping) {
      return {
        ...nestedMapping,
        isTypeOnly: directMapping.isTypeOnly || nestedMapping.isTypeOnly,
      };
    }
  }

  return directMapping;
};

const getImportModuleSpecifier = (node) => ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : null;

const getNamedImports = (node) => {
  const namedBindings = node.importClause?.namedBindings;
  if (!namedBindings || !ts.isNamedImports(namedBindings)) return null;

  return namedBindings.elements;
};

const getImportedName = (importSpecifier) => importSpecifier.propertyName?.text ?? importSpecifier.name.text;

const createImportSpecifierText = (targetName, localName) => targetName === localName ? targetName : `${targetName} as ${localName}`;

const addImportGroupItem = (groups, key, item) => {
  const currentGroup = groups.get(key) ?? { isTypeOnly: item.isTypeOnly, moduleSpecifier: item.moduleSpecifier, specifiers: [] };
  currentGroup.specifiers.push(item.specifierText);
  groups.set(key, currentGroup);
};

const createReplacementImports = (groups) => {
  return [...groups.values()].map((group) => {
    const uniqueSpecifiers = [...new Set(group.specifiers)].sort((first, second) => first.localeCompare(second));
    const importKind = group.isTypeOnly ? "import type" : "import";

    return `${importKind} { ${uniqueSpecifiers.join(", ")} } from "${group.moduleSpecifier}";`;
  }).join("\n");
};

const createImportReplacement = (filePath, compatFiles, importNode, compatFilePath) => {
  const importSpecifiers = getNamedImports(importNode);
  if (!importSpecifiers) return null;

  const groups = new Map();

  for (const importSpecifier of importSpecifiers) {
    const importedName = getImportedName(importSpecifier);
    const localName = importSpecifier.name.text;
    const mapping = resolveExportMapping(compatFiles, compatFilePath, importedName);
    if (!mapping) return null;

    const isTypeOnly = Boolean(importNode.importClause?.isTypeOnly || importSpecifier.isTypeOnly || mapping.isTypeOnly);
    const targetModuleSpecifier = getModuleSpecifierForTarget(filePath, mapping.targetFilePath, mapping.targetModuleSpecifier);
    const groupKey = `${isTypeOnly ? "type" : "value"}:${targetModuleSpecifier}`;
    const specifierText = createImportSpecifierText(mapping.targetName, localName);

    addImportGroupItem(groups, groupKey, { isTypeOnly, moduleSpecifier: targetModuleSpecifier, specifierText });
  }

  if (groups.size === 0) return null;

  return createReplacementImports(groups);
};

const collectImportReplacements = (filePath, sourceFile, compatFiles) => {
  const replacements = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;

    const moduleSpecifier = getImportModuleSpecifier(statement);
    if (!moduleSpecifier) continue;

    const importedFilePath = resolveSpecifierPath(filePath, moduleSpecifier);
    if (!importedFilePath || !compatFiles.has(importedFilePath)) continue;

    const replacementText = createImportReplacement(filePath, compatFiles, statement, importedFilePath);
    if (!replacementText) continue;

    replacements.push({ end: statement.getEnd(), start: statement.getStart(sourceFile), text: replacementText });
  }

  return replacements;
};

const applyReplacements = (source, replacements) => {
  return [...replacements].sort((first, second) => second.start - first.start).reduce((nextSource, replacement) => {
    return `${nextSource.slice(0, replacement.start)}${replacement.text}${nextSource.slice(replacement.end)}`;
  }, source);
};

const updateImportsInFile = (filePath, compatFiles) => {
  const source = readFileSync(filePath, "utf8");
  const sourceFile = createSourceFile(filePath, source);
  if (sourceFile.parseDiagnostics.length > 0) return false;

  const replacements = collectImportReplacements(filePath, sourceFile, compatFiles);
  if (replacements.length === 0) return false;

  writeFileSync(filePath, applyReplacements(source, replacements));
  return true;
};

const deleteCompatFile = (filePath) => {
  unlinkSync(filePath);
  return true;
};

const sourceFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles);
const compatFiles = collectCompatFiles(sourceFiles);
const updatedFiles = sourceFiles.filter((filePath) => !compatFiles.has(filePath)).filter((filePath) => updateImportsInFile(filePath, compatFiles));
const deletedFiles = [...compatFiles.keys()].filter(deleteCompatFile);

if (updatedFiles.length > 0 || deletedFiles.length > 0) {
  console.log(`互換 export ファイル規約の自動修正で ${updatedFiles.length} file(s) の import を修正し、${deletedFiles.length} file(s) を削除しました。`);
}
