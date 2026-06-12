import { getLocalDb } from "@/infrastructure/localdb/client";
import type { SyncQueueItem } from "@/types";



const cleanupQueuedAssetSyncItems = async (assetId: string): Promise<void> => {
  const localDb = await getLocalDb();
  const pendingAssetSyncItems = (await localDb.syncQueue.toArray()).filter(
    (queueItem: SyncQueueItem) =>
      queueItem.targetId === assetId && queueItem.entity === "asset",
  );

  if (pendingAssetSyncItems.length === 0) {
    return;
  }

  await localDb.syncQueue.bulkDelete(
    pendingAssetSyncItems.map((queueItem: SyncQueueItem) => queueItem.id),
  );
};



export { cleanupQueuedAssetSyncItems };
