import { ContextMenu } from "@/components/folder/components/menus/ContextMenu";
import {
  buildFolderMenuActions,
  buildRenameDeleteMenuActions,
} from "@/components/folder/components/menus/explorerMenuActionBuilders";
import { useContextMenuAnchor } from "@/components/folder/components/menus/useContextMenuAnchor";
import { ExplorerRowContent } from "@/components/folder/explorer/rows/ExplorerRowContent";
import {
  EXPLORER_ROW_BASE_CLASS_NAME,
  EXPLORER_ROW_CONTENT_CLASS,
  EXPLORER_ROW_ICON_SLOT_CLASS,
  EXPLORER_ROW_INPUT_CLASS,
  FOLDER_ROW_ICON_ACTIVE_CLASS,
  FOLDER_ROW_ICON_MUTED_CLASS,
  FOLDER_ROW_ICON_SIZE_CLASS,
  FOLDER_ROW_TITLE_CLASS,
} from "@/components/folder/explorer/rows/shared";
import type { SelectedExplorerItem } from "@/types";
import { cn } from "@/lib/utils";
import { FileText, FolderOutlineIcon, Layers } from "@/ui/icons";
import React from "react";
import type { NavigationListEntry } from "./RootFolderPanelList";

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
  handleCreateFolderAction: (parentId: string | null) => string;
  handleCreateCardSetAction: (folderId: string | null) => string | null;
  handleDelete: (
    id: string,
    type: "folder" | "cardSet" | "card" | "document",
  ) => void;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingName: React.Dispatch<React.SetStateAction<string>>;
  editingNameRef: React.MutableRefObject<string>;
  editingId: string | null;
  editingName: string;
  handleRenameConfirm: (target?: any) => Promise<void>;
  attachInputRef: (node: HTMLInputElement | null) => void;
}

/**
 * RootFolderPanelList 内の各フォルダ行を管理するコンポーネント
 * フックを使用するため、map 内から子コンポーネントとして分離
 */
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
  handleCreateFolderAction,
  handleCreateCardSetAction,
  handleDelete,
  setEditingId,
  setEditingName,
  editingNameRef,
  editingId,
  editingName,
  handleRenameConfirm,
  attachInputRef,
}: RootFolderPanelRowProps) => {
  const isFolderEntry = entry.kind === "folder";
  const supportsContextMenu =
    entry.kind === "folder" ||
    entry.kind === "cardSet" ||
    entry.kind === "document";
  const menuId = supportsContextMenu ? `${entry.kind}:${entry.id}:panel` : null;
  const isEditing = supportsContextMenu && editingId === entry.id;
  const isMenuOpen = menuId !== null && openRowMenuId === menuId;
  const { anchorPoint, handleContextMenu, resetAnchor } =
    useContextMenuAnchor();

  const isSelected =
    entry.kind === "folder"
      ? selectedFolderId === entry.id
      : entry.kind === "cardSet"
        ? selectedCardSetId === entry.id ||
          (selectedItem?.type === "cardSet" && selectedItem.id === entry.id)
        : selectedItem?.type === entry.kind && selectedItem.id === entry.id;

  const Icon =
    entry.kind === "folder"
      ? FolderOutlineIcon
      : entry.kind === "cardSet"
        ? Layers
        : FileText;

  const handleSelect = React.useCallback(() => {
    if (isEditing || isMenuOpen) return;

    if (entry.kind === "folder") {
      onSelectFolder(entry.id);
      return;
    }

    onItemSelect({ type: entry.kind, id: entry.id });
  }, [entry, isEditing, isMenuOpen, onItemSelect, onSelectFolder]);

  const menuActions = React.useMemo(
    () =>
      entry.kind === "folder"
        ? buildFolderMenuActions({
            onCreateSubfolder: () => {
              void handleCreateFolderAction(entry.id);
            },
            onCreateCardSet: () => {
              void handleCreateCardSetAction(entry.id);
            },
            onRename: () => {
              setOpenRowMenuId(null);
              setEditingId(entry.id);
              setEditingName(entry.name);
              editingNameRef.current = entry.name;
            },
            onDelete: () => {
              handleDelete(entry.id, "folder");
            },
          })
        : [],
    [
      entry,
      editingNameRef,
      handleCreateCardSetAction,
      handleCreateFolderAction,
      handleDelete,
      setEditingId,
      setEditingName,
      setOpenRowMenuId,
    ],
  );

  const resolvedMenuActions = React.useMemo(() => {
    if (entry.kind === "folder") return menuActions;

    if (entry.kind === "cardSet") {
      return buildRenameDeleteMenuActions({
        onRename: () => {
          onItemSelect({ type: "cardSet", id: entry.id });
          setOpenRowMenuId(null);
          setEditingId(entry.id);
          setEditingName(entry.name);
          editingNameRef.current = entry.name;
        },
        onDelete: () => {
          handleDelete(entry.id, "cardSet");
        },
      });
    }

    if (entry.kind === "document") {
      return buildRenameDeleteMenuActions({
        onRename: () => {
          onItemSelect({ type: "document", id: entry.id });
          setOpenRowMenuId(null);
          setEditingId(entry.id);
          setEditingName(entry.name);
          editingNameRef.current = entry.name;
        },
        onDelete: () => {
          handleDelete(entry.id, "document");
        },
      });
    }

    return [];
  }, [
    entry,
    handleDelete,
    menuActions,
    onItemSelect,
    setEditingId,
    setEditingName,
    setOpenRowMenuId,
    editingNameRef,
  ]);

  return (
    <div
      ref={(node) => setRowRef(entry.id, node)}
      className={cn(
        EXPLORER_ROW_BASE_CLASS_NAME,
        "group relative flex h-8 w-full cursor-pointer items-center rounded-[4px] px-2 text-left",
        "hover:bg-[var(--sidebar-active-bg,#e7ebef)]",
        isSelected && "bg-[var(--sidebar-active-bg,#e7ebef)]",
      )}
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={(e) => {
        if (isEditing || isMenuOpen) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleSelect();
        }
      }}
      onContextMenu={(e) => {
        if (!supportsContextMenu || isEditing || !menuId) return;
        handleContextMenu(e);
        setOpenRowMenuId(menuId);
      }}
    >
      <div className={cn(EXPLORER_ROW_CONTENT_CLASS, "pr-8")}>
        <span className={EXPLORER_ROW_ICON_SLOT_CLASS}>
          <Icon
            className={cn(
              "sidebar-icon",
              FOLDER_ROW_ICON_SIZE_CLASS,
              isSelected
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
                void handleRenameConfirm({
                  id: entry.id,
                  type: entry.kind,
                });
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
              void handleRenameConfirm({
                id: entry.id,
                type: entry.kind,
              });
            }}
          />
        ) : (
          <div className="pointer-events-none flex min-w-0 flex-1 items-center">
            <ExplorerRowContent
              title={entry.name}
              titleClassName={cn(
                FOLDER_ROW_TITLE_CLASS,
                isSelected ? "font-medium" : "font-normal",
              )}
            />
          </div>
        )}
      </div>

      {supportsContextMenu ? (
        <ContextMenu
          open={isMenuOpen}
          anchorPoint={isMenuOpen ? anchorPoint : null}
          onOpenChange={(open) => {
            if (!open) resetAnchor();
            setOpenRowMenuId(open ? menuId : null);
          }}
          actions={resolvedMenuActions}
        />
      ) : null}
    </div>
  );
};
