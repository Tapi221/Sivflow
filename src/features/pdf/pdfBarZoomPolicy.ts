import * as C from "@/features/pdf/pdf.constants.desktop";

const clampRange = (value: number, min: number, max: number) => {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);

  return Math.min(Math.max(value, lower), upper);
};

const roundNumber = (value: number, precision: number) => {
  return Number(value.toFixed(precision));
};

const resolveSafeFitScale = (fitScale: number) => {
  if (!Number.isFinite(fitScale) || fitScale <= 0) {
    return 1;
  }

  return clampRange(fitScale, C.FIT_MIN_SCALE, C.FIT_MAX_SCALE);
};

export const clampPdfBarZoomPercent = (value: number) => {
  if (!Number.isFinite(value)) {
    return C.PDF_BAR_MIN_PERCENT;
  }

  return clampRange(
    Math.round(value),
    C.PDF_BAR_MIN_PERCENT,
    C.PDF_BAR_MAX_PERCENT,
  );
};

export const clampPdfGestureZoomScale = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return C.PDF_GESTURE_MIN_SCALE;
  }

  return roundNumber(
    clampRange(value, C.PDF_GESTURE_MIN_SCALE, C.PDF_GESTURE_MAX_SCALE),
    3,
  );
};

export const resolvePdfBarRenderRatio = ({
  zoomPercent,
}: {
  zoomPercent: number;
}) => {
  const clampedPercent = clampPdfBarZoomPercent(zoomPercent);
  const normalizedPercent = clampedPercent / 100;
  const ratioRange = C.PDF_BAR_MAX_RENDER_RATIO - C.PDF_BAR_MIN_RENDER_RATIO;

  if (!Number.isFinite(ratioRange) || ratioRange <= 0) {
    return C.PDF_BAR_MAX_RENDER_RATIO;
  }

  return roundNumber(
    C.PDF_BAR_MIN_RENDER_RATIO + normalizedPercent * ratioRange,
    4,
  );
};

export const resolvePdfBarRenderScale = ({
  zoomPercent,
  fitScale,
}: {
  zoomPercent: number;
  fitScale: number;
}) => {
  const safeFitScale = resolveSafeFitScale(fitScale);
  const renderRatio = resolvePdfBarRenderRatio({ zoomPercent });

  return roundNumber(safeFitScale * renderRatio, 3);
};

export const resolvePdfBarZoomPercentFromRenderScale = ({
  renderScale,
  fitScale,
}: {
  renderScale: number;
  fitScale: number;
}) => {
  const safeFitScale = resolveSafeFitScale(fitScale);
  const safeRenderScale =
    Number.isFinite(renderScale) && renderScale > 0
      ? clampRange(renderScale, C.FIT_MIN_SCALE, C.FIT_MAX_SCALE)
      : safeFitScale;
  const ratioRange = C.PDF_BAR_MAX_RENDER_RATIO - C.PDF_BAR_MIN_RENDER_RATIO;

  if (!Number.isFinite(ratioRange) || ratioRange <= 0) {
    return C.PDF_BAR_MAX_PERCENT;
  }

  const boundedRatio = clampRange(
    safeRenderScale / safeFitScale,
    C.PDF_BAR_MIN_RENDER_RATIO,
    C.PDF_BAR_MAX_RENDER_RATIO,
  );
  const normalizedPercent =
    ((boundedRatio - C.PDF_BAR_MIN_RENDER_RATIO) / ratioRange) * 100;

  return clampPdfBarZoomPercent(normalizedPercent);
};
