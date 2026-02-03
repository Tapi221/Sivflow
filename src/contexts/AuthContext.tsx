import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import { type User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { initializeDB, localDb } from '../services/localDB';
import { SyncServiceFactory } from '../services/SyncServiceFactory';
import type { ISyncService } from '../services/interfaces/ISyncService';
import type { SyncSettings } from '../types/sync';
import type { SyncContextSource } from '../types/telemetry';

import type { SecurityState } from '../services/logic/SecurityMonitor';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  loading: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncTime: Date | null;
  triggerSync: () => Promise<void>;
  // 高度化機能
  syncService: ISyncService | null;
  queueCount: number;
  conflictCount: number;
  reloadSyncSettings: () => Promise<void>;
  securityState: SecurityState;
  dismissSecurityAlert: (alertId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  syncStatus: 'idle',
  lastSyncTime: null,
  triggerSync: async () => {},
  // 高度化機能
  syncService: null,
  queueCount: 0,
  conflictCount: 0,
  reloadSyncSettings: async () => {},
  securityState: { isLocked: false, requires2FA: false, alerts: [] },
  dismissSecurityAlert: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncService, setSyncService] = useState<ISyncService | null>(null);
  
  // 高度化機能: キュー件数と競合件数
  const [queueCount, setQueueCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);
  // セキュリティ状態
  const [securityState, setSecurityState] = useState<SecurityState>({ isLocked: false, requires2FA: false, alerts: [] });

  const dismissSecurityAlert = useCallback(async (alertId: string) => {
    if (!syncService) return;
    await syncService.dismissSecurityAlert(alertId);
  }, [syncService]);
  
  // 同期設定とインターバル管理用ref
  const syncIntervalRef = useRef<any | null>(null);
  const syncSettingsRef = useRef<SyncSettings | null>(null);

  /**
   * キュー件数と競合件数を更新
   */
  const updateCounts = useCallback(async () => {
    if (!syncService) return;
    try {
      const { pending: queue } = await syncService.getQueueStatus();
      const conflicts = await syncService.getUnresolvedConflicts();
      setQueueCount(queue);
      setConflictCount(conflicts.length);
    } catch (error) {
      console.error('[Auth] Failed to update counts:', error);
    }
  }, [syncService]);

  /**
   * 同期設定を再読み込みしてインターバルを再設定
   */
  const reloadSyncSettings = useCallback(async () => {
    // サービス側の個別ロードは廃止し、Factory経由で再取得
    if (!currentUser) return;

    try {
      const service = await SyncServiceFactory.getInstance(currentUser.uid);
      const settings = await service.loadSettings(); // Still need to load settings from the service
      syncSettingsRef.current = settings;

      // 既存のインターバルをクリア
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }

      // 自動同期が有効な場合、新しいインターバルを設定
      if (settings.autoSync && navigator.onLine) {
        const intervalMs = settings.intervalMinutes * 60 * 1000;
        console.log(`[Auth] Setting up auto-sync interval: ${settings.intervalMinutes} minutes`);
        
        syncIntervalRef.current = setInterval(async () => {
          if (navigator.onLine && syncStatus !== 'syncing') {
            console.log('[Auth] Running background sync...');
            await triggerSyncInternal('background'); // Pass 'background' for background sync
          }
        }, intervalMs);
      }
    } catch (error) {
      console.error('[Auth] Failed to reload sync settings:', error);
    }
  }, [currentUser, syncStatus]); // Added currentUser to dependencies

  /**
   * 内部同期トリガー（循環参照を避けるため分離）
   */
  const triggerSyncInternal = useCallback(async (source: SyncContextSource = 'user_initiated') => {
    if (!syncService || !currentUser) {
      console.warn('[Auth] Cannot sync: No sync service or user');
      return;
    }

    setSyncStatus('syncing');
    try {
      // 旧 UI 互換のため、戻り値がある synchronize() を使用
      const result = await syncService.synchronize();
      const currentLastSync = await localDb.getLastSyncTime(currentUser.uid);
      setLastSyncTime(currentLastSync);
      
      // 競合がある場合は'error'状態（ユーザーの注意を引くため）
      if (result.conflicts > 0) {
        setSyncStatus('error');
      } else if (result.success) {
        setSyncStatus('success');
      } else {
        setSyncStatus('error');
      }
      
      // カウントを更新
      await updateCounts();
      
      console.log('[Auth] Sync completed:', result);
    } catch (error) {
      console.error('[Auth] Sync failed:', error);
      setSyncStatus('error');
    }
    // No finally needed here because all paths set status, but for safety against future changes:
    // If we wanted to guarantee exit from 'syncing', we could check in finally.
    // However, the explicit sets above covers it. 
    // The user's issue might be in initialization.
  }, [syncService, currentUser, updateCounts]);

  // Manual sync trigger function
  const triggerSync = useCallback(async () => {
    await triggerSyncInternal('user_initiated');
  }, [triggerSyncInternal]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        try {
          // 1. Initialize user-specific DB
          initializeDB(user.uid);

          // 🔥 2. ブラウザストレージ健全性チェック（Phase 1-3）
          // - IndexedDB の健全性チェック
          // - 異常検知 → 即破棄 → 再構築
          // - UI 描画前に完了を保証
          const { AppInitializer } = await import('../services/AppInitializer');
          await AppInitializer.initialize(user.uid);

          // 3. 同期サービス初期化 (非同期)
          const service = await SyncServiceFactory.getInstance(user.uid);
          setSyncService(service);
          
          // 4. 履歴とエラーのクリーンアップ（起動時に1回）
          await localDb.cleanupSyncHistory();
          await localDb.cleanupSyncErrors();

          // [Auto-Fix] データ整合性の修復とオーナー権限の修正
          // エミュレータ⇄本番の切り替え時にデータの所有権を現ユーザーに統一し、同期対象にする
          console.log('[Auth] Running data integrity repair...');
          await localDb.repairDataIntegrity(user.uid);
          
          // 5. 同期設定を読み込み
          const settings = await service.loadSettings();
          syncSettingsRef.current = settings;
          
          const lastSync = await localDb.getLastSyncTime(user.uid);

          // 6. Decide sync strategy
          setSyncStatus('syncing');
          try {
            if (lastSync) {
              // Existing device, perform delta sync
              console.log('[Auth] Existing user detected. Performing delta sync.');
              // Note: synchronize() does not throw, it returns a result object.
              const result = await service.synchronize();
              // Status update handled below based on lastSyncTime presence
            } else {
              // New device or first login, perform full sync
              console.log('[Auth] New user or device detected. Performing full sync.');
              // Note: performFullSync() THROWS if it fails (e.g. download failure).
              await service.performFullSync();
            }
            
            // Initialization Success Path
            // Correctly fetch lastSyncTime from syncMetadata table
            const currentLastSync = await localDb.getLastSyncTime(user.uid);
            setLastSyncTime(currentLastSync);
            
            // 初回同期未実行の場合は 'idle'、実行済みの場合は 'success'
            // Explicitly set success if we have a timestamp, ensuring we exit 'syncing'
            setSyncStatus(currentLastSync ? 'success' : 'idle');
            
            // 7. カウントを更新
            const { pending: queue } = await service.getQueueStatus();
            const conflicts = await service.getUnresolvedConflicts();
            setQueueCount(queue);
            setConflictCount(conflicts.length);

          } catch (error) {
             // Initialization Failure Path (e.g. performFullSync threw error)
            console.error("[Auth] Synchronization failed during login:", error);
            
            // Strict Rule: If lastSyncTime is null (fresh install/user), do NOT set error state.
            // Remain 'idle' so UI shows "Not Executed".
            // If we had a lastSyncTime (previous success), then it's a regression/error.
            const existingLastSync = await localDb.getLastSyncTime(user.uid);
            // Strict logic: If we have a previous sync time, it's an error. If not, it's idle.
            setSyncStatus(existingLastSync ? 'error' : 'idle');
          }
        } catch (error) {
           // Outer catch for instantiation errors, handled same as sync failure
            console.error("[Auth] Fatal setup error:", error);
            setSyncStatus('error');
        } finally {
            setCurrentUser(user);
            setLoading(false);
        }
      } else {
        // User is logged out
        try {
          // 開発中のデータ消失を防ぐため、ログアウト時のデータ消去を無効化
          // await localDb.clearAllData();
          // console.log('[Auth] User logged out. Local data cleared.');
        } catch (error) {
          console.error("[Auth] Failed to clear local data on logout:", error);
        }
        setCurrentUser(null);
        setLoading(false);
        setSyncStatus('idle');
        setLastSyncTime(null);
        setSyncService(null);
        setQueueCount(0);
        setConflictCount(0);
        setSecurityState({ isLocked: false, requires2FA: false, alerts: [] });
        
        // インターバルをクリア
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
          syncIntervalRef.current = null;
        }
      }
    });

    return unsubscribe;
  }, []);

  // 設定駆動型バックグラウンド同期 & セキュリティ監視
  useEffect(() => {
    if (!syncService || !currentUser) return;

    // 初回設定読み込みとインターバル設定
    reloadSyncSettings();

    // セキュリティ監視開始
    const stopMonitoring = syncService.monitorSecurity((newState) => {
      console.log('[Auth] Security state updated:', newState);
      setSecurityState(newState);
      
      // ロックされた場合はログアウトさせる？
      // 仕様としては「ロック画面表示」なので、ここではステート更新に留める
      // ただし、もし強制ログアウト要件があればここに追加
    });

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      stopMonitoring();
    };
  }, [syncService, currentUser, reloadSyncSettings]);

  // Sync when coming back online (キュー処理優先)
  useEffect(() => {
    const handleOnline = async () => {
      if (syncService && currentUser && syncStatus !== 'syncing') {
        console.log('[Auth] Network reconnected. Processing queue and syncing...');
        
        // キュー処理を先に実行
        const queueResult = await syncService.processQueue();
        console.log(`[Auth] Queue processed: ${queueResult.processed} items`);
        
        // その後、通常の同期
        await triggerSync();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncService, currentUser, syncStatus, triggerSync]);

  // 定期的にカウントを更新（5秒ごと）
  useEffect(() => {
    if (!syncService) return;

    const interval = setInterval(updateCounts, 5000);
    return () => clearInterval(interval);
  }, [syncService, updateCounts]);

  const value = {
    currentUser,
    loading,
    syncStatus,
    lastSyncTime,
    triggerSync,
    // 高度化機能
    syncService,
    queueCount,
    conflictCount,
    reloadSyncSettings,
    securityState,
    dismissSecurityAlert
  };

  // Debug logging
  console.log({
    syncStatus,
    lastSyncTime,
    lastSyncError: null, // access not straightforward here, assuming handled by syncService internally
    totalSyncCount: 0, // transient, actual count in syncService. getSyncStats needed to verify
    queueCount,
    conflictCount
  });

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}
