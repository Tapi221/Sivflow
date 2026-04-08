import { useCallback, useEffect, useState } from "react";

import type { CardSyncStatus } from "@/components/card/shell/cardSyncStatus";

interface UseCardSetViewSyncStateOptions {
  currentCardId: string | null;
  isGlobalEditing: boolean;
  sourceKey: string;
}

export const useCardSetViewSyncState = ({
  currentCardId,
  isGlobalEditing,
  sourceKey,
}: UseCardSetViewSyncStateOptions) => {
  const [activeSyncStatus, setActiveSyncStatus] =
    useState<CardSyncStatus | null>(null);

  useEffect(() => {
    setActiveSyncStatus(null);
  }, [currentCardId, isGlobalEditing, sourceKey]);

  const handleActiveSyncStatusChange = useCallback(
    (status: CardSyncStatus | null) => {
      setActiveSyncStatus(status);
    },
    [],
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
