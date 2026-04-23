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
  autoDeskew?: boolean;
  rotationDegrees?: 0 | 90 | 180 | 270;
  maxDeskewAngle?: number;
}

const OCR_DEFAULT_TARGET_PIXELS = 4_000_000;
const OCR_DEFAULT_MIN_SCALE = 1.6;
const OCR_DEFAULT_MAX_SCALE = 3.2;
const OCR_TRIM_THRESHOLD = 246;
const OCR_TRIM_MARGIN = 8;
const OCR_DESKEW_DOWNSAMPLE_LONG_EDGE = 320;
const OCR_DESKEW_ANGLE_STEP = 0.4;

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
  const shortEdge = Math.min(width, height);

  let scale = targetScale;
  if (longEdge >= 1600) {
    scale *= 0.9;
  }
  if (shortEdge <= 720) {
    scale *= 1.14;
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
    const adjusted = clamp(
      (luminance - 128) * contrast + 128 + brightness,
      0,
      255,
    );

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
      weightBackground *
      weightForeground *
      (meanBackground - meanForeground) ** 2;

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

const cropCanvas = ({
  sourceCanvas,
  x,
  y,
  width,
  height,
}: {
  sourceCanvas: HTMLCanvasElement;
  x: number;
  y: number;
  width: number;
  height: number;
}) => {
  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = Math.max(1, width);
  croppedCanvas.height = Math.max(1, height);
  const croppedContext = croppedCanvas.getContext("2d", { alpha: false });
  if (!croppedContext) {
    return sourceCanvas;
  }

  croppedContext.fillStyle = "#ffffff";
  croppedContext.fillRect(0, 0, croppedCanvas.width, croppedCanvas.height);
  croppedContext.drawImage(
    sourceCanvas,
    x,
    y,
    width,
    height,
    0,
    0,
    croppedCanvas.width,
    croppedCanvas.height,
  );

  return croppedCanvas;
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
  const cropWidth = Math.min(
    width - cropX,
    maxX - minX + 1 + OCR_TRIM_MARGIN * 2,
  );
  const cropHeight = Math.min(
    height - cropY,
    maxY - minY + 1 + OCR_TRIM_MARGIN * 2,
  );

  if (cropWidth >= width * 0.98 && cropHeight >= height * 0.98) {
    return canvas;
  }

  return cropCanvas({
    sourceCanvas: canvas,
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: cropHeight,
  });
};

const rotateCanvas = ({
  canvas,
  degrees,
  background = "#ffffff",
}: {
  canvas: HTMLCanvasElement;
  degrees: number;
  background?: string;
}) => {
  if (Math.abs(degrees) < 0.001) {
    return canvas;
  }

  const radians = (degrees * Math.PI) / 180;
  const normalizedCos = Math.abs(Math.cos(radians));
  const normalizedSin = Math.abs(Math.sin(radians));
  const rotatedWidth = Math.ceil(
    canvas.width * normalizedCos + canvas.height * normalizedSin,
  );
  const rotatedHeight = Math.ceil(
    canvas.width * normalizedSin + canvas.height * normalizedCos,
  );

  const rotatedCanvas = document.createElement("canvas");
  rotatedCanvas.width = Math.max(1, rotatedWidth);
  rotatedCanvas.height = Math.max(1, rotatedHeight);
  const context = rotatedCanvas.getContext("2d", { alpha: false });
  if (!context) {
    return canvas;
  }

  context.fillStyle = background;
  context.fillRect(0, 0, rotatedCanvas.width, rotatedCanvas.height);
  context.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
  context.rotate(radians);
  context.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

  return rotatedCanvas;
};

const downscaleCanvasForDeskew = (canvas: HTMLCanvasElement) => {
  const longEdge = Math.max(canvas.width, canvas.height);
  if (longEdge <= OCR_DESKEW_DOWNSAMPLE_LONG_EDGE) {
    return canvas;
  }

  const scale = OCR_DESKEW_DOWNSAMPLE_LONG_EDGE / longEdge;
  const width = Math.max(1, Math.round(canvas.width * scale));
  const height = Math.max(1, Math.round(canvas.height * scale));
  const downscaledCanvas = document.createElement("canvas");
  downscaledCanvas.width = width;
  downscaledCanvas.height = height;
  const context = downscaledCanvas.getContext("2d", { alpha: false });
  if (!context) {
    return canvas;
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(canvas, 0, 0, width, height);
  return downscaledCanvas;
};

const getProjectionScore = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    return 0;
  }

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const rowCounts = new Array<number>(canvas.height).fill(0);

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const offset = (y * canvas.width + x) * 4;
      if ((data[offset] ?? 255) < 220) {
        rowCounts[y] += 1;
      }
    }
  }

  const mean =
    rowCounts.reduce((sum, count) => sum + count, 0) /
    Math.max(1, rowCounts.length);
  return rowCounts.reduce((sum, count) => sum + (count - mean) ** 2, 0);
};

const estimateDeskewAngle = ({
  canvas,
  maxAngle,
}: {
  canvas: HTMLCanvasElement;
  maxAngle: number;
}) => {
  const probeCanvas = downscaleCanvasForDeskew(canvas);
  let bestAngle = 0;
  let bestScore = getProjectionScore(probeCanvas);

  for (
    let angle = -Math.abs(maxAngle);
    angle <= Math.abs(maxAngle);
    angle += OCR_DESKEW_ANGLE_STEP
  ) {
    if (Math.abs(angle) < 0.001) {
      continue;
    }

    const rotatedCanvas = rotateCanvas({
      canvas: probeCanvas,
      degrees: angle,
    });
    const score = getProjectionScore(rotatedCanvas);
    if (score > bestScore) {
      bestScore = score;
      bestAngle = angle;
    }
  }

  if (Math.abs(bestAngle) < 0.15) {
    return 0;
  }

  return Number(bestAngle.toFixed(2));
};

const applyPreprocessMode = ({
  canvas,
  mode,
  contrastBoost,
  brightnessBoost,
  trimWhitespace,
  autoDeskew,
  rotationDegrees,
  maxDeskewAngle,
}: {
  canvas: HTMLCanvasElement;
  mode: PdfOcrPreprocessMode;
  contrastBoost: number;
  brightnessBoost: number;
  trimWhitespace: boolean;
  autoDeskew: boolean;
  rotationDegrees: 0 | 90 | 180 | 270;
  maxDeskewAngle: number;
}) => {
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    return {
      canvas,
      deskewAngle: 0,
      rotationDegrees,
    };
  }

  if (mode !== "none" || trimWhitespace || autoDeskew) {
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const grayscaleImageData = applyContrastAndBrightness(
      imageData,
      contrastBoost,
      brightnessBoost,
    );

    if (mode === "binary") {
      const threshold = computeOtsuThreshold(grayscaleImageData);
      context.putImageData(
        applyBinaryThreshold(grayscaleImageData, threshold),
        0,
        0,
      );
    } else if (mode === "grayscale") {
      context.putImageData(grayscaleImageData, 0, 0);
    }
  }

  let nextCanvas = canvas;
  let deskewAngle = 0;

  if (autoDeskew) {
    deskewAngle = estimateDeskewAngle({
      canvas: nextCanvas,
      maxAngle: maxDeskewAngle,
    });
    if (Math.abs(deskewAngle) >= 0.15) {
      nextCanvas = rotateCanvas({
        canvas: nextCanvas,
        degrees: deskewAngle,
      });
    }
  }

  if (rotationDegrees !== 0) {
    nextCanvas = rotateCanvas({
      canvas: nextCanvas,
      degrees: rotationDegrees,
    });
  }

  if (trimWhitespace) {
    nextCanvas = trimWhitespaceCanvas(nextCanvas);
  }

  return {
    canvas: nextCanvas,
    deskewAngle,
    rotationDegrees,
  };
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
    const targetPixels = Math.max(
      800_000,
      Math.trunc(profile?.targetPixels ?? OCR_DEFAULT_TARGET_PIXELS),
    );
    const minScale = Math.max(0.8, profile?.minScale ?? OCR_DEFAULT_MIN_SCALE);
    const maxScale = Math.max(
      minScale,
      profile?.maxScale ?? OCR_DEFAULT_MAX_SCALE,
    );
    const contrastBoost = profile?.contrastBoost ?? 1.08;
    const brightnessBoost = profile?.brightnessBoost ?? 0;
    const preprocessMode = profile?.mode ?? "none";
    const shouldTrimWhitespace = profile?.trimWhitespace ?? false;
    const autoDeskew = profile?.autoDeskew ?? false;
    const rotationDegrees = profile?.rotationDegrees ?? 0;
    const maxDeskewAngle = Math.max(0.6, profile?.maxDeskewAngle ?? 1.4);

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

    const processed = applyPreprocessMode({
      canvas: baseCanvas,
      mode: preprocessMode,
      contrastBoost,
      brightnessBoost,
      trimWhitespace: shouldTrimWhitespace,
      autoDeskew,
      rotationDegrees,
      maxDeskewAngle,
    });

    return {
      canvas: processed.canvas,
      width: processed.canvas.width,
      height: processed.canvas.height,
      scale: normalizedScale,
      deskewAngle: processed.deskewAngle,
      rotationDegrees: processed.rotationDegrees,
      profile: {
        mode: preprocessMode,
        targetPixels,
        minScale,
        maxScale,
        trimWhitespace: shouldTrimWhitespace,
        contrastBoost,
        brightnessBoost,
        autoDeskew,
        rotationDegrees,
        maxDeskewAngle,
      } satisfies PdfOcrRenderProfile,
    };
  } finally {
    pageLease.release();
  }
};
