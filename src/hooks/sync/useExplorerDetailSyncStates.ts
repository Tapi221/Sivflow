import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuthSession } from "@/contexts/AuthContext";
import { getLocalDb } from "@/services/localDB";
import type { ExplorerDetailRow } from "@/components/folder/explorer/model/detailRows";
import type { SyncConflict, SyncQueueItem } from "@/types/domain/sync";

export type ExplorerDetailSyncStatus =
  | "synced"
  | "syncing"
  | "pending"
  | "error"
  | "conflict"
  | "unknown";

export type ExplorerDetailSyncViewState = {
  status: ExplorerDetailSyncStatus;
  title: string;
  lastSyncedAt?: unknown;
  lastError?: string | null;
};

export const EXPLORER_DETAIL_SYNC_LOADING_STATE: ExplorerDetailSyncViewState = {
  status: "unknown",
  title: "同期状態を確認中です",
};

const buildSyncKey = (entity: string, targetId: string) => {
  return `${entity}:${targetId}`;
};

const toRowSyncKey = (row: ExplorerDetailRow) => {
  return buildSyncKey(row.syncEntity, row.syncTargetId);
};

const getQueueRank = (item: SyncQueueItem): number => {
  if (item.status === "processing") return 0;
  if (item.status === "pending") return 1;
  if (item.status === "failed") return 2;
  return 3;
};

const buildQueueByKey = (items: SyncQueueItem[]): Map<string, SyncQueueItem> => {
  const map = new Map<string, SyncQueueItem>();

  items.forEach((item) => {
    const key = buildSyncKey(item.entity, item.targetId);
    const current = map.get(key);

    if (!current || getQueueRank(item) < getQueueRank(current)) {
      map.set(key, item);
    }
  });

  return map;
};

const buildConflictByKey = (
  conflicts: SyncConflict[],
): Map<string, SyncConflict> => {
  const map = new Map<string, SyncConflict>();

  conflicts.forEach((conflict) => {
    map.set(buildSyncKey(conflict.entityType, conflict.entityId), conflict);
  });

  return map;
};

const toSyncedTitle = (row: ExplorerDetailRow): string => {
  if (row.lastSyncedAt) {
    return "Manifolia Cloudと同期済みです";
  }

  return "同期キューはありません";
};

export const useExplorerDetailSyncStates = (rows: ExplorerDetailRow[]) => {
  const { currentUser } = useAuthSession();
  const rowDependencyKey = useMemo(
    () =>
      rows
        .map((row) => `${row.syncEntity}:${row.syncTargetId}:${row.key}`)
        .join("|"),
    [rows],
  );

  const syncSnapshot = useLiveQuery(
    async () => {
      if (!currentUser || rows.length === 0) {
        return {
          queueItems: [] as SyncQueueItem[],
          conflicts: [] as SyncConflict[],
        };
      }

      const db = await getLocalDb(currentUser.uid);
      const targetIds = Array.from(
        new Set(rows.map((row) => row.syncTargetId).filter(Boolean)),
      );

      if (targetIds.length === 0) {
        return {
          queueItems: [] as SyncQueueItem[],
          conflicts: [] as SyncConflict[],
        };
      }

      const [queueItems, conflicts] = await Promise.all([
        db.syncQueue.where("targetId").anyOf(targetIds).toArray(),
        db.conflicts.where("entityId").anyOf(targetIds).toArray(),
      ]);

      return { queueItems, conflicts };
    },
    [currentUser?.uid, rowDependencyKey],
    {
      queueItems: [] as SyncQueueItem[],
      conflicts: [] as SyncConflict[],
    },
  );

  return useMemo(() => {
    const queueByKey = buildQueueByKey(syncSnapshot.queueItems);
    const conflictByKey = buildConflictByKey(syncSnapshot.conflicts);
    const next = new Map<string, ExplorerDetailSyncViewState>();

    rows.forEach((row) => {
      const syncKey = toRowSyncKey(row);
      const queuedItem = queueByKey.get(syncKey);
      const conflict = conflictByKey.get(syncKey);

      if (conflict) {
        next.set(row.key, {
          status: "conflict",
          title: "同期競合があります",
          lastSyncedAt: row.lastSyncedAt,
        });
        return;
      }

      if (queuedItem?.status === "processing") {
        next.set(row.key, {
          status: "syncing",
          title: "Manifolia Cloudと同期中です",
          lastSyncedAt: row.lastSyncedAt,
          lastError: queuedItem.lastError ?? null,
        });
        return;
      }

      if (queuedItem?.status === "pending") {
        next.set(row.key, {
          status: "pending",
          title: queuedItem.lastError
            ? `同期待ちです。前回の理由: ${queuedItem.lastError}`
            : "同期待ちです",
          lastSyncedAt: row.lastSyncedAt,
          lastError: queuedItem.lastError ?? null,
        });
        return;
      }

      if (queuedItem?.status === "failed") {
        next.set(row.key, {
          status: "error",
          title: queuedItem.lastError ?? "同期に失敗しました",
          lastSyncedAt: row.lastSyncedAt,
          lastError: queuedItem.lastError ?? null,
        });
        return;
      }

      if (row.localSyncState === "conflict") {
        next.set(row.key, {
          status: "conflict",
          title: "同期競合があります",
          lastSyncedAt: row.lastSyncedAt,
        });
        return;
      }

      if (row.localSyncState === "error") {
        next.set(row.key, {
          status: "error",
          title: "前回の同期に失敗しました",
          lastSyncedAt: row.lastSyncedAt,
        });
        return;
      }

      if (row.localSyncState === "pending") {
        next.set(row.key, {
          status: "pending",
          title: "同期待ちです",
          lastSyncedAt: row.lastSyncedAt,
        });
        return;
      }

      next.set(row.key, {
        status: "synced",
        title: toSyncedTitle(row),
        lastSyncedAt: row.lastSyncedAt,
      });
    });

    return next;
  }, [rows, syncSnapshot]);
};
