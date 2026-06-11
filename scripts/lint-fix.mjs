import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "..");
const NODE_SCRIPT_PATHS = {
  fixConstArrowFunctions: path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-const-arrow-functions.mjs"),
  fixImportPaths: path.resolve(REPOSITORY_ROOT, "scripts/fix-src-import-paths.mjs"),
  fixImportSpacing: path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-import-spacing.mjs"),
  fixSourceOrder: path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-source-order.mjs"),
  fixTypeOnlyImports: path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-type-only-imports.mjs"),
  lintEslintJa: path.resolve(REPOSITORY_ROOT, "scripts/lint-eslint-ja.mjs"),
  verifyConstArrowFunctions: path.resolve(REPOSITORY_ROOT, "scripts/verify/verify-const-arrow-functions.mjs"),
  verifyImportSpacing: path.resolve(REPOSITORY_ROOT, "scripts/verify/verify-import-spacing.mjs"),
  verifyModuleConstantNames: path.resolve(REPOSITORY_ROOT, "scripts/verify/verify-module-constant-names.mjs"),
  verifyNoSymbols: path.resolve(REPOSITORY_ROOT, "scripts/verify/verify-no-symbols.mjs"),
  verifyPdfZoomConstants: path.resolve(REPOSITORY_ROOT, "scripts/verify/verify-pdf-zoom-constants.mjs"),
  verifySourceConventions: path.resolve(REPOSITORY_ROOT, "scripts/verify/verify-source-conventions.mjs"),
  verifyTypeOnlyImports: path.resolve(REPOSITORY_ROOT, "scripts/verify/verify-type-only-imports.mjs"),
};

const runNodeScript = (scriptPath, args = []) => {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: REPOSITORY_ROOT,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`script の実行に失敗しました: ${result.error.message}`);
    return 1;
  }

  return result.status ?? 0;
};

const runSourceConventionFixes = () => {
  const typeOnlyImportStatus = runNodeScript(NODE_SCRIPT_PATHS.fixTypeOnlyImports);
  const constArrowFunctionStatus = runNodeScript(NODE_SCRIPT_PATHS.fixConstArrowFunctions);
  const sourceOrderStatus = runNodeScript(NODE_SCRIPT_PATHS.fixSourceOrder);
  const importPathStatus = runNodeScript(NODE_SCRIPT_PATHS.fixImportPaths);
  const importSpacingStatus = runNodeScript(NODE_SCRIPT_PATHS.fixImportSpacing);

  return [typeOnlyImportStatus, constArrowFunctionStatus, sourceOrderStatus, importPathStatus, importSpacingStatus].find((status) => status !== 0) ?? 0;
};

const runSourceConventionVerification = () => {
  const statuses = [
    runNodeScript(NODE_SCRIPT_PATHS.verifyNoSymbols),
    runNodeScript(NODE_SCRIPT_PATHS.verifyTypeOnlyImports),
    runNodeScript(NODE_SCRIPT_PATHS.verifyImportSpacing),
    runNodeScript(NODE_SCRIPT_PATHS.verifySourceConventions),
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
