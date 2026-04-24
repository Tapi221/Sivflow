export interface CachedPdfThumbnailBitmap {
  bitmap: HTMLCanvasElement | ImageBitmap;
  width: number;
  height: number;
}

interface PdfThumbnailBitmapCacheEntry extends CachedPdfThumbnailBitmap {
  key: string;
  documentKey: string;
  pixelCount: number;
  lastAccessToken: number;
}

interface GetCachedPdfThumbnailBitmapOptions {
  key: string;
  width: number;
  height: number;
}

interface SetCachedPdfThumbnailBitmapOptions {
  key: string;
  documentKey: string;
  canvas: HTMLCanvasElement;
}

const MAX_THUMBNAIL_BITMAP_CACHE_ENTRIES = 256;
const MAX_THUMBNAIL_BITMAP_CACHE_PIXELS = 9_000_000;

const thumbnailBitmapCache = new Map<string, PdfThumbnailBitmapCacheEntry>();
let totalCachedPixels = 0;
let accessToken = 0;

const closeBitmap = (bitmap: HTMLCanvasElement | ImageBitmap) => {
  if ("close" in bitmap && typeof bitmap.close === "function") {
    try {
      bitmap.close();
    } catch {
      // noop
    }
  }
};

const normalizeCanvasDimension = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return Math.max(1, Math.trunc(value));
};

const touchEntry = (entry: PdfThumbnailBitmapCacheEntry) => {
  accessToken += 1;
  entry.lastAccessToken = accessToken;
};

const deleteEntry = (key: string) => {
  const entry = thumbnailBitmapCache.get(key);
  if (!entry) {
    return;
  }

  thumbnailBitmapCache.delete(key);
  totalCachedPixels = Math.max(0, totalCachedPixels - entry.pixelCount);
  closeBitmap(entry.bitmap);
};

const evictIfNeeded = () => {
  if (
    thumbnailBitmapCache.size <= MAX_THUMBNAIL_BITMAP_CACHE_ENTRIES &&
    totalCachedPixels <= MAX_THUMBNAIL_BITMAP_CACHE_PIXELS
  ) {
    return;
  }

  const evictionCandidates = Array.from(thumbnailBitmapCache.values()).sort(
    (left, right) => left.lastAccessToken - right.lastAccessToken,
  );

  for (const entry of evictionCandidates) {
    if (
      thumbnailBitmapCache.size <= MAX_THUMBNAIL_BITMAP_CACHE_ENTRIES &&
      totalCachedPixels <= MAX_THUMBNAIL_BITMAP_CACHE_PIXELS
    ) {
      return;
    }

    deleteEntry(entry.key);
  }
};

const cloneCanvasAsCanvas = (canvas: HTMLCanvasElement) => {
  const clonedCanvas = document.createElement("canvas");
  clonedCanvas.width = normalizeCanvasDimension(canvas.width);
  clonedCanvas.height = normalizeCanvasDimension(canvas.height);

  const context = clonedCanvas.getContext("2d", { alpha: false });
  if (!context) {
    return null;
  }

  context.drawImage(canvas, 0, 0);
  return clonedCanvas;
};

const cloneCanvasBitmap = async (canvas: HTMLCanvasElement) => {
  if (typeof createImageBitmap === "function") {
    return await createImageBitmap(canvas);
  }

  return cloneCanvasAsCanvas(canvas);
};

export const getCachedPdfThumbnailBitmap = ({
  key,
  width,
  height,
}: GetCachedPdfThumbnailBitmapOptions): CachedPdfThumbnailBitmap | null => {
  const entry = thumbnailBitmapCache.get(key);
  if (!entry) {
    return null;
  }

  if (entry.width !== width || entry.height !== height) {
    deleteEntry(key);
    return null;
  }

  touchEntry(entry);
  return {
    bitmap: entry.bitmap,
    width: entry.width,
    height: entry.height,
  };
};

export const setCachedPdfThumbnailBitmap = async ({
  key,
  documentKey,
  canvas,
}: SetCachedPdfThumbnailBitmapOptions) => {
  const width = normalizeCanvasDimension(canvas.width);
  const height = normalizeCanvasDimension(canvas.height);
  const bitmap = await cloneCanvasBitmap(canvas);

  if (!bitmap) {
    return;
  }

  deleteEntry(key);

  const entry: PdfThumbnailBitmapCacheEntry = {
    key,
    documentKey,
    bitmap,
    width,
    height,
    pixelCount: width * height,
    lastAccessToken: 0,
  };

  touchEntry(entry);
  thumbnailBitmapCache.set(key, entry);
  totalCachedPixels += entry.pixelCount;
  evictIfNeeded();
};

export const clearCachedPdfThumbnailBitmaps = (documentKey?: string) => {
  if (!documentKey) {
    Array.from(thumbnailBitmapCache.keys()).forEach((key) => deleteEntry(key));
    return;
  }

  Array.from(thumbnailBitmapCache.entries()).forEach(([key, entry]) => {
    if (entry.documentKey === documentKey) {
      deleteEntry(key);
    }
  });
};

export const getPdfThumbnailBitmapCacheSnapshot = () => {
  return {
    entryCount: thumbnailBitmapCache.size,
    totalCachedPixels,
    maxEntries: MAX_THUMBNAIL_BITMAP_CACHE_ENTRIES,
    maxPixels: MAX_THUMBNAIL_BITMAP_CACHE_PIXELS,
  };
};
