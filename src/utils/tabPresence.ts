type PresenceMap = Record<string, number>;
type TabPresenceStorageKeys = {
  presenceMap: string;
  started: string;
  tabId: string;
};
type TabPresenceTimings = {
  heartbeatMs: number;
  staleMs: number;
};



const TAB_PRESENCE_STORAGE_KEYS: TabPresenceStorageKeys = {
  presenceMap: "sivflow:tab-presence:map",
  started: "__sivflowTabPresenceStarted",
  tabId: "sivflow:tab-presence:tab-id",
};
const TAB_PRESENCE_TIMINGS: TabPresenceTimings = {
  heartbeatMs: 5000,
  staleMs: 15000,
};



const createTabId = (): string => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return String(Math.random()).slice(2);
};
const readMap = () => {
  try {
    const raw = localStorage.getItem(TAB_PRESENCE_STORAGE_KEYS.presenceMap);
    return raw ? (JSON.parse(raw) as PresenceMap) : {};
  } catch {
    return {};
  }
};
const writeMap = (map: PresenceMap) => {
  try {
    localStorage.setItem(TAB_PRESENCE_STORAGE_KEYS.presenceMap, JSON.stringify(map));
  } catch {
    // ignore
  }
};
const prune = (map: PresenceMap, now: number) => {
  for (const [id, ts] of Object.entries(map)) {
    if (typeof ts !== "number" || now - ts > TAB_PRESENCE_TIMINGS.staleMs) {
      delete map[id];
    }
  }
};
const startTabPresence = () => {
  if (typeof window === "undefined") return;

  const startedHost = window as typeof window & {
    [TAB_PRESENCE_STORAGE_KEYS.started]?: boolean;
  };

  if (startedHost[TAB_PRESENCE_STORAGE_KEYS.started]) return;
  startedHost[TAB_PRESENCE_STORAGE_KEYS.started] = true;

  const id = sessionStorage.getItem(TAB_PRESENCE_STORAGE_KEYS.tabId) ?? createTabId();

  sessionStorage.setItem(TAB_PRESENCE_STORAGE_KEYS.tabId, id);

  const beat = () => {
    const now = Date.now();
    const map = readMap();
    map[id] = now;
    prune(map, now);
    writeMap(map);
  };

  const cleanup = () => {
    const map = readMap();
    delete map[id];
    writeMap(map);
  };

  beat();

  const timer = window.setInterval(beat, TAB_PRESENCE_TIMINGS.heartbeatMs);

  window.addEventListener("beforeunload", () => {
    window.clearInterval(timer);
    cleanup();
  });

  window.addEventListener("pagehide", () => {
    window.clearInterval(timer);
    cleanup();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      beat();
    }
  });
};



export { startTabPresence };
