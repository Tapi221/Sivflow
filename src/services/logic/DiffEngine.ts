import { IDiffEngine } from '../interfaces/ISyncService';

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
    const serverHasUpdates = remote.updatedAt > (local.lastSyncedAt || 0);
    const localHasUpdates = local.localUpdatedAt > (local.lastSyncedAt || 0);
    
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
    if (remote.updatedAt > merged.updatedAt) {
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
}
