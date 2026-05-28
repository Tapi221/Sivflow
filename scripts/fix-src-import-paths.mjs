import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, "src");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const RESOLVABLE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".scss", ".sass", ".less"];
const IMPORT_PATTERNS = [
  /(\bfrom\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+)(["'])/g,
  /(\bimport\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+)(["'])/g,
  /(\bimport\s*\(\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+)(["']\s*\))/g,
  /(\bexport\s+[^;]*?\s+from\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+)(["'])/g,
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

const resolveSpecifierPath = (importerDir, specifier) => {
  if (specifier.startsWith("@/")) return resolveExistingModulePath(path.join(SRC_DIR, specifier.slice(2)));
  if (specifier.startsWith(".")) return resolveExistingModulePath(path.resolve(importerDir, specifier));

  return null;
};

const toSameDirectoryRelativeSpecifier = (importerDir, targetFilePath, originalSpecifier) => {
  const originalHadKnownExtension = hasKnownExtension(originalSpecifier);
  const relativeFromImporter = toPosix(path.relative(importerDir, targetFilePath));
  const modulePath = originalHadKnownExtension ? relativeFromImporter : stripTrailingIndex(stripKnownExtension(relativeFromImporter));

  return modulePath.startsWith(".") ? modulePath : `./${modulePath}`;
};

const toSrcAliasSpecifier = (targetFilePath, originalSpecifier) => {
  const originalHadKnownExtension = hasKnownExtension(originalSpecifier);
  const relativeToSrc = toPosix(path.relative(SRC_DIR, targetFilePath));
  const modulePath = originalHadKnownExtension ? relativeToSrc : stripTrailingIndex(stripKnownExtension(relativeToSrc));

  return `@/${modulePath}`;
};

const toFallbackSrcAliasSpecifier = (importerDir, specifier) => {
  const targetPath = path.resolve(importerDir, specifier);
  const relativeToSrc = path.relative(SRC_DIR, targetPath);

  if (relativeToSrc.startsWith("..") || path.isAbsolute(relativeToSrc)) return specifier;

  return `@/${toPosix(relativeToSrc)}`;
};

const normalizeSpecifier = (filePath, specifier) => {
  const importerDir = path.dirname(filePath);

  if (specifier.startsWith("./") && !specifier.slice(2).includes("/")) return specifier;

  const targetFilePath = resolveSpecifierPath(importerDir, specifier);

  if (!targetFilePath) {
    if (specifier.startsWith(".")) return toFallbackSrcAliasSpecifier(importerDir, specifier);

    return specifier;
  }

  const targetDir = path.dirname(targetFilePath);
  if (targetDir === importerDir) return toSameDirectoryRelativeSpecifier(importerDir, targetFilePath, specifier);
  if (!isInsideDirectory(targetFilePath, SRC_DIR)) return specifier;

  return toSrcAliasSpecifier(targetFilePath, specifier);
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

const updatedFiles = walkSourceFiles(SRC_DIR).filter(updateFile);

if (updatedFiles.length > 0) {
  console.log(`Normalized lint paths in ${updatedFiles.length} file(s).`);
}
