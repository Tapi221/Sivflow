export type FolderDragPayload = { entity: { type: "folder"; id: string; }; from: { at: "layered-directory-sidebar"; }; };

export const createFolderDragPayload = (folderId: string): FolderDragPayload => ({ entity: { type: "folder", id: folderId }, from: { at: "layered-directory-sidebar" } });

export const resolveFolderDragSourceId = (folderId: string | null): string | null => folderId && folderId.trim() ? folderId : null;
