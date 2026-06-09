import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORIES = ["src", "apps/web/src", "apps/mobile/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/mobile-renderer/src", "shared"].map((directory) => path.join(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const ORDER_RANKS = {
  import: 1,
  type: 2,
  constant: 3,
  helper: 4,
  component: 5,
  postComponent: 6,
};
const ORDER_LABELS = {
  import: "import",
  type: "type definition",
  constant: "constant",
  helper: "helper function",
  component: "component body",
  postComponent: "memo / displayName / export",
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

const getLineNumber = (sourceFile, position) => sourceFile.getLineAndCharacterOfPosition(position).line + 1;

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
    if (
      ts.isJsxElement(child) ||
      ts.isJsxFragment(child) ||
      ts.isJsxSelfClosingElement(child)
    ) {
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
  if (isMemoCall(declaration.initializer)) return true;
  if (!isFunctionLikeInitializer(declaration.initializer)) return false;

  return containsJsx(declaration.initializer);
});

const getStatementOrderCategory = (statement) => {
  if (ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement)) return "import";
  if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement) || ts.isEnumDeclaration(statement)) return "type";
  if (ts.isExportDeclaration(statement)) return statement.isTypeOnly ? "type" : "postComponent";
  if (ts.isExportAssignment(statement)) return "postComponent";
  if (isDisplayNameAssignment(statement)) return "postComponent";

  if (ts.isFunctionDeclaration(statement)) {
    if (statement.name && isPascalCaseName(statement.name.text) && containsJsx(statement)) return "component";

    return "helper";
  }

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

const getModuleSpecifier = (node) => {
  if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) return node.moduleSpecifier.text;
  if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) return node.moduleSpecifier.text;
  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])) return node.arguments[0].text;

  return null;
};

const getImportExportNodes = (sourceFile) => {
  const nodes = [];

  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || ts.isCallExpression(node)) {
      if (getModuleSpecifier(node)) nodes.push(node);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return nodes;
};

const getStatementPreview = (source, statement) => source.slice(statement.getStart(), statement.getEnd()).split("\n")[0].trim();

const checkModuleSpecifier = (filePath, sourceFile, node, specifier) => {
  const line = getLineNumber(sourceFile, node.getStart(sourceFile));
  const violations = [];

  if (specifier.startsWith("../")) {
    violations.push({ filePath, line, message: `Use an alias for cross-folder imports instead of ${specifier}.` });
  }

  if (/^\.\/[^/]+\//.test(specifier)) {
    violations.push({ filePath, line, message: `Use an alias for child-folder imports instead of ${specifier}.` });
  }

  if (specifier === "@constants" || specifier.startsWith("@constants/")) {
    violations.push({ filePath, line, message: "Do not import from @constants. Move values to their responsibility module." });
  }

  return violations;
};

const checkSingleLineImportExport = (filePath, sourceFile, node) => {
  const startLine = getLineNumber(sourceFile, node.getStart(sourceFile));
  const endLine = getLineNumber(sourceFile, node.getEnd());

  if (startLine === endLine) return [];

  return [{ filePath, line: startLine, message: "Keep each import/export-from declaration on one line." }];
};

const checkStatementOrder = (filePath, source, sourceFile) => {
  const violations = [];
  let highestCategory = "import";
  let highestRank = 0;

  for (const statement of sourceFile.statements) {
    const category = getStatementOrderCategory(statement);
    const rank = ORDER_RANKS[category];

    if (rank < highestRank) {
      violations.push({
        filePath,
        line: getLineNumber(sourceFile, statement.getStart(sourceFile)),
        message: `Move ${ORDER_LABELS[category]} before ${ORDER_LABELS[highestCategory]}: ${getStatementPreview(source, statement)}`,
      });
      continue;
    }

    highestCategory = category;
    highestRank = rank;
  }

  return violations;
};

const checkSourceFile = (filePath) => {
  const source = readFileSync(filePath, "utf8");
  const scriptKind = path.extname(filePath).endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind);
  const importExportNodes = getImportExportNodes(sourceFile);
  const importViolations = importExportNodes.flatMap((node) => {
    const specifier = getModuleSpecifier(node);

    return [...checkSingleLineImportExport(filePath, sourceFile, node), ...checkModuleSpecifier(filePath, sourceFile, node, specifier)];
  });

  return [...importViolations, ...checkStatementOrder(filePath, source, sourceFile)];
};

const formatViolation = ({ filePath, line, message }) => `${toPosix(path.relative(ROOT_DIR, filePath))}:${line} ${message}`;

const sourceFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles);
const violations = sourceFiles.flatMap(checkSourceFile);

if (violations.length > 0) {
  console.error("Source convention violations:");
  for (const violation of violations) {
    console.error(`- ${formatViolation(violation)}`);
  }
  process.exitCode = 1;
}
