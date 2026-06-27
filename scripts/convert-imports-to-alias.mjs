import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";

const projectRoot = process.cwd();
const sourceExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const resolvableExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css", ".scss", ".sass", ".less"];
const importPatterns = [
  /(from\s+["'])(\.{1,2}\/[^"']+|@\/[^"']+|@web\/[^"']+|@core\/[^"']+|@platform\/[^"']+|@web-renderer\/[^"']+|@android-renderer\/[^"']+|@android\/[^"']+|@shared\/[^"']+|#src\/[^"']+)(["'])/g,
  /(import\s+["'])(\.{1,2}\/[^"']+|@\/[^"']+|@web\/[^"']+|@core\/[^"']+|@platform\/[^"']+|@web-renderer\/[^"']+|@android-renderer\/[^"']+|@android\/[^"']+|@shared\/[^"']+|#src\/[^"']+)(["'])/g,
  /(import\s*\(\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+|@web\/[^"']+|@core\/[^"']+|@platform\/[^"']+|@web-renderer\/[^"']+|@android-renderer\/[^"']+|@android\/[^"']+|@shared\/[^"']+|#src\/[^"']+)(["']\s*\))/g,
  /(export\s+[^;]*?\s+from\s+["'])(\.{1,2}\/[^"']+|@\/[^"']+|@web\/[^"']+|@core\/[^"']+|@platform\/[^"']+|@web-renderer\/[^"']+|@android-renderer\/[^"']+|@android\/[^"']+|@shared\/[^"']+|#src\/[^"']+)(["'])/g,
];
const aliasRoots = [
  { dir: path.join(projectRoot, "apps/web/src"), prefix: "@web" },
  { dir: path.join(projectRoot, "apps/android/src"), prefix: "@android" },
  { dir: path.join(projectRoot, "packages/core/src"), prefix: "@core" },
  { dir: path.join(projectRoot, "packages/platform/src"), prefix: "@platform" },
  { dir: path.join(projectRoot, "packages/web-renderer/src"), prefix: "@web-renderer" },
  { dir: path.join(projectRoot, "packages/android-renderer/src"), prefix: "@android-renderer" },
  { dir: path.join(projectRoot, "shared"), prefix: "@shared" },
  { dir: path.join(projectRoot, "functions/src"), prefix: "#src" },
  { dir: path.join(projectRoot, "src"), prefix: "@" },
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

const hasKnownExtension = (modulePath) => resolvableExtensions.some((extension) => modulePath.endsWith(extension));

const stripKnownExtension = (modulePath) => {
  for (const extension of resolvableExtensions) {
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

const resolveExistingModulePath = (basePath) => {
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

const findAliasRootByPrefix = (spec) => aliasRoots.find(({ prefix }) => spec.startsWith(`${prefix}/`));

const findAliasRootByFilePath = (targetFilePath) => aliasRoots.find(({ dir }) => isInsideDir(targetFilePath, dir));

const resolveSpecifierPath = (importerDir, spec) => {
  const aliasRoot = findAliasRootByPrefix(spec);
  if (aliasRoot) return resolveExistingModulePath(path.join(aliasRoot.dir, spec.slice(aliasRoot.prefix.length + 1)));
  if (spec.startsWith(".")) return resolveExistingModulePath(path.resolve(importerDir, spec));

  return null;
};

const toAliasSpec = (targetFilePath, aliasRoot, originalSpec) => {
  const originalHadKnownExtension = hasKnownExtension(originalSpec);
  const relativeToRoot = normalizePath(path.relative(aliasRoot.dir, targetFilePath));
  const modulePath = originalHadKnownExtension ? relativeToRoot : stripTrailingIndex(stripKnownExtension(relativeToRoot));

  return `${aliasRoot.prefix}/${modulePath}`;
};

const convertSpecifier = (filePath, spec) => {
  const targetFilePath = resolveSpecifierPath(path.dirname(filePath), spec);
  if (!targetFilePath) return spec;

  const aliasRoot = findAliasRootByFilePath(targetFilePath);
  if (!aliasRoot) return spec;

  return toAliasSpec(targetFilePath, aliasRoot, spec);
};

let changedCount = 0;

for (const file of files) {
  const original = fs.readFileSync(file, "utf8");
  const next = importPatterns.reduce((source, pattern) => source.replace(pattern, (match, prefix, spec, suffix) => {
    const converted = convertSpecifier(file, spec);
    return converted === spec ? match : `${prefix}${converted}${suffix}`;
  }), original);

  if (next !== original) {
    fs.writeFileSync(file, next);
    changedCount += 1;
  }
}

console.log(`${changedCount} 件の import パスを更新しました。`);