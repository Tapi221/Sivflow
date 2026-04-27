import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import type {
  ExplorerDetailSyncViewState,
} from "@/components/folder/components/ExplorerDetailSyncBadge";
import type { ExplorerDetailRow } from "@/components/folder/explorer/model/detailRows";
import { useAuthSession } from "@/contexts/AuthContext";
import { getLocalDb } from "@/services/localDB";
import type { SyncConflict, SyncQueueItem } from "@/types";

type ExplorerDetailSyncSnapshot = {
  queueItems: SyncQueueItem[];
  conflicts: SyncConflict[];
};

const EMPTY_SYNC_SNAPSHOT: ExplorerDetailSyncSnapshot = {
  queueItems: [],
  conflicts: [],
};

const buildSyncKey = (entity: string, targetId: string) => {
  return `${entity}:${targetId}`;
};

const getRowSyncKey = (row: ExplorerDetailRow) => {
  return buildSyncKey(row.syncEntity, row.syncTargetId);
};

const getRowsDependencyKey = (rows: ExplorerDetailRow[]) => {
  return rows.map((row) => `${row.syncEntity}:${row.syncTargetId}`).join("|");
};

const getQueuePriority = (item: SyncQueueItem): number => {
  if (item.status === "processing") return 0;
  if (item.status === "pending") return 1;
  return 2;
};

const sortQueueItemsForDisplay = (
  left: SyncQueueItem,
  right: SyncQueueItem,
): number => {
  const priorityDiff = getQueuePriority(left) - getQueuePriority(right);
  if (priorityDiff !== 0) return priorityDiff;
  return right.updatedAt - left.updatedAt;
};

const getLocalSyncState = (
  row: ExplorerDetailRow,
): ExplorerDetailSyncViewState | null => {
  if (row.localSyncState === "conflict") {
    return {
      status: "conflict",
      title: "同期競合があります",
      lastSyncedAt: row.lastSyncedAt,
    };
  }

  if (row.localSyncState === "error") {
    return {
      status: "error",
      title: "前回の同期に失敗しました",
      lastSyncedAt: row.lastSyncedAt,
    };
  }

  if (row.localSyncState === "pending") {
    return {
      status: "pending",
      title: "ローカル変更があり、同期待ちです",
      lastSyncedAt: row.lastSyncedAt,
    };
  }

  if (row.localSyncState === "synced") {
    return {
      status: "synced",
      title: row.lastSyncedAt ? "同期済みです" : "同期済みです",
      lastSyncedAt: row.lastSyncedAt,
    };
  }

  return null;
};

const buildSyncViewState = ({
  row,
  queuedItem,
  conflict,
}: {
  row: ExplorerDetailRow;
  queuedItem?: SyncQueueItem;
  conflict?: SyncConflict;
}): ExplorerDetailSyncViewState => {
  if (conflict) {
    return {
      status: "conflict",
      title: "同期競合があります",
      lastSyncedAt: row.lastSyncedAt,
    };
  }

  if (queuedItem?.status === "processing") {
    return {
      status: "syncing",
      title: "同期中です",
      lastError: queuedItem.lastError ?? null,
    };
  }

  if (queuedItem?.status === "pending") {
    return {
      status: "pending",
      title: queuedItem.lastError
        ? `同期待ちです。前回の失敗: ${queuedItem.lastError}`
        : "同期待ちです",
      lastError: queuedItem.lastError ?? null,
    };
  }

  const localState = getLocalSyncState(row);
  if (localState) return localState;

  return {
    status: "synced",
    title: "同期キューに未処理項目はありません",
    lastSyncedAt: row.lastSyncedAt,
  };
};

export const useExplorerDetailSyncStates = (rows: ExplorerDetailRow[]) => {
  const { currentUser } = useAuthSession();
  const rowsDependencyKey = getRowsDependencyKey(rows);

  const syncSnapshot = useLiveQuery<ExplorerDetailSyncSnapshot>(async () => {
    if (!currentUser) return EMPTY_SYNC_SNAPSHOT;

    const targetIds = Array.from(
      new Set(
        rows
          .map((row) => row.syncTargetId)
          .filter((id) => typeof id === "string" && id.length > 0),
      ),
    );

    if (targetIds.length === 0) return EMPTY_SYNC_SNAPSHOT;

    const db = await getLocalDb(currentUser.uid);
    const [queueItems, conflicts] = await Promise.all([
      db.syncQueue.where("targetId").anyOf(targetIds).toArray(),
      db.conflicts.where("entityId").anyOf(targetIds).toArray(),
    ]);

    return { queueItems, conflicts };
  }, [currentUser?.uid, rowsDependencyKey]);

  return useMemo(() => {
    const snapshot = syncSnapshot ?? EMPTY_SYNC_SNAPSHOT;
    const queueItemsByKey = new Map<string, SyncQueueItem>();
    const conflictsByKey = new Map<string, SyncConflict>();

    [...snapshot.queueItems]
      .sort(sortQueueItemsForDisplay)
      .forEach((item) => {
        const key = buildSyncKey(item.entity, item.targetId);
        if (!queueItemsByKey.has(key)) {
          queueItemsByKey.set(key, item);
        }
      });

    snapshot.conflicts.forEach((conflict) => {
      conflictsByKey.set(
        buildSyncKey(conflict.entityType, conflict.entityId),
        conflict,
      );
    });

    const stateByRowKey = new Map<string, ExplorerDetailSyncViewState>();

    rows.forEach((row) => {
      const syncKey = getRowSyncKey(row);
      stateByRowKey.set(
        row.key,
        buildSyncViewState({
          row,
          queuedItem: queueItemsByKey.get(syncKey),
          conflict: conflictsByKey.get(syncKey),
        }),
      );
    });

    return stateByRowKey;
  }, [rows, syncSnapshot]);
};
