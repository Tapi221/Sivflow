import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";

const projectRoot = process.cwd();
const sourceGlobs = ["src/**/*.{ts,tsx}", "apps/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"];
const ignoredGlobs = ["**/node_modules/**", "**/dist/**", "**/build/**", "**/coverage/**", "**/.git/**"];

const replacements = new Map([
  ["@constants/web/flashcard", "@/components/card/blocks/code/codeBlock.constants"],
  ["@constants/web/flashcard/codeBlock", "@/components/card/blocks/code/codeBlock.constants"],
]);

const importPattern = /from\s+(["'])(@constants\/web\/flashcard(?:\/codeBlock)?)\1/g;
const sideEffectImportPattern = /import\s+(["'])(@constants\/web\/flashcard(?:\/codeBlock)?)\1/g;

const rewriteWebFlashcardConstantsImports = (source) => source
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
  const nextSource = rewriteWebFlashcardConstantsImports(source);

  if (nextSource === source) continue;

  fs.writeFileSync(filePath, nextSource);
  changedCount += 1;
}

if (changedCount > 0) {
  console.log(`Rewrote @constants/web/flashcard imports in ${changedCount} file(s).`);
}
