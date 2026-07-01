import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import type { ISyncService, UserSettingsSnapshot } from "@/services/interfaces/ISyncService";
import { getLocalDb } from "@/services/localdb";
import type { SyncableEntityTable } from "@/services/localdb/types";
import { SyncServiceFactory } from "@/services/SyncServiceFactory";
import type { SyncContextType, SyncNotice, SyncProviderProps, SyncStatus } from "./SyncContextCore";
import { SyncContext } from "./SyncContextCore";
import type { SyncConflict, SyncEntity, SyncSettings } from "@/types/domain/sync";
import { DEFAULT_SYNC_SETTINGS } from "@/types/domain/sync";



type ConflictResolvingLocalDb = Awaited<ReturnType<typeof getLocalDb>> & {
  conflicts: {
    delete: (key: unknown) => Promise<void>;
  };
};



const SYNC_TABLE_BY_ENTITY: Record<SyncEntity, SyncableEntityTable> = {
  card: "cards",
  folder: "folders",
  cardSet: "cardSets",
  document: "documents",
  tag: "tagRecords",
  userSetting: "userSettings",
  asset: "images",
  projectMap: "projectMaps",
};



const isSyncIntervalMinutes = (value: unknown): value is SyncSettings["intervalMinutes"] => {
  return value === 5 || value === 15 || value === 30 || value === 60;
};
const normalizeSyncSettings = (snapshot: UserSettingsSnapshot): SyncSettings => {
  const data = snapshot.data;
  return {
    id: typeof data.id === "string" ? data.id : DEFAULT_SYNC_SETTINGS.id,
    autoSync: typeof data.autoSync === "boolean" ? data.autoSync : DEFAULT_SYNC_SETTINGS.autoSync,
    intervalMinutes: isSyncIntervalMinutes(data.intervalMinutes) ? data.intervalMinutes : DEFAULT_SYNC_SETTINGS.intervalMinutes,
    wifiOnly: typeof data.wifiOnly === "boolean" ? data.wifiOnly : DEFAULT_SYNC_SETTINGS.wifiOnly,
    autoCleanupDevices: typeof data.autoCleanupDevices === "boolean" ? data.autoCleanupDevices : DEFAULT_SYNC_SETTINGS.autoCleanupDevices,
  };
};
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === "object";
};
const buildResolvedConflictRecord = (conflict: SyncConflict, resolvedData: unknown): Record<string, unknown> => {
  const base = isRecord(resolvedData) ? resolvedData : conflict.autoMerged;
  return {
    ...(isRecord(base) ? base : {}),
    id: conflict.entityId,
  };
};



const SyncProvider = ({ children }: SyncProviderProps) => {
  const { currentUser } = useAuthSession();
  const userId = currentUser?.uid ?? null;
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncNotice, setSyncNotice] = useState<SyncNotice>("none");
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncSettingsRef = useRef<SyncSettings | null>(null);
  const syncStatusRef = useRef<SyncStatus>("idle");
  const syncServiceRef = useRef<ISyncService | null>(null);

  useEffect(() => {
    syncStatusRef.current = syncStatus;
  }, [syncStatus]);

  const clearSyncInterval = useCallback(() => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  }, []);

  const updateCounts = useCallback(async (service?: ISyncService | null) => {
    const activeService = service ?? syncServiceRef.current;
    if (!activeService) return;

    try {
      const { pending: queue } = await activeService.getQueueStatus();
      const db = await getLocalDb(userId ?? undefined);
      const conflicts = await db.getConflicts();
      setQueueCount(queue);
      setConflictCount(conflicts.length);
    } catch (error) {
      console.error("[同期] 件数の更新に失敗しました:", error);
    }
  }, [userId]);

  const configureAutoSync = useCallback((service: ISyncService, settings: SyncSettings) => {
    clearSyncInterval();

    if (!settings.autoSync || !navigator.onLine) return;

    const intervalMs = settings.intervalMinutes * 60 * 1000;
    console.log(`[同期] 自動同期間隔を設定しました: ${settings.intervalMinutes} 分`);

    syncIntervalRef.current = setInterval(async () => {
      if (!navigator.onLine || syncStatusRef.current === "syncing" || !userId) return;

      try {
        console.log("[同期] バックグラウンド同期を実行しています...");
        await service.synchronize();
        const db = await getLocalDb(userId);
        const currentLastSync = await db.getLastSyncTime(userId);
        setLastSyncTime(currentLastSync);
        await updateCounts(service);
      } catch (error) {
        console.error("[同期] バックグラウンド同期に失敗しました:", error);
      }
    }, intervalMs);
  }, [clearSyncInterval, updateCounts, userId]);

  const reloadSyncSettings = useCallback(async () => {
    if (!userId) return;

    try {
      const service = syncServiceRef.current ?? await SyncServiceFactory.getInstance(userId);
      syncServiceRef.current = service;

      const settings = normalizeSyncSettings(await service.loadSettings());
      syncSettingsRef.current = settings;
      configureAutoSync(service, settings);
    } catch (error) {
      console.error("[同期] 同期設定の再読み込みに失敗しました:", error);
    }
  }, [configureAutoSync, userId]);

  const updateLastSyncTime = useCallback(async () => {
    if (!userId) {
      setLastSyncTime(null);
      return;
    }

    try {
      const db = await getLocalDb(userId);
      const currentLastSync = await db.getLastSyncTime(userId);
      setLastSyncTime(currentLastSync);
    } catch (error) {
      console.error("[同期] 最終同期時刻の更新に失敗しました:", error);
    }
  }, [userId]);

  const initializeSyncService = useCallback(async () => {
    clearSyncInterval();
    syncServiceRef.current = null;
    syncSettingsRef.current = null;
    setQueueCount(0);
    setConflictCount(0);

    if (!userId) {
      setSyncStatus("idle");
      setLastSyncTime(null);
      setSyncNotice("none");
      return;
    }

    try {
      const service = await SyncServiceFactory.getInstance(userId);
      syncServiceRef.current = service;

      await updateLastSyncTime();
      await updateCounts(service);
      await reloadSyncSettings();
    } catch (error) {
      console.error("[同期] 同期サービスの初期化に失敗しました:", error);
      setSyncNotice("offline");
    }
  }, [clearSyncInterval, reloadSyncSettings, updateCounts, updateLastSyncTime, userId]);

  useEffect(() => {
    void initializeSyncService();

    return () => {
      clearSyncInterval();
    };
  }, [clearSyncInterval, initializeSyncService]);

  const triggerSync = useCallback(async () => {
    if (!userId) return;

    const service = syncServiceRef.current ?? await SyncServiceFactory.getInstance(userId);
    syncServiceRef.current = service;

    setSyncStatus("syncing");
    setSyncNotice("none");

    try {
      const result = await service.synchronize();
      if (!result.success) {
        setSyncNotice("error");
      }
      await updateLastSyncTime();
      await updateCounts(service);
    } catch (error) {
      console.error("[同期] 手動同期に失敗しました:", error);
      setSyncNotice("error");
    } finally {
      setSyncStatus("idle");
    }
  }, [updateCounts, updateLastSyncTime, userId]);

  const getUnresolvedConflicts = useCallback(async () => {
    if (!userId) return [];

    try {
      const db = await getLocalDb(userId);
      return await db.getConflicts();
    } catch (error) {
      console.error("[同期] 競合の読み込みに失敗しました:", error);
      return [];
    }
  }, [userId]);

  const resolveConflict = useCallback(async (conflictId: string, resolvedData: unknown) => {
    if (!userId) return;

    try {
      const db = await getLocalDb(userId);
      const conflicts = await db.getConflicts();
      const conflict = conflicts.find((item) => item.id === conflictId);
      if (!conflict) return;

      const tableName = SYNC_TABLE_BY_ENTITY[conflict.entityType];
      const resolvedRecord = buildResolvedConflictRecord(conflict, resolvedData);
      await db.upsert(tableName, resolvedRecord as never);
      await (db as ConflictResolvingLocalDb).conflicts.delete(conflict.id);
      await updateCounts();
    } catch (error) {
      console.error("[同期] 競合の解決に失敗しました:", error);
    }
  }, [updateCounts, userId]);

  const clearSyncErrors = useCallback(async () => {
    if (!userId) return;

    try {
      const db = await getLocalDb(userId);
      await db.clearSyncErrors();
    } catch (error) {
      console.error("[同期] 同期エラーのクリアに失敗しました:", error);
    }
  }, [userId]);

  const value = useMemo<SyncContextType>(
    () => ({
      syncStatus,
      syncNotice,
      lastSyncTime,
      queueCount,
      conflictCount,
      triggerSync,
      reloadSyncSettings,
      getUnresolvedConflicts,
      resolveConflict,
      clearSyncErrors,
    }),
    [clearSyncErrors, conflictCount, getUnresolvedConflicts, lastSyncTime, queueCount, reloadSyncSettings, resolveConflict, syncNotice, syncStatus, triggerSync],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};



export { SyncProvider };
