import type { DocumentData, QueryConstraint, QueryDocumentSnapshot } from "firebase/firestore";
import * as Firestore from "firebase/firestore";
import { getDoc, getDocs, limit, orderBy, query, Timestamp, where } from "firebase/firestore";
import type { PullableEntityType } from "@/application/usecases/cloudSyncShared";
import { getUpdatedAtMillis, PULLABLE_ENTITY_TYPES, sanitizeSyncDataFromCloud } from "@/application/usecases/cloudSyncShared";
import { getPullableCollectionRef, getUserSettingsRef, requireCloudSyncFirestore } from "./cloudSyncFirestoreRefs";
import type { SyncChange } from "@/services/interfaces/ISyncService";



type PullDiffChange = SyncChange & {
  type: PullableEntityType | "userSetting";
  id: string;
  data: unknown;
  updatedAt: number;
};



const PAGE_SIZE = 500;



const getStartAfterConstraint = (snapshot: QueryDocumentSnapshot<DocumentData>): QueryConstraint | null => {
  const fn = (Firestore as Record<string, unknown>).startAfter;
  if (typeof fn !== "function") {
    return null;
  }

  return (fn as (value: QueryDocumentSnapshot<DocumentData>) => QueryConstraint)(
    snapshot,
  );
};
const getChangeId = (snapshot: QueryDocumentSnapshot<DocumentData>, data: DocumentData): string => {
  const value = data.id;
  return typeof value === "string" && value.length > 0 ? value : snapshot.id;
};
const toPullDiffChange = (type: PullableEntityType, snapshot: QueryDocumentSnapshot<DocumentData>): PullDiffChange => {
  const data = snapshot.data();

  return {
    type,
    id: getChangeId(snapshot, data),
    data: sanitizeSyncDataFromCloud(type, data),
    updatedAt: getUpdatedAtMillis(data.updatedAt),
  };
};
const fetchPullableEntityDiff = async (userId: string, type: PullableEntityType, sinceTimestamp: Timestamp): Promise<PullDiffChange[]> => {
  const firestore = requireCloudSyncFirestore();
  const collectionRef = getPullableCollectionRef(firestore, userId, type);
  const changes: PullDiffChange[] = [];
  let lastDocument: QueryDocumentSnapshot<DocumentData> | null = null;

  while (true) {
    const constraints: QueryConstraint[] = [
      where("updatedAt", ">", sinceTimestamp),
      orderBy("updatedAt", "asc"),
      limit(PAGE_SIZE),
    ];

    if (lastDocument) {
      const startAfterConstraint = getStartAfterConstraint(lastDocument);
      if (startAfterConstraint) {
        constraints.push(startAfterConstraint);
      }
    }

    const snapshot = await getDocs(query(collectionRef, ...constraints));
    changes.push(...snapshot.docs.map((document) => toPullDiffChange(type, document)));

    if (snapshot.empty || snapshot.size < PAGE_SIZE) {
      break;
    }

    lastDocument = snapshot.docs[snapshot.docs.length - 1] ?? null;
    if (!lastDocument) {
      break;
    }
  }

  return changes;
};
const fetchUserSettingsDiff = async (userId: string, since: number): Promise<PullDiffChange[]> => {
  const firestore = requireCloudSyncFirestore();
  const snapshot = await getDoc(getUserSettingsRef(firestore, userId));
  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.data();
  const updatedAt = getUpdatedAtMillis(data.updatedAt);
  if (since > 0 && updatedAt <= since) {
    return [];
  }

  return [
    {
      type: "userSetting",
      id: userId,
      data: sanitizeSyncDataFromCloud("userSetting", data),
      updatedAt,
    },
  ];
};
const pullCloudSyncDiff = async (userId: string, since: number): Promise<{ changes: SyncChange[]; serverTime: number; }> => {
  const sinceTimestamp = Timestamp.fromMillis(Math.max(0, since));

  const pullableResults = await Promise.all(
    PULLABLE_ENTITY_TYPES.map((type) =>
      fetchPullableEntityDiff(userId, type, sinceTimestamp),
    ),
  );
  const userSettingChanges = await fetchUserSettingsDiff(userId, since);

  const changes = [...pullableResults.flat(), ...userSettingChanges]
    .sort((left, right) => {
      if (left.updatedAt !== right.updatedAt) {
        return left.updatedAt - right.updatedAt;
      }
      if (left.type !== right.type) {
        return left.type.localeCompare(right.type);
      }
      return left.id.localeCompare(right.id);
    })
    .map(({ updatedAt: _updatedAt, ...change }) => change);

  return {
    changes,
    serverTime: Timestamp.now().toMillis(),
  };
};



export { pullCloudSyncDiff };
