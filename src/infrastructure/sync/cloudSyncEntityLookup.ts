import type { DocumentData, Firestore } from "firebase/firestore";
import { getDoc, getDocs } from "firebase/firestore";
import type { CloudEntityType, PullableEntityType } from "@/application/usecases/cloudSyncShared";
import { COLLECTION_BY_TYPE, sanitizeSyncDataFromCloud } from "@/application/usecases/cloudSyncShared";
import { getUserSettingsRef, queryEntityById } from "./cloudSyncFirestoreRefs";
import type { SyncChange } from "@/services/interfaces/ISyncService";



type LookupContext = {
  firestore: Firestore;
  userId: string;
  id: string;
};
type CloudSyncLookupDescriptor = {
  type: CloudEntityType;
  resolveData: (context: LookupContext) => Promise<DocumentData | null>;
  resolveSyncId: (context: LookupContext) => string;
};



const lookupPullableEntityData = async (
  firestore: Firestore,
  userId: string,
  type: PullableEntityType,
  id: string,
): Promise<DocumentData | null> => {
  const snap = await getDocs(
    queryEntityById(firestore, userId, COLLECTION_BY_TYPE[type], id),
  );

  return snap.empty ? null : snap.docs[0].data();
};
const lookupUserSettingData = async (
  firestore: Firestore,
  userId: string,
): Promise<DocumentData | null> => {
  const snap = await getDoc(getUserSettingsRef(firestore, userId));
  return snap.exists() ? snap.data() : null;
};
const createPullableLookupDescriptor = (
  type: PullableEntityType,
): CloudSyncLookupDescriptor => ({
  type,
  resolveData: ({ firestore, userId, id }) =>
    lookupPullableEntityData(firestore, userId, type, id),
  resolveSyncId: ({ id }) => id,
});



const PULL_FULL_LOOKUP_ORDER: readonly CloudSyncLookupDescriptor[] = [
  createPullableLookupDescriptor("card"),
  createPullableLookupDescriptor("cardSet"),
  createPullableLookupDescriptor("document"),
  createPullableLookupDescriptor("tag"),
  createPullableLookupDescriptor("asset"),
  createPullableLookupDescriptor("folder"),
  {
    type: "userSetting",
    resolveData: ({ firestore, userId }) =>
      lookupUserSettingData(firestore, userId),
    resolveSyncId: ({ userId }) => userId,
  },
];



const lookupCloudSyncEntityById = async (firestore: Firestore, userId: string, id: string): Promise<SyncChange | null> => {
  for (const descriptor of PULL_FULL_LOOKUP_ORDER) {
    const context = { firestore, userId, id };
    const data = await descriptor.resolveData(context);
    if (!data) {
      continue;
    }

    return {
      type: descriptor.type,
      id: descriptor.resolveSyncId(context),
      data: sanitizeSyncDataFromCloud(descriptor.type, data),
    };
  }

  return null;
};



export { lookupCloudSyncEntityById };
