const LAST_SELECTED_FOLDER_KEY = "folder_selectedFolderId_work";

export const getLastSelectedFolderId = (): string | null => {
  if (typeof window === "undefined") return null;

  return window.localStorage.getItem(LAST_SELECTED_FOLDER_KEY);
};

export const setLastSelectedFolderId = (folderId: string | null) => {
  if (typeof window === "undefined") return;

  if (folderId) {
    window.localStorage.setItem(LAST_SELECTED_FOLDER_KEY, folderId);
    return;
  }

  window.localStorage.removeItem(LAST_SELECTED_FOLDER_KEY);
};
