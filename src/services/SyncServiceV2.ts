import type {
  ISyncService,
  IQueueManager,
  INetworkMonitor,
  IDiffEngine,
  ICloudSyncAdapter,
  SyncTask,
} from "./interfaces/ISyncService";
import { nanoid } from "nanoid";
import type { SyncContextSource } from "@/types/domain/telemetry";
import type { SyncResult } from "@/types/domain/sync";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  getDocs,
  deleteDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import { firestoreDb } from "./firebase";
import { TelemetryService } from "./logic/TelemetryService";
import { SecurityMonitor } from "./logic/SecurityMonitor";
import type { LocalDBLike } from "./localDB";

/**
 * SyncServiceV2: オーケストレーターとしての同期サービス
 * 各コンポーネントを統括し、ビジネスロジックの流れを制御する
 * 具象クラスには依存せず、インターフェースのみを通じて操作する
 */
export class SyncServiceV2 implements ISyncService {
  private queueManager: IQueueManager;
  private networkMonitor: INetworkMonitor;
  private diffEngine: IDiffEngine;
  private cloudAdapter: ICloudSyncAdapter;
  private telemetry: TelemetryService;
  private securityMonitor: SecurityMonitor;
  private localDB: LocalDBLike;

  private isSyncing = false;
  private fallbackCount = 0;

  constructor(
    private userId: string,
    localDB: LocalDBLike,
    queueManager: IQueueManager,
    networkMonitor: INetworkMonitor,
    diffEngine: IDiffEngine,
    cloudAdapter: ICloudSyncAdapter,
    telemetry: TelemetryService,
  ) {
    this.localDB = localDB;
    this.queueManager = queueManager;
    this.networkMonitor = networkMonitor;
    this.diffEngine = diffEngine;
    this.cloudAdapter = cloudAdapter;
    this.telemetry = telemetry;
    this.securityMonitor = new SecurityMonitor(
      userId,
      localStorage.getItem("deviceId") || "unknown",
    );

    // LocalDB の更新を監視してバックグラウンド同期をトリガー
    this.localDB.setSyncTrigger(() => {
      this.sync("background").catch((err) => {
        console.error("[SyncServiceV2] Background sync failed:", err);
      });
    });
  }

  /**
   * レガシー互換の同期エントリーポイント
   */
  async synchronize(onProgress?: (msg: string) => void): Promise<SyncResult> {
    onProgress?.("同期を開始しています...");
    try {
      await this.sync("user_initiated");
      return {
        success: true,
        uploaded: 0, // 詳細数は将来的に telemetry から取得
        downloaded: 0,
        conflicts: 0,
        errors: [],
      };
    } catch (error: unknown) {
      return {
        success: false,
        uploaded: 0,
        downloaded: 0,
        conflicts: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * 同期を実行
   */
  /**
   * 同期を実行
   */
  async sync(source: SyncContextSource): Promise<void> {
    // 同期中の重複実行を防ぐ
    if (this.isSyncing) {
      this.telemetry.log("warn", "Sync already in progress, skipping", {
        source,
      });
      return;
    }

    this.isSyncing = true;
    const transaction = this.telemetry.startTransaction("sync");

    try {
      this.telemetry.log("info", "Sync started", {
        source,
        networkStatus: this.networkMonitor.status,
      });

      // 0. デバイスステータスをチェック (Security Guard)
      await this.checkDeviceStatus();

      // 1. ネットワーク状態をチェック
      if (this.networkMonitor.status === "offline") {
        this.telemetry.log("warn", "Offline, sync deferred");
        return;
      }

      if (this.networkMonitor.status === "poor") {
        this.telemetry.log("info", "Network poor, deferring heavy sync");
        return;
      }

      // 2. クラウドからの差分取得 (Pull)
      this.telemetry.log("info", "Checking for remote changes (Pull)");
      const lastSyncTime = await this.localDB.getLastSyncTime(this.userId);
      const lastSyncTimestamp = lastSyncTime ? lastSyncTime.getTime() : 0;

      const { changes, serverTime } =
        await this.cloudAdapter.pullDiff(lastSyncTimestamp);
      if (changes.length > 0) {
        this.telemetry.log("info", `Applying ${changes.length} remote changes`);
        await this.applyRemoteChanges(changes);
      }

      // 3. ローカルの変更を送信 (Push)
      const constraint = this.networkMonitor.getBatchConstraint(source);
      const tasks = await this.queueManager.peekBatch(constraint);

      if (tasks.length > 0) {
        this.telemetry.log("info", `Pushing ${tasks.length} local changes`);
        await this.processBatch(tasks);
      }

      // 4. 同期時刻を更新 (成功時のみ)
      await this.localDB.updateLastSyncTime(this.userId, new Date(serverTime));

      transaction.end("success");
    } catch (error) {
      this.telemetry.log("error", "Sync failed", { source }, error as Error);
      transaction.end("failure");
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * バッチ処理
   */
  private async processBatch(tasks: SyncTask[]): Promise<void> {
    const startTime = performance.now();
    const successIds: string[] = [];
    const failedIds: string[] = [];

    for (const task of tasks) {
      try {
        if (task.type === "upload") {
          // アップロード処理
          const result = await this.cloudAdapter.pushBatch([
            {
              type: task.entity,
              id: task.payload.id,
              data: task.payload,
            },
          ]);

          if (result.successIds.length > 0) {
            successIds.push(task.id);
          } else {
            failedIds.push(task.id);
          }
        } else if (task.type === "download") {
          // ダウンロード処理
          const { changes } = await this.cloudAdapter.pullDiff(0);
          if (changes.length > 0) {
            await this.applyRemoteChanges(changes);
          }
        }
      } catch (error: unknown) {
        this.telemetry.log(
          "error",
          "Task failed",
          { taskId: task.id },
          error as Error,
        );

        // 【正常遷移: Delta Sync 失敗 → Full Sync】
        // 特定の致命的エラー（バージョン競合等）が発生した場合、フル同期による修復を試みる
        if (
          error.message?.includes("conflict") ||
          error.message?.includes("version_mismatch")
        ) {
          this.telemetry.log(
            "warn",
            "Fatal sync conflict detected. Triggering self-healing full resync.",
          );
          await this.forceFullResync();
          // フル同期が成功すれば、個別のタスク失敗は無視して良い（全体が最新になるため）
          return;
        }

        failedIds.push(task.id);
      }
    }

    // 5. 結果を報告
    const duration = performance.now() - startTime;
    const success = failedIds.length === 0;

    this.networkMonitor.reportResult(success, duration);

    // 6. キューを更新
    if (successIds.length > 0) {
      await this.queueManager.complete(successIds);
    }

    if (failedIds.length > 0) {
      await this.queueManager.fail(failedIds, "Batch processing failed", true);
    }

    // メトリクス記録
    this.telemetry.recordMetric("sync_batch_size", tasks.length);
    this.telemetry.recordMetric("sync_success_count", successIds.length);
    this.telemetry.recordMetric("sync_failure_count", failedIds.length);
  }

  /**
   * 起動時同期: Pull (Cloud -> Local) を優先し、その後 Push (Local -> Cloud) を実行
   */
  async performStartupSync(): Promise<void> {
    if (this.isSyncing) return;

    this.isSyncing = true;
    const transaction = this.telemetry.startTransaction("startup_sync");

    try {
      this.telemetry.log("info", "Starting startup sync (Pull priorities)");

      // 1. 前回の同期時刻を取得
      const lastSyncTime = await this.localDB.getLastSyncTime(this.userId);
      const lastSyncTimestamp = lastSyncTime ? lastSyncTime.getTime() : 0;

      // 2. クラウドから差分を取得して適用 (Pull & Apply)
      const { changes, serverTime } =
        await this.cloudAdapter.pullDiff(lastSyncTimestamp);
      if (changes.length > 0) {
        this.telemetry.log("info", `Applying ${changes.length} remote changes`);
        await this.applyRemoteChanges(changes);
      }

      // 3. ローカルの待機中タスクを処理 (Push)
      const constraint = this.networkMonitor.getBatchConstraint("system");
      const tasks = await this.queueManager.peekBatch(constraint);
      if (tasks.length > 0) {
        this.telemetry.log("info", `Pushing ${tasks.length} local changes`);
        await this.processBatch(tasks);
      }

      // 4. 同期時刻を更新
      await this.localDB.updateLastSyncTime(this.userId, new Date(serverTime));

      this.telemetry.log("info", "Startup sync completed successfully");
      transaction.end("success");
    } catch (error) {
      this.telemetry.log("error", "Startup sync failed", {}, error as Error);
      transaction.end("failure");
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * リモートの変更をローカルDBに適用
   */
  private async applyRemoteChanges(changes: unknown[]): Promise<void> {
    // フォルダの循環参照チェック用に全フォルダを一度取得
    const allFolders = await this.localDB.folders.toArray();

    for (const change of changes) {
      const tableByType: Record<string, string> = {
        card: "cards",
        folder: "folders",
        userSetting: "userSettings",
      };
      const table = tableByType[change.type] ?? `${change.type}s`; // e.g., 'card' -> 'cards'
      const remoteData = { ...(change.data ?? {}) };
      if (!remoteData.id && change.id) {
        remoteData.id = change.id;
      }
      if (change.type === "userSetting") {
        remoteData.id = this.userId;
        remoteData.userId = this.userId;
      }

      // documents.localFileId / blob localUrl は端末ローカル専用のため、受信時に除外する。
      if (change.type === "document") {
        delete (remoteData as unknown).localFileId;
        delete (remoteData as unknown).blobUrl;
        if (
          typeof (remoteData as unknown).localUrl === "string" &&
          (remoteData as unknown).localUrl.startsWith("blob:")
        ) {
          (remoteData as unknown).localUrl = null;
        }
      }

      // フォルダの場合、循環参照をチェックして防止
      if (change.type === "folder") {
        const parentId =
          remoteData.parentFolderId ?? remoteData.parent_folder_id ?? null;
        if (this.diffEngine.detectCycle(change.id, parentId, allFolders)) {
          this.telemetry.log(
            "error",
            "Circular reference detected during applyRemoteChanges, healing by setting parent to null",
            {
              folderId: change.id,
              parentId,
            },
          );
          remoteData.parentFolderId = null;
          remoteData.parent_folder_id = null;
        }
      }

      // IDが一致する既存データを取得
      const localData = await this.localDB.getItem(table, change.id);

      if (!localData) {
        // 新規追加
        await this.localDB.upsert(table, remoteData, true); // skipSync=true でループ防止
      } else {
        // マージロジック
        const { merged, conflict } = this.diffEngine.merge(
          localData,
          remoteData,
          "server_wins",
        );

        if (conflict) {
          this.telemetry.log(
            "warn",
            "Conflict detected during applyRemoteChanges",
            {
              entity: change.type,
              id: change.id,
            },
          );
          // 競合情報を記録（将来的なUI解決用）
          await this.localDB.upsert("conflicts", {
            id: nanoid(),
            entityId: change.id,
            entityType: change.type,
            localData,
            remoteData,
            resolved: false,
            occurredAt: new Date(),
          });
        }

        // ローカルDBを更新
        await this.localDB.upsert(table, merged, true); // skipSync=true でループ防止
      }
    }
  }

  /**
   * キュー状態を取得
   */
  async getQueueStatus(): Promise<{ pending: number; isSyncing: boolean }> {
    const pending = await this.queueManager.getQueueDepth();
    return { pending, isSyncing: this.isSyncing };
  }

  /**
   * 強制フル同期（トラブルシューティング用）
   * クラウド上のデータをマスターとして、ローカルDBの全データを再構築します。
   * ※ ローカルにのみ存在する変更は失われる可能性があります。
   */
  async forceFullResync(): Promise<void> {
    this.telemetry.log("warn", "Force full resync initiated");

    // セキュリティイベント: 競合過多として記録
    await this.securityMonitor.logEvent("SYNC_CONFLICT_EXCESS");

    // フォールバックカウントを記録
    this.fallbackCount++;
    this.telemetry.recordMetric("sync_fallback_count", this.fallbackCount);

    try {
      // 1. クラウドから全データを取得 (since=0)
      const diff = await this.cloudAdapter.pullDiff(0);

      this.telemetry.log("info", "Pulling all data for resync", {
        changesCount: diff.changes.length,
      });

      // 2. ローカルDBをトランザクション内で更新
      // 主なエンティティをリセットしてクラウドデータで埋める
      const tables = ["folders", "cards"];

      await this.localDB.transaction("rw", tables, async () => {
        // すべてのデータを一旦削除（ソフトデリートではなく物理削除して再構築）
        for (const table of tables) {
          await (this.localDB as unknown)[table].clear();
        }

        // 取得したデータを投入
        for (const change of diff.changes) {
          const tableName = `${change.type}s`;
          if (tables.includes(tableName)) {
            const data = { ...(change.data ?? {}) };
            // Dexie put は key が無いと insert できずに死ぬので補正
            if (!data.id && change.id) data.id = change.id;
            await (this.localDB as unknown)[tableName].put(data);
          }
        }
      });

      // 3. 同期時刻を更新 (次回の差分同期はここから始まる)
      // ✅ syncMetadata を直に触ると起点がズレて差分同期が壊れやすいので、既存ルートに統一する
      if (diff.serverTime) {
        await this.localDB.updateLastSyncTime(
          this.userId,
          new Date(diff.serverTime),
        );
      } else {
        await this.localDB.updateLastSyncTime(this.userId, new Date());
      }

      this.telemetry.log("info", "Full resync completed successfully");
    } catch (error) {
      this.telemetry.log("error", "Full resync failed", {}, error as Error);
      throw error;
    }
  }

  /**
   * デバイス一覧からデバイスを登録解除（論理削除）
   * @spec 誤操作防止・監査ログのため、物理削除ではなく revoked ステータスに変更する
   */
  async removeDevice(deviceId: string): Promise<void> {
    this.telemetry.log("info", "Revoking device access", { deviceId });
    if (!firestoreDb) {
      this.telemetry.log(
        "error",
        "Security Alert: firestoreDb is undefined during removeDevice",
      );
      return; // サイレントに失敗させるか、上位でハンドリング
    }
    const deviceRef = doc(
      firestoreDb,
      `sync_metadata/${this.userId}/devices/${deviceId}`,
    );

    // 論理削除 (Revoked)
    await updateDoc(deviceRef, {
      status: "revoked",
      revokedAt: Timestamp.now(),
      isActive: false,
    });

    // セキュリティイベント: デバイス解除
    await this.securityMonitor.logEvent("DEVICE_REVOKED", {
      revokedDeviceId: deviceId,
    });
  }

  /**
   * 現在のデバイスステータスを確認
   * Revoked状態であればエラーをスローしてアクセスを拒否する
   */
  private async checkDeviceStatus(): Promise<void> {
    // クライアント側で自分のdeviceIdを取得 (localStorage)
    const currentDeviceId = localStorage.getItem("deviceId");
    if (!currentDeviceId) return; // 初回起動時などはスキップ

    if (!firestoreDb) {
      this.telemetry.log(
        "error",
        "Security Alert: firestoreDb is undefined during checkDeviceStatus",
      );
      // 初期化待ちの可能性もあるが、ここでは明確にエラーとして報告
      throw new Error(
        "Firebase Firestore is not initialized during security check.",
      );
    }

    try {
      const deviceRef = doc(
        firestoreDb,
        `sync_metadata/${this.userId}/devices/${currentDeviceId}`,
      );
      const snapshot = await getDoc(deviceRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.status === "revoked") {
          this.telemetry.log(
            "error",
            "Security Alert: Access attempt from revoked device",
            { deviceId: currentDeviceId },
          );

          // セキュリティイベント: アクセス拒否
          await this.securityMonitor.logEvent("ACCESS_DENIED_REVOKED");

          throw new Error(
            "DEVICE_REVOKED: This device has been removed from the account.",
          );
        }
      }
    } catch (error: unknown) {
      // ネットワークやパーミッション起因のエラーもACCESS_DENIED扱いすべきか検討が必要だが、
      // ここでは明示的なRevokeエラーのみを扱う。
      if (error.message?.includes("DEVICE_REVOKED")) {
        throw error;
      }
      // ネットワークエラー等はここでは無視（Syncそのものの失敗として扱う）
    }
  }

  /**
   * デバイス名を更新
   */
  async updateDeviceName(deviceId: string, newName: string): Promise<void> {
    this.telemetry.log("info", "Updating device name", { deviceId, newName });
    if (!firestoreDb) {
      console.warn(
        "[SyncServiceV2] firestoreDb is not initialized. Skipping updateDeviceName.",
      );
      return;
    }
    const deviceRef = doc(
      firestoreDb,
      `sync_metadata/${this.userId}/devices/${deviceId}`,
    );
    await updateDoc(deviceRef, { deviceName: newName });
  }

  /**
   * 非アクティブなデバイスをクリーンアップ
   * ※ ここでは「ゴミ掃除」の意味合いが強いため、古いセッションは物理削除する
   */
  async cleanupInactiveDevices(): Promise<number> {
    this.telemetry.log("info", "Cleaning up inactive devices");
    if (!firestoreDb) {
      console.warn(
        "[SyncServiceV2] firestoreDb is not initialized. Skipping cleanup.",
      );
      return 0;
    }
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const q = query(
      collection(firestoreDb, `sync_metadata/${this.userId}/devices`),
      where("lastSyncTime", "<", Timestamp.fromDate(sixtyDaysAgo)),
    );

    const snapshot = await getDocs(q);
    let count = 0;
    for (const doc of snapshot.docs) {
      // Revokedデバイスは証跡として残すため、ここでは削除しない（statusチェックを入れる）
      const data = doc.data();
      if (data.status === "revoked") continue;

      await deleteDoc(doc.ref);
      count++;
    }
    return count;
  }

  /**
   * 統計情報を取得 (Legacy互換ダミー)
   */
  async getSyncStats(): Promise<unknown> {
    return {
      successRate: 100,
      avgDuration: 0,
      errorRate: 0,
      totalSyncs: 0,
    };
  }

  /**
   * 未解決の競合を取得 (Legacy互換ダミー)
   */
  async getUnresolvedConflicts(): Promise<unknown[]> {
    return [];
  }

  /**
   * 設定読み込み (Legacy互換ダミー)
   */
  async loadSettings(): Promise<unknown> {
    return {
      autoSync: true,
      intervalMinutes: 30,
      wifiOnly: false,
    };
  }

  /**
   * フル同期実行 (Syncを呼び出す)
   */
  async performFullSync(): Promise<void> {
    return this.sync("force_resync");
  }

  /**
   * キュー処理実行 (Syncを呼び出す)
   */
  async processQueue(): Promise<{ processed: number; errors: unknown[] }> {
    await this.sync("background");
    return { processed: 0, errors: [] };
  }

  /**
   * セキュリティ状態の監視開始 for AuthContext
   */
  monitorSecurity(
    callback: (state: {
      isLocked: boolean;
      requires2FA: boolean;
      alerts: unknown[];
    }) => void,
  ): () => void {
    this.securityMonitor.startMonitoring(callback);
    return () => this.securityMonitor.stopMonitoring();
  }

  /**
   * セキュリティアラートを既読にする
   */
  async dismissSecurityAlert(alertId: string): Promise<void> {
    await this.securityMonitor.dismissAlert(alertId);
  }
}
