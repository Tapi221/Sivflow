export interface PreloadCacheStats {
  remoteUrlCacheSize: number;
  decodedUrlSetSize: number;
  remoteUrlCacheMax: number;
  decodedUrlSetMax: number;
}

const MAX_REMOTE_URL_CACHE = 600;
const MAX_DECODED_URL_SET = 800;
const remoteUrlCache = new Map<string, string>();
const decodedUrlSet = new Set<string>();

export const getCachedRemoteUrl = (assetId: string) => {
  return remoteUrlCache.get(assetId);
};

export const setCachedRemoteUrl = (assetId: string, url: string) => {
  if (remoteUrlCache.has(assetId)) {
    const oldUrl = remoteUrlCache.get(assetId);
    if (oldUrl && oldUrl !== url) {
      decodedUrlSet.delete(oldUrl);
    }
    remoteUrlCache.set(assetId, url);
    return;
  }
  if (remoteUrlCache.size >= MAX_REMOTE_URL_CACHE) {
    const oldest = remoteUrlCache.keys().next().value;
    if (oldest !== undefined) remoteUrlCache.delete(oldest);
  }
  remoteUrlCache.set(assetId, url);
};

export const isUrlDecoded = (url: string) => {
  return decodedUrlSet.has(url);
};

export const markUrlDecoded = (url: string) => {
  if (decodedUrlSet.has(url)) return;
  if (decodedUrlSet.size >= MAX_DECODED_URL_SET) {
    const oldest = decodedUrlSet.values().next().value;
    if (oldest !== undefined) decodedUrlSet.delete(oldest);
  }
  decodedUrlSet.add(url);
};

export const getPreloadCacheStats = () => {
  return {
    remoteUrlCacheSize: remoteUrlCache.size,
    decodedUrlSetSize: decodedUrlSet.size,
    remoteUrlCacheMax: MAX_REMOTE_URL_CACHE,
    decodedUrlSetMax: MAX_DECODED_URL_SET,
  };
};
