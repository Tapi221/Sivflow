import { CANONICAL_CARD_WIDTH } from "@/components/card/common/constants";

export const CARD_SET_VIEW_PAGER_PADDING_INLINE = 0;
export const CARD_SET_VIEW_PAGER_PADDING_BLOCK = "50vh";
export const CARD_SET_VIEW_NATURAL_INDEX_COMMIT_DELAY_VIEW_MS = 0;
export const CARD_SET_VIEW_NATURAL_INDEX_COMMIT_DELAY_EDIT_MS = 0;

export const CARD_PANE_VIEW_DEFAULT_WIDTH_PX = 576;
export const CARD_PANE_EDIT_DEFAULT_WIDTH_PX = 1000;
export const CARD_PANE_VIEW_MIN_WIDTH_PX = 360;
export const CARD_PANE_EDIT_MIN_WIDTH_PX = 640;
export const CARD_PANE_WIDTH_STEP_PX = 40;
export const CARD_PANE_AUTO_MAX_SCALE = 4;

export const CARD_VIEW_ZOOM_STEP_PERCENT = 5;
export const CARD_VIEW_ZOOM_DEFAULT_PERCENT = Math.round(
  (CARD_PANE_VIEW_DEFAULT_WIDTH_PX / CANONICAL_CARD_WIDTH) * 100,
);
export const CARD_VIEW_ZOOM_MIN_PERCENT = Math.round(
  (CARD_PANE_VIEW_MIN_WIDTH_PX / CANONICAL_CARD_WIDTH) * 100,
);

// backward compatibility aliases
export const CARD_VIEW_DEFAULT_ZOOM_PERCENT = CARD_VIEW_ZOOM_DEFAULT_PERCENT;
export const CARD_VIEW_MIN_ZOOM_PERCENT = CARD_VIEW_ZOOM_MIN_PERCENT;

export const clampPaneWidthPx = (
  value: number | null | undefined,
  min: number,
  max?: number,
) => {
  const fallback = Math.max(1, min);
  const safeValue =
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const clampedMin = Math.max(1, min);
  const clampedMax =
    typeof max === "number" && Number.isFinite(max)
      ? Math.max(clampedMin, max)
      : Number.POSITIVE_INFINITY;

  return Math.min(clampedMax, Math.max(clampedMin, Math.round(safeValue)));
};