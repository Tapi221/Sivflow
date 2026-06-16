import { auth } from "@platform/firebase/client";
import type { QueueItem } from "@/application/usecases/persistentOfflineQueueModels";
import { makeAssetRecord, toAssetLikeRecord } from "@/application/usecases/persistentOfflineQueueModels";
import { getLocalDb } from "@/infrastructure/localdb/client";
import { cleanupQueuedAssetSyncItems } from "./cleanupQueuedAssetSyncItems";
import type { UploadedImage } from "@/types";



const handleQueuedAssetUploadSuccess = async (item: QueueItem, updatedImage: UploadedImage): Promise<void> => {
  const localDb = await getLocalDb();
  const existingAsset = toAssetLikeRecord(
    await localDb.images.get(updatedImage.id),
  );

  await localDb.upsert(
    "images",
    makeAssetRecord({
      existing: existingAsset,
      itemId: updatedImage.id,
      userId: auth.currentUser?.uid ?? existingAsset?.userId ?? "",
      mime: (item.fileType || existingAsset?.mime) ?? "application/octet-stream",
      size: (item.fileData.byteLength || existingAsset?.size) ?? 0,
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



export { handleQueuedAssetUploadSuccess };
