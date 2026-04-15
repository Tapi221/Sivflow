import type {
  CardLayoutMode,
  CardSetInteractionMode,
  SplitFallbackCardLayoutMode,
} from "@/features/cardsetview/domain/cardLayoutMode";

type LayoutWidthDefaults = Record<
  CardSetInteractionMode,
  Record<CardLayoutMode, number>
>;
type LayoutZoomDefaults = Record<
  CardSetInteractionMode,
  Record<CardLayoutMode, number>
>;

export const DEFAULT_SPLIT_FALLBACK_LAYOUT_MODE: SplitFallbackCardLayoutMode =
  "flip";

export const ZOOM_MIN_BASE_WIDTH_PX: LayoutWidthDefaults = {
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

export const ZOOM_DEFAULT_PERCENT: LayoutZoomDefaults = {
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

export const META_PANEL_BASE_WIDTH_PX = 320;
export const SCROLLBAR_RESERVE_PX = 16;
export const FIXED_LAYOUT_SAFETY_ALLOWANCE_PX = 24;
export const SPLIT_LAYOUT_INTERNAL_ALLOWANCE_PX = 24;
export const LAYOUT_CONSTRAINT_INDICATOR_DURATION_MS = 3000;
