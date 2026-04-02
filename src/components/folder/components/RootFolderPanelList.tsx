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
import { FolderOutlineIcon, MoreVertical } from "@/ui/icons";
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
  pinnedItems?: Array<{ type: "folder" | "card" | "document"; id: string }>;
  onPinItem?: (item: { type: "folder" | "card" | "document"; id: string }) => void;
  onUnpinItem?: (item: { type: "folder" | "card" | "document"; id: string }) => void;
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
  pinnedItems,
  onPinItem,
  onUnpinItem,
  setEditingId,
  setEditingName,
  editingNameRef,
  editingId,
  editingName,
  handleRenameConfirm,
}: RootFolderPanelListProps) {
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
    <div className="h-full overflow-y-auto px-1 py-1">
      {rootFolderPanels.map((panel) => {
        const isEditing = editingId === panel.id;
        const menuId = `folder:${panel.id}:panel`;
        const isMenuOpen = openRowMenuId === menuId;
        const isPinned =
          pinnedItems?.some(
            (item) => item.type === "folder" && item.id === panel.id,
          ) ?? false;

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

            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
              <ContextMenu
                open={isMenuOpen}
                onOpenChange={(open) => {
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
                isPinned={isPinned}
                onTogglePin={() => {
                  if (isPinned) onUnpinItem?.({ type: "folder", id: panel.id });
                  else onPinItem?.({ type: "folder", id: panel.id });
                }}
              >
                <button
                  type="button"
                  aria-label="フォルダメニューを開く"
                  className={cn(
                    "pointer-events-auto grid h-7 w-7 place-items-center rounded-md text-[var(--sidebar-text-muted,#6e6e80)] hover:bg-[var(--sidebar-active-bg,#e7ebef)] hover:text-[var(--sidebar-text,#202123)]",
                    "opacity-0 group-hover:opacity-100",
                    isMenuOpen && "opacity-100",
                  )}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </ContextMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
}
