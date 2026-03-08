import type { BlobUrl, StorageUrl } from "../core/branded";

/**
 * メディアアセットの種類
 */
export type MediaKind = "image" | "audio" | "video" | "pdf";

/**
 * メディアアセットの状態
 */
export type MediaStatus = "pending" | "uploading" | "ready" | "failed";

/**
 * メディアアセットの統一インターフェース
 *
 * 画像・音声・動画を同じ設計で扱うための抽象化
 *
 * 不変条件:
 * 1. localRef は Blob URL のみ
 * 2. remoteRef は Storage URL のみ
 * 3. Base64 は一切保存してはならない
 */
export interface MediaAsset {
  id: string;
  kind: MediaKind;
  localRef?: BlobUrl | null; // ローカル参照（Blob URL）
  remoteRef?: StorageUrl | null; // リモート参照（Storage URL）
  thumbnailRef?: StorageUrl | null; // サムネイル参照（Storage URL）
  status: MediaStatus;
  contentType?: string | null;
  sizeBytes?: number | null;
  storagePath?: string | null;
  checksum?: string | null;

  // メタデータ
  duration?: number | null; // 音声・動画の長さ（秒）
  width?: number | null; // 画像・動画の幅
  height?: number | null; // 画像・動画の高さ

  // 同期状態
  uploadState?: "pending" | "inProgress" | "completed" | "failed";
  lastAttempt?: Date | null;
  source?: "cloud" | "local_fallback";
  fallbackReason?: string | null;
}

/**
 * UploadedImage から MediaAsset への変換
 */
export const imageToMediaAsset = (image: unknown): MediaAsset => {
  return {
    id: image.id,
    kind: "image",
    localRef: image.localUrl,
    remoteRef: image.remoteUrl,
    thumbnailRef: image.thumbnailUrl,
    status:
      image.status === "uploading"
        ? "uploading"
        : image.status === "ready"
          ? "ready"
          : image.status === "pending"
            ? "pending"
            : "failed",
    contentType: image.contentType,
    sizeBytes: image.sizeBytes || image.size,
    storagePath: image.storagePath,
    checksum: image.checksum,
    uploadState:
      image.status === "uploading"
        ? "inProgress"
        : image.status === "ready"
          ? "completed"
          : image.status === "pending"
            ? "pending"
            : "failed",
    lastAttempt: image.lastAttempt,
    source: image.source,
    fallbackReason: image.fallbackReason,
  };
};

/**
 * MediaAsset から UploadedImage への変換（後方互換性）
 */
export const mediaAssetToImage = (asset: MediaAsset): unknown => {
  if (asset.kind !== "image") {
    throw new Error("MediaAsset is not an image");
  }

  return {
    id: asset.id,
    localUrl: asset.localRef,
    remoteUrl: asset.remoteRef,
    thumbnailUrl: asset.thumbnailRef,
    status:
      asset.status === "uploading"
        ? "uploading"
        : asset.status === "ready"
          ? "ready"
          : asset.status === "pending"
            ? "pending"
            : "failed",
    contentType: asset.contentType,
    sizeBytes: asset.sizeBytes,
    storagePath: asset.storagePath,
    checksum: asset.checksum,
    uploadState:
      asset.status === "uploading"
        ? "inProgress"
        : asset.status === "ready"
          ? "completed"
          : asset.status === "pending"
            ? "pending"
            : "failed",
    lastAttempt: asset.lastAttempt,
    source: asset.source,
    fallbackReason: asset.fallbackReason,
  };
};



