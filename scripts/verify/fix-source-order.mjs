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

const getStatementDeclarationNames = (statement) => {
  if (ts.isVariableStatement(statement)) return getVariableStatementNames(statement);
  if ((ts.isClassDeclaration(statement) || ts.isFunctionDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement) || ts.isEnumDeclaration(statement)) && statement.name) return [statement.name.text];
  if (ts.isModuleDeclaration(statement) && ts.isIdentifier(statement.name)) return [statement.name.text];

  return [];
};

const getStatementText = (source, sourceFile, statement) => source.slice(statement.getStart(sourceFile), statement.getEnd()).trim();

const getSortableStatementStartIndex = (statements) => statements.findIndex((statement) => !isDirectiveStatement(statement) && !isImportStatement(statement));

const getStatementChunkStart = (statements, startIndex, index) => {
  if (index === startIndex) return startIndex === 0 ? statements[index].getFullStart() : statements[startIndex - 1].getEnd();

  return statements[index - 1].getEnd();
};

const statementReferencesName = (statementText, name) => new RegExp(`\\b${escapeRegExp(name)}\\b`).test(statementText);

const createOrderNode = (source, sourceFile, statements, startIndex, statement, index) => {
  const category = getStatementOrderCategory(statement);
  const chunkStart = getStatementChunkStart(statements, startIndex, index);

  return {
    category,
    dependencies: new Set(),
    index,
    names: getStatementDeclarationNames(statement),
    rank: ORDER_RANKS[category],
    statementText: getStatementText(source, sourceFile, statement),
    text: source.slice(chunkStart, statement.getEnd()).trim(),
  };
};

const collectOrderNodes = (source, sourceFile, statements, startIndex) => {
  const nodes = statements.slice(startIndex).map((statement, offset) => createOrderNode(source, sourceFile, statements, startIndex, statement, startIndex + offset));

  for (const target of nodes) {
    for (const sourceNode of nodes) {
      if (sourceNode === target) continue;
      if (sourceNode.names.length === 0) continue;
      if (sourceNode.names.some((name) => statementReferencesName(target.statementText, name))) target.dependencies.add(sourceNode.index);
    }
  }

  return nodes;
};

const getNextOrderNode = (nodes, orderedNodes) => {
  const orderedIndexes = new Set(orderedNodes.map((node) => node.index));
  const readyNodes = nodes.filter((node) => !orderedIndexes.has(node.index) && [...node.dependencies].every((dependencyIndex) => orderedIndexes.has(dependencyIndex)));
  if (readyNodes.length === 0) return null;

  return readyNodes.sort((left, right) => left.rank - right.rank || left.index - right.index)[0];
};

const sortOrderNodes = (nodes) => {
  const orderedNodes = [];

  while (orderedNodes.length < nodes.length) {
    const nextNode = getNextOrderNode(nodes, orderedNodes);
    if (!nextNode) return nodes;

    orderedNodes.push(nextNode);
  }

  return orderedNodes;
};

const applySourceOrderFix = (filePath, source) => {
  if (!shouldFixSourceOrder(filePath)) return source;

  const sourceFile = createSourceFile(filePath, source);
  const statements = [...sourceFile.statements];
  const startIndex = getSortableStatementStartIndex(statements);
  if (startIndex < 0) return source;

  const nodes = collectOrderNodes(source, sourceFile, statements, startIndex);
  const orderedNodes = sortOrderNodes(nodes);
  if (orderedNodes.every((node, index) => node.index === nodes[index].index)) return source;

  const newline = getNewline(source);
  const prefixEnd = startIndex === 0 ? statements[startIndex].getFullStart() : statements[startIndex - 1].getEnd();
  const prefix = source.slice(0, prefixEnd).trimEnd();
  const suffix = source.slice(statements.at(-1).getEnd()).trim();
  const body = orderedNodes.map((node) => node.text).filter(Boolean).join(`${newline}${newline}`);

  return [prefix, body, suffix].filter(Boolean).join(`${newline}${newline}`) + newline;
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
