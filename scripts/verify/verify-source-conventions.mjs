import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORIES = ["src", "apps/web/src", "apps/mobile/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/mobile-renderer/src", "shared", "functions/src", "tests", "scripts/dev", "scripts/verify"].map((directory) => path.join(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
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

const shouldCheckStatementOrder = (filePath) => {
  const relativePath = `/${toPosix(path.relative(ROOT_DIR, filePath))}`;
  if (ORDER_EXCLUDED_FILE_SUFFIXES.some((suffix) => relativePath.endsWith(suffix))) return false;

  return !ORDER_EXCLUDED_PATH_PARTS.some((part) => relativePath.includes(part));
};

const hasExportModifier = (statement) => ts.canHaveModifiers(statement) && Boolean(ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));

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

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
  if (!isFunctionLikeInitializer(declaration.initializer)) return containsJsx(declaration.initializer);

  return containsJsx(declaration.initializer);
});

const isTypeOnlyExportDeclaration = (statement) => ts.isExportDeclaration(statement) && statement.isTypeOnly;

const getStatementOrderCategory = (statement) => {
  if (ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement)) return "import";
  if (isTypeOnlyExportDeclaration(statement)) return "type";
  if (ts.isExportDeclaration(statement) || ts.isExportAssignment(statement)) return "postComponent";
  if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement) || ts.isEnumDeclaration(statement) || ts.isModuleDeclaration(statement)) return "type";
  if (isDisplayNameAssignment(statement)) return "postComponent";

  if (ts.isClassDeclaration(statement)) {
    if (statement.name && isPascalCaseName(statement.name.text) && containsJsx(statement)) return "component";

    return "helper";
  }

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

  return null;
};

const getImportExportNodes = (sourceFile) => sourceFile.statements.filter((statement) => ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement));

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

const canAppearInExportBlock = (statement) => hasExportModifier(statement) && !ts.isImportDeclaration(statement) && !ts.isImportEqualsDeclaration(statement);

const isConstDependentTypeStatement = (source, statement, highestRank) => {
  if (!ts.isTypeAliasDeclaration(statement) && !ts.isInterfaceDeclaration(statement)) return false;
  if (highestRank > ORDER_RANKS.constant) return false;

  return source.slice(statement.getStart(), statement.getEnd()).includes("typeof ");
};

const statementReferencesPreviousHigherRankDeclaration = (source, sourceFile, statement, previousStatements, rank) => {
  const higherRankNames = previousStatements.flatMap((previousStatement) => {
    const previousCategory = getStatementOrderCategory(previousStatement);
    if (ORDER_RANKS[previousCategory] <= rank) return [];

    return getStatementDeclarationNames(previousStatement);
  });
  const statementText = source.slice(statement.getStart(sourceFile), statement.getEnd());

  return higherRankNames.some((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`).test(statementText));
};

const checkStatementOrder = (filePath, source, sourceFile) => {
  const violations = [];
  const previousStatements = [];
  let highestCategory = "import";
  let highestRank = 0;

  if (!shouldCheckStatementOrder(filePath)) return violations;

  for (const statement of sourceFile.statements) {
    if (isDirectiveStatement(statement)) continue;

    const category = getStatementOrderCategory(statement);
    const rank = ORDER_RANKS[category];

    if (rank < highestRank) {
      if (isTypeOnlyExportDeclaration(statement)) {
        previousStatements.push(statement);
        continue;
      }

      if (canAppearInExportBlock(statement)) {
        previousStatements.push(statement);
        continue;
      }

      if (isConstDependentTypeStatement(source, statement, highestRank)) {
        previousStatements.push(statement);
        continue;
      }

      if (statementReferencesPreviousHigherRankDeclaration(source, sourceFile, statement, previousStatements, rank)) {
        previousStatements.push(statement);
        continue;
      }

      violations.push({
        filePath,
        line: getLineNumber(sourceFile, statement.getStart(sourceFile)),
        message: `Move ${ORDER_LABELS[category]} before ${ORDER_LABELS[highestCategory]}: ${getStatementPreview(source, statement)}`,
      });
      previousStatements.push(statement);
      continue;
    }

    highestCategory = category;
    highestRank = rank;
    previousStatements.push(statement);
  }

  return violations;
};

const isJsxTagNamed = (tagName, name) => ts.isIdentifier(tagName) && tagName.text === name;

const isReactFragmentTagName = (tagName) => ts.isPropertyAccessExpression(tagName) && ts.isIdentifier(tagName.expression) && tagName.expression.text === "React" && tagName.name.text === "Fragment";

const isExplicitFragmentTagName = (tagName) => isJsxTagNamed(tagName, "Fragment") || isReactFragmentTagName(tagName);

const isKeyAttribute = (property) => ts.isJsxAttribute(property) && property.name.text === "key";

const hasKeyAttribute = (attributes) => attributes.properties.some(isKeyAttribute);

const hasOnlyKeyAttributes = (attributes) => attributes.properties.length > 0 && attributes.properties.every(isKeyAttribute);

const hasNoRuntimeAttributes = (attributes) => attributes.properties.length === 0 || hasOnlyKeyAttributes(attributes);

const getMeaningfulJsxChildCount = (children) => children.filter((child) => {
  if (ts.isJsxText(child)) return child.getText().trim().length > 0;
  if (ts.isJsxExpression(child)) return Boolean(child.expression);

  return true;
}).length;

const isWithinMapCall = (node) => {
  let current = node.parent;

  while (current) {
    if (ts.isCallExpression(current) && isPropertyAccessNamed(current.expression, "map")) return true;
    current = current.parent;
  }

  return false;
};

const checkExplicitFragmentUsage = (filePath, sourceFile, node, tagName, attributes) => {
  if (!isExplicitFragmentTagName(tagName)) return [];
  if (isWithinMapCall(node) && hasKeyAttribute(attributes)) return [];

  return [{
    filePath,
    line: getLineNumber(sourceFile, node.getStart(sourceFile)),
    message: "Use <>...</> instead of explicit Fragment. Explicit Fragment is only allowed with key inside map.",
  }];
};

const checkShorthandFragmentUsage = (filePath, sourceFile, node) => {
  if (getMeaningfulJsxChildCount(node.children) > 1) return [];

  return [{
    filePath,
    line: getLineNumber(sourceFile, node.getStart(sourceFile)),
    message: "Do not wrap a single child in <>...</>. Return the child directly.",
  }];
};

const checkMeaninglessDivUsage = (filePath, sourceFile, node) => {
  const opening = node.openingElement;
  if (!isJsxTagNamed(opening.tagName, "div")) return [];
  if (!hasNoRuntimeAttributes(opening.attributes)) return [];

  return [{
    filePath,
    line: getLineNumber(sourceFile, node.getStart(sourceFile)),
    message: "Do not use a div only as a wrapper. Use <>...</> unless a real DOM node is needed.",
  }];
};

const checkJsxWrapperConventions = (filePath, sourceFile) => {
  const violations = [];

  const visit = (node) => {
    if (ts.isJsxElement(node)) {
      violations.push(
        ...checkExplicitFragmentUsage(filePath, sourceFile, node, node.openingElement.tagName, node.openingElement.attributes),
        ...checkMeaninglessDivUsage(filePath, sourceFile, node),
      );
    }

    if (ts.isJsxSelfClosingElement(node)) {
      violations.push(...checkExplicitFragmentUsage(filePath, sourceFile, node, node.tagName, node.attributes));
    }

    if (ts.isJsxFragment(node)) {
      violations.push(...checkShorthandFragmentUsage(filePath, sourceFile, node));
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations;
};

const checkSourceFile = (filePath) => {
  const source = readFileSync(filePath, "utf8");
  const scriptKind = path.extname(filePath).endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind);
  const importExportNodes = getImportExportNodes(sourceFile);
  const importViolations = importExportNodes.flatMap((node) => {
    const specifier = getModuleSpecifier(node);
    if (!specifier) return [];

    return [...checkSingleLineImportExport(filePath, sourceFile, node), ...checkModuleSpecifier(filePath, sourceFile, node, specifier)];
  });

  return [...importViolations, ...checkStatementOrder(filePath, source, sourceFile), ...checkJsxWrapperConventions(filePath, sourceFile)];
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
