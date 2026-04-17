import type {
  CardLayoutMode,
  CardSetInteractionMode,
} from "@/features/cardsetview/domain/cardLayoutMode";

type LayoutWidthThresholds = Record<
  CardSetInteractionMode,
  Record<CardLayoutMode, number>
>;

export const ZOOM_MIN_BASE_WIDTH_PX: LayoutWidthThresholds = {
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

export const SCROLLBAR_RESERVE_PX = 16;
export const FIXED_LAYOUT_SAFETY_ALLOWANCE_PX = 24;
export const SPLIT_LAYOUT_INTERNAL_ALLOWANCE_PX = 24;
