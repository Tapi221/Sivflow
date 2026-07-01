type CardSyncRetry = () => Promise<void>;
type CardSyncStatus = Readonly<{ lastSyncedAtMs: number | null;
  hasError: boolean;
  isRetrying: boolean;
  retry: CardSyncRetry | null;
}>;
type CardSyncStatusSnapshot = Readonly<{ lastSyncedAtMs: number | null;
  hasError: boolean;
  isRetrying: boolean;
  canRetry: boolean;
}>;



const toCardSyncStatusSnapshot = (status: CardSyncStatus | null): CardSyncStatusSnapshot | null => {
  if (!status) {
    return null;
  }

  return {
    lastSyncedAtMs: status.lastSyncedAtMs,
    hasError: status.hasError,
    isRetrying: status.isRetrying,
    canRetry: (status.retry !== null && status.retry !== undefined),
  };
};
const areCardSyncStatusSnapshotsEqual = (left: CardSyncStatusSnapshot | null, right: CardSyncStatusSnapshot | null): boolean => left?.lastSyncedAtMs === right?.lastSyncedAtMs && left?.hasError === right?.hasError && left?.isRetrying === right?.isRetrying && left?.canRetry === right?.canRetry;



export { toCardSyncStatusSnapshot, areCardSyncStatusSnapshotsEqual };


export type { CardSyncRetry, CardSyncStatus, CardSyncStatusSnapshot };
