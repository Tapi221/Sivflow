import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORIES = ["src", "apps", "packages", "shared", "functions/src", "tests", "scripts", "public"].map((directory) => path.join(ROOT_DIR, directory));
const ROOT_TEXT_FILES = ["tailwind.config.js", "postcss.config.js", "eslint.config.js", "vite.config.ts"].map((fileName) => path.join(ROOT_DIR, fileName));
const TEXT_EXTENSIONS = new Set([".cjs", ".css", ".html", ".js", ".jsx", ".json", ".md", ".mjs", ".scss", ".svg", ".ts", ".tsx", ".webmanifest", ".xml"]);
const EXCLUDED_PATH_PARTS = ["/node_modules/", "/dist/", "/build/", "/coverage/", "/.git/", "/.turbo/", "/target/"];
const LONG_HEX_COLOR_PATTERN = /(?<![-_A-Za-z0-9])#(?:[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})(?![-_A-Za-z0-9])/gu;

const toPosix = (value) => value.split(path.sep).join("/");
const getRelativePath = (filePath) => toPosix(path.relative(ROOT_DIR, filePath));
const isExcludedPath = (filePath) => {
  const relativePath = `/${getRelativePath(filePath)}`;

  return EXCLUDED_PATH_PARTS.some((part) => relativePath.includes(part));
};
const isTextFile = (filePath) => TEXT_EXTENSIONS.has(path.extname(filePath));
const walkTextFiles = (directory) => {
  if (!existsSync(directory)) return [];

  return readdirSync(directory).flatMap((entry) => {
    const entryPath = path.join(directory, entry);
    if (isExcludedPath(entryPath)) return [];

    const stat = statSync(entryPath);
    if (stat.isDirectory()) return walkTextFiles(entryPath);
    if (!stat.isFile()) return [];
    if (!isTextFile(entryPath)) return [];

    return [entryPath];
  });
};
const getExistingRootTextFiles = () => ROOT_TEXT_FILES.filter((filePath) => existsSync(filePath) && statSync(filePath).isFile() && isTextFile(filePath));
const getTextFiles = () => [...new Set([...SOURCE_DIRECTORIES.flatMap(walkTextFiles), ...getExistingRootTextFiles()])];
const isShortenableHexColor = (literal) => {
  const value = literal.slice(1).toLowerCase();
  if (value.length !== 6 && value.length !== 8) return false;

  for (let index = 0; index < value.length; index += 2) {
    if (value[index] !== value[index + 1]) return false;
  }

  return true;
};
const shortenHexColor = (literal) => {
  if (!isShortenableHexColor(literal)) return literal;

  const value = literal.slice(1).toLowerCase();
  let nextValue = "";
  for (let index = 0; index < value.length; index += 2) {
    nextValue += value[index];
  }

  return `#${nextValue}`;
};
const normalizeShortHexColors = (source) => source.replace(LONG_HEX_COLOR_PATTERN, (literal) => shortenHexColor(literal));
const getLineColumn = (source, offset) => {
  const line = source.slice(0, offset).split("\n").length;
  const lineStart = source.lastIndexOf("\n", offset - 1) + 1;

  return { line, column: offset - lineStart + 1 };
};
const getShortHexColorViolations = (filePath, source) => [...source.matchAll(LONG_HEX_COLOR_PATTERN)].flatMap((match) => {
  const literal = match[0];
  const replacement = shortenHexColor(literal);
  if (literal === replacement) return [];

  const position = getLineColumn(source, match.index ?? 0);

  return [{ filePath, literal, replacement, ...position }];
});

export { ROOT_DIR, getRelativePath, getShortHexColorViolations, getTextFiles, normalizeShortHexColors, shortenHexColor };
