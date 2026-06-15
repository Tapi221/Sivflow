import { nanoid } from "nanoid";
import type { ICloudSyncAdapter, IDiffEngine, INetworkMonitor, IQueueManager, ISyncService, SecurityState, SyncChange, SyncConflict, SyncProcessingError, SyncStats, SyncTask, UserSettingsSnapshot } from "@/services/interfaces/ISyncService";
import type { LocalDBLike } from "@/services/localdb";
import { SecurityMonitor } from "@/services/logic/SecurityMonitor";
import { TelemetryService } from "@/services/logic/TelemetryService";
import type { Card, CardSet, Folder } from "@/types";
import type { SyncConflict as StoredSyncConflict, SyncQueueItem, SyncResult } from "@/types/domain/sync";
import type { SyncContextSource } from "@/types/domain/telemetry";



type SyncableRecord = Record<string, unknown> & { id?: string; isDeleted?: boolean; };



const SYNC_TABLE_BY_TYPE = {
  card: "cards",
  folder: "folders",
  cardSet: "cardSets",
  document: "documents",
  tag: "tagRecords",
  asset: "images",
  userSetting: "userSettings",
} as const;
const FULL_RESYNC_TABLES = ["folders", "cardSets", "cards", "documents", "tagRecords", "userSettings", "images"] as const;



type SyncableTableName = (typeof FULL_RESYNC_TABLES)[number];



const ROOT_FOLDER_KEY = "__root__";
const DEFAULT_FOLDER_NAME = "インポート済みカード";
const SYNC_ENTITY_BY_TABLE: Record<SyncableTableName, SyncTask["entity"]> = {
  folders: "folder",
  cardSets: "cardSet",
  cards: "card",
  documents: "document",
  tagRecords: "tag",
  userSettings: "userSetting",
  images: "asset",
};
const DELETE_CAPABLE_SYNC_ENTITIES = new Set<SyncTask["entity"]>(["folder", "cardSet", "card", "document", "tag", "asset"]);



const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === "object";
};
const toSyncTableName = (type: string) => {
  return SYNC_TABLE_BY_TYPE[type as keyof typeof SYNC_TABLE_BY_TYPE] ?? `${type}s`;
};
const getPayloadId = (payload: unknown) => {
  if (!isRecord(payload)) return null;
  return typeof payload.id === "string" && payload.id.length > 0 ? payload.id : null;
};
const getRecordId = (record: unknown): string | null => {
  if (!isRecord(record)) return null;
  return typeof record.id === "string" && record.id.trim().length > 0 ? record.id : null;
};
const isDeletedRecord = (record: unknown): boolean => isRecord(record) && record.isDeleted === true;
const normalizeFullResyncRecord = (userId: string, change: { type?: string; id?: string; data?: unknown; }) => {
  const data = { ...((isRecord(change.data) ? change.data : {}) as Record<string, unknown>) };

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
  return new Map(folders.map((folder) => [String(folder.id ?? folder.folderId ?? ""), String(folder.folderName ?? "")]));
};
const buildNextOrderIndexByFolder = (cardSets: CardSet[]) => {
  const nextOrderIndexByFolder = new Map<string, number>();

  for (const cardSet of cardSets) {
    if (cardSet.isDeleted) continue;
    const folderKey = normalizeFolderKey(cardSet.folderId);
    const currentMax = nextOrderIndexByFolder.get(folderKey) ?? 0;
    nextOrderIndexByFolder.set(folderKey, Math.max(currentMax, (cardSet.orderIndex ?? 0) + 1));
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
const collectCardsNeedingRepair = (cards: Card[], activeCardSetIds: Set<string>) => {
  return cards.filter((card) => {
    if (card.isDeleted) return false;
    const cardSetId = typeof card.cardSetId === "string" ? card.cardSetId.trim() : "";
    return cardSetId.length === 0 || !activeCardSetIds.has(cardSetId);
  });
};
const shouldRepairCardSets = (changes: Array<{ type?: unknown; }>) => {
  return changes.some((change) => change.type === "card" || change.type === "cardSet" || change.type === "folder");
};
const preserveLocalOnlyFields = (type: string, localData: unknown, merged: unknown) => {
  if (!isRecord(merged)) return merged;

  if (type === "card" && isRecord(localData)) {
    if ("lastSyncedAt" in localData) merged.lastSyncedAt = localData.lastSyncedAt;
    if ("syncState" in localData) merged.syncState = localData.syncState;
    if ("lastSyncedByDeviceId" in localData) merged.lastSyncedByDeviceId = localData.lastSyncedByDeviceId;
  }

  if (type === "document" && isRecord(localData)) {
    if (localData.localFileId) merged.localFileId = localData.localFileId;
    if (localData.blobUrl) merged.blobUrl = localData.blobUrl;
    if (typeof localData.localUrl === "string" && localData.localUrl.startsWith("blob:")) {
      merged.localUrl = localData.localUrl;
    }
  }

  if (type === "asset" && isRecord(localData)) {
    if (localData.localBlobId) merged.localBlobId = localData.localBlobId;
    if (localData.localStatus) merged.localStatus = localData.localStatus;
  }

  return merged;
};
const getCurrentDeviceId = () => {
  try {
    const deviceId = localStorage.getItem("deviceId");
    return typeof deviceId === "string" && deviceId.trim().length > 0 ? deviceId : null;
  } catch {
    return null;
  }
};
const applyLocalCardSyncMetadata = (record: unknown, { syncedAt, syncState }: { syncedAt: Date; syncState: Card["syncState"]; }) => {
  if (!isRecord(record)) return record;

  record.lastSyncedAt = syncedAt;
  record.syncState = syncState ?? "synced";
  record.lastSyncedByDeviceId = getCurrentDeviceId();

  return record;
};
const toQueueEntity = (changeType: string): SyncTask["entity"] | null => {
  if (changeType === "userSetting") return "userSetting";
  const table = toSyncTableName(changeType);
  return SYNC_ENTITY_BY_TABLE[table as SyncableTableName] ?? null;
};
const toLocalUpsertPayload = (record: unknown): Record<string, unknown> | null => {
  if (!isRecord(record)) return null;
  const id = getRecordId(record);
  if (!id) return null;
  return { ...record, id };
};
const repairMissingCardSetsAfterSync = async (localDB: LocalDBLike, userId: string) => {
  const now = new Date();
  const [cards, cardSets, folders] = await Promise.all([localDB.listCardsByUser(userId), localDB.listCardSetsByUser(userId), localDB.listFoldersByUser(userId)]);
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

  await localDB.runSyncTransaction(async () => {
    for (const [folderKey, groupedCards] of cardsByFolder.entries()) {
      let targetCardSet = activeCardSetByFolder.get(folderKey);

      if (!targetCardSet) {
        const folderId = toFolderId(folderKey);
        const folderName = (folderId ? folderNameById.get(folderId) : null) || DEFAULT_FOLDER_NAME;

        targetCardSet = {
          id: crypto.randomUUID(),
          userId,
          deviceId: groupedCards[0]?.deviceId ?? "web",
          folderId,
          name: `${folderName} セット`,
          orderIndex: nextOrderIndexByFolder.get(folderKey) ?? 0,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        };

        await localDB.addCardSet(targetCardSet);
        activeCardSetByFolder.set(folderKey, targetCardSet);
        nextOrderIndexByFolder.set(folderKey, (nextOrderIndexByFolder.get(folderKey) ?? 0) + 1);
      }

      for (const card of groupedCards) {
        await localDB.updateCardById(card.id, { cardSetId: targetCardSet.id, updatedAt: now });
      }
    }
  });
};
class SyncServiceV2 implements ISyncService {
  private queueManager: IQueueManager;
  private networkMonitor: INetworkMonitor;
  private diffEngine: IDiffEngine;
  private cloudAdapter: ICloudSyncAdapter;
  private telemetry: TelemetryService;
  private securityMonitor: SecurityMonitor;
  private localDB: LocalDBLike;
  private isSyncing = false;
  private fallbackCount = 0;

  constructor(private userId: string, localDB: LocalDBLike, queueManager: IQueueManager, networkMonitor: INetworkMonitor, diffEngine: IDiffEngine, cloudAdapter: ICloudSyncAdapter, telemetry: TelemetryService) {
    this.localDB = localDB;
    this.queueManager = queueManager;
    this.networkMonitor = networkMonitor;
    this.diffEngine = diffEngine;
    this.cloudAdapter = cloudAdapter;
    this.telemetry = telemetry;
    this.securityMonitor = new SecurityMonitor(userId, localStorage.getItem("deviceId") || "unknown");

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
      return { success: true, uploaded: 0, downloaded: 0, conflicts: 0, errors: [] };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, uploaded: 0, downloaded: 0, conflicts: 0, errors: [message] };
    }
  }

  async sync(source: SyncContextSource): Promise<void> {
    if (this.isSyncing) {
      this.telemetry.log("warn", "Sync already in progress, skipping", { source });
      return;
    }

    this.isSyncing = true;
    const transaction = this.telemetry.startTransaction("sync");

    try {
      this.telemetry.log("info", "Sync started", { source, networkStatus: this.networkMonitor.status });
      await this.checkDeviceStatus();

      if (this.networkMonitor.status === "offline") {
        this.telemetry.log("warn", "Offline, sync deferred");
        transaction.end("success");
        return;
      }

      if (this.networkMonitor.status === "poor") {
        this.telemetry.log("info", "Network poor, deferring heavy sync");
        transaction.end("success");
        return;
      }

      await this.processPendingLocalChanges(source);
      const lastSyncTime = await this.localDB.getLastSyncTime(this.userId);
      const lastSyncTimestamp = lastSyncTime ? lastSyncTime.getTime() : 0;
      const { changes, serverTime } = await this.cloudAdapter.pullDiff(lastSyncTimestamp);

      if (changes.length > 0) {
        await this.applyRemoteChanges(changes);
      }

      await this.processPendingLocalChanges(source);
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

  async performStartupSync(): Promise<void> {
    if (this.isSyncing) return;

    this.isSyncing = true;
    const transaction = this.telemetry.startTransaction("startup_sync");

    try {
      this.telemetry.log("info", "Starting startup sync (local replica first)");

      if (this.networkMonitor.status === "offline" || this.networkMonitor.status === "poor") {
        this.telemetry.log("warn", "Startup sync deferred by network status", { status: this.networkMonitor.status });
        transaction.end("success");
        return;
      }

      await this.processPendingLocalChanges("system");
      const lastSyncTime = await this.localDB.getLastSyncTime(this.userId);
      const lastSyncTimestamp = lastSyncTime ? lastSyncTime.getTime() : 0;
      const { changes, serverTime } = await this.cloudAdapter.pullDiff(lastSyncTimestamp);

      if (changes.length > 0) {
        await this.applyRemoteChanges(changes);
      }

      await this.processPendingLocalChanges("system");
      await this.localDB.updateLastSyncTime(this.userId, new Date(serverTime));
      transaction.end("success");
    } catch (error) {
      this.telemetry.log("error", "Startup sync failed", {}, error as Error);
      transaction.end("failure");
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  async getQueueStatus(): Promise<{ pending: number; isSyncing: boolean; }> {
    const pending = await this.queueManager.getQueueDepth();
    return { pending, isSyncing: this.isSyncing };
  }

  async forceFullResync(): Promise<void> {
    this.telemetry.log("warn", "Force replica repair sync initiated");
    await this.securityMonitor.logEvent("SYNC_CONFLICT_EXCESS");
    this.fallbackCount += 1;
    this.telemetry.recordMetric("sync_fallback_count", this.fallbackCount);

    const diff = await this.cloudAdapter.pullDiff(0);
    await this.applyRemoteChanges(diff.changes);
    await this.queueLocalReplicaSnapshot();
    await repairMissingCardSetsAfterSync(this.localDB, this.userId);
    await this.localDB.updateLastSyncTime(this.userId, diff.serverTime ? new Date(diff.serverTime) : new Date());
  }

  async removeDevice(deviceId: string): Promise<void> {
    this.telemetry.log("info", "Revoking device access", { deviceId });
    await this.cloudAdapter.revokeDevice(deviceId);
    await this.securityMonitor.logEvent("DEVICE_REVOKED", { revokedDeviceId: deviceId });
  }

  async updateDeviceName(deviceId: string, newName: string): Promise<void> {
    await this.cloudAdapter.updateDeviceName(deviceId, newName);
  }

  async cleanupInactiveDevices(): Promise<number> {
    return this.cloudAdapter.cleanupInactiveDevices();
  }

  async getSyncStats(): Promise<SyncStats> {
    const [queueDepth, histories, errors] = await Promise.all([this.queueManager.getQueueDepth(), this.localDB.getRecentSyncHistory(20), this.localDB.syncErrors.toArray()]);
    const lastAttempt = histories[0];
    const lastSuccess = histories.find((history) => history.result === "success");

    return {
      queueDepth,
      isSyncing: this.isSyncing,
      lastAttemptAt: lastAttempt?.startedAt,
      lastSuccessAt: lastSuccess?.finishedAt,
      lastServerTime: (await this.localDB.getLastSyncTime(this.userId))?.getTime(),
      lastErrorMessage: errors[0]?.message,
      recentSuccessRate: histories.length ? histories.filter((history) => history.result === "success").length / histories.length : 1,
    };
  }

  async getUnresolvedConflicts(): Promise<SyncConflict[]> {
    const conflicts = await this.localDB.getConflicts();
    return conflicts.map((conflict) => ({
      id: conflict.id,
      entity: conflict.entityType,
      targetId: conflict.entityId,
      local: conflict.conflicts.localFirst?.local ?? conflict.autoMerged,
      remote: conflict.conflicts.localFirst?.remote,
      createdAt: conflict.detectedAt,
    }));
  }

  async loadSettings(): Promise<UserSettingsSnapshot> {
    const settings = await this.localDB.userSettings.get(this.userId);
    return { version: 1, updatedAt: Date.now(), data: settings ?? {} };
  }

  async performFullSync(): Promise<void> {
    await this.sync("user_initiated");
  }

  async processQueue(): Promise<{ processed: number; errors: SyncProcessingError[]; }> {
    const tasks = await this.queueManager.peekBatch({ maxSize: 100, concurrency: 1, timeoutMs: 30000 });
    const errors: SyncProcessingError[] = [];

    for (const task of tasks) {
      try {
        await this.processBatch([task]);
      } catch (error: unknown) {
        errors.push({ taskId: task.id, message: error instanceof Error ? error.message : String(error), retryable: true });
      }
    }

    return { processed: tasks.length - errors.length, errors };
  }

  monitorSecurity(callback: (state: SecurityState) => void): () => void {
    return this.securityMonitor.subscribe(callback);
  }

  async dismissSecurityAlert(alertId: string): Promise<void> {
    await this.securityMonitor.dismissAlert(alertId);
  }

  private async processPendingLocalChanges(source: SyncContextSource): Promise<void> {
    const constraint = this.networkMonitor.getBatchConstraint(source);
    const tasks = await this.queueManager.peekBatch(constraint);

    if (tasks.length > 0) {
      this.telemetry.log("info", `Backing up ${tasks.length} local changes`);
      await this.processBatch(tasks);
    }
  }

  private async processBatch(tasks: SyncTask[]): Promise<void> {
    const startTime = performance.now();
    const successIds: string[] = [];
    const failedIds: string[] = [];
    const syncedCardIds = new Set<string>();
    const failedCardIds = new Set<string>();
    const conflictedCardIds = new Set<string>();
    const syncedAt = new Date();

    for (const task of tasks) {
      try {
        if (task.type === "upload") {
          const payloadId = getPayloadId(task.payload);
          if (!payloadId) throw new Error(`Missing payload.id for sync task: ${task.id}`);
          const result = await this.cloudAdapter.pushBatch([{ type: task.entity, id: payloadId, data: task.payload, operationType: task.operationType }]);

          if (result.successIds.length > 0) {
            successIds.push(task.id);
            if (task.entity === "card") syncedCardIds.add(payloadId);
          } else {
            failedIds.push(task.id);
            if (task.entity === "card") failedCardIds.add(payloadId);
          }
        } else if (task.type === "download") {
          const { changes } = await this.cloudAdapter.pullDiff(0);
          if (changes.length > 0) await this.applyRemoteChanges(changes);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.telemetry.log("error", "Task failed", { taskId: task.id }, error as Error);

        if (errorMessage.includes("conflict") || errorMessage.includes("version_mismatch")) {
          const payloadId = getPayloadId(task.payload);
          if (task.entity === "card" && payloadId) conflictedCardIds.add(payloadId);
          await this.forceFullResync();
          return;
        }

        failedIds.push(task.id);
        const payloadId = getPayloadId(task.payload);
        if (task.entity === "card" && payloadId) failedCardIds.add(payloadId);
      }
    }

    const duration = performance.now() - startTime;
    const success = failedIds.length === 0;
    this.networkMonitor.reportResult(success, duration);

    if (successIds.length > 0) await this.queueManager.complete(successIds);
    if (syncedCardIds.size > 0) await Promise.all([...syncedCardIds].map((id) => this.localDB.updateCardById(id, { lastSyncedAt: syncedAt, syncState: "synced", lastSyncedByDeviceId: getCurrentDeviceId() })));
    if (conflictedCardIds.size > 0) await Promise.all([...conflictedCardIds].map((id) => this.localDB.updateCardById(id, { syncState: "conflict" })));
    if (failedCardIds.size > 0) await Promise.all([...failedCardIds].map((id) => this.localDB.updateCardById(id, { syncState: "error" })));
    if (failedIds.length > 0) await this.queueManager.fail(failedIds, "Batch processing failed", true);

    this.telemetry.recordMetric("sync_batch_size", tasks.length);
    this.telemetry.recordMetric("sync_success_count", successIds.length);
    this.telemetry.recordMetric("sync_failure_count", failedIds.length);
  }

  private async getQueuedReplicaTargetKeys(): Promise<Set<string>> {
    const queueReadable = this.localDB as LocalDBLike & { getQueuedItemsOldestFirst?: () => Promise<SyncQueueItem[]>; };
    if (typeof queueReadable.getQueuedItemsOldestFirst !== "function") return new Set();
    const queuedItems = await queueReadable.getQueuedItemsOldestFirst();
    return new Set(queuedItems.filter((item) => item.status !== "completed").map((item) => `${item.entity}:${item.targetId ?? getPayloadId(item.payload) ?? ""}`));
  }

  private async queueLocalReplicaWrite(changeType: string, record: unknown): Promise<void> {
    const entity = toQueueEntity(changeType);
    const payload = toLocalUpsertPayload(record);
    if (!entity || !payload) return;
    const targetId = getRecordId(payload);
    if (!targetId) return;

    if (isDeletedRecord(payload) && DELETE_CAPABLE_SYNC_ENTITIES.has(entity)) {
      await this.localDB.queueDeleteSync({ entity: entity as never, targetId, priority: "high" });
      return;
    }

    await this.localDB.queueUpsertSync({ entity: entity as never, operationType: "update", payload: payload as never, priority: "high" });
  }

  private async queueLocalReplicaSnapshot(): Promise<void> {
    for (const table of FULL_RESYNC_TABLES) {
      const entity = SYNC_ENTITY_BY_TABLE[table];
      const records = await this.localDB.getAllItems(table);

      for (const record of records as SyncableRecord[]) {
        const id = getRecordId(record);
        if (!id) continue;

        if (record.isDeleted === true && DELETE_CAPABLE_SYNC_ENTITIES.has(entity)) {
          await this.localDB.queueDeleteSync({ entity: entity as never, targetId: id, priority: "medium" });
          continue;
        }

        await this.localDB.queueUpsertSync({ entity: entity as never, operationType: "update", payload: { ...record, id } as never, priority: "medium" });
      }
    }
  }

  private async applyRemoteChanges(changes: SyncChange[]): Promise<void> {
    const allFolders = await this.localDB.folders.toArray();
    const syncedAt = new Date();
    const queuedReplicaTargets = await this.getQueuedReplicaTargetKeys();

    for (const change of changes) {
      const changeType = typeof change.type === "string" ? change.type : "";
      if (!changeType) continue;

      const changeId = typeof change.id === "string" ? change.id : "";
      const table = toSyncTableName(changeType);
      const remoteData = normalizeFullResyncRecord(this.userId, { type: changeType, id: changeId, data: change.data });

      if (changeType === "document") {
        delete remoteData.localFileId;
        delete remoteData.blobUrl;
        if (typeof remoteData.localUrl === "string" && remoteData.localUrl.startsWith("blob:")) remoteData.localUrl = null;
      }

      if (changeType === "asset") {
        delete remoteData.localBlobId;
        delete remoteData.localStatus;
      }

      if (changeType === "folder") {
        const parentId = remoteData.parentFolderId ?? remoteData.parent_folder_id ?? null;
        const folderId = changeId || (typeof remoteData.id === "string" ? remoteData.id : "");

        if (folderId && this.diffEngine.detectCycle(folderId, parentId as string | null, allFolders)) {
          this.telemetry.log("error", "Circular reference detected during applyRemoteChanges, healing by setting parent to null", { folderId, parentId });
          remoteData.parentFolderId = null;
          remoteData.parent_folder_id = null;
        }
      }

      const localLookupId = changeType === "userSetting" ? this.userId : changeId || this.userId;
      const localData = await this.localDB.getItem(table, localLookupId);
      const entity = toQueueEntity(changeType);
      const targetKey = entity ? `${entity}:${localLookupId}` : "";
      const hasQueuedLocalWrite = targetKey.length > 0 && queuedReplicaTargets.has(targetKey);

      if (!localData) {
        const nextRecord = changeType === "card" ? applyLocalCardSyncMetadata(remoteData, { syncedAt, syncState: "synced" }) : remoteData;
        await this.localDB.upsert(table, nextRecord as never, true);
        continue;
      }

      const { merged, conflict } = this.diffEngine.merge(localData, remoteData, "client_wins");
      const mergedWithLocalFields = preserveLocalOnlyFields(changeType, localData, merged);
      const nextRecord = changeType === "card" ? applyLocalCardSyncMetadata(mergedWithLocalFields, { syncedAt, syncState: conflict ? "conflict" : "synced" }) : mergedWithLocalFields;

      if (conflict) {
        const storedConflict: StoredSyncConflict = {
          id: nanoid(),
          entityId: changeId || localLookupId,
          entityType: changeType as StoredSyncConflict["entityType"],
          autoMerged: mergedWithLocalFields,
          conflicts: { localFirst: { local: localData, remote: remoteData } },
          detectedAt: Date.now(),
        };

        this.telemetry.log("warn", "Remote replica conflict detected; keeping local record authoritative", { entity: changeType, id: changeId, hasQueuedLocalWrite });
        await this.localDB.putConflict(storedConflict);
        await this.queueLocalReplicaWrite(changeType, mergedWithLocalFields);
      }

      await this.localDB.upsert(table, nextRecord as never, true);

      if (!conflict && hasQueuedLocalWrite) {
        await this.queueLocalReplicaWrite(changeType, nextRecord);
      }
    }

    if (shouldRepairCardSets(changes)) {
      await repairMissingCardSetsAfterSync(this.localDB, this.userId);
    }
  }

  private async checkDeviceStatus(): Promise<void> {
    const currentDeviceId = getCurrentDeviceId();
    if (!currentDeviceId) return;

    try {
      const status = await this.cloudAdapter.getDeviceStatus(currentDeviceId);
      if (status !== "revoked") return;

      this.telemetry.log("error", "Security Alert: Access attempt from revoked device", { deviceId: currentDeviceId });
      await this.securityMonitor.logEvent("ACCESS_DENIED_REVOKED", { deviceId: currentDeviceId });
      throw new Error("This device has been revoked. Please re-authenticate.");
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("revoked")) throw error;
      this.telemetry.log("warn", "Could not check device status", { deviceId: currentDeviceId }, error as Error);
    }
  }
}



export { SyncServiceV2 };
