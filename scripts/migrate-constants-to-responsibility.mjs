import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";

const projectRoot = process.cwd();

const fileMoves = [
  ["constants/shared/flashcard/geometry.ts", "src/domain/card/cardGeometry.constants.ts"],
  ["constants/shared/flashcard/paneWidth.ts", "src/components/card/frame/cardPane.constants.ts"],
  ["constants/shared/flashcard/displayModes.ts", "src/features/cardsetview/domain/cardDisplayMode.constants.ts"],
  ["constants/shared/flashcard/presentation.ts", "src/features/cardsetview/domain/cardSetViewPresentation.constants.ts"],
  ["constants/shared/flashcard/actionUi.ts", "src/components/card/frame/cardAction.constants.ts"],
  ["constants/shared/flashcard/cardSetView.ts", "src/features/cardsetview/domain/cardSetView.constants.ts"],
  ["constants/shared/flashcard/editorEvents.ts", "src/features/cardsetview/events/cardSetViewEvents.constants.ts"],
  ["constants/shared/calendar/calendar.ts", "src/features/calendar/calendar.constants.ts"],
  ["constants/shared/app/featureFlags.ts", "packages/platform/src/feature-flags/featureFlags.constants.ts"],
  ["constants/shared/app/runtime.ts", "src/platform/runtime.constants.ts"],
  ["constants/shared/app/settings.ts", "src/routes/settings.constants.ts"],
  ["constants/shared/storage/storageKeys.ts", "packages/platform/src/storage/storageKeys.constants.ts"],
  ["constants/shared/storage/localdb.ts", "src/services/localdb/localdb.constants.ts"],
  ["constants/shared/firebase/emulators.ts", "src/infrastructure/firebase/firebaseEmulators.constants.ts"],
  ["constants/web/app/device.ts", "src/utils/device.constants.ts"],
  ["constants/web/app/context.ts", "src/services/contextService.constants.ts"],
  ["constants/web/app/sidebar.ts", "src/components/folder/sidebarLayout.constants.ts"],
  ["constants/web/app/tabPresence.ts", "src/utils/tabPresence.constants.ts"],
  ["constants/web/app/preload.ts", "src/components/card/hooks/cardImagePreload.constants.ts"],
  ["constants/web/storage/storageKeys.ts", "packages/platform/src/storage/webStorageKeys.constants.ts"],
  ["constants/web/flashcard/codeBlock.ts", "src/components/card/blocks/code/codeBlock.constants.ts"],
  ["constants/desktop/app.ts", "packages/platform/src/auth/google/desktopOAuth.constants.ts"],
];

const symbolTargets = new Map(Object.entries({
  CARD_BASE_WIDTH: "@/domain/card/cardGeometry.constants",
  CARD_DISPLAY_SCALE: "@/domain/card/cardGeometry.constants",
  CANONICAL_CARD_WIDTH: "@/domain/card/cardGeometry.constants",
  CARD_SAFE_PADDING_PX: "@/domain/card/cardGeometry.constants",
  CARD_ROW_PX: "@/domain/card/cardGeometry.constants",
  CARD_CONTENT_TOP_PX: "@/domain/card/cardGeometry.constants",
  CARD_RULED_OFFSET_TOP_PX: "@/domain/card/cardGeometry.constants",
  CARD_RULED_OFFSET_BOTTOM_PX: "@/domain/card/cardGeometry.constants",
  CARD_HEIGHT_PHASE_PX: "@/domain/card/cardGeometry.constants",
  layoutRowsToCardHeightPx: "@/domain/card/cardGeometry.constants",
  cardHeightPxToLayoutRows: "@/domain/card/cardGeometry.constants",
  minCardHeightPxToLayoutRows: "@/domain/card/cardGeometry.constants",
  snapMinCardHeightPx: "@/domain/card/cardGeometry.constants",
  CardPaneMode: "@/components/card/frame/cardPane.constants",
  CARD_PANE_VIEW_DEFAULT_WIDTH_PX: "@/components/card/frame/cardPane.constants",
  CARD_PANE_EDIT_DEFAULT_WIDTH_PX: "@/components/card/frame/cardPane.constants",
  CARD_PANE_VIEW_MIN_WIDTH_PX: "@/components/card/frame/cardPane.constants",
  CARD_PANE_EDIT_MIN_WIDTH_PX: "@/components/card/frame/cardPane.constants",
  CARD_PANE_EDITOR_DEFAULT_WIDTH_PX: "@/components/card/frame/cardPane.constants",
  CARD_PANE_EDITOR_DOCKED_DEFAULT_WIDTH_PX: "@/components/card/frame/cardPane.constants",
  CARD_PANE_WIDTH_STEP_PX: "@/components/card/frame/cardPane.constants",
  CARD_PANE_AUTO_MAX_SCALE: "@/components/card/frame/cardPane.constants",
  CARD_PANE_WIDTH_CONTROL_CLEARANCE_PX: "@/components/card/frame/cardPane.constants",
  clampPaneWidthPx: "@/components/card/frame/cardPane.constants",
  DISPLAY_MODE_LABELS: "@/features/cardsetview/domain/cardDisplayMode.constants",
  DISPLAY_MODE_TRIGGER_LABELS: "@/features/cardsetview/domain/cardDisplayMode.constants",
  CARD_SET_VIEW_ZOOM_MIN_BASE_WIDTH_PX: "@/features/cardsetview/domain/cardSetViewPresentation.constants",
  CARD_SET_VIEW_SPLIT_MIN_PRESENTATION_WIDTH_PX: "@/features/cardsetview/domain/cardSetViewPresentation.constants",
  CARD_SET_VIEW_DEFAULT_ZOOM_SCALE: "@/features/cardsetview/domain/cardSetViewPresentation.constants",
  CARD_SET_VIEW_SCROLLBAR_RESERVE_PX: "@/features/cardsetview/domain/cardSetViewPresentation.constants",
  CARD_SET_VIEW_FIXED_LAYOUT_SAFETY_ALLOWANCE_PX: "@/features/cardsetview/domain/cardSetViewPresentation.constants",
  CARD_SET_VIEW_SPLIT_LAYOUT_INTERNAL_ALLOWANCE_PX: "@/features/cardsetview/domain/cardSetViewPresentation.constants",
  CARD_SET_VIEW_META_PANEL_BASE_WIDTH_PX: "@/features/cardsetview/domain/cardSetViewPresentation.constants",
  CARD_SET_VIEW_LAYOUT_CONSTRAINT_INDICATOR_DURATION_MS: "@/features/cardsetview/domain/cardSetViewPresentation.constants",
  CARD_ACTION_ICON_CLASS: "@/components/card/frame/cardAction.constants",
  CARD_ACTION_COLOR_IDLE_CLASS: "@/components/card/frame/cardAction.constants",
  CARD_ACTION_COLOR_ACTIVE_CLASS: "@/components/card/frame/cardAction.constants",
  CARD_ACTION_BG_CLASS: "@/components/card/frame/cardAction.constants",
  CARD_SET_VIEW_PAGER_PADDING_INLINE: "@/features/cardsetview/domain/cardSetView.constants",
  CARD_SET_VIEW_PAGER_PADDING_BLOCK: "@/features/cardsetview/domain/cardSetView.constants",
  CARD_SET_VIEW_NATURAL_INDEX_COMMIT_DELAY_VIEW_MS: "@/features/cardsetview/domain/cardSetView.constants",
  CARD_SET_VIEW_NATURAL_INDEX_COMMIT_DELAY_EDIT_MS: "@/features/cardsetview/domain/cardSetView.constants",
  CardViewZoomInteractionSource: "@/features/cardsetview/domain/cardSetView.constants",
  CARD_VIEW_ZOOM_STEP_PERCENT_BY_SOURCE: "@/features/cardsetview/domain/cardSetView.constants",
  CARD_VIEW_ZOOM_SLIDER_STEP_PERCENT: "@/features/cardsetview/domain/cardSetView.constants",
  CARD_VIEW_ZOOM_BUTTON_STEP_PERCENT: "@/features/cardsetview/domain/cardSetView.constants",
  CARD_VIEW_ZOOM_WHEEL_STEP_PERCENT: "@/features/cardsetview/domain/cardSetView.constants",
  CARD_VIEW_ZOOM_GESTURE_STEP_PERCENT: "@/features/cardsetview/domain/cardSetView.constants",
  CARD_VIEW_ZOOM_STEP_PERCENT: "@/features/cardsetview/domain/cardSetView.constants",
  CARD_VIEW_ZOOM_DEFAULT_PERCENT: "@/features/cardsetview/domain/cardSetView.constants",
  CARD_VIEW_ZOOM_MIN_PERCENT: "@/features/cardsetview/domain/cardSetView.constants",
  CARD_VIEW_DEFAULT_ZOOM_PERCENT: "@/features/cardsetview/domain/cardSetView.constants",
  CARD_VIEW_MIN_ZOOM_PERCENT: "@/features/cardsetview/domain/cardSetView.constants",
  CARD_SET_VIEW_EVENTS: "@/features/cardsetview/events/cardSetViewEvents.constants",
  CALENDAR_RESISTANCE_LEGEND: "@/features/calendar/calendar.constants",
  CALENDAR_WEEK_DAYS_SUNDAY: "@/features/calendar/calendar.constants",
  CALENDAR_WEEK_DAYS_MONDAY: "@/features/calendar/calendar.constants",
  CALENDAR_ARROW_DIFF_MAP: "@/features/calendar/calendar.constants",
  FeatureFlags: "@platform/feature-flags/featureFlags.constants",
  DEFAULT_FEATURE_FLAGS: "@platform/feature-flags/featureFlags.constants",
  LegacyFlagName: "@platform/feature-flags/featureFlags.constants",
  LEGACY_FEATURE_FLAG_MAP: "@platform/feature-flags/featureFlags.constants",
  RUNTIME_KINDS: "@/platform/runtime.constants",
  RuntimeKind: "@/platform/runtime.constants",
  RUNTIME_RELOAD_KEYS: "@/platform/runtime.constants",
  RUNTIME_CHUNK_ERROR_PATTERNS: "@/platform/runtime.constants",
  SETTINGS_TAB_PARAMS: "@/routes/settings.constants",
  SettingsTabParam: "@/routes/settings.constants",
  SettingsTab: "@/routes/settings.constants",
  DEFAULT_SETTINGS_TAB: "@/routes/settings.constants",
  isSettingsTabParam: "@/routes/settings.constants",
  SHARED_STORAGE_KEYS: "@platform/storage/storageKeys.constants",
  LOCALDB_SCHEMA_VERSION_FOR_NAME: "@/services/localdb/localdb.constants",
  LOCALDB_GENERATION_MAX: "@/services/localdb/localdb.constants",
  LOCALDB_RECOVERY_GUIDE_URL: "@/services/localdb/localdb.constants",
  LOCALDB_GENERATION_KEY_PREFIX: "@/services/localdb/localdb.constants",
  LOCALDB_ERROR_MESSAGE_LIMIT: "@/services/localdb/localdb.constants",
  LOCALDB_NAME_PREFIX: "@/services/localdb/localdb.constants",
  FIREBASE_EMULATOR_PORTS: "@/infrastructure/firebase/firebaseEmulators.constants",
  FIREBASE_EMULATORS: "@/infrastructure/firebase/firebaseEmulators.constants",
  DEVICE_LABELS: "@/utils/device.constants",
  DEVICE_USER_AGENT_PATTERNS: "@/utils/device.constants",
  DEVICE_STANDALONE_MEDIA_QUERY: "@/utils/device.constants",
  CONTEXT_STORAGE_KEY_PREFIXES: "@/services/contextService.constants",
  CONTEXT_SYNC_THRESHOLDS: "@/services/contextService.constants",
  SIDEBAR_WIDTH_LIMITS: "@/components/folder/sidebarLayout.constants",
  TAB_PRESENCE_STORAGE_KEYS: "@/utils/tabPresence.constants",
  TAB_PRESENCE_TIMINGS: "@/utils/tabPresence.constants",
  CARD_IMAGE_PRELOAD_DEBUG_STORAGE_KEY: "@/components/card/hooks/cardImagePreload.constants",
  CARD_IMAGE_PRELOAD: "@/components/card/hooks/cardImagePreload.constants",
  WEB_STORAGE_KEYS: "@platform/storage/webStorageKeys.constants",
  CODE_BLOCK_RECENT_LANGUAGE_STORAGE_KEY: "@/components/card/blocks/code/codeBlock.constants",
  CODE_BLOCK_MAX_RECENT_LANGUAGES: "@/components/card/blocks/code/codeBlock.constants",
  CODE_BLOCK_SUPPORTED_LANGUAGES: "@/components/card/blocks/code/codeBlock.constants",
  CODE_BLOCK_SUPPORTED_LANGUAGE_VALUES: "@/components/card/blocks/code/codeBlock.constants",
  DESKTOP_OAUTH_LOOPBACK: "@platform/auth/google/desktopOAuth.constants",
  DESKTOP_GOOGLE_OAUTH_REDIRECT_URI: "@platform/auth/google/desktopOAuth.constants",
}));

const constantsImportPattern = /import\s*\{([\s\S]*?)\}\s*from\s*["']@constants(?:\/[^"']*)?["'];?/g;
const sourceGlobs = ["**/*.{ts,tsx,js,jsx,mjs,cjs,json}"];
const ignoredGlobs = ["**/node_modules/**", "**/dist/**", "**/build/**", "**/coverage/**", "**/.git/**"];

const toAbsolute = (relativePath) => path.join(projectRoot, relativePath);
const normalizePath = (filePath) => filePath.replace(/\\/g, "/");
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ensureParentDir = (filePath) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const readIfExists = (relativePath) => {
  const filePath = toAbsolute(relativePath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
};

const writeFile = (relativePath, content) => {
  const filePath = toAbsolute(relativePath);
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, content);
};

const removeFileIfExists = (relativePath) => {
  const filePath = toAbsolute(relativePath);
  if (fs.existsSync(filePath)) fs.rmSync(filePath);
};

const removeEmptyDirectories = (relativePath) => {
  const absolutePath = toAbsolute(relativePath);
  if (!fs.existsSync(absolutePath)) return;

  for (const entry of fs.readdirSync(absolutePath)) {
    const entryPath = path.join(absolutePath, entry);
    if (fs.statSync(entryPath).isDirectory()) {
      removeEmptyDirectories(normalizePath(path.relative(projectRoot, entryPath)));
    }
  }

  if (fs.existsSync(absolutePath) && fs.readdirSync(absolutePath).length === 0) {
    fs.rmdirSync(absolutePath);
  }
};

const rewriteMovedFileContent = (targetPath, content) => {
  if (targetPath.endsWith("cardSetView.constants.ts")) {
    return content
      .replace('import { CANONICAL_CARD_WIDTH } from "./geometry";', 'import { CANONICAL_CARD_WIDTH } from "@/domain/card/cardGeometry.constants";')
      .replace('import { CARD_PANE_AUTO_MAX_SCALE, CARD_PANE_EDIT_DEFAULT_WIDTH_PX, CARD_PANE_EDIT_MIN_WIDTH_PX, CARD_PANE_VIEW_DEFAULT_WIDTH_PX, CARD_PANE_VIEW_MIN_WIDTH_PX, CARD_PANE_WIDTH_STEP_PX } from "./paneWidth";', 'import { CARD_PANE_AUTO_MAX_SCALE, CARD_PANE_EDIT_DEFAULT_WIDTH_PX, CARD_PANE_EDIT_MIN_WIDTH_PX, CARD_PANE_VIEW_DEFAULT_WIDTH_PX, CARD_PANE_VIEW_MIN_WIDTH_PX, CARD_PANE_WIDTH_STEP_PX } from "@/components/card/frame/cardPane.constants";');
  }

  return content;
};

const parseImportSpecifiers = (rawSpecifiers) => rawSpecifiers
  .split(",")
  .map((specifier) => specifier.trim())
  .filter(Boolean);

const getImportedName = (specifier) => {
  const withoutType = specifier.startsWith("type ") ? specifier.slice("type ".length).trim() : specifier;
  return withoutType.split(/\s+as\s+/u)[0].trim();
};

const groupSpecifiersByTarget = (specifiers) => {
  const grouped = new Map();

  for (const specifier of specifiers) {
    const importedName = getImportedName(specifier);
    const target = symbolTargets.get(importedName);
    if (!target) throw new Error(`No responsibility target registered for @constants export: ${importedName}`);

    const current = grouped.get(target) ?? [];
    current.push(specifier);
    grouped.set(target, current);
  }

  return grouped;
};

const rewriteConstantsImports = (content) => content.replace(constantsImportPattern, (_match, rawSpecifiers) => {
  const specifiers = parseImportSpecifiers(rawSpecifiers);
  const grouped = groupSpecifiersByTarget(specifiers);

  return Array.from(grouped.entries())
    .map(([target, targetSpecifiers]) => `import { ${targetSpecifiers.join(", ")} } from "${target}";`)
    .join("\n");
});

const removeConstantsAliasFromJson = (content) => content
  .replace(/,?\n\s*"@constants\/\*": \[[^\n]+\]/g, "")
  .replace(/,?\n\s*"constants(?:\/\*\*\/\*\.ts)?"/g, "")
  .replace(/,?\n\s*"\.\.\/\.\.\/constants\/\*"/g, "");

const removeConstantsAliasFromCode = (content) => content
  .replace(/\n\s*\{ find: "@constants", replacement: resolveFromRoot\("constants"\) \},/g, "")
  .replace(/\n\s*"@constants": path\.resolve\(workspaceRoot, "constants"\),/g, "")
  .replace(/\n\s*\{ dir: path\.join\(projectRoot, "constants"\), prefix: "@constants" \},/g, "");

const moveConstantsFiles = () => {
  for (const [sourcePath, targetPath] of fileMoves) {
    const content = readIfExists(sourcePath);
    if (content === null) continue;

    writeFile(targetPath, rewriteMovedFileContent(targetPath, content));
    removeFileIfExists(sourcePath);
  }

  for (const indexPath of [
    "constants/index.ts",
    "constants/shared/index.ts",
    "constants/shared/app/index.ts",
    "constants/shared/calendar/index.ts",
    "constants/shared/firebase/index.ts",
    "constants/shared/flashcard/index.ts",
    "constants/shared/storage/index.ts",
    "constants/web/index.ts",
    "constants/web/app/index.ts",
    "constants/web/flashcard/index.ts",
    "constants/web/storage/index.ts",
    "constants/desktop/index.ts",
  ]) {
    removeFileIfExists(indexPath);
  }

  removeEmptyDirectories("constants");
};

const rewriteRepositoryFiles = () => {
  const files = fg.sync(sourceGlobs, {
    cwd: projectRoot,
    absolute: true,
    ignore: ignoredGlobs,
  });

  let changedFileCount = 0;

  for (const filePath of files) {
    const relativePath = normalizePath(path.relative(projectRoot, filePath));
    if (relativePath.startsWith("constants/")) continue;

    const originalContent = fs.readFileSync(filePath, "utf8");
    let nextContent = rewriteConstantsImports(originalContent);

    if (relativePath === "tsconfig.app.json" || relativePath === "tsconfig.test.json" || relativePath === "apps/mobile/tsconfig.json") {
      nextContent = removeConstantsAliasFromJson(nextContent);
    }

    if (
      relativePath === "apps/web/vite.config.ts" ||
      relativePath === "apps/mobile/metro.config.js" ||
      relativePath === "apps/mobile/metro.config.cjs" ||
      relativePath === "vitest.config.ts" ||
      relativePath === "scripts/convert-imports-to-alias.mjs"
    ) {
      nextContent = removeConstantsAliasFromCode(nextContent);
    }

    if (nextContent !== originalContent) {
      fs.writeFileSync(filePath, nextContent);
      changedFileCount += 1;
    }
  }

  return changedFileCount;
};

moveConstantsFiles();
const changedFileCount = rewriteRepositoryFiles();

console.log(`Migrated root constants into responsibility modules and rewrote ${changedFileCount} file(s).`);
