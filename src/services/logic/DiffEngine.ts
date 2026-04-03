import type { FolderLike, IDiffEngine } from "@/services/interfaces/ISyncService";

type TimestampLike = {
  toMillis?: () => number;
  seconds?: number;
  nanoseconds?: number;
};

type PlainObject = Record<string, unknown>;

type DiffableEntity = PlainObject & {
  id?: string;
  folderId?: string;
  updatedAt?: unknown;
  lastSyncedAt?: unknown;
  localUpdatedAt?: unknown;
  parentFolderId?: string | null;
  parent_folder_id?: string | null;
};

const isPlainObject = (value: unknown): value is PlainObject => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const asDiffableEntity = (value: unknown): DiffableEntity | null => {
  return isPlainObject(value) ? (value as DiffableEntity) : null;
};

/**
 * Firestore Timestamp / Date / number(ms or sec) / string(ISO) が混ざっても
 * 時刻比較が壊れないように number(ms) に正規化する。
 */
const toMillis = (value: unknown): number => {
  if (value == null) return 0;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0;
    return value < 100_000_000_000
      ? Math.floor(value * 1000)
      : Math.floor(value);
  }

  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? t : 0;
  }

  if (typeof value === "string") {
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : 0;
  }

  if (typeof value === "object") {
    const ts = value as TimestampLike;

    if (typeof ts.toMillis === "function") {
      const t = ts.toMillis();
      return Number.isFinite(t) ? t : 0;
    }

    if (typeof ts.seconds === "number") {
      const nanos = typeof ts.nanoseconds === "number" ? ts.nanoseconds : 0;
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
  calculateDiff(local: unknown, remote: unknown): PlainObject | null {
    const localObj = asDiffableEntity(local);
    const remoteObj = asDiffableEntity(remote);

    if (!localObj || !remoteObj) return null;

    const diff: PlainObject = {};
    let hasChanges = false;

    const allKeys = new Set([
      ...Object.keys(localObj),
      ...Object.keys(remoteObj),
    ]);

    for (const key of allKeys) {
      if (
        ["updatedAt", "lastSyncedAt", "localUpdatedAt", "_metadata"].includes(
          key,
        )
      ) {
        continue;
      }

      const localValue = localObj[key];
      const remoteValue = remoteObj[key];

      if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
        diff[key] = localValue;
        hasChanges = true;
      }
    }

    return hasChanges ? diff : null;
  }

  /**
   * マージを実行する
   * server_wins: サーバーの値を優先（競合時）
   * client_wins: クライアントの値を優先
   * manual はここでは扱わず、呼び出し元で処理することを想定
   */
  merge(
    local: unknown,
    remote: unknown,
    strategy: "server_wins" | "client_wins" | "manual" = "server_wins",
  ): {
    merged: PlainObject | null;
    conflict: boolean;
  } {
    const localObj = asDiffableEntity(local);
    const remoteObj = asDiffableEntity(remote);

    if (!localObj && remoteObj) {
      return { merged: { ...remoteObj }, conflict: false };
    }

    if (localObj && !remoteObj) {
      return { merged: { ...localObj }, conflict: false };
    }

    if (!localObj && !remoteObj) {
      return { merged: null, conflict: false };
    }

    const merged: DiffableEntity = { ...localObj };
    let conflict = false;

    const serverHasUpdates =
      toMillis(remoteObj.updatedAt) > toMillis(localObj.lastSyncedAt ?? 0);

    const localHasUpdates =
      toMillis(localObj.localUpdatedAt) > toMillis(localObj.lastSyncedAt ?? 0);

    if (serverHasUpdates && localHasUpdates) {
      conflict = true;

      if (strategy === "server_wins") {
        Object.assign(merged, remoteObj);
      } else if (strategy === "client_wins") {
        // base が localObj なので何もしない
      }
    } else if (serverHasUpdates) {
      Object.assign(merged, remoteObj);
    }

    if (toMillis(remoteObj.updatedAt) > toMillis(merged.updatedAt)) {
      merged.updatedAt = remoteObj.updatedAt;
    }

    return { merged, conflict };
  }

  /**
   * 整合性チェック
   * 単純なフィールド一致率や必須フィールドの存在確認
   */
  validateConsistency(local: unknown, remote: unknown): boolean {
    const localObj = asDiffableEntity(local);
    const remoteObj = asDiffableEntity(remote);

    if (!localObj || !remoteObj) return false;
    if (!localObj.id || !remoteObj.id) return false;

    return localObj.id === remoteObj.id;
  }

  /**
   * 循環参照の検出
   * @param targetId チェック対象のフォルダID
   * @param newParentId 新しい親フォルダID
   * @param allFolders 全フォルダのリスト
   * @returns 循環が発生する場合はtrue
   */
  detectCycle(
    targetId: string,
    newParentId: string | null,
    allFolders: readonly FolderLike[],
  ): boolean {
    if (!newParentId) return false;
    if (targetId === newParentId) return true;

    let currentId: string | null = newParentId;
    const visited = new Set<string>([targetId]);

    while (currentId) {
      if (visited.has(currentId)) return true;
      visited.add(currentId);

      const parent = allFolders.find((f) => {
        const id = "id" in f ? f.id : undefined;
        const folderId = "folderId" in f ? f.folderId : undefined;
        return id === currentId || folderId === currentId;
      });

      if (!parent) break;

      currentId =
        ("parentFolderId" in parent ? parent.parentFolderId : undefined) ??
        ("parent_folder_id" in parent ? parent.parent_folder_id : undefined) ??
        null;

      if (currentId === targetId) return true;
    }

    return false;
  }
}
