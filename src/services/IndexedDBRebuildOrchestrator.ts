import { getLocalDb } from './localDB';
import { CloudSyncAdapter } from './logic/CloudSyncAdapter';

/**
 * IndexedDB 再構築オーケストレーター
 * 
 * 責務:
 * - IndexedDB の破棄（呼び出し元で実行済み）
 * - クラウドからの再同期
 */
export class IndexedDBRebuildOrchestrator {
  private static isRebuilding = false;

  /**
   * IndexedDB を再構築
   * 
   * @param userId ユーザーID
   * @param reason 再構築理由
   * @param onProgress 進捗コールバック
   */
  static async rebuild(
    userId: string,
    reason?: string,
    onProgress?: (msg: string) => void
  ): Promise<void> {
    if (this.isRebuilding) {
      console.warn('[Rebuild] Rebuild already in progress. Skipping.');
      return;
    }

    if (!userId) {
      const msg = '[Rebuild] Missing userId. Cannot rebuild.';
      console.error(msg);
      throw new Error(msg);
    }
    
    this.isRebuilding = true;

    try {
      console.log(`[Rebuild:${userId}] Starting rebuild... Reason: ${reason || 'unknown'}`);
      onProgress?.('クラウドからデータを取得しています...');
      
      // 1. クラウドから最新データを先に取得（DB削除前にデータ確保）
      const adapter = new CloudSyncAdapter(userId);
      // 0を指定して全データを取得（フル同期）
      const { changes } = await adapter.pullDiff(0);
      
      if (changes.length === 0) {
        console.log(`[Rebuild:${userId}] No data found in cloud. Skipping destructive rebuild.`);
        onProgress?.('クラウドにデータはありませんでした。');
        return;
      }

      onProgress?.('データベースを再構築中...');

      // 2. 既存のDB接続を完全に閉じる
      const oldDb = await getLocalDb(userId);
      if (oldDb) {
        oldDb.close();
      }
      
      // 3. インスタンスキャッシュをクリア (LocalDB側のstaticメソッド)
      // これをしないと、LocalDB.getInstance() は閉じた古いインスタンスを返し続けてしまう
      const LocalDBClass = (await import('./localDB')).LocalDB;
      LocalDBClass.clearInstance();

      // 4. 物理的に削除 (Dexie.delete)
      const dbName = `FlashcardMasterDB_${userId}`;
      console.log(`[Rebuild] Deleting database: ${dbName}`);
      await (await import('dexie')).default.delete(dbName);

      // 5. 新しいインスタンスを作成
      console.log('[Rebuild] Creating new DB instance...');
      const newDb = await getLocalDb(userId);

      onProgress?.(`${changes.length} 件のデータを復元中...`);
      
      // 6. 新しいDBにデータを流し込む
      await newDb.transaction('rw', 
        [newDb.folders, newDb.cards, newDb.users, newDb.userSettings, newDb.userStats, newDb.syncMetadata, newDb.levelHistories, newDb.deviceMeta, (newDb as any).tags, (newDb as any).cardRelations, (newDb as any).projectMaps], 
        async () => {
          console.log(`[Rebuild] Inserting ${changes.length} items to fresh DB...`);
          // 取得したデータを保存
          for (const change of changes) {
            const table = `${change.type}s`;
            if (table === 'cards' || table === 'folders' || table === 'cardRelations' || table === 'projectMaps') {
              // トランザクション内なので await 可能
              await newDb.upsert(table as any, change.data, true);
            }
          }
        }
      );
      
      // 7. メタデータサービスでCLEANマークをつける（オプションだが推奨）
      // 循環参照回避のためダイナミックインポート
      try {
        const { IndexedDBMetadataService } = await import('./IndexedDBMetadataService');
        const metaService = new IndexedDBMetadataService(newDb, userId);
        await metaService.markClean();
      } catch (e) {
        console.warn('[Rebuild] Failed to mark clean state', e);
      }

      console.log(`[Rebuild:${userId}] Rebuild complete with ${changes.length} items.`);
      onProgress?.('再構築が完了しました');
      
    } catch (error) {
      console.error(`[Rebuild:${userId}] Rebuild failed:`, error);
      onProgress?.('再構築に失敗しました。');
      throw error;
    } finally {
      this.isRebuilding = false;
    }
  }
}
