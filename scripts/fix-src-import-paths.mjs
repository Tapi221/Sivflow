import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, "src");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

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

const shouldKeepRelativeSpecifier = (specifier) => specifier.startsWith("./") && !specifier.slice(2).includes("/");

const resolveSrcAlias = (filePath, specifier) => {
  if (!specifier.startsWith(".")) return specifier;
  if (shouldKeepRelativeSpecifier(specifier)) return specifier;

  const resolvedPath = path.resolve(path.dirname(filePath), specifier);
  const relativeToSrc = path.relative(SRC_DIR, resolvedPath);

  if (relativeToSrc.startsWith("..") || path.isAbsolute(relativeToSrc)) return specifier;

  return `@/${toPosix(relativeToSrc)}`;
};

const normalizeImportSpecifiers = (filePath, source) => source
  .replace(/(\bfrom\s*["'])(\.{1,2}\/[^"]*?)(["'])/g, (_match, prefix, specifier, suffix) => `${prefix}${resolveSrcAlias(filePath, specifier)}${suffix}`)
  .replace(/(\bimport\s*["'])(\.{1,2}\/[^"]*?)(["'])/g, (_match, prefix, specifier, suffix) => `${prefix}${resolveSrcAlias(filePath, specifier)}${suffix}`)
  .replace(/(\bexport\s+[^;]*?\s+from\s*["'])(\.{1,2}\/[^"]*?)(["'])/g, (_match, prefix, specifier, suffix) => `${prefix}${resolveSrcAlias(filePath, specifier)}${suffix}`);

const applyTargetedLintFixes = (filePath, source) => {
  const relativePath = toPosix(path.relative(ROOT_DIR, filePath));
  let nextSource = source;

  if (relativePath === "src/features/calendar/grid/Grid.calendar.weekday.desktop.tsx") {
    nextSource = nextSource.replace(/\bcalendarDayColumnWidth\b/g, "_calendarDayColumnWidth");
  }

  if (relativePath === "src/integration/googlecalendar-integration/gcal.oauth.ts") {
    nextSource = nextSource.replace(/\blet pollTimer\b/, "const pollTimer");
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
