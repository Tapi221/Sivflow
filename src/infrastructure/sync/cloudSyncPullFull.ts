import type { SyncChange } from "@/services/interfaces/ISyncService";
import { getDoc, getDocs } from "firebase/firestore";

import {
  CURRENT_TAG_COLLECTION,
  sanitizeSyncDataFromCloud,
} from "@/application/usecases/cloudSyncShared";

import {
  getUserSettingsRef,
  queryEntityById,
  requireCloudSyncFirestore,
} from "./cloudSyncFirestoreRefs";

export const pullCloudSyncFull = async (
  userId: string,
  entityIds: string[],
): Promise<SyncChange[]> => {
  const results: SyncChange[] = [];
  const firestore = requireCloudSyncFirestore();

  for (const id of entityIds) {
    {
      const snap = await getDocs(queryEntityById(firestore, userId, "cards", id));
      if (!snap.empty) {
        results.push({
          type: "card",
          id,
          data: sanitizeSyncDataFromCloud("card", snap.docs[0].data()),
        });
        continue;
      }
    }

    {
      const snap = await getDocs(queryEntityById(firestore, userId, "cardSets", id));
      if (!snap.empty) {
        results.push({
          type: "cardSet",
          id,
          data: sanitizeSyncDataFromCloud("cardSet", snap.docs[0].data()),
        });
        continue;
      }
    }

    {
      const snap = await getDocs(queryEntityById(firestore, userId, "documents", id));
      if (!snap.empty) {
        results.push({
          type: "document",
          id,
          data: sanitizeSyncDataFromCloud("document", snap.docs[0].data()),
        });
        continue;
      }
    }

    {
      const snap = await getDocs(
        queryEntityById(firestore, userId, CURRENT_TAG_COLLECTION, id),
      );
      if (!snap.empty) {
        results.push({
          type: "tag",
          id,
          data: sanitizeSyncDataFromCloud("tag", snap.docs[0].data()),
        });
        continue;
      }
    }

    {
      const snap = await getDocs(queryEntityById(firestore, userId, "images", id));
      if (!snap.empty) {
        results.push({
          type: "asset",
          id,
          data: sanitizeSyncDataFromCloud("asset", snap.docs[0].data()),
        });
        continue;
      }
    }

    {
      const snap = await getDocs(queryEntityById(firestore, userId, "folders", id));
      if (!snap.empty) {
        results.push({
          type: "folder",
          id,
          data: sanitizeSyncDataFromCloud("folder", snap.docs[0].data()),
        });
        continue;
      }
    }

    {
      const snap = await getDoc(getUserSettingsRef(firestore, userId));
      if (snap.exists()) {
        results.push({
          type: "userSetting",
          id: userId,
          data: sanitizeSyncDataFromCloud("userSetting", snap.data()),
        });
      }
    }
  }

  return results;
};
