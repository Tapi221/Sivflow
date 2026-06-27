import type { Folder } from "@/types";



const normalizeFolders = (folders: Folder[]): Folder[] => folders.map((folder) => ({ ...folder, parentFolderId: typeof folder.parentFolderId === "string" || folder.parentFolderId === null ? folder.parentFolderId : null, folderColor: typeof folder.folderColor === "string" ? folder.folderColor : undefined }));



export { normalizeFolders };
