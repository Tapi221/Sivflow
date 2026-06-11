import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORIES = ["src", "apps", "packages", "shared", "functions/src", "tests", "scripts", "docs"].map((directory) => path.join(ROOT_DIR, directory));
const TEXT_EXTENSIONS = new Set([".cjs", ".css", ".html", ".js", ".jsx", ".json", ".md", ".mjs", ".scss", ".ts", ".tsx"]);
const EXCLUDED_PATH_PARTS = ["/node_modules/", "/dist/", "/build/", "/coverage/", "/.git/", "/.turbo/", "/target/", "/src/components/ui/"];
const DISALLOWED_SYMBOL_PATTERN = new RegExp("[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}]", "gu");
const ESLINT_ERROR_SYMBOL = String.fromCodePoint(0x2716);
const ALLOWED_SYMBOLS_BY_FILE = new Map([["scripts/lint-eslint-ja.mjs", new Set([ESLINT_ERROR_SYMBOL])]]);

const toPosix = (value) => value.split(path.sep).join("/");

const isExcludedPath = (filePath) => {
  const relativePath = `/${toPosix(path.relative(ROOT_DIR, filePath))}`;
  return EXCLUDED_PATH_PARTS.some((part) => relativePath.includes(part));
};

const isAllowedSymbol = (filePath, symbol) => {
  const relativePath = toPosix(path.relative(ROOT_DIR, filePath));
  return ALLOWED_SYMBOLS_BY_FILE.get(relativePath)?.has(symbol) ?? false;
};

const getDisallowedSymbols = (filePath, line) => {
  const symbols = [...line.matchAll(DISALLOWED_SYMBOL_PATTERN)].map((match) => match[0]).filter((symbol) => !isAllowedSymbol(filePath, symbol));
  return [...new Set(symbols)];
};

const walkTextFiles = (directory) => {
  if (!existsSync(directory)) return [];

  return readdirSync(directory).flatMap((entry) => {
    const entryPath = path.join(directory, entry);
    if (isExcludedPath(entryPath)) return [];

    const stat = statSync(entryPath);
    if (stat.isDirectory()) return walkTextFiles(entryPath);
    if (!stat.isFile()) return [];
    if (!TEXT_EXTENSIONS.has(path.extname(entryPath))) return [];

    return [entryPath];
  });
};

const getLineViolations = (filePath) => {
  const source = readFileSync(filePath, "utf8");
  return source.split(/\r?\n/).flatMap((line, index) => {
    const symbols = getDisallowedSymbols(filePath, line);
    if (symbols.length === 0) return [];

    return [{ filePath, line: index + 1, symbols }];
  });
};

const formatSymbol = (symbol) => `U+${symbol.codePointAt(0).toString(16).toUpperCase()}`;

const formatViolation = ({ filePath, line, symbols }) => `${toPosix(path.relative(ROOT_DIR, filePath))}:${line} Do not use pictographic symbols in source files. Found: ${symbols.map(formatSymbol).join(", ")}.`;

const sourceFiles = SOURCE_DIRECTORIES.flatMap(walkTextFiles);
const violations = sourceFiles.flatMap(getLineViolations);

if (violations.length > 0) {
  console.error("Pictographic symbol convention violations:");
  for (const violation of violations) {
    console.error(`- ${formatViolation(violation)}`);
  }
  process.exitCode = 1;
}
