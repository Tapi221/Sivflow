import type {
  CardLayoutMode,
  CardSetInteractionMode,
  SplitFallbackCardLayoutMode,
} from "@/features/cardsetview/domain/cardLayoutMode";

type LayoutZoomDefaults = Record<
  CardSetInteractionMode,
  Record<CardLayoutMode, number>
>;

export const DEFAULT_SPLIT_FALLBACK_LAYOUT_MODE: SplitFallbackCardLayoutMode =
  "flip";

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
export const LAYOUT_CONSTRAINT_INDICATOR_DURATION_MS = 3000;
