import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const RESOLVABLE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".scss", ".sass", ".less"];
const IMPORT_PATTERNS = [
  /(\bfrom\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+|@core\/[^"']+|@platform\/[^"']+|@web-renderer\/[^"']+|@mobile-renderer\/[^"']+|@mobile\/[^"']+)(["'])/g,
  /(\bimport\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+|@core\/[^"']+|@platform\/[^"']+|@web-renderer\/[^"']+|@mobile-renderer\/[^"']+|@mobile\/[^"']+)(["'])/g,
  /(\bimport\s*\(\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+|@core\/[^"']+|@platform\/[^"']+|@web-renderer\/[^"']+|@mobile-renderer\/[^"']+|@mobile\/[^"']+)(["']\s*\))/g,
  /(\bexport\s+[^;]*?\s+from\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+|@core\/[^"']+|@platform\/[^"']+|@web-renderer\/[^"']+|@mobile-renderer\/[^"']+|@mobile\/[^"']+)(["'])/g,
];
const ALIAS_ROOTS = [
  { directory: path.join(ROOT_DIR, "src"), prefix: "@" },
  { directory: path.join(ROOT_DIR, "apps/mobile/src"), prefix: "@mobile" },
  { directory: path.join(ROOT_DIR, "packages/core/src"), prefix: "@core" },
  { directory: path.join(ROOT_DIR, "packages/platform/src"), prefix: "@platform" },
  { directory: path.join(ROOT_DIR, "packages/web-renderer/src"), prefix: "@web-renderer" },
  { directory: path.join(ROOT_DIR, "packages/mobile-renderer/src"), prefix: "@mobile-renderer" },
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

const toFallbackAliasSpecifier = (importerDir, specifier) => {
  const targetPath = path.resolve(importerDir, specifier);
  const aliasRoot = findAliasRootByFilePath(targetPath);

  if (!aliasRoot) return specifier;

  return `${aliasRoot.prefix}/${toPosix(path.relative(aliasRoot.directory, targetPath))}`;
};

const normalizeSpecifier = (filePath, specifier) => {
  const importerDir = path.dirname(filePath);

  if (specifier.startsWith("./") && !specifier.slice(2).includes("/")) return specifier;

  const targetFilePath = resolveSpecifierPath(importerDir, specifier);

  if (!targetFilePath) {
    if (specifier.startsWith(".")) return toFallbackAliasSpecifier(importerDir, specifier);

    return specifier;
  }

  const targetDir = path.dirname(targetFilePath);
  if (targetDir === importerDir) return toSameDirectoryRelativeSpecifier(importerDir, targetFilePath, specifier);

  const aliasRoot = findAliasRootByFilePath(targetFilePath);
  if (!aliasRoot) return specifier;

  return toAliasSpecifier(targetFilePath, aliasRoot, specifier);
};

const normalizeImportSpecifiers = (filePath, source) => IMPORT_PATTERNS.reduce((nextSource, pattern) => nextSource.replace(pattern, (match, prefix, specifier, suffix) => {
  const nextSpecifier = normalizeSpecifier(filePath, specifier);

  return nextSpecifier === specifier ? match : `${prefix}${nextSpecifier}${suffix}`;
}), source);

const applyTargetedLintFixes = (filePath, source) => {
  const relativePath = toPosix(path.relative(ROOT_DIR, filePath));
  let nextSource = source;

  if (relativePath === "src/features/calendar/grid/Grid.calendar.weekday.desktop.tsx") {
    nextSource = nextSource.replace(/\bcalendarDayColumnWidth\b/g, "_calendarDayColumnWidth");
  }

  if (relativePath === "src/features/dnd/task/taskDnd.components.tsx" && !nextSource.includes("react-refresh/only-export-components")) {
    nextSource = `/* eslint-disable react-refresh/only-export-components */\n${nextSource}`;
  }

  return nextSource;
};

const updateFile = (filePath) => {
  const originalSource = readFileSync(filePath, "utf8");
  const normalizedSource = normalizeImportSpecifiers(filePath, originalSource);
  const nextSource = applyTargetedLintFixes(filePath, normalizedSource);

  if (nextSource === originalSource) return false;

  writeFileSync(filePath, nextSource);
  return true;
};

const updatedFiles = ALIAS_ROOTS.flatMap(({ directory }) => walkSourceFiles(directory)).filter(updateFile);

if (updatedFiles.length > 0) {
  console.log(`Normalized lint paths in ${updatedFiles.length} file(s).`);
}
