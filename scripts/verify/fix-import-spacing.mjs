import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORY_PATTERNS = process.env.SOURCE_CONVENTION_TARGETS?.split(path.delimiter).filter(Boolean) ?? ["src", "apps/web/src", "apps/mobile/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/mobile-renderer/src", "shared", "functions/src", "tests", "scripts/dev", "scripts/verify"];
const SOURCE_DIRECTORIES = SOURCE_DIRECTORY_PATTERNS.map((directory) => path.resolve(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const ORDER_EXCLUDED_PATH_PARTS = ["/tests/", "/scripts/", "/src/sandbox/"];
const ORDER_EXCLUDED_FILE_SUFFIXES = [".d.ts"];

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

const getNewline = (source) => source.includes("\r\n") ? "\r\n" : "\n";

const collapseRepeatedBlankLines = (source) => {
  const newline = getNewline(source);
  const repeatedBlankLinePattern = newline === "\r\n" ? /\r\n[\t ]*(?:\r\n[\t ]*){2,}/gu : /\n[\t ]*(?:\n[\t ]*){2,}/gu;

  return source.replace(repeatedBlankLinePattern, `${newline}${newline}`);
};

const isSingleLineImportText = (line) => /^\s*import(?:\s+type)?\s.+;?\s*$/u.test(line);

const normalizeImportBlankLines = (source) => {
  const newline = getNewline(source);
  const lines = source.split(/\r?\n/u);
  const nextLines = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() !== "") {
      nextLines.push(line);
      continue;
    }

    const previousLine = nextLines.at(-1) ?? "";
    const nextNonEmptyLine = lines.slice(index + 1).find((nextLine) => nextLine.trim() !== "") ?? "";
    if (isSingleLineImportText(previousLine) && isSingleLineImportText(nextNonEmptyLine)) continue;

    nextLines.push(line);
  }

  return nextLines.join(newline);
};

const isImportStatement = (statement) => ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement);

const isExportStatement = (statement) => ts.isExportDeclaration(statement) || ts.isExportAssignment(statement);

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
  if (isImportStatement(statement)) return "import";
  if (isExportStatement(statement)) return "postComponent";
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

const getExportModifier = (statement) => ts.canHaveModifiers(statement) ? ts.getModifiers(statement)?.find((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? null : null;

const hasDefaultModifier = (statement) => ts.canHaveModifiers(statement) && Boolean(ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword));

const isTypeExportModifierStatement = (statement) => ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement);

const getUniqueNames = (names) => [...new Set(names)];

const getExportModifierRemoval = (source, sourceFile, statement) => {
  const exportModifier = getExportModifier(statement);
  if (!exportModifier) return null;

  const start = exportModifier.getStart(sourceFile);
  const end = source[exportModifier.getEnd()] === " " ? exportModifier.getEnd() + 1 : exportModifier.getEnd();
  return { end, start, text: "" };
};

const getExportDeclarationRemoval = (sourceFile, statement) => ({ end: statement.getEnd(), start: statement.getStart(sourceFile), text: "" });

const getStatementText = (source, sourceFile, statement) => source.slice(statement.getStart(sourceFile), statement.getEnd()).trim();

const getMergeableNamedExportEntries = (source, sourceFile, statement) => {
  if (statement.moduleSpecifier) return null;
  if (!statement.exportClause || !ts.isNamedExports(statement.exportClause)) return null;
  if (statement.exportClause.elements.length === 0) return null;
  if (statement.exportClause.elements.some((specifier) => specifier.isTypeOnly)) return null;

  return statement.exportClause.elements.map((specifier) => source.slice(specifier.getStart(sourceFile), specifier.getEnd()).trim());
};

const collectExportConventionReplacements = (source, sourceFile) => {
  const replacements = [];
  const valueExportTexts = [];
  const typeExportTexts = [];
  const valueNames = [];
  const typeNames = [];

  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement)) {
      const exportText = getStatementText(source, sourceFile, statement);
      const mergeableEntries = getMergeableNamedExportEntries(source, sourceFile, statement);
      if (mergeableEntries) {
        if (statement.isTypeOnly) {
          typeNames.push(...mergeableEntries);
        } else {
          valueNames.push(...mergeableEntries);
        }
      } else if (statement.isTypeOnly) {
        typeExportTexts.push(exportText);
      } else {
        valueExportTexts.push(exportText);
      }
      replacements.push(getExportDeclarationRemoval(sourceFile, statement));
      continue;
    }

    if (ts.isExportAssignment(statement)) continue;
    if (!getExportModifier(statement)) continue;
    if (hasDefaultModifier(statement)) continue;

    const names = getStatementDeclarationNames(statement);
    if (names.length === 0) continue;

    const removal = getExportModifierRemoval(source, sourceFile, statement);
    if (!removal) continue;

    replacements.push(removal);
    if (isTypeExportModifierStatement(statement)) {
      typeNames.push(...names);
    } else {
      valueNames.push(...names);
    }
  }

  return { replacements, typeExportTexts, typeNames: getUniqueNames(typeNames), valueExportTexts, valueNames: getUniqueNames(valueNames) };
};

const buildExportConventionBlock = ({ typeExportTexts, typeNames, valueExportTexts, valueNames }, newline) => {
  const exportLines = [];
  exportLines.push(...valueExportTexts);
  if (valueNames.length > 0) exportLines.push(`export { ${valueNames.join(", ")} };`);
  exportLines.push(...typeExportTexts);
  if (typeNames.length > 0) exportLines.push(`export type { ${typeNames.join(", ")} };`);

  return exportLines.length === 0 ? "" : `${newline}${newline}${exportLines.join(newline)}`;
};

const applyExportConventionFix = (filePath, source) => {
  if (!shouldFixBlockSpacing(filePath)) return source;

  const sourceFile = createSourceFile(filePath, source);
  const newline = getNewline(source);
  const exportConvention = collectExportConventionReplacements(source, sourceFile);
  if (exportConvention.replacements.length === 0 && exportConvention.typeNames.length === 0 && exportConvention.valueNames.length === 0) return source;

  const sourceWithoutMovedExports = applyNonOverlappingReplacements(source, exportConvention.replacements).trimEnd();
  const exportBlock = buildExportConventionBlock(exportConvention, newline);
  return `${sourceWithoutMovedExports}${exportBlock}${newline}`;
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

const applyReplacement = (source, replacement) => `${source.slice(0, replacement.start)}${replacement.text}${source.slice(replacement.end)}`;

const getTopLevelSpacingText = (filePath, source, previousStatement, statement) => {
  const newline = getNewline(source);
  if (isImportStatement(previousStatement) && isImportStatement(statement)) return newline;
  if (!shouldFixBlockSpacing(filePath)) return null;
  if (isDirectiveStatement(previousStatement) || isDirectiveStatement(statement)) return null;
  if (isExportStatement(previousStatement) && isExportStatement(statement)) return newline;
  if (isExportStatement(statement)) return `${newline}${newline}`;

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

const getLineIndentation = (source, position) => {
  const lineStart = source.lastIndexOf("\n", position - 1) + 1;
  const linePrefix = source.slice(lineStart, position);

  return linePrefix.match(/^[\t ]*/u)?.[0] ?? "";
};

const findFirstInlineBlockStatementReplacement = (source, sourceFile) => {
  const newline = getNewline(source);
  let replacement = null;

  const visit = (node) => {
    if (replacement) return;

    if (ts.isBlock(node) && node.statements.length > 0) {
      const openingBracePosition = node.getStart(sourceFile);
      const firstStatement = node.statements[0];
      const firstStatementStart = firstStatement.getStart(sourceFile);
      const openingBraceLine = sourceFile.getLineAndCharacterOfPosition(openingBracePosition).line;
      const firstStatementLine = sourceFile.getLineAndCharacterOfPosition(firstStatementStart).line;
      const leadingText = source.slice(openingBracePosition + 1, firstStatementStart);
      if (openingBraceLine === firstStatementLine && !/\S/u.test(leadingText)) {
        const indentation = getLineIndentation(source, openingBracePosition);
        replacement = { end: firstStatementStart, start: openingBracePosition + 1, text: `${newline}${indentation}  ` };
        return;
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return replacement;
};

const applyInlineBlockStatementFix = (filePath, source) => {
  if (!shouldFixBlockSpacing(filePath)) return source;

  let nextSource = source;
  const maxPassCount = 10000;

  for (let pass = 0; pass < maxPassCount; pass += 1) {
    const sourceFile = createSourceFile(filePath, nextSource);
    const replacement = findFirstInlineBlockStatementReplacement(nextSource, sourceFile);
    if (!replacement) return nextSource;

    nextSource = applyReplacement(nextSource, replacement);
  }

  return nextSource;
};

const applySourceConventionFix = (filePath, source) => {
  const importNormalizedSource = normalizeImportBlankLines(source);
  const exportNormalizedSource = applyExportConventionFix(filePath, importNormalizedSource);
  const topLevelNormalizedSource = applyTopLevelSpacingFix(filePath, exportNormalizedSource);
  const inlineBlockNormalizedSource = applyInlineBlockStatementFix(filePath, topLevelNormalizedSource);

  return normalizeImportBlankLines(collapseRepeatedBlankLines(inlineBlockNormalizedSource));
};

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
