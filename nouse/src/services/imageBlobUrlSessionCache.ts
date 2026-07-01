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
interface BlobCacheStats {
  cacheSize: number;
  cacheMax: number;
  pinnedCount: number;
  evictCount: number;
  revokeCount: number;
}



const MAX_CACHE_ENTRIES = 80;
const cache = new Map<string, CacheEntry>();
let _evictCount = 0;
let _revokeCount = 0;



const makeScopedId = (id: string, options?: BlobScopeOptions): string => {
  const userId = options?.userId?.trim();
  return userId ? `${userId}:${id}` : id;
};
const revokeBlobUrl = (url: string): void => {
  if (!url.startsWith("blob:")) return;
  if (typeof URL === "undefined" || typeof URL.revokeObjectURL !== "function") return;
  try {
    URL.revokeObjectURL(url);
    _revokeCount++;
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
    _evictCount++;
  }
};
const getCachedImageBlobUrl = (
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
const cacheImageBlobUrl = (
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
const getOrCreateImageBlobUrl = async (id: string | null | undefined, blobOrOptions?: Blob | BlobScopeOptions, options?: BlobScopeOptions): Promise<string | null> => {
  if (!id) return null;
  const scopeOptions =
    blobOrOptions instanceof Blob || (blobOrOptions === null || blobOrOptions === undefined)
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
const removeImageBlobUrl = (id: string | null | undefined, options?: BlobScopeOptions): void => {
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
const pinImageBlobUrl = (id: string | null | undefined, options?: BlobScopeOptions): void => {
  if (!id) return;
  const key = makeScopedId(id, options);
  const entry = cache.get(key);
  if (!entry) return;
  entry.pinCount += 1;
};
const unpinImageBlobUrl = (id: string | null | undefined, options?: BlobScopeOptions): void => {
  if (!id) return;
  const key = makeScopedId(id, options);
  const entry = cache.get(key);
  if (!entry) return;
  entry.pinCount = Math.max(0, entry.pinCount - 1);
  if (entry.pinCount === 0) {
    cleanupStaleUrls(entry);
  }
};
const getBlobCacheStats = () => {
  let pinnedCount = 0;
  for (const entry of cache.values()) {
    if (entry.pinCount > 0) pinnedCount++;
  }
  return {
    cacheSize: cache.size,
    cacheMax: MAX_CACHE_ENTRIES,
    pinnedCount,
    evictCount: _evictCount,
    revokeCount: _revokeCount,
  };
};



export { getOrCreateImageBlobUrl, removeImageBlobUrl, pinImageBlobUrl, unpinImageBlobUrl, getBlobCacheStats };


export type { BlobCacheStats };
