import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const HAS_CUSTOM_SOURCE_TARGETS = Boolean(process.env.SOURCE_CONVENTION_TARGETS);
const SOURCE_DIRECTORY_PATTERNS = process.env.SOURCE_CONVENTION_TARGETS?.split(path.delimiter).filter(Boolean) ?? ["src", "apps/web/src", "apps/mobile/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/mobile-renderer/src", "shared", "functions/src"];
const SOURCE_DIRECTORIES = SOURCE_DIRECTORY_PATTERNS.map((directory) => path.resolve(ROOT_DIR, directory));
const ESLINT_BIN_PATH = path.resolve(ROOT_DIR, "node_modules/eslint/bin/eslint.js");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const ORDER_EXCLUDED_PATH_PARTS = ["/tests/", "/scripts/", "/src/sandbox/"];
const ORDER_EXCLUDED_FILE_SUFFIXES = [".d.ts"];
const ESLINT_LAYOUT_FIX_TARGETS = ["src/**/*.{ts,tsx}", "apps/web/src/**/*.{ts,tsx}", "apps/mobile/src/**/*.{ts,tsx}", "packages/core/src/**/*.{ts,tsx}", "packages/platform/src/**/*.{ts,tsx}", "packages/web-renderer/src/**/*.{ts,tsx}", "packages/mobile-renderer/src/**/*.{ts,tsx}"];
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

const getTopLevelStatementNames = (statement) => {
  if (ts.isVariableStatement(statement)) return getVariableStatementNames(statement);
  if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isEnumDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) && statement.name) return [statement.name.text];

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

const isIdentifierUsedInStatement = (source, statement, name) => {
  const statementSource = source.slice(statement.getStart(), statement.getEnd());
  return new RegExp(`\\b${escapeRegExp(name)}\\b`, "u").test(statementSource);
};

const isDependentOnEarlierHigherRankStatement = (source, statement, statements, fromIndex, rank) => {
  if (!ts.isVariableStatement(statement)) return false;

  return statements.slice(0, fromIndex).some((previousStatement) => {
    if (ORDER_RANKS[getStatementOrderCategory(previousStatement)] <= rank) return false;

    return getTopLevelStatementNames(previousStatement).some((name) => isIdentifierUsedInStatement(source, statement, name));
  });
};

const isDependentOnMovedOverStatement = (source, statement, statements, targetIndex, fromIndex) => {
  if (fromIndex <= targetIndex) return false;

  return statements.slice(targetIndex, fromIndex).some((movedOverStatement) => {
    return getTopLevelStatementNames(movedOverStatement).some((name) => isIdentifierUsedInStatement(source, statement, name));
  });
};

const canKeepStatementAfterHigherRank = (source, statement, highestRank, statements, fromIndex, rank) => {
  return isTypeOnlyExportDeclaration(statement) || canAppearInExportBlock(statement) || isConstDependentTypeStatement(source, statement, highestRank) || isDependentOnEarlierHigherRankStatement(source, statement, statements, fromIndex, rank);
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
  let highestRank = 0;

  for (let index = 0; index < statements.length; index += 1) {
    const statement = statements[index];
    if (isDirectiveStatement(statement)) continue;

    const category = getStatementOrderCategory(statement);
    const rank = ORDER_RANKS[category];

    if (rank < highestRank) {
      if (canKeepStatementAfterHigherRank(source, statement, highestRank, statements, index, rank)) continue;

      const targetIndex = findMoveTargetIndex(statements, rank, index);
      if (targetIndex >= 0) {
        if (isDependentOnMovedOverStatement(source, statement, statements, targetIndex, index)) continue;

        return { fromIndex: index, targetIndex };
      }
    }

    highestRank = Math.max(highestRank, rank);
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
    if (sourceFile.parseDiagnostics.length > 0) return nextSource;

    const move = findFirstOrderMove(nextSource, sourceFile);
    if (!move) return nextSource;

    nextSource = moveStatement(nextSource, sourceFile, move);
  }

  return nextSource;
};

const runEslintLayoutFix = () => {
  if (HAS_CUSTOM_SOURCE_TARGETS) return 0;
  if (!existsSync(ESLINT_BIN_PATH)) return 0;

  const result = spawnSync(process.execPath, [ESLINT_BIN_PATH, ...ESLINT_LAYOUT_FIX_TARGETS, "--fix", "--fix-type", "layout", "--no-error-on-unmatched-pattern", "--format", "json"], {
    cwd: ROOT_DIR,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 64,
  });

  if (result.error) {
    console.error(`ESLint layout fix の実行に失敗しました: ${result.error.message}`);
    return 1;
  }

  if (result.status && result.status !== 0) {
    if (result.stdout.trim()) console.error(result.stdout.trim());
    if (result.stderr.trim()) console.error(result.stderr.trim());
  }

  return 0;
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

process.exitCode = runEslintLayoutFix();
