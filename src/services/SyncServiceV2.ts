import type { Card, CardSet, Folder } from "@/types";
import type {
  SyncConflict as StoredSyncConflict,
  SyncResult,
} from "@/types/domain/sync";
import type { SyncContextSource } from "@/types/domain/telemetry";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { nanoid } from "nanoid";
import { firestoreDb } from "./firebase";
import type {
  ICloudSyncAdapter,
  IDiffEngine,
  INetworkMonitor,
  IQueueManager,
  ISyncService,
  SyncChange,
  SyncTask,
} from "./interfaces/ISyncService";
import type { LocalDBLike } from "./localDB";
import { CURRENT_TAG_STORE } from "./localdb/tagStoreNames";
import { SecurityMonitor } from "./logic/SecurityMonitor";
import { TelemetryService } from "./logic/TelemetryService";

const SYNC_TABLE_BY_TYPE = {
  card: "cards",
  folder: "folders",
  cardSet: "cardSets",
  document: "documents",
  tag: CURRENT_TAG_STORE,
  asset: "images",
  userSetting: "userSettings",
} as const;

const FULL_RESYNC_TABLES = [
  "folders",
  "cardSets",
  "cards",
  "documents",
  CURRENT_TAG_STORE,
  "userSettings",
  "images",
] as const;

const ROOT_FOLDER_KEY = "__root__";
const DEFAULT_FOLDER_NAME = "インポート済みカード";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === "object";
};

const toSyncTableName = (type: string) => {
  return (
    SYNC_TABLE_BY_TYPE[type as keyof typeof SYNC_TABLE_BY_TYPE] ?? `${type}s`
  );
};

const getPayloadId = (payload: unknown) => {
  if (!isRecord(payload)) return null;
  return typeof payload.id === "string" && payload.id.length > 0
    ? payload.id
    : null;
};

const normalizeFullResyncRecord = (
  userId: string,
  change: { type?: string; id?: string; data?: unknown },
) => {
  const data = {
    ...((isRecord(change.data) ? change.data : {}) as Record<string, unknown>),
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

const normalizeFolderKey = (value: unknown) => {
  if (typeof value !== "string") return ROOT_FOLDER_KEY;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : ROOT_FOLDER_KEY;
};

const toFolderId = (folderKey: string) => {
  return folderKey === ROOT_FOLDER_KEY ? null : folderKey;
};

const buildFolderNameById = (folders: Folder[]) => {
  return new Map(
    folders.map((folder) => [
      String(folder.id ?? folder.folderId ?? ""),
      String(folder.folderName ?? ""),
    ]),
  );
};

const buildNextOrderIndexByFolder = (cardSets: CardSet[]) => {
  const nextOrderIndexByFolder = new Map<string, number>();

  for (const cardSet of cardSets) {
    if (cardSet.isDeleted) continue;
    const folderKey = normalizeFolderKey(cardSet.folderId);
    const currentMax = nextOrderIndexByFolder.get(folderKey) ?? 0;
    nextOrderIndexByFolder.set(
      folderKey,
      Math.max(currentMax, (cardSet.orderIndex ?? 0) + 1),
    );
  }

  return nextOrderIndexByFolder;
};

const buildActiveCardSetByFolder = (cardSets: CardSet[]) => {
  const activeCardSetByFolder = new Map<string, CardSet>();

  for (const cardSet of cardSets) {
    if (cardSet.isDeleted) continue;
    const folderKey = normalizeFolderKey(cardSet.folderId);
    if (!activeCardSetByFolder.has(folderKey)) {
      activeCardSetByFolder.set(folderKey, cardSet);
    }
  }

  return activeCardSetByFolder;
};

const collectCardsNeedingRepair = (
  cards: Card[],
  activeCardSetIds: Set<string>,
) => {
  return cards.filter((card) => {
    if (card.isDeleted) return false;
    const cardSetId =
      typeof card.cardSetId === "string" ? card.cardSetId.trim() : "";
    return cardSetId.length === 0 || !activeCardSetIds.has(cardSetId);
  });
};

const shouldRepairCardSets = (changes: Array<{ type?: unknown }>) => {
  return changes.some((change) => {
    return (
      change.type === "card" ||
      change.type === "cardSet" ||
      change.type === "folder"
    );
  });
};

const preserveLocalOnlyFields = (
  type: string,
  localData: unknown,
  merged: unknown,
) => {
  if (!isRecord(merged)) return merged;

  if (type === "document" && isRecord(localData)) {
    if (localData.localFileId) merged.localFileId = localData.localFileId;
    if (localData.blobUrl) merged.blobUrl = localData.blobUrl;
    if (
      typeof localData.localUrl === "string" &&
      localData.localUrl.startsWith("blob:")
    ) {
      merged.localUrl = localData.localUrl;
    }
  }

  if (type === "asset" && isRecord(localData)) {
    if (localData.localBlobId) merged.localBlobId = localData.localBlobId;
    if (localData.localStatus) merged.localStatus = localData.localStatus;
  }

  return merged;
};

const repairMissingCardSetsAfterSync = async (
  localDB: LocalDBLike,
  userId: string,
) => {
  const now = new Date();

  const [cards, cardSets, folders] = await Promise.all([
    localDB.cards.where("userId").equals(userId).toArray() as Promise<Card[]>,
    localDB.cardSets.where("userId").equals(userId).toArray() as Promise<
      CardSet[]
    >,
    localDB.folders.where("userId").equals(userId).toArray() as Promise<
      Folder[]
    >,
  ]);

  const activeCardSets = cardSets.filter((cardSet) => !cardSet.isDeleted);
  const activeCardSetIds = new Set(activeCardSets.map((cardSet) => cardSet.id));
  const cardsNeedingRepair = collectCardsNeedingRepair(cards, activeCardSetIds);

  if (cardsNeedingRepair.length === 0) return;

  const folderNameById = buildFolderNameById(folders);
  const nextOrderIndexByFolder = buildNextOrderIndexByFolder(activeCardSets);
  const activeCardSetByFolder = buildActiveCardSetByFolder(activeCardSets);

  const cardsByFolder = new Map<string, Card[]>();
  for (const card of cardsNeedingRepair) {
    const folderKey = normalizeFolderKey(card.folderId);
    const group = cardsByFolder.get(folderKey);
    if (group) {
      group.push(card);
    } else {
      cardsByFolder.set(folderKey, [card]);
    }
  }

  await localDB.transaction("rw", localDB.cardSets, localDB.cards, async () => {
    for (const [folderKey, groupedCards] of cardsByFolder.entries()) {
      let targetCardSet = activeCardSetByFolder.get(folderKey);

      if (!targetCardSet) {
        const folderId = toFolderId(folderKey);
        const folderName =
          (folderId ? folderNameById.get(folderId) : null) ||
          DEFAULT_FOLDER_NAME;

        targetCardSet = {
          id: crypto.randomUUID(),
          userId,
          deviceId: groupedCards[0]?.deviceId || "web",
          folderId,
          name: `${folderName} セット`,
          orderIndex: nextOrderIndexByFolder.get(folderKey) ?? 0,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        };

        await localDB.cardSets.add(targetCardSet);
        activeCardSetByFolder.set(folderKey, targetCardSet);
        nextOrderIndexByFolder.set(
          folderKey,
          (nextOrderIndexByFolder.get(folderKey) ?? 0) + 1,
        );
      }

      for (const card of groupedCards) {
        await localDB.cards.update(card.id, {
          cardSetId: targetCardSet.id,
          updatedAt: now,
        });
      }
    }
  });
};

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

    this.localDB.setSyncTrigger(() => {
      this.sync("background").catch((err) => {
        console.error("[SyncServiceV2] Background sync failed:", err);
      });
    });
  }

  async synchronize(onProgress?: (msg: string) => void): Promise<SyncResult> {
    onProgress?.("同期を開始しています...");
    try {
      await this.sync("user_initiated");
      return {
        success: true,
        uploaded: 0,
        downloaded: 0,
        conflicts: 0,
        errors: [],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        uploaded: 0,
        downloaded: 0,
        conflicts: 0,
        errors: [message],
      };
    }
  }

  async sync(source: SyncContextSource): Promise<void> {
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

      await this.checkDeviceStatus();

      if (this.networkMonitor.status === "offline") {
        this.telemetry.log("warn", "Offline, sync deferred");
        return;
      }

      if (this.networkMonitor.status === "poor") {
        this.telemetry.log("info", "Network poor, deferring heavy sync");
        return;
      }

      this.telemetry.log("info", "Checking for remote changes (Pull)");
      const lastSyncTime = await this.localDB.getLastSyncTime(this.userId);
      const lastSyncTimestamp = lastSyncTime ? lastSyncTime.getTime() : 0;

      const { changes, serverTime } =
        await this.cloudAdapter.pullDiff(lastSyncTimestamp);

      if (changes.length > 0) {
        this.telemetry.log("info", `Applying ${changes.length} remote changes`);
        await this.applyRemoteChanges(changes);
      }

      const constraint = this.networkMonitor.getBatchConstraint(source);
      const tasks = await this.queueManager.peekBatch(constraint);

      if (tasks.length > 0) {
        this.telemetry.log("info", `Pushing ${tasks.length} local changes`);
        await this.processBatch(tasks);
      }

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

  private async processBatch(tasks: SyncTask[]): Promise<void> {
    const startTime = performance.now();
    const successIds: string[] = [];
    const failedIds: string[] = [];

    for (const task of tasks) {
      try {
        if (task.type === "upload") {
          const payloadId = getPayloadId(task.payload);
          if (!payloadId) {
            throw new Error(`Missing payload.id for sync task: ${task.id}`);
          }

          const result = await this.cloudAdapter.pushBatch([
            {
              type: task.entity,
              id: payloadId,
              data: task.payload,
            },
          ]);

          if (result.successIds.length > 0) {
            successIds.push(task.id);
          } else {
            failedIds.push(task.id);
          }
        } else if (task.type === "download") {
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

        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (
          errorMessage.includes("conflict") ||
          errorMessage.includes("version_mismatch")
        ) {
          this.telemetry.log(
            "warn",
            "Fatal sync conflict detected. Triggering self-healing full resync.",
          );
          await this.forceFullResync();
          return;
        }

        failedIds.push(task.id);
      }
    }

    const duration = performance.now() - startTime;
    const success = failedIds.length === 0;

    this.networkMonitor.reportResult(success, duration);

    if (successIds.length > 0) {
      await this.queueManager.complete(successIds);
    }

    if (failedIds.length > 0) {
      await this.queueManager.fail(failedIds, "Batch processing failed", true);
    }

    this.telemetry.recordMetric("sync_batch_size", tasks.length);
    this.telemetry.recordMetric("sync_success_count", successIds.length);
    this.telemetry.recordMetric("sync_failure_count", failedIds.length);
  }

  async performStartupSync(): Promise<void> {
    if (this.isSyncing) return;

    this.isSyncing = true;
    const transaction = this.telemetry.startTransaction("startup_sync");

    try {
      this.telemetry.log("info", "Starting startup sync (Pull priorities)");

      const lastSyncTime = await this.localDB.getLastSyncTime(this.userId);
      const lastSyncTimestamp = lastSyncTime ? lastSyncTime.getTime() : 0;

      const { changes, serverTime } =
        await this.cloudAdapter.pullDiff(lastSyncTimestamp);

      if (changes.length > 0) {
        this.telemetry.log("info", `Applying ${changes.length} remote changes`);
        await this.applyRemoteChanges(changes);
      }

      const constraint = this.networkMonitor.getBatchConstraint("system");
      const tasks = await this.queueManager.peekBatch(constraint);
      if (tasks.length > 0) {
        this.telemetry.log("info", `Pushing ${tasks.length} local changes`);
        await this.processBatch(tasks);
      }

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

  private async applyRemoteChanges(changes: SyncChange[]): Promise<void> {
    const allFolders = await this.localDB.folders.toArray();

    for (const change of changes) {
      const changeType = typeof change.type === "string" ? change.type : "";
      if (!changeType) continue;

      const changeId = typeof change.id === "string" ? change.id : "";
      const table = toSyncTableName(changeType);
      const remoteData = normalizeFullResyncRecord(this.userId, {
        type: changeType,
        id: changeId,
        data: change.data,
      });

      if (changeType === "document") {
        delete remoteData.localFileId;
        delete remoteData.blobUrl;
        if (
          typeof remoteData.localUrl === "string" &&
          remoteData.localUrl.startsWith("blob:")
        ) {
          remoteData.localUrl = null;
        }
      }

      if (changeType === "asset") {
        delete remoteData.localBlobId;
        delete remoteData.localStatus;
      }

      if (changeType === "folder") {
        const parentId =
          remoteData.parentFolderId ?? remoteData.parent_folder_id ?? null;
        const folderId =
          changeId || (typeof remoteData.id === "string" ? remoteData.id : "");

        if (
          folderId &&
          this.diffEngine.detectCycle(
            folderId,
            parentId as string | null,
            allFolders,
          )
        ) {
          this.telemetry.log(
            "error",
            "Circular reference detected during applyRemoteChanges, healing by setting parent to null",
            {
              folderId,
              parentId,
            },
          );
          remoteData.parentFolderId = null;
          remoteData.parent_folder_id = null;
        }
      }

      const localLookupId =
        changeType === "userSetting" ? this.userId : changeId || this.userId;
      const localData = await this.localDB.getItem(table, localLookupId);

      if (!localData) {
        await this.localDB.upsert(table, remoteData as never, true);
        continue;
      }

      const { merged, conflict } = this.diffEngine.merge(
        localData,
        remoteData,
        "server_wins",
      );

      const mergedWithLocalFields = preserveLocalOnlyFields(
        changeType,
        localData,
        merged,
      );

      if (conflict) {
        this.telemetry.log(
          "warn",
          "Conflict detected during applyRemoteChanges",
          {
            entity: changeType,
            id: changeId,
          },
        );

        const storedConflict: StoredSyncConflict = {
          id: nanoid(),
          entityId: changeId || localLookupId,
          entityType: changeType as StoredSyncConflict["entityType"],
          autoMerged: mergedWithLocalFields,
          conflicts: {},
          detectedAt: Date.now(),
        };

        await this.localDB.putConflict(storedConflict);
      }

      await this.localDB.upsert(table, mergedWithLocalFields as never, true);
    }

    if (shouldRepairCardSets(changes)) {
      await repairMissingCardSetsAfterSync(this.localDB, this.userId);
    }
  }

  async getQueueStatus(): Promise<{ pending: number; isSyncing: boolean }> {
    const pending = await this.queueManager.getQueueDepth();
    return { pending, isSyncing: this.isSyncing };
  }

  async forceFullResync(): Promise<void> {
    this.telemetry.log("warn", "Force full resync initiated");

    await this.securityMonitor.logEvent("SYNC_CONFLICT_EXCESS");

    this.fallbackCount += 1;
    this.telemetry.recordMetric("sync_fallback_count", this.fallbackCount);

    try {
      const diff = await this.cloudAdapter.pullDiff(0);

      this.telemetry.log("info", "Pulling all data for resync", {
        changesCount: diff.changes.length,
      });

      await this.localDB.transaction(
        "rw",
        [...FULL_RESYNC_TABLES],
        async () => {
          for (const table of FULL_RESYNC_TABLES) {
            await (
              this.localDB as unknown as Record<
                string,
                { clear: () => Promise<void> }
              >
            )[table].clear();
          }

          for (const change of diff.changes) {
            const changeType =
              typeof change.type === "string" ? change.type : "";
            if (!changeType) continue;

            const tableName = toSyncTableName(changeType);
            if (
              !(FULL_RESYNC_TABLES as readonly string[]).includes(tableName)
            ) {
              continue;
            }

            const data = normalizeFullResyncRecord(this.userId, {
              type: changeType,
              id: typeof change.id === "string" ? change.id : undefined,
              data: change.data,
            });

            await (
              this.localDB as unknown as Record<
                string,
                { put: (value: unknown) => Promise<void> }
              >
            )[tableName].put(data);
          }
        },
      );

      await repairMissingCardSetsAfterSync(this.localDB, this.userId);

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

  async removeDevice(deviceId: string): Promise<void> {
    this.telemetry.log("info", "Revoking device access", { deviceId });
    if (!firestoreDb) {
      this.telemetry.log(
        "error",
        "Security Alert: firestoreDb is undefined during removeDevice",
      );
      return;
    }
    const deviceRef = doc(
      firestoreDb,
      `sync_metadata/${this.userId}/devices/${deviceId}`,
    );

    await updateDoc(deviceRef, {
      status: "revoked",
      revokedAt: Timestamp.now(),
      isActive: false,
    });

    await this.securityMonitor.logEvent("DEVICE_REVOKED", {
      revokedDeviceId: deviceId,
    });
  }

  private async checkDeviceStatus(): Promise<void> {
    const currentDeviceId = localStorage.getItem("deviceId");
    if (!currentDeviceId) return;

    if (!firestoreDb) {
      this.telemetry.log(
        "error",
        "Security Alert: firestoreDb is undefined during checkDeviceStatus",
      );
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

          await this.securityMonitor.logEvent("ACCESS_DENIED_REVOKED");

          throw new Error(
            "DEVICE_REVOKED: This device has been removed from the account.",
          );
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("DEVICE_REVOKED")) {
        throw error;
      }
    }
  }

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
    for (const deviceDoc of snapshot.docs) {
      const data = deviceDoc.data();
      if (data.status === "revoked") continue;

      await deleteDoc(deviceDoc.ref);
      count += 1;
    }
    return count;
  }

  async getSyncStats(): Promise<unknown> {
    return {
      successRate: 100,
      avgDuration: 0,
      errorRate: 0,
      totalSyncs: 0,
    };
  }

  async getUnresolvedConflicts(): Promise<unknown[]> {
    return [];
  }

  async loadSettings(): Promise<unknown> {
    return {
      autoSync: true,
      intervalMinutes: 30,
      wifiOnly: false,
    };
  }

  async performFullSync(): Promise<void> {
    return this.sync("force_resync");
  }

  async processQueue(): Promise<{ processed: number; errors: unknown[] }> {
    await this.sync("background");
    return { processed: 0, errors: [] };
  }

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

  async dismissSecurityAlert(alertId: string): Promise<void> {
    await this.securityMonitor.dismissAlert(alertId);
  }
}
