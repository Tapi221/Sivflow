export const CONTEXT_STORAGE_KEY_PREFIXES = {
  lastInit: "last_init_",
  errorFlag: "error_flag_",
  lastSync: "last_sync_",
} as const;

export const CONTEXT_SYNC_THRESHOLDS = {
  offlineRecoveryMs: 60 * 60 * 1000,
} as const;
