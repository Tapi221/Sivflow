import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORY_PATTERNS = process.env.SOURCE_CONVENTION_TARGETS?.split(path.delimiter).filter(Boolean) ?? ["src", "apps/web/src", "apps/mobile/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/mobile-renderer/src", "shared", "functions/src", "tests", "scripts/dev", "scripts/verify"];
const SOURCE_DIRECTORIES = SOURCE_DIRECTORY_PATTERNS.map((directory) => path.resolve(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const CONFLICT_MARKER_PATTERN = /^(?:<{7}|={7}|>{7})(?:\s|$)/u;
const INLINE_OPENING_BRACE_COMMENT_PATTERN = /\{\s*\/\//u;

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

const getLineNumber = (index) => index + 1;

const checkSourceLayout = (filePath) => {
  const source = readFileSync(filePath, "utf8");
  const violations = [];
  const lines = source.split(/\r?\n/u);

  lines.forEach((line, index) => {
    const lineNumber = getLineNumber(index);

    if (CONFLICT_MARKER_PATTERN.test(line.trimStart())) {
      violations.push({ filePath, line: lineNumber, message: "merge conflict marker を残さないでください。" });
    }

    if (INLINE_OPENING_BRACE_COMMENT_PATTERN.test(line)) {
      violations.push({ filePath, line: lineNumber, message: "{ の直後に // コメントを同じ行で置かず、次の行へ分けてください。" });
    }
  });

  return violations;
};

const formatViolation = ({ filePath, line, message }) => `${toPosix(path.relative(ROOT_DIR, filePath))}:${line} ${message}`;

const sourceFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles);
const violations = sourceFiles.flatMap(checkSourceLayout);

if (violations.length > 0) {
  console.error("source layout 違反:");
  for (const violation of violations) {
    console.error(`- ${formatViolation(violation)}`);
  }
  process.exitCode = 1;
}
