import path from "node:path";
import fg from "fast-glob";
import { Project } from "ts-morph";

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, "src");
const sourceFileExtensions = /\.(?:c|m)?(?:j|t)sx?$/;

const project = new Project({ tsConfigFilePath: path.join(projectRoot, "tsconfig.app.json") });

const files = fg.sync(["src/**/*.{ts,tsx,js,jsx}"], { cwd: projectRoot, absolute: true, ignore: ["**/*.d.ts"] });

const normalizePath = (filePath) => filePath.replace(/\\/g, "/");

const isInsideDir = (filePath, dirPath) => {
  const relativePath = path.relative(dirPath, filePath);
  return Boolean(relativePath) && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
};

const stripSourceExtension = (filePath) => filePath.replace(sourceFileExtensions, "");

const stripTrailingIndex = (modulePath) => modulePath.endsWith("/index") ? modulePath.slice(0, -"/index".length) : modulePath;

const toSrcAlias = (targetFilePath) => {
  const relativeFromSrc = normalizePath(path.relative(srcRoot, targetFilePath));
  return `@/${stripTrailingIndex(stripSourceExtension(relativeFromSrc))}`;
};

const toSameDirRelative = (importerDir, targetFilePath) => {
  const relativeFromImporter = normalizePath(path.relative(importerDir, targetFilePath));
  const modulePath = stripTrailingIndex(stripSourceExtension(relativeFromImporter));
  return modulePath.startsWith(".") ? modulePath : `./${modulePath}`;
};

const getFallbackTargetPath = (importerDir, spec) => {
  if (spec.startsWith("@/")) return path.join(srcRoot, spec.slice(2));
  if (spec.startsWith(".")) return path.resolve(importerDir, spec);
  return null;
};

const updateModuleSpecifier = (decl, importerDir) => {
  const spec = decl.getModuleSpecifierValue();
  if (!spec.startsWith(".") && !spec.startsWith("@/")) return false;

  const sourceFile = decl.getModuleSpecifierSourceFile();
  const targetPath = sourceFile?.getFilePath() ?? getFallbackTargetPath(importerDir, spec);
  if (!targetPath || !isInsideDir(targetPath, srcRoot)) return false;

  const targetDir = path.dirname(targetPath);
  const nextSpec = targetDir === importerDir ? toSameDirRelative(importerDir, targetPath) : toSrcAlias(targetPath);
  if (nextSpec === spec) return false;

  decl.setModuleSpecifier(nextSpec);
  return true;
};

for (const filePath of files) {
  const sourceFile = project.getSourceFile(filePath) ?? project.addSourceFileAtPath(filePath);
  const importerDir = path.dirname(filePath);
  let changed = false;

  for (const decl of sourceFile.getImportDeclarations()) changed = updateModuleSpecifier(decl, importerDir) || changed;
  for (const decl of sourceFile.getExportDeclarations()) changed = updateModuleSpecifier(decl, importerDir) || changed;

  if (changed) await sourceFile.save();
}

console.log("Done: normalized src import paths. Same directory uses ./, cross-directory uses @/.");
