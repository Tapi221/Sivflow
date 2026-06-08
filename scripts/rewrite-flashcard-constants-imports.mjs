import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";

const projectRoot = process.cwd();
const sourceGlobs = ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"];
const ignoredGlobs = ["**/node_modules/**", "**/dist/**", "**/build/**", "**/coverage/**", "**/.git/**"];

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
}));

const flashcardImportPattern = /^import\s+(type\s+)?\{([^{}]*?)\}\s+from\s+["']@constants\/shared\/flashcard["'];?\s*$/gm;

const parseImportSpecifiers = (rawSpecifiers) => rawSpecifiers.split(",").map((specifier) => specifier.trim()).filter(Boolean);

const getImportedName = (specifier) => {
  const withoutType = specifier.startsWith("type ") ? specifier.slice("type ".length).trim() : specifier;
  return withoutType.split(/\s+as\s+/u)[0].trim();
};

const groupSpecifiersByTarget = (specifiers, isTypeOnlyImport) => {
  const grouped = new Map();

  for (const specifier of specifiers) {
    const importedName = getImportedName(specifier);
    const target = symbolTargets.get(importedName);
    if (!target) throw new Error(`No responsibility target registered for @constants/shared/flashcard export: ${importedName}`);

    const normalizedSpecifier = isTypeOnlyImport && !specifier.startsWith("type ") ? `type ${specifier}` : specifier;
    const current = grouped.get(target) ?? [];
    current.push(normalizedSpecifier);
    grouped.set(target, current);
  }

  return grouped;
};

const rewriteFlashcardConstantsImports = (content) => content.replace(flashcardImportPattern, (_match, typePrefix, rawSpecifiers) => {
  const specifiers = parseImportSpecifiers(rawSpecifiers);
  const grouped = groupSpecifiersByTarget(specifiers, Boolean(typePrefix));

  return Array.from(grouped.entries()).map(([target, targetSpecifiers]) => `import { ${targetSpecifiers.join(", ")} } from "${target}";`).join("\n");
});

const files = await fg(sourceGlobs, { cwd: projectRoot, absolute: true, ignore: ignoredGlobs });
let changedCount = 0;

for (const filePath of files) {
  const source = fs.readFileSync(filePath, "utf8");
  const nextSource = rewriteFlashcardConstantsImports(source);

  if (nextSource === source) continue;

  fs.writeFileSync(filePath, nextSource);
  changedCount += 1;
}

if (changedCount > 0) {
  console.log(`Rewrote @constants/shared/flashcard imports in ${changedCount} file(s).`);
}
