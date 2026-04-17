import type {
  CardLayoutMode,
  CardSetInteractionMode,
} from "@/features/cardsetview/domain/cardLayoutMode";

type CardSetViewLayoutWidthThresholds = Record<
  CardSetInteractionMode,
  Record<CardLayoutMode, number>
>;

type CardSetViewLayoutZoomDefaults = Record<
  CardSetInteractionMode,
  Record<CardLayoutMode, number>
>;

export const CARD_SET_VIEW_ZOOM_MIN_BASE_WIDTH_PX: CardSetViewLayoutWidthThresholds =
  {
    view: {
      flip: 360,
      stack: 360,
      split: 760,
    },
    edit: {
      flip: 400,
      stack: 400,
      split: 840,
    },
  };

export const CARD_SET_VIEW_ZOOM_DEFAULT_PERCENT: CardSetViewLayoutZoomDefaults =
  {
    view: {
      flip: 62,
      stack: 58,
      split: 42,
    },
    edit: {
      flip: 52,
      stack: 48,
      split: 30,
    },
  };

export const CARD_SET_VIEW_SCROLLBAR_RESERVE_PX = 16;
export const CARD_SET_VIEW_FIXED_LAYOUT_SAFETY_ALLOWANCE_PX = 24;
export const CARD_SET_VIEW_SPLIT_LAYOUT_INTERNAL_ALLOWANCE_PX = 24;
export const CARD_SET_VIEW_META_PANEL_BASE_WIDTH_PX = 320;
export const CARD_SET_VIEW_LAYOUT_CONSTRAINT_INDICATOR_DURATION_MS = 3000;
