import type {
  CardLayoutMode,
  CardSetInteractionMode,
} from "@/features/cardsetview/domain/cardLayoutMode";
import {
  FIXED_LAYOUT_SAFETY_ALLOWANCE_PX,
  SCROLLBAR_RESERVE_PX,
  SPLIT_LAYOUT_INTERNAL_ALLOWANCE_PX,
  ZOOM_DEFAULT_PERCENT,
  ZOOM_MIN_BASE_WIDTH_PX,
} from "@/features/cardsetview/domain/cardSetViewPresentationDefaults";
import { CARD_VIEW_ZOOM_STEP_PERCENT } from "@/features/cardsetview/constants";
import type { CardDisplayMode } from "@/types/domain/cardSet";

type ResolveZoomWidthArgs = {
  interactionMode: CardSetInteractionMode;
  cardLayoutMode: CardLayoutMode;
};

const roundToStep = (value: number, stepPercent: number) => {
  if (!Number.isFinite(value)) return 0;
  if (stepPercent <= 0) return Math.round(value);
  return Math.round(value / stepPercent) * stepPercent;
};

export const clampNormalizedZoomPercent = (
  value: number,
  stepPercent = CARD_VIEW_ZOOM_STEP_PERCENT,
) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const snapped = roundToStep(safeValue, stepPercent);
  return Math.max(0, Math.min(100, snapped));
};

export const resolveZoomMinBaseWidthPx = ({
  interactionMode,
  cardLayoutMode,
}: ResolveZoomWidthArgs) => {
  return ZOOM_MIN_BASE_WIDTH_PX[interactionMode][cardLayoutMode];
};

export const resolveZoomDefaultPercent = ({
  interactionMode,
  cardLayoutMode,
}: ResolveZoomWidthArgs) => {
  return clampNormalizedZoomPercent(
    ZOOM_DEFAULT_PERCENT[interactionMode][cardLayoutMode],
  );
};

export const resolveUsablePresentationWidthPx = ({
  viewportWidthPx,
  scrollbarReservePx = SCROLLBAR_RESERVE_PX,
}: {
  viewportWidthPx: number;
  scrollbarReservePx?: number;
}) => {
  if (!Number.isFinite(viewportWidthPx) || viewportWidthPx <= 0) {
    return 0;
  }

  return Math.max(0, Math.floor(viewportWidthPx - scrollbarReservePx));
};

export const resolvePresentationMaxWidthPx = ({
  usableWidthPx,
  displayMode,
  cardLayoutMode,
}: {
  usableWidthPx: number;
  displayMode: CardDisplayMode;
  cardLayoutMode: CardLayoutMode;
}) => {
  const fixedAllowancePx =
    displayMode === "fixed" ? FIXED_LAYOUT_SAFETY_ALLOWANCE_PX : 0;
  const splitAllowancePx =
    cardLayoutMode === "split" ? SPLIT_LAYOUT_INTERNAL_ALLOWANCE_PX : 0;

  return Math.max(
    1,
    Math.floor(usableWidthPx - fixedAllowancePx - splitAllowancePx),
  );
};

export const resolveSplitMinimumRequiredWidthPx = ({
  interactionMode,
  displayMode,
}: {
  interactionMode: CardSetInteractionMode;
  displayMode: CardDisplayMode;
}) => {
  const baseMinWidthPx = resolveZoomMinBaseWidthPx({
    interactionMode,
    cardLayoutMode: "split",
  });

  const fixedAllowancePx =
    displayMode === "fixed" ? FIXED_LAYOUT_SAFETY_ALLOWANCE_PX : 0;

  return baseMinWidthPx + SPLIT_LAYOUT_INTERNAL_ALLOWANCE_PX + fixedAllowancePx;
};

export const resolveCanUseSplitLayout = ({
  viewportWidthPx,
  interactionMode,
  displayMode,
}: {
  viewportWidthPx: number;
  interactionMode: CardSetInteractionMode;
  displayMode: CardDisplayMode;
}) => {
  const usableWidthPx = resolveUsablePresentationWidthPx({ viewportWidthPx });
  return (
    usableWidthPx >=
    resolveSplitMinimumRequiredWidthPx({
      interactionMode,
      displayMode,
    })
  );
};

export const resolvePresentationWidthPx = ({
  zoomPercent,
  interactionMode,
  cardLayoutMode,
  maxPresentationWidthPx,
}: {
  zoomPercent: number;
  interactionMode: CardSetInteractionMode;
  cardLayoutMode: CardLayoutMode;
  maxPresentationWidthPx: number;
}) => {
  const normalizedMaxWidthPx = Math.max(1, Math.floor(maxPresentationWidthPx));
  const configuredMinWidthPx = resolveZoomMinBaseWidthPx({
    interactionMode,
    cardLayoutMode,
  });

  const effectiveMinWidthPx = Math.min(
    configuredMinWidthPx,
    normalizedMaxWidthPx,
  );
  const ratio = clampNormalizedZoomPercent(zoomPercent) / 100;
  const resolvedWidthPx =
    effectiveMinWidthPx + (normalizedMaxWidthPx - effectiveMinWidthPx) * ratio;

  return Math.max(1, Math.round(resolvedWidthPx));
};

export const resolveZoomScaleFromPresentationWidthPx = ({
  presentationWidthPx,
  canonicalCardWidthPx,
}: {
  presentationWidthPx: number;
  canonicalCardWidthPx: number;
}) => {
  if (
    !Number.isFinite(presentationWidthPx) ||
    presentationWidthPx <= 0 ||
    !Number.isFinite(canonicalCardWidthPx) ||
    canonicalCardWidthPx <= 0
  ) {
    return 1;
  }

  return presentationWidthPx / canonicalCardWidthPx;
};
