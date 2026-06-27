import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORIES = ["src", "apps/web/src", "apps/android/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/android-renderer/src", "shared", "functions/src", "tests", "scripts/dev", "scripts/verify"].map((directory) => path.join(ROOT_DIR, directory));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const EXCLUDED_PATH_PARTS = ["/node_modules/", "/dist/", "/build/", "/coverage/", "/.firebase/", "/tmp/"];
const TSX_GENERIC_ARROW_PARAMETER_PATTERN = /(=\s*(?:async\s*)?)<([A-Za-z_$][\w$]*(?:(?!=>)[^<>,])*)>\s*(?=\()/g;

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

const shouldFixFile = (filePath) => {
  const relativePath = `/${toPosix(path.relative(ROOT_DIR, filePath))}`;

  return !EXCLUDED_PATH_PARTS.some((part) => relativePath.includes(part));
};

const getScriptKind = (filePath) => {
  const extension = path.extname(filePath);
  if (extension === ".tsx") return ts.ScriptKind.TSX;
  if (extension === ".jsx") return ts.ScriptKind.JSX;
  if (extension === ".js" || extension === ".mjs") return ts.ScriptKind.JS;

  return ts.ScriptKind.TS;
};

const createSourceFile = (filePath, source) => ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, getScriptKind(filePath));

const hasModifier = (node, kind) => Boolean(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) => modifier.kind === kind));

const isAsyncFunction = (node) => hasModifier(node, ts.SyntaxKind.AsyncKeyword);

const isExportedFunction = (node) => hasModifier(node, ts.SyntaxKind.ExportKeyword);

const isDefaultExportFunction = (node) => hasModifier(node, ts.SyntaxKind.DefaultKeyword);

const shouldUseTsxGenericComma = (filePath, node) => getScriptKind(filePath) === ts.ScriptKind.TSX && node.typeParameters?.length === 1;

const applyTsxGenericArrowCommaFix = (filePath, source) => {
  if (getScriptKind(filePath) !== ts.ScriptKind.TSX) return source;

  return source.replace(TSX_GENERIC_ARROW_PARAMETER_PATTERN, (_match, prefix, typeParameterText) => `${prefix}<${typeParameterText.trim()},>`);
};

const getTypeParametersText = (node, sourceFile, filePath) => {
  if (!node.typeParameters) return "";

  const typeParametersText = node.typeParameters.map((typeParameter) => typeParameter.getText(sourceFile)).join(", ");
  return shouldUseTsxGenericComma(filePath, node) ? `<${typeParametersText},>` : `<${typeParametersText}>`;
};

const getParametersText = (node, sourceFile) => `(${node.parameters.map((parameter) => parameter.getText(sourceFile)).join(", ")})`;

const getReturnTypeText = (node, sourceFile) => node.type ? `: ${node.type.getText(sourceFile)}` : "";

const getFunctionBodyText = (node, sourceFile) => node.body?.getText(sourceFile) ?? "{}";

const getArrowInitializerText = (node, sourceFile, filePath) => `${isAsyncFunction(node) ? "async " : ""}${getTypeParametersText(node, sourceFile, filePath)}${getParametersText(node, sourceFile)}${getReturnTypeText(node, sourceFile)} => ${getFunctionBodyText(node, sourceFile)}`;

const getFunctionDeclarationReplacementText = (node, sourceFile, filePath) => {
  if (!node.name || !node.body || node.asteriskToken) return null;

  const name = node.name.getText(sourceFile);
  const declarationText = `${isDefaultExportFunction(node) ? "" : isExportedFunction(node) ? "export " : ""}const ${name} = ${getArrowInitializerText(node, sourceFile, filePath)};`;

  return isDefaultExportFunction(node) ? `${declarationText}\nexport default ${name};` : declarationText;
};

const getFunctionExpressionReplacementText = (node, sourceFile, filePath) => {
  if (!node.body || node.asteriskToken) return null;

  return getArrowInitializerText(node, sourceFile, filePath);
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

const collectConstArrowReplacements = (sourceFile, filePath) => {
  const replacements = [];

  const visit = (node) => {
    if (ts.isFunctionDeclaration(node)) {
      const replacementText = getFunctionDeclarationReplacementText(node, sourceFile, filePath);
      if (replacementText) replacements.push({ end: node.getEnd(), start: node.getStart(sourceFile), text: replacementText });
      return;
    }

    if (ts.isFunctionExpression(node)) {
      const replacementText = getFunctionExpressionReplacementText(node, sourceFile, filePath);
      if (replacementText) replacements.push({ end: node.getEnd(), start: node.getStart(sourceFile), text: replacementText });
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return replacements;
};

const applyConstArrowFixOnce = (filePath, source) => {
  const sourceFile = createSourceFile(filePath, source);
  if (sourceFile.parseDiagnostics.length > 0) return source;

  const replacements = collectConstArrowReplacements(sourceFile, filePath);

  return replacements.length === 0 ? source : applyNonOverlappingReplacements(source, replacements);
};

const applyConstArrowFix = (filePath, source) => {
  let nextSource = applyTsxGenericArrowCommaFix(filePath, source);

  for (let index = 0; index < 20; index += 1) {
    const fixedSource = applyConstArrowFixOnce(filePath, nextSource);
    if (fixedSource === nextSource) return nextSource;
    nextSource = fixedSource;
  }

  return nextSource;
};

const updateFile = (filePath) => {
  if (!shouldFixFile(filePath)) return false;

  const originalSource = readFileSync(filePath, "utf8");
  const nextSource = applyConstArrowFix(filePath, originalSource);

  if (nextSource === originalSource) return false;

  writeFileSync(filePath, nextSource);
  return true;
};

const updatedFiles = SOURCE_DIRECTORIES.flatMap(walkSourceFiles).filter(updateFile);

if (updatedFiles.length > 0) {
  console.log(`const arrow 関数規約の整形を ${updatedFiles.length} 件のファイルで修正しました。`);
}