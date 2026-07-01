import { resolveWheelZoomStepCount } from "@/utils/zoom/wheelZoomMath";



type ComputeNextScaleFromWheelInput = {
  currentScale: number;
  deltaY: number;
  zoomStep: number;
  minScale: number;
  maxScale: number;
  deltaPerStep?: number;
};
type ComputeNextScaleFromGestureInput = {
  currentScale: number;
  baseScale: number | null;
  gestureScale: number;
  minScale: number;
  maxScale: number;
};
type ResolveTrackpadDeltaYForScaleRatioInput = {
  scaleRatio: number;
  sensitivity: number;
};



const DEFAULT_PDF_WHEEL_DELTA_PER_ZOOM_STEP = 120;
const SIOYEK_ZOOM_INC_FACTOR = 1.2;



const normalizeScale = (value: number): number => Number(value.toFixed(3));
const clampScale = (value: number, minScale: number, maxScale: number): number => {
  const lower = Math.min(minScale, maxScale);
  const upper = Math.max(minScale, maxScale);

  return Math.min(Math.max(value, lower), upper);
};
const computeNextScaleFromWheel = ({ currentScale, deltaY, zoomStep, minScale, maxScale, deltaPerStep = DEFAULT_PDF_WHEEL_DELTA_PER_ZOOM_STEP }: ComputeNextScaleFromWheelInput): number | null => {
  if (!Number.isFinite(currentScale) || currentScale <= 0 || !Number.isFinite(deltaY)) return null;
  const direction = Math.sign(deltaY);
  if (!direction) return null;

  const stepCount = resolveWheelZoomStepCount({ deltaY, deltaPerStep });
  const fallbackFactor = 1 + stepCount * (SIOYEK_ZOOM_INC_FACTOR - 1);
  const configuredFactor = Number.isFinite(zoomStep) && zoomStep > 0 ? 1 + stepCount * zoomStep : fallbackFactor;
  const rawNextScale = direction > 0 ? currentScale / configuredFactor : currentScale * configuredFactor;

  return normalizeScale(clampScale(rawNextScale, minScale, maxScale));
};
const computeNextScaleFromGesture = ({ currentScale, baseScale, gestureScale, minScale, maxScale }: ComputeNextScaleFromGestureInput): number | null => {
  if (!Number.isFinite(currentScale)) return null;
  if (!Number.isFinite(gestureScale) || gestureScale <= 0) return null;

  const effectiveBaseScale = typeof baseScale === "number" && Number.isFinite(baseScale) ? baseScale : currentScale;
  const rawNextScale = effectiveBaseScale * gestureScale;
  if (!Number.isFinite(rawNextScale)) return null;

  return normalizeScale(clampScale(rawNextScale, minScale, maxScale));
};
const resolveTrackpadDeltaYForScaleRatio = ({ scaleRatio, sensitivity }: ResolveTrackpadDeltaYForScaleRatioInput): number | null => {
  if (!Number.isFinite(scaleRatio) || scaleRatio <= 0) return null;
  if (!Number.isFinite(sensitivity) || sensitivity <= 0) return null;

  return -Math.log(scaleRatio) / sensitivity;
};



export { normalizeScale, clampScale, computeNextScaleFromWheel, computeNextScaleFromGesture, resolveTrackpadDeltaYForScaleRatio };
