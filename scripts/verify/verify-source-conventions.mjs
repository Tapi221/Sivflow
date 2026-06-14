import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORY_PATTERNS = process.env.SOURCE_CONVENTION_TARGETS?.split(path.delimiter).filter(Boolean) ?? ["src", "apps/web/src", "apps/android/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/android-renderer/src", "shared", "functions/src", "tests", "scripts/dev", "scripts/verify"];
const SOURCE_DIRECTORIES = SOURCE_DIRECTORY_PATTERNS.map((directory) => path.resolve(ROOT_DIR, directory));
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
  type: "型定義",
  constant: "定数",
  helper: "helper 関数",
  component: "component 本体",
  postComponent: "memo / displayName / export",
};
const INLINE_BLOCK_STATEMENT_MESSAGE = "ブロック開始直後の文は { と同じ行に置かず、次の行へ分けてください。";

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

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getBindingNameIdentifiers = (name) => {
  if (ts.isIdentifier(name)) return [name.text];
  if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) return name.elements.flatMap((element) => ts.isBindingElement(element) ? getBindingNameIdentifiers(element.name) : []);

  return [];
};

const getVariableStatementNames = (statement) => statement.declarationList.declarations.flatMap((declaration) => getBindingNameIdentifiers(declaration.name));

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

const isTypeOnlyExportDeclaration = (statement) => ts.isExportDeclaration(statement) && statement.isTypeOnly;

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

  if (specifier.startsWith(".")) {
    violations.push({ filePath, line, message: `project 内の import/export-from では ${specifier} ではなくエイリアスを使ってください。` });
  }

  if (specifier === "@constants" || specifier.startsWith("@constants/")) {
    violations.push({ filePath, line, message: "@constants から import しないでください。値は責務を持つ module に移動してください。" });
  }

  return violations;
};

const checkSingleLineImportExport = (filePath, sourceFile, node) => {
  const startLine = getLineNumber(sourceFile, node.getStart(sourceFile));
  const endLine = getLineNumber(sourceFile, node.getEnd());

  if (startLine === endLine) return [];

  return [{ filePath, line: startLine, message: "各 import/export-from 宣言は1行にまとめてください。" }];
};

const canAppearInExportBlock = (statement) => hasExportModifier(statement) && !ts.isImportDeclaration(statement) && !ts.isImportEqualsDeclaration(statement);

const isConstDependentTypeStatement = (source, statement, highestRank) => {
  if (!ts.isTypeAliasDeclaration(statement) && !ts.isInterfaceDeclaration(statement)) return false;
  if (highestRank > ORDER_RANKS.constant) return false;

  return source.slice(statement.getStart(), statement.getEnd()).includes("typeof ");
};

const statementReferencesDeclarationNames = (source, sourceFile, statement, names) => {
  const statementText = source.slice(statement.getStart(sourceFile), statement.getEnd());
  return names.some((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`).test(statementText));
};

const statementReferencesPreviousHigherRankDeclaration = (source, sourceFile, statement, previousStatements, rank) => {
  const higherRankNames = previousStatements.flatMap((previousStatement) => {
    const previousCategory = getStatementOrderCategory(previousStatement);
    if (ORDER_RANKS[previousCategory] <= rank) return [];

    return getStatementDeclarationNames(previousStatement);
  });

  return statementReferencesDeclarationNames(source, sourceFile, statement, higherRankNames);
};

const getMovedOverStatements = (previousStatements, rank) => {
  const targetIndex = previousStatements.findIndex((previousStatement) => ORDER_RANKS[getStatementOrderCategory(previousStatement)] > rank);
  if (targetIndex < 0) return [];

  return previousStatements.slice(targetIndex);
};

const statementReferencesMovedOverDeclaration = (source, sourceFile, statement, previousStatements, rank) => {
  const movedOverNames = getMovedOverStatements(previousStatements, rank).flatMap(getStatementDeclarationNames);
  return statementReferencesDeclarationNames(source, sourceFile, statement, movedOverNames);
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
      if (isTypeOnlyExportDeclaration(statement) || canAppearInExportBlock(statement) || isConstDependentTypeStatement(source, statement, highestRank) || statementReferencesPreviousHigherRankDeclaration(source, sourceFile, statement, previousStatements, rank) || statementReferencesMovedOverDeclaration(source, sourceFile, statement, previousStatements, rank)) {
        previousStatements.push(statement);
        continue;
      }

      violations.push({
        filePath,
        line: getLineNumber(sourceFile, statement.getStart(sourceFile)),
        message: `${ORDER_LABELS[category]} を ${ORDER_LABELS[highestCategory]} より前に移動してください: ${getStatementPreview(source, statement)}`,
      });
      previousStatements.push(statement);
      continue;
    }

    if (rank > highestRank) highestCategory = category;

    highestRank = rank;
    previousStatements.push(statement);
  }

  return violations;
};

const getLeadingWhitespaceText = (source, sourceFile, previousStatement, statement) => source.slice(previousStatement.getEnd(), statement.getStart(sourceFile));

const getBlankLineCountBetweenStatements = (source, sourceFile, previousStatement, statement) => getLeadingWhitespaceText(source, sourceFile, previousStatement, statement).split("\n").length - 1;

const checkBlockSpacing = (filePath, source, sourceFile) => {
  if (!shouldCheckStatementOrder(filePath)) return [];

  return sourceFile.statements.flatMap((statement, index, statements) => {
    const previousStatement = statements[index - 1];
    if (!previousStatement) return [];
    if (isDirectiveStatement(previousStatement) || isDirectiveStatement(statement)) return [];

    const previousCategory = getStatementOrderCategory(previousStatement);
    const category = getStatementOrderCategory(statement);
    if (previousCategory === category) return [];

    const leadingWhitespace = getLeadingWhitespaceText(source, sourceFile, previousStatement, statement);
    if (/\S/.test(leadingWhitespace)) return [];

    const blankLineCount = getBlankLineCountBetweenStatements(source, sourceFile, previousStatement, statement);
    if (blankLineCount === 2) return [];

    return [{ filePath, line: getLineNumber(sourceFile, statement.getStart(sourceFile)), message: `${ORDER_LABELS[previousCategory]} と ${ORDER_LABELS[category]} のブロック間は空行1行だけにしてください。` }];
  });
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

  return [{ filePath, line: getLineNumber(sourceFile, node.getStart(sourceFile)), message: "明示的な Fragment ではなく <>...</> を使ってください。明示的な Fragment は map 内で key が必要な場合だけ許可します。" }];
};

const checkShorthandFragmentUsage = (filePath, sourceFile, node) => {
  if (getMeaningfulJsxChildCount(node.children) > 1) return [];

  return [{ filePath, line: getLineNumber(sourceFile, node.getStart(sourceFile)), message: "単一の子要素を <>...</> で包まないでください。子要素をそのまま返してください。" }];
};

const checkMeaninglessDivUsage = (filePath, sourceFile, node) => {
  const opening = node.openingElement;
  if (!isJsxTagNamed(opening.tagName, "div")) return [];
  if (!hasNoRuntimeAttributes(opening.attributes)) return [];

  return [{ filePath, line: getLineNumber(sourceFile, node.getStart(sourceFile)), message: "ラッパーだけの div を使わないでください。実 DOM が必要ない場合は <>...</> を使ってください。" }];
};

const checkJsxWrapperConventions = (filePath, sourceFile) => {
  const violations = [];

  const visit = (node) => {
    if (ts.isJsxElement(node)) {
      violations.push(...checkExplicitFragmentUsage(filePath, sourceFile, node, node.openingElement.tagName, node.openingElement.attributes), ...checkMeaninglessDivUsage(filePath, sourceFile, node));
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

const checkInlineBlockStatementSpacing = (filePath, source, sourceFile) => {
  if (!shouldCheckStatementOrder(filePath)) return [];

  const violations = [];

  const visit = (node) => {
    if (ts.isBlock(node) && node.statements.length > 0) {
      const openingBracePosition = node.getStart(sourceFile);
      const firstStatement = node.statements[0];
      const firstStatementStart = firstStatement.getStart(sourceFile);
      const openingBraceLine = sourceFile.getLineAndCharacterOfPosition(openingBracePosition).line;
      const firstStatementLine = sourceFile.getLineAndCharacterOfPosition(firstStatementStart).line;
      const leadingText = source.slice(openingBracePosition + 1, firstStatementStart);
      if (openingBraceLine === firstStatementLine && !/\S/u.test(leadingText)) {
        violations.push({ filePath, line: getLineNumber(sourceFile, firstStatementStart), message: INLINE_BLOCK_STATEMENT_MESSAGE });
      }
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

  return [...importViolations, ...checkStatementOrder(filePath, source, sourceFile), ...checkBlockSpacing(filePath, source, sourceFile), ...checkInlineBlockStatementSpacing(filePath, source, sourceFile), ...checkJsxWrapperConventions(filePath, sourceFile)];
};

const formatViolation = ({ filePath, line, message }) => `${toPosix(path.relative(ROOT_DIR, filePath))}:${line} ${message}`;

const sourceFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles);
const violations = sourceFiles.flatMap(checkSourceFile);

if (violations.length > 0) {
  console.error("ソース規約違反:");
  for (const violation of violations) {
    console.error(`- ${formatViolation(violation)}`);
  }
  process.exitCode = 1;
}
