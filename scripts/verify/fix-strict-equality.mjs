import { readFileSync, writeFileSync } from "node:fs";
import { getRelativePath, getSourceFiles, normalizeStrictEqualities } from "./strict-equality.mjs";

const changedFiles = [];

for (const filePath of getSourceFiles()) {
  const source = readFileSync(filePath, "utf8");
  const nextSource = normalizeStrictEqualities(filePath, source);
  if (source === nextSource) continue;

  writeFileSync(filePath, nextSource);
  changedFiles.push(getRelativePath(filePath));
}

if (changedFiles.length === 0) {
  console.log("strict equality 規約の修正対象はありません。");
} else {
  console.log(`strict equality 規約を ${changedFiles.length} 件のファイルで修正しました。`);
}
