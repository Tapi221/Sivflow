import { readFileSync } from "node:fs";
import { getRelativePath, getTailwindStandardClassViolations, getTextFiles } from "./tailwind-standard-classes.mjs";

const violations = getTextFiles().flatMap((filePath) => {
  const source = readFileSync(filePath, "utf8");
  return getTailwindStandardClassViolations(filePath, source);
});

if (violations.length > 0) {
  console.error("Tailwind 標準クラス規約違反:");
  for (const violation of violations) {
    console.error(`- ${getRelativePath(violation.filePath)}:${violation.line}:${violation.column} ${violation.message}`);
  }
  process.exitCode = 1;
}
