import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuthSession } from "@/contexts/AuthContext";
import { getLocalDb } from "@/services/localDB";
import type {
  ExplorerDetailRow,
  ExplorerDetailLocalSyncState,
} from "@/components/folder/explorer/model/detailRows";
import type { SyncConflict, SyncQueueItem } from "@/types";

export type ExplorerDetailSyncStatus =
  | "synced"
  | "syncing"
  | "pending"
  | "error"
  | "conflict"
  | "unknown";

export type ExplorerDetailSyncViewState = {
  status: ExplorerDetailSyncStatus;
  label: string;
  title: string;
};

type ExplorerSyncSnapshot = {
  queueItems: SyncQueueItem[];
  conflicts: SyncConflict[];
};

const fallbackSyncState: ExplorerDetailSyncViewState = {
  status: "unknown",
  label: "未確認",
  title: "同期状態を確認中です",
};

const buildSyncKey = (entity: string, targetId: string): string => {
  return `${entity}:${targetId}`;
};

const syncStatusPriority = {
  conflict: 0,
  syncing: 1,
  pending: 2,
  error: 3,
  unknown: 4,
  synced: 5,
} satisfies Record<ExplorerDetailSyncStatus, number>;

const toLocalSyncViewState = (
  localSyncState: ExplorerDetailLocalSyncState | undefined,
  lastSyncedAt: unknown,
): ExplorerDetailSyncViewState => {
  if (localSyncState === "conflict") {
    return {
      status: "conflict",
      label: "競合",
      title: "同期競合があります",
    };
  }

  if (localSyncState === "error") {
    return {
      status: "error",
      label: "エラー",
      title: "前回の同期に失敗しました",
    };
  }

  if (localSyncState === "pending") {
    return {
      status: "pending",
      label: "同期待ち",
      title: "ローカル変更があり、次回同期を待機しています",
    };
  }

  return {
    status: "synced",
    label: "同期済み",
    title: lastSyncedAt ? "Manifolia Cloudと同期済みです" : "同期キューはありません",
  };
};

const chooseQueueItem = (
  current: SyncQueueItem | undefined,
  candidate: SyncQueueItem,
): SyncQueueItem => {
  if (!current) return candidate;

  const currentStatus =
    current.status === "processing" ? "syncing" : current.status === "pending" ? "pending" : "unknown";
  const candidateStatus =
    candidate.status === "processing" ? "syncing" : candidate.status === "pending" ? "pending" : "unknown";

  return syncStatusPriority[candidateStatus] < syncStatusPriority[currentStatus]
    ? candidate
    : current;
};

export const useExplorerDetailSyncStates = (
  rows: ExplorerDetailRow[],
): Map<string, ExplorerDetailSyncViewState> => {
  const { currentUser } = useAuthSession();

  const rowKeys = useMemo(
    () => rows.map((row) => row.key).join("|"),
    [rows],
  );

  const snapshot = useLiveQuery<ExplorerSyncSnapshot>(async () => {
    if (!currentUser || rows.length === 0) {
      return { queueItems: [], conflicts: [] };
    }

    const db = await getLocalDb(currentUser.uid);
    const targetIds = Array.from(
      new Set(rows.map((row) => row.syncTargetId).filter(Boolean)),
    );

    if (targetIds.length === 0) {
      return { queueItems: [], conflicts: [] };
    }

    const [queueItems, conflicts] = await Promise.all([
      db.syncQueue.where("targetId").anyOf(targetIds).toArray(),
      db.conflicts.where("entityId").anyOf(targetIds).toArray(),
    ]);

    return { queueItems, conflicts };
  }, [currentUser?.uid, rowKeys]);

  return useMemo(() => {
    const queueByKey = new Map<string, SyncQueueItem>();
    const conflictByKey = new Map<string, SyncConflict>();

    for (const item of snapshot?.queueItems ?? []) {
      if (item.status !== "pending" && item.status !== "processing") continue;

      const key = buildSyncKey(item.entity, item.targetId);
      queueByKey.set(key, chooseQueueItem(queueByKey.get(key), item));
    }

    for (const conflict of snapshot?.conflicts ?? []) {
      conflictByKey.set(
        buildSyncKey(conflict.entityType, conflict.entityId),
        conflict,
      );
    }

    const next = new Map<string, ExplorerDetailSyncViewState>();

    for (const row of rows) {
      const syncKey = buildSyncKey(row.syncEntity, row.syncTargetId);
      const conflict = conflictByKey.get(syncKey);
      const queuedItem = queueByKey.get(syncKey);

      if (conflict) {
        next.set(row.key, {
          status: "conflict",
          label: "競合",
          title: "同期競合があります",
        });
        continue;
      }

      if (queuedItem?.status === "processing") {
        next.set(row.key, {
          status: "syncing",
          label: "同期中",
          title: "Manifolia Cloudと同期しています",
        });
        continue;
      }

      if (queuedItem?.status === "pending") {
        next.set(row.key, {
          status: "pending",
          label: "同期待ち",
          title: queuedItem.lastError
            ? `同期待ちです。前回エラー: ${queuedItem.lastError}`
            : "次回同期を待機しています",
        });
        continue;
      }

      next.set(
        row.key,
        toLocalSyncViewState(row.localSyncState, row.lastSyncedAt),
      );
    }

    return next;
  }, [rows, snapshot]);
};

export const UNKNOWN_EXPLORER_DETAIL_SYNC_STATE = fallbackSyncState;
