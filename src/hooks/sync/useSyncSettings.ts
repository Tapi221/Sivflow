import { useState, useEffect, useCallback } from "react";
import { SyncServiceFactory } from "@/services/SyncServiceFactory";
import type { SyncSettings } from "@/types";
import { DEFAULT_SYNC_SETTINGS } from "@/types";
import { useAuthSession } from "@/contexts/AuthContext";

export const useSyncSettings = () => {
  const { currentUser } = useAuthSession();
  const [settings, setSettings] = useState<SyncSettings>(DEFAULT_SYNC_SETTINGS);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const syncService = await SyncServiceFactory.getInstance(currentUser.uid);
      const s = await syncService.loadSettings();
      setSettings(s || DEFAULT_SYNC_SETTINGS);
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
        const syncService = await SyncServiceFactory.getInstance(
          currentUser.uid,
        );
        const updated = { ...settings, ...newSettings };
        await syncService.saveSettings(updated);
        setSettings(updated);
      } catch (error) {
        console.error("[useSyncSettings] Failed to update settings:", error);
      }
    },
    [currentUser, settings],
  );

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return { settings, updateSettings, loading, refresh: loadSettings };
};






