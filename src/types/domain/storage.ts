/**
 * IndexedDB メタデータの型定義
 */
interface IndexedDBMetadata {
  key: "main"; // 固定キー
  schemaVersion: number;
  lastFullSyncAt: Date;
  expectedEntityCounts: {
    cards: number;
    folders: number;
    events: number;
  };
  storageState: "CLEAN" | "DIRTY"; // 最後に正常終了したか
  rebuildReason?: string; // 最後に壊れた理由
  rebuildCount: number; // 再構築回数（無限ループ検知）
}



/**
 * 現在のスキーマバージョン
 */
const CURRENT_SCHEMA_VERSION = 29;



export { CURRENT_SCHEMA_VERSION };


export type { IndexedDBMetadata };
