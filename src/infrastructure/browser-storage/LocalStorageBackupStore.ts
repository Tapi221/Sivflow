import type {
  AutoBackupRecord,
  BackupStorePort,
} from "@/application/ports/BackupStorePort";

const BACKUP_STORAGE_KEY = "app:autoBackups";
const LAST_BACKUP_KEY = "app:lastBackupAt";

const isStorageAvailable = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const storage = window.localStorage;
    const testKey = "__storage_test__";
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch (error) {
    if (!(error instanceof DOMException)) {
      return false;
    }

    return (
      error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED"
    );
  }
};

const loadBackups = (): AutoBackupRecord[] => {
  if (!isStorageAvailable()) {
    return [];
  }

  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AutoBackupRecord[]) : [];
  } catch {
    return [];
  }
};

const saveBackups = (backups: AutoBackupRecord[]): void => {
  if (!isStorageAvailable()) {
    return;
  }

  try {
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backups));
    return;
  } catch (error) {
    const isQuotaExceeded =
      error instanceof DOMException && error.name === "QuotaExceededError";

    if (!isQuotaExceeded) {
      throw error;
    }

    console.warn("[LocalStorageBackupStore] QuotaExceededError. Keeping latest only.");

    try {
      localStorage.setItem(
        BACKUP_STORAGE_KEY,
        JSON.stringify(backups.slice(0, 1)),
      );
    } catch (fallbackError) {
      console.error(
        "[LocalStorageBackupStore] Failed to persist even 1 backup. Clearing key.",
        fallbackError,
      );

      try {
        localStorage.removeItem(BACKUP_STORAGE_KEY);
      } catch {
        // noop
      }
    }
  }
};

const saveLastBackupAt = (value: string): void => {
  if (!isStorageAvailable()) {
    return;
  }

  try {
    localStorage.setItem(LAST_BACKUP_KEY, value);
  } catch {
    // noop
  }
};

const getLastBackupAt = (): string | null => {
  if (!isStorageAvailable()) {
    return null;
  }

  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
};

const clearBackups = (): void => {
  if (!isStorageAvailable()) {
    return;
  }

  try {
    localStorage.removeItem(BACKUP_STORAGE_KEY);
  } catch {
    // noop
  }
};

export const localStorageBackupStore: BackupStorePort = {
  isAvailable: isStorageAvailable,
  loadBackups,
  saveBackups,
  saveLastBackupAt,
  getLastBackupAt,
  clearBackups,
};
