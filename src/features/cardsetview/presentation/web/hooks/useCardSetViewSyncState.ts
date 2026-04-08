import { useCallback, useMemo, useState } from "react";

import type { CardSyncStatus } from "@/components/card/shell/cardSyncStatus";

interface UseCardSetViewSyncStateOptions {
  currentCardId: string | null;
  isGlobalEditing: boolean;
  sourceKey: string;
}

type SyncStateScope = {
  scopeKey: string;
  status: CardSyncStatus | null;
};

export const useCardSetViewSyncState = ({
  currentCardId,
  isGlobalEditing,
  sourceKey,
}: UseCardSetViewSyncStateOptions) => {
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

  const activeSyncStatus =
    syncState.scopeKey === scopeKey ? syncState.status : null;

  const handleActiveSyncStatusChange = useCallback(
    (status: CardSyncStatus | null) => {
      setSyncState({
        scopeKey,
        status,
      });
    },
    [scopeKey],
  );

  const handleRetryActiveSync = useCallback(async () => {
    await activeSyncStatus?.retry?.();
  }, [activeSyncStatus]);

  return {
    activeSyncStatus,
    handleActiveSyncStatusChange,
    handleRetryActiveSync,
  };
};
