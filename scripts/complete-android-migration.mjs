import { existsSync } from "node:fs";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");
const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".gradle",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".kt",
  ".md",
  ".mjs",
  ".plist",
  ".properties",
  ".swift",
  ".ts",
  ".tsx",
  ".xml",
  ".yml",
  ".yaml",
]);
const IGNORE_DIR_NAMES = new Set([
  ".git",
  ".expo",
  ".turbo",
  ".vite",
  "build",
  "dist",
  "node_modules",
]);
const LEGACY_ANDROID_PATHS = [
  "apps/android",
  "packages/android-renderer",
];
const LEGACY_IOS_PATH_PATTERNS = [
  /(^|\/)ios($|\/)/,
  /(^|\/)ioscalendar($|\/)/i,
  /(^|\/)ipad($|\/)/i,
  /PencilKit/i,
  /Handwriting/i,
];
const MOVE_DIRECTORIES = [
  {
    from: "apps/android",
    to: "apps/android",
  },
  {
    from: "packages/android-renderer",
    to: "packages/android-renderer",
  },
];
const REPLACEMENTS = [
  ["apps/android", "apps/android"],
  ["packages/android-renderer", "packages/android-renderer"],
  ["@android-renderer/", "@android-renderer/"],
  ["@android-renderer/*", "@android-renderer/*"],
  ["@android-renderer", "@android-renderer"],
  ["@android/", "@android/"],
  ["@android/*", "@android/*"],
  ["@android", "@android"],
  ["sivflow-android", "sivflow-android"],
  ["android-renderer", "android-renderer"],
  ["dev:mobile", "dev:android"],
  ["mobile:android", "android"],
  ["mobile:ios", "ios"],
];
const FORBIDDEN_CONTENT_PATTERNS = [
  "apps/android",
  "packages/android-renderer",
  "@android-renderer",
  "@android/",
  "@android/*",
  "sivflow-android",
  "mobile:android",
  "mobile:ios",
  "dev:mobile",
];
const REQUIRED_PATHS = [
  "apps/android/package.json",
  "apps/android/app.json",
  "apps/android/index.ts",
  "apps/android/tsconfig.json",
  "packages/android-renderer/package.json",
  "packages/android-renderer/src/App.tsx",
];
const report = {
  moved: [],
  removed: [],
  changed: [],
  skipped: [],
  forbidden: [],
  missingRequired: [],
};

const toAbsolutePath = (relativePath) => path.join(ROOT, relativePath);
const toPosixPath = (targetPath) => targetPath.split(path.sep).join("/");
const isIgnoredDirectory = (name) => IGNORE_DIR_NAMES.has(name);
const isTextFile = (targetPath) => TEXT_EXTENSIONS.has(path.extname(targetPath));
const isLegacyIosPath = (relativePath) => LEGACY_IOS_PATH_PATTERNS.some((pattern) => pattern.test(relativePath));
const pathExists = async (targetPath) => existsSync(targetPath);
const collectFiles = async (directoryPath) => {
  if (!existsSync(directoryPath)) {
    return [];
  }
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && isIgnoredDirectory(entry.name)) {
      continue;
    }
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath));
      continue;
    }
    if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
};
const copyDirectoryWithoutLegacyIos = async (sourceDirectory, targetDirectory, sourceRoot = sourceDirectory) => {
  if (!existsSync(sourceDirectory)) {
    return;
  }
  const entries = await readdir(sourceDirectory, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDirectory, entry.name);
    const relativePath = toPosixPath(path.relative(sourceRoot, sourcePath));
    const targetPath = path.join(targetDirectory, relativePath);
    if (isLegacyIosPath(relativePath)) {
      report.skipped.push(relativePath);
      continue;
    }
    if (entry.isDirectory()) {
      await copyDirectoryWithoutLegacyIos(sourcePath, targetDirectory, sourceRoot);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (existsSync(targetPath)) {
      report.skipped.push(relativePath);
      continue;
    }
    if (WRITE) {
      await mkdir(path.dirname(targetPath), { recursive: true });
      await cp(sourcePath, targetPath, { force: false });
    }
    report.moved.push(`${toPosixPath(path.relative(ROOT, sourcePath))} -> ${toPosixPath(path.relative(ROOT, targetPath))}`);
  }
};
const mergeLegacyDirectories = async () => {
  for (const move of MOVE_DIRECTORIES) {
    const sourceDirectory = toAbsolutePath(move.from);
    const targetDirectory = toAbsolutePath(move.to);
    if (!existsSync(sourceDirectory)) {
      continue;
    }
    if (WRITE) {
      await mkdir(targetDirectory, { recursive: true });
    }
    await copyDirectoryWithoutLegacyIos(sourceDirectory, targetDirectory);
  }
};
const removeLegacyDirectories = async () => {
  for (const relativePath of LEGACY_ANDROID_PATHS) {
    const absolutePath = toAbsolutePath(relativePath);
    if (!existsSync(absolutePath)) {
      continue;
    }
    if (WRITE) {
      await rm(absolutePath, { recursive: true, force: true });
    }
    report.removed.push(relativePath);
  }
};
const replaceContent = (content) => REPLACEMENTS.reduce((currentContent, replacement) => currentContent.split(replacement[0]).join(replacement[1]), content);
const updateTextFiles = async () => {
  const files = await collectFiles(ROOT);
  for (const filePath of files) {
    if (!isTextFile(filePath)) {
      continue;
    }
    const relativePath = toPosixPath(path.relative(ROOT, filePath));
    const currentContent = await readFile(filePath, "utf8");
    const nextContent = replaceContent(currentContent);
    if (nextContent === currentContent) {
      continue;
    }
    if (WRITE) {
      await writeFile(filePath, nextContent);
    }
    report.changed.push(relativePath);
  }
};
const removeGeneratedAndroidLock = async () => {
  const lockPath = toAbsolutePath("apps/android/package-lock.json");
  if (!existsSync(lockPath)) {
    return;
  }
  if (WRITE) {
    await rm(lockPath, { force: true });
  }
  report.removed.push("apps/android/package-lock.json");
};
const removeLegacyIosArtifactsFromAndroid = async () => {
  const androidRoot = toAbsolutePath("apps/android");
  const rendererRoot = toAbsolutePath("packages/android-renderer");
  const candidates = [
    path.join(androidRoot, "ios"),
    path.join(androidRoot, "src", "integration", "ioscalendar"),
    path.join(rendererRoot, "src", "screens", "ipad"),
  ];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) {
      continue;
    }
    const relativePath = toPosixPath(path.relative(ROOT, candidate));
    if (WRITE) {
      await rm(candidate, { recursive: true, force: true });
    }
    report.removed.push(relativePath);
  }
};
const validateRequiredPaths = async () => {
  for (const relativePath of REQUIRED_PATHS) {
    const absolutePath = toAbsolutePath(relativePath);
    if (!await pathExists(absolutePath)) {
      report.missingRequired.push(relativePath);
    }
  }
};
const validateForbiddenContent = async () => {
  const files = await collectFiles(ROOT);
  for (const filePath of files) {
    if (!isTextFile(filePath)) {
      continue;
    }
    const relativePath = toPosixPath(path.relative(ROOT, filePath));
    const content = await readFile(filePath, "utf8");
    for (const forbiddenPattern of FORBIDDEN_CONTENT_PATTERNS) {
      if (content.includes(forbiddenPattern)) {
        report.forbidden.push(`${relativePath}: ${forbiddenPattern}`);
      }
    }
  }
};
const validateLegacyPaths = async () => {
  for (const relativePath of LEGACY_ANDROID_PATHS) {
    const absolutePath = toAbsolutePath(relativePath);
    if (existsSync(absolutePath)) {
      report.forbidden.push(`${relativePath}: legacy path still exists`);
    }
  }
};
const printList = (label, values) => {
  console.log(`\n${label}: ${values.length}`);
  for (const value of values) {
    console.log(`- ${value}`);
  }
};
const printReport = () => {
  console.log(WRITE ? "Mode: write" : "Mode: dry-run");
  printList("Moved", report.moved);
  printList("Removed", report.removed);
  printList("Changed", report.changed);
  printList("Skipped", report.skipped);
  printList("Missing required paths", report.missingRequired);
  printList("Forbidden leftovers", report.forbidden);
};
const main = async () => {
  await stat(ROOT);
  await mergeLegacyDirectories();
  await removeLegacyIosArtifactsFromAndroid();
  await removeGeneratedAndroidLock();
  await updateTextFiles();
  await removeLegacyDirectories();
  await validateRequiredPaths();
  await validateLegacyPaths();
  await validateForbiddenContent();
  printReport();
  if (CHECK && (report.missingRequired.length > 0 || report.forbidden.length > 0)) {
    process.exitCode = 1;
  }
  if (!WRITE) {
    console.log("\nApply with: node scripts/complete-android-migration.mjs --write --check");
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
