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
const SPECIFIER_PATTERNS = [
  /(\bfrom\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+|@core\/[^"']+|@platform\/[^"']+|@web-renderer\/[^"']+|@mobile-renderer\/[^"']+|@mobile\/[^"']+|@shared\/[^"']+)(["'])/gu,
  /(\bimport\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+|@core\/[^"']+|@platform\/[^"']+|@web-renderer\/[^"']+|@mobile-renderer\/[^"']+|@mobile\/[^"']+|@shared\/[^"']+)(["'])/gu,
  /(\bimport\s*\(\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+|@core\/[^"']+|@platform\/[^"']+|@web-renderer\/[^"']+|@mobile-renderer\/[^"']+|@mobile\/[^"']+|@shared\/[^"']+)(["']\s*\))/gu,
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

const isInsideDirectory = (filePath, directoryPath) => {
  const relativePath = path.relative(directoryPath, filePath);

  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
};

const shouldCheckFile = (filePath) => {
  const fileName = path.basename(filePath);
  if (INDEX_FILE_NAMES.has(fileName)) return false;

  return !EXCLUDED_FILE_SUFFIXES.some((suffix) => filePath.endsWith(suffix));
};

const hasKnownExtension = (modulePath) => RESOLVABLE_EXTENSIONS.some((extension) => modulePath.endsWith(extension));

const stripKnownExtension = (modulePath) => {
  for (const extension of RESOLVABLE_EXTENSIONS) {
    if (modulePath.endsWith(extension)) return modulePath.slice(0, -extension.length);
  }

  return modulePath;
};

const stripTrailingIndex = (modulePath) => modulePath.endsWith("/index") ? modulePath.slice(0, -"/index".length) : modulePath;

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

const findAliasRootByPrefix = (specifier) => ALIAS_ROOTS.find(({ prefix }) => specifier.startsWith(`${prefix}/`));

const findAliasRootByFilePath = (filePath) => ALIAS_ROOTS.find(({ directory }) => isInsideDirectory(filePath, directory));

const resolveSpecifierPath = (importerDir, specifier) => {
  const aliasRoot = findAliasRootByPrefix(specifier);
  if (aliasRoot) return resolveExistingModulePath(path.join(aliasRoot.directory, specifier.slice(aliasRoot.prefix.length + 1)));
  if (specifier.startsWith(".")) return resolveExistingModulePath(path.resolve(importerDir, specifier));

  return null;
};

const toSameDirectoryRelativeSpecifier = (importerDir, targetFilePath, originalSpecifier) => {
  const originalHadKnownExtension = hasKnownExtension(originalSpecifier);
  const relativeFromImporter = toPosix(path.relative(importerDir, targetFilePath));
  const modulePath = originalHadKnownExtension ? relativeFromImporter : stripTrailingIndex(stripKnownExtension(relativeFromImporter));

  return modulePath.startsWith(".") ? modulePath : `./${modulePath}`;
};

const toAliasSpecifier = (targetFilePath, aliasRoot, originalSpecifier) => {
  const originalHadKnownExtension = hasKnownExtension(originalSpecifier);
  const relativeToAliasRoot = toPosix(path.relative(aliasRoot.directory, targetFilePath));
  const modulePath = originalHadKnownExtension ? relativeToAliasRoot : stripTrailingIndex(stripKnownExtension(relativeToAliasRoot));

  return `${aliasRoot.prefix}/${modulePath}`;
};

const toPreferredSpecifier = (importerFilePath, targetFilePath, originalSpecifier) => {
  const importerDir = path.dirname(importerFilePath);
  const targetDir = path.dirname(targetFilePath);
  if (targetDir === importerDir) return toSameDirectoryRelativeSpecifier(importerDir, targetFilePath, originalSpecifier);

  const aliasRoot = findAliasRootByFilePath(targetFilePath);
  if (aliasRoot) return toAliasSpecifier(targetFilePath, aliasRoot, originalSpecifier);

  return toSameDirectoryRelativeSpecifier(importerDir, targetFilePath, originalSpecifier);
};

const getScriptKind = (filePath) => {
  const extension = path.extname(filePath);
  if (extension === ".tsx") return ts.ScriptKind.TSX;
  if (extension === ".jsx") return ts.ScriptKind.JSX;
  if (extension === ".js" || extension === ".mjs") return ts.ScriptKind.JS;

  return ts.ScriptKind.TS;
};

const isDirectiveStatement = (statement) => ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression);

const getCheckStatements = (sourceFile) => sourceFile.statements.filter((statement) => !isDirectiveStatement(statement));

const getCompatExportTarget = (filePath) => {
  if (!shouldCheckFile(filePath)) return null;

  const source = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, getScriptKind(filePath));
  const statements = getCheckStatements(sourceFile);
  if (statements.length === 0) return null;
  if (!statements.every((statement) => ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier))) return null;

  const targetFilePaths = [...new Set(statements.map((statement) => resolveSpecifierPath(path.dirname(filePath), statement.moduleSpecifier.text)).filter(Boolean))];
  return targetFilePaths.length === 1 ? targetFilePaths[0] : null;
};

const createCompatTargetMap = (sourceFiles) => new Map(sourceFiles.map((filePath) => [filePath, getCompatExportTarget(filePath)]).filter(([, targetFilePath]) => targetFilePath));

const rewriteCompatSpecifier = (filePath, source, compatTargetMap) => {
  let nextSource = source;

  for (const specifierPattern of SPECIFIER_PATTERNS) {
    nextSource = nextSource.replace(specifierPattern, (match, prefix, specifier, suffix) => {
      const resolvedPath = resolveSpecifierPath(path.dirname(filePath), specifier);
      const targetFilePath = resolvedPath ? compatTargetMap.get(resolvedPath) : null;
      if (!targetFilePath) return match;

      return `${prefix}${toPreferredSpecifier(filePath, targetFilePath, specifier)}${suffix}`;
    });
  }

  return nextSource;
};

const updateImportingFile = (filePath, compatTargetMap) => {
  const source = readFileSync(filePath, "utf8");
  const nextSource = rewriteCompatSpecifier(filePath, source, compatTargetMap);
  if (nextSource === source) return false;

  writeFileSync(filePath, nextSource);
  return true;
};

const deleteCompatFile = (filePath) => {
  unlinkSync(filePath);
  return true;
};

const sourceFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles);
const compatTargetMap = createCompatTargetMap(sourceFiles);
const updatedFiles = sourceFiles.filter((filePath) => updateImportingFile(filePath, compatTargetMap));
const deletedFiles = [...compatTargetMap.keys()].filter(deleteCompatFile);

if (updatedFiles.length > 0 || deletedFiles.length > 0) {
  console.log(`互換 export ファイル規約の自動修正で ${updatedFiles.length} file(s) の import を修正し、${deletedFiles.length} file(s) を削除しました。`);
}
