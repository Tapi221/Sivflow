import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_FILE_PATH = fileURLToPath(import.meta.url);
const ROOT_DIR = process.cwd();
const IS_CHECK = process.argv.includes("--check");
const LEGACY_PLATFORM_NAME = "mo" + "bile";
const ANDROID_PLATFORM_NAME = "android";
const LEGACY_APP_DIR = `apps/${LEGACY_PLATFORM_NAME}`;
const ANDROID_APP_DIR = `apps/${ANDROID_PLATFORM_NAME}`;
const LEGACY_RENDERER_DIR = `packages/${LEGACY_PLATFORM_NAME}-renderer`;
const ANDROID_RENDERER_DIR = `packages/${ANDROID_PLATFORM_NAME}-renderer`;
const LEGACY_APP_ALIAS = `@${LEGACY_PLATFORM_NAME}`;
const LEGACY_RENDERER_ALIAS = `@${LEGACY_PLATFORM_NAME}-renderer`;
const ANDROID_APP_ALIAS = `@${ANDROID_PLATFORM_NAME}`;
const ANDROID_RENDERER_ALIAS = `@${ANDROID_PLATFORM_NAME}-renderer`;
const LEGACY_PACKAGE_NAME = `sivflow-${LEGACY_PLATFORM_NAME}`;
const ANDROID_PACKAGE_NAME = `sivflow-${ANDROID_PLATFORM_NAME}`;
const TEXT_EXTENSIONS = new Set([".cjs", ".gradle", ".js", ".json", ".jsx", ".kts", ".md", ".mjs", ".properties", ".swift", ".toml", ".ts", ".tsx", ".xml", ".yaml", ".yml"]);
const EXCLUDED_DIRECTORY_NAMES = new Set([".git", ".gradle", ".next", ".nuxt", "build", "coverage", "dist", "node_modules", "target"]);
const CONTENT_REPLACEMENTS = [[LEGACY_RENDERER_ALIAS, ANDROID_RENDERER_ALIAS], [LEGACY_APP_ALIAS, ANDROID_APP_ALIAS], [LEGACY_RENDERER_DIR, ANDROID_RENDERER_DIR], [LEGACY_APP_DIR, ANDROID_APP_DIR], [`${LEGACY_PLATFORM_NAME}-renderer`, `${ANDROID_PLATFORM_NAME}-renderer`], [LEGACY_PACKAGE_NAME, ANDROID_PACKAGE_NAME]];
const LEGACY_TOKENS = [LEGACY_RENDERER_ALIAS, LEGACY_APP_ALIAS, LEGACY_RENDERER_DIR, LEGACY_APP_DIR, LEGACY_PACKAGE_NAME, `${LEGACY_PLATFORM_NAME}-renderer`];
const ANDROID_ENTRY_CONTENT = `import { registerRootComponent } from "expo";
import { App } from "${ANDROID_RENDERER_ALIAS}/App";

registerRootComponent(App);
`;
const REQUIRED_ANDROID_FILES = [`${ANDROID_APP_DIR}/package.json`, `${ANDROID_APP_DIR}/app.json`, `${ANDROID_APP_DIR}/index.ts`, `${ANDROID_APP_DIR}/tsconfig.json`, `${ANDROID_RENDERER_DIR}/package.json`, `${ANDROID_RENDERER_DIR}/src/App.tsx`];

const toAbsolutePath = (filePath) => path.join(ROOT_DIR, filePath);
const toPosix = (filePath) => filePath.split(path.sep).join("/");
const toRepoPath = (filePath) => toPosix(path.relative(ROOT_DIR, filePath));
const readJsonFile = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));
const writeJsonFile = async (filePath, value) => {
  if (IS_CHECK) return;
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
};
const pathExists = (filePath) => existsSync(filePath);
const shouldSkipAppMigrationPath = (relativePath) => relativePath === "package-lock.json" || relativePath === ".expo" || relativePath.startsWith(".expo/") || relativePath === "ios" || relativePath.startsWith("ios/") || relativePath === "src/integration/ioscalendar" || relativePath.startsWith("src/integration/ioscalendar/");
const shouldSkipRendererMigrationPath = (relativePath) => relativePath === "src/screens/ipad" || relativePath.startsWith("src/screens/ipad/");
const shouldSkipDirectory = (directoryPath) => EXCLUDED_DIRECTORY_NAMES.has(path.basename(directoryPath));
const shouldReadTextFile = (filePath) => filePath !== SCRIPT_FILE_PATH && TEXT_EXTENSIONS.has(path.extname(filePath));
const copyTree = async (sourceDir, targetDir, shouldSkipRelativePath) => {
  if (!pathExists(sourceDir)) return;
  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    const relativePath = toPosix(path.relative(sourceDir, sourcePath));
    if (shouldSkipRelativePath(relativePath)) continue;
    if (entry.isDirectory()) {
      await mkdir(targetPath, { recursive: true });
      await copyTree(sourcePath, targetPath, (nestedRelativePath) => shouldSkipRelativePath(toPosix(path.join(relativePath, nestedRelativePath))));
      continue;
    }
    if (!entry.isFile()) continue;
    if (pathExists(targetPath)) continue;
    if (!IS_CHECK) {
      await mkdir(path.dirname(targetPath), { recursive: true });
      await copyFile(sourcePath, targetPath);
    }
  }
};
const removePath = async (filePath) => {
  if (!pathExists(filePath)) return;
  if (IS_CHECK) return;
  await rm(filePath, { force: true, recursive: true });
};
const walkFiles = async (directoryPath) => {
  if (!pathExists(directoryPath)) return [];
  if (shouldSkipDirectory(directoryPath)) return [];
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(entryPath));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!shouldReadTextFile(entryPath)) continue;
    files.push(entryPath);
  }
  return files;
};
const applyContentReplacements = async () => {
  const files = await walkFiles(ROOT_DIR);
  const changedFiles = [];
  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    const nextSource = CONTENT_REPLACEMENTS.reduce((currentSource, [from, to]) => currentSource.split(from).join(to), source);
    if (nextSource === source) continue;
    changedFiles.push(toRepoPath(filePath));
    if (!IS_CHECK) await writeFile(filePath, nextSource);
  }
  return changedFiles;
};
const ensureRootPackageJson = async () => {
  const filePath = toAbsolutePath("package.json");
  const packageJson = await readJsonFile(filePath);
  packageJson.scripts = packageJson.scripts ?? {};
  packageJson.scripts["dev:android"] = `npm --prefix ${ANDROID_APP_DIR} start`;
  packageJson.scripts["android:install"] = `npm --prefix ${ANDROID_APP_DIR} install`;
  packageJson.scripts.android = `npm --prefix ${ANDROID_APP_DIR} run android`;
  packageJson.scripts["android:dev"] = `npm --prefix ${ANDROID_APP_DIR} run android:dev`;
  packageJson.scripts["android:typecheck"] = `npm --prefix ${ANDROID_APP_DIR} run typecheck`;
  packageJson.scripts["fix:android-migration"] = "node scripts/fix-android-migration.mjs";
  packageJson.scripts["verify:android-migration"] = "node scripts/fix-android-migration.mjs --check";
  delete packageJson.scripts[`dev:${LEGACY_PLATFORM_NAME}`];
  delete packageJson.scripts[`${LEGACY_PLATFORM_NAME}:install`];
  delete packageJson.scripts[LEGACY_PLATFORM_NAME];
  delete packageJson.scripts[`${LEGACY_PLATFORM_NAME}:dev`];
  delete packageJson.scripts[`${LEGACY_PLATFORM_NAME}:typecheck`];
  await writeJsonFile(filePath, packageJson);
};
const ensureAndroidPackageJson = async () => {
  const filePath = toAbsolutePath(`${ANDROID_APP_DIR}/package.json`);
  if (!pathExists(filePath)) return;
  const packageJson = await readJsonFile(filePath);
  packageJson.name = ANDROID_PACKAGE_NAME;
  packageJson.scripts = packageJson.scripts ?? {};
  packageJson.scripts.start = packageJson.scripts.start ?? "expo start";
  packageJson.scripts.android = packageJson.scripts.android ?? "expo run:android";
  packageJson.scripts["android:dev"] = packageJson.scripts["android:dev"] ?? "expo run:android";
  packageJson.scripts.typecheck = packageJson.scripts.typecheck ?? "tsc --noEmit";
  delete packageJson.scripts.ios;
  delete packageJson.scripts["ios:dev"];
  await writeJsonFile(filePath, packageJson);
};
const ensureAndroidAppJson = async () => {
  const filePath = toAbsolutePath(`${ANDROID_APP_DIR}/app.json`);
  if (!pathExists(filePath)) return;
  const appJson = await readJsonFile(filePath);
  appJson.expo = appJson.expo ?? {};
  appJson.expo.slug = ANDROID_PACKAGE_NAME;
  delete appJson.expo.ios;
  await writeJsonFile(filePath, appJson);
};
const ensureAndroidEntry = async () => {
  const filePath = toAbsolutePath(`${ANDROID_APP_DIR}/index.ts`);
  if (!pathExists(filePath)) return;
  if (IS_CHECK) return;
  await writeFile(filePath, ANDROID_ENTRY_CONTENT);
};
const collectRemainingLegacyReferences = async () => {
  const files = await walkFiles(ROOT_DIR);
  const violations = [];
  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    for (const token of LEGACY_TOKENS) {
      if (!source.includes(token)) continue;
      violations.push(`${toRepoPath(filePath)} contains ${token}`);
    }
  }
  for (const legacyPath of [LEGACY_APP_DIR, LEGACY_RENDERER_DIR]) {
    if (!pathExists(toAbsolutePath(legacyPath))) continue;
    violations.push(`${legacyPath} still exists`);
  }
  for (const requiredPath of REQUIRED_ANDROID_FILES) {
    if (pathExists(toAbsolutePath(requiredPath))) continue;
    violations.push(`${requiredPath} is missing`);
  }
  return violations;
};
const main = async () => {
  await copyTree(toAbsolutePath(LEGACY_APP_DIR), toAbsolutePath(ANDROID_APP_DIR), shouldSkipAppMigrationPath);
  await copyTree(toAbsolutePath(LEGACY_RENDERER_DIR), toAbsolutePath(ANDROID_RENDERER_DIR), shouldSkipRendererMigrationPath);
  await removePath(toAbsolutePath(`${ANDROID_APP_DIR}/ios`));
  await removePath(toAbsolutePath(`${ANDROID_APP_DIR}/.expo`));
  await removePath(toAbsolutePath(`${ANDROID_APP_DIR}/package-lock.json`));
  await removePath(toAbsolutePath(`${ANDROID_APP_DIR}/src/integration/ioscalendar`));
  await removePath(toAbsolutePath(`${ANDROID_RENDERER_DIR}/src/screens/ipad`));
  await ensureRootPackageJson();
  await ensureAndroidPackageJson();
  await ensureAndroidAppJson();
  await ensureAndroidEntry();
  const changedFiles = await applyContentReplacements();
  await removePath(toAbsolutePath(LEGACY_APP_DIR));
  await removePath(toAbsolutePath(LEGACY_RENDERER_DIR));
  const violations = await collectRemainingLegacyReferences();
  if (changedFiles.length > 0) {
    console.log("Android 移行で書き換えたファイル:");
    for (const changedFile of changedFiles) console.log(`- ${changedFile}`);
  }
  if (violations.length === 0) {
    console.log(IS_CHECK ? "Android 移行チェックに合格しました。" : "Android 移行のクリーンアップが完了しました。");
    return;
  }
  console.error("Android migration still has unresolved items:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
};
await main();