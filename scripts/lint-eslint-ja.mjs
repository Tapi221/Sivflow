import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "..");
const ESLINT_BIN_PATH = path.resolve(REPOSITORY_ROOT, "node_modules/eslint/bin/eslint.js");
const ESLINT_COMMAND_ARGS = [ESLINT_BIN_PATH, ".", ...process.argv.slice(2), "--format", "json"];
const SHOULD_FIX = process.argv.includes("--fix");
const SOURCE_CONVENTION_FIX_SCRIPT_PATHS = [
  path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-import-spacing.mjs"),
  path.resolve(REPOSITORY_ROOT, "scripts/verify/fix-strict-equality.mjs"),
  path.resolve(REPOSITORY_ROOT, "scripts/fix-src-import-paths.mjs"),
];
const SEVERITY_LABELS = new Map([
  [2, "エラー"],
  [1, "警告"],
]);
const KNOWN_RULE_MESSAGES = new Map([
  ["@typescript-eslint/no-empty-object-type", "`{}` 型は 0 や空文字列などの null/undefined 以外の値も許容します。オブジェクトだけを表したい場合は `object`、任意の値を表したい場合は `unknown` を使ってください。"],
  ["eqeqeq", "等価比較では `==` / `!=` ではなく `===` / `!==` を使ってください。"],
  ["no-empty", "空のブロック文です。処理が不要な場合は理由をコメントで明示してください。"],
  ["no-var", "`var` は使用禁止です。再代入が不要なら `const`、再代入が必要なら `let` を使ってください。"],
  ["prefer-const", "再代入されない `let` は使わず、`const` を使ってください。"],
  ["simple-import-sort/imports", "import の並び順が規約と一致していません。npm run lint:fix で自動修正してください。"],
  ["react-hooks/preserve-manual-memoization", "React Compiler が最適化をスキップしました。手動 memo 化の依存配列が推論結果と一致していません。依存配列を実際に参照している値に合わせてください。"],
]);

const normalizeWhitespace = (value) => value.replace(/\s+/gu, " ").trim();

const toRelativePath = (filePath, cwd) => {
  const relativePath = path.relative(cwd, filePath);
  return relativePath.startsWith("..") ? filePath : relativePath.split(path.sep).join("/");
};

const runSourceConventionFixes = () => {
  if (!SHOULD_FIX) return 0;

  let exitStatus = 0;

  for (const scriptPath of SOURCE_CONVENTION_FIX_SCRIPT_PATHS) {
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: REPOSITORY_ROOT,
      stdio: "inherit",
    });

    if (result.error) {
      console.error(`source 規約の自動修正に失敗しました: ${result.error.message}`);
      exitStatus = 1;
      continue;
    }

    if (result.status && result.status !== 0) exitStatus = result.status;
  }

  return exitStatus;
};

const translateParsingMessage = (message) => {
  const unexpectedCharacterMatch = message.match(/^Parsing error: Unexpected character ['`]?(.+?)['`]?$/u);
  if (unexpectedCharacterMatch) return `構文解析エラー: 予期しない文字 ${unexpectedCharacterMatch[1]} があります。`;

  const unexpectedTokenMatch = message.match(/^Parsing error: Unexpected token (.+)$/u);
  if (unexpectedTokenMatch) return `構文解析エラー: 予期しないトークン ${unexpectedTokenMatch[1]} があります。`;

  if (message.startsWith("Parsing error:")) return `構文解析エラー: ${message.replace(/^Parsing error:\s*/u, "")}`;

  return null;
};

const translateUnusedDisableMessage = (message) => {
  const unusedDisableMatch = message.match(/^Unused eslint-disable directive \(no problems were reported from '(.+)'\)\.?$/u);
  if (!unusedDisableMatch) return null;

  return `不要な eslint-disable 指示です。対象ルール '${unusedDisableMatch[1]}' の違反は検出されていません。`;
};

const translateUnusedImportMessage = (message) => {
  const definedMatch = message.match(/^'(.+)' is defined but never used\.?$/u);
  if (definedMatch) return `\`${definedMatch[1]}\` が定義されていますが使われていません。`;

  const assignedMatch = message.match(/^'(.+)' is assigned a value but never used\./u);
  if (assignedMatch) return `\`${assignedMatch[1]}\` に値が代入されていますが使われていません。使わない変数は削除するか、意図的に未使用なら名前を _ で始めてください。`;

  const argumentMatch = message.match(/^'(.+)' is defined but never used\. Allowed unused args must match/u);
  if (argumentMatch) return `引数 \`${argumentMatch[1]}\` が定義されていますが使われていません。意図的に未使用なら名前を _ で始めてください。`;

  return null;
};

const translateRestrictedPropertyMessage = (message) => {
  const restrictedPropertyMatch = message.match(/^'(.+)' is restricted from being used\. (.+)$/u);
  if (!restrictedPropertyMatch) return null;

  return `\`${restrictedPropertyMatch[1]}\` は使用禁止です。${translateKnownCustomMessage(restrictedPropertyMatch[2])}`;
};

const translateKnownCustomMessage = (message) => {
  const customMessages = new Map([
    ["Use '@/types/core/branded' instead.", "代わりに '@/types/core/branded' を使ってください。"],
    ["Do not add new imports from '@/utils'. Use domain/shared modules instead.", "'@/utils' からの新規 import は禁止です。domain/shared module を使ってください。"],
    ["Do not import from @constants. Move values to their responsibility module.", "@constants から import しないでください。値は責務を持つ module に移してください。"],
    ["Use an alias for cross-folder imports. Same-directory imports may use ./.", "階層をまたぐ import には alias を使ってください。同一階層だけ ./ を使えます。"],
    ["Use an alias for child-folder imports. Same-directory imports may use ./.", "子階層への import には alias を使ってください。同一階層だけ ./ を使えます。"],
    ["Use an alias for cross-folder exports. Same-directory exports may use ./.", "階層をまたぐ export には alias を使ってください。同一階層だけ ./ を使えます。"],
    ["Use an alias for child-folder exports. Same-directory exports may use ./.", "子階層への export には alias を使ってください。同一階層だけ ./ を使えます。"],
    ["UI layer must not import infrastructure.", "UI layer から infrastructure を import しないでください。"],
    ["UI layer must not import desktop bridge.", "UI layer から desktop bridge を import しないでください。"],
    ["Application layer must not import UI or React layers.", "Application layer から UI または React layer を import しないでください。"],
    ["Do not read card.folderId directly. Use resolver.", "card.folderId を直接読まないでください。resolver を使ってください。"],
  ]);

  return customMessages.get(message) ?? message;
};

const translateReactCompilerMessage = (message) => {
  if (!message.startsWith("Compilation Skipped:")) return null;

  const inferredDependencyMatch = message.match(/The inferred dependency was `([^`]+)`/u);
  const dependencySuffix = inferredDependencyMatch ? ` 推論された依存: \`${inferredDependencyMatch[1]}\`。` : "";

  return `${KNOWN_RULE_MESSAGES.get("react-hooks/preserve-manual-memoization")}${dependencySuffix}`;
};

const translateReactHooksDepsMessage = (message, ruleId) => {
  if (ruleId !== "react-hooks/exhaustive-deps") return null;

  const missingSingleMatch = message.match(/^React Hook (.+) has a missing dependency: '(.+)'\. Either include it or remove the dependency array\.$/u);
  if (missingSingleMatch) return `React Hook ${missingSingleMatch[1]} の依存配列に \`${missingSingleMatch[2]}\` が不足しています。依存配列へ追加するか、依存配列を削除してください。`;

  const missingMultipleMatch = message.match(/^React Hook (.+) has missing dependencies: (.+)\. Either include them or remove the dependency array\.$/u);
  if (missingMultipleMatch) return `React Hook ${missingMultipleMatch[1]} の依存配列に ${missingMultipleMatch[2]} が不足しています。依存配列へ追加するか、依存配列を削除してください。`;

  const unnecessarySingleMatch = message.match(/^React Hook (.+) has an unnecessary dependency: '(.+)'\. Either exclude it or remove the dependency array\.$/u);
  if (unnecessarySingleMatch) return `React Hook ${unnecessarySingleMatch[1]} の依存配列に不要な \`${unnecessarySingleMatch[2]}\` が含まれています。依存配列から除外するか、依存配列を削除してください。`;

  const unnecessaryMultipleMatch = message.match(/^React Hook (.+) has unnecessary dependencies: (.+)\. Either exclude them or remove the dependency array\.$/u);
  if (unnecessaryMultipleMatch) return `React Hook ${unnecessaryMultipleMatch[1]} の依存配列に不要な ${unnecessaryMultipleMatch[2]} が含まれています。依存配列から除外するか、依存配列を削除してください。`;

  const refCleanupMatch = message.match(/^The ref value '(.+)' will likely have changed by the time this effect cleanup function runs\. If this ref points to a node rendered by React, copy '(.+)' to a variable inside the effect, and use that variable in the cleanup function\.$/u);
  if (refCleanupMatch) return `effect の cleanup 実行時には ref 値 \`${refCleanupMatch[1]}\` が変わっている可能性があります。effect 内で変数にコピーし、cleanup ではその変数を使ってください。`;

  return "React Hook の依存配列が実際に参照している値と一致していません。依存配列を修正してください。";
};

const translateConstantBinaryExpressionMessage = (message, ruleId) => {
  if (ruleId !== "no-constant-binary-expression") return null;

  if (message === "Unexpected constant nullishness on the left-hand side of a `??` expression.") return "`??` の左辺が常に nullish 判定として固定されています。不要な `??` を削除するか、式を見直してください。";
  if (message === "Unexpected constant truthiness on the left-hand side of a `||` expression.") return "`||` の左辺が常に truthy と判定されます。不要な `||` を削除するか、式を見直してください。";
  if (message === "Unexpected constant truthiness on the left-hand side of a `&&` expression.") return "`&&` の左辺が常に truthy と判定されます。不要な `&&` を削除するか、式を見直してください。";
  if (message === "Unexpected constant truthiness on the left-hand side of a logical expression.") return "論理式の左辺が常に truthy と判定されます。不要な論理式を削除するか、式を見直してください。";

  return "常に同じ結果になる二項式です。不要な演算を削除するか、式を見直してください。";
};

export const translateLintMessage = (message, ruleId = null) => {
  const normalizedMessage = normalizeWhitespace(message);

  return translateParsingMessage(normalizedMessage)
    ?? translateUnusedDisableMessage(normalizedMessage)
    ?? translateUnusedImportMessage(normalizedMessage)
    ?? translateRestrictedPropertyMessage(normalizedMessage)
    ?? translateReactCompilerMessage(normalizedMessage)
    ?? translateReactHooksDepsMessage(normalizedMessage, ruleId)
    ?? translateConstantBinaryExpressionMessage(normalizedMessage, ruleId)
    ?? KNOWN_RULE_MESSAGES.get(ruleId)
    ?? translateKnownCustomMessage(normalizedMessage)
    ?? `未翻訳の lint メッセージです。原文: ${normalizedMessage}`;
};

const formatPosition = (message) => {
  if (message.line && message.column) return `${message.line}:${message.column}`;
  if (message.line) return `${message.line}`;
  return "-";
};

const formatMessage = (message) => {
  const severityLabel = SEVERITY_LABELS.get(message.severity) ?? "情報";
  const ruleLabel = message.ruleId ? `  ${message.ruleId}` : "";

  return `  ${formatPosition(message)}  ${severityLabel}  ${translateLintMessage(message.message, message.ruleId)}${ruleLabel}`;
};

export const formatEslintResults = (results, options = {}) => {
  const cwd = options.cwd ?? process.cwd();
  const lines = [];
  let errorCount = 0;
  let warningCount = 0;
  let fixableErrorCount = 0;
  let fixableWarningCount = 0;

  for (const result of results) {
    const messages = result.messages ?? [];
    if (messages.length === 0) continue;

    errorCount += result.errorCount ?? messages.filter((message) => message.severity === 2).length;
    warningCount += result.warningCount ?? messages.filter((message) => message.severity === 1).length;
    fixableErrorCount += result.fixableErrorCount ?? messages.filter((message) => message.severity === 2 && message.fix).length;
    fixableWarningCount += result.fixableWarningCount ?? messages.filter((message) => message.severity === 1 && message.fix).length;

    lines.push(toRelativePath(result.filePath, cwd));
    lines.push(...messages.map(formatMessage));
    lines.push("");
  }

  if (errorCount === 0 && warningCount === 0) return "ESLint の問題はありません。";

  lines.push(`✖ ${errorCount + warningCount} 件の問題があります（エラー ${errorCount} 件、警告 ${warningCount} 件）。`);

  const fixableCount = fixableErrorCount + fixableWarningCount;
  if (fixableCount > 0) lines.push(`  ${fixableCount} 件（エラー ${fixableErrorCount} 件、警告 ${fixableWarningCount} 件）は npm run lint:fix で自動修正できる可能性があります。`);

  return lines.join("\n").trimEnd();
};

const parseEslintJson = (stdout) => {
  const trimmedStdout = stdout.trim();
  const jsonStartIndex = trimmedStdout.indexOf("[");
  if (jsonStartIndex === -1) return null;

  try {
    return JSON.parse(trimmedStdout.slice(jsonStartIndex));
  } catch {
    return null;
  }
};

const getExitCode = (primaryStatus, fallbackStatus) => primaryStatus && primaryStatus !== 0 ? primaryStatus : fallbackStatus;

const runLint = () => {
  const lintResult = spawnSync(process.execPath, ESLINT_COMMAND_ARGS, {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 64,
  });

  if (lintResult.error) {
    console.error(`ESLint の実行に失敗しました: ${lintResult.error.message}`);
    process.exitCode = getExitCode(1, runSourceConventionFixes());
    return;
  }

  const parsedResults = parseEslintJson(lintResult.stdout ?? "");
  if (!parsedResults) {
    console.error("ESLint の JSON 出力を解析できませんでした。");
    if (lintResult.stdout) console.error(lintResult.stdout.trimEnd());
    if (lintResult.stderr) console.error(lintResult.stderr.trimEnd());
    process.exitCode = getExitCode(lintResult.status ?? 1, runSourceConventionFixes());
    return;
  }

  console.log(formatEslintResults(parsedResults, { cwd: REPOSITORY_ROOT }));
  if (lintResult.stderr) console.error(lintResult.stderr.trimEnd());
  process.exitCode = getExitCode(lintResult.status ?? 0, runSourceConventionFixes());
};

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) runLint();
