import { useEffect, useRef, useState } from "react";
import { SyncServiceFactory } from "@/services/SyncServiceFactory";
import { useAuth } from "@/contexts/AuthContext";
import type { ISyncService } from "@/services/interfaces/ISyncService";

export const useSync = () => {
  const { currentUser } = useAuth();
  const [syncProgress, setSyncProgress] = useState<string>("");
  const syncServiceRef = useRef<ISyncService | null>(null);

  useEffect(() => {
    if (!currentUser) {
      syncServiceRef.current = null;
      return;
    }

    const initService = async () => {
      syncServiceRef.current = await SyncServiceFactory.getInstance(
        currentUser.uid,
      );
    };
    initService();
  }, [currentUser]);

  const forceSync = async () => {
    if (syncServiceRef.current) {
      setSyncProgress("同期を開始しています...");
      try {
        return await syncServiceRef.current.synchronize(setSyncProgress);
      } finally {
        setSyncProgress("");
      }
    }
    return { success: false, errors: ["Sync service not initialized"] };
  };

  return { forceSync, syncProgress };
};




