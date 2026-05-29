import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuthSession } from "@/contexts/auth/AuthSessionContext";
import type { ISyncService, UserSettingsSnapshot } from "@/services/interfaces/ISyncService";
import { getLocalDb } from "@/services/localDB";
import { SyncServiceFactory } from "@/services/SyncServiceFactory";
import { DEFAULT_SYNC_SETTINGS, type SyncConflict, type SyncEntity, type SyncSettings } from "@/types/domain/sync";


type SyncStatus = "idle" | "syncing" | "success" | "error";
type SyncNotice = "none" | "wifi_wait";
type SyncTableName = "cards" | "folders" | "cardSets" | "documents" | "tagRecords" | "userSettings" | "images";

interface SyncContextType {
  syncStatus: SyncStatus;
  syncNotice: SyncNotice;
  lastSyncTime: Date | null;
  queueCount: number;
  conflictCount: number;
  triggerSync: () => Promise<void>;
  reloadSyncSettings: () => Promise<void>;
  getUnresolvedConflicts: () => Promise<SyncConflict[]>;
  resolveConflict: (conflictId: string, resolvedData: unknown) => Promise<void>;
  clearSyncErrors: () => Promise<void>;
}

interface SyncProviderProps {
  children: ReactNode;
}

const SYNC_TABLE_BY_ENTITY: Record<SyncEntity, SyncTableName> = {
  card: "cards",
  folder: "folders",
  cardSet: "cardSets",
  document: "documents",
  tag: "tagRecords",
  userSetting: "userSettings",
  asset: "images",
};

const defaultSyncContext: SyncContextType = {
  syncStatus: "idle",
  syncNotice: "none",
  lastSyncTime: null,
  queueCount: 0,
  conflictCount: 0,
  triggerSync: async () => {},
  reloadSyncSettings: async () => {},
  getUnresolvedConflicts: async () => [],
  resolveConflict: async () => {},
  clearSyncErrors: async () => {},
};

const SyncContext = createContext<SyncContextType>(defaultSyncContext);

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

export const useSyncContext = () => {
  return useContext(SyncContext);
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

  const triggerSync = useCallback(async () => {
    if (!userId || !syncServiceRef.current) {
      console.warn("[Sync] Cannot sync: No sync service or user");
      return;
    }

    setSyncStatus("syncing");
    setSyncNotice("none");

    try {
      const result = await syncServiceRef.current.synchronize();
      const db = await getLocalDb(userId);
      const currentLastSync = await db.getLastSyncTime(userId);
      setLastSyncTime(currentLastSync);

      const skippedByPolicy = result.errors.some((message) => message.includes("WiFi限定モードのためスキップ"));
      if (skippedByPolicy) {
        setSyncStatus(currentLastSync ? "success" : "idle");
        setSyncNotice("wifi_wait");
        await updateCounts(syncServiceRef.current);
        console.log("[Sync] Sync skipped by policy:", result);
        return;
      }

      setSyncNotice("none");
      if (result.conflicts > 0) {
        setSyncStatus("error");
      } else if (result.success) {
        setSyncStatus("success");
      } else {
        setSyncStatus("error");
      }

      await updateCounts(syncServiceRef.current);
      console.log("[Sync] Sync completed:", result);
    } catch (error) {
      console.error("[Sync] Sync failed:", error);
      setSyncNotice("none");
      setSyncStatus("error");
    }
  }, [updateCounts, userId]);

  const getUnresolvedConflicts = useCallback(async () => {
    const db = await getLocalDb(userId ?? undefined);
    return db.getConflicts();
  }, [userId]);

  const resolveConflict = useCallback(async (conflictId: string, resolvedData: unknown) => {
    const db = await getLocalDb(userId ?? undefined);
    const conflict = await db.getConflict(conflictId);
    if (!conflict) return;

    const tableName = SYNC_TABLE_BY_ENTITY[conflict.entityType];
    await db.upsert(tableName, buildResolvedConflictRecord(conflict, resolvedData) as never, true);
    await db.removeConflict(conflictId);
    await updateCounts(syncServiceRef.current);
  }, [updateCounts, userId]);

  const clearSyncErrors = useCallback(async () => {
    const db = await getLocalDb(userId ?? undefined);
    await db.clearSyncErrors();
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      clearSyncInterval();
      syncSettingsRef.current = null;
      syncServiceRef.current = null;
      return;
    }

    let disposed = false;

    const initializeSync = async () => {
      try {
        const service = await SyncServiceFactory.getInstance(userId);
        if (disposed) return;

        syncServiceRef.current = service;

        const settings = normalizeSyncSettings(await service.loadSettings());
        if (disposed) return;
        syncSettingsRef.current = settings;

        const db = await getLocalDb(userId);
        const lastSync = await db.getLastSyncTime(userId);

        setSyncStatus("syncing");
        setSyncNotice("none");

        try {
          let skippedByPolicy = false;
          if (lastSync) {
            console.log("[Sync] Existing user detected. Performing delta sync.");
            const result = await service.synchronize();
            skippedByPolicy = result.errors.some((message) => message.includes("WiFi限定モードのためスキップ"));
            if (skippedByPolicy) {
              console.log("[Sync] Initial sync skipped by policy:", result);
              setSyncNotice("wifi_wait");
            }
          } else {
            console.log("[Sync] New user or device detected. Performing full sync.");
            await service.performFullSync();
          }

          const currentLastSync = await db.getLastSyncTime(userId);
          if (disposed) return;

          setLastSyncTime(currentLastSync);
          setSyncStatus(currentLastSync ? "success" : "idle");
          if (!skippedByPolicy) setSyncNotice("none");

          await updateCounts(service);
        } catch (error) {
          console.error("[Sync] Synchronization failed during login:", error);
          const existingLastSync = await db.getLastSyncTime(userId);
          if (disposed) return;

          setLastSyncTime(existingLastSync);
          setSyncStatus(existingLastSync ? "error" : "idle");
          setSyncNotice("none");
        }

        if (!disposed) configureAutoSync(service, settings);
      } catch (error) {
        if (disposed) return;
        console.error("[Sync] Fatal setup error:", error);
        setSyncNotice("none");
        setSyncStatus("error");
      }
    };

    void initializeSync();

    return () => {
      disposed = true;
      clearSyncInterval();
    };
  }, [clearSyncInterval, configureAutoSync, updateCounts, userId]);

  useEffect(() => {
    const handleOnline = async () => {
      if (!userId || syncStatusRef.current === "syncing" || !syncServiceRef.current) return;

      console.log("[Sync] Network reconnected. Processing queue and syncing...");

      const queueResult = await syncServiceRef.current.processQueue();
      console.log(`[Sync] Queue processed: ${queueResult.processed} items`);
      await triggerSync();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [triggerSync, userId]);

  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      void updateCounts();
    }, 5000);
    return () => clearInterval(interval);
  }, [updateCounts, userId]);

  const resolvedSyncStatus = userId ? syncStatus : "idle";
  const resolvedSyncNotice = userId ? syncNotice : "none";
  const resolvedLastSyncTime = userId ? lastSyncTime : null;
  const resolvedQueueCount = userId ? queueCount : 0;
  const resolvedConflictCount = userId ? conflictCount : 0;

  const value = useMemo<SyncContextType>(() => ({
    syncStatus: resolvedSyncStatus,
    syncNotice: resolvedSyncNotice,
    lastSyncTime: resolvedLastSyncTime,
    queueCount: resolvedQueueCount,
    conflictCount: resolvedConflictCount,
    triggerSync,
    reloadSyncSettings,
    getUnresolvedConflicts,
    resolveConflict,
    clearSyncErrors,
  }), [
    clearSyncErrors,
    getUnresolvedConflicts,
    reloadSyncSettings,
    resolvedConflictCount,
    resolvedLastSyncTime,
    resolvedQueueCount,
    resolvedSyncNotice,
    resolvedSyncStatus,
    resolveConflict,
    triggerSync,
  ]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};
