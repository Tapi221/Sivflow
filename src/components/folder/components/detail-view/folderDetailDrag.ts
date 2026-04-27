import type { ExplorerDetailRow } from "@/components/folder/explorer/model/detailRows";
import type { Folder } from "@/types";
import type { DragEvent as ReactDragEvent } from "react";
import type {
  ExplorerDetailDragPayload,
  ExplorerDetailDropPosition,
} from "./folderDetailTypes";

const getFolderParentId = (folder: Folder): string | null => {
  return (
    folder.parentFolderId ??
    (folder as unknown as { parent_folder_id?: string | null })
      .parent_folder_id ??
    null
  );
};

const getFolderStableId = (folder: Folder): string => {
  return folder.id || folder.folderId;
};

export const getDropPositionFromPointer = (
  row: ExplorerDetailRow,
  event: ReactDragEvent<HTMLElement>,
): ExplorerDetailDropPosition => {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio =
    rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;

  if (row.kind === "folder" && ratio >= 0.32 && ratio <= 0.68) {
    return "inside";
  }

  return ratio < 0.5 ? "before" : "after";
};

export const moveIdBeforeOrAfter = (
  orderedIds: string[],
  movingId: string,
  targetId: string,
  position: "before" | "after",
): string[] => {
  const withoutMoving = orderedIds.filter((id) => id !== movingId);
  const targetIndex = withoutMoving.indexOf(targetId);

  if (targetIndex < 0) {
    return [...withoutMoving, movingId];
  }

  const insertionIndex = position === "before" ? targetIndex : targetIndex + 1;
  return [
    ...withoutMoving.slice(0, insertionIndex),
    movingId,
    ...withoutMoving.slice(insertionIndex),
  ];
};

export const isSamePayloadAndRow = (
  payload: ExplorerDetailDragPayload,
  row: ExplorerDetailRow,
): boolean => {
  return payload.kind === row.kind && payload.id === row.id;
};

export const isFolderDescendantOf = (
  folders: Folder[],
  candidateFolderId: string,
  ancestorFolderId: string,
): boolean => {
  const parentById = new Map<string, string | null>();

  folders.forEach((folder) => {
    const folderId = getFolderStableId(folder);
    if (!folderId) return;

    parentById.set(folderId, getFolderParentId(folder));
  });

  const seenFolderIds = new Set<string>();
  let currentFolderId = parentById.get(candidateFolderId) ?? null;

  while (currentFolderId && !seenFolderIds.has(currentFolderId)) {
    if (currentFolderId === ancestorFolderId) return true;
    seenFolderIds.add(currentFolderId);
    currentFolderId = parentById.get(currentFolderId) ?? null;
  }

  return false;
};
