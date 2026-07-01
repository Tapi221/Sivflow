import { WEB_STORAGE_KEYS } from "@platform/storage/webStorageKeys.constants";
import type { AutoBackupRecord, BackupStorePort } from "@/application/ports/BackupStorePort";



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
    const raw = localStorage.getItem(WEB_STORAGE_KEYS.autoBackups);
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
    localStorage.setItem(WEB_STORAGE_KEYS.autoBackups, JSON.stringify(backups));
    return;
  } catch (error) {
    const isQuotaExceeded =
      error instanceof DOMException && error.name === "QuotaExceededError";

    if (!isQuotaExceeded) {
      throw error;
    }

    console.warn(
      "[LocalStorageBackupStore] QuotaExceededError. Keeping latest only.",
    );

    try {
      localStorage.setItem(
        WEB_STORAGE_KEYS.autoBackups,
        JSON.stringify(backups.slice(0, 1)),
      );
    } catch (fallbackError) {
      console.error(
        "[LocalStorageBackupStore] Failed to persist even 1 backup. Clearing key.",
        fallbackError,
      );

      try {
        localStorage.removeItem(WEB_STORAGE_KEYS.autoBackups);
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
    localStorage.setItem(WEB_STORAGE_KEYS.lastBackupAt, value);
  } catch {
    // noop
  }
};
const getLastBackupAt = (): string | null => {
  if (!isStorageAvailable()) {
    return null;
  }

  try {
    return localStorage.getItem(WEB_STORAGE_KEYS.lastBackupAt);
  } catch {
    return null;
  }
};
const clearBackups = (): void => {
  if (!isStorageAvailable()) {
    return;
  }

  try {
    localStorage.removeItem(WEB_STORAGE_KEYS.autoBackups);
  } catch {
    // noop
  }
};



const localStorageBackupStore: BackupStorePort = { isAvailable: isStorageAvailable, loadBackups, saveBackups, saveLastBackupAt, getLastBackupAt, clearBackups };



export { localStorageBackupStore };
