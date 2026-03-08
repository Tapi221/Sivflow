export type LocalDBMode = "persistent" | "fallback";
export type LocalDBFallbackReasonCode =
  | "none"
  | "backing_store_open_error"
  | "quota_exceeded"
  | "indexeddb_blocked"
  | "upgrade_needed_or_blocked"
  | "unknown";

export interface LocalDBRuntimeStatus {
  mode: LocalDBMode;
  userId: string | null;
  dbName: string | null;
  fallbackReason: string | null;
  fallbackReasonCode: LocalDBFallbackReasonCode;
  generationBumped: boolean;
  resetFailedReason: string | null;
  updatedAt: number;
}

export interface LocalDBTelemetrySnapshot {
  localdb_mode: LocalDBMode;
  localdb_reason_code: LocalDBFallbackReasonCode;
  localdb_fallback_reason: string;
  localdb_generation_bumped: boolean;
  localdb_reset_failed: boolean;
}

const RESET_FAILED_REASON_KEY = "flashcard.localdb.resetFailedReason";

const listeners = new Set<(status: LocalDBRuntimeStatus) => void>();
const warnedKeys = new Set<string>();
const telemetryKeys = new Set<string>();

const readLocalStorage = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeLocalStorage = (key: string, value: string | null) => {
  if (typeof window === "undefined") return;
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // ignore localStorage write failures
  }
};

let currentStatus: LocalDBRuntimeStatus = {
  mode: "persistent",
  userId: null,
  dbName: null,
  fallbackReason: null,
  fallbackReasonCode: "none",
  generationBumped: false,
  resetFailedReason: readLocalStorage(RESET_FAILED_REASON_KEY),
  updatedAt: Date.now(),
};

export function getLocalDBRuntimeStatus(): LocalDBRuntimeStatus {
  return { ...currentStatus };
}

export function subscribeLocalDBRuntimeStatus(
  listener: (status: LocalDBRuntimeStatus) => void,
): () => void {
  listeners.add(listener);
  listener(getLocalDBRuntimeStatus());
  return () => listeners.delete(listener);
}

export function updateLocalDBRuntimeStatus(
  next: Partial<LocalDBRuntimeStatus>,
): LocalDBRuntimeStatus {
  currentStatus = {
    ...currentStatus,
    ...next,
    updatedAt: Date.now(),
  };
  listeners.forEach((listener) => {
    try {
      listener(getLocalDBRuntimeStatus());
    } catch (err) {
      console.error("[LocalDB] Failed to notify runtime status listener", err);
    }
  });
  return getLocalDBRuntimeStatus();
}

export function warnOncePerSession(
  key: string,
  message: string,
  error?: unknown,
): void {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  if (error !== undefined) {
    console.warn(message, error);
  } else {
    console.warn(message);
  }
}

export function telemetryOncePerSession(key: string): boolean {
  if (telemetryKeys.has(key)) return false;
  telemetryKeys.add(key);
  return true;
}

export function markLocalDBGenerationBumped(): void {
  updateLocalDBRuntimeStatus({ generationBumped: true });
}

export function saveLocalDBResetFailureReason(reason: string | null): void {
  writeLocalStorage(RESET_FAILED_REASON_KEY, reason);
  updateLocalDBRuntimeStatus({ resetFailedReason: reason });
}

export function clearLocalDBResetFailureReason(): void {
  saveLocalDBResetFailureReason(null);
}

export function getStoredLocalDBResetFailureReason(): string | null {
  return readLocalStorage(RESET_FAILED_REASON_KEY);
}

const toShortReason = (value: string | null): string => {
  if (!value) return "none";
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 120 ? `${compact.slice(0, 120)}...` : compact;
};

export function getLocalDBTelemetrySnapshot(): LocalDBTelemetrySnapshot {
  return {
    localdb_mode: currentStatus.mode,
    localdb_reason_code: currentStatus.fallbackReasonCode,
    localdb_fallback_reason: toShortReason(currentStatus.fallbackReason),
    localdb_generation_bumped: currentStatus.generationBumped,
    localdb_reset_failed: !!currentStatus.resetFailedReason,
  };
}



