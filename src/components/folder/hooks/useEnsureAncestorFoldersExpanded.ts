import React, { useEffect } from "react";
import type { Card, SelectedExplorerItem } from "@/types";
import type { FolderTreeNode } from "../explorer/model/utils";
import { getFolderId, getParentFolderId, normalizeFolderId } from "../explorer/model/utils";

interface UseEnsureAncestorFoldersExpandedParams {
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  treeFolders: FolderTreeNode[];
  treeCards: Card[];
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>;
}

function getAncestorFolderIds(folderId: string, treeFolders: FolderTreeNode[]): string[] {
  const ancestors: string[] = [];
  let currentId: string | null = folderId;
  while (currentId) {
    ancestors.push(currentId);
    const folder = treeFolders.find((f) => getFolderId(f) === currentId);
    if (!folder) break;
    currentId = normalizeFolderId(getParentFolderId(folder));
  }
  return ancestors;
}

function expandFolderIds(
  ancestorIds: string[],
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>,
) {
  setExpandedFolders((prev) => {
    const next = new Set(prev);
    let changed = false;
    for (const id of ancestorIds) {
      if (!next.has(id)) {
        next.add(id);
        changed = true;
      }
    }
    return changed ? next : prev;
  });
}

export function useEnsureAncestorFoldersExpanded({
  selectedFolderId,
  selectedItem,
  treeFolders,
  treeCards,
  setExpandedFolders,
}: UseEnsureAncestorFoldersExpandedParams) {
  useEffect(() => {
    if (!selectedFolderId) return;
    const ancestorIds = getAncestorFolderIds(selectedFolderId, treeFolders);
    expandFolderIds(ancestorIds, setExpandedFolders);
  }, [selectedFolderId, treeFolders, setExpandedFolders]);

  useEffect(() => {
    if (!selectedItem || selectedItem.type !== "card") return;
    const card = treeCards.find((c) => c.id === selectedItem.id);
    if (!card || !card.folderId) return;
    const ancestorIds = getAncestorFolderIds(card.folderId, treeFolders);
    expandFolderIds(ancestorIds, setExpandedFolders);
  }, [selectedItem, treeCards, treeFolders, setExpandedFolders]);
}
