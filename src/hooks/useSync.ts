import { useEffect, useRef, useState } from 'react';
import { SyncServiceFactory } from '../services/SyncServiceFactory';
import { useAuth } from '../contexts/AuthContext';
import { useSyncSettings } from './useSyncSettings';
import type { ISyncService } from '../services/interfaces/ISyncService';

export const useSync = () => {
  const { currentUser } = useAuth();
  const { settings } = useSyncSettings();
  const [syncProgress, setSyncProgress] = useState<string>('');
  const syncServiceRef = useRef<ISyncService | null>(null);

  useEffect(() => {
    if (currentUser) {
      const initService = async () => {
        syncServiceRef.current = await SyncServiceFactory.getInstance(currentUser.uid);
        
        if (settings.autoSync) {
          try {
            await syncServiceRef.current?.synchronize(setSyncProgress);
          } catch (err) {
            console.error('[useSync] Auto sync failed:', err);
          } finally {
            setSyncProgress('');
          }
        }
      };

      initService();

      // 定期同期
      let interval: any = null;
      if (settings.autoSync && settings.intervalMinutes > 0) {
        interval = setInterval(async () => {
          if (!syncServiceRef.current) {
            syncServiceRef.current = await SyncServiceFactory.getInstance(currentUser.uid);
          }
          try {
            await syncServiceRef.current?.synchronize(setSyncProgress);
          } catch (err) {
            console.error('[useSync] Scheduled sync failed:', err);
          } finally {
            setSyncProgress('');
          }
        }, settings.intervalMinutes * 60 * 1000);
      }

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [currentUser, settings.autoSync, settings.intervalMinutes]);

  const forceSync = async () => {
    if (syncServiceRef.current) {
      setSyncProgress('同期を開始しています...');
      try {
        return await syncServiceRef.current.synchronize(setSyncProgress);
      } finally {
        setSyncProgress('');
      }
    }
    return { success: false, errors: ['Sync service not initialized'] };
  };

  return { forceSync, syncProgress };
};
