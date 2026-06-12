import { CARD_PANE_VIEW_DEFAULT_WIDTH_PX, CARD_PANE_VIEW_MIN_WIDTH_PX } from "@/components/card/frame/cardPane.constants";
import { CANONICAL_CARD_WIDTH } from "@/domain/card/cardGeometry.constants";
import { CARD_VIEW_DEFAULT_ZOOM_PERCENT, CARD_VIEW_MIN_ZOOM_PERCENT, CARD_VIEW_ZOOM_STEP_PERCENT } from "@/features/cardsetview/domain/cardSetView.constants";



const CARD_VIEW_DEFAULT_WIDTH_PX = CARD_PANE_VIEW_DEFAULT_WIDTH_PX;
const CARD_VIEW_MIN_WIDTH_PX = CARD_PANE_VIEW_MIN_WIDTH_PX;



const sanitizePositiveNumber = (value: number, fallback: number) => {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
};
const roundDownToStep = (value: number, step: number) => {
  const safeStep = sanitizePositiveNumber(step, CARD_VIEW_ZOOM_STEP_PERCENT);
  return Math.floor(value / safeStep) * safeStep;
};
const zoomPercentToFactor = (zoomPercent: number) => {
  return (sanitizePositiveNumber(zoomPercent, CARD_VIEW_DEFAULT_ZOOM_PERCENT) / 100);
};
const zoomPercentToFixedCardWidthPx = (zoomPercent: number) => {
  return Math.max(1, Math.round(CANONICAL_CARD_WIDTH * zoomPercentToFactor(zoomPercent)));
};
const computeDynamicMaxZoomPercent = ({ availableWidthPx, baseCardWidthPx = CANONICAL_CARD_WIDTH, stepPercent = CARD_VIEW_ZOOM_STEP_PERCENT }: { availableWidthPx: number;
  baseCardWidthPx?: number;
  stepPercent?: number;
}) => {
  const safeAvailableWidthPx = sanitizePositiveNumber(
    availableWidthPx,
    CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
  );
  const safeBaseCardWidthPx = sanitizePositiveNumber(
    baseCardWidthPx,
    CANONICAL_CARD_WIDTH,
  );
  const rawPercent = (safeAvailableWidthPx / safeBaseCardWidthPx) * 100;
  const steppedPercent = roundDownToStep(rawPercent, stepPercent);

  return Math.max(stepPercent, steppedPercent);
};
const clampZoomPercent = ({ value, minZoomPercent, maxZoomPercent }: { value: number;
  minZoomPercent: number;
  maxZoomPercent: number;
}) => {
  const safeMin = sanitizePositiveNumber(
    minZoomPercent,
    CARD_VIEW_MIN_ZOOM_PERCENT,
  );
  const safeMax = Math.max(
    safeMin,
    sanitizePositiveNumber(maxZoomPercent, CARD_VIEW_DEFAULT_ZOOM_PERCENT),
  );
  const safeValue = sanitizePositiveNumber(
    value,
    CARD_VIEW_DEFAULT_ZOOM_PERCENT,
  );

  return Math.min(safeMax, Math.max(safeMin, safeValue));
};
const snapZoomPercent = ({ value, stepPercent = CARD_VIEW_ZOOM_STEP_PERCENT }: { value: number;
  stepPercent?: number;
}) => {
  const safeStep = sanitizePositiveNumber(
    stepPercent,
    CARD_VIEW_ZOOM_STEP_PERCENT,
  );
  const safeValue = sanitizePositiveNumber(
    value,
    CARD_VIEW_DEFAULT_ZOOM_PERCENT,
  );

  return Math.round(safeValue / safeStep) * safeStep;
};
const normalizeZoomPercent = ({ value, minZoomPercent, maxZoomPercent, stepPercent = CARD_VIEW_ZOOM_STEP_PERCENT }: { value: number;
  minZoomPercent: number;
  maxZoomPercent: number;
  stepPercent?: number;
}) => {
  const snapped = snapZoomPercent({ value, stepPercent });

  return clampZoomPercent({
    value: snapped,
    minZoomPercent,
    maxZoomPercent,
  });
};



export { CARD_VIEW_DEFAULT_ZOOM_PERCENT, CARD_VIEW_MIN_ZOOM_PERCENT, CARD_VIEW_ZOOM_STEP_PERCENT, zoomPercentToFactor, zoomPercentToFixedCardWidthPx, computeDynamicMaxZoomPercent, clampZoomPercent, snapZoomPercent, normalizeZoomPercent, CARD_VIEW_DEFAULT_WIDTH_PX, CARD_VIEW_MIN_WIDTH_PX };
