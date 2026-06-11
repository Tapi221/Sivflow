import { readFileSync, writeFileSync } from "node:fs";
import { getRelativePath, getSourceFiles, normalizeNullishFallbacks } from "./nullish-fallback.mjs";

const changedFiles = [];

for (const filePath of getSourceFiles()) {
  const source = readFileSync(filePath, "utf8");
  const nextSource = normalizeNullishFallbacks(filePath, source);
  if (source === nextSource) continue;

  writeFileSync(filePath, nextSource);
  changedFiles.push(getRelativePath(filePath));
}

if (changedFiles.length === 0) {
  console.log("nullish fallback 規約の修正対象はありません。");
} else {
  console.log(`nullish fallback 規約を ${changedFiles.length} 件のファイルで修正しました。`);
}
