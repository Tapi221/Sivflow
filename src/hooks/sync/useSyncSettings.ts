import { useState, useEffect, useCallback } from "react";
import { SyncServiceFactory } from "@/services/SyncServiceFactory";
import { getLocalDb } from "@/services/localDB";
import type { SyncSettings } from "@/types";
import { DEFAULT_SYNC_SETTINGS } from "@/types";
import { useAuthSession } from "@/contexts/AuthContext";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeSyncSettings = (value: unknown): SyncSettings => {
  if (!isRecord(value)) {
    return DEFAULT_SYNC_SETTINGS;
  }

  const candidate = value as Partial<SyncSettings>;
  const normalizedId =
    typeof candidate.id === "string" && candidate.id.trim().length > 0
      ? candidate.id
      : DEFAULT_SYNC_SETTINGS.id;

  return {
    ...DEFAULT_SYNC_SETTINGS,
    ...candidate,
    id: normalizedId,
  };
};

export const useSyncSettings = () => {
  const { currentUser } = useAuthSession();
  const [settings, setSettings] = useState<SyncSettings>(DEFAULT_SYNC_SETTINGS);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    if (!currentUser) {
      setSettings(DEFAULT_SYNC_SETTINGS);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const syncService = await SyncServiceFactory.getInstance(currentUser.uid);
      const snapshot = await syncService.loadSettings();
      setSettings(normalizeSyncSettings(snapshot.data));
    } catch (error) {
      console.error("[useSyncSettings] Failed to load settings:", error);
      setSettings(DEFAULT_SYNC_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const updateSettings = useCallback(
    async (newSettings: Partial<SyncSettings>) => {
      if (!currentUser) return;

      try {
        const db = await getLocalDb(currentUser.uid);
        const updated = normalizeSyncSettings({
          ...settings,
          ...newSettings,
        });

        await db.putSyncSettings(updated);
        setSettings(updated);
      } catch (error) {
        console.error("[useSyncSettings] Failed to update settings:", error);
      }
    },
    [currentUser, settings],
  );

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  return { settings, updateSettings, loading, refresh: loadSettings };
};
