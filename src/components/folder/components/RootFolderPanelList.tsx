import type { FolderTreeNode } from "@/components/folder/explorer/model/utils";
import { cn } from "@/lib/utils";
import type { SelectedExplorerItem } from "@/types";
import React from "react";
import { RootFolderPanelRow } from "./RootFolderPanelRow";

type RenameTarget = {
  id: string;
  type: "folder" | "cardSet" | "card" | "document";
};

export type NavigationListEntry =
  | {
      kind: "folder";
      id: string;
      name: string;
      folder: FolderTreeNode;
      contentCount?: number;
    }
  | {
      kind: "cardSet";
      id: string;
      name: string;
      contentCount?: number;
    }
  | {
      kind: "card" | "document";
      id: string;
      name: string;
    };

export interface RootFolderPanelListProps {
  entries: NavigationListEntry[];
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  selectedCardSetId?: string | null;
  openRowMenuId: string | null;
  emptyMessage?: string | null;
  setRowRef: (id: string, node: HTMLElement | null) => void;
  setOpenRowMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  onSelectFolder: (folderId: string | null) => void;
  onItemSelect: (item: {
    type: "card" | "cardSet" | "document";
    id: string;
  }) => void;
  canCreateFolder: boolean;
  canCreateCardSet: boolean;
  canRenameFolder: boolean;
  canDeleteFolder: boolean;
  canRenameCardSet: boolean;
  canDeleteCardSet: boolean;
  canRenameDocument: boolean;
  canDeleteDocument: boolean;
  handleCreateFolderAction: (parentId: string | null) => string;
  handleCreateCardSetAction: (folderId: string | null) => string | null;
  handleDelete: (
    id: string,
    type: "folder" | "cardSet" | "card" | "document",
  ) => void;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingName: React.Dispatch<React.SetStateAction<string>>;
  renameCancelledRef: React.MutableRefObject<boolean>;
  editingId: string | null;
  editingName: string;
  editingNameRef: React.MutableRefObject<string>;
  handleRenameConfirm: (target?: RenameTarget) => Promise<void>;
  className?: string;
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
  canCreateFolder,
  canCreateCardSet,
  canRenameFolder,
  canDeleteFolder,
  canRenameCardSet,
  canDeleteCardSet,
  canRenameDocument,
  canDeleteDocument,
  handleCreateFolderAction,
  handleCreateCardSetAction,
  handleDelete,
  setEditingId,
  setEditingName,
  renameCancelledRef,
  editingId,
  editingName,
  editingNameRef,
  handleRenameConfirm,
  className,
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
    <div
      className={cn("folder-panel-list h-full overflow-y-auto py-1", className)}
    >
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
          canCreateFolder={canCreateFolder}
          canCreateCardSet={canCreateCardSet}
          canRenameFolder={canRenameFolder}
          canDeleteFolder={canDeleteFolder}
          canRenameCardSet={canRenameCardSet}
          canDeleteCardSet={canDeleteCardSet}
          canRenameDocument={canRenameDocument}
          canDeleteDocument={canDeleteDocument}
          handleCreateFolderAction={handleCreateFolderAction}
          handleCreateCardSetAction={handleCreateCardSetAction}
          handleDelete={handleDelete}
          setEditingId={setEditingId}
          setEditingName={setEditingName}
          renameCancelledRef={renameCancelledRef}
          editingId={editingId}
          editingName={editingName}
          editingNameRef={editingNameRef}
          handleRenameConfirm={handleRenameConfirm}
          attachInputRef={attachInputRef}
        />
      ))}

      {entries.length === 0 && emptyMessage ? (
        <div className="px-2 py-2 font-normal text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : null}
    </div>
  );
};
