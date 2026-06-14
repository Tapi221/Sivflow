import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORIES = ["src", "apps/web/src", "apps/android/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/android-renderer/src", "shared", "functions/src"].map((directory) => path.join(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const EXCLUDED_PATH_PARTS = ["/tests/", "/scripts/", "/src/sandbox/"];
const EXCLUDED_FILE_SUFFIXES = [".d.ts"];
const UPPER_SNAKE_CASE_PATTERN = /^[A-Z0-9_]+$/;
const CONSTANT_FILE_PATTERN = /\.constants(?:\.[^.]+)*\.[jt]sx?$/;
const CONSTANT_COMMENT_PATTERN = /@(constant|sivflow-constant)\b/;

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

const shouldCheckFile = (filePath) => {
  const relativePath = `/${toPosix(path.relative(ROOT_DIR, filePath))}`;
  if (EXCLUDED_FILE_SUFFIXES.some((suffix) => relativePath.endsWith(suffix))) return false;

  return !EXCLUDED_PATH_PARTS.some((part) => relativePath.includes(part));
};

const getLineNumber = (sourceFile, position) => sourceFile.getLineAndCharacterOfPosition(position).line + 1;

const isIdentifierNamed = (expression, name) => ts.isIdentifier(expression) && expression.text === name;

const isPropertyAccessNamed = (expression, name) => ts.isPropertyAccessExpression(expression) && expression.name.text === name;

const isMemoCall = (expression) => ts.isCallExpression(expression) && (isIdentifierNamed(expression.expression, "memo") || isPropertyAccessNamed(expression.expression, "memo"));

const isPascalCaseName = (name) => /^[A-Z][A-Za-z0-9]*$/.test(name);

const isConstVariableStatement = (statement) => (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;

const isFunctionLikeInitializer = (initializer) => Boolean(initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)));

const hasConstantComment = (sourceFile, node) => {
  const source = sourceFile.getFullText();
  const ranges = ts.getLeadingCommentRanges(source, node.getFullStart()) ?? [];

  return ranges.some((range) => CONSTANT_COMMENT_PATTERN.test(source.slice(range.pos, range.end)));
};

const isConstantFile = (filePath) => CONSTANT_FILE_PATTERN.test(toPosix(filePath));

const isRuntimeBindingName = (name) => {
  if (isPascalCaseName(name)) return true;
  if (/^use[A-Z0-9]/.test(name)) return true;
  if (/(Context|Store|Service|Adapter|Client|Repository|UseCase|Plugin|Kit|Component|Provider|Consumer)$/.test(name)) return true;

  return false;
};

const isRuntimeBindingInitializer = (initializer) => {
  if (!initializer) return false;
  if (isFunctionLikeInitializer(initializer)) return true;
  if (isMemoCall(initializer)) return true;
  if (ts.isCallExpression(initializer)) return true;
  if (ts.isNewExpression(initializer)) return true;
  if (ts.isIdentifier(initializer)) return true;
  if (ts.isPropertyAccessExpression(initializer)) return true;
  if (ts.isJsxElement(initializer) || ts.isJsxFragment(initializer) || ts.isJsxSelfClosingElement(initializer)) return true;

  return false;
};

const shouldCheckDeclaration = (filePath, sourceFile, statement, declaration) => {
  if (!ts.isIdentifier(declaration.name)) return false;
  if (isRuntimeBindingName(declaration.name.text)) return false;
  if (isRuntimeBindingInitializer(declaration.initializer)) return false;

  return isConstantFile(filePath) || hasConstantComment(sourceFile, statement) || hasConstantComment(sourceFile, declaration);
};

const checkSourceFile = (filePath) => {
  if (!shouldCheckFile(filePath)) return [];

  const source = readFileSync(filePath, "utf8");
  const scriptKind = path.extname(filePath).endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind);

  return sourceFile.statements.flatMap((statement) => {
    if (!ts.isVariableStatement(statement)) return [];
    if (!isConstVariableStatement(statement)) return [];

    return statement.declarationList.declarations.flatMap((declaration) => {
      if (!shouldCheckDeclaration(filePath, sourceFile, statement, declaration)) return [];
      if (UPPER_SNAKE_CASE_PATTERN.test(declaration.name.text)) return [];

      return [{ filePath, line: getLineNumber(sourceFile, declaration.name.getStart(sourceFile)), name: declaration.name.text }];
    });
  });
};

const formatViolation = ({ filePath, line, name }) => `${toPosix(path.relative(ROOT_DIR, filePath))}:${line} module scope の定数は UPPER_SNAKE_CASE にしてください: ${name}`;

const sourceFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles);
const violations = sourceFiles.flatMap(checkSourceFile);

if (violations.length > 0) {
  console.error("module 定数命名規約違反:");
  for (const violation of violations) {
    console.error(`- ${formatViolation(violation)}`);
  }
  process.exitCode = 1;
}
