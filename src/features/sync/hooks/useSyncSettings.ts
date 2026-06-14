import { useCallback, useEffect, useState } from "react";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { getLocalDb } from "@/services/localdb";
import { SyncServiceFactory } from "@/services/SyncServiceFactory";
import type { SyncSettings } from "@/types";
import { DEFAULT_SYNC_SETTINGS } from "@/types";



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
const useSyncSettings = () => {
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
      const db = await getLocalDb(currentUser.uid);
      const savedSettings = await db.getSyncSettings(DEFAULT_SYNC_SETTINGS.id);
      setSettings(normalizeSyncSettings(savedSettings));
    } catch (error) {
      console.error("[useSyncSettings] Failed to load settings:", error);
      setSettings(DEFAULT_SYNC_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const updateSettings = useCallback(
    async (updates: Partial<SyncSettings>) => {
      if (!currentUser) return;

      const nextSettings = normalizeSyncSettings({ ...settings, ...updates });
      setSettings(nextSettings);

      const db = await getLocalDb(currentUser.uid);
      await db.putSyncSettings(nextSettings);
      SyncServiceFactory.resetInstance(currentUser.uid);
    },
    [currentUser, settings],
  );

  return { settings, loading, updateSettings, reloadSettings: loadSettings };
};



export { useSyncSettings };
