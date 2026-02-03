import { LocalDB, initializeDB, getLocalDb } from './localDB';
import { IndexedDBMetadataService } from './IndexedDBMetadataService';
import { IndexedDBRebuildOrchestrator } from './IndexedDBRebuildOrchestrator';
import { notificationService } from './NotificationService';
import { contextService } from './ContextService';
import { getContextualMessage } from '../utils/messageTemplates';

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
  private static initPromise: Promise<void> | null = null;
  private static notificationId: string | null = null;
  
  /**
   * アプリを初期化（起動時に一度だけ実行）
   * 
   * @param userId ユーザーID
   */
  static async initialize(userId: string): Promise<void> {
    // 二重実行防止
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this.doInitialize(userId);
    await this.initPromise;
  }
  
  private static async doInitialize(userId: string): Promise<void> {
    console.log(`[AppInit:${userId}] Starting initialization...`);
    
    // コンテキストを判定
    const context = contextService.getInitContext(userId);
    const message = getContextualMessage('init', context);
    const details = getContextualMessage('details', context);
    
    // INFO レベルの通知を表示（プログレッシブディスクロージャー）
    notificationService.info(
      message,
      'この処理によってデータが失われることはありません。',
      {
        details,
        duration: 60000, // 60秒後に自動で消える
      }
    );
    
    initializeDB(userId);
    const db = getLocalDb();
    const metaService = new IndexedDBMetadataService(db, userId);
    
    // 🔥 Phase 1: 健全性チェック（前回のセッションの状態を確認）
    console.log(`[AppInit:${userId}] Phase1: Health check...`);
    const { healthy, reason } = await metaService.checkHealth();
    
    if (!healthy) {
      console.warn(`[AppInit:${userId}] Phase1: Health check FAILED - ${reason}`);
      
      // エラーフラグを設定（次回は recovery コンテキスト）
      contextService.setErrorFlag(userId);
      
      // Phase 2: 再構築
      console.log(`[AppInit:${userId}] Phase2: Rebuilding...`);
      
      // 再構築回数をチェック
      const rebuildCount = await metaService.getRebuildCount();
      
      if (rebuildCount >= 3) {
        // ERROR レベルの通知（続行不可）
        notificationService.error(
          '申し訳ございません。',
          '通常は自動的に復旧しますが、\n今回は自動復旧の上限を超えたため、起動できない状態です。\n\nこの問題はユーザー操作が原因ではありません。\nシステム側の調査が必要です。',
          {
            details: `エラーコード: rebuild_loop\nユーザーID: ${userId}\nタイムスタンプ: ${new Date().toISOString()}`,
            actions: [
              {
                label: 'サポートに連絡',
                onClick: () => {
                  window.open('mailto:support@example.com?subject=再構築ループエラー&body=エラーコード: rebuild_loop', '_blank');
                },
                primary: true,
              },
            ],
          }
        );
        throw new Error('Rebuild loop detected');
      }
      
      await this.rebuild(userId, reason);
      console.log(`[AppInit:${userId}] Phase2: Rebuild complete ✓`);
    } else {
      console.log(`[AppInit:${userId}] Phase1: Health check OK ✓`);
    }
    
    // 🔥 Phase 3: Snapshot 移行
    console.log(`[AppInit:${userId}] Phase3: Snapshot migration...`);
    try {
      const { snapshotService } = await import('./SnapshotService');
      await snapshotService.migrateFromLocalStorage(userId);
      console.log(`[AppInit:${userId}] Phase3: Snapshot migration complete ✓`);
    } catch (error) {
      console.error(`[AppInit:${userId}] Phase3: Snapshot migration FAILED (will retry next time)`, error);
      // 移行失敗してもアプリは継続
    }
    
    // 🔥 Phase 4: 履歴圧縮（バックグラウンド）
    console.log(`[AppInit:${userId}] Phase4: Scheduling compression...`);
    requestIdleCallback(() => {
      import('./HistoryCompressionService').then(({ HistoryCompressionService }) => {
        console.log(`[AppInit:${userId}] Phase4: Compression started (background)`);
        new HistoryCompressionService().compress(userId);
      });
    });
    console.log(`[AppInit:${userId}] Phase4: Compression scheduled ✓`);
    
    // Phase 6: CLEAN マーク（再構築内で実行される）
    
    this.initialized = true;
    console.log(`[AppInit:${userId}] ✅ Initialization complete (all phases)`);
    
    // 初期化完了の通知は自動で消える（INFO レベル）
  }
  
  /**
   * IndexedDB を再構築
   */
  private static async rebuild(userId: string, reason?: string): Promise<void> {
    console.log(`[AppInit:${userId}] Rebuilding IndexedDB...`);
    
    initializeDB(userId);
    let db = getLocalDb();
    let metaService = new IndexedDBMetadataService(db, userId);
    
    // 再構築回数をインクリメント
    await metaService.incrementRebuildCount(reason || 'unknown');
    
    // 即破棄
    await db.delete();
    
    // 再構築
    await IndexedDBRebuildOrchestrator.rebuild(userId, reason);
    
    // 🔥 再構築 + 同期完了後に CLEAN をマーク
    // 新しい DB インスタンスを作成（削除後のため）
    initializeDB(userId);
    db = getLocalDb();
    metaService = new IndexedDBMetadataService(db, userId);
    await metaService.markClean();
  }
  
  /**
   * 初期化状態をリセット（テスト用）
   */
  static reset(): void {
    this.initialized = false;
    this.initPromise = null;
  }
}
