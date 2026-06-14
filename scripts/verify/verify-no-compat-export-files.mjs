import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORIES = ["src", "apps/web/src", "apps/android/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/android-renderer/src", "shared", "functions/src", "tests", "scripts/dev", "scripts/verify"].map((directory) => path.join(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const INDEX_FILE_NAMES = new Set(["index.ts", "index.tsx", "index.js", "index.jsx", "index.mjs"]);
const EXCLUDED_FILE_SUFFIXES = [".d.ts"];

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
const getLineNumber = (sourceFile, position) => sourceFile.getLineAndCharacterOfPosition(position).line + 1;
const shouldCheckFile = (filePath) => {
  const fileName = path.basename(filePath);
  if (INDEX_FILE_NAMES.has(fileName)) return false;
  return !EXCLUDED_FILE_SUFFIXES.some((suffix) => filePath.endsWith(suffix));
};
const isDirectiveStatement = (statement) => ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression);
const isExportFromDeclaration = (statement) => ts.isExportDeclaration(statement) && Boolean(statement.moduleSpecifier);
const getCheckStatements = (sourceFile) => sourceFile.statements.filter((statement) => !isDirectiveStatement(statement));
const checkNoCompatExportFile = (filePath) => {
  if (!shouldCheckFile(filePath)) return [];
  const source = readFileSync(filePath, "utf8");
  const scriptKind = path.extname(filePath).endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind);
  const statements = getCheckStatements(sourceFile);
  if (statements.length === 0) return [];
  if (!statements.every(isExportFromDeclaration)) return [];
  return [{ filePath, line: getLineNumber(sourceFile, statements[0].getStart(sourceFile)), message: "互換 export ファイルは禁止です。呼び出し元の import パスを正しい module へ修正してください。" }];
};
const formatViolation = ({ filePath, line, message }) => `${toPosix(path.relative(ROOT_DIR, filePath))}:${line} ${message}`;

const sourceFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles);
const violations = sourceFiles.flatMap(checkNoCompatExportFile);

if (violations.length > 0) {
  console.error("互換 export ファイル規約違反:");
  for (const violation of violations) {
    console.error(`- ${formatViolation(violation)}`);
  }
  process.exitCode = 1;
}
