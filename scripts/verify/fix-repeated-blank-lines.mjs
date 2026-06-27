import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORY_PATTERNS = process.env.SOURCE_CONVENTION_TARGETS?.split(path.delimiter).filter(Boolean) ?? ["src", "apps/web/src", "apps/android/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/android-renderer/src", "shared", "functions/src", "tests", "scripts/dev", "scripts/verify"];
const SOURCE_DIRECTORIES = SOURCE_DIRECTORY_PATTERNS.map((directory) => path.resolve(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const BLOCK_SPACING_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const ORDER_EXCLUDED_PATH_PARTS = ["/tests/", "/scripts/", "/src/sandbox/"];
const ORDER_EXCLUDED_FILE_SUFFIXES = [".d.ts"];
const ORDER_RANKS = {
  import: 1,
  type: 2,
  constant: 3,
  helper: 4,
  component: 5,
  postComponent: 6,
};

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
const getNewline = (source) => source.includes("\r\n") ? "\r\n" : "\n";
const shouldFixBlockSpacing = (filePath) => {
  const relativePath = `/${toPosix(path.relative(ROOT_DIR, filePath))}`;
  if (!BLOCK_SPACING_EXTENSIONS.has(path.extname(filePath))) return false;
  if (ORDER_EXCLUDED_FILE_SUFFIXES.some((suffix) => relativePath.endsWith(suffix))) return false;
  return !ORDER_EXCLUDED_PATH_PARTS.some((part) => relativePath.includes(part));
};
const getScriptKind = (filePath) => {
  const extension = path.extname(filePath);
  if (extension === ".tsx") return ts.ScriptKind.TSX;
  if (extension === ".jsx") return ts.ScriptKind.JSX;
  if (extension === ".js" || extension === ".mjs") return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
};
const isDirectiveStatement = (statement) => ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression);
const isIdentifierNamed = (expression, name) => ts.isIdentifier(expression) && expression.text === name;
const isPropertyAccessNamed = (expression, name) => ts.isPropertyAccessExpression(expression) && expression.name.text === name;
const isMemoCall = (expression) => ts.isCallExpression(expression) && (isIdentifierNamed(expression.expression, "memo") || isPropertyAccessNamed(expression.expression, "memo"));
const isDisplayNameAssignment = (statement) => {
  if (!ts.isExpressionStatement(statement)) return false;
  const expression = statement.expression;
  return ts.isBinaryExpression(expression) && ts.isPropertyAccessExpression(expression.left) && expression.left.name.text === "displayName";
};
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
const isUpperCaseConstantName = (name) => /^[A-Z0-9_]+$/.test(name);
const getBindingNameIdentifiers = (name) => {
  if (ts.isIdentifier(name)) return [name.text];
  if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) return name.elements.flatMap((element) => ts.isBindingElement(element) ? getBindingNameIdentifiers(element.name) : []);
  return [];
};
const getVariableStatementNames = (statement) => statement.declarationList.declarations.flatMap((declaration) => getBindingNameIdentifiers(declaration.name));
const isConstVariableStatement = (statement) => (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;
const isFunctionLikeInitializer = (initializer) => Boolean(initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)));
const isComponentVariableStatement = (statement) => statement.declarationList.declarations.some((declaration) => {
  if (!ts.isIdentifier(declaration.name)) return false;
  if (!isPascalCaseName(declaration.name.text)) return false;
  if (!declaration.initializer) return false;
  if (isMemoCall(declaration.initializer)) return false;
  return containsJsx(declaration.initializer);
});
const getStatementOrderCategory = (statement) => {
  if (ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement)) return "import";
  if (ts.isExportDeclaration(statement) || ts.isExportAssignment(statement)) return "postComponent";
  if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement) || ts.isEnumDeclaration(statement) || ts.isModuleDeclaration(statement)) return "type";
  if (isDisplayNameAssignment(statement)) return "postComponent";
  if (ts.isClassDeclaration(statement)) return statement.name && isPascalCaseName(statement.name.text) && containsJsx(statement) ? "component" : "helper";
  if (ts.isFunctionDeclaration(statement)) return statement.name && isPascalCaseName(statement.name.text) && containsJsx(statement) ? "component" : "helper";
  if (ts.isVariableStatement(statement)) {
    if (isComponentVariableStatement(statement)) return "component";
    const names = getVariableStatementNames(statement);
    const hasMemoName = statement.declarationList.declarations.some((declaration) => declaration.initializer && isMemoCall(declaration.initializer));
    if (hasMemoName) return "postComponent";
    if (isConstVariableStatement(statement) && names.length > 0 && names.every(isUpperCaseConstantName)) return "constant";
    const hasFunctionInitializer = statement.declarationList.declarations.some((declaration) => isFunctionLikeInitializer(declaration.initializer));
    if (hasFunctionInitializer) return "helper";
    return "constant";
  }
  return "helper";
};
const collapseRepeatedBlankLines = (source) => {
  const newline = getNewline(source);
  const repeatedBlankLinePattern = newline === "\r\n" ? /\r\n[\t ]*(?:\r\n[\t ]*){2,}/gu : /\n[\t ]*(?:\n[\t ]*){2,}/gu;
  return source.replace(repeatedBlankLinePattern, `${newline}${newline}`);
};
const applyReplacements = (source, replacements) => {
  if (replacements.length === 0) return source;
  let nextSource = "";
  let cursor = 0;
  for (const replacement of replacements) {
    nextSource += source.slice(cursor, replacement.start) + replacement.text;
    cursor = replacement.end;
  }
  return nextSource + source.slice(cursor);
};
const normalizeBlockSpacing = (filePath, source) => {
  if (!shouldFixBlockSpacing(filePath)) return source;
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, getScriptKind(filePath));
  if (sourceFile.parseDiagnostics.length > 0) return source;
  const newline = getNewline(source);
  const replacements = [];
  sourceFile.statements.forEach((statement, index, statements) => {
    const previousStatement = statements[index - 1];
    if (!previousStatement) return;
    if (isDirectiveStatement(previousStatement) || isDirectiveStatement(statement)) return;
    const whitespaceStart = previousStatement.getEnd();
    const whitespaceEnd = statement.getStart(sourceFile);
    const leadingWhitespace = source.slice(whitespaceStart, whitespaceEnd);
    if (/\S/u.test(leadingWhitespace)) return;
    const previousCategory = getStatementOrderCategory(previousStatement);
    const category = getStatementOrderCategory(statement);
    const nextWhitespace = previousCategory === category ? newline : `${newline}${newline}`;
    if (leadingWhitespace !== nextWhitespace) replacements.push({ start: whitespaceStart, end: whitespaceEnd, text: nextWhitespace });
  });
  return applyReplacements(source, replacements);
};
const normalizeBlankLines = (filePath, source) => normalizeBlockSpacing(filePath, collapseRepeatedBlankLines(source));
const updateFile = (filePath) => {
  const originalSource = readFileSync(filePath, "utf8");
  const nextSource = normalizeBlankLines(filePath, originalSource);
  if (nextSource === originalSource) return false;
  writeFileSync(filePath, nextSource);
  return true;
};
const updatedFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles).filter(updateFile);
if (updatedFiles.length > 0) {
  console.log(`空行規約を ${updatedFiles.length} 件のファイルで修正しました。`);
}