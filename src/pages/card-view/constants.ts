export const CARDVIEW_PAGER_PADDING_INLINE = 0;
export const CARDVIEW_PAGER_PADDING_BLOCK = "50vh";
export const CARDVIEW_NATURAL_INDEX_COMMIT_DELAY_VIEW_MS = 0;
export const CARDVIEW_NATURAL_INDEX_COMMIT_DELAY_EDIT_MS = 0;
// 編集中の同時マウント数を抑えてレンダリング負荷を下げる
export const EDIT_PREVIEW_RANGE = 1;
// 閲覧中は前後1枚だけ実カードを描画し、遠いカードはプレースホルダにする
export const VIEW_PREVIEW_RANGE = 1;
export const CARDVIEW_SAVE_FINISHED_EVENT = "cardview:save-finished";
export const CARD_PANE_VIEW_DEFAULT_WIDTH_PX = 576;
export const CARD_PANE_EDIT_DEFAULT_WIDTH_PX = 1000;
export const CARD_PANE_VIEW_MIN_WIDTH_PX = 360;
export const CARD_PANE_EDIT_MIN_WIDTH_PX = 640;
export const CARD_PANE_WIDTH_STEP_PX = 40;
export const CARD_PANE_AUTO_MAX_SCALE = 4;
export const CARD_PANE_WIDTH_CONTROL_CLEARANCE_PX = 72;

export function clampPaneWidthPx(
  value: number | null | undefined,
  min: number,
  max?: number,
): number {
  const fallback = Math.max(1, min);
  const safeValue =
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const clampedMin = Math.max(1, min);
  const clampedMax =
    typeof max === "number" && Number.isFinite(max)
      ? Math.max(clampedMin, max)
      : Number.POSITIVE_INFINITY;
  return Math.min(clampedMax, Math.max(clampedMin, Math.round(safeValue)));
}
