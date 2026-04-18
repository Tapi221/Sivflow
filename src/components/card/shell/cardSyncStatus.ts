export type CardSyncRetry = () => Promise<void>;

export type CardSyncStatus = Readonly<{
  lastSyncedAtMs: number | null;
  hasError: boolean;
  isRetrying: boolean;
  retry: CardSyncRetry | null;
}>;

export type CardSyncStatusSnapshot = Readonly<{
  lastSyncedAtMs: number | null;
  hasError: boolean;
  isRetrying: boolean;
  canRetry: boolean;
}>;

export const toCardSyncStatusSnapshot = (
  status: CardSyncStatus | null,
): CardSyncStatusSnapshot | null => {
  if (!status) {
    return null;
  }

  return {
    lastSyncedAtMs: status.lastSyncedAtMs,
    hasError: status.hasError,
    isRetrying: status.isRetrying,
    canRetry: status.retry != null,
  };
};

export const areCardSyncStatusSnapshotsEqual = (
  left: CardSyncStatusSnapshot | null,
  right: CardSyncStatusSnapshot | null,
): boolean =>
  left?.lastSyncedAtMs === right?.lastSyncedAtMs &&
  left?.hasError === right?.hasError &&
  left?.isRetrying === right?.isRetrying &&
  left?.canRetry === right?.canRetry;
