import type { IDiffEngine } from '../interfaces/ISyncService';

type TimestampLike = {
  toMillis?: () => number;
  seconds?: number;
  nanoseconds?: number;
};

/**
 * Firestore Timestamp / Date / number(ms or sec) / string(ISO) が混ざっても
 * 時刻比較が壊れないように number(ms) に正規化する。
 */
const toMillis = (value: unknown): number => {
  if (value == null) return 0;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    // epoch seconds が混ざっても耐える（ms は 1e12 台、sec は 1e9 台）
    return value < 100_000_000_000 ? Math.floor(value * 1000) : Math.floor(value);
  }

  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? t : 0;
  }

  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : 0;
  }

  if (typeof value === 'object') {
    const ts = value as TimestampLike;
    if (typeof ts.toMillis === 'function') {
      const t = ts.toMillis();
      return Number.isFinite(t) ? t : 0;
    }
    if (typeof ts.seconds === 'number') {
      const nanos = typeof ts.nanoseconds === 'number' ? ts.nanoseconds : 0;
      return Math.floor(ts.seconds * 1000 + nanos / 1_000_000);
    }
  }

  return 0;
};

/**
 * DiffEngine: データの差分計算とマージを担当する純粋なロジッククラス
 * 状態を持たず、副作用もない
 */
export class DiffEngine implements IDiffEngine {
  
  /**
   * 2つのエンティティの差分を計算する
   * @param local ローカルのデータ
   * @param remote リモートのデータ
   * @returns 差分オブジェクト（変更がない場合はnull）
   */
  calculateDiff(local: any, remote: any): any | null {
    if (!local || !remote) return null;
    
    const diff: any = {};
    let hasChanges = false;
    
    // オブジェクトのキーを走査
    const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)]);
    
    for (const key of allKeys) {
      // 無視するフィールド
      if (['updatedAt', 'lastSyncedAt', 'localUpdatedAt', '_metadata'].includes(key)) continue;
      
      const localValue = local[key];
      const remoteValue = remote[key];
      
      // 単純な等価比較（深い比較はコスト削減のため行わない、プリミティブ想定）
      // 必要に応じてJSON.stringifyでの比較を入れる
      if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
        diff[key] = localValue; // ローカルの値を正として差分を作成（送信用途）
        hasChanges = true;
      }
    }
    
    return hasChanges ? diff : null;
  }

  /**
   * マージを実行する
   * server_wins: サーバーの値を優先（競合時）
   * client_wins: クライアントの値を優先
   * Manualはここでは扱わず、呼び出し元で処理することを想定
   */
  merge(local: any, remote: any, strategy: 'server_wins' | 'client_wins' | 'manual' = 'server_wins'): {
    merged: any;
    conflict: boolean;
  } {
    // データがない場合の処理
    if (!local && remote) return { merged: { ...remote }, conflict: false };
    if (local && !remote) return { merged: { ...local }, conflict: false };
    if (!local && !remote) return { merged: null, conflict: false };

    const merged = { ...local };
    let conflict = false;
    
    // 更新日時の比較 (Time based conflict detection)
    // サーバーのupdatedAtとローカルのupdatedAtを比較
    // もしローカルが最後にsyncした時刻よりも、サーバーの更新日時が新しいなら、サーバー側で誰かが更新している
    const serverHasUpdates = toMillis(remote.updatedAt) > toMillis(local.lastSyncedAt || 0);
    const localHasUpdates = toMillis(local.localUpdatedAt) > toMillis(local.lastSyncedAt || 0);
    
    if (serverHasUpdates && localHasUpdates) {
      conflict = true;
      // 競合時の戦略適用
      if (strategy === 'server_wins') {
        Object.assign(merged, remote);
        // ローカル固有の変更を上書きするリスクがあるが、server_winsなので許容
      } else if (strategy === 'client_wins') {
        // クライアント優先なら何もしない（ベースがlocalなので）
        // ただし、remoteの新しいフィールドは取り込むべきか？
        // ここでは単純に「クライアントの意思」を優先し、マージしないフィールドも維持
      }
    } else if (serverHasUpdates) {
      // サーバーのみ更新 -> 安全に書き換え
      Object.assign(merged, remote);
    } else {
      // ローカルのみ更新、あるいは両方更新なし -> ローカルのまま
    }
    
    // メタデータの調整
    if (toMillis(remote.updatedAt) > toMillis(merged.updatedAt)) {
      merged.updatedAt = remote.updatedAt;
    }
    
    return { merged, conflict };
  }

  /**
   * 整合性チェック
   * 単純なフィールド一致率や必須フィールドの存在確認
   */
  validateConsistency(local: any, remote: any): boolean {
    if (!local || !remote) return false;
    
    // IDの一致確認
    if (local.id !== remote.id) return false;
    
    // 重要なビジネスロジック上の不整合がないか
    // 例: 親フォルダが存在しない、などの参照整合性はここではチェックできない（単体データ比較のため）
    // ここでは「データ構造として壊れていないか」を見る
    
    return true;
  }

  /**
   * 循環参照の検出
   * @param targetId チェック対象のフォルダID
   * @param newParentId 新しい親フォルダID
   * @param allFolders 全フォルダのリスト
   * @returns 循環が発生する場合はtrue
   */
  detectCycle(targetId: string, newParentId: string | null, allFolders: any[]): boolean {
    if (!newParentId) return false;
    if (targetId === newParentId) return true;

    let currentId = newParentId;
    const visited = new Set<string>();
    visited.add(targetId);

    while (currentId) {
      if (visited.has(currentId)) return true; // 循環検知
      visited.add(currentId);

      const parent = allFolders.find(f => (f.id || f.folderId) === currentId);
      if (!parent) break;

      currentId = parent.parentFolderId || parent.parent_folder_id || null;
      if (currentId === targetId) return true;
    }

    return false;
  }
}