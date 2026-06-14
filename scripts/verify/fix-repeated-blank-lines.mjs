import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORY_PATTERNS = process.env.SOURCE_CONVENTION_TARGETS?.split(path.delimiter).filter(Boolean) ?? ["src", "apps/web/src", "apps/android/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/android-renderer/src", "shared", "functions/src", "tests", "scripts/dev", "scripts/verify"];
const SOURCE_DIRECTORIES = SOURCE_DIRECTORY_PATTERNS.map((directory) => path.resolve(ROOT_DIR, directory));
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

const getNewline = (source) => source.includes("\r\n") ? "\r\n" : "\n";

const collapseRepeatedBlankLines = (source) => {
  const newline = getNewline(source);
  const repeatedBlankLinePattern = newline === "\r\n" ? /\r\n[\t ]*(?:\r\n[\t ]*){2,}/gu : /\n[\t ]*(?:\n[\t ]*){2,}/gu;

  return source.replace(repeatedBlankLinePattern, `${newline}${newline}`);
};

const updateFile = (filePath) => {
  const originalSource = readFileSync(filePath, "utf8");
  const nextSource = collapseRepeatedBlankLines(originalSource);

  if (nextSource === originalSource) return false;

  writeFileSync(filePath, nextSource);
  return true;
};

const updatedFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles).filter(updateFile);

if (updatedFiles.length > 0) {
  console.log(`連続空行を ${updatedFiles.length} file(s) 修正しました。`);
}
