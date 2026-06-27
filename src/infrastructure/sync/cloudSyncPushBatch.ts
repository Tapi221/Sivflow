import type { FieldValue } from "firebase/firestore";
import * as Firestore from "firebase/firestore";
import { Timestamp, writeBatch } from "firebase/firestore";
import { chunkCloudSyncChangesBySize } from "@/application/usecases/cloudSyncBatching";
import { getChangeId, getChangeParts, sanitizeSyncDataForCloud } from "@/application/usecases/cloudSyncShared";
import { getPushDocumentRef, requireCloudSyncFirestore } from "./cloudSyncFirestoreRefs";
import type { SyncChange } from "@/services/interfaces/ISyncService";



type SyncChangeWithOperation = SyncChange & {
  operationType?: unknown;
};



const cloudUpdatedAt = (): FieldValue | Timestamp => {
  const fn = (Firestore as Record<string, unknown>).serverTimestamp;
  if (typeof fn === "function") {
    return (fn as () => FieldValue)();
  }
  return Timestamp.now();
};
const isDeleteSyncChange = (change: SyncChange): boolean => {
  return (change as SyncChangeWithOperation).operationType === "delete";
};
const toRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
};
const buildDeleteTombstone = (id: string, data: unknown): Record<string, unknown> => {
  const tombstone = toRecord(data);
  tombstone.id = id;
  tombstone.isDeleted = true;
  tombstone.deletedAt ??= cloudUpdatedAt();
  return tombstone;
};
const pushCloudSyncBatch = async (userId: string, changes: SyncChange[]): Promise<{ successIds: string[]; failedIds: string[]; error?: unknown; }> => {
  console.log(
    `[クラウド同期アダプター] pushBatch を開始しました。件数: ${changes.length}`,
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
          throw new Error("同期変更データの形式が不正です");
        }

        const { type, id, data } = parts;
        const documentRef = getPushDocumentRef(firestore, userId, type, id);

        if (isDeleteSyncChange(change)) {
          console.log(`   - 削除マーカーをバッチに書き込みます: ${type}/${id}`);
          const tombstone = sanitizeSyncDataForCloud(type, buildDeleteTombstone(id, data));
          if (!tombstone || typeof tombstone !== "object") {
            throw new Error(`削除データの形式が不正です: ${type}/${id} はオブジェクトである必要があります`);
          }
          batch.set(
            documentRef,
            {
              ...(tombstone as Record<string, unknown>),
              id,
              isDeleted: true,
              updatedAt: cloudUpdatedAt(),
            },
            { merge: true },
          );
          chunkIds.push(id);
          continue;
        }

        console.log(`   - バッチに追加します: ${type}/${id}`);

        const sanitized = sanitizeSyncDataForCloud(type, data);
        if (!sanitized || typeof sanitized !== "object") {
          throw new Error(`同期データの形式が不正です: ${type}/${id} はオブジェクトである必要があります`);
        }

        batch.set(
          documentRef,
          {
            ...sanitized,
            updatedAt: cloudUpdatedAt(),
          },
          { merge: true },
        );

        chunkIds.push(id);
      }

      try {
        console.log(`   - バッチをコミットしています... (操作数=${chunkIds.length})`);
        await batch.commit();
        successIds.push(...chunkIds);
      } catch (error) {
        console.error(
          "[クラウド同期アダプター] pushBatch チャンクのコミットに失敗しました:",
          error,
        );
        failedIds.push(...chunkIds);
        if (!firstError) firstError = error;
      }
    }

    if (failedIds.length > 0) {
      return { successIds, failedIds, error: firstError };
    }

    console.log("[クラウド同期アダプター] pushBatch が成功しました");
    return { successIds, failedIds };
  } catch (error) {
    console.error("[クラウド同期アダプター] pushBatch に失敗しました:", error);
    return {
      successIds: [],
      failedIds: changes
        .map(getChangeId)
        .filter((id): id is string => Boolean(id)),
      error,
    };
  }
};



export { pushCloudSyncBatch };
