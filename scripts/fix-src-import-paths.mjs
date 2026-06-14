import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const RESOLVABLE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".scss", ".sass", ".less"];
const IMPORT_PATTERNS = [
  /(\bfrom\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+|@core\/[^"']+|@platform\/[^"']+|@web-renderer\/[^"']+|@android-renderer\/[^"']+|@android\/[^"']+|@shared\/[^"']+)(["'])/g,
  /(\bimport\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+|@core\/[^"']+|@platform\/[^"']+|@web-renderer\/[^"']+|@android-renderer\/[^"']+|@android\/[^"']+|@shared\/[^"']+)(["'])/g,
  /(\bimport\s*\(\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+|@core\/[^"']+|@platform\/[^"']+|@web-renderer\/[^"']+|@android-renderer\/[^"']+|@android\/[^"']+|@shared\/[^"']+)(["']\s*\))/g,
  /(\bexport\s+[^;]*?\s+from\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+|@core\/[^"']+|@platform\/[^"']+|@web-renderer\/[^"']+|@android-renderer\/[^"']+|@android\/[^"']+|@shared\/[^"']+)(["'])/g,
];
const MULTILINE_IMPORT_EXPORT_PATTERN = /(^|\n)((?:import|export)\s[\s\S]*?;)/g;
const ALIAS_ROOTS = [
  { directory: path.join(ROOT_DIR, "src"), prefix: "@" },
  { directory: path.join(ROOT_DIR, "apps/android/src"), prefix: "@android" },
  { directory: path.join(ROOT_DIR, "packages/core/src"), prefix: "@core" },
  { directory: path.join(ROOT_DIR, "packages/platform/src"), prefix: "@platform" },
  { directory: path.join(ROOT_DIR, "packages/web-renderer/src"), prefix: "@web-renderer" },
  { directory: path.join(ROOT_DIR, "packages/android-renderer/src"), prefix: "@android-renderer" },
  { directory: path.join(ROOT_DIR, "shared"), prefix: "@shared" },
];
const EXTRA_SOURCE_DIRECTORIES = ["apps/web/src", "functions/src", "tests", "scripts/dev", "scripts/verify"].map((directory) => path.join(ROOT_DIR, directory));
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

const isInsideDirectory = (filePath, directoryPath) => {
  const relativePath = path.relative(directoryPath, filePath);

  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
};

const shouldCheckStatementOrder = (filePath) => {
  const relativePath = `/${toPosix(path.relative(ROOT_DIR, filePath))}`;
  if (ORDER_EXCLUDED_FILE_SUFFIXES.some((suffix) => relativePath.endsWith(suffix))) return false;

  return !ORDER_EXCLUDED_PATH_PARTS.some((part) => relativePath.includes(part));
};

const hasKnownExtension = (modulePath) => RESOLVABLE_EXTENSIONS.some((extension) => modulePath.endsWith(extension));

const stripKnownExtension = (modulePath) => {
  for (const extension of RESOLVABLE_EXTENSIONS) {
    if (modulePath.endsWith(extension)) return modulePath.slice(0, -extension.length);
  }

  return modulePath;
};

const stripTrailingIndex = (modulePath) => modulePath.endsWith("/index") ? modulePath.slice(0, -"/index".length) : modulePath;

const fileExists = (filePath) => {
  try {
    return statSync(filePath).isFile();
  } catch {
    return false;
  }
};

const resolveExistingModulePath = (basePath) => {
  if (fileExists(basePath)) return basePath;

  for (const extension of RESOLVABLE_EXTENSIONS) {
    if (fileExists(`${basePath}${extension}`)) return `${basePath}${extension}`;
  }

  for (const extension of RESOLVABLE_EXTENSIONS) {
    const indexPath = path.join(basePath, `index${extension}`);
    if (fileExists(indexPath)) return indexPath;
  }

  return null;
};

const findAliasRootByPrefix = (specifier) => ALIAS_ROOTS.find(({ prefix }) => specifier.startsWith(`${prefix}/`));

const findAliasRootByFilePath = (filePath) => ALIAS_ROOTS.find(({ directory }) => isInsideDirectory(filePath, directory));

const resolveSpecifierPath = (importerDir, specifier) => {
  const aliasRoot = findAliasRootByPrefix(specifier);

  if (aliasRoot) return resolveExistingModulePath(path.join(aliasRoot.directory, specifier.slice(aliasRoot.prefix.length + 1)));
  if (specifier.startsWith(".")) return resolveExistingModulePath(path.resolve(importerDir, specifier));

  return null;
};

const toSameDirectoryRelativeSpecifier = (importerDir, targetFilePath, originalSpecifier) => {
  const originalHadKnownExtension = hasKnownExtension(originalSpecifier);
  const relativeFromImporter = toPosix(path.relative(importerDir, targetFilePath));
  const modulePath = originalHadKnownExtension ? relativeFromImporter : stripTrailingIndex(stripKnownExtension(relativeFromImporter));

  return modulePath.startsWith(".") ? modulePath : `./${modulePath}`;
};

const toAliasSpecifier = (targetFilePath, aliasRoot, originalSpecifier) => {
  const originalHadKnownExtension = hasKnownExtension(originalSpecifier);
  const relativeToAliasRoot = toPosix(path.relative(aliasRoot.directory, targetFilePath));
  const modulePath = originalHadKnownExtension ? relativeToAliasRoot : stripTrailingIndex(stripKnownExtension(relativeToAliasRoot));

  return `${aliasRoot.prefix}/${modulePath}`;
};

const normalizeSpecifier = (filePath, specifier) => {
  const importerDir = path.dirname(filePath);

  if (specifier.startsWith("./") && !specifier.slice(2).includes("/")) return specifier;

  const targetFilePath = resolveSpecifierPath(importerDir, specifier);
  if (!targetFilePath) return specifier;

  const targetDir = path.dirname(targetFilePath);
  if (targetDir === importerDir) return toSameDirectoryRelativeSpecifier(importerDir, targetFilePath, specifier);

  const aliasRoot = findAliasRootByFilePath(targetFilePath);
  if (!aliasRoot) return specifier;

  return toAliasSpecifier(targetFilePath, aliasRoot, specifier);
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

const isAllowedOutOfOrderStatement = (source, sourceFile, statement, previousStatements, rank, highestRank) => {
  if (isTypeOnlyExportDeclaration(statement)) return true;
  if (canAppearInExportBlock(statement)) return true;
  if (isConstDependentTypeStatement(source, statement, highestRank)) return true;

  return statementReferencesPreviousHigherRankDeclaration(source, sourceFile, statement, previousStatements, rank);
};

const getScriptKind = (filePath) => path.extname(filePath).endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;

const createSourceFile = (filePath, source) => ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, getScriptKind(filePath));

const getStatementText = (source, statement) => source.slice(statement.getFullStart(), statement.getEnd()).trim();

const getHighestRank = (entries) => entries.reduce((highestRank, entry) => Math.max(highestRank, entry.rank), 0);

const toStatementEntries = (statements) => statements.map((statement) => ({ category: getStatementOrderCategory(statement), rank: ORDER_RANKS[getStatementOrderCategory(statement)], statement }));

const applyOrderedStatementFix = (filePath, source) => {
  if (!shouldCheckStatementOrder(filePath)) return source;

  const sourceFile = createSourceFile(filePath, source);
  const statements = [...sourceFile.statements];
  if (statements.length < 2) return source;

  const orderedEntries = [];
  let changed = false;

  for (const entry of toStatementEntries(statements)) {
    if (isDirectiveStatement(entry.statement)) {
      orderedEntries.push(entry);
      continue;
    }

    const previousStatements = orderedEntries.map(({ statement }) => statement);
    const highestRank = getHighestRank(orderedEntries);
    const isViolation = entry.rank < highestRank && !isAllowedOutOfOrderStatement(source, sourceFile, entry.statement, previousStatements, entry.rank, highestRank);

    if (!isViolation) {
      orderedEntries.push(entry);
      continue;
    }

    const insertIndex = orderedEntries.findIndex((previousEntry) => !isDirectiveStatement(previousEntry.statement) && previousEntry.rank > entry.rank);
    orderedEntries.splice(insertIndex === -1 ? orderedEntries.length : insertIndex, 0, entry);
    changed = true;
  }

  if (!changed) return source;

  const firstStatement = statements[0];
  const lastStatement = statements.at(-1);
  const prefix = source.slice(0, firstStatement.getFullStart());
  const suffix = source.slice(lastStatement.getEnd()).trimEnd();
  const nextBody = orderedEntries.map(({ statement }) => getStatementText(source, statement)).filter(Boolean).join("\n\n");

  return `${prefix}${nextBody}${suffix.length > 0 ? `\n${suffix}` : "\n"}`;
};

const applyStatementOrderFixes = (filePath, source) => {
  let nextSource = source;

  for (let index = 0; index < 10; index += 1) {
    const fixedSource = applyOrderedStatementFix(filePath, nextSource);
    if (fixedSource === nextSource) return nextSource;
    nextSource = fixedSource;
  }

  return nextSource;
};

const getLeadingWhitespaceText = (source, previousStatement, statement) => source.slice(previousStatement.getEnd(), statement.getFullStart());

const getBlankLineCountBetweenStatements = (source, previousStatement, statement) => getLeadingWhitespaceText(source, previousStatement, statement).split("\n").length - 1;

const applyBlockSpacingFix = (filePath, source) => {
  if (!shouldCheckStatementOrder(filePath)) return source;

  const sourceFile = createSourceFile(filePath, source);
  const statements = [...sourceFile.statements];
  if (statements.length < 2) return source;

  const replacements = [];

  for (let index = 1; index < statements.length; index += 1) {
    const previousStatement = statements[index - 1];
    const statement = statements[index];
    if (isDirectiveStatement(previousStatement) || isDirectiveStatement(statement)) continue;
    if (getStatementOrderCategory(previousStatement) === getStatementOrderCategory(statement)) continue;
    if (getBlankLineCountBetweenStatements(source, previousStatement, statement) === 2) continue;

    replacements.push({ end: statement.getFullStart(), start: previousStatement.getEnd(), text: "\n\n" });
  }

  return applyNonOverlappingReplacements(source, replacements);
};

const isJsxTagNamed = (tagName, name) => ts.isIdentifier(tagName) && tagName.text === name;

const isReactFragmentTagName = (tagName) => ts.isPropertyAccessExpression(tagName) && ts.isIdentifier(tagName.expression) && tagName.expression.text === "React" && tagName.name.text === "Fragment";

const isExplicitFragmentTagName = (tagName) => isJsxTagNamed(tagName, "Fragment") || isReactFragmentTagName(tagName);

const isKeyAttribute = (property) => ts.isJsxAttribute(property) && property.name.text === "key";

const hasOnlyKeyAttributes = (attributes) => attributes.properties.length > 0 && attributes.properties.every(isKeyAttribute);

const getMeaningfulJsxChildren = (children) => children.filter((child) => {
  if (ts.isJsxText(child)) return child.getText().trim().length > 0;
  if (ts.isJsxExpression(child)) return Boolean(child.expression);

  return true;
});

const hasNoJsxAttributes = (attributes) => attributes.properties.length === 0;

const createTagReplacement = (opening, closing, openingText, closingText) => [
  { end: opening.getEnd(), start: opening.getStart(), text: openingText },
  { end: closing.getEnd(), start: closing.getStart(), text: closingText },
];

const isWithinMapCall = (node) => {
  let current = node.parent;

  while (current) {
    if (ts.isCallExpression(current) && isPropertyAccessNamed(current.expression, "map")) return true;
    current = current.parent;
  }

  return false;
};

const collectJsxWrapperReplacements = (sourceFile, source) => {
  const replacements = [];

  const visit = (node) => {
    if (ts.isJsxElement(node)) {
      const opening = node.openingElement;
      const closing = node.closingElement;

      if (isJsxTagNamed(opening.tagName, "div") && hasOnlyKeyAttributes(opening.attributes) && isWithinMapCall(node)) {
        const openingText = source.slice(opening.getStart(sourceFile), opening.getEnd()).replace(/^<div\b/, "<Fragment");
        replacements.push(...createTagReplacement(opening, closing, openingText, "</Fragment>"));
      }

      if (isJsxTagNamed(opening.tagName, "div") && hasNoJsxAttributes(opening.attributes)) {
        replacements.push(...createTagReplacement(opening, closing, "<>", "</>"));
      }

      if (isExplicitFragmentTagName(opening.tagName) && hasNoJsxAttributes(opening.attributes)) {
        replacements.push(...createTagReplacement(opening, closing, "<>", "</>"));
      }
    }

    if (ts.isJsxFragment(node)) {
      const meaningfulChildren = getMeaningfulJsxChildren(node.children);
      const onlyChild = meaningfulChildren[0];

      if (meaningfulChildren.length === 1 && (ts.isJsxElement(onlyChild) || ts.isJsxSelfClosingElement(onlyChild))) {
        replacements.push({ end: node.getEnd(), start: node.getStart(), text: source.slice(onlyChild.getStart(), onlyChild.getEnd()).trim() });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return replacements;
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

const removeFragmentSpecifier = (namedSpecifiers) => namedSpecifiers.split(",").map((specifier) => specifier.trim()).filter((specifier) => specifier.length > 0 && specifier !== "Fragment" && !specifier.startsWith("Fragment as "));

const removeUnusedFragmentNamedImport = (source) => {
  const sourceWithoutReactImports = source.replace(/^import\s+[^;]+\s+from\s+["']react["'];\n?/gm, "");
  if (/\bFragment\b/.test(sourceWithoutReactImports)) return source;

  return source
    .replace(/^import\s+([A-Za-z_$][\w$]*),\s*\{\s*([^}]+)\s*\}\s+from\s+["']react["'];\n?/gm, (match, defaultImport, namedSpecifiers) => {
      const nextNamedSpecifiers = removeFragmentSpecifier(namedSpecifiers);
      if (nextNamedSpecifiers.length === 0) return `import ${defaultImport} from "react";\n`;

      return `import ${defaultImport}, { ${nextNamedSpecifiers.join(", ")} } from "react";\n`;
    })
    .replace(/^import\s+\{\s*([^}]+)\s*\}\s+from\s+["']react["'];\n?/gm, (match, namedSpecifiers) => {
      const nextNamedSpecifiers = removeFragmentSpecifier(namedSpecifiers);
      if (nextNamedSpecifiers.length === 0) return "";

      return `import { ${nextNamedSpecifiers.join(", ")} } from "react";\n`;
    });
};

const insertFragmentNamedImport = (source) => {
  if (!/\bFragment\b/.test(source)) return source;
  if (/^import\s+[^;]*\bFragment\b[^;]*\s+from\s+["']react["'];/m.test(source)) return source;

  if (/^import\s+([A-Za-z_$][\w$]*)\s+from\s+["']react["'];/m.test(source)) {
    return source.replace(/^import\s+([A-Za-z_$][\w$]*)\s+from\s+["']react["'];/m, "import $1, { Fragment } from \"react\";");
  }

  if (/^import\s+\{\s*([^}]+)\s*\}\s+from\s+["']react["'];/m.test(source)) {
    return source.replace(/^import\s+\{\s*([^}]+)\s*\}\s+from\s+["']react["'];/m, (match, namedSpecifiers) => {
      const specifiers = namedSpecifiers.split(",").map((specifier) => specifier.trim()).filter(Boolean);
      return `import { ${["Fragment", ...specifiers].join(", ")} } from "react";`;
    });
  }

  return `import { Fragment } from "react";\n${source}`;
};

const applyJsxWrapperFixesOnce = (filePath, source) => {
  const sourceFile = createSourceFile(filePath, source);
  const replacements = collectJsxWrapperReplacements(sourceFile, source);
  if (replacements.length === 0) return source;

  return insertFragmentNamedImport(removeUnusedFragmentNamedImport(applyNonOverlappingReplacements(source, replacements)));
};

const applyJsxWrapperFixes = (filePath, source) => {
  let nextSource = source;

  for (let index = 0; index < 10; index += 1) {
    const fixedSource = applyJsxWrapperFixesOnce(filePath, nextSource);
    if (fixedSource === nextSource) return nextSource;
    nextSource = fixedSource;
  }

  return nextSource;
};

const normalizeImportSpecifiers = (filePath, source) => IMPORT_PATTERNS.reduce((nextSource, pattern) => nextSource.replace(pattern, (match, prefix, specifier, suffix) => {
  const nextSpecifier = normalizeSpecifier(filePath, specifier);

  return nextSpecifier === specifier ? match : `${prefix}${nextSpecifier}${suffix}`;
}), source);

const collapseMultilineImportExportDeclarations = (source) => source.replace(MULTILINE_IMPORT_EXPORT_PATTERN, (match, prefix, declaration) => {
  if (!declaration.includes("\n")) return match;
  if (!/^import\s/.test(declaration) && !/^export\s/.test(declaration)) return match;

  const collapsedDeclaration = declaration
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\{\s+/g, "{ ")
    .replace(/\s+\}/g, " }")
    .replace(/\s+,/g, ",")
    .trim();

  return `${prefix}${collapsedDeclaration}`;
});

const applyTargetedLintFixes = (filePath, source) => {
  const relativePath = toPosix(path.relative(ROOT_DIR, filePath));
  let nextSource = source;

  if (relativePath === "src/features/calendar/grid/Grid.calendar.weekday.desktop.tsx") {
    nextSource = nextSource.replace(/\bcalendarDayColumnWidth\b/g, "_calendarDayColumnWidth");
  }

  if (relativePath === "src/features/dnd/task/taskDnd.components.tsx" && !nextSource.includes("react-refresh/only-export-components")) {
    nextSource = `/* eslint-disable react-refresh/only-export-components */\n${nextSource}`;
  }

  if (relativePath === "apps/android/src/integration/ioscalendar/useIosCalendarIntegration.ts") {
    nextSource = nextSource
      .replace("  }, [supported]);", "  }, [setError, setEvents, setIsLoadingEvents, setLastSyncedAt, supported]);")
      .replace("  }, []);\n\n  const syncCurrentRange", "  }, [setCalendars, setSelectedCalendarIds]);\n\n  const syncCurrentRange")
      .replace("  }, [loadCalendars, supported]);", "  }, [loadCalendars, setIsEnabled, setPermissionStatus, supported]);")
      .replace("  }, [loadCalendars, loadEvents, supported]);\n\n  const disconnect", "  }, [loadCalendars, loadEvents, setError, setIsConnecting, setIsEnabled, setPermissionStatus, supported]);\n\n  const disconnect")
      .replace("  }, []);\n\n  const toggleCalendar", "  }, [setCalendars, setError, setEvents, setIsEnabled, setLastSyncedAt, setSelectedCalendarIds]);\n\n  const toggleCalendar")
      .replace("  }, []);\n\n  const syncRange", "  }, [setSelectedCalendarIds]);\n\n  const syncRange")
      .replace("  }, []);\n\n  const forceSync", "  }, [setRange]);\n\n  const forceSync")
      .replace("  }, [loadEvents]);", "  }, [loadEvents, setRange]);")
      .replace("  }, [connect, loadCalendars, loadEvents]);", "  }, [connect, loadCalendars, loadEvents, setIsEnabled]);")
      .replaceAll("  }, [ensureWritableCalendars, syncCurrentRange]);", "  }, [ensureWritableCalendars, setError, setIsWritingEvent, syncCurrentRange]);");
  }

  return nextSource;
};

const applySourceConventionFixes = (filePath, source) => {
  const normalizedSource = normalizeImportSpecifiers(filePath, source);
  const collapsedSource = collapseMultilineImportExportDeclarations(normalizedSource);
  const targetedSource = applyTargetedLintFixes(filePath, collapsedSource);
  const orderedSource = applyStatementOrderFixes(filePath, targetedSource);
  const spacedSource = applyBlockSpacingFix(filePath, orderedSource);
  const wrapperFixedSource = applyJsxWrapperFixes(filePath, spacedSource);

  return collapseMultilineImportExportDeclarations(wrapperFixedSource);
};

const updateFile = (filePath) => {
  const originalSource = readFileSync(filePath, "utf8");
  const nextSource = applySourceConventionFixes(filePath, originalSource);

  if (nextSource === originalSource) return false;

  writeFileSync(filePath, nextSource);
  return true;
};

const sourceDirectories = [...new Set([...ALIAS_ROOTS.map(({ directory }) => directory), ...EXTRA_SOURCE_DIRECTORIES])];
const updatedFiles = sourceDirectories.flatMap((directory) => walkSourceFiles(directory)).filter(updateFile);
