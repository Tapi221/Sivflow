import { contextService } from "./ContextService";
import { IndexedDBMetadataService } from "./IndexedDBMetadataService";
import {
  getLocalDb,
  getLocalDBRuntimeStatus,
  LOCALDB_RECOVERY_GUIDE_URL,
} from "./localDB";
// NOTE: 初期化時のユーザー向け INFO 通知は UI 上で邪魔になるため表示しない。
import { warnOncePerSession } from "./localDBRuntimeState";
import {
  notifyLocalDbFallbackMode,
  notifyRebuildLoopDetected,
  notifyStartupDegraded,
} from "./appInitStartupNotifier";
import { rebuildIndexedDb } from "./indexedDbRebuildCoordinator";
import { ensureLegacyCardsBackfilled } from "./legacyCardSetMigrationBackfill";

/**
 * アプリ起動時の初期化処理
 *
 * 実行順序（固定）:
 * 1. 認証確認
 * 2. IndexedDB 健全性チェック
 * 3. 必要なら再構築
 * 4. UI 描画許可
 */
export class AppInitializer {
  private static initialized = false;
  private static initPromise: Promise<{
    degraded: boolean;
    reason?: string;
    skippedFailures?: number;
  }> | null = null;
  private static notificationId: string | null = null;

  /**
   * アプリを初期化（起動時に一度だけ実行）
   *
   * @param userId ユーザーID
   */
  static async initialize(
    userId: string,
  ): Promise<{ degraded: boolean; reason?: string; skippedFailures?: number }> {
    // 二重実行防止
    if (this.initialized) return { degraded: false };
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize(userId);
    return await this.initPromise;
  }

  private static async doInitialize(
    userId: string,
  ): Promise<{ degraded: boolean; reason?: string; skippedFailures?: number }> {
    console.log(`[AppInit:${userId}] Starting initialization...`);
    let degraded = false;
    let degradedReason: string | undefined;
    let skippedFailures = 0;

    // 初期化中のインフォ通知は表示しない（UI を邪魔しないように）

    const db = await getLocalDb();
    const dbStatus = getLocalDBRuntimeStatus();
    if (dbStatus.mode === "fallback") {
      warnOncePerSession(
        "app-init:fallback-mode",
        `[AppInit:${userId}] LocalDB is running in fallback mode. Skipping IndexedDB health/rebuild phases.`,
      );

      notifyLocalDbFallbackMode({
        recoveryGuideUrl: LOCALDB_RECOVERY_GUIDE_URL,
      });

      this.initialized = true;
      return { degraded: false };
    }
    const metaService = new IndexedDBMetadataService(db, userId);

    // 🔥 Phase 1: 健全性チェック（前回のセッションの状態を確認）
    console.log(`[AppInit:${userId}] Phase1: Health check...`);
    const { healthy, reason } = await metaService.checkHealth();

    if (!healthy) {
      console.warn(
        `[AppInit:${userId}] Phase1: Health check FAILED - ${reason}`,
      );

      // エラーフラグを設定（次回は recovery コンテキスト）
      contextService.setErrorFlag(userId);

      // Phase 2: 再構築
      console.log(`[AppInit:${userId}] Phase2: Rebuilding...`);

      // 再構築回数をチェック
      const rebuildCount = await metaService.getRebuildCount();

      if (rebuildCount >= 3) {
        // ERROR レベルの通知（続行不可）
        notifyRebuildLoopDetected({ userId });
        throw new Error("Rebuild loop detected");
      }

      const rebuildResult = await rebuildIndexedDb(userId, reason);
      if (rebuildResult.degraded) {
        degraded = true;
        degradedReason = "rebuild_partial_failures";
        skippedFailures = rebuildResult.failures.length;
        notifyStartupDegraded();
        console.warn("[AppInit] startup_degraded=true", {
          userId,
          reason: degradedReason,
          skippedFailures,
        });
      }
      console.log(`[AppInit:${userId}] Phase2: Rebuild complete ✓`);
    } else {
      console.log(`[AppInit:${userId}] Phase1: Health check OK ✓`);
    }

    // 🔥 Phase 3: Snapshot 移行
    console.log(`[AppInit:${userId}] Phase3: Snapshot migration...`);
    try {
      const { snapshotService } = await import("./SnapshotService");
      await snapshotService.migrateFromLocalStorage(userId);
      console.log(`[AppInit:${userId}] Phase3: Snapshot migration complete ✓`);
    } catch (error) {
      console.error(
        `[AppInit:${userId}] Phase3: Snapshot migration FAILED (will retry next time)`,
        error,
      );
      // 移行失敗してもアプリは継続
    }

    // 🔥 Phase 4: CardSet 移行補完（cardSetId 未設定カードの救済）
    console.log(`[AppInit:${userId}] Phase4: CardSet migration backfill...`);
    try {
      await ensureLegacyCardsBackfilled(userId);
      console.log(
        `[AppInit:${userId}] Phase4: CardSet migration backfill complete ✓`,
      );
    } catch (error) {
      console.error(
        `[AppInit:${userId}] Phase4: CardSet migration backfill FAILED (will retry next time)`,
        error,
      );
      // 補完失敗してもアプリは継続
    }

    // 🔥 Phase 5: 履歴圧縮（バックグラウンド）
    console.log(`[AppInit:${userId}] Phase5: Scheduling compression...`);
    requestIdleCallback(() => {
      import("./HistoryCompressionService").then(
        ({ HistoryCompressionService }) => {
          console.log(
            `[AppInit:${userId}] Phase5: Compression started (background)`,
          );
          new HistoryCompressionService().compress(userId);
        },
      );
    });
    console.log(`[AppInit:${userId}] Phase5: Compression scheduled ✓`);

    // Phase 6: CLEAN マーク（再構築内で実行される）

    this.initialized = true;
    console.log(`[AppInit:${userId}] ✅ Initialization complete (all phases)`);
    return { degraded, reason: degradedReason, skippedFailures };

    // 初期化完了の通知は自動で消える（INFO レベル）
  }

  /**
   * IndexedDB を再構築
   */
  // NOTE: rebuild 実処理は src/services/indexedDbRebuildCoordinator.ts へ抽出

  /**
   * 初期化状態をリセット（テスト用）
   */
  static reset(): void {
    this.initialized = false;
    this.initPromise = null;
  }

  // NOTE: backfill 実処理は src/services/legacyCardSetMigrationBackfill.ts へ抽出
}
