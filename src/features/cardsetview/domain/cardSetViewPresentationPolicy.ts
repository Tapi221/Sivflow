import { CANONICAL_CARD_WIDTH } from "@constants/shared/flashcard";
import type {
  CardLayoutMode,
  CardSetInteractionMode,
} from "@/features/cardsetview/domain/cardLayoutMode";
import {
  CARD_SET_VIEW_DEFAULT_ZOOM_SCALE,
  CARD_SET_VIEW_FIXED_LAYOUT_SAFETY_ALLOWANCE_PX,
  CARD_SET_VIEW_SCROLLBAR_RESERVE_PX,
  CARD_SET_VIEW_SPLIT_MIN_PRESENTATION_WIDTH_PX,
  CARD_SET_VIEW_SPLIT_LAYOUT_INTERNAL_ALLOWANCE_PX,
  CARD_SET_VIEW_ZOOM_MIN_BASE_WIDTH_PX,
} from "@constants/shared/flashcard";
import { CARD_VIEW_ZOOM_STEP_PERCENT } from "@constants/shared/flashcard";
import type { CardDisplayMode } from "@/types/domain/cardSet";

type ResolveZoomWidthArgs = {
  interactionMode: CardSetInteractionMode;
  cardLayoutMode: CardLayoutMode;
};

const clampZoomPercentRange = (value: number) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(100, safeValue));
};

const roundToStep = (value: number, stepPercent: number) => {
  const safeValue = clampZoomPercentRange(value);
  if (stepPercent <= 0) return safeValue;
  return Math.round(safeValue / stepPercent) * stepPercent;
};

export const clampNormalizedZoomPercent = (
  value: number,
  stepPercent = CARD_VIEW_ZOOM_STEP_PERCENT,
) => roundToStep(value, stepPercent);

export const resolveZoomMinBaseWidthPx = ({
  interactionMode,
  cardLayoutMode,
}: ResolveZoomWidthArgs) => {
  return CARD_SET_VIEW_ZOOM_MIN_BASE_WIDTH_PX[interactionMode][cardLayoutMode];
};

export const clampZoomPercent = (value: number) => clampZoomPercentRange(value);

export const resolveZoomPercentForPresentationWidthPx = ({
  targetPresentationWidthPx,
  interactionMode,
  cardLayoutMode,
  maxPresentationWidthPx,
}: {
  targetPresentationWidthPx: number;
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
  const safeTargetWidthPx =
    Number.isFinite(targetPresentationWidthPx) && targetPresentationWidthPx > 0
      ? targetPresentationWidthPx
      : effectiveMinWidthPx;
  const clampedTargetWidthPx = Math.max(
    effectiveMinWidthPx,
    Math.min(normalizedMaxWidthPx, safeTargetWidthPx),
  );

  if (normalizedMaxWidthPx <= effectiveMinWidthPx) {
    return 0;
  }

  return clampZoomPercent(
    ((clampedTargetWidthPx - effectiveMinWidthPx) /
      (normalizedMaxWidthPx - effectiveMinWidthPx)) *
      100,
  );
};

export const resolveZoomDefaultPercent = ({
  interactionMode,
  cardLayoutMode,
  maxPresentationWidthPx,
  canonicalCardWidthPx = CANONICAL_CARD_WIDTH,
  targetZoomScale = CARD_SET_VIEW_DEFAULT_ZOOM_SCALE,
}: ResolveZoomWidthArgs & {
  maxPresentationWidthPx: number;
  canonicalCardWidthPx?: number;
  targetZoomScale?: number;
}) => {
  const safeCanonicalCardWidthPx =
    Number.isFinite(canonicalCardWidthPx) && canonicalCardWidthPx > 0
      ? canonicalCardWidthPx
      : CANONICAL_CARD_WIDTH;
  const safeTargetZoomScale =
    Number.isFinite(targetZoomScale) && targetZoomScale > 0
      ? targetZoomScale
      : CARD_SET_VIEW_DEFAULT_ZOOM_SCALE;

  return resolveZoomPercentForPresentationWidthPx({
    targetPresentationWidthPx: safeCanonicalCardWidthPx * safeTargetZoomScale,
    interactionMode,
    cardLayoutMode,
    maxPresentationWidthPx,
  });
};

export const resolveUsablePresentationWidthPx = ({
  viewportWidthPx,
  scrollbarReservePx = CARD_SET_VIEW_SCROLLBAR_RESERVE_PX,
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
    displayMode === "fixed"
      ? CARD_SET_VIEW_FIXED_LAYOUT_SAFETY_ALLOWANCE_PX
      : 0;
  const splitAllowancePx =
    cardLayoutMode === "split"
      ? CARD_SET_VIEW_SPLIT_LAYOUT_INTERNAL_ALLOWANCE_PX
      : 0;

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
  const baseMinPresentationWidthPx =
    CARD_SET_VIEW_SPLIT_MIN_PRESENTATION_WIDTH_PX[interactionMode];

  const fixedAllowancePx =
    displayMode === "fixed"
      ? CARD_SET_VIEW_FIXED_LAYOUT_SAFETY_ALLOWANCE_PX
      : 0;

  return (
    baseMinPresentationWidthPx +
    CARD_SET_VIEW_SPLIT_LAYOUT_INTERNAL_ALLOWANCE_PX +
    fixedAllowancePx
  );
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
  const ratio = clampZoomPercent(zoomPercent) / 100;
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
