import { readFileSync, writeFileSync } from "node:fs";
import { getRelativePath, getTextFiles, normalizeTailwindStandardClasses } from "./tailwind-standard-classes.mjs";

const changedFiles = [];

for (const filePath of getTextFiles()) {
  const source = readFileSync(filePath, "utf8");
  const nextSource = normalizeTailwindStandardClasses(source);
  if (source === nextSource) continue;
  writeFileSync(filePath, nextSource);
  changedFiles.push(getRelativePath(filePath));
}

if (changedFiles.length === 0) {
  console.log("Tailwind 任意値クラスの標準化対象はありません。");
} else {
  console.log(`Tailwind 任意値クラスを ${changedFiles.length} 件のファイルで標準クラスへ寄せました。`);
}
