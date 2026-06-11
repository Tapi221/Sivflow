import { readFileSync } from "node:fs";
import { getRelativePath, getSourceFiles, getStrictEqualityViolations } from "./strict-equality.mjs";

const violations = getSourceFiles().flatMap((filePath) => getStrictEqualityViolations(filePath, readFileSync(filePath, "utf8")));

if (violations.length > 0) {
  console.error("strict equality 規約違反:");
  for (const violation of violations) {
    console.error(`- ${getRelativePath(violation.filePath)}:${violation.line} ${violation.message}`);
  }
  process.exitCode = 1;
}
