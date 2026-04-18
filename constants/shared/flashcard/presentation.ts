type CardLayoutMode = "stack" | "flip" | "split";

type CardSetViewLayoutWidthThresholds = Record<CardLayoutMode, number>;

export const CARD_SET_VIEW_ZOOM_MIN_BASE_WIDTH_PX: CardSetViewLayoutWidthThresholds =
  {
    flip: 360,
    stack: 360,
    split: 360,
  };

export const CARD_SET_VIEW_SPLIT_MIN_PRESENTATION_WIDTH_PX = 760;

export const CARD_SET_VIEW_DEFAULT_ZOOM_SCALE = 1;

export const CARD_SET_VIEW_SCROLLBAR_RESERVE_PX = 16;
export const CARD_SET_VIEW_FIXED_LAYOUT_SAFETY_ALLOWANCE_PX = 24;
export const CARD_SET_VIEW_SPLIT_LAYOUT_INTERNAL_ALLOWANCE_PX = 24;
export const CARD_SET_VIEW_META_PANEL_BASE_WIDTH_PX = 320;
export const CARD_SET_VIEW_LAYOUT_CONSTRAINT_INDICATOR_DURATION_MS = 3000;
