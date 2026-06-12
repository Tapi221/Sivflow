import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORY_PATTERNS = process.env.SOURCE_CONVENTION_TARGETS?.split(path.delimiter).filter(Boolean) ?? ["src", "apps/web/src", "apps/mobile/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/mobile-renderer/src", "shared", "functions/src", "tests", "scripts/dev", "scripts/verify"];
const SOURCE_DIRECTORIES = SOURCE_DIRECTORY_PATTERNS.map((directory) => path.resolve(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const ORDER_EXCLUDED_PATH_PARTS = ["/tests/", "/scripts/", "/src/sandbox/"];
const ORDER_EXCLUDED_FILE_SUFFIXES = [".d.ts"];

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

const shouldVerifyMergedExports = (filePath) => {
  const relativePath = `/${toPosix(path.relative(ROOT_DIR, filePath))}`;
  if (ORDER_EXCLUDED_FILE_SUFFIXES.some((suffix) => relativePath.endsWith(suffix))) return false;

  return !ORDER_EXCLUDED_PATH_PARTS.some((part) => relativePath.includes(part));
};

const getLineNumber = (sourceFile, position) => sourceFile.getLineAndCharacterOfPosition(position).line + 1;

const getScriptKind = (filePath) => {
  const extension = path.extname(filePath);
  if (extension === ".tsx") return ts.ScriptKind.TSX;
  if (extension === ".jsx") return ts.ScriptKind.JSX;
  if (extension === ".js" || extension === ".mjs") return ts.ScriptKind.JS;

  return ts.ScriptKind.TS;
};

const createSourceFile = (filePath, source) => ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, getScriptKind(filePath));

const isMergeableLocalNamedExportDeclaration = (statement) => {
  if (!ts.isExportDeclaration(statement)) return false;
  if (statement.moduleSpecifier) return false;
  if (!statement.exportClause || !ts.isNamedExports(statement.exportClause)) return false;
  if (statement.exportClause.elements.length === 0) return false;

  return statement.exportClause.elements.every((specifier) => !specifier.isTypeOnly);
};

const getExportDeclarationKind = (statement) => statement.isTypeOnly ? "type" : "value";

const collectMergeableExportDeclarations = (sourceFile) => {
  const groups = {
    type: [],
    value: [],
  };

  for (const statement of sourceFile.statements) {
    if (!isMergeableLocalNamedExportDeclaration(statement)) continue;

    groups[getExportDeclarationKind(statement)].push(statement);
  }

  return groups;
};

const getMergedExportMessage = (kind) => kind === "type" ? "型の local named export は1つの export type { ... }; にまとめてください。" : "値の local named export は1つの export { ... }; にまとめてください。";

const checkMergedExportDeclarations = (filePath, sourceFile) => {
  if (!shouldVerifyMergedExports(filePath)) return [];

  const groups = collectMergeableExportDeclarations(sourceFile);

  return Object.entries(groups).flatMap(([kind, declarations]) => declarations.slice(1).map((statement) => ({
    filePath,
    line: getLineNumber(sourceFile, statement.getStart(sourceFile)),
    message: getMergedExportMessage(kind),
  })));
};

const checkSourceFile = (filePath) => {
  const source = readFileSync(filePath, "utf8");
  const sourceFile = createSourceFile(filePath, source);
  if (sourceFile.parseDiagnostics.length > 0) return [];

  return checkMergedExportDeclarations(filePath, sourceFile);
};

const formatViolation = ({ filePath, line, message }) => `${toPosix(path.relative(ROOT_DIR, filePath))}:${line} ${message}`;

const sourceFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles);
const violations = sourceFiles.flatMap(checkSourceFile);

if (violations.length > 0) {
  console.error("ソース規約違反:");
  for (const violation of violations) {
    console.error(`- ${formatViolation(violation)}`);
  }
  process.exitCode = 1;
}
