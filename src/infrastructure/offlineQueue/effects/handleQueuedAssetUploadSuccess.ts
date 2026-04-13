import { getLocalDb } from "@/services/localDB";
import { auth } from "@/services/firebase";
import type { UploadedImage } from "@/types";

import {
  makeAssetRecord,
  toAssetLikeRecord,
  type QueueItem,
} from "@/application/usecases/persistentOfflineQueueModels";

import { cleanupQueuedAssetSyncItems } from "./cleanupQueuedAssetSyncItems";

export const handleQueuedAssetUploadSuccess = async (
  item: QueueItem,
  updatedImage: UploadedImage,
): Promise<void> => {
  const localDb = await getLocalDb();
  const existingAsset = toAssetLikeRecord(
    await localDb.images.get(updatedImage.id),
  );

  await localDb.images.put(
    makeAssetRecord({
      existing: existingAsset,
      itemId: updatedImage.id,
      userId: auth.currentUser?.uid ?? existingAsset?.userId ?? "",
      mime: item.fileType || existingAsset?.mime || "application/octet-stream",
      size: item.fileData.byteLength || existingAsset?.size || 0,
      localBlobId:
        existingAsset?.localBlobId ||
        updatedImage.localFileId ||
        updatedImage.id,
      remoteKey: updatedImage.storagePath ?? existingAsset?.remoteKey ?? null,
      remoteStatus: "ready",
      remoteUrlCache:
        typeof updatedImage.remoteUrl === "string"
          ? updatedImage.remoteUrl
          : (existingAsset?.remoteUrlCache ?? null),
      retryCount: 0,
    }),
  );

  await cleanupQueuedAssetSyncItems(updatedImage.id);

  if (import.meta.env.DEV) {
    console.info("[AssetSync] upload success", {
      assetId: updatedImage.id,
      remoteKey: updatedImage.storagePath ?? null,
    });
  }
};
