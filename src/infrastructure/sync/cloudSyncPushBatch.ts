import type { SyncChange } from "@/services/interfaces/ISyncService";
import type { FieldValue } from "firebase/firestore";
import * as Firestore from "firebase/firestore";
import { Timestamp, writeBatch } from "firebase/firestore";

import { chunkCloudSyncChangesBySize } from "@/application/usecases/cloudSyncBatching";
import {
  getChangeId,
  getChangeParts,
  sanitizeSyncDataForCloud,
} from "@/application/usecases/cloudSyncShared";

import {
  getPushDocumentRef,
  requireCloudSyncFirestore,
} from "./cloudSyncFirestoreRefs";

const cloudUpdatedAt = (): FieldValue | Timestamp => {
  const fn = (Firestore as Record<string, unknown>).serverTimestamp;
  if (typeof fn === "function") {
    return (fn as () => FieldValue)();
  }
  return Timestamp.now();
};

export const pushCloudSyncBatch = async (
  userId: string,
  changes: SyncChange[],
): Promise<{ successIds: string[]; failedIds: string[]; error?: unknown }> => {
  console.log(
    `📤 [CloudSyncAdapter] pushBatch START. Count: ${changes.length}`,
  );

  const successIds: string[] = [];
  const failedIds: string[] = [];

  try {
    const firestore = requireCloudSyncFirestore();
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
        console.log(`   - Adding to batch: ${type}/${id}`);

        const sanitized = sanitizeSyncDataForCloud(type, data);
        if (!sanitized || typeof sanitized !== "object") {
          throw new Error(`Invalid payload for ${type}/${id}: expected object`);
        }

        batch.set(
          getPushDocumentRef(firestore, userId, type, id),
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
        console.error(
          "❌ [CloudSyncAdapter] pushBatch chunk commit ERROR:",
          error,
        );
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
