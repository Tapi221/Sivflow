const MAX_CACHE_ENTRIES = 32;
const MAX_CACHE_PIXELS = 48_000_000;

type PdfPageBitmapCacheEntry = {
  canvas: HTMLCanvasElement;
  pixelCost: number;
  lastUsedAt: number;
};

const cache = new Map<string, PdfPageBitmapCacheEntry>();

const nowMs = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const computeTotalPixels = () => {
  let totalPixels = 0;

  cache.forEach((entry) => {
    totalPixels += entry.pixelCost;
  });

  return totalPixels;
};

const evictIfNeeded = () => {
  while (
    cache.size > MAX_CACHE_ENTRIES ||
    computeTotalPixels() > MAX_CACHE_PIXELS
  ) {
    let oldestKey: string | null = null;
    let oldestTimestamp = Number.POSITIVE_INFINITY;

    cache.forEach((entry, key) => {
      if (entry.lastUsedAt < oldestTimestamp) {
        oldestTimestamp = entry.lastUsedAt;
        oldestKey = key;
      }
    });

    if (!oldestKey) {
      return;
    }

    cache.delete(oldestKey);
  }
};

const cloneCanvas = (sourceCanvas: HTMLCanvasElement) => {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.drawImage(sourceCanvas, 0, 0);
  return canvas;
};

export const getCachedPdfPageBitmap = (cacheKey: string) => {
  const existing = cache.get(cacheKey);
  if (!existing) {
    return null;
  }

  existing.lastUsedAt = nowMs();
  return existing.canvas;
};

export const setCachedPdfPageBitmap = (
  cacheKey: string,
  sourceCanvas: HTMLCanvasElement,
) => {
  const clonedCanvas = cloneCanvas(sourceCanvas);
  if (!clonedCanvas) {
    return;
  }

  const pixelCost = Math.max(1, clonedCanvas.width * clonedCanvas.height);

  cache.set(cacheKey, {
    canvas: clonedCanvas,
    pixelCost,
    lastUsedAt: nowMs(),
  });

  evictIfNeeded();
};

export const clearPdfPageBitmapCache = () => {
  cache.clear();
};
