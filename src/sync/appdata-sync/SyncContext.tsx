import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import type { ISyncService, UserSettingsSnapshot } from "@/services/interfaces/ISyncService";
import { getLocalDb } from "@/services/localDB";
import { SyncServiceFactory } from "@/services/SyncServiceFactory";
import { DEFAULT_SYNC_SETTINGS, type SyncConflict, type SyncSettings } from "@/types/domain/sync";
import { SyncContext, type SyncContextType, type SyncNotice, type SyncProviderProps, type SyncStatus } from "./SyncContextCore";

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

export const SyncProvider = ({ children }: SyncProviderProps) => {
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
      console.error("[Sync] Failed to update counts:", error);
    }
  }, [userId]);

  const configureAutoSync = useCallback((service: ISyncService, settings: SyncSettings) => {
    clearSyncInterval();

    if (!settings.autoSync || !navigator.onLine) return;

    const intervalMs = settings.intervalMinutes * 60 * 1000;
    console.log(`[Sync] Setting up auto-sync interval: ${settings.intervalMinutes} minutes`);

    syncIntervalRef.current = setInterval(async () => {
      if (!navigator.onLine || syncStatusRef.current === "syncing" || !userId) return;

      try {
        console.log("[Sync] Running background sync...");
        await service.synchronize();
        const db = await getLocalDb(userId);
        const currentLastSync = await db.getLastSyncTime(userId);
        setLastSyncTime(currentLastSync);
        await updateCounts(service);
      } catch (error) {
        console.error("[Sync] Background sync failed:", error);
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
      console.error("[Sync] Failed to reload sync settings:", error);
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
      console.error("[Sync] Failed to update last sync time:", error);
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
      console.error("[Sync] Failed to initialize sync service:", error);
      setSyncNotice("offline");
    }
  }, [clearSyncInterval, reloadSyncSettings, updateCounts, updateLastSyncTime, userId]);

  useEffect(() => {
    void initializeSyncService();

    return () => {
      clearSyncInterval();
    };
  }, [clearSyncInterval, initializeSyncService]);

  const syncNow = useCallback(async () => {
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
      console.error("[Sync] Manual sync failed:", error);
      setSyncNotice("error");
    } finally {
      setSyncStatus("idle");
    }
  }, [updateCounts, updateLastSyncTime, userId]);

  const resolveConflict = useCallback(async (conflict: SyncConflict, resolvedData: unknown) => {
    if (!userId) return;

    try {
      const db = await getLocalDb(userId);
      const resolvedRecord = buildResolvedConflictRecord(conflict, resolvedData);
      await db.saveResolvedConflict(conflict, resolvedRecord);
      await updateCounts();
    } catch (error) {
      console.error("[Sync] Failed to resolve conflict:", error);
    }
  }, [updateCounts, userId]);

  const value = useMemo<SyncContextType>(
    () => ({
      syncStatus,
      syncNotice,
      lastSyncTime,
      queueCount,
      conflictCount,
      syncNow,
      reloadSyncSettings,
      resolveConflict,
    }),
    [conflictCount, lastSyncTime, queueCount, reloadSyncSettings, resolveConflict, syncNow, syncNotice, syncStatus],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};