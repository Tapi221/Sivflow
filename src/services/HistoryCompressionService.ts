import { getLocalDb } from './localDB';
import { StorageStateManager } from './StorageStateManager';
import { SafeIndexedDBWriter } from './SafeIndexedDBWriter';

/**
 * 圧縮された履歴データの型定義
 */
interface CompressedHistory {
  id: string;
  userId: string;
  cardId: string;
  date: Date; // 日単位
  reviewCount: number;
  correctCount: number;
  avgInterval: number;
}

/**
 * 履歴圧縮サービス
 * 
 * ルール:
 * - 直近30日: raw event
 * - 31日〜90日: 日単位に圧縮
 * - 91日以降: 統計値のみ
 * 
 * 🔥 重要: 圧縮は贅沢処理。READ_ONLY 中は実行しない。
 */
export class HistoryCompressionService {
  /**
   * 古い履歴を圧縮
   * 
   * @param userId ユーザーID
   */
  async compress(userId: string): Promise<void> {
    // READ_ONLY 中は圧縮しない（無意味な計算を避ける）
    if (StorageStateManager.isReadOnly(userId)) {
      console.log(`[Compression:${userId}] Skipped (READ_ONLY mode)`);
      return;
    }
    
    const db = await getLocalDb(userId);
    
    try {
      // 30日以前の raw event を取得
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const oldEvents = await db.levelHistories
        .where('changedAt')
        .below(thirtyDaysAgo)
        .toArray();
      
      if (oldEvents.length === 0) {
        console.log(`[Compression:${userId}] No old events to compress`);
        return;
      }
      
      // 日単位に圧縮
      const compressed = this.compressByDay(oldEvents, userId);
      
      // TODO: 圧縮データを保存するテーブルを追加
      // 現時点では圧縮データの保存先がないため、ログのみ
      console.log(`[Compression:${userId}] Compressed ${oldEvents.length} events into ${compressed.length} daily summaries`);
      
      // TODO: raw event を削除
      // await SafeIndexedDBWriter.write(
      //   userId,
      //   () => db.levelHistories
      //     .where('changedAt')
      //     .below(thirtyDaysAgo)
      //     .delete(),
      //   'deleteOldEvents'
      // );
      
    } catch (error) {
      console.error(`[Compression:${userId}] Failed:`, error);
      // 失敗してもアプリは継続
    }
  }
  
  /**
   * イベントを日単位に圧縮
   */
  private compressByDay(events: unknown[], userId: string): CompressedHistory[] {
    // 日ごとにグループ化
    const byDay = new Map<string, any[]>();
    
    for (const event of events) {
      const changedAt = event.changedAt instanceof Date 
        ? event.changedAt 
        : new Date(event.changedAt);
      const day = changedAt.toISOString().split('T')[0];
      const key = `${event.cardId}_${day}`;
      
      if (!byDay.has(key)) {
        byDay.set(key, []);
      }
      byDay.get(key)!.push(event);
    }
    
    // 統計値を計算
    const compressed: CompressedHistory[] = [];
    
    for (const [key, dayEvents] of byDay.entries()) {
      const [cardId, day] = key.split('_');
      
      // 正解数をカウント
      const correctCount = dayEvents.filter(e => {
        // correct フィールドがある場合
        if (typeof e.correct === 'boolean') return e.correct;
        // level の変化で判定（増加 = 正解）
        if (e.newLevel !== undefined && e.oldLevel !== undefined) {
          return e.newLevel > e.oldLevel;
        }
        return false;
      }).length;
      
      // 平均間隔を計算
      const intervals = dayEvents
        .map(e => e.interval)
        .filter(i => typeof i === 'number' && i > 0);
      const avgInterval = intervals.length > 0
        ? intervals.reduce((sum, i) => sum + i, 0) / intervals.length
        : 0;
      
      compressed.push({
        id: `${userId}_${cardId}_${day}`,
        userId,
        cardId,
        date: new Date(day),
        reviewCount: dayEvents.length,
        correctCount,
        avgInterval
      });
    }
    
    return compressed;
  }
}
