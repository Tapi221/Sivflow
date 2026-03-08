export const normalizeScale = (value: number): number =>
  Number(value.toFixed(3));

export const clampScale = (
  value: number,
  minScale: number,
  maxScale: number,
): number => {
  const lower = Math.min(minScale, maxScale);
  const upper = Math.max(minScale, maxScale);
  return Math.min(Math.max(value, lower), upper);
};

export const computeNextScaleFromWheel = ({
  currentScale,
  deltaY,
  zoomStep,
  minScale,
  maxScale,
}: {
  currentScale: number;
  deltaY: number;
  zoomStep: number;
  minScale: number;
  maxScale: number;
}): number | null => {
  if (!Number.isFinite(currentScale) || !Number.isFinite(deltaY)) return null;
  const direction = Math.sign(deltaY);
  if (!direction) return null;

  const step = Math.max(0.001, Number.isFinite(zoomStep) ? zoomStep : 0.1);
  const rawNextScale =
    direction > 0 ? currentScale - step : currentScale + step;
  return normalizeScale(clampScale(rawNextScale, minScale, maxScale));
};

export const computeNextScaleFromGesture = ({
  currentScale,
  baseScale,
  gestureScale,
  minScale,
  maxScale,
}: {
  currentScale: number;
  baseScale: number | null;
  gestureScale: number;
  minScale: number;
  maxScale: number;
}): number | null => {
  if (!Number.isFinite(currentScale)) return null;
  if (!Number.isFinite(gestureScale) || gestureScale <= 0) return null;

  const effectiveBaseScale =
    typeof baseScale === "number" && Number.isFinite(baseScale)
      ? baseScale
      : currentScale;
  const rawNextScale = effectiveBaseScale * gestureScale;
  if (!Number.isFinite(rawNextScale)) return null;

  return normalizeScale(clampScale(rawNextScale, minScale, maxScale));
};




