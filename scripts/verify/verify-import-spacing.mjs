import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORIES = ["src", "apps/web/src", "apps/mobile/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/mobile-renderer/src", "shared", "functions/src", "tests", "scripts/dev", "scripts/verify"].map((directory) => path.join(ROOT_DIR, directory));
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

const toPosix = (value) => value.split(path.sep).join("/");

const getScriptKind = (filePath) => {
  const extension = path.extname(filePath);
  if (extension === ".tsx") return ts.ScriptKind.TSX;
  if (extension === ".jsx") return ts.ScriptKind.JSX;
  if (extension === ".js" || extension === ".mjs") return ts.ScriptKind.JS;

  return ts.ScriptKind.TS;
};

const createSourceFile = (filePath, source) => ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, getScriptKind(filePath));

const getLineNumber = (sourceFile, position) => sourceFile.getLineAndCharacterOfPosition(position).line + 1;

const getNewline = (source) => source.includes("\r\n") ? "\r\n" : "\n";

const isImportStatement = (statement) => ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement);

const isExportStatement = (statement) => ts.isExportDeclaration(statement) || ts.isExportAssignment(statement);

const getLeadingWhitespaceText = (source, sourceFile, previousStatement, statement) => source.slice(previousStatement.getEnd(), statement.getStart(sourceFile));

const checkImportSpacing = (filePath) => {
  const source = readFileSync(filePath, "utf8");
  const sourceFile = createSourceFile(filePath, source);
  const statements = [...sourceFile.statements];
  const newline = getNewline(source);
  const violations = [];

  for (let index = 1; index < statements.length; index += 1) {
    const previousStatement = statements[index - 1];
    const statement = statements[index];
    const leadingWhitespace = getLeadingWhitespaceText(source, sourceFile, previousStatement, statement);
    if (/\S/.test(leadingWhitespace)) continue;

    if (isImportStatement(previousStatement) && isImportStatement(statement) && leadingWhitespace !== newline) {
      violations.push({ filePath, line: getLineNumber(sourceFile, statement.getStart(sourceFile)), message: "import 文同士の間に空行を入れないでください。" });
      continue;
    }

    if (!isExportStatement(statement)) continue;

    const expectedWhitespace = isExportStatement(previousStatement) ? newline : `${newline}${newline}`;
    if (leadingWhitespace === expectedWhitespace) continue;

    violations.push({ filePath, line: getLineNumber(sourceFile, statement.getStart(sourceFile)), message: "export 文の前の空行が規約と一致していません。" });
  }

  return violations;
};

const formatViolation = ({ filePath, line, message }) => `${toPosix(path.relative(ROOT_DIR, filePath))}:${line} ${message}`;

const sourceFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles);
const violations = sourceFiles.flatMap(checkImportSpacing);

if (violations.length > 0) {
  console.error("import 空行規約違反:");
  for (const violation of violations) {
    console.error(`- ${formatViolation(violation)}`);
  }
  process.exitCode = 1;
}
