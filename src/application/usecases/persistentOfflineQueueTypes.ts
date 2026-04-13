import type { UploadedImage } from "@/types";

export interface QueueItem {
  id: string;
  image: UploadedImage;
  fileData: ArrayBuffer;
  fileName: string;
  fileType: string;
  retryCount: number;
  enqueuedAt: number;
}

export interface AssetUploadRequest {
  assetId: string;
  userId: string;
  remoteKey: string;
  mime: string;
  size: number;
  fileName?: string;
}
