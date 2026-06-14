import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const RESOLVABLE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".scss", ".sass", ".less"];
const IMPORT_PATTERNS = [
  /(\bfrom\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+|@web\/[^"']+|@core\/[^"']+|@platform\/[^"']+|@web-renderer\/[^"']+|@android-renderer\/[^"']+|@android\/[^"']+|@shared\/[^"']+|#src\/[^"']+)(["'])/g,
  /(\bimport\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+|@web\/[^"']+|@core\/[^"']+|@platform\/[^"']+|@web-renderer\/[^"']+|@android-renderer\/[^"']+|@android\/[^"']+|@shared\/[^"']+|#src\/[^"']+)(["'])/g,
  /(\bimport\s*\(\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+|@web\/[^"']+|@core\/[^"']+|@platform\/[^"']+|@web-renderer\/[^"']+|@android-renderer\/[^"']+|@android\/[^"']+|@shared\/[^"']+|#src\/[^"']+)(["']\s*\))/g,
  /(\bexport\s+[^;]*?\s+from\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+|@web\/[^"']+|@core\/[^"']+|@platform\/[^"']+|@web-renderer\/[^"']+|@android-renderer\/[^"']+|@android\/[^"']+|@shared\/[^"']+|#src\/[^"']+)(["'])/g,
];
const ALIAS_ROOTS = [
  { directory: path.join(ROOT_DIR, "apps/web/src"), prefix: "@web" },
  { directory: path.join(ROOT_DIR, "apps/android/src"), prefix: "@android" },
  { directory: path.join(ROOT_DIR, "packages/core/src"), prefix: "@core" },
  { directory: path.join(ROOT_DIR, "packages/platform/src"), prefix: "@platform" },
  { directory: path.join(ROOT_DIR, "packages/web-renderer/src"), prefix: "@web-renderer" },
  { directory: path.join(ROOT_DIR, "packages/android-renderer/src"), prefix: "@android-renderer" },
  { directory: path.join(ROOT_DIR, "shared"), prefix: "@shared" },
  { directory: path.join(ROOT_DIR, "functions/src"), prefix: "#src" },
  { directory: path.join(ROOT_DIR, "src"), prefix: "@" },
];
const EXTRA_SOURCE_DIRECTORIES = ["tests", "scripts/dev", "scripts/verify"].map((directory) => path.join(ROOT_DIR, directory));
const SOURCE_DIRECTORIES = [...new Set([...ALIAS_ROOTS.map(({ directory }) => directory), ...EXTRA_SOURCE_DIRECTORIES])];

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

const toAliasSpecifier = (targetFilePath, aliasRoot, originalSpecifier) => {
  const originalHadKnownExtension = hasKnownExtension(originalSpecifier);
  const relativeToAliasRoot = toPosix(path.relative(aliasRoot.directory, targetFilePath));
  const modulePath = originalHadKnownExtension ? relativeToAliasRoot : stripTrailingIndex(stripKnownExtension(relativeToAliasRoot));

  return `${aliasRoot.prefix}/${modulePath}`;
};

const normalizeSpecifier = (filePath, specifier) => {
  const targetFilePath = resolveSpecifierPath(path.dirname(filePath), specifier);
  if (!targetFilePath) return specifier;

  const aliasRoot = findAliasRootByFilePath(targetFilePath);
  if (!aliasRoot) return specifier;

  return toAliasSpecifier(targetFilePath, aliasRoot, specifier);
};

const normalizeImportSpecifiers = (filePath, source) => IMPORT_PATTERNS.reduce((nextSource, pattern) => nextSource.replace(pattern, (match, prefix, specifier, suffix) => {
  const nextSpecifier = normalizeSpecifier(filePath, specifier);

  return nextSpecifier === specifier ? match : `${prefix}${nextSpecifier}${suffix}`;
}), source);

const updateFile = (filePath) => {
  const originalSource = readFileSync(filePath, "utf8");
  const nextSource = normalizeImportSpecifiers(filePath, originalSource);

  if (nextSource === originalSource) return false;

  writeFileSync(filePath, nextSource);
  return true;
};

const updatedFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles).filter(updateFile);

console.log(`Updated ${updatedFiles.length} file(s) to alias import paths.`);
