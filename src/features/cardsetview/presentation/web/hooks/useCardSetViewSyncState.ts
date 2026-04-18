import { useCallback, useMemo, useRef, useState } from "react";

import {
  areCardSyncStatusSnapshotsEqual,
  toCardSyncStatusSnapshot,
  type CardSyncRetry,
  type CardSyncStatus,
  type CardSyncStatusSnapshot,
} from "@/components/card/shell/cardSyncStatus";

interface UseCardSetViewSyncStateOptions {
  currentCardId: string | null;
  isGlobalEditing: boolean;
  sourceKey: string;
}

type SyncStateScope = Readonly<{
  scopeKey: string;
  status: CardSyncStatusSnapshot | null;
}>;

type RetryStateScope = Readonly<{
  scopeKey: string;
  retry: CardSyncRetry | null;
}>;

type UseCardSetViewSyncStateResult = Readonly<{
  activeSyncStatus: CardSyncStatusSnapshot | null;
  handleActiveSyncStatusChange: (status: CardSyncStatus | null) => void;
  handleRetryActiveSync: () => Promise<void>;
}>;

export const useCardSetViewSyncState = ({
  currentCardId,
  isGlobalEditing,
  sourceKey,
}: UseCardSetViewSyncStateOptions): UseCardSetViewSyncStateResult => {
  const scopeKey = useMemo(() => {
    return [
      currentCardId ?? "__no-card__",
      isGlobalEditing ? "editing" : "viewing",
      sourceKey,
    ].join("::");
  }, [currentCardId, isGlobalEditing, sourceKey]);

  const [syncState, setSyncState] = useState<SyncStateScope>({
    scopeKey,
    status: null,
  });
  const retryStateRef = useRef<RetryStateScope>({
    scopeKey,
    retry: null,
  });

  const activeSyncStatus =
    syncState.scopeKey === scopeKey ? syncState.status : null;

  const handleActiveSyncStatusChange = useCallback(
    (status: CardSyncStatus | null) => {
      const nextStatus = toCardSyncStatusSnapshot(status);

      retryStateRef.current = {
        scopeKey,
        retry: status?.retry ?? null,
      };

      setSyncState((prev) => {
        if (
          prev.scopeKey === scopeKey &&
          areCardSyncStatusSnapshotsEqual(prev.status, nextStatus)
        ) {
          return prev;
        }

        return {
          scopeKey,
          status: nextStatus,
        };
      });
    },
    [scopeKey],
  );

  const handleRetryActiveSync = useCallback(async () => {
    const retryState = retryStateRef.current;
    if (retryState.scopeKey !== scopeKey) return;
    await retryState.retry?.();
  }, [scopeKey]);

  return {
    activeSyncStatus,
    handleActiveSyncStatusChange,
    handleRetryActiveSync,
  };
};
