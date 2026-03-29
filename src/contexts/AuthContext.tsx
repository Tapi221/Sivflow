/* eslint-disable react-refresh/only-export-components -- context hook/provider are intentionally co-located exports. */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { type User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/services/firebase";
import {
  getLocalDb,
  initializeDB,
  resetLocalDBForLogout,
} from "@/services/localDB";
import { SyncServiceFactory } from "@/services/SyncServiceFactory";
import type { ISyncService } from "@/services/interfaces/ISyncService";
import type { SyncSettings } from "@/types/domain/sync";

import type { SecurityState } from "@/services/logic/SecurityMonitor";

interface AuthContextType {
  currentUser: FirebaseUser | null;
  loading: boolean;
  syncStatus: "idle" | "syncing" | "success" | "error";
  syncNotice: "none" | "wifi_wait";
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

interface AuthSessionContextType {
  currentUser: FirebaseUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  syncStatus: "idle",
  syncNotice: "none",
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

const AuthSessionContext = createContext<AuthSessionContextType>({
  currentUser: null,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthSession() {
  return useContext(AuthSessionContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle");
  const [syncNotice, setSyncNotice] = useState<"none" | "wifi_wait">("none");
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncService, setSyncService] = useState<ISyncService | null>(null);

  // 高度化機能: キュー件数と競合件数
  const [queueCount, setQueueCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);
  // セキュリティ状態
  const [securityState, setSecurityState] = useState<SecurityState>({
    isLocked: false,
    requires2FA: false,
    alerts: [],
  });
  const lastKnownUserIdRef = useRef<string | null>(null);

  const dismissSecurityAlert = useCallback(
    async (alertId: string) => {
      if (!syncService) return;
      await syncService.dismissSecurityAlert(alertId);
    },
    [syncService],
  );

  // 同期設定とインターバル管理用ref
  const syncIntervalRef = useRef<unknown | null>(null);
  const syncSettingsRef = useRef<SyncSettings | null>(null);
  const syncStatusRef = useRef(syncStatus);

  useEffect(() => {
    syncStatusRef.current = syncStatus;
  }, [syncStatus]);

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
      console.error("[Auth] Failed to update counts:", error);
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
        console.log(
          `[Auth] Setting up auto-sync interval: ${settings.intervalMinutes} minutes`,
        );

        syncIntervalRef.current = setInterval(async () => {
          if (navigator.onLine && syncStatusRef.current !== "syncing") {
            console.log("[Auth] Running background sync...");
            await service.synchronize();
            await updateCounts();
          }
        }, intervalMs);
      }
    } catch (error) {
      console.error("[Auth] Failed to reload sync settings:", error);
    }
  }, [currentUser, updateCounts]);

  /**
   * 内部同期トリガー（循環参照を避けるため分離）
   */
  const triggerSyncInternal = useCallback(async () => {
      if (!syncService || !currentUser) {
        console.warn("[Auth] Cannot sync: No sync service or user");
        return;
      }

      setSyncStatus("syncing");
      setSyncNotice("none");
      try {
        // 旧 UI 互換のため、戻り値がある synchronize() を使用
        const result = await syncService.synchronize();
        const db = await getLocalDb();
        const currentLastSync = await db.getLastSyncTime(currentUser.uid);
        setLastSyncTime(currentLastSync);

        // WiFi限定モード等で「同期スキップ」の場合はエラー扱いしない
        const skippedByPolicy = result.errors.some((message) =>
          message.includes("WiFi限定モードのためスキップ"),
        );
        if (skippedByPolicy) {
          setSyncStatus(currentLastSync ? "success" : "idle");
          setSyncNotice("wifi_wait");
          await updateCounts();
          console.log("[Auth] Sync skipped by policy:", result);
          return;
        }
        setSyncNotice("none");

        // 競合がある場合は'error'状態（ユーザーの注意を引くため）
        if (result.conflicts > 0) {
          setSyncStatus("error");
        } else if (result.success) {
          setSyncStatus("success");
        } else {
          setSyncStatus("error");
        }

        // カウントを更新
        await updateCounts();

        console.log("[Auth] Sync completed:", result);
      } catch (error) {
        console.error("[Auth] Sync failed:", error);
        setSyncNotice("none");
        setSyncStatus("error");
      }
      // No finally needed here because all paths set status, but for safety against future changes:
      // If we wanted to guarantee exit from 'syncing', we could check in finally.
      // However, the explicit sets above covers it.
      // The user's issue might be in initialization.
  }, [syncService, currentUser, updateCounts]);

  // Manual sync trigger function
  const triggerSync = useCallback(async () => {
    await triggerSyncInternal();
  }, [triggerSyncInternal]);

  useEffect(() => {
    let isInitialCall = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // ⚠ 初回以外は setLoading(true) を呼ばない。
      // 以前は毎回 setLoading(true) を呼んでいたため、BrowserRouter が
      // 破棄→再構築され、ルーティング状態が失われていた。
      // 初回のみ loading=true を維持し（初期値が true）、
      // 2回目以降（トークンリフレッシュ等）は loading を変えずに
      // バックグラウンドで処理する。
      if (isInitialCall) {
        isInitialCall = false;
        // loading は初期値 true のまま — 明示的に setLoading(true) する必要なし
      }
      // NOTE: 初回以外は loading を true にしない（UI フリーズ防止）
      if (user) {
        lastKnownUserIdRef.current = user.uid;
        try {
          // 1. Initialize user-specific DB
          await initializeDB(user.uid);

          // 🔥 2. ブラウザストレージ健全性チェック（Phase 1-3）
          // - IndexedDB の健全性チェック
          // - 異常検知 → 即破棄 → 再構築
          // - UI 描画前に完了を保証
          const { AppInitializer } = await import("@/services/AppInitializer");
          const initResult = await AppInitializer.initialize(user.uid);
          if (initResult?.degraded) {
            console.warn("[Auth] startup_degraded=true", {
              userId: user.uid,
              reason: initResult.reason,
              skippedFailures: initResult.skippedFailures ?? 0,
            });
          }

          // 3. 同期サービス初期化 (非同期)
          const service = await SyncServiceFactory.getInstance(user.uid);
          setSyncService(service);

          // 4. 履歴とエラーのクリーンアップ（起動時に1回）
          const db = await getLocalDb();
          await db.cleanupSyncHistory();
          await db.cleanupSyncErrors();

          // [Auto-Fix] データ整合性の修復とオーナー権限の修正
          // エミュレータ⇄本番の切り替え時にデータの所有権を現ユーザーに統一し、同期対象にする
          console.log("[Auth] Running data integrity repair...");
          await db.repairDataIntegrity(user.uid);

          // 5. 同期設定を読み込み
          const settings = await service.loadSettings();
          syncSettingsRef.current = settings;

          const lastSync = await db.getLastSyncTime(user.uid);

          // 6. Decide sync strategy
          setSyncStatus("syncing");
          setSyncNotice("none");
          try {
            let skippedByPolicy = false;
            if (lastSync) {
              // Existing device, perform delta sync
              console.log(
                "[Auth] Existing user detected. Performing delta sync.",
              );
              // Note: synchronize() does not throw, it returns a result object.
              const result = await service.synchronize();
              skippedByPolicy = result.errors.some((message) =>
                message.includes("WiFi限定モードのためスキップ"),
              );
              if (skippedByPolicy) {
                console.log("[Auth] Initial sync skipped by policy:", result);
                setSyncNotice("wifi_wait");
              }
              // Status update handled below based on lastSyncTime presence
            } else {
              // New device or first login, perform full sync
              console.log(
                "[Auth] New user or device detected. Performing full sync.",
              );
              // Note: performFullSync() THROWS if it fails (e.g. download failure).
              await service.performFullSync();
            }

            // Initialization Success Path
            // Correctly fetch lastSyncTime from syncMetadata table
            const currentLastSync = await db.getLastSyncTime(user.uid);
            setLastSyncTime(currentLastSync);

            // 初回同期未実行の場合は 'idle'、実行済みの場合は 'success'
            // Explicitly set success if we have a timestamp, ensuring we exit 'syncing'
            setSyncStatus(currentLastSync ? "success" : "idle");
            if (!skippedByPolicy) {
              setSyncNotice("none");
            }

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
            const existingLastSync = await db.getLastSyncTime(user.uid);
            // Strict logic: If we have a previous sync time, it's an error. If not, it's idle.
            setSyncStatus(existingLastSync ? "error" : "idle");
            setSyncNotice("none");
          }
        } catch (error) {
          // Outer catch for instantiation errors, handled same as sync failure
          console.error("[Auth] Fatal setup error:", error);
          setSyncNotice("none");
          setSyncStatus("error");
        } finally {
          setCurrentUser(user);
          setLoading(false);
        }
      } else {
        // User is logged out
        const previousUserId = lastKnownUserIdRef.current || undefined;
        try {
          // ログアウト時のDBリセットは best-effort
          await resetLocalDBForLogout(previousUserId);
          await initializeDB("anonymous");
        } catch (error) {
          console.warn("[Auth] Logout DB reset failed (non-fatal):", error);
        }
        SyncServiceFactory.resetInstance(previousUserId);
        lastKnownUserIdRef.current = null;
        setCurrentUser(null);
        setLoading(false);
        setSyncStatus("idle");
        setSyncNotice("none");
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
      console.log("[Auth] Security state updated:", newState);
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
      if (
        syncService &&
        currentUser &&
        syncStatusRef.current !== "syncing"
      ) {
        console.log(
          "[Auth] Network reconnected. Processing queue and syncing...",
        );

        // キュー処理を先に実行
        const queueResult = await syncService.processQueue();
        console.log(`[Auth] Queue processed: ${queueResult.processed} items`);

        // その後、通常の同期
        await triggerSync();
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [syncService, currentUser, triggerSync]);

  // 定期的にカウントを更新（5秒ごと）
  useEffect(() => {
    if (!syncService) return;

    const interval = setInterval(updateCounts, 5000);
    return () => clearInterval(interval);
  }, [syncService, updateCounts]);

  const sessionValue = useMemo<AuthSessionContextType>(
    () => ({
      currentUser,
      loading,
    }),
    [currentUser, loading],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      currentUser,
      loading,
      syncStatus,
      syncNotice,
      lastSyncTime,
      triggerSync,
      // 高度化機能
      syncService,
      queueCount,
      conflictCount,
      reloadSyncSettings,
      securityState,
      dismissSecurityAlert,
    }),
    [
      currentUser,
      loading,
      syncStatus,
      syncNotice,
      lastSyncTime,
      triggerSync,
      syncService,
      queueCount,
      conflictCount,
      reloadSyncSettings,
      securityState,
      dismissSecurityAlert,
    ],
  );

  // Debug logging
  if (import.meta.env.DEV) {
    console.log({
      syncStatus,
      syncNotice,
      lastSyncTime,
      lastSyncError: null, // access not straightforward here, assuming handled by syncService internally
      totalSyncCount: 0, // transient, actual count in syncService. getSyncStats needed to verify
      queueCount,
      conflictCount,
    });
  }

  // ⚠ 以前は {!loading && children} で children を条件レンダリングしていたが、
  // これにより BrowserRouter が loading 遷移のたびに破棄→再構築され、
  // React Router のルーティング状態が失われてリダイレクトが発生していた。
  // loading 状態のハンドリングは ProtectedRoute / AppContent に委譲する。
  return (
    <AuthSessionContext.Provider value={sessionValue}>
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    </AuthSessionContext.Provider>
  );
}




