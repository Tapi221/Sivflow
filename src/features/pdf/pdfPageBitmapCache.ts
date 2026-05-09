export type PdfPageBitmap = HTMLCanvasElement | ImageBitmap;

type PdfPageBitmapCacheEntry = {
  bitmap: PdfPageBitmap;
  documentKey: string;
  pixelCost: number;
  lastUsedAt: number;
};

const MAX_CACHE_ENTRIES = 6;
const MAX_CACHE_PIXELS = 12_000_000;

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

const disposeBitmap = (bitmap: PdfPageBitmap) => {
  if (typeof ImageBitmap !== "undefined" && bitmap instanceof ImageBitmap) {
    bitmap.close();
    return;
  }

  if (
    typeof HTMLCanvasElement !== "undefined" &&
    bitmap instanceof HTMLCanvasElement
  ) {
    bitmap.width = 0;
    bitmap.height = 0;
  }
};

const evictOldestEntry = () => {
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

  const entry = cache.get(oldestKey);
  if (entry) {
    disposeBitmap(entry.bitmap);
  }
  cache.delete(oldestKey);
};

const evictIfNeeded = () => {
  while (
    cache.size > MAX_CACHE_ENTRIES ||
    computeTotalPixels() > MAX_CACHE_PIXELS
  ) {
    evictOldestEntry();
  }
};

const cloneCanvas = (sourceCanvas: HTMLCanvasElement) => {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) {
    return null;
  }

  context.drawImage(sourceCanvas, 0, 0);
  return canvas;
};

const createBitmapFromCanvas = async (sourceCanvas: HTMLCanvasElement) => {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(sourceCanvas);
    } catch {
      // fall through to canvas clone
    }
  }

  return cloneCanvas(sourceCanvas);
};

export const getCachedPdfPageBitmap = (cacheKey: string) => {
  const existing = cache.get(cacheKey);
  if (!existing) {
    return null;
  }

  existing.lastUsedAt = nowMs();
  return existing.bitmap;
};

export const setCachedPdfPageBitmap = async (
  cacheKey: string,
  documentKey: string,
  sourceCanvas: HTMLCanvasElement,
) => {
  const bitmap = await createBitmapFromCanvas(sourceCanvas);
  if (!bitmap) {
    return;
  }

  const existing = cache.get(cacheKey);
  if (existing) {
    disposeBitmap(existing.bitmap);
  }

  const pixelCost = Math.max(1, bitmap.width * bitmap.height);

  cache.set(cacheKey, {
    bitmap,
    documentKey,
    pixelCost,
    lastUsedAt: nowMs(),
  });

  evictIfNeeded();
};

export const clearPdfPageBitmapCacheForDocument = (documentKey: string) => {
  const keysToDelete: string[] = [];

  cache.forEach((entry, key) => {
    if (entry.documentKey === documentKey) {
      disposeBitmap(entry.bitmap);
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => {
    cache.delete(key);
  });
};

export const clearPdfPageBitmapCache = () => {
  cache.forEach((entry) => {
    disposeBitmap(entry.bitmap);
  });
  cache.clear();
};
