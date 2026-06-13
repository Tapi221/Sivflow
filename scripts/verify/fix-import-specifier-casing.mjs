import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const SOURCE_DIRECTORIES = ["src", "apps/web/src", "apps/mobile/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/mobile-renderer/src", "shared", "functions/src", "tests", "scripts"].map((directory) => path.join(ROOT_DIR, directory));
const IMPORT_SPECIFIER_REPLACEMENTS = [
  { from: "@/services/localDB", to: "@/services/localdb" },
  { from: "@/services/localdbRuntimeState", to: "@/services/localDBRuntimeState" },
  { from: "@/services/firebase", to: "@/infrastructure/firebase/client" },
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
const applyImportSpecifierCasingFixes = (source) => {
  return IMPORT_SPECIFIER_REPLACEMENTS.reduce((nextSource, { from, to }) => nextSource.split(from).join(to), source);
};
const updateFile = (filePath) => {
  const originalSource = readFileSync(filePath, "utf8");
  const nextSource = applyImportSpecifierCasingFixes(originalSource);
  if (nextSource === originalSource) return false;
  writeFileSync(filePath, nextSource);
  return true;
};

const updatedFiles = SOURCE_DIRECTORIES.flatMap((directory) => walkSourceFiles(directory)).filter(updateFile);
if (updatedFiles.length > 0) {
  console.log(`Fixed import specifier casing in ${updatedFiles.length} file(s).`);
}
