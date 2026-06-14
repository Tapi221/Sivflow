// Branded types for type-safe URL handling
// これにより、string の誤用を完全に防ぐ

/**
 * Blob URL 専用型
 * 例: blob:http://localhost:5173/abc-123-def
 *
 * 用途: 一時的なプレビュー表示のみ
 * 禁止: DB保存、同期データへの混入
 */
type BlobUrl = string & { readonly __brand: "BlobUrl"; };
/**
 * Firebase Storage URL 専用型
 * 例: https://firebasestorage.googleapis.com/v0/b/...
 *
 * 用途: クラウドに保存された画像の参照
 * 禁止: Base64、Blob URL、ローカルパス
 */
type StorageUrl = string & { readonly __brand: "StorageUrl"; };
/**
 * Base64 Data URL 専用型
 * 例: data:image/png;base64,iVBORw0KG...
 *
 * 用途: 計算途中の一時変数のみ
 * 禁止: DB保存、UploadedImage への代入
 */
type Base64DataUrl = string & { readonly __brand: "Base64DataUrl"; };



// ============================================
// Type Guards（型判定）
// ============================================

/**
 * Blob URL かどうかを判定
 */
const isBlobUrl = (url: string): url is BlobUrl => url.startsWith("blob:");
/**
 * Firebase Storage URL かどうかを判定
 */
const isStorageUrl = (url: string): url is StorageUrl => url.startsWith("https://") && (url.includes("firebasestorage.googleapis.com") || url.includes("storage.googleapis.com"));
/**
 * Base64 Data URL かどうかを判定
 */
const isBase64DataUrl = (url: string): url is Base64DataUrl => url.startsWith("data:");
// ============================================
// Constructors（実行時バリデーション付き生成）
// ============================================

/**
 * Blob URL を生成（実行時バリデーション付き）
 * @throws {Error} 不正な URL の場合
 */
const createBlobUrl = (url: string): BlobUrl => {
  if (!isBlobUrl(url)) {
    throw new Error(`[BrandedType] Invalid BlobUrl: ${url}`);
  }
  return url as BlobUrl;
};
/**
 * Storage URL を生成（実行時バリデーション付き）
 * @throws {Error} 不正な URL の場合
 */
const createStorageUrl = (url: string): StorageUrl => {
  if (!isStorageUrl(url)) {
    throw new Error(`[BrandedType] Invalid StorageUrl: ${url}`);
  }
  return url as StorageUrl;
};
/**
 * Base64 Data URL を生成（実行時バリデーション付き）
 * @throws {Error} 不正な URL の場合
 *
 * この関数は内部処理でのみ使用すること
 * DB や UploadedImage に Base64 を保存してはならない
 */
const createBase64DataUrl = (url: string): Base64DataUrl => {
  if (!isBase64DataUrl(url)) {
    throw new Error(`[BrandedType] Invalid Base64DataUrl: ${url}`);
  }
  return url as Base64DataUrl;
};
// ============================================
// Utility Functions
// ============================================
/**
 * Blob URL を安全に解放
 */
const revokeBlobUrl = (url: BlobUrl): void => {
  URL.revokeObjectURL(url);
};



export { isBlobUrl, isStorageUrl, isBase64DataUrl, createBlobUrl, createStorageUrl, createBase64DataUrl, revokeBlobUrl };


export type { BlobUrl, StorageUrl, Base64DataUrl };
