import {
  getLocalDb,
  getLocalDBRuntimeStatus,
  LOCALDB_RECOVERY_GUIDE_URL,
} from "./localDB";
import { IndexedDBMetadataService } from "./IndexedDBMetadataService";
import { IndexedDBRebuildOrchestrator } from "./IndexedDBRebuildOrchestrator";
import { notificationService } from "./NotificationService";
import { contextService } from "./ContextService";
// NOTE: 初期化時のユーザー向け INFO 通知は UI 上で邪魔になるため表示しない。
import { warnOncePerSession } from "./localDBRuntimeState";

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

      notificationService.warning(
        "ローカル保存が利用できません",
        `このセッションではメモリ保存で継続します。再読み込みで未同期データが消える可能性があります。Chrome のサイトデータ削除で復旧できます。`,
        {
          details: `復旧手順: ${LOCALDB_RECOVERY_GUIDE_URL}`,
          closeable: true,
        },
      );

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
        notificationService.error(
          "申し訳ございません。",
          "通常は自動的に復旧しますが、\n今回は自動復旧の上限を超えたため、起動できない状態です。\n\nこの問題はユーザー操作が原因ではありません。\nシステム側の調査が必要です。",
          {
            details: `エラーコード: rebuild_loop\nユーザーID: ${userId}\nタイムスタンプ: ${new Date().toISOString()}`,
            actions: [
              {
                label: "サポートに連絡",
                onClick: () => {
                  window.open(
                    "mailto:support@example.com?subject=再構築ループエラー&body=エラーコード: rebuild_loop",
                    "_blank",
                  );
                },
                primary: true,
              },
            ],
          },
        );
        throw new Error("Rebuild loop detected");
      }

      const rebuildResult = await this.rebuild(userId, reason);
      if (rebuildResult.degraded) {
        degraded = true;
        degradedReason = "rebuild_partial_failures";
        skippedFailures = rebuildResult.failures.length;
        notificationService.warning(
          "一部データをスキップして起動しました",
          "破損データを除外して継続しています。必要に応じて同期を実行してください。",
          { closeable: true },
        );
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

    // 🔥 Phase 4: 履歴圧縮（バックグラウンド）
    console.log(`[AppInit:${userId}] Phase4: Scheduling compression...`);
    requestIdleCallback(() => {
      import("./HistoryCompressionService").then(
        ({ HistoryCompressionService }) => {
          console.log(
            `[AppInit:${userId}] Phase4: Compression started (background)`,
          );
          new HistoryCompressionService().compress(userId);
        },
      );
    });
    console.log(`[AppInit:${userId}] Phase4: Compression scheduled ✓`);

    // Phase 6: CLEAN マーク（再構築内で実行される）

    this.initialized = true;
    console.log(`[AppInit:${userId}] ✅ Initialization complete (all phases)`);
    return { degraded, reason: degradedReason, skippedFailures };

    // 初期化完了の通知は自動で消える（INFO レベル）
  }

  /**
   * IndexedDB を再構築
   */
  private static async rebuild(
    userId: string,
    reason?: string,
  ): Promise<{
    degraded: boolean;
    failures: Array<{ type: string; id: string; error: string }>;
  }> {
    console.log(`[AppInit:${userId}] Rebuilding IndexedDB...`);

    const db = await getLocalDb(userId);
    let metaService = new IndexedDBMetadataService(db, userId);

    // 再構築回数をインクリメント
    await metaService.incrementRebuildCount(reason || "unknown");

    // 即破棄
    await db.delete();

    // 🔥 重要: 削除後に新しいインスタンスを取得
    await getLocalDb(userId);

    let rebuildResult: Awaited<
      ReturnType<typeof IndexedDBRebuildOrchestrator.rebuild>
    >;
    try {
      rebuildResult = await IndexedDBRebuildOrchestrator.rebuild(
        userId,
        reason,
      );
    } catch (error: unknown) {
      console.error(
        `[AppInit:${userId}] Rebuild FAILED:`,
        error.message || error,
      );
      throw error; // 上位で捕捉されることを期待
    }

    // 🔥 再構築 + 同期完了後に CLEAN をマーク
    // 新しい DB インスタンスを作成（削除後のため）
    const newDb = await getLocalDb(userId);
    metaService = new IndexedDBMetadataService(newDb, userId);
    await metaService.recomputeMetadataFor("post_rebuild");
    await metaService.markClean();
    if (rebuildResult.degraded) {
      console.warn(
        `[AppInit:${userId}] Rebuild completed with partial failures`,
        {
          count: rebuildResult.failures.length,
          failures: rebuildResult.failures.slice(0, 20),
        },
      );
    }
    return {
      degraded: rebuildResult.degraded,
      failures: rebuildResult.failures,
    };
  }

  /**
   * 初期化状態をリセット（テスト用）
   */
  static reset(): void {
    this.initialized = false;
    this.initPromise = null;
  }
}
