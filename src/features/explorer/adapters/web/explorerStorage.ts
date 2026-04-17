import { WEB_STORAGE_KEYS } from "@constants/web/storage";

export const getLastSelectedFolderId = (): string | null => {
  if (typeof window === "undefined") return null;

  return window.localStorage.getItem(WEB_STORAGE_KEYS.lastSelectedFolderId);
};

export const setLastSelectedFolderId = (folderId: string | null) => {
  if (typeof window === "undefined") return;

  if (folderId) {
    window.localStorage.setItem(WEB_STORAGE_KEYS.lastSelectedFolderId, folderId);
    return;
  }

  window.localStorage.removeItem(WEB_STORAGE_KEYS.lastSelectedFolderId);
};
