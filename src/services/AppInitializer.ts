import { contextService } from "./ContextService";
import { IndexedDBMetadataService } from "./IndexedDBMetadataService";
import { IndexedDBRebuildOrchestrator } from "./IndexedDBRebuildOrchestrator";
import {
  getLocalDb,
  getLocalDBRuntimeStatus,
  LOCALDB_RECOVERY_GUIDE_URL,
} from "./localDB";
import { notificationService } from "./NotificationService";
// NOTE: 初期化時のユーザー向け INFO 通知は UI 上で邪魔になるため表示しない。
import { warnOncePerSession } from "./localDBRuntimeState";
import type { CardSet } from "@/types";
import {
  notifyLocalDbFallbackMode,
  notifyRebuildLoopDetected,
  notifyStartupDegraded,
} from "./appInitStartupNotifier";
import { rebuildIndexedDb } from "./indexedDbRebuildCoordinator";
import { backfillLegacyCardsToCardSets } from "./legacyCardSetMigrationBackfill";

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

      notifyLocalDbFallbackMode({ recoveryGuideUrl: LOCALDB_RECOVERY_GUIDE_URL });

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
      await backfillLegacyCardsToCardSets(userId);
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      console.error(
        `[AppInit:${userId}] Rebuild FAILED: ${errorMessage}`,
        error,
      );

      throw error;
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

  /**
   * 旧カード方式からの取りこぼし救済:
   * cardSetId が未設定、または参照先 CardSet が欠損しているカードを復元する。
   * 未設定カードは所属フォルダ配下の CardSet へ割り当て、欠損参照は同じ ID の
   * CardSet を再作成または復活させる（冪等）。
   */
  private static async backfillLegacyCardsToCardSets(
    userId: string,
  ): Promise<void> {
    const db = await getLocalDb(userId);
    const now = new Date();

    const activeCards = await db.cards
      .where("userId")
      .equals(userId)
      .and((c) => !c.isDeleted)
      .toArray();

    const legacyCards = activeCards.filter((card) => !card.cardSetId);
    const folders = await db.folders.where("userId").equals(userId).toArray();
    const folderNameById = new Map(
      folders.map((f) => [
        String(f.id ?? f.folderId ?? ""),
        String(f.folderName ?? ""),
      ]),
    );

    const sets = await db.cardSets.where("userId").equals(userId).toArray();
    const activeSets = sets.filter((s) => !s.isDeleted);
    const activeSetIds = new Set(activeSets.map((set) => set.id));
    const deletedSetById = new Map(
      sets.filter((s) => s.isDeleted).map((s) => [s.id, s]),
    );

    const danglingCardsBySetId = new Map<string, typeof activeCards>();
    for (const card of activeCards) {
      const cardSetId = card.cardSetId?.trim();
      if (!cardSetId || activeSetIds.has(cardSetId)) continue;
      const list = danglingCardsBySetId.get(cardSetId);
      if (list) list.push(card);
      else danglingCardsBySetId.set(cardSetId, [card]);
    }

    if (legacyCards.length === 0 && danglingCardsBySetId.size === 0) return;

    const setByFolder = new Map<string, CardSet>();
    const nextOrderIndexByFolder = new Map<string, number>();
    for (const set of activeSets) {
      const key = set.folderId ?? "__root__";
      if (!setByFolder.has(key)) setByFolder.set(key, set);
      nextOrderIndexByFolder.set(
        key,
        Math.max(
          nextOrderIndexByFolder.get(key) ?? 0,
          (set.orderIndex ?? 0) + 1,
        ),
      );
    }

    const groups = new Map<string, typeof legacyCards>();
    for (const card of legacyCards) {
      const key = card.folderId ? String(card.folderId) : "__root__";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(card);
    }

    await db.transaction("rw", db.cardSets, db.cards, async () => {
      for (const [missingSetId, cards] of danglingCardsBySetId.entries()) {
        const sample = cards[0];
        const folderId = sample?.folderId ? String(sample.folderId) : null;
        const folderKey = folderId ?? "__root__";
        const folderName = folderId
          ? folderNameById.get(folderId) || "インポート済みカード"
          : "インポート済みカード";
        const deletedSet = deletedSetById.get(missingSetId);
        const restoredOrder = nextOrderIndexByFolder.get(folderKey) ?? 0;

        if (deletedSet) {
          await db.cardSets.update(missingSetId, {
            isDeleted: false,
            folderId,
            updatedAt: now,
          });
        } else {
          await db.cardSets.add({
            id: missingSetId,
            userId,
            deviceId: sample?.deviceId || "web",
            folderId,
            name: `${folderName} セット`,
            orderIndex: restoredOrder,
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
          });
        }

        if (!setByFolder.has(folderKey)) {
          setByFolder.set(folderKey, {
            id: missingSetId,
            userId,
            deviceId: sample?.deviceId || "web",
            folderId,
            name: deletedSet?.name || `${folderName} セット`,
            orderIndex: restoredOrder,
            isDeleted: false,
            createdAt: deletedSet?.createdAt ?? now,
            updatedAt: now,
          });
        }
        nextOrderIndexByFolder.set(folderKey, restoredOrder + 1);
      }

      for (const [folderKey, cards] of groups.entries()) {
        let targetSet = setByFolder.get(folderKey);
        if (!targetSet) {
          const folderId = folderKey === "__root__" ? null : folderKey;
          const folderName = folderId
            ? folderNameById.get(folderId) || "インポート済みカード"
            : "インポート済みカード";
          const createdSet: CardSet = {
            id: crypto.randomUUID(),
            userId,
            folderId,
            name: `${folderName} セット`,
            orderIndex: nextOrderIndexByFolder.get(folderKey) ?? 0,
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
          };
          await db.cardSets.add(createdSet);
          targetSet = createdSet;
          setByFolder.set(folderKey, createdSet);
          nextOrderIndexByFolder.set(
            folderKey,
            (nextOrderIndexByFolder.get(folderKey) ?? 0) + 1,
          );
        }

        for (const card of cards) {
          await db.cards.update(card.id, {
            cardSetId: targetSet.id,
            updatedAt: now,
          });
        }
      }
    });

    console.info(
      `[AppInit:${userId}] CardSet backfill repaired ${legacyCards.length} legacy cards and ${danglingCardsBySetId.size} missing sets.`,
    );
  }
}
