import type { UploadedImage } from "@/types";



interface QueueItem {
  id: string;
  image: UploadedImage;
  fileData: ArrayBuffer;
  fileName: string;
  fileType: string;
  retryCount: number;
  enqueuedAt: number;
}
interface AssetUploadRequest {
  assetId: string;
  userId: string;
  remoteKey: string;
  mime: string;
  size: number;
  fileName?: string;
}

export type { QueueItem, AssetUploadRequest };
