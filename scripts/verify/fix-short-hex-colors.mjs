import { readFileSync, writeFileSync } from "node:fs";
import { getRelativePath, getTextFiles, normalizeShortHexColors } from "./short-hex-colors.mjs";

const changedFiles = [];

for (const filePath of getTextFiles()) {
  const source = readFileSync(filePath, "utf8");
  const nextSource = normalizeShortHexColors(source);
  if (source === nextSource) continue;

  writeFileSync(filePath, nextSource);
  changedFiles.push(getRelativePath(filePath));
}

if (changedFiles.length === 0) {
  console.log("省略可能な hex color 表記の修正対象はありません。");
} else {
  console.log(`省略可能な hex color 表記を ${changedFiles.length} 件のファイルで修正しました。`);
}
