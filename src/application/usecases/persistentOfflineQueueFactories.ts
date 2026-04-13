import type { UploadedImage } from "@/types";

import type { AssetUploadRequest } from "./persistentOfflineQueueTypes";

export const createAssetQueueImage = (
  request: AssetUploadRequest,
): UploadedImage => ({
  id: request.assetId,
  assetId: request.assetId,
  localFileId: request.assetId,
  status: "uploading",
  remoteUrl: null,
  storagePath: request.remoteKey,
  contentType: request.mime,
  size: request.size,
  sizeBytes: request.size,
  retryCount: 0,
  updatedAt: new Date(),
});
