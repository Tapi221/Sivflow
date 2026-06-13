import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "..");
const NODE_SCRIPT_PATHS = {
  fixBlankLines: path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-repeated-blank-lines.mjs"),
  fixConstArrowFunctions: path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-const-arrow-functions.mjs"),
  fixImportSpacing: path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-import-spacing.mjs"),
  fixJsxChildSpacing: path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-jsx-child-spacing.mjs"),
  fixKnownLintErrors: path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-known-lint-errors.mjs"),
  fixNullishFallback: path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-nullish-fallback.mjs"),
  fixShortHexColors: path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-short-hex-colors.mjs"),
  fixSourceOrder: path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-source-order.mjs"),
  fixStrictEquality: path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-strict-equality.mjs"),
  fixTypeOnlyImports: path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-type-only-imports.mjs"),
  lintEslintJa: path.resolve(REPOSITORY_ROOT, "scripts/lint-eslint-ja.mjs"),
  verifyBlankLines: path.resolve(REPOSITORY_ROOT, "scripts/verify/verify-repeated-blank-lines.mjs"),
  verifyConstArrowFunctions: path.resolve(REPOSITORY_ROOT, "scripts/verify/verify-const-arrow-functions.mjs"),
  verifyImportSpacing: path.resolve(REPOSITORY_ROOT, "scripts/verify/verify-import-spacing.mjs"),
  verifyJsxChildSpacing: path.resolve(REPOSITORY_ROOT, "scripts/verify/verify-jsx-child-spacing.mjs"),
  verifyModuleConstantNames: path.resolve(REPOSITORY_ROOT, "scripts/verify/verify-module-constant-names.mjs"),
  verifyNoSymbols: path.resolve(REPOSITORY_ROOT, "scripts/verify/verify-no-symbols.mjs"),
  verifyNullishFallback: path.resolve(REPOSITORY_ROOT, "scripts/verify/verify-nullish-fallback.mjs"),
  verifyPdfZoomConstants: path.resolve(REPOSITORY_ROOT, "scripts/verify/verify-pdf-zoom-constants.mjs"),
  verifyShortHexColors: path.resolve(REPOSITORY_ROOT, "scripts/verify/verify-short-hex-colors.mjs"),
  verifySourceConventions: path.resolve(REPOSITORY_ROOT, "scripts/verify/verify-source-conventions.mjs"),
  verifyStrictEquality: path.resolve(REPOSITORY_ROOT, "scripts/verify/verify-strict-equality.mjs"),
  verifyTypeOnlyImports: path.resolve(REPOSITORY_ROOT, "scripts/verify/verify-type-only-imports.mjs"),
};

const runNodeScript = (scriptPath, args = []) => {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: REPOSITORY_ROOT,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`script failed: ${result.error.message}`);
    return 1;
  }

  return result.status ?? 0;
};

const runSourceConventionFixes = () => {
  const statuses = [
    runNodeScript(NODE_SCRIPT_PATHS.fixTypeOnlyImports),
    runNodeScript(NODE_SCRIPT_PATHS.fixConstArrowFunctions),
    runNodeScript(NODE_SCRIPT_PATHS.fixBlankLines),
    runNodeScript(NODE_SCRIPT_PATHS.fixShortHexColors),
    runNodeScript(NODE_SCRIPT_PATHS.fixNullishFallback),
    runNodeScript(NODE_SCRIPT_PATHS.fixStrictEquality),
    runNodeScript(NODE_SCRIPT_PATHS.fixKnownLintErrors),
    runNodeScript(NODE_SCRIPT_PATHS.fixImportSpacing),
    runNodeScript(NODE_SCRIPT_PATHS.fixSourceOrder),
    runNodeScript(NODE_SCRIPT_PATHS.fixImportSpacing),
    runNodeScript(NODE_SCRIPT_PATHS.fixJsxChildSpacing),
    runNodeScript(NODE_SCRIPT_PATHS.fixBlankLines),
  ];

  return statuses.find((status) => status !== 0) ?? 0;
};

const runSourceConventionVerification = () => {
  const statuses = [
    runNodeScript(NODE_SCRIPT_PATHS.verifyNoSymbols),
    runNodeScript(NODE_SCRIPT_PATHS.verifyTypeOnlyImports),
    runNodeScript(NODE_SCRIPT_PATHS.verifyImportSpacing),
    runNodeScript(NODE_SCRIPT_PATHS.verifyBlankLines),
    runNodeScript(NODE_SCRIPT_PATHS.verifyShortHexColors),
    runNodeScript(NODE_SCRIPT_PATHS.verifyNullishFallback),
    runNodeScript(NODE_SCRIPT_PATHS.verifyStrictEquality),
    runNodeScript(NODE_SCRIPT_PATHS.verifySourceConventions),
    runNodeScript(NODE_SCRIPT_PATHS.verifyJsxChildSpacing),
    runNodeScript(NODE_SCRIPT_PATHS.verifyConstArrowFunctions),
    runNodeScript(NODE_SCRIPT_PATHS.verifyPdfZoomConstants),
    runNodeScript(NODE_SCRIPT_PATHS.verifyModuleConstantNames),
  ];

  return statuses.find((status) => status !== 0) ?? 0;
};

const firstFixStatus = runSourceConventionFixes();
const lintStatus = runNodeScript(NODE_SCRIPT_PATHS.lintEslintJa, ["--fix"]);
const finalFixStatus = runSourceConventionFixes();
const verifyStatus = runSourceConventionVerification();

process.exitCode = [firstFixStatus, lintStatus, finalFixStatus, verifyStatus].find((status) => status !== 0) ?? 0;
