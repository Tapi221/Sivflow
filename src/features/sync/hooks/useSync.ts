import { useEffect, useRef, useState } from "react";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import type { ISyncService } from "@/services/interfaces/ISyncService";
import { SyncServiceFactory } from "@/services/SyncServiceFactory";



const useSync = () => {
  const { currentUser } = useAuthSession();
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



export { useSync };
