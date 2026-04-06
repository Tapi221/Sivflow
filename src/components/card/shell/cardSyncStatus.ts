export type CardSyncStatus = {
  lastSyncedAtMs: number | null;
  hasError: boolean;
  isRetrying: boolean;
  retry: (() => Promise<void>) | null;
};
