const STORAGE_KEY = "folder_selectedFolderId_work";

export const getLastSelectedFolderId = () => {
  return localStorage.getItem(STORAGE_KEY);
};

export const setLastSelectedFolderId = (folderId: string | null) => {
  if (folderId) {
    localStorage.setItem(STORAGE_KEY, folderId);
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
};
