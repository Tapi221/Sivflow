import { getImageBlob } from "./imageFileStore";

type BlobScopeOptions = {
  userId?: string | null;
};

type CacheEntry = {
  url: string;
  lastAccessAt: number;
  pinCount: number;
  staleUrls: string[];
};

const MAX_CACHE_ENTRIES = 80;
const cache = new Map<string, CacheEntry>();

const makeScopedId = (id: string, options?: BlobScopeOptions): string => {
  const userId = options?.userId?.trim();
  return userId ? `${userId}:${id}` : id;
};

const revokeBlobUrl = (url: string): void => {
  if (!url.startsWith("blob:")) return;
  if (typeof URL === "undefined" || typeof URL.revokeObjectURL !== "function")
    return;
  try {
    URL.revokeObjectURL(url);
  } catch (error) {
    console.warn("[imageBlobUrlSessionCache] revokeObjectURL failed", {
      url,
      error,
    });
  }
};

const touch = (entry: CacheEntry): void => {
  entry.lastAccessAt = Date.now();
};

const cleanupStaleUrls = (entry: CacheEntry): void => {
  if (entry.pinCount > 0 || entry.staleUrls.length === 0) return;
  for (const url of entry.staleUrls) {
    revokeBlobUrl(url);
  }
  entry.staleUrls = [];
};

const evictIfNeeded = (): void => {
  if (cache.size <= MAX_CACHE_ENTRIES) return;
  const candidates = Array.from(cache.entries())
    .filter(([, entry]) => entry.pinCount <= 0)
    .sort((a, b) => a[1].lastAccessAt - b[1].lastAccessAt);
  for (const [key, entry] of candidates) {
    if (cache.size <= MAX_CACHE_ENTRIES) break;
    cleanupStaleUrls(entry);
    revokeBlobUrl(entry.url);
    cache.delete(key);
  }
};

export const getCachedImageBlobUrl = (
  id: string | null | undefined,
  options?: BlobScopeOptions,
): string | null => {
  if (!id) return null;
  const key = makeScopedId(id, options);
  const entry = cache.get(key);
  if (!entry?.url) return null;
  touch(entry);
  return entry.url;
};

export const cacheImageBlobUrl = (
  id: string,
  url: string,
  options?: BlobScopeOptions,
): void => {
  if (!id || !url || !url.startsWith("blob:")) return;
  const key = makeScopedId(id, options);
  const now = Date.now();
  const existing = cache.get(key);
  if (!existing) {
    cache.set(key, { url, lastAccessAt: now, pinCount: 0, staleUrls: [] });
    evictIfNeeded();
    return;
  }

  existing.lastAccessAt = now;
  if (existing.url === url) return;
  if (existing.pinCount > 0) {
    existing.staleUrls.push(existing.url);
  } else {
    revokeBlobUrl(existing.url);
  }
  existing.url = url;
  cleanupStaleUrls(existing);
  evictIfNeeded();
};

export const getOrCreateImageBlobUrl = async (
  id: string | null | undefined,
  blobOrOptions?: Blob | BlobScopeOptions,
  options?: BlobScopeOptions,
): Promise<string | null> => {
  if (!id) return null;
  const scopeOptions =
    blobOrOptions instanceof Blob || blobOrOptions == null
      ? options
      : (blobOrOptions as BlobScopeOptions);
  const providedBlob = blobOrOptions instanceof Blob ? blobOrOptions : null;
  const cached = getCachedImageBlobUrl(id, scopeOptions);
  if (cached) return cached;
  const blob = providedBlob ?? (await getImageBlob(id, scopeOptions));
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  cacheImageBlobUrl(id, url, scopeOptions);
  return url;
};

export const removeImageBlobUrl = (
  id: string | null | undefined,
  options?: BlobScopeOptions,
): void => {
  if (!id) return;
  const key = makeScopedId(id, options);
  const entry = cache.get(key);
  if (!entry) return;
  cleanupStaleUrls(entry);
  if (entry.pinCount > 0) {
    entry.staleUrls.push(entry.url);
    entry.url = "";
    return;
  }
  revokeBlobUrl(entry.url);
  cache.delete(key);
};




