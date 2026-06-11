const notifySelectedFolderChanged = (folderId: string | null) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("folders:selected-folder-changed", {
      detail: { folderId: folderId ?? null },
    }),
  );
};



export { notifySelectedFolderChanged };
