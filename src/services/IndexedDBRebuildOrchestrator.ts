import { Dexie } from "dexie";
import { getLocalDb } from "@/services/localdb";
import { CURRENT_TAG_STORE } from "@/services/localdb/tagStoreNames";
import { CloudSyncAdapter } from "@/services/logic/CloudSyncAdapter";
import type { BlobUrlFix } from "@/utils/blobUrlSanitizer";
import { sanitizeBlobUrlsDeep } from "@/utils/blobUrlSanitizer";
import { sanitizeForLog } from "@/utils/logSanitizer";



type RebuildTableByType = {
  card: "cards";
  folder: "folders";
  cardSet: "cardSets";
  document: "documents";
  tag: typeof CURRENT_TAG_STORE;
  asset: "images";
  userSetting: "userSettings";
};
type RebuildSupportedType = keyof RebuildTableByType;
type RebuildTableName = RebuildTableByType[RebuildSupportedType];
type PullChange = {
  type?: unknown;
  id?: unknown;
  data?: unknown;
};
type RebuildFailure = {
  type: string;
  id: string;
  error: string;
  fixes?: BlobUrlFix[];
};
type ClosableLocalDb = {
  close: () => void;
};



const REBUILD_TABLE_BY_TYPE: RebuildTableByType = {
  card: "cards",
  folder: "folders",
  cardSet: "cardSets",
  document: "documents",
  tag: CURRENT_TAG_STORE,
  asset: "images",
  userSetting: "userSettings",
};



const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};
const isRebuildSupportedType = (type: string): type is RebuildSupportedType => {
  return Object.prototype.hasOwnProperty.call(REBUILD_TABLE_BY_TYPE, type);
};
const normalizeRebuildRecord = (
  userId: string,
  change: { type?: string; id?: string; data?: unknown; },
): Record<string, unknown> => {
  const data = {
    ...(isRecord(change.data) ? change.data : {}),
  };

  if (!data.id && change.id) {
    data.id = change.id;
  }

  if (change.type === "userSetting") {
    data.id = userId;
    data.userId = userId;
  }

  return data;
};
const toPullChange = (value: unknown): PullChange => {
  return isRecord(value) ? value : {};
};
const toNonEmptyString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};
class IndexedDBRebuildOrchestrator {
  private static isRebuilding = false;

  static readonly isSupportedType = (type: string): type is RebuildSupportedType => {
    return isRebuildSupportedType(type);
  };

  private static readonly tableFromType = (
    type: RebuildSupportedType,
  ): RebuildTableName => {
    return REBUILD_TABLE_BY_TYPE[type];
  };

  static readonly rebuild = async (
    userId: string,
    reason?: string,
    onProgress?: (msg: string) => void,
  ): Promise<{
    success: boolean;
    degraded: boolean;
    failures: RebuildFailure[];
    insertedCount: number;
  }> => {
    if (this.isRebuilding) {
      console.warn("[Rebuild] Rebuild already in progress. Skipping.");
      return { success: true, degraded: false, failures: [], insertedCount: 0 };
    }

    if (!userId) {
      const message = "[Rebuild] Missing userId. Cannot rebuild.";
      console.error(message);
      throw new Error(message);
    }

    this.isRebuilding = true;

    try {
      console.log(
        `[Rebuild:${userId}] 再構築を開始しています... 理由: ${reason || "不明"}`,
      );
      onProgress?.("クラウドからデータを取得しています...");

      const adapter = new CloudSyncAdapter(userId);
      const pulled = await adapter.pullDiff(0);
      const changes = Array.isArray(pulled.changes) ? pulled.changes : [];

      if (changes.length === 0) {
        console.log(
          `[Rebuild:${userId}] クラウドにデータがないため、破壊的な再構築をスキップします。`,
        );
        onProgress?.("クラウドにデータはありませんでした。");
        return {
          success: true,
          degraded: false,
          failures: [],
          insertedCount: 0,
        };
      }

      onProgress?.("データベースを再構築中...");

      const oldDb = await getLocalDb(userId);
      (oldDb as ClosableLocalDb).close();

      const { LocalDB: LocalDBClass } = await import("@/services/localdb");
      LocalDBClass.clearInstance();

      const dbName =
        typeof LocalDBClass.getDatabaseNameForUser === "function"
          ? LocalDBClass.getDatabaseNameForUser(userId)
          : `SivflowDB_${userId}`;

      console.log(`[Rebuild] データベースを削除しています: ${dbName}`);
      await Dexie.delete(dbName);

      console.log("[Rebuild] 新しいDBインスタンスを作成しています...");
      const newDb = await getLocalDb(userId);

      onProgress?.(`${changes.length} 件のデータを復元中...`);

      const failures: RebuildFailure[] = [];
      let insertedCount = 0;

      await newDb.runSyncTransaction(async () => {
        console.log(
          `[Rebuild] 新しいDBへ ${changes.length} 件の項目を挿入しています...`,
        );

        for (const rawChange of changes) {
          const change = toPullChange(rawChange);
          const changeType = toNonEmptyString(change.type);

          if (!changeType || !this.isSupportedType(changeType)) {
            continue;
          }

          const table = this.tableFromType(changeType);
          const sanitizeResult = sanitizeBlobUrlsDeep(change.data);

          if (sanitizeResult.changed) {
            console.warn(
              "[Rebuild] sanitize_blob_url",
              sanitizeForLog({
                type: changeType,
                id: change.id,
                fixes: sanitizeResult.fixes,
              }),
            );
          }

          try {
            await newDb.upsert(
              table,
              normalizeRebuildRecord(userId, {
                type: changeType,
                id: toNonEmptyString(change.id) ?? undefined,
                data: sanitizeResult.value,
              }) as never,
              true,
            );
            insertedCount += 1;
          } catch (error) {
            const normalizedValue = isRecord(sanitizeResult.value)
              ? sanitizeResult.value
              : {};
            const failure: RebuildFailure = {
              type: changeType,
              id:
                toNonEmptyString(change.id) ??
                toNonEmptyString(normalizedValue.id) ??
                "unknown",
              error: error instanceof Error ? error.message : String(error),
              fixes: sanitizeResult.changed ? sanitizeResult.fixes : undefined,
            };

            failures.push(failure);
            console.error(
              "[Rebuild] rebuild_item_failed",
              sanitizeForLog(failure),
            );
          }
        }
      });

      if (failures.length > 0) {
        console.error(
          "[Rebuild] rebuild_partial_failures",
          sanitizeForLog({
            count: failures.length,
            failures: failures.slice(0, 20),
          }),
        );
      }

      try {
        const { IndexedDBMetadataService } = await import("./IndexedDBMetadataService");
        const metadataService = new IndexedDBMetadataService(newDb, userId);
        await metadataService.markClean();
      } catch (error) {
        console.warn("[Rebuild] Failed to mark clean state", error);
      }

      LocalDBClass.clearInstance();

      onProgress?.("復元が完了しました。");
      return {
        success: failures.length === 0,
        degraded: failures.length > 0,
        failures,
        insertedCount,
      };
    } finally {
      this.isRebuilding = false;
    }
  };
}



export { IndexedDBRebuildOrchestrator };
