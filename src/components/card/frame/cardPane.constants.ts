type CardPaneMode = "view" | "edit";



const CARD_PANE_VIEW_DEFAULT_WIDTH_PX = 576;
const CARD_PANE_EDIT_DEFAULT_WIDTH_PX = 1000;
const CARD_PANE_VIEW_MIN_WIDTH_PX = 360;
const CARD_PANE_EDIT_MIN_WIDTH_PX = 640;
const CARD_PANE_EDITOR_DEFAULT_WIDTH_PX = 820;
const CARD_PANE_EDITOR_DOCKED_DEFAULT_WIDTH_PX = 1000;
const CARD_PANE_WIDTH_STEP_PX = 40;
const CARD_PANE_AUTO_MAX_SCALE = 4;
const CARD_PANE_WIDTH_CONTROL_CLEARANCE_PX = 72;



const clampPaneWidthPx = (value: number | null | undefined, min: number, max?: number) => {
  const fallback = Math.max(1, min);
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const clampedMin = Math.max(1, min);
  const clampedMax = typeof max === "number" && Number.isFinite(max) ? Math.max(clampedMin, max) : Number.POSITIVE_INFINITY;

  return Math.min(clampedMax, Math.max(clampedMin, Math.round(safeValue)));
};



export { CARD_PANE_AUTO_MAX_SCALE, CARD_PANE_EDIT_DEFAULT_WIDTH_PX, CARD_PANE_EDIT_MIN_WIDTH_PX, CARD_PANE_EDITOR_DEFAULT_WIDTH_PX, CARD_PANE_EDITOR_DOCKED_DEFAULT_WIDTH_PX, CARD_PANE_VIEW_DEFAULT_WIDTH_PX, CARD_PANE_VIEW_MIN_WIDTH_PX, CARD_PANE_WIDTH_CONTROL_CLEARANCE_PX, CARD_PANE_WIDTH_STEP_PX, clampPaneWidthPx };


export type { CardPaneMode };
