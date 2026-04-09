import type { Folder } from "@/types";

export const normalizeFolders = (folders: Folder[]) => {
  return folders.map((folder) => ({
    ...folder,
    parentFolderId:
      typeof folder.parentFolderId === "string" || folder.parentFolderId === null
        ? folder.parentFolderId
        : null,
    folderColor:
      typeof folder.folderColor === "string" ? folder.folderColor : undefined,
  }));
};
