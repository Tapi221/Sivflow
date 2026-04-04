import type { FolderTreeNode } from "@/components/folder/explorer/model/utils";
import type { SelectedExplorerItem } from "@/types";
import React from "react";
import { RootFolderPanelRow } from "./RootFolderPanelRow";

export type NavigationListEntry =
  | {
      kind: "folder";
      id: string;
      name: string;
      folder: FolderTreeNode;
    }
  | {
      kind: "cardSet" | "card" | "document";
      id: string;
      name: string;
    };

interface RootFolderPanelListProps {
  entries: NavigationListEntry[];
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  selectedCardSetId?: string | null;
  openRowMenuId: string | null;
  emptyMessage?: string | null;
  setRowRef: (id: string, node: HTMLElement | null) => void;
  setOpenRowMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  onSelectFolder: (folderId: string | null) => void;
  onItemSelect: (item: { type: "card" | "cardSet" | "document"; id: string }) => void;
  handleCreateFolderAction: (parentId: string | null) => string;
  handleCreateCardSetAction: (folderId: string | null) => string | null;
  handleDelete: (id: string, type: "folder" | "card") => void;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingName: React.Dispatch<React.SetStateAction<string>>;
  editingNameRef: React.MutableRefObject<string>;
  editingId: string | null;
  editingName: string;
  handleRenameConfirm: () => Promise<void>;
}

/**
 * ルートフォルダ（セクションリスト）を表示するパネルリスト
 */
export const RootFolderPanelList = ({
  entries,
  selectedFolderId,
  selectedItem,
  selectedCardSetId = null,
  openRowMenuId,
  emptyMessage = null,
  setRowRef,
  setOpenRowMenuId,
  onSelectFolder,
  onItemSelect,
  handleCreateFolderAction,
  handleCreateCardSetAction,
  handleDelete,
  setEditingId,
  setEditingName,
  editingNameRef,
  editingId,
  editingName,
  handleRenameConfirm,
}: RootFolderPanelListProps) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const attachInputRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (!node || !editingId) return;
      node.focus({ preventScroll: true });
      node.select();
      try {
        node.setSelectionRange(0, node.value.length);
      } catch {
        // no-op
      }
    },
    [editingId],
  );

  return (
    <div className="h-full overflow-y-auto py-1">
      {entries.map((entry) => (
        <RootFolderPanelRow
          key={`${entry.kind}:${entry.id}`}
          entry={entry}
          selectedFolderId={selectedFolderId}
          selectedItem={selectedItem}
          selectedCardSetId={selectedCardSetId}
          openRowMenuId={openRowMenuId}
          setRowRef={setRowRef}
          setOpenRowMenuId={setOpenRowMenuId}
          onSelectFolder={onSelectFolder}
          onItemSelect={onItemSelect}
          handleCreateFolderAction={handleCreateFolderAction}
          handleCreateCardSetAction={handleCreateCardSetAction}
          handleDelete={handleDelete}
          setEditingId={setEditingId}
          setEditingName={setEditingName}
          editingNameRef={editingNameRef}
          editingId={editingId}
          editingName={editingName}
          handleRenameConfirm={handleRenameConfirm}
          attachInputRef={attachInputRef}
        />
      ))}

      {entries.length === 0 && emptyMessage ? (
        <div className="px-2 py-2 text-sm text-muted-foreground font-normal">
          {emptyMessage}
        </div>
      ) : null}
    </div>
  );
};
