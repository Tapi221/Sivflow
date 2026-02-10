import type { LocalDBLike } from './localDB';
import type { IndexedDBMetadata } from '../types/storage';
import { CURRENT_SCHEMA_VERSION } from '../types/storage';
import { SafeIndexedDBWriter } from './SafeIndexedDBWriter';

/**
 * IndexedDB メタデータ管理サービス
 * 
 * 責務:
 * - 健全性チェック
 * - CLEAN/DIRTY 状態管理
 * - 再構築理由の記録
 */
export class IndexedDBMetadataService {
  private db: LocalDBLike;
  private userId: string;
  
  constructor(db: LocalDBLike, userId: string) {
    this.db = db;
    this.userId = userId;
  }
  
  /**
   * メタデータを更新（再構築 + 同期完了後のみ呼ぶ）
   * 
   * 🔥 重要: 途中でクラッシュしても嘘をつかないタイミングで呼ぶ
   */
  async markClean(): Promise<void> {
    const meta: IndexedDBMetadata = {
      key: 'main',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      lastFullSyncAt: new Date(),
      expectedEntityCounts: {
        cards: await this.db.cards.count(),
        folders: await this.db.folders.count(),
        events: await this.db.levelHistories.count()
      },
      storageState: 'CLEAN',
      rebuildCount: 0
    };
    
    await SafeIndexedDBWriter.write(
      this.userId,
      () => this.db.metadata.put(meta),
      'markClean'
    );
    
    // 確認: メタデータが正しく保存されたか
    const saved = await this.db.metadata.get('main');
    console.log(`[Metadata:${this.userId}] Marked CLEAN`);
    console.log(`[Metadata:${this.userId}] Verification - saved metadata:`, saved);
  }
  
  /**
   * 起動時に即 DIRTY をマーク
   * 
   * 🔥 重要: DIRTY がデフォルト状態。CLEAN は成功の証明。
   */
  async markDirty(): Promise<void> {
    const meta = await this.db.metadata.get('main');
    if (meta) {
      meta.storageState = 'DIRTY';
      await SafeIndexedDBWriter.write(
        this.userId,
        () => this.db.metadata.put(meta),
        'markDirty'
      );
      
      console.log(`[Metadata:${this.userId}] Marked DIRTY`);
    }
  }
  
  /**
   * 健全性チェック
   * 
   * @returns true: 正常, false: 即破棄が必要
   */
  async checkHealth(): Promise<{ healthy: boolean; reason?: string }> {
    const meta = await this.db.metadata.get('main');
    
    // メタ情報なし → 自動作成して健康とみなす（破壊的な再構築を避ける）
    if (!meta) {
      console.warn(`[Metadata:${this.userId}] Missing metadata detected. Creating default metadata to avoid destructive rebuild.`);
      try {
        // markClean は安全な書き込み経由でメタデータを作成する
        await this.markClean();
        const created = await this.db.metadata.get('main');
        console.log(`[Metadata:${this.userId}] Created metadata:`, created);
        return { healthy: true };
      } catch (e) {
        console.error(`[Metadata:${this.userId}] Failed to create metadata during health check`, e);
        return { healthy: false, reason: 'missing_metadata' };
      }
    }
    
    // スキーマバージョン不一致 → 即破棄
    if (meta.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      return { 
        healthy: false, 
        reason: `schema_mismatch (expected: ${CURRENT_SCHEMA_VERSION}, got: ${meta.schemaVersion})` 
      };
    }
    
    // 前回 DIRTY で終了 → 即破棄
    if (meta.storageState === 'DIRTY') {
      return { healthy: false, reason: 'dirty_shutdown' };
    }
    
    // 無限再構築ループ検知
    if (meta.rebuildCount > 3) {
      return { 
        healthy: false, 
        reason: `rebuild_loop (count: ${meta.rebuildCount})` 
      };
    }
    
    // エンティティ数の乖離チェック
    const actualCardCount = await this.db.cards.count();
    const expectedCardCount = meta.expectedEntityCounts.cards;
    const diff = Math.abs(actualCardCount - expectedCardCount);
    
    if (diff > 0) {
      console.warn(`[HealthCheck] Card count mismatch detected. Expected: ${expectedCardCount}, Actual: ${actualCardCount}`);
      
      // 許容範囲内ならメタデータを補正して続行 (自己修復)
      if (diff <= 10) {
        console.log('[HealthCheck] Mismatch is within tolerance. Auto-correcting metadata...');
        try {
            await this.markClean(); // 実数でメタデータを更新
            return { healthy: true };
        } catch (e) {
            console.error('[HealthCheck] Failed to auto-correct metadata', e);
            // 補正失敗しても、軽微なズレならリビルド強制しない方がUX的に良い場合もあるが、
            // ここでは安全側に倒してエラーを返す、もしくは warning を出しつつ true を返す設計も可。
            // 今回は補正失敗＝DB異常として false を返す。
             return { 
                healthy: false, 
                reason: `count_mismatch_autofix_failed (diff: ${diff})` 
            };
        }
      } else {
         return { 
            healthy: false, 
            reason: `count_mismatch (cards: expected ${expectedCardCount}, got ${actualCardCount})` 
        };
      }
    }
    
    return { healthy: true };
  }
  
  /**
   * 再構築回数をインクリメント
   */
  async incrementRebuildCount(reason: string): Promise<void> {
    const meta = await this.db.metadata.get('main');
    if (meta) {
      meta.rebuildCount = (meta.rebuildCount || 0) + 1;
      meta.rebuildReason = reason;
      await SafeIndexedDBWriter.write(
        this.userId,
        () => this.db.metadata.put(meta),
        'incrementRebuildCount'
      );
      
      console.warn(`[Metadata:${this.userId}] Rebuild count: ${meta.rebuildCount}, reason: ${reason}`);
    }
  }
  
  /**
   * 再構築回数を取得
   */
  async getRebuildCount(): Promise<number> {
    const meta = await this.db.metadata.get('main');
    return meta?.rebuildCount || 0;
  }
}
