import type { AssetUploadRequest } from "./persistentOfflineQueueTypes";
import type { UploadedImage } from "@/types";



const createAssetQueueImage = (request: AssetUploadRequest): UploadedImage => ({ id: request.assetId, assetId: request.assetId, localFileId: request.assetId, status: "uploading", remoteUrl: null, storagePath: request.remoteKey, contentType: request.mime, size: request.size, sizeBytes: request.size, retryCount: 0, updatedAt: new Date() });



export { createAssetQueueImage };
