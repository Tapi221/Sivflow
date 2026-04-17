import {
  CARD_VIEW_ZOOM_DEFAULT_PERCENT,
  CARD_VIEW_ZOOM_STEP_PERCENT,
} from "@constants/shared/cardSetView";

type ClampZoomPercentOptions = {
  minPercent: number;
  maxPercent: number;
  stepPercent?: number;
};

type ResolveZoomBoundsArgs = {
  viewportWidthPx: number;
  canonicalCardWidthPx: number;
  minPercent: number;
  defaultPercent?: number;
  stepPercent?: number;
};

const roundToStep = (value: number, stepPercent: number) => {
  return Math.round(value / stepPercent) * stepPercent;
};

export const computeDynamicMaxZoomPercent = ({
  viewportWidthPx,
  canonicalCardWidthPx,
  stepPercent = CARD_VIEW_ZOOM_STEP_PERCENT,
  fallbackPercent = CARD_VIEW_ZOOM_DEFAULT_PERCENT,
}: {
  viewportWidthPx: number;
  canonicalCardWidthPx: number;
  stepPercent?: number;
  fallbackPercent?: number;
}) => {
  if (
    !Number.isFinite(viewportWidthPx) ||
    viewportWidthPx <= 0 ||
    !Number.isFinite(canonicalCardWidthPx) ||
    canonicalCardWidthPx <= 0
  ) {
    return fallbackPercent;
  }

  const rawPercent = (viewportWidthPx / canonicalCardWidthPx) * 100;
  const snapped = Math.floor(rawPercent / stepPercent) * stepPercent;

  return Math.max(stepPercent, snapped);
};

export const clampZoomPercent = (
  value: number,
  {
    minPercent,
    maxPercent,
    stepPercent = CARD_VIEW_ZOOM_STEP_PERCENT,
  }: ClampZoomPercentOptions,
) => {
  const resolvedMax = Math.max(stepPercent, maxPercent);
  const resolvedMin = Math.min(minPercent, resolvedMax);
  const safeValue = Number.isFinite(value) ? value : resolvedMin;
  const snapped = roundToStep(safeValue, stepPercent);

  return Math.min(resolvedMax, Math.max(resolvedMin, snapped));
};

export const resolveZoomBounds = ({
  viewportWidthPx,
  canonicalCardWidthPx,
  minPercent,
  defaultPercent = CARD_VIEW_ZOOM_DEFAULT_PERCENT,
  stepPercent = CARD_VIEW_ZOOM_STEP_PERCENT,
}: ResolveZoomBoundsArgs) => {
  const maxZoomPercent = computeDynamicMaxZoomPercent({
    viewportWidthPx,
    canonicalCardWidthPx,
    stepPercent,
    fallbackPercent: defaultPercent,
  });

  const effectiveMinZoomPercent = Math.min(minPercent, maxZoomPercent);

  const defaultZoomPercent = clampZoomPercent(defaultPercent, {
    minPercent: effectiveMinZoomPercent,
    maxPercent: maxZoomPercent,
    stepPercent,
  });

  return {
    minZoomPercent: effectiveMinZoomPercent,
    maxZoomPercent,
    defaultZoomPercent,
  };
};

export const resolveZoomScale = (zoomPercent: number) => {
  return zoomPercent / 100;
};

export const resolveFixedCardWidthPx = ({
  canonicalCardWidthPx,
  zoomPercent,
}: {
  canonicalCardWidthPx: number;
  zoomPercent: number;
}) => {
  return Math.max(
    1,
    Math.round(canonicalCardWidthPx * resolveZoomScale(zoomPercent)),
  );
};

export const resolveAvailableWidthPx = (viewportWidthPx: number) => {
  return Math.max(1, Math.floor(viewportWidthPx));
};
