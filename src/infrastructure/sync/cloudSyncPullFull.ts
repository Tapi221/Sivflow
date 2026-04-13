import type { SyncChange } from "@/services/interfaces/ISyncService";

import { requireCloudSyncFirestore } from "./cloudSyncFirestoreRefs";
import { lookupCloudSyncEntityById } from "./cloudSyncEntityLookup";

export const pullCloudSyncFull = async (
  userId: string,
  entityIds: string[],
): Promise<SyncChange[]> => {
  const results: SyncChange[] = [];
  const firestore = requireCloudSyncFirestore();

  for (const id of entityIds) {
    const change = await lookupCloudSyncEntityById(firestore, userId, id);
    if (change) {
      results.push(change);
    }
  }

  return results;
};
