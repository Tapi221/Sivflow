import { notifyLocalDbFallbackMode, notifyRebuildLoopDetected, notifyStartupDegraded } from "./appInitStartupNotifier";
import { contextService } from "./ContextService";
import { IndexedDBMetadataService } from "./IndexedDBMetadataService";
import { rebuildIndexedDb } from "./indexedDbRebuildCoordinator";
import { ensureLegacyCardsBackfilled } from "./legacyCardSetMigrationBackfill";
import { getLocalDb, getLocalDBRuntimeStatus, LOCALDB_RECOVERY_GUIDE_URL } from "@/services/localdb";
import { warnOncePerSession } from "./localDBRuntimeState";



// NOTE: 初期化時のユーザー向け INFO 通知は UI 上で邪魔になるため表示しない。

/**
 * アプリ起動時の初期化処理
 *
 * 実行順序（固定）:
 * 1. 認証確認
 * 2. IndexedDB 健全性チェック
 * 3. 必要なら再構築
 * 4. UI 描画許可
 */
class AppInitializer {
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
  ): Promise<{ degraded: boolean; reason?: string; skippedFailures?: number; }> {
    // 二重実行防止
    if (this.initialized) return { degraded: false };
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize(userId);
    return await this.initPromise;
  }

  private static async doInitialize(
    userId: string,
  ): Promise<{ degraded: boolean; reason?: string; skippedFailures?: number; }> {
    console.log(`[アプリ初期化:${userId}] 初期化を開始しています...`);
    let degraded = false;
    let degradedReason: string | undefined;
    let skippedFailures = 0;

    // 初期化中のインフォ通知は表示しない（UI を邪魔しないように）

    const db = await getLocalDb();
    const dbStatus = getLocalDBRuntimeStatus();
    if (dbStatus.mode === "fallback") {
      warnOncePerSession(
        "app-init:fallback-mode",
        `[アプリ初期化:${userId}] LocalDB はフォールバックモードで動作中です。IndexedDB の健全性チェックと再構築をスキップします。`,
      );

      notifyLocalDbFallbackMode({
        recoveryGuideUrl: LOCALDB_RECOVERY_GUIDE_URL,
      });

      this.initialized = true;
      return { degraded: false };
    }
    const metaService = new IndexedDBMetadataService(db, userId);

    // Phase 1: 健全性チェック（前回のセッションの状態を確認）
    console.log(`[アプリ初期化:${userId}] フェーズ1: 健全性チェックを実行中...`);
    const { healthy, reason } = await metaService.checkHealth();

    if (!healthy) {
      console.warn(
        `[アプリ初期化:${userId}] フェーズ1: 健全性チェックに失敗しました - ${reason}`,
      );

      // エラーフラグを設定（次回は recovery コンテキスト）
      contextService.setErrorFlag(userId);

      // Phase 2: 再構築
      console.log(`[アプリ初期化:${userId}] フェーズ2: 再構築を実行中...`);

      // 再構築回数をチェック
      const rebuildCount = await metaService.getRebuildCount();

      if (rebuildCount >= 3) {
        // ERROR レベルの通知（続行不可）
        notifyRebuildLoopDetected({ userId });
        throw new Error("再構築ループを検出しました");
      }

      const rebuildResult = await rebuildIndexedDb(userId, reason);
      if (rebuildResult.degraded) {
        degraded = true;
        degradedReason = "rebuild_partial_failures";
        skippedFailures = rebuildResult.failures.length;
        notifyStartupDegraded();
        console.warn("[アプリ初期化] 起動が一部制限された状態です", {
          userId,
          reason: degradedReason,
          skippedFailures,
        });
      }
      console.log(`[アプリ初期化:${userId}] フェーズ2: 再構築が完了しました`);
    } else {
      console.log(`[アプリ初期化:${userId}] フェーズ1: 健全性チェックは正常です`);
    }

    // Phase 3: Snapshot 移行
    console.log(`[アプリ初期化:${userId}] フェーズ3: スナップショット移行を実行中...`);
    try {
      const { snapshotService } = await import("./SnapshotService");
      await snapshotService.migrateFromLocalStorage(userId);
      console.log(`[アプリ初期化:${userId}] フェーズ3: スナップショット移行が完了しました`);
    } catch (error) {
      console.error(
        `[アプリ初期化:${userId}] フェーズ3: スナップショット移行に失敗しました（次回起動時に再試行します）`,
        error,
      );
      // 移行失敗してもアプリは継続
    }

    // Phase 4: CardSet 移行補完（cardSetId 未設定カードの救済）
    console.log(`[アプリ初期化:${userId}] フェーズ4: カードセット移行補完を実行中...`);
    try {
      await ensureLegacyCardsBackfilled(userId);
      console.log(
        `[アプリ初期化:${userId}] フェーズ4: カードセット移行補完が完了しました`,
      );
    } catch (error) {
      console.error(
        `[アプリ初期化:${userId}] フェーズ4: カードセット移行補完に失敗しました（次回起動時に再試行します）`,
        error,
      );
      // 補完失敗してもアプリは継続
    }

    // Phase 5: 履歴圧縮（バックグラウンド）
    console.log(`[アプリ初期化:${userId}] フェーズ5: 履歴圧縮を予約中...`);
    requestIdleCallback(() => {
      import("./HistoryCompressionService").then(
        ({ HistoryCompressionService }) => {
          console.log(
            `[アプリ初期化:${userId}] フェーズ5: 履歴圧縮を開始しました（バックグラウンド）`,
          );
          new HistoryCompressionService().compress(userId);
        },
      );
    });
    console.log(`[アプリ初期化:${userId}] フェーズ5: 履歴圧縮を予約しました`);

    // Phase 6: CLEAN マーク（再構築内で実行される）

    this.initialized = true;
    console.log(`[アプリ初期化:${userId}] 初期化が完了しました（全フェーズ）`);
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



export { AppInitializer };
