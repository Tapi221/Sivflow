import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { CARD_VIEW_ZOOM_GESTURE_STEP_PERCENT, CARD_VIEW_ZOOM_WHEEL_STEP_PERCENT } from "@/features/cardsetview/domain/cardSetView.constants";
import { clampNormalizedZoomPercent, resolveZoomPercentForPresentationWidthPx } from "@/features/cardsetview/domain/cardSetViewPresentationPolicy";
import { resolveWheelZoomStepCount } from "@/utils/zoom/wheelZoomMath";
import { DEFAULT_ZOOM_INPUT_IGNORE_SELECTOR, shouldHandleZoomInputTarget } from "@/utils/zoom/zoomInputTarget";



const CARD_SET_VIEW_ZOOM_INPUT_IGNORE_SELECTOR = [
  DEFAULT_ZOOM_INPUT_IGNORE_SELECTOR,
  "[data-card-zoom-input-ignore='true']",
].join(",");



const clampZoomPercentToBounds = (
  value: number,
  minZoomPercent: number,
  maxZoomPercent: number,
) => {
  const lowerBound = Math.min(minZoomPercent, maxZoomPercent);
  const upperBound = Math.max(minZoomPercent, maxZoomPercent);
  return Math.min(Math.max(value, lowerBound), upperBound);
};
const normalizeZoomPercentWithinBounds = ({
  value,
  stepPercent,
  minZoomPercent,
  maxZoomPercent,
}: {
  value: number;
  stepPercent: number;
  minZoomPercent: number;
  maxZoomPercent: number;
}) =>
  clampZoomPercentToBounds(
    clampNormalizedZoomPercent(value, stepPercent),
    minZoomPercent,
    maxZoomPercent,
  );
const shouldHandleCardSetViewZoomInputTarget = ({ container, target }: { container: HTMLElement | null;
  target: EventTarget | null;
}) => {
  return shouldHandleZoomInputTarget({
    container,
    target,
    ignoreSelector: CARD_SET_VIEW_ZOOM_INPUT_IGNORE_SELECTOR,
  });
};
const computeNextCardSetViewZoomPercentFromWheel = ({ currentZoomPercent, deltaY, minZoomPercent, maxZoomPercent, stepPercent = CARD_VIEW_ZOOM_WHEEL_STEP_PERCENT, deltaPerStep = 80 }: { currentZoomPercent: number;
  deltaY: number;
  minZoomPercent: number;
  maxZoomPercent: number;
  stepPercent?: number;
  deltaPerStep?: number;
}): number | null => {
  if (!Number.isFinite(currentZoomPercent) || !Number.isFinite(deltaY)) {
    return null;
  }

  const direction = Math.sign(deltaY);
  if (!direction) {
    return null;
  }

  const stepCount = resolveWheelZoomStepCount({ deltaY, deltaPerStep });
  const rawNextPercent =
    direction > 0
      ? currentZoomPercent - stepPercent * stepCount
      : currentZoomPercent + stepPercent * stepCount;

  return normalizeZoomPercentWithinBounds({
    value: rawNextPercent,
    stepPercent,
    minZoomPercent,
    maxZoomPercent,
  });
};
const computeNextCardSetViewZoomPercentFromGesture = ({ currentZoomPercent, basePresentationWidthPx, gestureScale, cardLayoutMode, maxPresentationWidthPx, minZoomPercent, maxZoomPercent, stepPercent = CARD_VIEW_ZOOM_GESTURE_STEP_PERCENT }: { currentZoomPercent: number;
  basePresentationWidthPx: number;
  gestureScale: number;
  cardLayoutMode: CardLayoutMode;
  maxPresentationWidthPx: number;
  minZoomPercent: number;
  maxZoomPercent: number;
  stepPercent?: number;
}): number | null => {
  if (!Number.isFinite(currentZoomPercent)) {
    return null;
  }

  if (!Number.isFinite(gestureScale) || gestureScale <= 0) {
    return null;
  }

  if (Math.abs(gestureScale - 1) < 0.0005) {
    return currentZoomPercent;
  }

  if (
    !Number.isFinite(basePresentationWidthPx) ||
    basePresentationWidthPx <= 0 ||
    !Number.isFinite(maxPresentationWidthPx) ||
    maxPresentationWidthPx <= 0
  ) {
    return null;
  }

  const rawNextPercent = resolveZoomPercentForPresentationWidthPx({
    targetPresentationWidthPx: basePresentationWidthPx * gestureScale,
    cardLayoutMode,
    maxPresentationWidthPx,
  });

  return normalizeZoomPercentWithinBounds({
    value: rawNextPercent,
    stepPercent,
    minZoomPercent,
    maxZoomPercent,
  });
};



export { shouldHandleCardSetViewZoomInputTarget, computeNextCardSetViewZoomPercentFromWheel, computeNextCardSetViewZoomPercentFromGesture };
