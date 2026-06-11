import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";


import path from "node:path";


import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORIES = ["src", "apps/web/src", "apps/mobile/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/mobile-renderer/src", "shared", "functions/src", "tests", "scripts/dev", "scripts/verify"].map((directory) => path.join(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);

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

const getScriptKind = (filePath) => path.extname(filePath).endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;

const createSourceFile = (filePath, source) => ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, getScriptKind(filePath));

const getNewline = (source) => source.includes("\r\n") ? "\r\n" : "\n";

const isImportStatement = (statement) => ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement);

const getLeadingWhitespaceText = (source, previousStatement, statement) => source.slice(previousStatement.getEnd(), statement.getFullStart());

const rangesOverlap = (left, right) => left.start < right.end && right.start < left.end;

const applyNonOverlappingReplacements = (source, replacements) => {
  const acceptedReplacements = [];

  for (const replacement of [...replacements].sort((left, right) => right.start - left.start)) {
    if (acceptedReplacements.some((acceptedReplacement) => rangesOverlap(replacement, acceptedReplacement))) continue;

    acceptedReplacements.push(replacement);
  }

  return acceptedReplacements.reduce((nextSource, replacement) => `${nextSource.slice(0, replacement.start)}${replacement.text}${nextSource.slice(replacement.end)}`, source);
};

const collectImportSpacingReplacements = (source, sourceFile) => {
  const replacements = [];
  const statements = [...sourceFile.statements];
  const newline = getNewline(source);

  for (let index = 1; index < statements.length; index += 1) {
    const previousStatement = statements[index - 1];
    const statement = statements[index];
    if (!isImportStatement(previousStatement) || !isImportStatement(statement)) continue;

    const leadingWhitespace = getLeadingWhitespaceText(source, previousStatement, statement);
    if (/\S/.test(leadingWhitespace)) continue;
    if (leadingWhitespace === newline) continue;

    replacements.push({ end: statement.getFullStart(), start: previousStatement.getEnd(), text: newline });
  }

  return replacements;
};

const applyImportSpacingFix = (filePath, source) => {
  const sourceFile = createSourceFile(filePath, source);
  const replacements = collectImportSpacingReplacements(source, sourceFile);

  return replacements.length === 0 ? source : applyNonOverlappingReplacements(source, replacements);
};

const updateFile = (filePath) => {
  const originalSource = readFileSync(filePath, "utf8");
  const nextSource = applyImportSpacingFix(filePath, originalSource);

  if (nextSource === originalSource) return false;

  writeFileSync(filePath, nextSource);
  return true;
};

const updatedFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles).filter(updateFile);

if (updatedFiles.length > 0) {
  console.log(`Removed blank lines between import statements in ${updatedFiles.length} file(s).`);
}
