type BlobScopeOptions = {
  userId?: string | null;
};
type CacheEntry = {
  url: string;
  lastAccessAt: number;
  pinCount: number;
  staleUrls: string[];
};



const MAX_CACHE_ENTRIES = 40;
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
    console.warn("[documentBlobUrlSessionCache] revokeObjectURL failed", {
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
const getCachedDocumentBlobUrl = (id: string | null | undefined, options?: BlobScopeOptions): string | null => {
  if (!id) return null;
  const key = makeScopedId(id, options);
  const entry = cache.get(key);
  if (!entry) return null;
  if (!entry.url) return null;
  touch(entry);
  return entry.url;
};
const cacheDocumentBlobUrl = (id: string, url: string, options?: BlobScopeOptions): void => {
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
const pinDocumentBlobUrl = (id: string | null | undefined, options?: BlobScopeOptions): void => {
  if (!id) return;
  const key = makeScopedId(id, options);
  const entry = cache.get(key);
  if (!entry) return;
  entry.pinCount += 1;
  touch(entry);
};
const unpinDocumentBlobUrl = (id: string | null | undefined, options?: BlobScopeOptions): void => {
  if (!id) return;
  const key = makeScopedId(id, options);
  const entry = cache.get(key);
  if (!entry) return;
  entry.pinCount = Math.max(0, entry.pinCount - 1);
  if (!entry.url && entry.pinCount <= 0) {
    cleanupStaleUrls(entry);
    cache.delete(key);
    return;
  }
  touch(entry);
  cleanupStaleUrls(entry);
  evictIfNeeded();
};
const removeDocumentBlobUrl = (id: string | null | undefined, options?: BlobScopeOptions): void => {
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
const invalidateDocumentBlobUrl = (id: string | null | undefined, url: string | null | undefined, options?: BlobScopeOptions): void => {
  if (!id || !url) return;
  const key = makeScopedId(id, options);
  const entry = cache.get(key);
  if (!entry || entry.url !== url) return;
  if (entry.pinCount > 0) {
    entry.staleUrls.push(entry.url);
    entry.url = "";
    return;
  }
  revokeBlobUrl(entry.url);
  cache.delete(key);
};



export { getCachedDocumentBlobUrl, cacheDocumentBlobUrl, pinDocumentBlobUrl, unpinDocumentBlobUrl, removeDocumentBlobUrl, invalidateDocumentBlobUrl };
