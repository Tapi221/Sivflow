import type {
  AssetRecord,
  Card,
  Folder,
  UserSettings,
  UserStats,
} from "@/types";
import type {
  AssetSyncPayload,
  DiffResult,
  SyncDeletePayload,
  SyncConflict,
  SyncEntity,
  SyncError,
  SyncHistory,
  SyncOperationType,
  SyncPayloadByEntity,
  SyncQueueItem,
  SyncResult,
  SyncSettings,
} from "@/types/domain/sync";
import { DEFAULT_SYNC_SETTINGS } from "@/types/domain/sync";
import { getDeviceName, getOrCreateDeviceId } from "@/utils/device";
import { sanitizeForLog } from "@/utils/logSanitizer";
import { sanitizeProfileImage } from "@/utils/profileImageSanitizer";
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytesResumable,
} from "firebase/storage";
import type { ICloudProvider } from "./cloudProvider";
import { FirebaseCloudProvider } from "./cloudProvider";
import { firestoreDb, storage } from "./firebase";
import { getImageBlob } from "./imageFileStore";
import { ImageSyncService } from "./imageSyncService";
import type { LocalDBLike } from "./localDB";

type SyncableCollection =
  | "users"
  | "userSettings"
  | "folders"
  | "cards"
  | "userStats";

type MergeableEntity = Card | Folder;
type MergeableEntityType = "card" | "folder";
type SyncUpsertTable = "cards" | "folders" | "userSettings" | "userStats";
type SyncPayloadByTable = {
  cards: Card;
  folders: Folder;
  userSettings: UserSettings;
  userStats: UserStats;
};

const toDate = (value: unknown): Date => {
  if (value instanceof Date) return value;
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();
    return date instanceof Date ? date : new Date(0);
  }
  if (typeof value === "number" || typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date(0) : date;
  }
  return new Date(0);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasStringId = (value: unknown): value is { id: string } =>
  isRecord(value) && typeof value.id === "string" && value.id.length > 0;

const isCard = (value: unknown): value is Card =>
  hasStringId(value) && isRecord(value.front) && isRecord(value.back);

const isFolder = (value: unknown): value is Folder =>
  hasStringId(value) &&
  typeof value.folderId === "string" &&
  typeof value.folderName === "string";

const isAssetSyncPayload = (value: unknown): value is AssetSyncPayload =>
  hasStringId(value);

const getErrorDetails = (
  error: unknown,
): { message: string; stack?: string } => {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  if (isRecord(error)) {
    const message =
      typeof error.message === "string"
        ? error.message
        : "Unknown sync error";
    const stack = typeof error.stack === "string" ? error.stack : undefined;
    return { message, stack };
  }
  return { message: String(error) };
};

const hasTextConflict = (local: MergeableEntity, remote: MergeableEntity): boolean =>
  isCard(local) && isCard(remote)
    ? JSON.stringify(local.front.blocks) !== JSON.stringify(remote.front.blocks) ||
      JSON.stringify(local.back.blocks) !== JSON.stringify(remote.back.blocks)
    : isFolder(local) && isFolder(remote)
      ? local.folderName !== remote.folderName
      : false;

/**
 * FirestoreとローカルDB (Dexie) 間の差分同期を管理するサービスクラス。
 * ローカルファースト設計: すべての読み取りはローカルから、クラウドは差分同期のみ
 *
 * 高度化機能:
 * - エラーライフサイクル管理（retryCount、3回失敗でretryable=false）
 * - 同期履歴記録（30日 or 100件保持）
 * - ユーザー設定駆動型同期（間隔、WiFi限定など）
 * - オフラインキュー（FIFO）
 * - 競合検出とフィールド単位自動マージ
 */
export class SyncService {
  private userId: string;
  private localDB: LocalDBLike;
  private cloudProvider: ICloudProvider;
  private deviceId: string;
  private imageSyncService: ImageSyncService;

  // Phase 1: Sync Isolation
  public static isSyncing: boolean = false;

  constructor(
    userId: string,
    localDB: LocalDBLike,
    cloudProvider?: ICloudProvider,
  ) {
    if (!userId) {
      throw new Error("SyncService requires a user ID.");
    }
    this.userId = userId;
    // 注入されたLocalDBインスタンスを使用
    this.localDB = localDB;
    this.cloudProvider = cloudProvider || new FirebaseCloudProvider();
    this.imageSyncService = new ImageSyncService(userId, localDB);
    this.deviceId = getOrCreateDeviceId();

    // オンライン復帰時の自動同期
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        console.log("[Sync] Online detected. Triggering auto-sync.");
        this.synchronize().catch(console.error);
      });
    }
  }

  /**
   * 同期ロックを取得（分散ロック）
   */
  private async acquireSyncLock(): Promise<boolean> {
    console.log(
      `[Sync] acquireSyncLock: userId="${this.userId}", deviceId="${this.deviceId}"`,
    );

    if (!this.userId || !this.deviceId) {
      console.error("[Sync] Cannot acquire lock: Invalid userId or deviceId.");
      return false;
    }

    // Use multi-argument doc() for safer path construction
    const lockDoc = doc(firestoreDb, "sync_locks", this.userId);
    const now = Date.now();
    const lockDuration = 5 * 60 * 1000; // 5分

    let attempts = 0;
    const maxAttempts = 3;
    const baseDelay = 1000; // 1秒

    while (attempts < maxAttempts) {
      try {
        const snapshot = await getDoc(lockDoc);
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.deviceId !== this.deviceId && now < data.expiresAt) {
            console.warn(
              `[Sync] Lock held by another device: ${data.deviceId}. Attempt ${attempts + 1}/${maxAttempts}`,
            );
            attempts++;
            if (attempts < maxAttempts) {
              // 指数バックオフ + Adaptive Jitter
              // 試行回数に応じてベースのJitter幅も調整
              const backoff = baseDelay * Math.pow(2, attempts - 1);
              const adaptiveJitter =
                Math.random() * backoff * (1 + attempts * 0.1);
              const delay = backoff + adaptiveJitter;

              console.log(`[Sync] Retrying lock in ${Math.round(delay)}ms...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
            return false;
          }

          // 【正常遷移: Lock Expire → Forced Release】
          // 期限切れのロックは「ゴースト」として扱い、警告なしで上書き取得する
          if (data.deviceId !== this.deviceId && now >= data.expiresAt) {
            console.log(
              `[Sync] Expired lock found from device ${data.deviceId}. Performing forced release (Designated transition).`,
            );
          }
        }

        await setDoc(lockDoc, {
          deviceId: this.deviceId,
          acquiredAt: now,
          expiresAt: now + lockDuration,
        });
        return true;
      } catch (error) {
        console.error("[Sync] Failed to acquire lock:", error);
        attempts++;
        if (attempts < maxAttempts) {
          const delay = Math.floor(Math.random() * 4000) + 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        return false;
      }
    }
    return false;
  }

  private async releaseSyncLock(): Promise<void> {
    if (!this.userId) return;
    const lockDoc = doc(firestoreDb, "sync_locks", this.userId);
    try {
      const snapshot = await getDoc(lockDoc);
      if (snapshot.exists() && snapshot.data().deviceId === this.deviceId) {
        // ロックを削除（または期限切れにする）
        await setDoc(lockDoc, { expiresAt: 0 }, { merge: true });
      }
    } catch (error) {
      console.error("[Sync] Failed to release lock:", error);
    }
  }

  /**
   * 端末を同期から解除する
   */
  async removeDevice(deviceId: string): Promise<void> {
    const deviceMetaDoc = doc(
      firestoreDb,
      `sync_metadata/${this.userId}/devices/${deviceId}`,
    );
    await setDoc(deviceMetaDoc, { isActive: false }, { merge: true });
    console.log(`[Sync] Device ${deviceId} deactivated.`);
  }

  /**
   * 端末の表示名を更新する
   */
  async updateDeviceName(deviceId: string, newName: string): Promise<void> {
    const deviceMetaDoc = doc(
      firestoreDb,
      `sync_metadata/${this.userId}/devices/${deviceId}`,
    );
    await setDoc(deviceMetaDoc, { deviceName: newName }, { merge: true });
    console.log(`[Sync] Device ${deviceId} renamed to ${newName}.`);
  }

  private async checkDeviceLimit(): Promise<{ ok: boolean; count: number }> {
    const devicesRef = collection(
      firestoreDb,
      `sync_metadata/${this.userId}/devices`,
    );
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const q = query(
      devicesRef,
      where("isActive", "==", true),
      where("lastSyncTime", ">", Timestamp.fromDate(sixtyDaysAgo)),
    );
    const snapshot = await getDocs(q);
    return { ok: true, count: snapshot.size };
  }

  /**
   * 24時間以上活動がない非アクティブな端末を一括解除する
   */
  async cleanupInactiveDevices(): Promise<number> {
    const devicesRef = collection(
      firestoreDb,
      `sync_metadata/${this.userId}/devices`,
    );
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const q = query(
      devicesRef,
      where("isActive", "==", true),
      where("lastSyncTime", "<=", Timestamp.fromDate(sixtyDaysAgo)),
    );

    const snapshot = await getDocs(q);
    let count = 0;
    const batch = writeBatch(firestoreDb);

    snapshot.docs.forEach((deviceDoc) => {
      // 現在の端末は除外（念のため）
      if (deviceDoc.id !== this.deviceId) {
        batch.update(deviceDoc.ref, { isActive: false });
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
      await this.recordHistory(
        Date.now(),
        "success",
        0,
        0,
        `Automated Cleanup: Deactivated ${count} inactive devices.`,
      );
      console.log(
        `[Sync] Automated Cleanup: Deactivated ${count} inactive devices.`,
      );
    }
    return count;
  }

  // ========================================
  // 設定管理
  // ========================================

  /**
   * 同期設定を読み込み（なければデフォルト作成）
   */
  async loadSettings(): Promise<SyncSettings> {
    let settings = await this.localDB.getSyncSettings("default");
    if (!settings) {
      settings = { ...DEFAULT_SYNC_SETTINGS };
      await this.localDB.putSyncSettings(settings);
    }
    return settings;
  }

  /**
   * 同期設定を保存
   */
  async saveSettings(settings: SyncSettings): Promise<void> {
    await this.localDB.putSyncSettings(settings);
  }

  /**
   * Best-effort WiFi判定
   * Network Information APIが未対応の場合はtrue（同期許可）を返す
   */
  private isWifiConnection(): boolean {
    const conn = (navigator as unknown).connection;
    if (!conn || !conn.type) return true; // 判定不能 → 許可
    return conn.type === "wifi";
  }

  // ========================================
  // エラー管理
  // ========================================

  /**
   * エラーを記録（ライフサイクル管理）
   * 同一エラーIDが渡された場合は更新し、retryCountをインクリメント
   * 3回失敗でretryable=falseに変更
   */
  private async recordError(
    message: string,
    phase: "upload" | "download" | "merge",
    stack?: string,
    existingErrorId?: string,
  ): Promise<string> {
    if (existingErrorId) {
      const existing = await this.localDB.getSyncError(existingErrorId);
      if (existing) {
        existing.retryCount += 1;
        existing.occurredAt = Date.now();
        if (existing.retryCount >= 3) {
          existing.retryable = false;
        }
        await this.localDB.putSyncError(existing);
        return existing.id;
      }
    }

    const error: SyncError = {
      id: crypto.randomUUID(),
      occurredAt: Date.now(),
      phase,
      message,
      stack,
      retryCount: 0,
      retryable: true,
    };
    await this.localDB.putSyncError(error);
    return error.id;
  }

  /**
   * リトライ可能なエラーを取得
   */
  async getRetryableErrors(): Promise<SyncError[]> {
    return this.localDB.getRetryableSyncErrors();
  }

  /**
   * すべてのエラーをクリア
   */
  async clearAllErrors(): Promise<void> {
    await this.localDB.clearSyncErrors();
  }

  // ========================================
  // 履歴管理
  // ========================================

  /**
   * 同期履歴を記録
   */
  private async recordHistory(
    startedAt: number,
    result: "success" | "partial" | "failed" | "skipped_wifi",
    uploaded: number,
    downloaded: number,
    message?: string,
  ): Promise<void> {
    const history: SyncHistory & { message?: string } = {
      id: crypto.randomUUID(),
      startedAt,
      finishedAt: Date.now(),
      result,
      uploaded,
      downloaded,
      message,
    };
    await this.localDB.putSyncHistory(history);
  }

  /**
   * 同期履歴を取得（直近n件）
   */
  async getRecentHistory(limit: number = 30): Promise<SyncHistory[]> {
    return this.localDB.getRecentSyncHistory(limit);
  }

  // ========================================
  // オフラインキュー管理
  // ========================================

  /**
   * 変更をキューに追加（FIFO）
   * オフライン時またはpush失敗時に使用
   */
  async enqueueChange(
    entity: SyncEntity,
    operationType: SyncOperationType,
    payload: Card | Folder | AssetSyncPayload | SyncDeletePayload,
  ): Promise<void> {
    const targetId = hasStringId(payload) ? payload.id : null;
    if (!targetId) {
      throw new Error("Sync queue payload must include a string id");
    }

    await this.localDB.trimSyncQueueToLimit(999);

    const queueItem: SyncQueueItem = {
      id: crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
      targetId,
      entity,
      operationType,
      action: operationType,
      type: "upload",
      payload:
        operationType === "delete"
          ? { id: targetId }
          : this.assertQueuePayload(entity, payload),
      priority: "high",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: "pending",
      retryCount: 0,
    };
    await this.localDB.putSyncQueueItem(queueItem);
    console.log(
      `[Sync] Enqueued ${operationType} for ${entity}: ${queueItem.targetId}`,
    );
  }

  /**
   * キューの件数を取得
   */
  async getQueueCount(): Promise<number> {
    return this.localDB.getSyncQueueCount();
  }

  /**
   * キューを順次処理
   * 各アイテムごとにtry-catch、成功したら削除、失敗したらエラー記録してキュー保持
   */
  async processQueue(): Promise<{ processed: number; failed: number }> {
    let queue = await this.localDB.getQueuedItemsOldestFirst();
    let processed = 0;
    let failed = 0;

    // デバイスのストレージ状況に応じてキュー上限を動的に調整
    // (通常1000件、ストレージが逼迫している場合は500件に制限)
    let queueLimit = 1000;
    try {
      const storage = await navigator.storage.estimate();
      if (
        storage.usage &&
        storage.quota &&
        storage.usage / storage.quota > 0.8
      ) {
        queueLimit = 500;
        console.warn(
          `[Sync] Storage high usage detected (${Math.round((storage.usage / storage.quota) * 100)}%). Reducing queue limit to 500.`,
        );
      }
    } catch {
      /* ignore */
    }

    if (queue.length > queueLimit) {
      console.warn(
        `[Sync] Queue size ${queue.length} exceeds dynamic limit ${queueLimit}. Trimming oldest items.`,
      );
      await this.localDB.trimSyncQueueToLimit(queueLimit);
      queue = await this.localDB.getQueuedItemsOldestFirst();
    }

    for (const item of queue) {
      try {
        const errors = await this.localDB.findQueueProcessingErrorsByTargetId(
          item.targetId,
        );
        const totalAttempts = errors.reduce(
          (acc, e) => acc + e.retryCount + 1,
          0,
        );

        if (totalAttempts >= 3) {
          console.error(
            `[Sync] Skipping queue item ${item.targetId} after ${totalAttempts} failed attempts.`,
          );
          await this.localDB.removeSyncQueueItem(item.id);
          continue;
        }

        if (item.operationType === "delete") {
          await this.processDeleteQueueItem(item);
        } else {
          await this.processUpsertQueueItem(item);
        }

        await this.localDB.removeSyncQueueItem(item.id);
        processed++;
        console.log(
          `[Sync] Processed queue item: ${item.operationType} ${item.entity} ${item.targetId}`,
        );
      } catch (error: unknown) {
        const details = getErrorDetails(error);
        await this.recordError(
          `Queue processing failed: ${details.message} [target=${item.targetId}]`,
          "upload",
          details.stack,
        );
        failed++;
        console.error(`[Sync] Failed to process queue item:`, error);
      }
    }

    return { processed, failed };
  }

  private assertQueuePayload<TEntity extends SyncEntity>(
    entity: TEntity,
    payload: Card | Folder | AssetSyncPayload | SyncDeletePayload,
  ): SyncPayloadByEntity[TEntity] {
    if (entity === "card" && isCard(payload)) return payload;
    if (entity === "folder" && isFolder(payload)) return payload;
    if (entity === "asset" && isAssetSyncPayload(payload)) return payload;
    throw new Error(`Invalid payload for ${entity} queue item`);
  }

  private async processUpsertQueueItem(
    item: Extract<SyncQueueItem, { operationType: "create" | "update" }>,
  ): Promise<void> {
    switch (item.entity) {
      case "asset":
        await this.processAssetUpload(item.payload);
        return;
      case "card":
        await this.cloudProvider.upsertCard(item.payload);
        return;
      case "folder":
        await this.cloudProvider.upsertFolder(item.payload);
        return;
    }
  }

  private async processDeleteQueueItem(
    item: Extract<SyncQueueItem, { operationType: "delete" }>,
  ): Promise<void> {
    switch (item.entity) {
      case "asset":
        await this.localDB.updateImageRecord(item.targetId, {
          remoteStatus: "none",
          updatedAt: new Date(),
        });
        return;
      case "card":
        await this.cloudProvider.deleteCard(item.targetId, this.userId);
        return;
      case "folder":
        await this.cloudProvider.deleteFolder(item.targetId, this.userId);
        return;
    }
  }

  private async processAssetUpload(payload: AssetSyncPayload): Promise<void> {
    const assetId = payload.id;
    const localBlobId = payload.localBlobId ?? assetId;
    const remoteKey = payload.remoteKey ?? `users/${this.userId}/assets/${assetId}`;
    if (!localBlobId) {
      throw new Error("Asset queue payload is missing localBlobId");
    }

    const blob = await getImageBlob(localBlobId, { userId: this.userId });
    if (!blob) {
      await this.localDB.putImageRecord({
        id: assetId,
        userId: payload.userId ?? this.userId,
        mime: payload.mime ?? "application/octet-stream",
        size: payload.size ?? 0,
        localBlobId,
        localStatus: "missing",
        remoteKey,
        remoteStatus: "failed",
        updatedAt: new Date(),
        createdAt: payload.createdAt ?? new Date(),
      });
      throw new Error(`Asset blob missing: ${assetId}`);
    }

    const task = uploadBytesResumable(storageRef(storage, remoteKey), blob, {
      contentType: blob.type || payload.mime || "application/octet-stream",
    });
    await new Promise<void>((resolve, reject) => {
      task.on("state_changed", undefined, reject, () => resolve());
    });
    const remoteUrl = await getDownloadURL(task.snapshot.ref);
    const existingAsset = await this.localDB.getImageRecord(assetId);
    await this.localDB.putImageRecord({
      ...(existingAsset ?? {}),
      id: assetId,
      userId:
        payload.userId ??
        (isRecord(existingAsset) && typeof existingAsset.userId === "string"
          ? existingAsset.userId
          : this.userId),
      mime:
        blob.type ||
        payload.mime ||
        (isRecord(existingAsset) && typeof existingAsset.mime === "string"
          ? existingAsset.mime
          : "application/octet-stream"),
      size:
        blob.size ||
        payload.size ||
        (isRecord(existingAsset) && typeof existingAsset.size === "number"
          ? existingAsset.size
          : 0),
      localBlobId,
      localStatus: "present",
      remoteKey,
      remoteStatus: "ready",
      remoteUrlCache: remoteUrl,
      retryCount: 0,
      updatedAt: new Date(),
      createdAt:
        isRecord(existingAsset) && existingAsset.createdAt
          ? existingAsset.createdAt
          : payload.createdAt ?? new Date(),
    } as AssetRecord);
    if (import.meta.env.DEV) {
      console.info("[AssetSync] syncQueue upload success", {
        assetId,
        remoteKey,
      });
    }
  }

  // ========================================
  // 競合検出と解決
  // ========================================

  /**
   * クラウドのデータとローカルのデータをマージする（Field-level Merging）
   */
  private mergeEntity<T extends MergeableEntity>(
    local: T | undefined,
    remote: T,
    entityType: MergeableEntityType,
  ): T {
    if (!local) return remote;

    const localUpdated = toDate(local.updatedAt);
    const remoteUpdated = toDate(remote.updatedAt);

    if (remoteUpdated > localUpdated) {
      const merged: T = { ...local, ...remote };
      if (hasTextConflict(local, remote)) {
        merged.hasSyncConflict = true;
        merged.conflictDescription =
          "別の端末でも編集が行われていました。最新の内容を優先しましたが、競合がある可能性があります。";

        const conflictDetails =
          entityType === "card" && isCard(local) && isCard(remote)
            ? {
                front: { local: local.front, remote: remote.front },
                back: { local: local.back, remote: remote.back },
              }
            : entityType === "folder" && isFolder(local) && isFolder(remote)
              ? {
                  folderName: {
                    local: local.folderName,
                    remote: remote.folderName,
                  },
                }
              : {};

        this.saveConflict(remote.id, entityType, merged, conflictDetails).catch(
          (error) =>
            console.error(
              "[Sync] Failed to save detailed conflict:",
              sanitizeForLog(error),
            ),
        );
      }
      return merged;
    }

    if (localUpdated > remoteUpdated) {
      // ローカルが新しい場合はそのまま（次のpushで同期される）
      return local;
    }

    // 更新日時が同じ場合はマージ
    return { ...local, ...remote } as T;
  }

  /**
   * 2-way差分検出とフィールド単位自動マージ
   * base=local（ユーザーが最後に見た状態）
   */
  private diffFields(
    local: MergeableEntity,
    remote: MergeableEntity,
  ): DiffResult {
    const base = local; // 2-way merge
    const autoMerged = { ...base };
    const conflicts: Record<string, { local: unknown; remote: unknown }> = {};

    // 共通フィールドを比較
    const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)]);

    for (const key of allKeys) {
      // メタデータフィールドはスキップ
      if (
        ["id", "userId", "deviceId", "createdAt", "updatedAt"].includes(key)
      ) {
        continue;
      }

      const l = local[key];
      const r = remote[key];
      const b = base[key];

      // 値が同じ
      if (JSON.stringify(l) === JSON.stringify(r)) {
        autoMerged[key] = l;
      }
      // ローカル変更なし、リモート変更あり
      else if (JSON.stringify(l) === JSON.stringify(b)) {
        autoMerged[key] = r;
      }
      // リモート変更なし、ローカル変更あり
      else if (JSON.stringify(r) === JSON.stringify(b)) {
        autoMerged[key] = l;
      }
      // 両方変更 → 競合
      else {
        conflicts[key] = { local: l, remote: r };
      }
    }

    return { autoMerged, conflicts };
  }

  /**
   * 競合を保存（手動解決用）
   */
  private async saveConflict(
    entityId: string,
    entityType: MergeableEntityType,
    autoMerged: MergeableEntity,
    conflicts: Record<string, { local: unknown; remote: unknown }>,
  ): Promise<void> {
    const conflict: SyncConflict = {
      id: crypto.randomUUID(),
      entityId,
      entityType,
      autoMerged,
      conflicts,
      detectedAt: Date.now(),
    };
    await this.localDB.putConflict(conflict);
    console.log(`[Sync] Conflict detected for ${entityType} ${entityId}`);
  }

  /**
   * 未解決の競合を取得
   */
  async getUnresolvedConflicts(): Promise<SyncConflict[]> {
    return this.localDB.getConflicts();
  }

  /**
   * 競合を解決
   */
  async resolveConflict(
    conflictId: string,
    resolvedData: Card | Folder,
  ): Promise<void> {
    const conflict = await this.localDB.getConflict(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    // 解決済みデータをローカルDBに保存
    const table = conflict.entityType === "card" ? "cards" : "folders";
    await this.localDB.upsert(table, resolvedData);

    // 競合レコードを削除
    await this.localDB.removeConflict(conflictId);
    console.log(`[Sync] Conflict ${conflictId} resolved`);
  }

  // ========================================
  // 完全削除（PURGE）同期対応
  // ========================================

  /**
   * 完全削除を同期対応で実行
   * TRASHED → PURGED の状態遷移
   * ローカルDB から物理削除し、Firestore からも削除（オフライン時はキューに追加）
   *
   * @param entityType 'card' | 'folder'
   * @param id 削除するアイテムのID
   */
  async purgeWithSync(
    entityType: "card" | "folder",
    id: string,
  ): Promise<void> {
    const table = entityType === "card" ? "cards" : "folders";

    // ローカルDBから物理削除（ローカルファースト）
    await this.localDB.purge(table, id);
    console.log(`[Sync] Purged ${entityType} ${id} from local DB`);

    // Firestore から削除を試行
    try {
      if (entityType === "card") {
        await this.cloudProvider.deleteCard(id, this.userId);
      } else {
        await this.cloudProvider.deleteFolder(id, this.userId);
      }
      console.log(`[Sync] Purged ${entityType} ${id} from Firestore`);
    } catch (error: unknown) {
      const details = getErrorDetails(error);
      // Firestore 削除失敗時はキューに追加
      console.warn(
        `[Sync] Failed to purge ${entityType} ${id} from Firestore, queueing for later:`,
        details.message,
      );
      await this.enqueueChange(entityType, "delete", { id });
    }
  }

  /**
   * 複数アイテムを一括で完全削除（同期対応）
   *
   * @param items 削除するアイテムの配列 { type: 'card' | 'folder', id: string }
   */
  async bulkPurgeWithSync(
    items: Array<{ type: "card" | "folder"; id: string }>,
  ): Promise<{ succeeded: number; failed: number }> {
    let succeeded = 0;
    let failed = 0;

    for (const item of items) {
      try {
        await this.purgeWithSync(item.type, item.id);
        succeeded++;
      } catch (error) {
        console.error(`[Sync] Failed to purge ${item.type} ${item.id}:`, error);
        failed++;
      }
    }

    return { succeeded, failed };
  }

  /**
   * クラウドからの変更をプルし、ローカルDBに適用します。
   * @returns 同期が成功したかどうか
   */
  async pullChanges(onProgress?: (msg: string) => void): Promise<boolean> {
    const lastSyncTime = await this.localDB.getLastSyncTime(this.userId);
    console.log(
      `[Sync][Pull] Starting. since=${lastSyncTime?.toISOString() ?? "epoch"}`,
    );

    try {
      // 各コレクションから安全にデータを取得
      // 画像のアップロード（プッシュ前に行う）
      await this.imageSyncService.syncLocalImages(this.userId, onProgress);

      // 各コレクションから安全にデータを取得
      const serverChanges = await this.cloudProvider.fetchUpdatedDataSince(
        lastSyncTime || new Date(0),
        this.userId,
      );

      // 他のデータ（UserSettings, UserStats）も取得
      const userSettings = await this.fetchUpdatedDocsSafe(
        "userSettings",
        lastSyncTime,
      );
      const userStats = await this.fetchUserStats();

      // 取得したデータをローカルDBに一括で適用（マージロジック）
      await this.mergeAndUpsert("folders", serverChanges.folders);
      await this.mergeAndUpsert("cards", serverChanges.cards);
      await this.mergeAndUpsert("userSettings", userSettings);
      await this.mergeAndUpsert("userStats", userStats);

      // 最終同期時刻を更新
      await this.localDB.updateLastSyncTime(this.userId, new Date());
      console.log("[Sync][Pull] Completed successfully.");
      return true;
    } catch (error: unknown) {
      const details = getErrorDetails(error);
      console.error("[Sync][Pull] Failed:", sanitizeForLog(error));
      await this.recordError(details.message, "download", details.stack);
      return false;
    }
  }

  private async mergeAndUpsert<TTable extends SyncUpsertTable>(
    table: TTable,
    remoteItems: Array<SyncPayloadByTable[TTable]>,
  ): Promise<void> {
    if (table === "userSettings" || table === "userStats") {
      for (const item of remoteItems) {
        if (
          table === "userSettings" &&
          item.profileImage
        ) {
          item.profileImage = sanitizeProfileImage(item.profileImage).profileImage;
        }
        await this.localDB.upsert(table, item);
      }
      return;
    }

    const entityType: MergeableEntityType = table === "cards" ? "card" : "folder";
    for (const item of remoteItems) {
      const localItem = await this.localDB.getItem(table, item.id);
      const merged = this.mergeEntity(localItem, item, entityType);
      await this.localDB.upsert(table, merged);
    }
  }

  /**
   * 指定されたコレクションから、最終同期時刻以降に更新されたドキュメントを取得します（エラーハンドリング付き）。
   * @param collectionName 同期するコレクション名
   * @param lastSyncTime 最終同期時刻
   */
  private async fetchUpdatedDocsSafe<T>(
    collectionName: SyncableCollection,
    lastSyncTime: Date | null,
  ): Promise<T[]> {
    try {
      // 'users' と 'userSettings' は1ユーザー1ドキュメントなので、直接ドキュメントを取得
      if (collectionName === "users" || collectionName === "userSettings") {
        const docRef = doc(firestoreDb, collectionName, this.userId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          return [{ id: snapshot.id, ...snapshot.data() } as T];
        }
        return [];
      }

      // lastSyncTimeがない場合（初回同期など）、すべてのドキュメントを取得
      const collRef = collection(firestoreDb, collectionName);
      const q = lastSyncTime
        ? query(
            collRef,
            where("userId", "==", this.userId),
            where("updatedAt", ">", Timestamp.fromDate(lastSyncTime)),
          )
        : query(collRef, where("userId", "==", this.userId));

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as T);
    } catch (error: unknown) {
      // 権限不足の場合はログに出力して空配列を返す
      if (error?.code === "permission-denied") {
        console.warn(
          `[Sync] Permission denied for collection "${collectionName}". Skipping...`,
        );
        return [];
      }
      throw error;
    }
  }

  /**
   * 指定されたコレクションから、最終同期時刻以降に更新されたドキュメントを取得します。
   * @param collectionName 同期するコレクション名
   * @param lastSyncTime 最終同期時刻
   */
  private async fetchUpdatedDocs<T>(
    collectionName: SyncableCollection,
    lastSyncTime: Date | null,
  ): Promise<T[]> {
    // lastSyncTimeがない場合（初回同期など）、すべてのドキュメントを取得
    const collRef = collection(firestoreDb, collectionName);
    const q = lastSyncTime
      ? query(
          collRef,
          where("userId", "==", this.userId),
          where("updatedAt", ">", Timestamp.fromDate(lastSyncTime)),
        )
      : query(collRef, where("userId", "==", this.userId));

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as T);
  }

  /**
   * userStatsドキュメントを取得します。
   * userStatsは読み取り専用で、Cloud Functionsのみが書き込み可能です。
   */
  private async fetchUserStats(): Promise<UserStats[]> {
    try {
      const docRef = doc(firestoreDb, "userStats", this.userId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return [{ id: snapshot.id, ...snapshot.data() } as UserStats];
      }
      return [];
    } catch (error: unknown) {
      if (error?.code === "permission-denied") {
        console.warn("[Sync] Permission denied for userStats. Skipping...");
        return [];
      }
      console.warn("[Sync] Failed to fetch userStats:", error);
      return [];
    }
  }

  /**
   * ローカルでの変更を検出し、Firestoreにプッシュします。
   * 失敗時は自動的にオフラインキューへ追加します。
   * @param since この日時以降に更新されたアイテムを対象とします（指定しない場合はDBの最終同期日時）
   * @returns 同期が成功したかどうか
   */
  async pushChanges(since?: Date): Promise<boolean> {
    const dbLastSync = await this.localDB.getLastSyncTime(this.userId);
    // synchronize()から渡されたsince（pull前の時刻）を使用、なければDB値
    const lastSync = since || dbLastSync || new Date(0);

    console.log(`[Sync][Push] Starting. since=${lastSync.toISOString()}`);

    // 各テーブルからダーティなアイテムを取得
    const dirtyFolders = await this.localDB.getDirtyItems(
      "folders",
      this.userId,
      lastSync,
    );
    const dirtyCards = await this.localDB.getDirtyItems(
      "cards",
      this.userId,
      lastSync,
    );
    const dirtyUserSettings = await this.localDB.getDirtyItems(
      "userSettings",
      this.userId,
      lastSync,
    );
    const dirtyUserStats = await this.localDB.getDirtyItems(
      "userStats",
      this.userId,
      lastSync,
    );

    try {
      const totalDirty =
        dirtyFolders.length +
        dirtyCards.length +
        dirtyUserSettings.length +
        dirtyUserStats.length;
      if (totalDirty === 0) {
        console.log(
          "[Sync][Push] Skipped: no local dirty records.",
          sanitizeForLog({
            folders: dirtyFolders.length,
            cards: dirtyCards.length,
            userSettings: dirtyUserSettings.length,
            userStats: dirtyUserStats.length,
          }),
        );
        return true;
      }

      // 500アイテム制限を考慮してバッチを分ける
      const allItems = [
        ...dirtyFolders.map((f) => ({ collection: "folders", data: f })),
        ...dirtyCards.map((c) => ({ collection: "cards", data: c })),
        ...dirtyUserSettings.map((s) => ({
          collection: "userSettings",
          data: s,
        })),
        ...dirtyUserStats.map((s) => ({ collection: "userStats", data: s })),
      ];

      let pushedCount = 0;
      let skippedCount = 0;
      for (let i = 0; i < allItems.length; i += 500) {
        const chunk = allItems.slice(i, i + 500);
        const batch = writeBatch(firestoreDb);
        let operationCount = 0;

        // Optimistic Locking & Conflict Check
        for (const item of chunk) {
          const docRef = doc(firestoreDb, `${item.collection}/${item.data.id}`);

          // サーバー状態を確認（これはReadコストがかかるが、安全のため）
          // NOTE: バッチ書き込み前の個別チェックはコスト高だが、Integrity優先
          // 本番運用では "Blind Write with Precondition" が望ましいが、Types/Structure差異対策でReadしている
          let serverSnap;
          try {
            serverSnap = await getDoc(docRef);
          } catch {
            skippedCount += 1;
            console.warn(
              "[Sync][Push] Skipped item: failed to check server state.",
              sanitizeForLog({
                collection: item.collection,
                entityId: item.data.id,
              }),
            );
            continue;
          }

          if (serverSnap.exists()) {
            const serverData = serverSnap.data();
            const serverUpdated =
              serverData.updatedAt?.toDate?.() || new Date(0);
            // lastSync (Pull前の時刻) より後にサーバーが更新されていたら競合
            if (serverUpdated > lastSync) {
              skippedCount += 1;
              console.warn(
                "[Sync][Push] Skipped item: conflict (server newer than baseline).",
                sanitizeForLog({
                  collection: item.collection,
                  entityId: item.data.id,
                  serverUpdated: serverUpdated.toISOString(),
                  baseline: lastSync.toISOString(),
                }),
              );
              // ここで Push をスキップし、次の Pull で解決されるのを待つ
              // または、明示的に競合リストに入れる？
              // 現状はスキップ安全策をとる
              continue;
            }
          }

          // Firestore用に正規化/前処理
          const payload = { ...item.data };

          // userSettingsの画像サニタイズ (Blob URLを除去)
          if (item.collection === "userSettings" && payload.profileImage) {
            payload.profileImage = sanitizeProfileImage(
              payload.profileImage,
            ).profileImage;
          }

          // updatedAtをTimestampに変換
          if (payload.updatedAt instanceof Date) {
            payload.updatedAt = Timestamp.fromDate(payload.updatedAt);
          }
          if (payload.createdAt instanceof Date) {
            payload.createdAt = Timestamp.fromDate(payload.createdAt);
          }

          batch.set(docRef, payload, { merge: true });
          operationCount++;
        }

        if (operationCount > 0) {
          await batch.commit();
          pushedCount += operationCount;
        }
      }

      console.log(
        `[Sync][Push] Completed. dirty=${totalDirty}, pushed=${pushedCount}, skipped=${skippedCount}`,
      );
      return true;
    } catch (error: unknown) {
      const details = getErrorDetails(error);
      console.error("[Sync][Push] Failed:", sanitizeForLog(error));
      await this.recordError(details.message, "upload", details.stack);
      return false;
    }
  }

  /**
   * 初回ログイン時や新端末でのログイン時に、Firestoreから全データを取得してローカルDBを初期化します。
   */
  async performFullSync(): Promise<void> {
    const startedAt = Date.now();
    console.log("[Sync] Performing full sync from Firestore...");

    try {
      // Safety check: If local data exists, don't wipe it! Merge instead.
      const cardCount = await this.localDB.cards.count();
      const folderCount = await this.localDB.folders.count();

      if (cardCount > 0 || folderCount > 0) {
        console.log(
          "[Sync] Local data found. Skipping wipe and performing safe pull/merge.",
        );
      } else {
        console.log(
          "[Sync] Local DB is empty. Cleaning and preparing for full download...",
        );
        await this.localDB.clearAllData();
      }

      // Perform pull (lastSyncTime is null, so it gets everything from cloud)
      const success = await this.pullChanges();
      if (!success) {
        throw new Error(
          "Initial download failed. Please check your connection and try again.",
        );
      }

      // Migration Logic: Upload existing local data to cloud
      // Since lastSyncTime was just updated by pullChanges, we must explicitly sync from the beginning
      // to ensure all pre-existing local items are pushed.
      if (cardCount > 0 || folderCount > 0) {
        console.log("[Sync] Migrating local data to cloud...");
        const pushSuccess = await this.pushChanges(new Date(0));
        if (!pushSuccess) {
          console.warn(
            "[Sync] Initial push (migration) had some errors, but sync process will continue.",
          );
        }
      }

      console.log("[Sync] Full sync completed.");
      // 成功時に全エラーをクリア（以前のエラー状態をリセット）
      await this.clearAllErrors();
      await this.recordHistory(startedAt, "success", 0, 0);
    } catch (error: unknown) {
      const details = getErrorDetails(error);
      console.error("[Sync] Error during full sync:", error);
      await this.recordError(details.message, "download", details.stack);
      await this.recordHistory(startedAt, "failed", 0, 0);
      throw error; // Re-throw to notify caller (AuthContext)
    }
  }

  /**
   * プルとプッシュを順番に実行する標準的な同期プロセス。
   * 高度化機能を統合:
   * - WiFiチェック
   * - キュー処理優先
   * - 履歴記録
   * - エラー記録
   */
  async synchronize(onProgress?: (msg: string) => void): Promise<SyncResult> {
    const startedAt = Date.now();
    let uploaded = 0;
    const downloaded = 0;
    let conflictCount = 0;
    const errors: string[] = [];

    console.log("[Sync] Starting synchronization process...");

    // Phase 1: Sync Isolation
    // 同期中はキュー操作をブロックするためにフラグを立てる
    SyncService.isSyncing = true;

    if (!(await this.acquireSyncLock())) {
      SyncService.isSyncing = false; // Lock acquisition failed, release isolation
      return {
        success: false,
        uploaded: 0,
        downloaded: 0,
        conflicts: 0,
        errors: [
          "別の端末で同期が行われています。しばらく待ってから再試行してください。",
        ],
      };
    }

    try {
      // 設定読み込み
      const settings = await this.loadSettings();

      // 端末数の情報を取得（制限はしないが統計として保持）
      const deviceCountInfo = await this.checkDeviceLimit();
      console.log(`[Sync] Active devices: ${deviceCountInfo.count}`);

      // WiFiチェック
      if (settings.wifiOnly && !this.isWifiConnection()) {
        console.log("[Sync] Skipped: WiFi only mode enabled but not on WiFi");
        await this.recordHistory(startedAt, "skipped_wifi", 0, 0);
        return {
          success: false,
          uploaded: 0,
          downloaded: 0,
          conflicts: 0,
          errors: ["WiFi限定モードのためスキップ"],
        };
      }

      // キュー処理優先（オフライン中に溜まった変更をまず適用）
      console.log(
        "[Sync][PushQueue] Processing queued operations before pull/push.",
      );
      const queueResult = await this.processQueue();
      console.log("[Sync][PushQueue] Result", sanitizeForLog(queueResult));
      if (queueResult.failed > 0) {
        errors.push(`キュー処理失敗: ${queueResult.failed}件`);
      }
      uploaded += queueResult.processed;

      // 重要: Pull/Pushの基準となる時刻（前回同期時刻）を取得
      // Pullが成功するとDBのlastSyncTimeが更新されるため、Pushのために古い値を保持しておく必要がある
      const previousSyncTime = await this.localDB.getLastSyncTime(this.userId);

      // プル（サーバー → ローカル）
      onProgress?.("サーバーからデータを取得中...");
      let pullSuccess = false;
      try {
        pullSuccess = await this.pullChanges(onProgress);
      } catch (pullError: unknown) {
        const details = getErrorDetails(pullError);
        console.warn(
          "[Sync] Pull failed with fatal error. Checking for self-healing fallback...",
          details.message,
        );
        // 【正常遷移: Delta Sync 失敗 → Full Sync】
        // 差分同期が論理的に修復不能なエラー（409衝突や構造不整合など）の場合、フル同期を試みる
        if (
          details.message.includes("conflict") ||
          details.message.includes("version_mismatch") ||
          details.message.includes("failed to fetch")
        ) {
          console.log("[Sync] Triggering self-healing Full Sync fallback.");
          await this.performFullSync();
          pullSuccess = true; // フル同期成功後は成功扱いとする
        }
      }

      if (!pullSuccess) {
        errors.push("プル失敗");
      }

      // プッシュ（ローカル → サーバー）
      if (
        pullSuccess &&
        typeof navigator !== "undefined" &&
        !navigator.onLine
      ) {
        console.warn("[Sync][Push] Skipped after pull: browser is offline.");
      } else if (pullSuccess) {
        onProgress?.("ローカルの変更を送信中...");
        let pushSuccess = false;
        try {
          pushSuccess = await this.pushChanges(previousSyncTime || undefined);
        } catch (pushError: unknown) {
          const details = getErrorDetails(pushError);
          console.warn(
            "[Sync] Push failed with fatal error. Checking for fallback...",
            details.message,
          );
          // プッシュ失敗時も特定の条件下ではフル同期による整合性確保を試みる
          if (details.message.includes("conflict")) {
            console.log("[Sync] Triggering Full Sync due to push conflict.");
            await this.performFullSync();
            pushSuccess = true;
          }
        }

        if (!pushSuccess) {
          errors.push("プッシュ失敗");
        }
      } else {
        console.warn("[Sync][Push] Skipped because pull did not succeed.");
      }

      // 競合チェック
      const conflicts = await this.getUnresolvedConflicts();
      conflictCount = conflicts.length;

      // 結果判定
      const result = errors.length === 0 ? "success" : "partial";

      if (result === "success") {
        // 成功時に全エラーをクリア（以前のエラー状態をリセット）
        await this.clearAllErrors();

        // 端末の同期メタデータをFirestoreに記録
        const deviceMetaDoc = doc(
          firestoreDb,
          `sync_metadata/${this.userId}/devices/${this.deviceId}`,
        );

        // 既存のドキュメントを確認し、名前が未設定または「不明なデバイス」等の場合にのみデフォルト名を設定
        const existingDoc = await getDoc(deviceMetaDoc);
        const existingData = existingDoc.exists() ? existingDoc.data() : null;

        const metadata: Record<string, unknown> = {
          userId: this.userId,
          deviceId: this.deviceId,
          lastSyncTime: Timestamp.now(),
          lastSyncAttempt: Timestamp.now(),
          isActive: true,
        };

        // 名前がまだないか、以前の脆弱なロジックで取得された生UAっぽい名前の場合は上書き
        if (
          !existingData?.deviceName ||
          existingData.deviceName === "Unknown Device" ||
          existingData.deviceName.includes("AppleWebKit")
        ) {
          metadata.deviceName = getDeviceName();
        }

        await setDoc(deviceMetaDoc, metadata, { merge: true });

        // 同期成功時、設定が有効なら24時間以上活動がない端末を自動クリーンアップ
        if (settings.autoCleanupDevices) {
          this.cleanupInactiveDevices()
            .then((count) => {
              if (count > 0) {
                console.log(`[Sync] Auto-cleaned ${count} inactive devices.`);
              }
            })
            .catch((err) => console.error("[Sync] Auto-cleanup failed:", err));
        }
      }

      await this.recordHistory(startedAt, result, uploaded, downloaded);

      console.log(`[Sync] Synchronization finished. Result: ${result}`);
      return {
        success: errors.length === 0,
        uploaded,
        downloaded,
        conflicts: conflictCount,
        errors,
      };
    } catch (error: unknown) {
      const details = getErrorDetails(error);
      console.error("[Sync] Synchronization failed:", error);
      await this.recordError(details.message, "merge", details.stack);
      await this.recordHistory(startedAt, "failed", uploaded, downloaded);

      return {
        success: false,
        uploaded,
        downloaded,
        conflicts: conflictCount,
        errors: [...errors, details.message],
      };
    } finally {
      await this.releaseSyncLock();
      SyncService.isSyncing = false; // Release isolation
    }
  }

  /**
   * 同期統計を取得（過去7日間）
   */
  async getSyncStats(): Promise<{
    successRate: number;
    avgDuration: number;
    errorRate: number;
    totalSyncs: number;
  }> {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const { histories, errors } =
      await this.localDB.getSyncStatsSince(sevenDaysAgo);

    const totalSyncs = histories.length;
    const successCount = histories.filter((h) => h.result === "success").length;
    const successRate = totalSyncs > 0 ? (successCount / totalSyncs) * 100 : 0;

    const durations = histories.map((h) => h.finishedAt - h.startedAt);
    const avgDuration =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

    const errorRate = totalSyncs > 0 ? (errors.length / totalSyncs) * 100 : 0;

    return { successRate, avgDuration, errorRate, totalSyncs };
  }
}
