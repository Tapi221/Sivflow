import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";

const projectRoot = process.cwd();
const sourceGlobs = ["src/**/*.{ts,tsx}", "apps/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"];
const ignoredGlobs = ["**/node_modules/**", "**/dist/**", "**/build/**", "**/coverage/**", "**/.git/**"];

const replacements = new Map([
  ["@constants/shared/storage", "@platform/storage/storageKeys.constants"],
  ["@constants/shared/storage/storageKeys", "@platform/storage/storageKeys.constants"],
  ["@constants/web/storage", "@platform/storage/webStorageKeys.constants"],
  ["@constants/web/storage/storageKeys", "@platform/storage/webStorageKeys.constants"],
]);

const importPattern = /from\s+(["'])(@constants\/(?:shared|web)\/storage(?:\/storageKeys)?)\1/g;
const sideEffectImportPattern = /import\s+(["'])(@constants\/(?:shared|web)\/storage(?:\/storageKeys)?)\1/g;

const rewriteStorageConstantsImports = (source) => source
  .replace(importPattern, (match, quote, specifier) => {
    const replacement = replacements.get(specifier);
    return replacement ? `from ${quote}${replacement}${quote}` : match;
  })
  .replace(sideEffectImportPattern, (match, quote, specifier) => {
    const replacement = replacements.get(specifier);
    return replacement ? `import ${quote}${replacement}${quote}` : match;
  });

const files = await fg(sourceGlobs, { cwd: projectRoot, absolute: true, ignore: ignoredGlobs });
let changedCount = 0;

for (const filePath of files) {
  const source = fs.readFileSync(filePath, "utf8");
  const nextSource = rewriteStorageConstantsImports(source);

  if (nextSource === source) continue;

  fs.writeFileSync(filePath, nextSource);
  changedCount += 1;
}

if (changedCount > 0) {
  console.log(`Rewrote @constants storage imports in ${changedCount} file(s).`);
}
