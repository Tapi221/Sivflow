export const TAB_PRESENCE_STORAGE_KEYS = {
  presenceMap: "__tab_presence_v1__",
  tabId: "__tab_id_v1__",
  started: "__tab_presence_started_v1__",
} as const;

export const TAB_PRESENCE_TIMINGS = {
  heartbeatMs: 5000,
  staleMs: 15000,
} as const;
