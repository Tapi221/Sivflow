import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORIES = ["src", "apps/web/src", "apps/mobile/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/mobile-renderer/src", "shared", "functions/src"].map((directory) => path.join(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const EXCLUDED_PATH_PARTS = ["/tests/", "/scripts/", "/src/sandbox/"];
const EXCLUDED_FILE_SUFFIXES = [".d.ts"];
const UPPER_SNAKE_CASE_PATTERN = /^[A-Z0-9_]+$/;

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

const containsJsx = (node) => {
  let found = false;

  const visit = (child) => {
    if (ts.isJsxElement(child) || ts.isJsxFragment(child) || ts.isJsxSelfClosingElement(child)) {
      found = true;
      return;
    }

    if (!found) ts.forEachChild(child, visit);
  };

  ts.forEachChild(node, visit);
  return found;
};

const isPascalCaseName = (name) => /^[A-Z][A-Za-z0-9]*$/.test(name);

const isConstVariableStatement = (statement) => (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;

const isFunctionLikeInitializer = (initializer) => Boolean(initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)));

const isComponentVariableStatement = (statement) => statement.declarationList.declarations.some((declaration) => {
  if (!ts.isIdentifier(declaration.name)) return false;
  if (!isPascalCaseName(declaration.name.text)) return false;
  if (!declaration.initializer) return false;
  if (isMemoCall(declaration.initializer)) return false;

  return containsJsx(declaration.initializer);
});

const isModuleConstantDeclarator = (declaration) => {
  if (!ts.isIdentifier(declaration.name)) return false;
  if (!declaration.initializer) return true;
  if (isFunctionLikeInitializer(declaration.initializer)) return false;
  if (isMemoCall(declaration.initializer)) return false;
  if (containsJsx(declaration.initializer)) return false;

  return true;
};

const checkSourceFile = (filePath) => {
  if (!shouldCheckFile(filePath)) return [];

  const source = readFileSync(filePath, "utf8");
  const scriptKind = path.extname(filePath).endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind);

  return sourceFile.statements.flatMap((statement) => {
    if (!ts.isVariableStatement(statement)) return [];
    if (!isConstVariableStatement(statement)) return [];
    if (isComponentVariableStatement(statement)) return [];

    return statement.declarationList.declarations.flatMap((declaration) => {
      if (!isModuleConstantDeclarator(declaration)) return [];
      if (UPPER_SNAKE_CASE_PATTERN.test(declaration.name.text)) return [];

      return [{ filePath, line: getLineNumber(sourceFile, declaration.name.getStart(sourceFile)), name: declaration.name.text }];
    });
  });
};

const formatViolation = ({ filePath, line, name }) => `${toPosix(path.relative(ROOT_DIR, filePath))}:${line} Module-scope constants must use UPPER_SNAKE_CASE: ${name}`;

const sourceFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles);
const violations = sourceFiles.flatMap(checkSourceFile);

if (violations.length > 0) {
  console.error("Module constant naming violations:");
  for (const violation of violations) {
    console.error(`- ${formatViolation(violation)}`);
  }
  process.exitCode = 1;
}
