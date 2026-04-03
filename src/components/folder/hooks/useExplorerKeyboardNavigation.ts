import type { FolderTreeNode } from "@/components/folder/explorer/model/utils";
import {
    getFolderId,
    hasOpenModalDialog,
    isTextInputTarget,
} from "@/components/folder/explorer/model/utils";
import type { ExplorerItem, SelectedExplorerItem } from "@/types";
import React, { useEffect, useRef } from "react";

interface UseExplorerKeyboardNavigationParams {
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  treeFolders: FolderTreeNode[];
  expandedFolders: Set<string>;
  treeRootRef: React.RefObject<HTMLDivElement | null>;
  rootFolders: FolderTreeNode[];
  getChildFolders: (parentId: string) => FolderTreeNode[];
  getFolderItems: (folderId: string | null) => ExplorerItem[];
  toggleFolder: (folderId: string) => void;
  onFolderSelect: (folderId: string | null) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
  handleCreateFolderAction: (parentId: string | null) => void;
  handleToolbarAddFile: () => void;
  handleDelete: (id: string, type: "folder" | "card") => void;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingName: React.Dispatch<React.SetStateAction<string>>;
}

const getExplorerItemId = (item: ExplorerItem): string => {
  const data = item.data;

  if (typeof data.id === "string") {
    return data.id;
  }

  if ("cardId" in data && typeof data.cardId === "string") {
    return data.cardId;
  }

  if ("documentId" in data && typeof data.documentId === "string") {
    return data.documentId;
  }

  return "";
};

const getSelectedEntityId = (
  item: SelectedExplorerItem | null | undefined,
): string | null => {
  if (!item || typeof item !== "object") return null;
  return "id" in item && typeof item.id === "string" ? item.id : null;
};

export function useExplorerKeyboardNavigation({
  selectedFolderId,
  selectedItem,
  treeFolders,
  expandedFolders,
  treeRootRef,
  rootFolders,
  getChildFolders,
  getFolderItems,
  toggleFolder,
  onFolderSelect,
  onItemSelect,
  handleCreateFolderAction,
  handleToolbarAddFile,
  handleDelete,
  setEditingId,
  setEditingName,
}: UseExplorerKeyboardNavigationParams) {
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});

  useEffect(() => {
    const handler = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handleArrowNavigation = (key: string, currentId: string) => {
      const flatList: Array<{
        id: string;
        type: "folder" | "card" | "document";
        parentId: string | null;
      }> = [];

      const addFolderAndChildren = (folderId: string | null) => {
        const folderList = folderId === null ? rootFolders : getChildFolders(folderId);

        folderList.forEach((folder) => {
          const id = getFolderId(folder);
          flatList.push({ id, type: "folder", parentId: folderId });

          if (expandedFolders.has(id)) {
            addFolderAndChildren(id);

            getFolderItems(id).forEach((item) => {
              flatList.push({
                id: getExplorerItemId(item),
                type: item.type,
                parentId: id,
              });
            });
          }
        });
      };

      addFolderAndChildren(null);

      getFolderItems(null).forEach((item) => {
        flatList.push({
          id: getExplorerItemId(item),
          type: item.type,
          parentId: null,
        });
      });

      const currentIndex = flatList.findIndex((item) => item.id === currentId);
      if (currentIndex === -1) return;

      const currentItem = flatList[currentIndex];

      if (key === "ArrowUp" && currentIndex > 0) {
        const prevItem = flatList[currentIndex - 1];
        if (prevItem.type === "folder") {
          onFolderSelect(prevItem.id);
        } else {
          onItemSelect({ type: prevItem.type, id: prevItem.id });
        }
      } else if (key === "ArrowDown" && currentIndex < flatList.length - 1) {
        const nextItem = flatList[currentIndex + 1];
        if (nextItem.type === "folder") {
          onFolderSelect(nextItem.id);
        } else {
          onItemSelect({ type: nextItem.type, id: nextItem.id });
        }
      } else if (key === "ArrowRight" && currentItem.type === "folder") {
        if (!expandedFolders.has(currentId)) {
          toggleFolder(currentId);
        } else {
          const children = getChildFolders(currentId);
          const folderItems = getFolderItems(currentId);

          if (children.length > 0) {
            onFolderSelect(getFolderId(children[0]));
          } else if (folderItems.length > 0) {
            onItemSelect({
              type: folderItems[0].type,
              id: getExplorerItemId(folderItems[0]),
            });
          }
        }
      } else if (key === "ArrowLeft") {
        if (currentItem.type === "folder" && expandedFolders.has(currentId)) {
          toggleFolder(currentId);
        } else if (currentItem.parentId) {
          onFolderSelect(currentItem.parentId);
        }
      }
    };

    keyHandlerRef.current = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;

      const target = e.target as HTMLElement;
      const treeRoot = treeRootRef.current;
      if (!treeRoot) return;

      const activeEl = document.activeElement as HTMLElement | null;
      const isTreeFocused =
        treeRoot.contains(target) || (activeEl ? treeRoot.contains(activeEl) : false);

      if (!isTreeFocused) return;
      if (isTextInputTarget(target)) return;
      if (hasOpenModalDialog()) return;

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        void handleCreateFolderAction(selectedFolderId ?? null);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        handleToolbarAddFile();
        return;
      }

      const currentSelectedEntityId = getSelectedEntityId(selectedItem);
      const currentId = currentSelectedEntityId ?? selectedFolderId;
      if (!currentId) return;

      const isCard = selectedItem?.type === "card";
      const isDoc = selectedItem?.type === "document";

      if (e.key === "F2") {
        e.preventDefault();
        if (!selectedFolderId || isCard || isDoc) return;

        const folder = treeFolders.find((f) => getFolderId(f) === selectedFolderId);
        const name = folder?.folderName || folder?.folder_name || "";
        setEditingId(currentId);
        setEditingName(name);
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();

        if (isCard) {
          void handleDelete(currentId, "card");
        } else if (isDoc) {
          /* ドキュメント削除は未実装 */
        } else {
          void handleDelete(currentId, "folder");
        }
      }

      if (e.key === "Enter" && isCard) {
        e.preventDefault();
        onItemSelect({ type: "card", id: currentId });
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        handleArrowNavigation(e.key, currentId);
      }
    };
  }, [
    selectedItem,
    selectedFolderId,
    treeFolders,
    expandedFolders,
    treeRootRef,
    rootFolders,
    getChildFolders,
    getFolderItems,
    toggleFolder,
    onItemSelect,
    onFolderSelect,
    handleCreateFolderAction,
    handleDelete,
    handleToolbarAddFile,
    setEditingId,
    setEditingName,
  ]);
}





