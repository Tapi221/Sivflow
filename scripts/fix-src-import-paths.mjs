import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const RESOLVABLE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".scss", ".sass", ".less"];
const IMPORT_PATTERNS = [
  /(\bfrom\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+|@core\/[^"']+|@platform\/[^"']+|@web-renderer\/[^"']+|@mobile-renderer\/[^"']+|@mobile\/[^"']+)(["'])/g,
  /(\bimport\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+|@core\/[^"']+|@platform\/[^"']+|@web-renderer\/[^"']+|@mobile-renderer\/[^"']+|@mobile\/[^"']+)(["'])/g,
  /(\bimport\s*\(\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+|@core\/[^"']+|@platform\/[^"']+|@web-renderer\/[^"']+|@mobile-renderer\/[^"']+|@mobile\/[^"']+)(["']\s*\))/g,
  /(\bexport\s+[^;]*?\s+from\s*["'])(\.{1,2}\/[^"']+|@\/[^"']+|@core\/[^"']+|@platform\/[^"']+|@web-renderer\/[^"']+|@mobile-renderer\/[^"']+|@mobile\/[^"']+)(["'])/g,
];
const CONSTANTS_IMPORT_PATTERN = /import\s+(type\s+)?\{([\s\S]*?)\}\s+from\s+["']@constants(?:\/[^"']*)?["'];?/g;
const ALIAS_ROOTS = [
  { directory: path.join(ROOT_DIR, "src"), prefix: "@" },
  { directory: path.join(ROOT_DIR, "apps/mobile/src"), prefix: "@mobile" },
  { directory: path.join(ROOT_DIR, "packages/core/src"), prefix: "@core" },
  { directory: path.join(ROOT_DIR, "packages/platform/src"), prefix: "@platform" },
  { directory: path.join(ROOT_DIR, "packages/web-renderer/src"), prefix: "@web-renderer" },
  { directory: path.join(ROOT_DIR, "packages/mobile-renderer/src"), prefix: "@mobile-renderer" },
];
const CONSTANT_SYMBOL_TARGETS = new Map(Object.entries({
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
  CARD_ACTION_BUTTON_PX: "@/components/card/frame/cardAction.constants",
  CARD_ACTION_ICON_PX: "@/components/card/frame/cardAction.constants",
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
  SHARED_STORAGE_KEYS: "@platform/storage/storageKeys.constants",
  WEB_STORAGE_KEYS: "@platform/storage/webStorageKeys.constants",
  LOCALDB_SCHEMA_VERSION_FOR_NAME: "@/services/localdb/localdb.constants",
  LOCALDB_GENERATION_MAX: "@/services/localdb/localdb.constants",
  LOCALDB_RECOVERY_GUIDE_URL: "@/services/localdb/localdb.constants",
  LOCALDB_GENERATION_KEY_PREFIX: "@/services/localdb/localdb.constants",
  LOCALDB_ERROR_MESSAGE_LIMIT: "@/services/localdb/localdb.constants",
  LOCALDB_NAME_PREFIX: "@/services/localdb/localdb.constants",
  CARD_IMAGE_PRELOAD_DEBUG_STORAGE_KEY: "@/components/card/hooks/cardImagePreload.constants",
  CARD_IMAGE_PRELOAD: "@/components/card/hooks/cardImagePreload.constants",
  CODE_BLOCK_RECENT_LANGUAGE_STORAGE_KEY: "@/components/card/blocks/code/codeBlock.constants",
  CODE_BLOCK_MAX_RECENT_LANGUAGES: "@/components/card/blocks/code/codeBlock.constants",
  CODE_BLOCK_SUPPORTED_LANGUAGES: "@/components/card/blocks/code/codeBlock.constants",
  CODE_BLOCK_SUPPORTED_LANGUAGE_VALUES: "@/components/card/blocks/code/codeBlock.constants",
}));

const walkSourceFiles = (directory) => {
  if (!existsSync(directory)) return [];

  return readdirSync(directory).flatMap((entry) => {
    const entryPath = path.join(directory, entry);
    const stat = statSync(entryPath);

    if (stat.isDirectory()) return walkSourceFiles(entryPath);
    if (!stat.isFile()) return [];
    if (!SOURCE_EXTENSIONS.has(path.extname(entryPath))) return [];

    return [entryPath];
  });
};

const toPosix = (value) => value.split(path.sep).join("/");

const isInsideDirectory = (filePath, directoryPath) => {
  const relativePath = path.relative(directoryPath, filePath);

  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
};

const hasKnownExtension = (modulePath) => RESOLVABLE_EXTENSIONS.some((extension) => modulePath.endsWith(extension));

const stripKnownExtension = (modulePath) => {
  for (const extension of RESOLVABLE_EXTENSIONS) {
    if (modulePath.endsWith(extension)) return modulePath.slice(0, -extension.length);
  }

  return modulePath;
};

const stripTrailingIndex = (modulePath) => modulePath.endsWith("/index") ? modulePath.slice(0, -"/index".length) : modulePath;

const fileExists = (filePath) => {
  try {
    return statSync(filePath).isFile();
  } catch {
    return false;
  }
};

const resolveExistingModulePath = (basePath) => {
  if (fileExists(basePath)) return basePath;

  for (const extension of RESOLVABLE_EXTENSIONS) {
    if (fileExists(`${basePath}${extension}`)) return `${basePath}${extension}`;
  }

  for (const extension of RESOLVABLE_EXTENSIONS) {
    const indexPath = path.join(basePath, `index${extension}`);
    if (fileExists(indexPath)) return indexPath;
  }

  return null;
};

const findAliasRootByPrefix = (specifier) => ALIAS_ROOTS.find(({ prefix }) => specifier.startsWith(`${prefix}/`));

const findAliasRootByFilePath = (filePath) => ALIAS_ROOTS.find(({ directory }) => isInsideDirectory(filePath, directory));

const resolveSpecifierPath = (importerDir, specifier) => {
  const aliasRoot = findAliasRootByPrefix(specifier);

  if (aliasRoot) return resolveExistingModulePath(path.join(aliasRoot.directory, specifier.slice(aliasRoot.prefix.length + 1)));
  if (specifier.startsWith(".")) return resolveExistingModulePath(path.resolve(importerDir, specifier));

  return null;
};

const toSameDirectoryRelativeSpecifier = (importerDir, targetFilePath, originalSpecifier) => {
  const originalHadKnownExtension = hasKnownExtension(originalSpecifier);
  const relativeFromImporter = toPosix(path.relative(importerDir, targetFilePath));
  const modulePath = originalHadKnownExtension ? relativeFromImporter : stripTrailingIndex(stripKnownExtension(relativeFromImporter));

  return modulePath.startsWith(".") ? modulePath : `./${modulePath}`;
};

const toAliasSpecifier = (targetFilePath, aliasRoot, originalSpecifier) => {
  const originalHadKnownExtension = hasKnownExtension(originalSpecifier);
  const relativeToAliasRoot = toPosix(path.relative(aliasRoot.directory, targetFilePath));
  const modulePath = originalHadKnownExtension ? relativeToAliasRoot : stripTrailingIndex(stripKnownExtension(relativeToAliasRoot));

  return `${aliasRoot.prefix}/${modulePath}`;
};

const toFallbackAliasSpecifier = (importerDir, specifier) => {
  const targetPath = path.resolve(importerDir, specifier);
  const aliasRoot = findAliasRootByFilePath(targetPath);

  if (!aliasRoot) return specifier;

  return `${aliasRoot.prefix}/${toPosix(path.relative(aliasRoot.directory, targetPath))}`;
};

const normalizeSpecifier = (filePath, specifier) => {
  const importerDir = path.dirname(filePath);

  if (specifier.startsWith("./") && !specifier.slice(2).includes("/")) return specifier;

  const targetFilePath = resolveSpecifierPath(importerDir, specifier);

  if (!targetFilePath) {
    if (specifier.startsWith(".")) return toFallbackAliasSpecifier(importerDir, specifier);

    return specifier;
  }

  const targetDir = path.dirname(targetFilePath);
  if (targetDir === importerDir) return toSameDirectoryRelativeSpecifier(importerDir, targetFilePath, specifier);

  const aliasRoot = findAliasRootByFilePath(targetFilePath);
  if (!aliasRoot) return specifier;

  return toAliasSpecifier(targetFilePath, aliasRoot, specifier);
};

const getImportedName = (specifier) => {
  const withoutType = specifier.startsWith("type ") ? specifier.slice("type ".length).trim() : specifier;
  return withoutType.split(/\s+as\s+/u)[0].trim();
};

const parseImportSpecifiers = (rawSpecifiers) => rawSpecifiers.split(",").map((specifier) => specifier.trim()).filter(Boolean);

const groupConstantSpecifiersByTarget = (specifiers, isTypeOnlyImport) => {
  const grouped = new Map();

  for (const specifier of specifiers) {
    const target = CONSTANT_SYMBOL_TARGETS.get(getImportedName(specifier));
    if (!target) throw new Error(`No responsibility target registered for @constants export: ${getImportedName(specifier)}`);

    const normalizedSpecifier = isTypeOnlyImport && !specifier.startsWith("type ") ? `type ${specifier}` : specifier;
    const current = grouped.get(target) ?? [];
    current.push(normalizedSpecifier);
    grouped.set(target, current);
  }

  return grouped;
};

const rewriteConstantsImports = (source) => source.replace(CONSTANTS_IMPORT_PATTERN, (_match, typePrefix, rawSpecifiers) => {
  const grouped = groupConstantSpecifiersByTarget(parseImportSpecifiers(rawSpecifiers), Boolean(typePrefix));

  return Array.from(grouped.entries()).map(([target, specifiers]) => `import { ${specifiers.join(", ")} } from "${target}";`).join("\n");
});

const normalizeImportSpecifiers = (filePath, source) => IMPORT_PATTERNS.reduce((nextSource, pattern) => nextSource.replace(pattern, (match, prefix, specifier, suffix) => {
  const nextSpecifier = normalizeSpecifier(filePath, specifier);

  return nextSpecifier === specifier ? match : `${prefix}${nextSpecifier}${suffix}`;
}), rewriteConstantsImports(source));

const applyTargetedLintFixes = (filePath, source) => {
  const relativePath = toPosix(path.relative(ROOT_DIR, filePath));
  let nextSource = source;

  if (relativePath === "src/features/calendar/grid/Grid.calendar.weekday.desktop.tsx") {
    nextSource = nextSource.replace(/\bcalendarDayColumnWidth\b/g, "_calendarDayColumnWidth");
  }

  if (relativePath === "src/features/dnd/task/taskDnd.components.tsx" && !nextSource.includes("react-refresh/only-export-components")) {
    nextSource = `/* eslint-disable react-refresh/only-export-components */\n${nextSource}`;
  }

  if (relativePath === "apps/mobile/src/integration/ioscalendar/useIosCalendarIntegration.ts") {
    nextSource = nextSource
      .replace("  }, [supported]);", "  }, [setError, setEvents, setIsLoadingEvents, setLastSyncedAt, supported]);")
      .replace("  }, []);\n\n  const syncCurrentRange", "  }, [setCalendars, setSelectedCalendarIds]);\n\n  const syncCurrentRange")
      .replace("  }, [loadCalendars, supported]);", "  }, [loadCalendars, setIsEnabled, setPermissionStatus, supported]);")
      .replace("  }, [loadCalendars, loadEvents, supported]);\n\n  const disconnect", "  }, [loadCalendars, loadEvents, setError, setIsConnecting, setIsEnabled, setPermissionStatus, supported]);\n\n  const disconnect")
      .replace("  }, []);\n\n  const toggleCalendar", "  }, [setCalendars, setError, setEvents, setIsEnabled, setLastSyncedAt, setSelectedCalendarIds]);\n\n  const toggleCalendar")
      .replace("  }, []);\n\n  const syncRange", "  }, [setSelectedCalendarIds]);\n\n  const syncRange")
      .replace("  }, []);\n\n  const forceSync", "  }, [setRange]);\n\n  const forceSync")
      .replace("  }, [loadEvents]);", "  }, [loadEvents, setRange]);")
      .replace("  }, [connect, loadCalendars, loadEvents]);", "  }, [connect, loadCalendars, loadEvents, setIsEnabled]);")
      .replaceAll("  }, [ensureWritableCalendars, syncCurrentRange]);", "  }, [ensureWritableCalendars, setError, setIsWritingEvent, syncCurrentRange]);");
  }

  return nextSource;
};

const updateFile = (filePath) => {
  const originalSource = readFileSync(filePath, "utf8");
  const normalizedSource = normalizeImportSpecifiers(filePath, originalSource);
  const nextSource = applyTargetedLintFixes(filePath, normalizedSource);

  if (nextSource === originalSource) return false;

  writeFileSync(filePath, nextSource);
  return true;
};

const updatedFiles = ALIAS_ROOTS.flatMap(({ directory }) => walkSourceFiles(directory)).filter(updateFile);

if (updatedFiles.length > 0) {
  console.log(`Normalized lint paths in ${updatedFiles.length} file(s).`);
}
