export const notifySelectedFolderChanged = (folderId: string | null) => {
  window.dispatchEvent(
    new CustomEvent("folders:selected-folder-changed", {
      detail: { folderId },
    }),
  );
};
