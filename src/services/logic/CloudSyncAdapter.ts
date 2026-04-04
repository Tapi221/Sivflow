import { firestoreDb } from "@/services/firebase";
import type {
  ICloudSyncAdapter,
  SyncChange,
} from "@/services/interfaces/ISyncService";
import { sanitizeBlobUrlsDeep } from "@/utils/blobUrlSanitizer";
import { sanitizeForLog } from "@/utils/logSanitizer";
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

const deepStripUndefined = (input: unknown): any => {
  if (input === undefined) return undefined;
  if (input === null) return null;

  if (input instanceof Timestamp) return input;
  if (input instanceof Date) return input;

  if (Array.isArray(input)) {
    return input.map(deepStripUndefined).filter((v) => v !== undefined);
  }

  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      const cleaned = deepStripUndefined(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }

  return input;
};

const cloudUpdatedAt = () => {
  const firestoreObj = Firestore as any;
  const fn = firestoreObj.serverTimestamp;
  if (typeof fn === "function") return fn();
  return Timestamp.now();
};

type CloudEntityType =
  | "card"
  | "folder"
  | "cardSet"
  | "document"
  | "tag"
  | "asset"
  | "userSetting";

type PullableEntityType = Exclude<CloudEntityType, "userSetting">;

const COLLECTION_BY_TYPE: Record<CloudEntityType, string> = {
  card: "cards",
  folder: "folders",
  cardSet: "cardSets",
  document: "documents",
  tag: "tags_v3",
  asset: "images",
  userSetting: "userSettings",
};

const PULLABLE_ENTITY_TYPES: ReadonlyArray<PullableEntityType> = [
  "card",
  "folder",
  "cardSet",
  "document",
  "tag",
  "asset",
];

/**
 * Firestore writeBatch は「1リクエストあたり 10MiB」制限がある。
 * 大きい変更が混ざると commit が普通に死ぬので、サイズでチャンクして複数回 commit する。
 * （余裕を見て 7.5MiB 目安）
 */
const MAX_BATCH_BYTES = Math.floor(7.5 * 1024 * 1024);
/**
 * Firestore batch の最大書き込み数は 500。余裕を見て 450。
 */
const MAX_BATCH_OPS = 450;
/**
 * pullDiff のページサイズ（無限 getDocs で死なないように）
 */
const PAGE_SIZE = 500;

const _encoder = new TextEncoder();

const estimateBytes = (value: unknown) => {
  try {
    return _encoder.encode(JSON.stringify(value)).length;
  } catch {
    // stringify 不能 = だいたい危険なので大きめに見積もる
    return 1024 * 1024;
  }
};

const chunkChangesBySize = (changes: unknown[]) => {
  const chunks: unknown[][] = [];
  let current: unknown[] = [];
  let bytes = 0;

  for (const ch of changes as any[]) {
    // data だけじゃなく type/id も少し上乗せ
    const docBytes = estimateBytes(ch?.data ?? {});
    const extra = docBytes + 512;

    const wouldExceedBytes =
      current.length > 0 && bytes + extra > MAX_BATCH_BYTES;
    const wouldExceedOps =
      current.length > 0 && current.length + 1 > MAX_BATCH_OPS;

    if (wouldExceedBytes || wouldExceedOps) {
      chunks.push(current);
      current = [];
      bytes = 0;
    }

    current.push(ch);
    bytes += extra;
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
};

export class CloudSyncAdapter implements ICloudSyncAdapter {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  private sanitizeForCloud(type: string, data: unknown): unknown {
    if (!data) return data;

    const cleaned = deepStripUndefined(data);
    if (!cleaned || typeof cleaned !== "object") return cleaned;
    const record = { ...(cleaned as Record<string, unknown>) };

    if (type === "document") {
      delete record.localFileId;
      delete record.blobUrl;
      if (
        typeof record.localUrl === "string" &&
        record.localUrl.startsWith("blob:")
      ) {
        record.localUrl = null;
      }
      return record;
    }

    if (type === "asset") {
      delete record.localBlobId;
      delete record.localStatus;
      return record;
    }

    return record;
  }

  private sanitizeFromCloud(type: string, data: unknown): unknown {
    if (!data) return data;
    const stripped = deepStripUndefined(data);
    const record =
      stripped && typeof stripped === "object"
        ? { ...(stripped as Record<string, unknown>) }
        : stripped;

    if (type === "document" && record && typeof record === "object") {
      delete (record as Record<string, unknown>).localFileId;
      delete (record as Record<string, unknown>).blobUrl;
      if (
        typeof (record as Record<string, unknown>).localUrl === "string" &&
        (record as Record<string, unknown>).localUrl.startsWith("blob:")
      ) {
        (record as Record<string, unknown>).localUrl = null;
      }
    }

    if (type === "asset" && record && typeof record === "object") {
      delete (record as Record<string, unknown>).localBlobId;
      delete (record as Record<string, unknown>).localStatus;
    }

    const sanitized = sanitizeBlobUrlsDeep(record);
    if (sanitized.changed) {
      console.warn(
        "[CloudSyncAdapter] sanitize_blob_url_from_cloud",
        sanitizeForLog({
          type,
          id: (data as any)?.id,
          fixes: sanitized.fixes,
        }),
      );
    }
    return sanitized.value;
  }

  async pullDiff(
    since: number,
  ): Promise<{ changes: SyncChange[]; serverTime: number }> {
    console.log("🔄 [CloudSyncAdapter] pullDiff START", {
      since,
      userId: this.userId,
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
      const startAfterFn = (Firestore as unknown as any).startAfter as
        | undefined
        | ((snapshot: unknown) => unknown);

      const pullCollectionDiff = async (type: PullableEntityType) => {
        try {
          const ref = collection(
            firestore,
            `users/${this.userId}/${COLLECTION_BY_TYPE[type]}`,
          );

          let lastDoc: unknown = null;
          let total = 0;

          while (true) {
            const constraints: any[] = [
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
                data: this.sanitizeFromCloud(type, d.data()),
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
          // 一部コレクションの失敗で cards / folders まで巻き添えにしない
          // ルール未反映・移行途中でも既存データの同期は継続する
        }
      };

      for (const type of PULLABLE_ENTITY_TYPES) {
        await pullCollectionDiff(type);
      }

      // userSettings (top-level document)
      {
        const settingsRef = doc(firestore, "userSettings", this.userId);
        const snap = await getDoc(settingsRef);
        if (snap.exists()) {
          const data: any = this.sanitizeFromCloud(
            "userSetting",
            snap.data(),
          );
          const updatedAt =
            data?.updatedAt?.toMillis?.() ??
            data?.updatedAt?.getTime?.() ??
            (data?.updatedAt instanceof Date ? data.updatedAt.getTime() : 0);
          if (!since || updatedAt > since) {
            changes.push({ type: "userSetting", id: snap.id, data });
          }
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
  }

  async pushBatch(
    changes: SyncChange[],
  ): Promise<{ successIds: string[]; failedIds: string[]; error?: unknown }> {
    console.log(
      `📤 [CloudSyncAdapter] pushBatch START. Count: ${changes.length}`,
    );
    const successIds: string[] = [];
    const failedIds: string[] = [];

    try {
      const firestore = firestoreDb;
      if (!firestore) {
        console.error(
          "❌ [CloudSyncAdapter] firestoreDb is null during pushBatch",
        );
        return {
          successIds: [],
          failedIds: changes.map((c: any) => c.id),
          error: new Error("Firestore not initialized"),
        };
      }

      const chunks = chunkChangesBySize(changes);
      let firstError: unknown = undefined;

      for (const chunk of chunks) {
        const batch = writeBatch(firestore);
        const chunkIds: string[] = [];

        for (const change of chunk as any[]) {
          const { type, id, data } = change;
          const col = (COLLECTION_BY_TYPE as any)[type] ?? `${type}s`;
          console.log(`   - Adding to batch: ${col}/${id}`);

          const docRef =
            type === "userSetting"
              ? doc(firestore, "userSettings", id || this.userId)
              : doc(firestore, `users/${this.userId}/${col}`, id);

          const sanitized = this.sanitizeForCloud(type, data);

          // sanitized が null とか来たら普通に事故るので最低限の防御
          if (!sanitized || typeof sanitized !== "object") {
            throw new Error(
              `Invalid payload for ${type}/${id}: expected object`,
            );
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
          console.error(
            "❌ [CloudSyncAdapter] pushBatch chunk commit ERROR:",
            error,
          );
          failedIds.push(...chunkIds);
          if (!firstError) firstError = error;
          // 次のチャンクへ（成功分は残す）
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
        failedIds: changes.map((c: any) => c.id),
        error,
      };
    }
  }

  async pullFull(entityIds: string[]): Promise<SyncChange[]> {
    const results: SyncChange[] = [];

    for (const id of entityIds) {
      const firestore = firestoreDb;
      if (!firestore)
        throw new Error("Firebase Firestore is not initialized.");

      // card
      {
        const snap = await getDocs(
          query(
            collection(firestore, `users/${this.userId}/cards`),
            where("id", "==", id),
          ),
        );
        if (!snap.empty) {
          results.push({
            type: "card",
            id,
            data: this.sanitizeFromCloud("card", snap.docs[0].data()),
          });
          continue;
        }
      }

      // cardSet
      {
        const snap = await getDocs(
          query(
            collection(firestore, `users/${this.userId}/cardSets`),
            where("id", "==", id),
          ),
        );
        if (!snap.empty) {
          results.push({
            type: "cardSet",
            id,
            data: this.sanitizeFromCloud("cardSet", snap.docs[0].data()),
          });
          continue;
        }
      }

      // document
      {
        const snap = await getDocs(
          query(
            collection(firestore, `users/${this.userId}/documents`),
            where("id", "==", id),
          ),
        );
        if (!snap.empty) {
          results.push({
            type: "document",
            id,
            data: this.sanitizeFromCloud("document", snap.docs[0].data()),
          });
          continue;
        }
      }

      // tag
      {
        const snap = await getDocs(
          query(
            collection(firestore, `users/${this.userId}/tags_v3`),
            where("id", "==", id),
          ),
        );
        if (!snap.empty) {
          results.push({
            type: "tag",
            id,
            data: this.sanitizeFromCloud("tag", snap.docs[0].data()),
          });
          continue;
        }
      }

      // asset
      {
        const snap = await getDocs(
          query(
            collection(firestore, `users/${this.userId}/images`),
            where("id", "==", id),
          ),
        );
        if (!snap.empty) {
          results.push({
            type: "asset",
            id,
            data: this.sanitizeFromCloud("asset", snap.docs[0].data()),
          });
          continue;
        }
      }

      // folder
      {
        const snap = await getDocs(
          query(
            collection(firestore, `users/${this.userId}/folders`),
            where("id", "==", id),
          ),
        );
        if (!snap.empty) {
          results.push({
            type: "folder",
            id,
            data: this.sanitizeFromCloud("folder", snap.docs[0].data()),
          });
          continue;
        }
      }

      // userSetting
      {
        const snap = await getDoc(
          doc(firestore, "userSettings", this.userId),
        );
        if (snap.exists()) {
          results.push({
            type: "userSetting",
            id: this.userId,
            data: this.sanitizeFromCloud("userSetting", snap.data()),
          });
        }
      }
    }

    return results;
  }
}
