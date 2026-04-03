/**
 * imagePreloadCache
 *
 * モジュールレベルのキャッシュ。
 * - remoteUrlCache  : assetId → Firebase Storage URL（ImageGallery と共有）
 * - decodedUrlSet   : Image.decode() 完了済み URL の Set
 *
 * これらを共有することで、useCardImagePreloader が先読みした結果を
 * ImageGallery が即座に利用でき、async 解決待ちが発生しない。
 *
 * 上限管理:
 * - 各キャッシュに MAX_* の件数上限を設ける。
 * - 上限到達時は挿入順が最も古いエントリを 1 件削除（Map/Set の挿入順保証を利用）。
 * - LRU ではなく FIFO だが、decode 済み URL は再 decode が安全なため FIFO で十分。
 */

const MAX_REMOTE_URL_CACHE = 600;
const MAX_DECODED_URL_SET  = 800;

/** assetId → Firebase Storage URL */
const remoteUrlCache = new Map<string, string>();

/** Image.decode() 完了済み URL */
const decodedUrlSet = new Set<string>();

export function getCachedRemoteUrl(assetId: string): string | undefined {
  return remoteUrlCache.get(assetId);
}

export function setCachedRemoteUrl(assetId: string, url: string): void {
  if (remoteUrlCache.has(assetId)) {
    // 既存キーの更新: 古い URL が変わった場合に decodedUrlSet の stale エントリを削除する。
    // Firebase signed URL はローテーションされることがあるため、
    // 同一 assetId で URL が変わったら decode 済みフラグもリセットする。
    const oldUrl = remoteUrlCache.get(assetId);
    if (oldUrl && oldUrl !== url) {
      decodedUrlSet.delete(oldUrl);
    }
    remoteUrlCache.set(assetId, url);
    return;
  }
  if (remoteUrlCache.size >= MAX_REMOTE_URL_CACHE) {
    // 最古エントリを削除（Map は挿入順を保証）
    const oldest = remoteUrlCache.keys().next().value;
    if (oldest !== undefined) remoteUrlCache.delete(oldest);
  }
  remoteUrlCache.set(assetId, url);
}

export function isUrlDecoded(url: string): boolean {
  return decodedUrlSet.has(url);
}

export function markUrlDecoded(url: string): void {
  if (decodedUrlSet.has(url)) return;
  if (decodedUrlSet.size >= MAX_DECODED_URL_SET) {
    const oldest = decodedUrlSet.values().next().value;
    if (oldest !== undefined) decodedUrlSet.delete(oldest);
  }
  decodedUrlSet.add(url);
}

// ── Observability ─────────────────────────────────────────────────────────

export interface PreloadCacheStats {
  remoteUrlCacheSize: number;
  decodedUrlSetSize: number;
  remoteUrlCacheMax: number;
  decodedUrlSetMax: number;
}

export function getPreloadCacheStats(): PreloadCacheStats {
  return {
    remoteUrlCacheSize: remoteUrlCache.size,
    decodedUrlSetSize: decodedUrlSet.size,
    remoteUrlCacheMax: MAX_REMOTE_URL_CACHE,
    decodedUrlSetMax: MAX_DECODED_URL_SET,
  };
}

