import type { PdfDocumentController } from "@/components/pdf/hooks/usePdfDocument";

export type PdfOcrPreprocessMode = "none" | "grayscale" | "binary";

export interface PdfOcrRenderProfile {
  mode: PdfOcrPreprocessMode;
  targetPixels?: number;
  minScale?: number;
  maxScale?: number;
  trimWhitespace?: boolean;
  contrastBoost?: number;
  brightnessBoost?: number;
}

const OCR_DEFAULT_TARGET_PIXELS = 4_000_000;
const OCR_DEFAULT_MIN_SCALE = 1.6;
const OCR_DEFAULT_MAX_SCALE = 3.2;
const OCR_TRIM_THRESHOLD = 246;
const OCR_TRIM_MARGIN = 8;

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const inferScaleFromViewport = ({
  width,
  height,
  targetPixels,
  minScale,
  maxScale,
}: {
  width: number;
  height: number;
  targetPixels: number;
  minScale: number;
  maxScale: number;
}) => {
  const basePixels = Math.max(1, width * height);
  const targetScale = Math.sqrt(targetPixels / basePixels);
  const longEdge = Math.max(width, height);

  let scale = targetScale;
  if (longEdge >= 1400) {
    scale *= 0.92;
  }
  if (longEdge <= 800) {
    scale *= 1.12;
  }

  return clamp(Number(scale.toFixed(3)), minScale, maxScale);
};

const applyContrastAndBrightness = (
  imageData: ImageData,
  contrastBoost: number,
  brightnessBoost: number,
) => {
  const data = imageData.data;
  const contrast = Math.max(0.2, contrastBoost);
  const brightness = brightnessBoost * 255;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index] ?? 0;
    const green = data[index + 1] ?? 0;
    const blue = data[index + 2] ?? 0;
    const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
    const adjusted = clamp((luminance - 128) * contrast + 128 + brightness, 0, 255);

    data[index] = adjusted;
    data[index + 1] = adjusted;
    data[index + 2] = adjusted;
  }

  return imageData;
};

const computeOtsuThreshold = (imageData: ImageData) => {
  const histogram = new Array<number>(256).fill(0);
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    histogram[data[index] ?? 0] += 1;
  }

  const total = imageData.width * imageData.height;
  let sum = 0;
  for (let value = 0; value < 256; value += 1) {
    sum += value * histogram[value];
  }

  let sumBackground = 0;
  let weightBackground = 0;
  let maxVariance = -1;
  let threshold = 180;

  for (let value = 0; value < 256; value += 1) {
    weightBackground += histogram[value];
    if (weightBackground === 0) {
      continue;
    }

    const weightForeground = total - weightBackground;
    if (weightForeground === 0) {
      break;
    }

    sumBackground += value * histogram[value];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const betweenClassVariance =
      weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;

    if (betweenClassVariance > maxVariance) {
      maxVariance = betweenClassVariance;
      threshold = value;
    }
  }

  return clamp(threshold, 96, 220);
};

const applyBinaryThreshold = (imageData: ImageData, threshold: number) => {
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    const value = (data[index] ?? 0) >= threshold ? 255 : 0;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
  }

  return imageData;
};

const trimWhitespaceCanvas = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    return canvas;
  }

  const { width, height } = canvas;
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const value = data[offset] ?? 255;
      if (value < OCR_TRIM_THRESHOLD) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return canvas;
  }

  const cropX = Math.max(0, minX - OCR_TRIM_MARGIN);
  const cropY = Math.max(0, minY - OCR_TRIM_MARGIN);
  const cropWidth = Math.min(width - cropX, maxX - minX + 1 + OCR_TRIM_MARGIN * 2);
  const cropHeight = Math.min(height - cropY, maxY - minY + 1 + OCR_TRIM_MARGIN * 2);

  if (cropWidth >= width * 0.98 && cropHeight >= height * 0.98) {
    return canvas;
  }

  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = Math.max(1, cropWidth);
  croppedCanvas.height = Math.max(1, cropHeight);
  const croppedContext = croppedCanvas.getContext("2d", { alpha: false });
  if (!croppedContext) {
    return canvas;
  }

  croppedContext.fillStyle = "#ffffff";
  croppedContext.fillRect(0, 0, croppedCanvas.width, croppedCanvas.height);
  croppedContext.drawImage(
    canvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    croppedCanvas.width,
    croppedCanvas.height,
  );

  return croppedCanvas;
};

const applyPreprocessMode = ({
  canvas,
  mode,
  contrastBoost,
  brightnessBoost,
  trimWhitespace,
}: {
  canvas: HTMLCanvasElement;
  mode: PdfOcrPreprocessMode;
  contrastBoost: number;
  brightnessBoost: number;
  trimWhitespace: boolean;
}) => {
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    return canvas;
  }

  if (mode === "none" && !trimWhitespace) {
    return canvas;
  }

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const grayImageData = applyContrastAndBrightness(
    imageData,
    contrastBoost,
    brightnessBoost,
  );

  if (mode === "binary") {
    const threshold = computeOtsuThreshold(grayImageData);
    context.putImageData(applyBinaryThreshold(grayImageData, threshold), 0, 0);
  } else if (mode === "grayscale") {
    context.putImageData(grayImageData, 0, 0);
  }

  if (trimWhitespace) {
    return trimWhitespaceCanvas(canvas);
  }

  return canvas;
};

export const renderPdfPageForOcr = async ({
  acquirePage,
  pageNumber,
  profile,
}: {
  acquirePage: PdfDocumentController["acquirePage"];
  pageNumber: number;
  profile?: PdfOcrRenderProfile;
}) => {
  const pageLease = await acquirePage(pageNumber);

  try {
    const targetPixels = Math.max(800_000, Math.trunc(profile?.targetPixels ?? OCR_DEFAULT_TARGET_PIXELS));
    const minScale = Math.max(0.8, profile?.minScale ?? OCR_DEFAULT_MIN_SCALE);
    const maxScale = Math.max(minScale, profile?.maxScale ?? OCR_DEFAULT_MAX_SCALE);
    const contrastBoost = profile?.contrastBoost ?? 1.08;
    const brightnessBoost = profile?.brightnessBoost ?? 0;
    const preprocessMode = profile?.mode ?? "none";
    const shouldTrimWhitespace = profile?.trimWhitespace ?? false;

    const probeViewport = pageLease.page.getViewport({ scale: 1 });
    const normalizedScale = inferScaleFromViewport({
      width: probeViewport.width,
      height: probeViewport.height,
      targetPixels,
      minScale,
      maxScale,
    });
    const viewport = pageLease.page.getViewport({ scale: normalizedScale });

    const baseCanvas = document.createElement("canvas");
    baseCanvas.width = Math.max(1, Math.round(viewport.width));
    baseCanvas.height = Math.max(1, Math.round(viewport.height));

    const context = baseCanvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error("Failed to create OCR canvas context");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, baseCanvas.width, baseCanvas.height);

    const renderTask = pageLease.page.render({
      canvasContext: context,
      viewport,
      intent: "display",
    });

    await renderTask.promise;

    const canvas = applyPreprocessMode({
      canvas: baseCanvas,
      mode: preprocessMode,
      contrastBoost,
      brightnessBoost,
      trimWhitespace: shouldTrimWhitespace,
    });

    return {
      canvas,
      width: canvas.width,
      height: canvas.height,
      scale: normalizedScale,
      profile: {
        mode: preprocessMode,
        targetPixels,
        minScale,
        maxScale,
        trimWhitespace: shouldTrimWhitespace,
        contrastBoost,
        brightnessBoost,
      } satisfies PdfOcrRenderProfile,
    };
  } finally {
    pageLease.release();
  }
};
