import type { BlobUrl, StorageUrl } from "@/types/core/branded";



/**
 * メディアアセットの種類
 */
type MediaKind = "image" | "audio" | "video" | "pdf";
/**
 * メディアアセットの状態
 */
type MediaStatus = "pending" | "uploading" | "ready" | "failed";
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
interface MediaAsset {
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

export type { MediaKind, MediaStatus, MediaAsset };
