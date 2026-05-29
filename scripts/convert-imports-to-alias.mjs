import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";

const projectRoot = process.cwd();
const sourceExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const resolvableExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css", ".scss", ".sass", ".less"];
const importPatterns = [
  /(from\s+["'])(\.{1,2}\/[^"']+)(["'])/g,
  /(import\s+["'])(\.{1,2}\/[^"']+)(["'])/g,
  /(import\s*\(\s*["'])(\.{1,2}\/[^"']+)(["']\s*\))/g,
];

const aliasRoots = [
  { dir: path.join(projectRoot, "src"), prefix: "@" },
  { dir: path.join(projectRoot, "constants"), prefix: "@constants" },
];

const files = fg.sync(["**/*.{ts,tsx,js,jsx,mjs,cjs}"], {
  cwd: projectRoot,
  absolute: true,
  ignore: [
    "**/*.d.ts",
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/lib/**",
    "**/coverage/**",
    "**/.firebase/**",
    "**/.git/**",
  ],
});

const normalizePath = (filePath) => filePath.replace(/\\/g, "/");

const isInsideDir = (filePath, dirPath) => {
  const relativePath = path.relative(dirPath, filePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
};

const hasKnownSourceExtension = (modulePath) => sourceExtensions.some((extension) => modulePath.endsWith(extension));

const stripKnownSourceExtension = (modulePath) => {
  for (const extension of sourceExtensions) {
    if (modulePath.endsWith(extension)) return modulePath.slice(0, -extension.length);
  }
  return modulePath;
};

const stripTrailingIndex = (modulePath) => modulePath.endsWith("/index") ? modulePath.slice(0, -"/index".length) : modulePath;

const fileExists = (filePath) => {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
};

const resolveExistingModulePath = (importerDir, spec) => {
  const basePath = path.resolve(importerDir, spec);

  if (fileExists(basePath)) return basePath;

  for (const extension of resolvableExtensions) {
    if (fileExists(`${basePath}${extension}`)) return `${basePath}${extension}`;
  }

  for (const extension of resolvableExtensions) {
    const indexPath = path.join(basePath, `index${extension}`);
    if (fileExists(indexPath)) return indexPath;
  }

  return null;
};

const findAliasRoot = (targetFilePath) => aliasRoots.find(({ dir }) => isInsideDir(targetFilePath, dir));

const toSameDirRelative = (importerDir, targetFilePath, originalSpec) => {
  const originalHadSourceExtension = hasKnownSourceExtension(originalSpec);
  const relativeFromImporter = normalizePath(path.relative(importerDir, targetFilePath));
  const modulePath = originalHadSourceExtension ? relativeFromImporter : stripTrailingIndex(stripKnownSourceExtension(relativeFromImporter));
  return modulePath.startsWith(".") ? modulePath : `./${modulePath}`;
};

const toAliasPath = (targetFilePath, aliasRoot, originalSpec) => {
  const originalHadSourceExtension = hasKnownSourceExtension(originalSpec);
  const relativeFromRoot = normalizePath(path.relative(aliasRoot.dir, targetFilePath));
  const modulePath = originalHadSourceExtension ? relativeFromRoot : stripTrailingIndex(stripKnownSourceExtension(relativeFromRoot));
  return `${aliasRoot.prefix}/${modulePath}`;
};

const normalizeSpecifier = (importerDir, spec) => {
  const targetFilePath = resolveExistingModulePath(importerDir, spec);
  if (!targetFilePath) return spec;

  const targetDir = path.dirname(targetFilePath);
  if (targetDir === importerDir) return toSameDirRelative(importerDir, targetFilePath, spec);

  const aliasRoot = findAliasRoot(targetFilePath);
  if (!aliasRoot) return spec;

  return toAliasPath(targetFilePath, aliasRoot, spec);
};

let changedFileCount = 0;

for (const filePath of files) {
  const importerDir = path.dirname(filePath);
  const originalContent = fs.readFileSync(filePath, "utf8");
  let nextContent = originalContent;

  for (const pattern of importPatterns) {
    nextContent = nextContent.replace(pattern, (match, prefix, spec, suffix) => {
      const nextSpec = normalizeSpecifier(importerDir, spec);
      return nextSpec === spec ? match : `${prefix}${nextSpec}${suffix}`;
    });
  }

  if (nextContent !== originalContent) {
    fs.writeFileSync(filePath, nextContent);
    changedFileCount += 1;
  }
}

console.log(`Done: normalized import paths in ${changedFileCount} file(s). Same-directory imports use ./, cross-directory imports use aliases.`);
