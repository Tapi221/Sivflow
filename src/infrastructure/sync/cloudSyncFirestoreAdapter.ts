import { firestoreDb } from "@/infrastructure/firebase/client";
import type { SyncChange } from "@/services/interfaces/ISyncService";
import type {
  DocumentData,
  FieldValue,
  QueryConstraint,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import * as Firestore from "firebase/firestore";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";

import { chunkCloudSyncChangesBySize } from "@/application/usecases/cloudSyncBatching";
import {
  COLLECTION_BY_TYPE,
  CURRENT_TAG_COLLECTION,
  PULLABLE_ENTITY_TYPES,
  getChangeId,
  getChangeParts,
  getUpdatedAtMillis,
  sanitizeSyncDataFromCloud,
  sanitizeSyncDataForCloud,
  type PullableEntityType,
} from "@/application/usecases/cloudSyncShared";

const PAGE_SIZE = 500;

const cloudUpdatedAt = (): FieldValue | Timestamp => {
  const fn = (Firestore as Record<string, unknown>).serverTimestamp;
  if (typeof fn === "function") {
    return (fn as () => FieldValue)();
  }
  return Timestamp.now();
};

export const pullCloudSyncDiff = async (
  userId: string,
  since: number,
): Promise<{ changes: SyncChange[]; serverTime: number }> => {
  console.log("🔄 [CloudSyncAdapter] pullDiff START", {
    since,
    userId,
  });

  const changes: SyncChange[] = [];

  if (!firestoreDb) {
    console.warn(
      "⚠️ [CloudSyncAdapter] firestoreDb is not initialized. Skipping pullDiff.",
    );
    return { changes: [], serverTime: Date.now() };
  }

  const firestore = firestoreDb;

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
        const ref = collection(firestore, `users/${userId}/${COLLECTION_BY_TYPE[type]}`);
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

    const settingsRef = doc(firestore, "userSettings", userId);
    const snap = await getDoc(settingsRef);
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

export const pushCloudSyncBatch = async (
  userId: string,
  changes: SyncChange[],
): Promise<{ successIds: string[]; failedIds: string[]; error?: unknown }> => {
  console.log(`📤 [CloudSyncAdapter] pushBatch START. Count: ${changes.length}`);

  const successIds: string[] = [];
  const failedIds: string[] = [];

  try {
    const firestore = firestoreDb;
    if (!firestore) {
      console.error("❌ [CloudSyncAdapter] firestoreDb is null during pushBatch");
      return {
        successIds: [],
        failedIds: changes
          .map(getChangeId)
          .filter((id): id is string => Boolean(id)),
        error: new Error("Firestore not initialized"),
      };
    }

    const chunks = chunkCloudSyncChangesBySize(changes);
    let firstError: unknown = undefined;

    for (const chunk of chunks) {
      const batch = writeBatch(firestore);
      const chunkIds: string[] = [];

      for (const change of chunk) {
        const parts = getChangeParts(change);
        if (!parts) {
          throw new Error("Invalid sync change payload");
        }

        const { type, id, data } = parts;
        const col = COLLECTION_BY_TYPE[type];
        console.log(`   - Adding to batch: ${col}/${id}`);

        const docRef =
          type === "userSetting"
            ? doc(firestore, "userSettings", id || userId)
            : doc(firestore, `users/${userId}/${col}`, id);

        const sanitized = sanitizeSyncDataForCloud(type, data);
        if (!sanitized || typeof sanitized !== "object") {
          throw new Error(`Invalid payload for ${type}/${id}: expected object`);
        }

        batch.set(
          docRef,
          {
            ...sanitized,
            updatedAt: cloudUpdatedAt(),
          },
          { merge: true },
        );

        chunkIds.push(id);
      }

      try {
        console.log(`   - Committing batch... (ops=${chunkIds.length})`);
        await batch.commit();
        successIds.push(...chunkIds);
      } catch (error) {
        console.error("❌ [CloudSyncAdapter] pushBatch chunk commit ERROR:", error);
        failedIds.push(...chunkIds);
        if (!firstError) firstError = error;
      }
    }

    if (failedIds.length > 0) {
      return { successIds, failedIds, error: firstError };
    }

    console.log("📤 [CloudSyncAdapter] pushBatch SUCCESS");
    return { successIds, failedIds };
  } catch (error) {
    console.error("❌ [CloudSyncAdapter] pushBatch ERROR:", error);
    return {
      successIds: [],
      failedIds: changes
        .map(getChangeId)
        .filter((id): id is string => Boolean(id)),
      error,
    };
  }
};

export const pullCloudSyncFull = async (
  userId: string,
  entityIds: string[],
): Promise<SyncChange[]> => {
  const results: SyncChange[] = [];

  for (const id of entityIds) {
    const firestore = firestoreDb;
    if (!firestore) throw new Error("Firebase Firestore is not initialized.");

    {
      const snap = await getDocs(
        query(collection(firestore, `users/${userId}/cards`), where("id", "==", id)),
      );
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
      const snap = await getDocs(
        query(collection(firestore, `users/${userId}/cardSets`), where("id", "==", id)),
      );
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
      const snap = await getDocs(
        query(collection(firestore, `users/${userId}/documents`), where("id", "==", id)),
      );
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
        query(
          collection(firestore, `users/${userId}/${CURRENT_TAG_COLLECTION}`),
          where("id", "==", id),
        ),
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
      const snap = await getDocs(
        query(collection(firestore, `users/${userId}/images`), where("id", "==", id)),
      );
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
      const snap = await getDocs(
        query(collection(firestore, `users/${userId}/folders`), where("id", "==", id)),
      );
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
      const snap = await getDoc(doc(firestore, "userSettings", userId));
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
