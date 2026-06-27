import { CANONICAL_CARD_WIDTH } from "@/domain/card/cardGeometry.constants";
import type { CardLayoutMode } from "./cardLayoutMode";
import { CARD_VIEW_ZOOM_SLIDER_STEP_PERCENT } from "./cardSetView.constants";
import { CARD_SET_VIEW_DEFAULT_ZOOM_SCALE, CARD_SET_VIEW_FIXED_LAYOUT_SAFETY_ALLOWANCE_PX, CARD_SET_VIEW_SCROLLBAR_RESERVE_PX, CARD_SET_VIEW_SPLIT_LAYOUT_INTERNAL_ALLOWANCE_PX, CARD_SET_VIEW_SPLIT_MIN_PRESENTATION_WIDTH_PX, CARD_SET_VIEW_ZOOM_MIN_BASE_WIDTH_PX } from "./cardSetViewPresentation.constants";
import type { CardDisplayMode } from "@/types/domain/cardSet";



type ResolveZoomWidthArgs = {
  cardLayoutMode: CardLayoutMode;
};
type ResolveCardSetViewDevicePresentationArgs = {
  deviceScope: string;
};



const MOBILE_CARD_SET_VIEW_DEVICE_SCOPE = "mobile";
const MOBILE_CARD_SET_VIEW_ZOOM_PERCENT = 100;



// zoom semantics must remain identical between view/edit.
// interactionMode-dependent behavior belongs outside this policy layer.
const clampZoomPercentRange = (value: number) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(100, safeValue));
};
const resolveSafeStepPercent = (stepPercent: number): number => {
  if (!Number.isFinite(stepPercent) || stepPercent <= 0) {
    return CARD_VIEW_ZOOM_SLIDER_STEP_PERCENT;
  }

  return stepPercent;
};
const roundToStep = (value: number, stepPercent: number): number => {
  const safeValue = clampZoomPercentRange(value);
  const safeStepPercent = resolveSafeStepPercent(stepPercent);
  const roundedValue =
    Math.round(safeValue / safeStepPercent) * safeStepPercent;

  return Number(roundedValue.toFixed(4));
};
const isMobileCardSetViewDevicePresentation = ({ deviceScope }: ResolveCardSetViewDevicePresentationArgs) => {
  return deviceScope === MOBILE_CARD_SET_VIEW_DEVICE_SCOPE;
};
const resolveCardSetViewUsesViewportWidth = ({ deviceScope }: ResolveCardSetViewDevicePresentationArgs) => {
  return isMobileCardSetViewDevicePresentation({ deviceScope });
};
const resolveCardSetViewUsesZoomPreference = ({ deviceScope }: ResolveCardSetViewDevicePresentationArgs) => {
  return !isMobileCardSetViewDevicePresentation({ deviceScope });
};
const resolveCardSetViewZoomPercentOverride = ({ deviceScope }: ResolveCardSetViewDevicePresentationArgs) => {
  return isMobileCardSetViewDevicePresentation({ deviceScope }) ? MOBILE_CARD_SET_VIEW_ZOOM_PERCENT : null;
};
const resolveCardSetViewShowsConstraintIndicator = ({ deviceScope }: ResolveCardSetViewDevicePresentationArgs) => {
  return !isMobileCardSetViewDevicePresentation({ deviceScope });
};
const clampNormalizedZoomPercent = (value: number, stepPercent: number = CARD_VIEW_ZOOM_SLIDER_STEP_PERCENT) => roundToStep(value, stepPercent);
const resolveZoomMinBaseWidthPx = ({ cardLayoutMode }: ResolveZoomWidthArgs) => {
  return CARD_SET_VIEW_ZOOM_MIN_BASE_WIDTH_PX[cardLayoutMode];
};
const clampZoomPercent = (value: number) => clampZoomPercentRange(value);
const resolveZoomPercentForPresentationWidthPx = ({ targetPresentationWidthPx, cardLayoutMode, maxPresentationWidthPx }: { targetPresentationWidthPx: number;
  cardLayoutMode: CardLayoutMode;
  maxPresentationWidthPx: number;
}) => {
  const normalizedMaxWidthPx = Math.max(1, Math.floor(maxPresentationWidthPx));
  const configuredMinWidthPx = resolveZoomMinBaseWidthPx({
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
const resolveZoomDefaultPercent = ({ cardLayoutMode, maxPresentationWidthPx, canonicalCardWidthPx = CANONICAL_CARD_WIDTH, targetZoomScale = CARD_SET_VIEW_DEFAULT_ZOOM_SCALE }: ResolveZoomWidthArgs & { maxPresentationWidthPx: number;
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
    cardLayoutMode,
    maxPresentationWidthPx,
  });
};
const resolveUsablePresentationWidthPx = ({ viewportWidthPx, scrollbarReservePx = CARD_SET_VIEW_SCROLLBAR_RESERVE_PX }: { viewportWidthPx: number;
  scrollbarReservePx?: number;
}) => {
  if (!Number.isFinite(viewportWidthPx) || viewportWidthPx <= 0) {
    return 0;
  }

  return Math.max(0, Math.floor(viewportWidthPx - scrollbarReservePx));
};
const resolveCardSetViewUsablePresentationWidthPx = ({ deviceScope, viewportWidthPx }: ResolveCardSetViewDevicePresentationArgs & { viewportWidthPx: number;
}) => {
  if (resolveCardSetViewUsesViewportWidth({ deviceScope })) {
    if (!Number.isFinite(viewportWidthPx) || viewportWidthPx <= 0) {
      return 0;
    }

    return Math.max(0, Math.floor(viewportWidthPx));
  }

  return resolveUsablePresentationWidthPx({ viewportWidthPx });
};
const resolvePresentationMaxWidthPx = ({ usableWidthPx, displayMode, cardLayoutMode }: { usableWidthPx: number;
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
const resolveCardSetViewMaxPresentationWidthPx = ({ deviceScope, usableWidthPx, displayMode, cardLayoutMode }: ResolveCardSetViewDevicePresentationArgs & { usableWidthPx: number;
  displayMode: CardDisplayMode;
  cardLayoutMode: CardLayoutMode;
}) => {
  if (resolveCardSetViewUsesViewportWidth({ deviceScope })) {
    return Math.max(1, Math.floor(usableWidthPx));
  }

  return resolvePresentationMaxWidthPx({ usableWidthPx, displayMode, cardLayoutMode });
};
const resolveCardSetViewDefaultZoomPercent = ({ deviceScope, cardLayoutMode, maxPresentationWidthPx, canonicalCardWidthPx = CANONICAL_CARD_WIDTH }: ResolveCardSetViewDevicePresentationArgs & ResolveZoomWidthArgs & { maxPresentationWidthPx: number;
  canonicalCardWidthPx?: number;
}) => {
  const zoomPercentOverride = resolveCardSetViewZoomPercentOverride({ deviceScope });
  if ((zoomPercentOverride !== null && zoomPercentOverride !== undefined)) {
    return zoomPercentOverride;
  }

  return resolveZoomDefaultPercent({ cardLayoutMode, maxPresentationWidthPx, canonicalCardWidthPx });
};
const resolveSplitMinimumRequiredWidthPx = ({ displayMode }: { displayMode: CardDisplayMode;
}) => {
  const fixedAllowancePx =
    displayMode === "fixed"
      ? CARD_SET_VIEW_FIXED_LAYOUT_SAFETY_ALLOWANCE_PX
      : 0;

  return (
    CARD_SET_VIEW_SPLIT_MIN_PRESENTATION_WIDTH_PX +
    CARD_SET_VIEW_SPLIT_LAYOUT_INTERNAL_ALLOWANCE_PX +
    fixedAllowancePx
  );
};
const resolveCanUseSplitLayout = ({ viewportWidthPx, displayMode }: { viewportWidthPx: number;
  displayMode: CardDisplayMode;
}) => {
  const usableWidthPx = resolveUsablePresentationWidthPx({ viewportWidthPx });
  return usableWidthPx >= resolveSplitMinimumRequiredWidthPx({ displayMode });
};
const resolveCardSetViewCanUseSplitLayout = ({ deviceScope, viewportWidthPx, displayMode }: ResolveCardSetViewDevicePresentationArgs & { viewportWidthPx: number;
  displayMode: CardDisplayMode;
}) => {
  const usableWidthPx = resolveCardSetViewUsablePresentationWidthPx({ deviceScope, viewportWidthPx });
  return usableWidthPx >= resolveSplitMinimumRequiredWidthPx({ displayMode });
};
const resolvePresentationWidthPx = ({ zoomPercent, cardLayoutMode, maxPresentationWidthPx }: { zoomPercent: number;
  cardLayoutMode: CardLayoutMode;
  maxPresentationWidthPx: number;
}) => {
  const normalizedMaxWidthPx = Math.max(1, Math.floor(maxPresentationWidthPx));
  const configuredMinWidthPx = resolveZoomMinBaseWidthPx({
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
const resolveZoomScaleFromPresentationWidthPx = ({ presentationWidthPx, canonicalCardWidthPx }: { presentationWidthPx: number;
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



export { resolveCardSetViewUsesViewportWidth, resolveCardSetViewUsesZoomPreference, resolveCardSetViewZoomPercentOverride, resolveCardSetViewShowsConstraintIndicator, clampNormalizedZoomPercent, resolveZoomMinBaseWidthPx, clampZoomPercent, resolveZoomPercentForPresentationWidthPx, resolveZoomDefaultPercent, resolveUsablePresentationWidthPx, resolveCardSetViewUsablePresentationWidthPx, resolvePresentationMaxWidthPx, resolveCardSetViewMaxPresentationWidthPx, resolveCardSetViewDefaultZoomPercent, resolveSplitMinimumRequiredWidthPx, resolveCanUseSplitLayout, resolveCardSetViewCanUseSplitLayout, resolvePresentationWidthPx, resolveZoomScaleFromPresentationWidthPx };
