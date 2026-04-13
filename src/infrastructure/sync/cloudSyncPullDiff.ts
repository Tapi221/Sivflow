import type { SyncChange } from "@/services/interfaces/ISyncService";
import type {
  DocumentData,
  QueryConstraint,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import * as Firestore from "firebase/firestore";
import {
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";

import {
  COLLECTION_BY_TYPE,
  PULLABLE_ENTITY_TYPES,
  getUpdatedAtMillis,
  sanitizeSyncDataFromCloud,
  type PullableEntityType,
} from "@/application/usecases/cloudSyncShared";

import {
  getPullableCollectionRef,
  getUserSettingsRef,
  requireCloudSyncFirestore,
} from "./cloudSyncFirestoreRefs";

const PAGE_SIZE = 500;

export const pullCloudSyncDiff = async (
  userId: string,
  since: number,
): Promise<{ changes: SyncChange[]; serverTime: number }> => {
  console.log("🔄 [CloudSyncAdapter] pullDiff START", {
    since,
    userId,
  });

  const changes: SyncChange[] = [];
  const firestore = requireCloudSyncFirestore();

  try {
    const sinceTimestamp = Timestamp.fromMillis(since);
    const startAfterValue = (Firestore as Record<string, unknown>).startAfter;
    const startAfterFn =
      typeof startAfterValue === "function"
        ? (startAfterValue as (
            snapshot: QueryDocumentSnapshot<DocumentData>,
          ) => QueryConstraint)
        : null;

    const pullCollectionDiff = async (type: PullableEntityType) => {
      try {
        const ref = getPullableCollectionRef(firestore, userId, type);
        let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
        let total = 0;

        while (true) {
          const constraints: QueryConstraint[] = [
            where("updatedAt", ">", sinceTimestamp),
            orderBy("updatedAt", "asc"),
            limit(PAGE_SIZE),
          ];

          if (startAfterFn && lastDoc) {
            constraints.splice(2, 0, startAfterFn(lastDoc));
          }

          const qy = query(ref, ...constraints);
          const snap = await getDocs(qy);
          total += snap.size;

          snap.forEach((d) => {
            changes.push({
              type,
              id: d.id,
              data: sanitizeSyncDataFromCloud(type, d.data()),
            });
          });

          if (!startAfterFn || snap.empty || snap.size < PAGE_SIZE) break;
          lastDoc = snap.docs[snap.docs.length - 1] ?? null;
        }

        console.log(
          `[CloudSyncAdapter] Remote ${COLLECTION_BY_TYPE[type]} found: ${total}`,
        );
      } catch (error) {
        console.error(
          `[CloudSyncAdapter] pullCollectionDiff failed for ${type}`,
          error,
        );
      }
    };

    for (const type of PULLABLE_ENTITY_TYPES) {
      await pullCollectionDiff(type);
    }

    const snap = await getDoc(getUserSettingsRef(firestore, userId));
    if (snap.exists()) {
      const data = sanitizeSyncDataFromCloud("userSetting", snap.data());
      const updatedAt =
        data && typeof data === "object"
          ? getUpdatedAtMillis((data as Record<string, unknown>).updatedAt)
          : 0;
      if (!since || updatedAt > since) {
        changes.push({ type: "userSetting", id: snap.id, data });
      }
    }

    console.log(
      `🔄 [CloudSyncAdapter] pullDiff SUCCESS. Total changes: ${changes.length}`,
    );
    return { changes, serverTime: Date.now() };
  } catch (error) {
    console.error("❌ [CloudSyncAdapter] pullDiff ERROR:", error);
    throw error;
  }
};
