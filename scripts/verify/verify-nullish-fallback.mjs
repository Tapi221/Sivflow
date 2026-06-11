import { readFileSync } from "node:fs";
import { getNullishFallbackViolations, getRelativePath, getSourceFiles } from "./nullish-fallback.mjs";

const violations = getSourceFiles().flatMap((filePath) => {
  const source = readFileSync(filePath, "utf8");

  return getNullishFallbackViolations(filePath, source);
});

if (violations.length > 0) {
  console.error("nullish fallback 規約違反:");
  for (const violation of violations) {
    console.error(`- ${getRelativePath(violation.filePath)}:${violation.line} ${violation.message}`);
  }
  process.exitCode = 1;
}
