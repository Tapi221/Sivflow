import {
  buildCardSetById,
  resolveCardFolderId,
} from "@/domain/card/selectors/cardFolder";
import type { FolderTreeNode } from "@/components/folder/explorer/model/utils";
import {
  getFolderId,
  getParentFolderId,
  normalizeFolderId,
} from "@/components/folder/explorer/model/utils";
import type { Card, CardSet, SelectedExplorerItem } from "@/types";
import React, { useEffect, useMemo } from "react";

interface UseEnsureAncestorFoldersExpandedParams {
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  treeFolders: FolderTreeNode[];
  treeCards: Card[];
  treeCardSets?: CardSet[];
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const getAncestorFolderIds = (
  folderId: string,
  treeFolders: FolderTreeNode[],
) => {
  const ancestors: string[] = [];
  let currentId: string | null = folderId;
  while (currentId) {
    ancestors.push(currentId);
    const folder = treeFolders.find((f) => getFolderId(f) === currentId);
    if (!folder) break;
    currentId = normalizeFolderId(getParentFolderId(folder));
  }
  return ancestors;
};

const expandFolderIds = (
  ancestorIds: string[],
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>,
) => {
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
};

export const useEnsureAncestorFoldersExpanded = ({
  selectedFolderId,
  selectedItem,
  treeFolders,
  treeCards,
  treeCardSets = [],
  setExpandedFolders,
}: UseEnsureAncestorFoldersExpandedParams) => {
  const cardSetById = useMemo(() => {
    const activeCardSets = treeCardSets.filter((cardSet) => !cardSet.isDeleted);
    return buildCardSetById(activeCardSets);
  }, [treeCardSets]);

  useEffect(() => {
    if (!selectedFolderId) return;
    const ancestorIds = getAncestorFolderIds(selectedFolderId, treeFolders);
    expandFolderIds(ancestorIds, setExpandedFolders);
  }, [selectedFolderId, treeFolders, setExpandedFolders]);

  useEffect(() => {
    if (!selectedItem || selectedItem.type !== "card") return;
    const card = treeCards.find((c) => c.id === selectedItem.id);
    if (!card) return;
    const resolvedFolderId = resolveCardFolderId(card, cardSetById);
    if (!resolvedFolderId) return;
    const ancestorIds = getAncestorFolderIds(resolvedFolderId, treeFolders);
    expandFolderIds(ancestorIds, setExpandedFolders);
  }, [selectedItem, treeCards, treeFolders, setExpandedFolders, cardSetById]);
};
