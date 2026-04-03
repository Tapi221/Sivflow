import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getLocalDb } from "@/services/localDB";
import { SyncServiceFactory } from "@/services/SyncServiceFactory";
import { useAuthSession } from "@/contexts/auth/AuthSessionContext";
import type { ISyncService } from "@/services/interfaces/ISyncService";
import type { SyncSettings } from "@/types/domain/sync";
import type { SyncConflict } from "@/types";

type SyncStatus = "idle" | "syncing" | "success" | "error";
type SyncNotice = "none" | "wifi_wait";

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

type LegacySyncService = ISyncService & {
  getUnresolvedConflicts(): Promise<SyncConflict[]>;
  resolveConflict(conflictId: string, resolvedData: unknown): Promise<void>;
  clearAllErrors(): Promise<void>;
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

// eslint-disable-next-line react-refresh/only-export-components
export function useSyncContext() {
  return useContext(SyncContext);
}

interface SyncProviderProps {
  children: ReactNode;
}

export function SyncProvider({ children }: SyncProviderProps) {
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
  const syncServiceRef = useRef<LegacySyncService | null>(null);

  useEffect(() => {
    syncStatusRef.current = syncStatus;
  }, [syncStatus]);

  const clearSyncInterval = useCallback(() => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  }, []);

  const updateCounts = useCallback(async (service?: LegacySyncService | null) => {
    const activeService = service ?? syncServiceRef.current;
    if (!activeService) return;

    try {
      const { pending: queue } = await activeService.getQueueStatus();
      const conflicts = await activeService.getUnresolvedConflicts();
      setQueueCount(queue);
      setConflictCount(conflicts.length);
    } catch (error) {
      console.error("[Sync] Failed to update counts:", error);
    }
  }, []);

  const configureAutoSync = useCallback(
    (service: LegacySyncService, settings: SyncSettings) => {
      clearSyncInterval();

      if (!settings.autoSync || !navigator.onLine) {
        return;
      }

      const intervalMs = settings.intervalMinutes * 60 * 1000;
      console.log(
        `[Sync] Setting up auto-sync interval: ${settings.intervalMinutes} minutes`,
      );

      syncIntervalRef.current = setInterval(async () => {
        if (!navigator.onLine || syncStatusRef.current === "syncing" || !userId) {
          return;
        }

        try {
          console.log("[Sync] Running background sync...");
          await service.synchronize();
          const db = await getLocalDb();
          const currentLastSync = await db.getLastSyncTime(userId);
          setLastSyncTime(currentLastSync);
          await updateCounts(service);
        } catch (error) {
          console.error("[Sync] Background sync failed:", error);
        }
      }, intervalMs);
    },
    [clearSyncInterval, updateCounts, userId],
  );

  const reloadSyncSettings = useCallback(async () => {
    if (!userId) return;

    try {
      const service =
        syncServiceRef.current ??
        ((await SyncServiceFactory.getInstance(userId)) as LegacySyncService);
      syncServiceRef.current = service;

      const settings = await service.loadSettings();
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
      const db = await getLocalDb();
      const currentLastSync = await db.getLastSyncTime(userId);
      setLastSyncTime(currentLastSync);

      const skippedByPolicy = result.errors.some((message) =>
        message.includes("WiFi限定モードのためスキップ"),
      );
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
    if (!syncServiceRef.current) {
      return [];
    }

    return syncServiceRef.current.getUnresolvedConflicts();
  }, []);

  const resolveConflict = useCallback(
    async (conflictId: string, resolvedData: unknown) => {
      if (!syncServiceRef.current) {
        return;
      }

      await syncServiceRef.current.resolveConflict(conflictId, resolvedData);
      await updateCounts(syncServiceRef.current);
    },
    [updateCounts],
  );

  const clearSyncErrors = useCallback(async () => {
    if (!syncServiceRef.current) {
      return;
    }

    await syncServiceRef.current.clearAllErrors();
  }, []);

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
        const service = (await SyncServiceFactory.getInstance(
          userId,
        )) as LegacySyncService;
        if (disposed) return;

        syncServiceRef.current = service;

        const settings = await service.loadSettings();
        if (disposed) return;
        syncSettingsRef.current = settings;

        const db = await getLocalDb();
        const lastSync = await db.getLastSyncTime(userId);

        setSyncStatus("syncing");
        setSyncNotice("none");

        try {
          let skippedByPolicy = false;
          if (lastSync) {
            console.log("[Sync] Existing user detected. Performing delta sync.");
            const result = await service.synchronize();
            skippedByPolicy = result.errors.some((message) =>
              message.includes("WiFi限定モードのためスキップ"),
            );
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
          if (!skippedByPolicy) {
            setSyncNotice("none");
          }

          await updateCounts(service);
        } catch (error) {
          console.error("[Sync] Synchronization failed during login:", error);
          const existingLastSync = await db.getLastSyncTime(userId);
          if (disposed) return;

          setLastSyncTime(existingLastSync);
          setSyncStatus(existingLastSync ? "error" : "idle");
          setSyncNotice("none");
        }

        if (!disposed) {
          configureAutoSync(service, settings);
        }
      } catch (error) {
        if (disposed) return;
        console.error("[Sync] Fatal setup error:", error);
        setSyncNotice("none");
        setSyncStatus("error");
      }
    };

    initializeSync();

    return () => {
      disposed = true;
      clearSyncInterval();
    };
  }, [clearSyncInterval, configureAutoSync, updateCounts, userId]);

  useEffect(() => {
    const handleOnline = async () => {
      if (!userId || syncStatusRef.current === "syncing" || !syncServiceRef.current) {
        return;
      }

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

  const value = useMemo<SyncContextType>(
    () => ({
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
    }),
    [
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
    ],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
