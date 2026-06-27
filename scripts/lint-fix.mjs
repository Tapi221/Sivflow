import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "..");
const CHECK_ONLY_ARGUMENT = "--check-only";
const FIXERS_ONLY_ARGUMENT = "--fixers-only";
const FIXER_SCRIPT_PATHS = [
  path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-type-only-imports.mjs"),
  path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-const-arrow-functions.mjs"),
  path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-tailwind-standard-classes.mjs"),
  path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-short-hex-colors.mjs"),
  path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-nullish-fallback.mjs"),
  path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-strict-equality.mjs"),
  path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-known-lint-errors.mjs"),
  path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-source-order.mjs"),
  path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-import-spacing.mjs"),
  path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-jsx-child-spacing.mjs"),
  path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-repeated-blank-lines.mjs"),
];
const NODE_SCRIPT_PATHS = {
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
  verifyTailwindStandardClasses: path.resolve(REPOSITORY_ROOT, "scripts/verify/verify-tailwind-standard-classes.mjs"),
  verifyTypeOnlyImports: path.resolve(REPOSITORY_ROOT, "scripts/verify/verify-type-only-imports.mjs"),
};
const isCheckOnly = process.argv.includes(CHECK_ONLY_ARGUMENT);
const isFixersOnly = process.argv.includes(FIXERS_ONLY_ARGUMENT);

process.chdir(REPOSITORY_ROOT);

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
const runImportedScript = async (scriptPath) => {
  const previousExitCode = process.exitCode;
  process.exitCode = 0;
  try {
    await import(pathToFileURL(scriptPath).href);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = previousExitCode;
    return 1;
  }
  const status = process.exitCode ?? 0;
  process.exitCode = previousExitCode;
  return status;
};
const runSourceConventionFixes = async () => {
  const statuses = [];
  for (const fixerScriptPath of FIXER_SCRIPT_PATHS) {
    statuses.push(await runImportedScript(fixerScriptPath));
  }
  return statuses.find((status) => status !== 0) ?? 0;
};
const runSourceConventionVerification = () => {
  const statuses = [
    runNodeScript(NODE_SCRIPT_PATHS.verifyNoSymbols),
    runNodeScript(NODE_SCRIPT_PATHS.verifyTypeOnlyImports),
    runNodeScript(NODE_SCRIPT_PATHS.verifyImportSpacing),
    runNodeScript(NODE_SCRIPT_PATHS.verifyBlankLines),
    runNodeScript(NODE_SCRIPT_PATHS.verifyTailwindStandardClasses),
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

const fixStatus = isCheckOnly ? 0 : await runSourceConventionFixes();
if (isFixersOnly) {
  process.exitCode = fixStatus;
} else {
  const lintStatus = runNodeScript(
    NODE_SCRIPT_PATHS.lintEslintJa,
    isCheckOnly ? [] : ["--fix"]
  );
  const verifyStatus = runSourceConventionVerification();
  process.exitCode = [fixStatus, lintStatus, verifyStatus].find((status) => status !== 0) ?? 0;
}
