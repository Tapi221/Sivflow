import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORIES = ["src", "apps/web/src", "apps/mobile/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/mobile-renderer/src", "shared", "functions/src", "tests", "scripts/dev", "scripts/verify"].map((directory) => path.join(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const ORDER_EXCLUDED_PATH_PARTS = ["/tests/", "/scripts/", "/src/sandbox/"];
const ORDER_EXCLUDED_FILE_SUFFIXES = [".d.ts"];
const FORMAT_OPTIONS = {
  convertTabsToSpaces: true,
  indentSize: 2,
  insertSpaceAfterCommaDelimiter: true,
  insertSpaceAfterConstructor: false,
  insertSpaceAfterFunctionKeywordForAnonymousFunctions: true,
  insertSpaceAfterKeywordsInControlFlowStatements: true,
  insertSpaceAfterOpeningAndBeforeClosingEmptyBraces: false,
  insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces: false,
  insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true,
  insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: false,
  insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: false,
  insertSpaceAfterSemicolonInForStatements: true,
  insertSpaceAfterTypeAssertion: false,
  insertSpaceBeforeAndAfterBinaryOperators: true,
  insertSpaceBeforeFunctionParenthesis: false,
  newLineCharacter: "\n",
  placeOpenBraceOnNewLineForControlBlocks: false,
  placeOpenBraceOnNewLineForFunctions: false,
  semicolons: ts.SemicolonPreference.Insert,
  tabSize: 2,
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

const shouldFixBlockSpacing = (filePath) => {
  const relativePath = `/${toPosix(path.relative(ROOT_DIR, filePath))}`;
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

const createSourceFile = (filePath, source) => ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, getScriptKind(filePath));

const createLanguageServiceHost = (filePath, source) => ({
  fileExists: ts.sys.fileExists,
  getCompilationSettings: () => ({ allowJs: true, jsx: ts.JsxEmit.ReactJSX }),
  getCurrentDirectory: () => ROOT_DIR,
  getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
  getScriptFileNames: () => [filePath],
  getScriptSnapshot: (scriptPath) => scriptPath === filePath ? ts.ScriptSnapshot.fromString(source) : undefined,
  getScriptVersion: () => "0",
  readDirectory: ts.sys.readDirectory,
  readFile: ts.sys.readFile,
});

const applyFormattingEdits = (source, edits) => edits.sort((left, right) => right.span.start - left.span.start).reduce((nextSource, edit) => `${nextSource.slice(0, edit.span.start)}${edit.newText}${nextSource.slice(edit.span.start + edit.span.length)}`, source);

const applyDocumentFormatting = (filePath, source) => {
  const languageService = ts.createLanguageService(createLanguageServiceHost(filePath, source));
  const edits = languageService.getFormattingEditsForDocument(filePath, { ...FORMAT_OPTIONS, newLineCharacter: getNewline(source) });

  languageService.dispose();
  return edits.length === 0 ? source : applyFormattingEdits(source, edits);
};

const getNewline = (source) => source.includes("\r\n") ? "\r\n" : "\n";

const isImportStatement = (statement) => ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement);

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

const getVariableStatementNames = (statement) => statement.declarationList.declarations.flatMap((declaration) => ts.isIdentifier(declaration.name) ? [declaration.name.text] : []);

const isConstVariableStatement = (statement) => (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;

const isFunctionLikeInitializer = (initializer) => Boolean(initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)));

const isComponentVariableStatement = (statement) => statement.declarationList.declarations.some((declaration) => {
  if (!ts.isIdentifier(declaration.name)) return false;
  if (!isPascalCaseName(declaration.name.text)) return false;
  if (!declaration.initializer) return false;
  if (isMemoCall(declaration.initializer)) return false;

  return containsJsx(declaration.initializer);
});

const isTypeOnlyExportDeclaration = (statement) => ts.isExportDeclaration(statement) && statement.isTypeOnly;

const getStatementOrderCategory = (statement) => {
  if (isImportStatement(statement)) return "import";
  if (isTypeOnlyExportDeclaration(statement)) return "type";
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

const getLeadingWhitespaceText = (source, sourceFile, previousStatement, statement) => source.slice(previousStatement.getEnd(), statement.getStart(sourceFile));

const isCommentOnlyTrivia = (leadingWhitespace) => {
  const trimmed = leadingWhitespace.trim();
  if (trimmed.length === 0) return false;

  return /^(?:(?:\/\/[^\r\n]*|\/\*[\s\S]*?\*\/)\s*)+$/u.test(trimmed);
};

const normalizeCommentOnlyTrivia = (leadingWhitespace, spacingText, newline) => {
  const normalizedCommentText = leadingWhitespace.trim().split(/\r?\n/u).map((line) => line.trimEnd()).join(newline);

  return `${spacingText}${normalizedCommentText}${newline}`;
};

const rangesOverlap = (left, right) => left.start < right.end && right.start < left.end;

const applyNonOverlappingReplacements = (source, replacements) => {
  const acceptedReplacements = [];

  for (const replacement of [...replacements].sort((left, right) => right.start - left.start)) {
    if (acceptedReplacements.some((acceptedReplacement) => rangesOverlap(replacement, acceptedReplacement))) continue;

    acceptedReplacements.push(replacement);
  }

  return acceptedReplacements.reduce((nextSource, replacement) => `${nextSource.slice(0, replacement.start)}${replacement.text}${nextSource.slice(replacement.end)}`, source);
};

const getTopLevelSpacingText = (filePath, source, previousStatement, statement) => {
  const newline = getNewline(source);
  if (isImportStatement(previousStatement) && isImportStatement(statement)) return newline;
  if (!shouldFixBlockSpacing(filePath)) return null;
  if (isDirectiveStatement(previousStatement) || isDirectiveStatement(statement)) return null;

  const previousCategory = getStatementOrderCategory(previousStatement);
  const category = getStatementOrderCategory(statement);
  if (previousCategory === category) return newline;

  return `${newline}${newline}`;
};

const getTopLevelReplacementText = (leadingWhitespace, spacingText, newline) => {
  if (!/\S/.test(leadingWhitespace)) return spacingText;
  if (leadingWhitespace.trimStart() === leadingWhitespace) return null;
  if (!isCommentOnlyTrivia(leadingWhitespace)) return null;

  return normalizeCommentOnlyTrivia(leadingWhitespace, spacingText, newline);
};

const collectTopLevelSpacingReplacements = (filePath, source, sourceFile) => {
  const replacements = [];
  const statements = [...sourceFile.statements];
  const newline = getNewline(source);

  for (let index = 1; index < statements.length; index += 1) {
    const previousStatement = statements[index - 1];
    const statement = statements[index];
    const spacingText = getTopLevelSpacingText(filePath, source, previousStatement, statement);
    if (spacingText === null) continue;

    const leadingWhitespace = getLeadingWhitespaceText(source, sourceFile, previousStatement, statement);
    const replacementText = getTopLevelReplacementText(leadingWhitespace, spacingText, newline);
    if (replacementText === null) continue;
    if (leadingWhitespace === replacementText) continue;

    replacements.push({ end: statement.getStart(sourceFile), start: previousStatement.getEnd(), text: replacementText });
  }

  return replacements;
};

const applyTopLevelSpacingFix = (filePath, source) => {
  const sourceFile = createSourceFile(filePath, source);
  const replacements = collectTopLevelSpacingReplacements(filePath, source, sourceFile);

  return replacements.length === 0 ? source : applyNonOverlappingReplacements(source, replacements);
};

const applySourceConventionFix = (filePath, source) => applyTopLevelSpacingFix(filePath, applyDocumentFormatting(filePath, source));

const updateFile = (filePath) => {
  const originalSource = readFileSync(filePath, "utf8");
  const nextSource = applySourceConventionFix(filePath, originalSource);

  if (nextSource === originalSource) return false;

  writeFileSync(filePath, nextSource);
  return true;
};

const updatedFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles).filter(updateFile);

if (updatedFiles.length > 0) {
  console.log(`source 規約の整形を ${updatedFiles.length} file(s) 修正しました。`);
}
