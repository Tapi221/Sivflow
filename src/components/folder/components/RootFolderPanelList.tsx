import { ContextMenu } from "@/components/folder/components/menus/ContextMenu";
import type { FolderTreeNode } from "@/components/folder/explorer/model/utils";
import { ExplorerRowContent } from "@/components/folder/explorer/rows/ExplorerRowContent";
import {
  EXPLORER_ROW_CONTENT_CLASS,
  EXPLORER_ROW_ICON_SLOT_CLASS,
  EXPLORER_ROW_INPUT_CLASS,
  FOLDER_ROW_ICON_ACTIVE_CLASS,
  FOLDER_ROW_ICON_MUTED_CLASS,
  FOLDER_ROW_ICON_SIZE_CLASS,
  FOLDER_ROW_TITLE_CLASS,
} from "@/components/folder/explorer/rows/shared";
import { cn } from "@/lib/utils";
import { FolderOutlineIcon } from "@/ui/icons";
import React from "react";

interface RootFolderPanelListProps {
  rootFolderPanels: Array<{ id: string; name: string; folder: FolderTreeNode }>;
  selectedFolderId: string | null;
  openRowMenuId: string | null;
  setOpenRowMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  onSelectFolder: (folderId: string) => void;
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

export function RootFolderPanelList({
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
}: RootFolderPanelListProps) {
  const [menuAnchor, setMenuAnchor] = React.useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
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
        // no-op: setSelectionRange をサポートしない環境がある
      }
    },
    [editingId],
  );

  return (
    <div className="h-full overflow-y-auto py-1">
      {rootFolderPanels.map((panel) => {
        const isEditing = editingId === panel.id;
        const menuId = `folder:${panel.id}:panel`;
        const isMenuOpen = openRowMenuId === menuId;

        return (
          <div
            key={panel.id}
            className={cn(
              "sidebar-row group relative flex h-8 w-full cursor-pointer items-center rounded-[4px] px-2 text-left",
              "hover:bg-[var(--sidebar-active-bg,#e7ebef)]",
              selectedFolderId === panel.id &&
                "bg-[var(--sidebar-active-bg,#e7ebef)]",
            )}
            role="button"
            tabIndex={0}
            onClick={() => {
              if (isEditing || isMenuOpen) return;
              onSelectFolder(panel.id);
            }}
            onKeyDown={(e) => {
              if (isEditing || isMenuOpen) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectFolder(panel.id);
              }
            }}
            onContextMenu={(e) => {
              if (isEditing) return;
              e.preventDefault();
              e.stopPropagation();
              setMenuAnchor({ id: menuId, x: e.clientX, y: e.clientY });
              setOpenRowMenuId(menuId);
            }}
          >
            <div className={cn(EXPLORER_ROW_CONTENT_CLASS, "pr-8")}>
              <span className={EXPLORER_ROW_ICON_SLOT_CLASS}>
                <FolderOutlineIcon
                  className={cn(
                    "sidebar-icon",
                    FOLDER_ROW_ICON_SIZE_CLASS,
                    selectedFolderId === panel.id
                      ? FOLDER_ROW_ICON_ACTIVE_CLASS
                      : FOLDER_ROW_ICON_MUTED_CLASS,
                  )}
                />
              </span>

              {isEditing ? (
                <input
                  ref={attachInputRef}
                  className={EXPLORER_ROW_INPUT_CLASS}
                  style={{ userSelect: "text", WebkitUserSelect: "text" }}
                  value={editingName}
                  onFocus={(e) => {
                    e.currentTarget.select();
                  }}
                  onMouseUp={(e) => {
                    e.preventDefault();
                  }}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    editingNameRef.current = nextName;
                    setEditingName(nextName);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    const isComposing =
                      e.nativeEvent.isComposing || e.keyCode === 229;

                    if (e.key === "Enter" && isComposing) return;

                    if (e.key === "Enter") {
                      e.preventDefault();
                      editingNameRef.current = e.currentTarget.value;
                      void handleRenameConfirm();
                      return;
                    }

                    if (e.key === "Escape") {
                      e.preventDefault();
                      setEditingId(null);
                      setEditingName("");
                    }
                  }}
                  onBlur={(e) => {
                    editingNameRef.current = e.currentTarget.value;
                    void handleRenameConfirm();
                  }}
                />
              ) : (
                <div className="pointer-events-none flex min-w-0 flex-1 items-center">
                  <ExplorerRowContent
                    title={panel.name}
                    titleClassName={cn(
                      FOLDER_ROW_TITLE_CLASS,
                      selectedFolderId === panel.id ? "font-medium" : "font-normal",
                    )}
                  />
                </div>
              )}
            </div>
            <ContextMenu
              open={isMenuOpen}
              anchorPoint={
                menuAnchor?.id === menuId
                  ? { x: menuAnchor.x, y: menuAnchor.y }
                  : null
              }
              onOpenChange={(open) => {
                if (!open && menuAnchor?.id === menuId) setMenuAnchor(null);
                setOpenRowMenuId(open ? menuId : null);
              }}
              type="folder"
              onCreateSubfolder={() => void handleCreateFolderAction(panel.id)}
              onCreateCardSet={() => void handleCreateCardSetAction(panel.id)}
              onRename={() => {
                setOpenRowMenuId(null);
                setEditingId(panel.id);
                setEditingName(panel.name);
                editingNameRef.current = panel.name;
              }}
              onDelete={() => handleDelete(panel.id, "folder")}
            />
          </div>
        );
      })}
    </div>
  );
}
