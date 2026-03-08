import type { ICloudSyncAdapter } from "../interfaces/ISyncService";
import { firestoreDb } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  writeBatch,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import * as Firestore from "firebase/firestore";
import { sanitizeBlobUrlsDeep } from "@/utils/blobUrlSanitizer";
import { sanitizeForLog } from "@/utils/logSanitizer";

/**
 * undefined は Firestore に投げた瞬間に爆発するので、深い階層まで除去する。
 * ※ 配列内の undefined も消す（Firestore 的にアウト）
 * ※ Date / Timestamp はそのまま
 */
function deepStripUndefined(input: unknown): unknown {
  if (input === undefined) return undefined;
  if (input === null) return null;

  if (input instanceof Timestamp) return input;
  if (input instanceof Date) return input;

  if (Array.isArray(input)) {
    return input.map(deepStripUndefined).filter((v) => v !== undefined);
  }

  if (typeof input === "object") {
    const out: unknown = {};
    for (const [k, v] of Object.entries(input)) {
      const cleaned = deepStripUndefined(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }

  return input;
}

/**
 * serverTimestamp が使える環境なら使う。無理ならクライアント時刻で妥協。
 * （大規模運用なら最終的には serverTimestamp に統一したいが、まず死なないのが最優先）
 */
function cloudUpdatedAt(): unknown {
  const fn = (Firestore as unknown).serverTimestamp;
  if (typeof fn === "function") return fn();
  return Timestamp.now();
}

const COLLECTION_BY_TYPE: Record<string, string> = {
  card: "cards",
  folder: "folders",
  userSetting: "userSettings",
};

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

/** JSON stringify の byte 数で概算（正確じゃないが爆死回避には十分） */
function estimateBytes(value: unknown): number {
  try {
    return _encoder.encode(JSON.stringify(value)).length;
  } catch {
    // stringify 不能 = だいたい危険なので大きめに見積もる
    return 1024 * 1024;
  }
}

function chunkChangesBySize(changes: unknown[]): unknown[][] {
  const chunks: unknown[][] = [];
  let current: unknown[] = [];
  let bytes = 0;

  for (const ch of changes) {
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
}

export class CloudSyncAdapter implements ICloudSyncAdapter {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  private sanitizeForCloud(type: string, data: unknown): unknown {
    if (!data) return data;

    // ✅ 全エンティティ共通: undefined を深く除去
    const cleaned = deepStripUndefined(data);

    // ここでローカル専用フィールドを落としたいなら type ごとに増やす
    // （今の 'document' 判定は多分使われてないので、必要になったら追加でOK）
    return cleaned;
  }

  private sanitizeFromCloud(type: string, data: unknown): unknown {
    if (!data) return data;
    const stripped = deepStripUndefined(data);
    const sanitized = sanitizeBlobUrlsDeep(stripped);
    if (sanitized.changed) {
      console.warn(
        "[CloudSyncAdapter] sanitize_blob_url_from_cloud",
        sanitizeForLog({
          type,
          id: data?.id,
          fixes: sanitized.fixes,
        }),
      );
    }
    return sanitized.value;
  }

  async pullDiff(
    since: number,
  ): Promise<{ changes: unknown[]; serverTime: number }> {
    console.log("🔄 [CloudSyncAdapter] pullDiff START", {
      since,
      userId: this.userId,
    });
    const changes: unknown[] = [];

    if (!firestoreDb) {
      console.warn(
        "⚠️ [CloudSyncAdapter] firestoreDb is not initialized. Skipping pullDiff.",
      );
      return { changes: [], serverTime: Date.now() };
    }

    try {
      const sinceTimestamp = Timestamp.fromMillis(since);
      const startAfterFn = (Firestore as unknown).startAfter as
        | undefined
        | ((snapshot: unknown) => unknown);

      // cards
      {
        const ref = collection(firestoreDb, `users/${this.userId}/cards`);

        let lastDoc: unknown = null;
        let total = 0;

        while (true) {
          const constraints: unknown[] = [
            where("updatedAt", ">", sinceTimestamp),
            orderBy("updatedAt", "asc"),
            limit(PAGE_SIZE),
          ];

          // typings に startAfter が無い環境でも動くよう unknown 経由で呼ぶ
          if (startAfterFn && lastDoc)
            constraints.splice(2, 0, startAfterFn(lastDoc));

          const qy = query(ref, ...constraints);
          const snap = await getDocs(qy);
          total += snap.size;

          snap.forEach((d) => {
            changes.push({
              type: "card",
              id: d.id,
              data: this.sanitizeFromCloud("card", d.data()),
            });
          });

          // startAfter が無い環境では1ページで止める（現状より悪化させない）
          if (!startAfterFn || snap.empty || snap.size < PAGE_SIZE) break;
          lastDoc = snap.docs[snap.docs.length - 1] ?? null;
        }

        console.log(`[CloudSyncAdapter] Remote cards found: ${total}`);
      }

      // folders
      {
        const ref = collection(firestoreDb, `users/${this.userId}/folders`);

        let lastDoc: unknown = null;
        let total = 0;

        while (true) {
          const constraints: unknown[] = [
            where("updatedAt", ">", sinceTimestamp),
            orderBy("updatedAt", "asc"),
            limit(PAGE_SIZE),
          ];

          if (startAfterFn && lastDoc)
            constraints.splice(2, 0, startAfterFn(lastDoc));

          const qy = query(ref, ...constraints);
          const snap = await getDocs(qy);
          total += snap.size;

          snap.forEach((d) => {
            changes.push({
              type: "folder",
              id: d.id,
              data: this.sanitizeFromCloud("folder", d.data()),
            });
          });

          if (!startAfterFn || snap.empty || snap.size < PAGE_SIZE) break;
          lastDoc = snap.docs[snap.docs.length - 1] ?? null;
        }

        console.log(`[CloudSyncAdapter] Remote folders found: ${total}`);
      }

      // userSettings (top-level document)
      {
        const settingsRef = doc(firestoreDb, "userSettings", this.userId);
        const snap = await getDoc(settingsRef);
        if (snap.exists()) {
          const data: unknown = this.sanitizeFromCloud(
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
    changes: unknown[],
  ): Promise<{ successIds: string[]; failedIds: string[]; error?: unknown }> {
    console.log(
      `📤 [CloudSyncAdapter] pushBatch START. Count: ${changes.length}`,
    );
    const successIds: string[] = [];
    const failedIds: string[] = [];

    try {
      if (!firestoreDb) {
        console.error(
          "❌ [CloudSyncAdapter] firestoreDb is null during pushBatch",
        );
        return {
          successIds: [],
          failedIds: changes.map((c) => c.id),
          error: new Error("Firestore not initialized"),
        };
      }

      const chunks = chunkChangesBySize(changes);
      let firstError: unknown = undefined;

      for (const chunk of chunks) {
        const batch = writeBatch(firestoreDb);
        const chunkIds: string[] = [];

        for (const change of chunk) {
          const { type, id, data } = change;
          const col = COLLECTION_BY_TYPE[type] ?? `${type}s`; // 保険
          console.log(`   - Adding to batch: ${col}/${id}`);

          const docRef =
            type === "userSetting"
              ? doc(firestoreDb, "userSettings", id || this.userId)
              : doc(firestoreDb, `users/${this.userId}/${col}`, id);

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
        failedIds: changes.map((c) => c.id),
        error,
      };
    }
  }

  async pullFull(entityIds: string[]): Promise<unknown[]> {
    const results: unknown[] = [];

    for (const id of entityIds) {
      if (!firestoreDb)
        throw new Error("Firebase Firestore is not initialized.");

      // card
      {
        const snap = await getDocs(
          query(
            collection(firestoreDb, `users/${this.userId}/cards`),
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

      // folder
      {
        const snap = await getDocs(
          query(
            collection(firestoreDb, `users/${this.userId}/folders`),
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
          doc(firestoreDb, "userSettings", this.userId),
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



