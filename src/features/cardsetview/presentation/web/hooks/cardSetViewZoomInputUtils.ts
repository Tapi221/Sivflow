import { CARD_VIEW_ZOOM_STEP_PERCENT } from "@constants/shared/flashcard";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import {
  clampNormalizedZoomPercent,
  resolveZoomPercentForPresentationWidthPx,
} from "@/features/cardsetview/domain/cardSetViewPresentationPolicy";

const CARD_SET_VIEW_ZOOM_INPUT_IGNORE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  "summary",
  "a[href]",
  "[role='button']",
  "[role='slider']",
  "[contenteditable]:not([contenteditable='false'])",
  "[data-card-zoom-input-ignore='true']",
].join(",");

const resolveEventTargetElement = (target: EventTarget | null): Element | null => {
  if (typeof Element !== "undefined" && target instanceof Element) {
    return target;
  }

  if (typeof Node !== "undefined" && target instanceof Node) {
    return target.parentElement;
  }

  return null;
};

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
  stepPercent = CARD_VIEW_ZOOM_STEP_PERCENT,
  minZoomPercent,
  maxZoomPercent,
}: {
  value: number;
  stepPercent?: number;
  minZoomPercent: number;
  maxZoomPercent: number;
}) =>
  clampZoomPercentToBounds(
    clampNormalizedZoomPercent(value, stepPercent),
    minZoomPercent,
    maxZoomPercent,
  );

const resolveWheelZoomStepCount = ({
  deltaY,
  deltaPerStep = 80,
}: {
  deltaY: number;
  deltaPerStep?: number;
}) => {
  const safeDeltaPerStep =
    Number.isFinite(deltaPerStep) && deltaPerStep > 0 ? deltaPerStep : 80;

  return Math.max(1, Math.round(Math.abs(deltaY) / safeDeltaPerStep));
};

export const shouldHandleCardSetViewZoomInputTarget = ({
  container,
  target,
}: {
  container: HTMLElement | null;
  target: EventTarget | null;
}) => {
  if (!container) {
    return false;
  }

  const targetElement = resolveEventTargetElement(target);
  if (!targetElement) {
    return false;
  }

  if (!container.contains(targetElement)) {
    return false;
  }

  return !Boolean(
    targetElement.closest(CARD_SET_VIEW_ZOOM_INPUT_IGNORE_SELECTOR),
  );
};

export const computeNextCardSetViewZoomPercentFromWheel = ({
  currentZoomPercent,
  deltaY,
  minZoomPercent,
  maxZoomPercent,
  stepPercent = CARD_VIEW_ZOOM_STEP_PERCENT,
  deltaPerStep = 80,
}: {
  currentZoomPercent: number;
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

export const computeNextCardSetViewZoomPercentFromGesture = ({
  currentZoomPercent,
  basePresentationWidthPx,
  gestureScale,
  cardLayoutMode,
  maxPresentationWidthPx,
  minZoomPercent,
  maxZoomPercent,
  stepPercent = CARD_VIEW_ZOOM_STEP_PERCENT,
}: {
  currentZoomPercent: number;
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
