type PdfRenderBackingStoreInput = {
  viewportWidthPx: number;
  viewportHeightPx: number;
  devicePixelRatio: number;
  minimumDevicePixelRatio?: number;
  maximumDevicePixelRatio?: number;
  maximumCanvasPixels?: number;
};

type PdfRenderBackingStore = {
  devicePixelRatio: number;
  canvasWidthPx: number;
  canvasHeightPx: number;
  scaleX: number;
  scaleY: number;
};

const DEFAULT_DEVICE_PIXEL_RATIO = 1;
const DEFAULT_MINIMUM_DEVICE_PIXEL_RATIO = 1;
const DEFAULT_MAXIMUM_DEVICE_PIXEL_RATIO = 3;
const DEFAULT_MAXIMUM_CANVAS_PIXELS = 16_777_216;
const MINIMUM_CANVAS_PIXEL_SIZE = 1;

const normalizePositiveNumber = (value: number | undefined, fallback: number): number => {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
};

const resolveBoundedDevicePixelRatio = ({ viewportWidthPx, viewportHeightPx, devicePixelRatio, minimumDevicePixelRatio, maximumDevicePixelRatio, maximumCanvasPixels }: PdfRenderBackingStoreInput): number => {
  const viewportWidth = normalizePositiveNumber(viewportWidthPx, MINIMUM_CANVAS_PIXEL_SIZE);
  const viewportHeight = normalizePositiveNumber(viewportHeightPx, MINIMUM_CANVAS_PIXEL_SIZE);
  const normalizedDevicePixelRatio = normalizePositiveNumber(devicePixelRatio, DEFAULT_DEVICE_PIXEL_RATIO);
  const minimumRatio = normalizePositiveNumber(minimumDevicePixelRatio, DEFAULT_MINIMUM_DEVICE_PIXEL_RATIO);
  const maximumRatio = Math.max(minimumRatio, normalizePositiveNumber(maximumDevicePixelRatio, DEFAULT_MAXIMUM_DEVICE_PIXEL_RATIO));
  const maximumPixels = normalizePositiveNumber(maximumCanvasPixels, DEFAULT_MAXIMUM_CANVAS_PIXELS);
  const desiredRatio = Math.min(maximumRatio, Math.max(minimumRatio, normalizedDevicePixelRatio));
  const maximumRatioByArea = Math.sqrt(maximumPixels / (viewportWidth * viewportHeight));

  return Math.max(DEFAULT_DEVICE_PIXEL_RATIO, Math.min(desiredRatio, maximumRatioByArea));
};

const resolvePdfRenderBackingStore = ({ viewportWidthPx, viewportHeightPx, devicePixelRatio, minimumDevicePixelRatio, maximumDevicePixelRatio, maximumCanvasPixels }: PdfRenderBackingStoreInput): PdfRenderBackingStore => {
  const viewportWidth = normalizePositiveNumber(viewportWidthPx, MINIMUM_CANVAS_PIXEL_SIZE);
  const viewportHeight = normalizePositiveNumber(viewportHeightPx, MINIMUM_CANVAS_PIXEL_SIZE);
  const boundedDevicePixelRatio = resolveBoundedDevicePixelRatio({ viewportWidthPx: viewportWidth, viewportHeightPx: viewportHeight, devicePixelRatio, minimumDevicePixelRatio, maximumDevicePixelRatio, maximumCanvasPixels });
  const canvasWidthPx = Math.max(MINIMUM_CANVAS_PIXEL_SIZE, Math.floor(viewportWidth * boundedDevicePixelRatio));
  const canvasHeightPx = Math.max(MINIMUM_CANVAS_PIXEL_SIZE, Math.floor(viewportHeight * boundedDevicePixelRatio));

  return {
    devicePixelRatio: boundedDevicePixelRatio,
    canvasWidthPx,
    canvasHeightPx,
    scaleX: canvasWidthPx / viewportWidth,
    scaleY: canvasHeightPx / viewportHeight,
  };
};

export { resolvePdfRenderBackingStore };
export type { PdfRenderBackingStore, PdfRenderBackingStoreInput };
