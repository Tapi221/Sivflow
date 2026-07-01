import type { FolderLike, IDiffEngine } from "@/services/interfaces/ISyncService";
import { toMillis } from "@/utils/toMillis";



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
class DiffEngine implements IDiffEngine {
  public readonly calculateDiff = (local: unknown, remote: unknown): PlainObject | null => {
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
  };

  public readonly merge = (
    local: unknown,
    remote: unknown,
    strategy: "server_wins" | "client_wins" | "manual" = "server_wins",
  ): {
    merged: PlainObject | null;
    conflict: boolean;
  } => {
    const localObj = asDiffableEntity(local);
    const remoteObj = asDiffableEntity(remote);

    if (!localObj && remoteObj) {
      return { merged: { ...remoteObj }, conflict: false };
    }

    if (localObj && !remoteObj) {
      return { merged: { ...localObj }, conflict: false };
    }

    if (!localObj || !remoteObj) {
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
      }
    } else if (serverHasUpdates) {
      Object.assign(merged, remoteObj);
    }

    if (toMillis(remoteObj.updatedAt) > toMillis(merged.updatedAt)) {
      merged.updatedAt = remoteObj.updatedAt;
    }

    return { merged, conflict };
  };

  public readonly validateConsistency = (
    local: unknown,
    remote: unknown,
  ): boolean => {
    const localObj = asDiffableEntity(local);
    const remoteObj = asDiffableEntity(remote);

    if (!localObj || !remoteObj) return false;
    if (!localObj.id || !remoteObj.id) return false;

    return localObj.id === remoteObj.id;
  };

  public readonly detectCycle = (
    targetId: string,
    newParentId: string | null,
    allFolders: readonly FolderLike[],
  ): boolean => {
    if (!newParentId) return false;
    if (targetId === newParentId) return true;

    let currentId: string | null = newParentId;
    const visited = new Set<string>([targetId]);

    while (currentId) {
      if (visited.has(currentId)) return true;
      visited.add(currentId);

      const parent = allFolders.find((folder) => {
        return folder.id === currentId;
      });

      if (!parent) break;

      currentId = parent.parentFolderId ?? parent.parentId ?? null;
      if (currentId === targetId) return true;
    }

    return false;
  };
}



export { DiffEngine };
