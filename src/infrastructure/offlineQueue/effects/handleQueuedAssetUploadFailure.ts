import { auth } from "@platform/firebase/client";
import type { QueueItem } from "@/application/usecases/persistentOfflineQueueModels";
import { makeAssetRecord, toAssetLikeRecord } from "@/application/usecases/persistentOfflineQueueModels";
import { getLocalDb } from "@/infrastructure/localdb/client";



const handleQueuedAssetUploadFailure = async (item: QueueItem): Promise<void> => {
  try {
    const localDb = await getLocalDb();
    const existingAsset = toAssetLikeRecord(await localDb.images.get(item.id));

    await localDb.upsert(
      "images",
      makeAssetRecord({
        existing: existingAsset,
        itemId: item.id,
        userId: auth.currentUser?.uid ?? existingAsset?.userId ?? "",
        mime:
          (item.fileType || existingAsset?.mime) ?? "application/octet-stream",
        size: (item.fileData.byteLength || existingAsset?.size) ?? 0,
        localBlobId: existingAsset?.localBlobId || item.id,
        remoteKey: existingAsset?.remoteKey ?? null,
        remoteStatus: "failed",
        remoteUrlCache: existingAsset?.remoteUrlCache ?? null,
        retryCount: (existingAsset?.retryCount ?? 0) + 1,
      }),
    );

    if (import.meta.env.DEV) {
      console.warn("[AssetSync] upload failed", {
        assetId: item.id,
      });
    }
  } catch (assetErr) {
    console.warn("[PersistentQueue] Failed to update asset status", assetErr);
  }
};



export { handleQueuedAssetUploadFailure };
