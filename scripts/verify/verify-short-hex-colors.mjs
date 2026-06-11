import { readFileSync } from "node:fs";
import { getRelativePath, getShortHexColorViolations, getTextFiles } from "./short-hex-colors.mjs";

const violations = getTextFiles().flatMap((filePath) => {
  const source = readFileSync(filePath, "utf8");

  return getShortHexColorViolations(filePath, source);
});

if (violations.length > 0) {
  console.error("省略可能な hex color 表記の違反:");
  for (const violation of violations) {
    console.error(`- ${getRelativePath(violation.filePath)}:${violation.line}:${violation.column} ${violation.literal} は ${violation.replacement} に省略してください。`);
  }
  process.exitCode = 1;
}
