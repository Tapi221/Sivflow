import type { SyncChange } from "@/services/interfaces/ISyncService";
import { getDoc, getDocs, type Firestore } from "firebase/firestore";

import {
  COLLECTION_BY_TYPE,
  sanitizeSyncDataFromCloud,
  type PullableEntityType,
} from "@/application/usecases/cloudSyncShared";

import { getUserSettingsRef, queryEntityById } from "./cloudSyncFirestoreRefs";

type PullLookupDescriptor = {
  type: PullableEntityType;
};

const PULL_FULL_LOOKUP_ORDER: readonly PullLookupDescriptor[] = [
  { type: "card" },
  { type: "cardSet" },
  { type: "document" },
  { type: "tag" },
  { type: "asset" },
  { type: "folder" },
];

const lookupPullableEntityById = async (
  firestore: Firestore,
  userId: string,
  id: string,
): Promise<SyncChange | null> => {
  for (const descriptor of PULL_FULL_LOOKUP_ORDER) {
    const snap = await getDocs(
      queryEntityById(firestore, userId, COLLECTION_BY_TYPE[descriptor.type], id),
    );
    if (snap.empty) {
      continue;
    }

    return {
      type: descriptor.type,
      id,
      data: sanitizeSyncDataFromCloud(descriptor.type, snap.docs[0].data()),
    };
  }

  return null;
};

export const lookupCloudSyncEntityById = async (
  firestore: Firestore,
  userId: string,
  id: string,
): Promise<SyncChange | null> => {
  const entityChange = await lookupPullableEntityById(firestore, userId, id);
  if (entityChange) {
    return entityChange;
  }

  const snap = await getDoc(getUserSettingsRef(firestore, userId));
  if (!snap.exists()) {
    return null;
  }

  return {
    type: "userSetting",
    id: userId,
    data: sanitizeSyncDataFromCloud("userSetting", snap.data()),
  };
};
