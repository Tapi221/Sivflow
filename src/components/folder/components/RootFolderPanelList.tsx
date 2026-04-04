import type { FolderTreeNode } from "@/components/folder/explorer/model/utils";
import React from "react";
import { RootFolderPanelRow } from "./RootFolderPanelRow";

interface RootFolderPanelListProps {
  rootFolderPanels: Array<{ id: string; name: string; folder: FolderTreeNode }>;
  selectedFolderId: string | null;
  openRowMenuId: string | null;
  setOpenRowMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  onSelectFolder: (folderId: string | null) => void;
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
  rootFolderPanels,
  selectedFolderId,
  openRowMenuId,
  setOpenRowMenuId,
  onSelectFolder,
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
      {rootFolderPanels.map((panel) => (
        <RootFolderPanelRow
          key={panel.id}
          panel={panel}
          selectedFolderId={selectedFolderId}
          openRowMenuId={openRowMenuId}
          setOpenRowMenuId={setOpenRowMenuId}
          onSelectFolder={onSelectFolder}
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
    </div>
  );
};
