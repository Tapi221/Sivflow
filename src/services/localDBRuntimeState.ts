type LocalDBMode = "persistent" | "fallback";
type LocalDBFallbackReasonCode = | "none" | "backing_store_open_error" | "quota_exceeded" | "indexeddb_blocked" | "upgrade_needed_or_blocked" | "unknown";
interface LocalDBRuntimeStatus {
  mode: LocalDBMode;
  userId: string | null;
  dbName: string | null;
  fallbackReason: string | null;
  fallbackReasonCode: LocalDBFallbackReasonCode;
  generationBumped: boolean;
  resetFailedReason: string | null;
  updatedAt: number;
}
interface LocalDBTelemetrySnapshot {
  localdb_mode: LocalDBMode;
  localdb_reason_code: LocalDBFallbackReasonCode;
  localdb_fallback_reason: string;
  localdb_generation_bumped: boolean;
  localdb_reset_failed: boolean;
}



const RESET_FAILED_REASON_KEY = "sivflow.localdb.resetFailedReason";
const LEGACY_RESET_FAILED_REASON_KEY = "flashcard.localdb.resetFailedReason";
const listeners = new Set<(status: LocalDBRuntimeStatus) => void>();
const warnedKeys = new Set<string>();
const telemetryKeys = new Set<string>();
let currentStatus: LocalDBRuntimeStatus = {
  mode: "persistent",
  userId: null,
  dbName: null,
  fallbackReason: null,
  fallbackReasonCode: "none",
  generationBumped: false,
  resetFailedReason: (() => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(RESET_FAILED_REASON_KEY) ?? window.localStorage.getItem(LEGACY_RESET_FAILED_REASON_KEY);
    } catch {
      return null;
    }
  })(),
  updatedAt: Date.now(),
};



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
    // localStorage への書き込み失敗は無視します。
  }
};
const readResetFailedReason = (): string | null => readLocalStorage(RESET_FAILED_REASON_KEY) ?? readLocalStorage(LEGACY_RESET_FAILED_REASON_KEY);
const toShortReason = (value: string | null): string => {
  if (!value) return "none";
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 120 ? `${compact.slice(0, 120)}...` : compact;
};
const getLocalDBRuntimeStatus = () => {
  return { ...currentStatus };
};
const subscribeLocalDBRuntimeStatus = (listener: (status: LocalDBRuntimeStatus) => void): (() => void) => {
  listeners.add(listener);
  listener(getLocalDBRuntimeStatus());
  return () => {
    listeners.delete(listener);
  };
};
const updateLocalDBRuntimeStatus = (next: Partial<LocalDBRuntimeStatus>) => {
  currentStatus = { ...currentStatus, ...next, updatedAt: Date.now() };
  listeners.forEach((listener) => {
    try {
      listener(getLocalDBRuntimeStatus());
    } catch (err) {
      console.error("[LocalDB] runtime status listener への通知に失敗しました", err);
    }
  });
  return getLocalDBRuntimeStatus();
};
const warnOncePerSession = (key: string, message: string, error?: unknown) => {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  if (error !== undefined) {
    console.warn(message, error);
  } else {
    console.warn(message);
  }
};
const telemetryOncePerSession = (key: string) => {
  if (telemetryKeys.has(key)) return false;
  telemetryKeys.add(key);
  return true;
};
const markLocalDBGenerationBumped = () => {
  updateLocalDBRuntimeStatus({ generationBumped: true });
};
const saveLocalDBResetFailureReason = (reason: string | null) => {
  writeLocalStorage(RESET_FAILED_REASON_KEY, reason);
  writeLocalStorage(LEGACY_RESET_FAILED_REASON_KEY, null);
  updateLocalDBRuntimeStatus({ resetFailedReason: reason });
};
const clearLocalDBResetFailureReason = () => {
  saveLocalDBResetFailureReason(null);
};
const getStoredLocalDBResetFailureReason = () => {
  return readResetFailedReason();
};
const getLocalDBTelemetrySnapshot = (): LocalDBTelemetrySnapshot => {
  return { localdb_mode: currentStatus.mode, localdb_reason_code: currentStatus.fallbackReasonCode, localdb_fallback_reason: toShortReason(currentStatus.fallbackReason), localdb_generation_bumped: currentStatus.generationBumped, localdb_reset_failed: Boolean(currentStatus.resetFailedReason) };
};



export { getLocalDBRuntimeStatus, subscribeLocalDBRuntimeStatus, updateLocalDBRuntimeStatus, warnOncePerSession, telemetryOncePerSession, markLocalDBGenerationBumped, saveLocalDBResetFailureReason, clearLocalDBResetFailureReason, getStoredLocalDBResetFailureReason, getLocalDBTelemetrySnapshot };


export type { LocalDBMode, LocalDBFallbackReasonCode, LocalDBRuntimeStatus, LocalDBTelemetrySnapshot };
