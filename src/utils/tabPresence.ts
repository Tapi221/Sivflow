const KEY = "__tab_presence_v1__";
const ID_KEY = "__tab_id_v1__";
const STARTED_KEY = "__tab_presence_started_v1__";
const HEARTBEAT_MS = 5000;
const STALE_MS = 15000;

type PresenceMap = Record<string, number>;

function readMap(): PresenceMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PresenceMap) : {};
  } catch {
    return {};
  }
}

function writeMap(map: PresenceMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function prune(map: PresenceMap, now: number) {
  for (const [id, ts] of Object.entries(map)) {
    if (typeof ts !== "number" || now - ts > STALE_MS) delete map[id];
  }
}

export function startTabPresence() {
  if (typeof window === "undefined") return;
  const startedHost = window as typeof window & { [STARTED_KEY]?: boolean };
  if (startedHost[STARTED_KEY]) return;
  startedHost[STARTED_KEY] = true;

  const id =
    sessionStorage.getItem(ID_KEY) ??
    (crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
  sessionStorage.setItem(ID_KEY, id);

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
  const timer = window.setInterval(beat, HEARTBEAT_MS);

  window.addEventListener("beforeunload", () => {
    window.clearInterval(timer);
    cleanup();
  });

  window.addEventListener("pagehide", () => {
    window.clearInterval(timer);
    cleanup();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) beat();
  });
}

export function getActiveTabCountEstimate(): number | null {
  try {
    const now = Date.now();
    const map = readMap();
    prune(map, now);
    writeMap(map);
    return Object.keys(map).length;
  } catch {
    return null;
  }
}




