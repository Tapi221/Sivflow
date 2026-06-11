import { spawnSync } from "node:child_process";

const VERIFY_COMMANDS = [
  ["node", ["scripts/verify/verify-source-conventions.mjs"]],
  ["node", ["scripts/verify/verify-const-arrow-functions.mjs"]],
  ["node", ["scripts/verify/verify-pdf-zoom-constants.mjs"]],
  ["node", ["scripts/verify/verify-module-constant-names.mjs"]],
];
const ORDER_LABEL_TRANSLATIONS = {
  import: "import",
  "type definition": "型定義",
  constant: "定数",
  "helper function": "helper 関数",
  "component body": "component 本体",
  "memo / displayName / export": "memo / displayName / export",
};

const translateOrderLabel = (label) => ORDER_LABEL_TRANSLATIONS[label] ?? label;

const translateVerifyOutput = (output) => output
  .replaceAll("Source convention violations:", "ソース規約違反:")
  .replaceAll("Const arrow function violations:", "const arrow 関数規約違反:")
  .replaceAll("PDF zoom constant violations:", "PDF ズーム定数規約違反:")
  .replaceAll("Module constant naming violations:", "module 定数命名規約違反:")
  .replace(/Use an alias for cross-folder imports instead of ([^\.]+(?:\.[^\n]*)?)\./g, "同一階層以外の import では $1 ではなくエイリアスを使ってください。")
  .replace(/Use an alias for child-folder imports instead of ([^\.]+(?:\.[^\n]*)?)\./g, "子階層への import では $1 ではなくエイリアスを使ってください。")
  .replace(/Use a same-directory relative import instead of ([^\.]+(?:\.[^\n]*)?)\./g, "同一階層の import では $1 ではなく相対パスを使ってください。")
  .replaceAll("Do not import from @constants. Move values to their responsibility module.", "@constants から import しないでください。値は責務を持つ module に移動してください。")
  .replaceAll("Keep each import/export-from declaration on one line.", "各 import/export-from 宣言は1行にまとめてください。")
  .replace(/Move (.+?) before (.+?): ([^\n]+)/g, (_, category, previousCategory, preview) => `${translateOrderLabel(category)} を ${translateOrderLabel(previousCategory)} より前に移動してください: ${preview}`)
  .replace(/Put exactly one blank line between (.+?) and (.+?) blocks\./g, (_, previousCategory, category) => `${translateOrderLabel(previousCategory)} と ${translateOrderLabel(category)} のブロック間は空行1行だけにしてください。`)
  .replaceAll("Use <>...</> instead of explicit Fragment. Explicit Fragment is only allowed with key inside map.", "明示的な Fragment ではなく <>...</> を使ってください。明示的な Fragment は map 内で key が必要な場合だけ許可します。")
  .replaceAll("Do not wrap a single child in <>...</>. Return the child directly.", "単一の子要素を <>...</> で包まないでください。子要素をそのまま返してください。")
  .replaceAll("Do not use a div only as a wrapper. Use <>...</> unless a real DOM node is needed.", "ラッパーだけの div を使わないでください。実 DOM が必要ない場合は <>...</> を使ってください。")
  .replaceAll("Use a const arrow function instead of function syntax.", "function 構文ではなく const arrow 関数を使ってください。")
  .replace(/Move ([A-Z0-9_]+) to ([^\.]+(?:\.[^\n]*)?)\./g, "$1 は $2 に移動してください。")
  .replace(/Use ([A-Z0-9_]+) from ([^\.]+(?:\.[^\n]*)?) instead of local ([A-Z0-9_]+)\./g, "ローカルの $3 ではなく $2 の $1 を使ってください。")
  .replace(/Missing shared PDF zoom constant definition: ([A-Z0-9_]+)\./g, "共有 PDF ズーム定数 $1 の定義がありません。")
  .replace(/Missing shared PDF zoom constant export: ([A-Z0-9_]+)\./g, "共有 PDF ズーム定数 $1 の export がありません。")
  .replace(/Module-scope constants must use UPPER_SNAKE_CASE: ([^\n]+)/g, "module scope の定数は UPPER_SNAKE_CASE にしてください: $1");

const writeTranslatedOutput = (output, writer) => {
  if (!output) return;

  writer.write(translateVerifyOutput(output));
};

let hasFailure = false;

for (const [command, args] of VERIFY_COMMANDS) {
  const result = spawnSync(command, args, { cwd: process.cwd(), encoding: "utf8", shell: process.platform === "win32" });
  writeTranslatedOutput(result.stdout, process.stdout);
  writeTranslatedOutput(result.stderr, process.stderr);

  if (result.error) {
    hasFailure = true;
    console.error(`検証コマンドの実行に失敗しました: ${result.error.message}`);
    continue;
  }

  if (result.status !== 0) hasFailure = true;
}

if (hasFailure) process.exitCode = 1;
