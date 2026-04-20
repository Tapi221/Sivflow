import {
  buildEntityRenameDeleteMenuActions,
  buildFolderMenuActions,
} from "@/components/folder/components/menus/explorerMenuActionBuilders";
import { beginInlineRename } from "@/components/folder/components/menus/explorerMenuStateHelpers";
import { SidebarEntityRow } from "@/components/folder/explorer/rows/SidebarEntityRow";
import {
  EXPLORER_ROW_CONTENT_CLASS,
  EXPLORER_ROW_ICON_SLOT_CLASS,
  EXPLORER_ROW_INPUT_CLASS,
  EXPLORER_ROW_TITLE_SLOT_CLASS,
  FOLDER_ROW_ICON_ACTIVE_CLASS,
  FOLDER_ROW_ICON_MUTED_CLASS,
  FOLDER_ROW_ICON_SIZE_CLASS,
  FOLDER_ROW_TITLE_CLASS,
} from "@/components/folder/explorer/rows/shared";
import { cn } from "@/lib/utils";
import type { SelectedExplorerItem } from "@/types";
import { FileText, FolderOutlineIcon, Layers } from "@/ui/icons";
import React from "react";
import type { NavigationListEntry } from "./RootFolderPanelList";

type RenameTarget = {
  id: string;
  type: "folder" | "cardSet" | "card" | "document";
};

interface RootFolderPanelRowProps {
  entry: NavigationListEntry;
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  selectedCardSetId?: string | null;
  openRowMenuId: string | null;
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
  attachInputRef: (node: HTMLInputElement | null) => void;
}

const hasSelectedItemId = (
  item: SelectedExplorerItem,
): item is Extract<SelectedExplorerItem, { id: string }> => {
  return item !== null && "id" in item;
};

export const RootFolderPanelRow = ({
  entry,
  selectedFolderId,
  selectedItem,
  selectedCardSetId = null,
  openRowMenuId,
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
  attachInputRef,
}: RootFolderPanelRowProps) => {
  const supportsContextMenuKind =
    entry.kind === "folder" ||
    entry.kind === "cardSet" ||
    entry.kind === "document";

  const menuId = supportsContextMenuKind ? `${entry.kind}:${entry.id}:panel` : null;
  const isEditing = supportsContextMenuKind && editingId === entry.id;
  const isMenuOpen = menuId !== null && openRowMenuId === menuId;

  const isSelected =
    entry.kind === "folder"
      ? selectedFolderId === entry.id
      : entry.kind === "cardSet"
        ? selectedCardSetId === entry.id ||
          (hasSelectedItemId(selectedItem) &&
            selectedItem.type === "cardSet" &&
            selectedItem.id === entry.id)
        : hasSelectedItemId(selectedItem) &&
          selectedItem.type === entry.kind &&
          selectedItem.id === entry.id;

  const Icon =
    entry.kind === "folder"
      ? FolderOutlineIcon
      : entry.kind === "cardSet"
        ? Layers
        : FileText;

  const closeMenu = React.useCallback(() => {
    setOpenRowMenuId(null);
  }, [setOpenRowMenuId]);

  const handleSelect = React.useCallback(() => {
    if (isEditing || isMenuOpen) return;

    if (entry.kind === "folder") {
      onSelectFolder(entry.id);
      return;
    }

    onItemSelect({ type: entry.kind, id: entry.id });
  }, [entry, isEditing, isMenuOpen, onItemSelect, onSelectFolder]);

  const handleContextMenuSelect = React.useCallback(() => {
    if (isEditing || isMenuOpen) return;

    // ルート一覧の folder は onSelectFolder が「選択」ではなく
    // ナビゲーション遷移を伴うため、右クリック時には呼ばない。
    if (entry.kind === "folder") return;

    onItemSelect({ type: entry.kind, id: entry.id });
  }, [entry, isEditing, isMenuOpen, onItemSelect]);

  const folderMenuActions = React.useMemo(
    () =>
      entry.kind === "folder"
        ? buildFolderMenuActions({
            onCreateSubfolder: canCreateFolder
              ? () => {
                  void handleCreateFolderAction(entry.id);
                }
              : undefined,
            onCreateCardSet: canCreateCardSet
              ? () => {
                  void handleCreateCardSetAction(entry.id);
                }
              : undefined,
            onRename: canRenameFolder
              ? () => {
                  beginInlineRename({
                    id: entry.id,
                    name: entry.name,
                    closeMenu,
                    setEditingId,
                    setEditingName,
                  });
                }
              : undefined,
            onDelete: canDeleteFolder
              ? () => {
                  handleDelete(entry.id, "folder");
                }
              : undefined,
          })
        : [],
    [
      canCreateCardSet,
      canCreateFolder,
      canDeleteFolder,
      canRenameFolder,
      closeMenu,
      entry,
      handleCreateCardSetAction,
      handleCreateFolderAction,
      handleDelete,
      setEditingId,
      setEditingName,
    ],
  );

  const resolvedMenuActions = React.useMemo(() => {
    if (entry.kind === "folder") return folderMenuActions;

    if (entry.kind === "cardSet") {
      return buildEntityRenameDeleteMenuActions({
        id: entry.id,
        name: entry.name,
        type: "cardSet",
        beforeRename: () => {
          onItemSelect({ type: "cardSet", id: entry.id });
        },
        closeMenu,
        setEditingId,
        setEditingName,
        canRename: canRenameCardSet,
        onDelete: canDeleteCardSet
          ? (id, type) => {
              handleDelete(id, type);
            }
          : undefined,
      });
    }

    if (entry.kind === "document") {
      return buildEntityRenameDeleteMenuActions({
        id: entry.id,
        name: entry.name,
        type: "document",
        beforeRename: () => {
          onItemSelect({ type: "document", id: entry.id });
        },
        closeMenu,
        setEditingId,
        setEditingName,
        canRename: canRenameDocument,
        onDelete: canDeleteDocument
          ? (id, type) => {
              handleDelete(id, type);
            }
          : undefined,
      });
    }

    return [];
  }, [
    canDeleteCardSet,
    canDeleteDocument,
    canRenameCardSet,
    canRenameDocument,
    closeMenu,
    entry,
    folderMenuActions,
    handleDelete,
    onItemSelect,
    setEditingId,
    setEditingName,
  ]);

  const hasContextMenu = resolvedMenuActions.length > 0;

  return (
    <SidebarEntityRow
      menuOpen={isMenuOpen}
      onMenuOpenChange={(open) => {
        setOpenRowMenuId(open && menuId ? menuId : null);
      }}
      menuActions={resolvedMenuActions}
      hasContextMenu={hasContextMenu}
      isEditing={isEditing}
      onContextMenuSelect={handleContextMenuSelect}
      rowRef={(node) => setRowRef(entry.id, node)}
      selected={isSelected}
      contentClassName={EXPLORER_ROW_CONTENT_CLASS}
      iconClassName={EXPLORER_ROW_ICON_SLOT_CLASS}
      titleSlotClassName={EXPLORER_ROW_TITLE_SLOT_CLASS}
      title={entry.name}
      titleClassName={cn(
        FOLDER_ROW_TITLE_CLASS,
        isSelected ? "font-medium" : "font-normal",
      )}
      icon={
        <Icon
          className={cn(
            "sidebar-icon",
            FOLDER_ROW_ICON_SIZE_CLASS,
            isSelected
              ? FOLDER_ROW_ICON_ACTIVE_CLASS
              : FOLDER_ROW_ICON_MUTED_CLASS,
          )}
        />
      }
      input={
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
            const isComposing = e.nativeEvent.isComposing || e.keyCode === 229;

            if (e.key === "Enter" && isComposing) return;

            if (e.key === "Enter") {
              e.preventDefault();
              editingNameRef.current = e.currentTarget.value;
              void handleRenameConfirm({
                id: entry.id,
                type: entry.kind,
              });
              return;
            }

            if (e.key === "Escape") {
              e.preventDefault();
              renameCancelledRef.current = true;
              setEditingId(null);
              setEditingName("");
            }
          }}
          onBlur={(e) => {
            editingNameRef.current = e.currentTarget.value;
            void handleRenameConfirm({
              id: entry.id,
              type: entry.kind,
            });
          }}
        />
      }
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if (e.defaultPrevented) return;
        handleSelect();
      }}
      onKeyDown={(e) => {
        if (isEditing || isMenuOpen) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleSelect();
        }
      }}
    />
  );
};
