import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORIES = ["src", "apps", "packages", "shared", "functions/src", "tests", "scripts", "docs"].map((directory) => path.join(ROOT_DIR, directory));
const TEXT_EXTENSIONS = new Set([".cjs", ".css", ".html", ".js", ".jsx", ".json", ".md", ".mjs", ".scss", ".ts", ".tsx"]);
const EXCLUDED_PATH_PARTS = ["/node_modules/", "/dist/", "/build/", "/coverage/", "/.git/", "/.turbo/", "/target/", "/src/components/ui/"];
const DISALLOWED_SYMBOL_PATTERN = new RegExp("[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}]", "u");

const toPosix = (value) => value.split(path.sep).join("/");

const isExcludedPath = (filePath) => {
  const relativePath = `/${toPosix(path.relative(ROOT_DIR, filePath))}`;
  return EXCLUDED_PATH_PARTS.some((part) => relativePath.includes(part));
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
    if (!DISALLOWED_SYMBOL_PATTERN.test(line)) return [];

    return [{ filePath, line: index + 1 }];
  });
};

const formatViolation = ({ filePath, line }) => `${toPosix(path.relative(ROOT_DIR, filePath))}:${line} Do not use pictographic symbols in source files.`;

const sourceFiles = SOURCE_DIRECTORIES.flatMap(walkTextFiles);
const violations = sourceFiles.flatMap(getLineViolations);

if (violations.length > 0) {
  console.error("Pictographic symbol convention violations:");
  for (const violation of violations) {
    console.error(`- ${formatViolation(violation)}`);
  }
  process.exitCode = 1;
}
