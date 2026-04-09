import { getLocalDb } from "./localDB";
import { Dexie } from "dexie";
import { CloudSyncAdapter } from "./logic/CloudSyncAdapter";
import { sanitizeForLog } from "@/utils/logSanitizer";
import {
  sanitizeBlobUrlsDeep,
  type BlobUrlFix,
} from "@/utils/blobUrlSanitizer";
import { CURRENT_TAG_STORE } from "./localdb/tagStoreNames";

const REBUILD_TABLE_BY_TYPE = {
  card: "cards",
  folder: "folders",
  cardSet: "cardSets",
  document: "documents",
  tag: CURRENT_TAG_STORE,
  asset: "images",
  userSetting: "userSettings",
} as const;

type RebuildSupportedType = keyof typeof REBUILD_TABLE_BY_TYPE;

const isRebuildSupportedType = (type: string): type is RebuildSupportedType => {
  return Object.prototype.hasOwnProperty.call(REBUILD_TABLE_BY_TYPE, type);
};

const normalizeRebuildRecord = (
  userId: string,
  change: { type?: string; id?: string; data?: unknown },
) => {
  const data = {
    ...((change.data as Record<string, unknown> | undefined) ?? {}),
  };
  if (!data.id && change.id) data.id = change.id;
  if (change.type === "userSetting") {
    data.id = userId;
    data.userId = userId;
  }
  return data;
};

/**
 * IndexedDB 再構築オーケストレーター
 *
 * 責務:
 * - IndexedDB の破棄（呼び出し元で実行済み）
 * - クラウドからの再同期
 */
export class IndexedDBRebuildOrchestrator {
  private static isRebuilding = false;

  static isSupportedType(type: string): boolean {
    return isRebuildSupportedType(type);
  }

  private static tableFromType(type: RebuildSupportedType): string {
    return REBUILD_TABLE_BY_TYPE[type];
  }

  /**
   * IndexedDB を再構築
   *
   * @param userId ユーザーID
   * @param reason 再構築理由
   * @param onProgress 進捗コールバック
   */
  static async rebuild(
    userId: string,
    reason?: string,
    onProgress?: (msg: string) => void,
  ): Promise<{
    success: boolean;
    degraded: boolean;
    failures: Array<{
      type: string;
      id: string;
      error: string;
      fixes?: BlobUrlFix[];
    }>;
    insertedCount: number;
  }> {
    if (this.isRebuilding) {
      console.warn("[Rebuild] Rebuild already in progress. Skipping.");
      return { success: true, degraded: false, failures: [], insertedCount: 0 };
    }

    if (!userId) {
      const msg = "[Rebuild] Missing userId. Cannot rebuild.";
      console.error(msg);
      throw new Error(msg);
    }

    this.isRebuilding = true;

    try {
      console.log(
        `[Rebuild:${userId}] Starting rebuild... Reason: ${reason || "unknown"}`,
      );
      onProgress?.("クラウドからデータを取得しています...");

      // 1. クラウドから最新データを先に取得（DB削除前にデータ確保）
      const adapter = new CloudSyncAdapter(userId);
      // 0を指定して全データを取得（フル同期）
      const { changes } = await adapter.pullDiff(0);

      if (changes.length === 0) {
        console.log(
          `[Rebuild:${userId}] No data found in cloud. Skipping destructive rebuild.`,
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

      // 2. 既存のDB接続を完全に閉じる
      const oldDb = await getLocalDb(userId);
      if (oldDb) {
        oldDb.close();
      }

      // 3. インスタンスキャッシュをクリア (LocalDB側のstaticメソッド)
      // これをしないと、LocalDB.getInstance() は閉じた古いインスタンスを返し続けてしまう
      const LocalDBClass = (await import("./localDB")).LocalDB;
      LocalDBClass.clearInstance();

      // 4. 物理的に削除 (Dexie.delete)
      const dbName =
        oldDb?.name ||
        (LocalDBClass as unknown).getDatabaseNameForUser?.(userId) ||
        `FlashcardMasterDB_${userId}`;
      console.log(`[Rebuild] Deleting database: ${dbName}`);
      await Dexie.delete(dbName);

      // 5. 新しいインスタンスを作成
      console.log("[Rebuild] Creating new DB instance...");
      const newDb = await getLocalDb(userId);

      onProgress?.(`${changes.length} 件のデータを復元中...`);

      // 6. 新しいDBにデータを流し込む
      const failures: Array<{
        type: string;
        id: string;
        error: string;
        fixes?: BlobUrlFix[];
      }> = [];
      let insertedCount = 0;
      await newDb.transaction(
        "rw",
        [
          newDb.folders,
          newDb.cards,
          newDb.cardSets,
          newDb.documents,
          newDb.userSettings,
          newDb.images,
          newDb.tagRecords,
        ],
        async () => {
          console.log(
            `[Rebuild] Inserting ${changes.length} items to fresh DB...`,
          );
          for (const change of changes) {
            if (!this.isSupportedType(change.type)) continue;
            const table = this.tableFromType(
              change.type as RebuildSupportedType,
            );
            const sanitizeResult = sanitizeBlobUrlsDeep(change.data);
            if (sanitizeResult.changed) {
              console.warn(
                "[Rebuild] sanitize_blob_url",
                sanitizeForLog({
                  type: change.type,
                  id: change.id,
                  fixes: sanitizeResult.fixes,
                }),
              );
            }

            try {
              await newDb.upsert(
                table as unknown,
                normalizeRebuildRecord(userId, {
                  ...change,
                  data: sanitizeResult.value,
                }),
                true,
              );
              insertedCount += 1;
            } catch (error) {
              const itemFailure = {
                type: change.type,
                id: change.id ?? sanitizeResult.value?.id ?? "unknown",
                error: error instanceof Error ? error.message : String(error),
                fixes: sanitizeResult.changed
                  ? sanitizeResult.fixes
                  : undefined,
              };
              failures.push(itemFailure);
              console.error(
                "[Rebuild] rebuild_item_failed",
                sanitizeForLog(itemFailure),
              );
              continue;
            }
          }
        },
      );
      if (failures.length > 0) {
        console.error(
          "[Rebuild] rebuild_partial_failures",
          sanitizeForLog({
            count: failures.length,
            failures: failures.slice(0, 20),
          }),
        );
      }

      // 7. メタデータサービスでCLEANマークをつける（オプションだが推奨）
      // 循環参照回避のためダイナミックインポート
      try {
        const { IndexedDBMetadataService } =
          await import("./IndexedDBMetadataService");
        const metaService = new IndexedDBMetadataService(newDb, userId);
        await metaService.markClean();
      } catch (e) {
        console.warn("[Rebuild] Failed to mark clean state", e);
      }

      console.log(
        `[Rebuild:${userId}] Rebuild complete with ${insertedCount}/${changes.length} items.`,
      );
      onProgress?.("再構築が完了しました");
      return {
        success: true,
        degraded: failures.length > 0,
        failures,
        insertedCount,
      };
    } catch (error) {
      console.error(`[Rebuild:${userId}] Rebuild failed:`, error);
      onProgress?.("再構築に失敗しました。");
      throw error;
    } finally {
      this.isRebuilding = false;
    }
  }
}
