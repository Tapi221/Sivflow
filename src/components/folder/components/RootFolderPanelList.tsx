import React from "react";
import type { FolderTreeNode } from "@/components/folder/explorer/model/utils";
import { RootFolderPanelRow } from "./RootFolderPanelRow";
import { cn } from "@/lib/utils";
import type { SelectedExplorerItem } from "@/types";

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
  selectedFolderId?: string | null;
  selectedItem?: SelectedExplorerItem;
  selectedCardSetId?: string | null;
  openRowMenuId?: string | null;
  emptyMessage?: string | null;
  setRowRef?: (id: string, node: HTMLElement | null) => void;
  setOpenRowMenuId?: React.Dispatch<React.SetStateAction<string | null>>;
  onSelectFolder?: (folderId: string | null) => void;
  onFolderOpen?: (folderId: string) => void;
  onCardSetOpen?: (cardSetId: string) => void;
  onDocumentOpen?: (documentId: string) => void;
  onCardOpen?: (cardId: string) => void;
  onItemSelect?: (item: {
    type: "card" | "cardSet" | "document";
    id: string;
  }) => void;
  canCreateFolder?: boolean;
  canCreateCardSet?: boolean;
  canRenameFolder?: boolean;
  canDeleteFolder?: boolean;
  canRenameCardSet?: boolean;
  canDeleteCardSet?: boolean;
  canRenameDocument?: boolean;
  canDeleteDocument?: boolean;
  handleCreateFolderAction?: (parentId: string | null) => string;
  handleCreateCardSetAction?: (folderId: string | null) => string | null;
  handleDelete?: (
    id: string,
    type: "folder" | "cardSet" | "card" | "document",
  ) => void;
  setEditingId?: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingName?: React.Dispatch<React.SetStateAction<string>>;
  renameCancelledRef?: React.MutableRefObject<boolean>;
  editingId?: string | null;
  editingName?: string;
  editingNameRef?: React.MutableRefObject<string>;
  handleRenameConfirm?: (target?: RenameTarget) => Promise<void>;
  className?: string;
}

const noopSetRowRef = () => undefined;
const noopSetOpenRowMenuId: React.Dispatch<React.SetStateAction<string | null>> = () => undefined;
const noopSetEditingId: React.Dispatch<React.SetStateAction<string | null>> = () => undefined;
const noopSetEditingName: React.Dispatch<React.SetStateAction<string>> = () => undefined;

/**
 * ルートフォルダ（セクションリスト）を表示するパネルリスト
 */
export const RootFolderPanelList = ({
  entries,
  selectedFolderId = null,
  selectedItem = null,
  selectedCardSetId = null,
  openRowMenuId = null,
  emptyMessage = null,
  setRowRef = noopSetRowRef,
  setOpenRowMenuId = noopSetOpenRowMenuId,
  onSelectFolder,
  onFolderOpen,
  onCardSetOpen,
  onDocumentOpen,
  onCardOpen,
  onItemSelect,
  canCreateFolder = false,
  canCreateCardSet = false,
  canRenameFolder = false,
  canDeleteFolder = false,
  canRenameCardSet = false,
  canDeleteCardSet = false,
  canRenameDocument = false,
  canDeleteDocument = false,
  handleCreateFolderAction = () => "",
  handleCreateCardSetAction = () => null,
  handleDelete = () => undefined,
  setEditingId = noopSetEditingId,
  setEditingName = noopSetEditingName,
  renameCancelledRef,
  editingId = null,
  editingName = "",
  editingNameRef,
  handleRenameConfirm = async () => undefined,
  className,
}: RootFolderPanelListProps) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const fallbackRenameCancelledRef = React.useRef(false);
  const fallbackEditingNameRef = React.useRef("");
  const resolvedRenameCancelledRef = renameCancelledRef ?? fallbackRenameCancelledRef;
  const resolvedEditingNameRef = editingNameRef ?? fallbackEditingNameRef;

  const handleSelectFolder = React.useCallback(
    (folderId: string | null) => {
      if (folderId) {
        onFolderOpen?.(folderId);
      }
      onSelectFolder?.(folderId);
    },
    [onFolderOpen, onSelectFolder],
  );

  const handleItemSelect = React.useCallback(
    (item: { type: "card" | "cardSet" | "document"; id: string }) => {
      if (item.type === "cardSet") onCardSetOpen?.(item.id);
      if (item.type === "document") onDocumentOpen?.(item.id);
      if (item.type === "card") onCardOpen?.(item.id);
      onItemSelect?.(item);
    },
    [onCardOpen, onCardSetOpen, onDocumentOpen, onItemSelect],
  );

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

  const content = (
    <>
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
          onSelectFolder={handleSelectFolder}
          onItemSelect={handleItemSelect}
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
          renameCancelledRef={resolvedRenameCancelledRef}
          editingId={editingId}
          editingName={editingName}
          editingNameRef={resolvedEditingNameRef}
          handleRenameConfirm={handleRenameConfirm}
          attachInputRef={attachInputRef}
        />
      ))}

      {entries.length === 0 && emptyMessage ? (
        <div className="px-2 py-2 font-normal text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : null}
    </>
  );

  return (
    <div
      className={cn("folder-panel-list h-full overflow-y-auto py-1", className)}
    >
      {content}
    </div>
  );
};
