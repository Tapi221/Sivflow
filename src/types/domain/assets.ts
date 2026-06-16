import { Timestamp } from "firebase/firestore";
import type { BlobUrl, StorageUrl } from "@/types/core/branded";



type UploadedImageStatus = "pending" | "uploading" | "ready" | "failed";
/** @deprecated Use UploadedImageStatus instead */
type UploadState = "pending" | "inProgress" | "completed" | "failed";
type UploadSource = "cloud" | "local_fallback";
type UploadFallbackReason = | "timeout" | "network_error" | "permission_error" | "unknown";
type AssetRemoteStatus = "none" | "uploading" | "ready" | "failed";
type AssetLocalStatus = "present" | "missing";
interface AssetRecord {
  id: string;
  userId: string;
  mime: string;
  size: number;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  localBlobId: string | null;
  localStatus: AssetLocalStatus;
  remoteKey?: string | null;
  remoteStatus: AssetRemoteStatus;
  remoteUrlCache?: string | null;
  retryCount?: number;
  width?: number | null;
  height?: number | null;
  sha256?: string | null;
}
interface ImageBlockLayout {
  /** fixed 本文座標系での画像論理幅。fixed / fluid 共通の正本。 */ baseWidthPx?: number | null;
  cropX?: number | null;
}
interface CardImageRef {
  assetId: string;
  scale?: number | null;
  x?: number | null;
  layout?: ImageBlockLayout | null;
  naturalW?: number | null;
  naturalH?: number | null;
}
type ResolvableImageRef = {
  id?: string | null;
  assetId?: string | null;
  localFileId?: string | null;
  remoteUrl?: string | null;
  localUrl?: string | null;
  url?: string | null;
  storagePath?: string | null;
  scale?: number | null;
  x?: number | null;
  layout?: ImageBlockLayout | null;
  naturalW?: number | null;
  naturalH?: number | null;
};
interface UploadedImage {
  id: string;
  assetId?: string | null;
  localUrl?: BlobUrl | null;
  remoteUrl?: StorageUrl | null;
  thumbnailUrl?: StorageUrl | null;
  remoteId?: string | null;
  storagePath?: string | null;
  localFileId?: string | null;
  status: UploadedImageStatus;
  progress?: number;
  contentType?: string | null;
  size?: number | null;
  sizeBytes?: number | null;
  checksum?: string;
  retryCount?: number;
  error?: string;
  uploadOrder?: number;
  scale?: number | null;
  x?: number | null;
  layout?: ImageBlockLayout | null;
  naturalW?: number | null;
  naturalH?: number | null;
  uploadState?: UploadState;
  lastAttempt?: Date | Timestamp | null;
  source?: UploadSource;
  fallbackReason?: UploadFallbackReason;
  updatedAt?: Date | Timestamp | null;
}
interface UploadedPdf {
  id: string;
  assetId?: string | null;
  filename: string;
  localUrl?: BlobUrl | null;
  remoteUrl?: StorageUrl | null;
  storagePath?: string | null;
  localFileId?: string | null;
  status: UploadedImageStatus;
  progress?: number;
  contentType?: string | null;
  size?: number | null;
  sizeBytes?: number | null;
  retryCount?: number;
  error?: string;
  source?: UploadSource;
  fallbackReason?: UploadFallbackReason;
  updatedAt?: Date | Timestamp | null;
}
interface UploadedFile {
  id: string;
  name: string;
  remoteUrl: string;
  storagePath: string;
  contentType?: string | null;
  size?: number | null;
}
interface UploadMetadata {
  id: string;
  userId: string;
  originalFilename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  context:
  | "card_image"
  | "card_audio"
  | "pdf"
  | { type: string;[key: string]: unknown; };
  status: "pending" | "uploading" | "ready" | "failed";
  userAgent?: string;
  downloadUrl?: string;
  uploadedAt?: Date | Timestamp;
}

export type { UploadedImageStatus, UploadState, UploadSource, UploadFallbackReason, AssetRemoteStatus, AssetLocalStatus, AssetRecord, CardImageRef, ResolvableImageRef, ImageBlockLayout, UploadedImage, UploadedPdf, UploadedFile, UploadMetadata };
