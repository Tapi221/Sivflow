import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORIES = ["src", "apps/web/src", "apps/mobile/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/mobile-renderer/src", "shared", "functions/src"].map((directory) => path.join(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
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

const shouldFixSourceOrder = (filePath) => {
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

const getNewline = (source) => source.includes("\r\n") ? "\r\n" : "\n";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

const getStatementDeclarationNames = (statement) => {
  if (ts.isVariableStatement(statement)) return getVariableStatementNames(statement);
  if ((ts.isClassDeclaration(statement) || ts.isFunctionDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement) || ts.isEnumDeclaration(statement)) && statement.name) return [statement.name.text];
  if (ts.isModuleDeclaration(statement) && ts.isIdentifier(statement.name)) return [statement.name.text];

  return [];
};

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
  if (isImportStatement(statement)) return "import";
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

const hasExportModifier = (statement) => ts.canHaveModifiers(statement) && Boolean(ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));

const isTypeOnlyExportDeclaration = (statement) => ts.isExportDeclaration(statement) && statement.isTypeOnly;

const canAppearInExportBlock = (statement) => hasExportModifier(statement) && !ts.isImportDeclaration(statement) && !ts.isImportEqualsDeclaration(statement);

const isConstDependentTypeStatement = (source, statement, highestRank) => {
  if (!ts.isTypeAliasDeclaration(statement) && !ts.isInterfaceDeclaration(statement)) return false;
  if (highestRank > ORDER_RANKS.constant) return false;

  return source.slice(statement.getStart(), statement.getEnd()).includes("typeof ");
};

const statementReferencesName = (statementText, name) => new RegExp(`\\b${escapeRegExp(name)}\\b`).test(statementText);

const getStatementText = (source, sourceFile, statement) => source.slice(statement.getStart(sourceFile), statement.getEnd()).trim();

const statementReferencesPreviousHigherRankDeclaration = (source, sourceFile, statement, previousStatements, rank) => {
  const higherRankNames = previousStatements.flatMap((previousStatement) => {
    const previousCategory = getStatementOrderCategory(previousStatement);
    if (ORDER_RANKS[previousCategory] <= rank) return [];

    return getStatementDeclarationNames(previousStatement);
  });
  const statementText = getStatementText(source, sourceFile, statement);

  return higherRankNames.some((name) => statementReferencesName(statementText, name));
};

const canKeepStatementAfterHigherRank = (source, sourceFile, statement, previousStatements, rank, highestRank) => {
  return isTypeOnlyExportDeclaration(statement) || canAppearInExportBlock(statement) || isConstDependentTypeStatement(source, statement, highestRank) || statementReferencesPreviousHigherRankDeclaration(source, sourceFile, statement, previousStatements, rank);
};

const findMoveTargetIndex = (statements, rank, fromIndex) => {
  for (let index = 0; index < fromIndex; index += 1) {
    const previousStatement = statements[index];
    if (isDirectiveStatement(previousStatement) || isImportStatement(previousStatement)) continue;
    if (ORDER_RANKS[getStatementOrderCategory(previousStatement)] > rank) return index;
  }

  return -1;
};

const findFirstOrderMove = (source, sourceFile) => {
  const statements = [...sourceFile.statements];
  const previousStatements = [];
  let highestRank = 0;

  for (let index = 0; index < statements.length; index += 1) {
    const statement = statements[index];
    if (isDirectiveStatement(statement)) continue;

    const category = getStatementOrderCategory(statement);
    const rank = ORDER_RANKS[category];

    if (rank < highestRank) {
      if (canKeepStatementAfterHigherRank(source, sourceFile, statement, previousStatements, rank, highestRank)) {
        previousStatements.push(statement);
        continue;
      }

      const targetIndex = findMoveTargetIndex(statements, rank, index);
      if (targetIndex >= 0) return { fromIndex: index, targetIndex };
    }

    highestRank = Math.max(highestRank, rank);
    previousStatements.push(statement);
  }

  return null;
};

const getStatementChunkStart = (statements, index) => index === 0 ? statements[index].getFullStart() : statements[index - 1].getEnd();

const moveStatement = (source, sourceFile, move) => {
  const statements = [...sourceFile.statements];
  const newline = getNewline(source);
  const chunks = statements.map((statement, index) => ({ statement, text: source.slice(getStatementChunkStart(statements, index), statement.getEnd()).trim() }));
  const [movedChunk] = chunks.splice(move.fromIndex, 1);
  chunks.splice(move.targetIndex, 0, movedChunk);

  const prefix = source.slice(0, statements[0]?.getFullStart() ?? 0).trimEnd();
  const suffix = source.slice(statements.at(-1)?.getEnd() ?? 0).trim();
  const body = chunks.map((chunk) => chunk.text).filter(Boolean).join(`${newline}${newline}`);

  return [prefix, body, suffix].filter(Boolean).join(`${newline}${newline}`) + newline;
};

const applySourceOrderFix = (filePath, source) => {
  if (!shouldFixSourceOrder(filePath)) return source;

  let nextSource = source;
  const maxPassCount = 1000;

  for (let pass = 0; pass < maxPassCount; pass += 1) {
    const sourceFile = createSourceFile(filePath, nextSource);
    const move = findFirstOrderMove(nextSource, sourceFile);
    if (!move) return nextSource;

    nextSource = moveStatement(nextSource, sourceFile, move);
  }

  return nextSource;
};

const updateFile = (filePath) => {
  const originalSource = readFileSync(filePath, "utf8");
  const nextSource = applySourceOrderFix(filePath, originalSource);

  if (nextSource === originalSource) return false;

  writeFileSync(filePath, nextSource);
  return true;
};

const updatedFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles).filter(updateFile);

if (updatedFiles.length > 0) {
  console.log(`source 規約の並び順を ${updatedFiles.length} file(s) 修正しました。`);
}
