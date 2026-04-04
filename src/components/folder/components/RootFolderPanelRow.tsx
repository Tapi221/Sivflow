import { ContextMenu } from "@/components/folder/components/menus/ContextMenu";
import { buildFolderMenuActions } from "@/components/folder/components/menus/explorerMenuActionBuilders";
import { useContextMenuAnchor } from "@/components/folder/components/menus/useContextMenuAnchor";
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

interface RootFolderPanelRowProps {
  panel: { id: string; name: string };
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
  attachInputRef: (node: HTMLInputElement | null) => void;
}

/**
 * RootFolderPanelList 内の各フォルダ行を管理するコンポーネント
 * フックを使用するため、map 内から子コンポーネントとして分離
 */
export const RootFolderPanelRow = ({
  panel,
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
  attachInputRef,
}: RootFolderPanelRowProps) => {
  const menuId = `folder:${panel.id}:panel`;
  const isEditing = editingId === panel.id;
  const isMenuOpen = openRowMenuId === menuId;
  const { anchorPoint, handleContextMenu, resetAnchor } =
    useContextMenuAnchor();

  const menuActions = React.useMemo(
    () =>
      buildFolderMenuActions({
        onCreateSubfolder: () => {
          void handleCreateFolderAction(panel.id);
        },
        onCreateCardSet: () => {
          void handleCreateCardSetAction(panel.id);
        },
        onRename: () => {
          setOpenRowMenuId(null);
          setEditingId(panel.id);
          setEditingName(panel.name);
          editingNameRef.current = panel.name;
        },
        onDelete: () => {
          handleDelete(panel.id, "folder");
        },
      }),
    [
      editingNameRef,
      handleCreateCardSetAction,
      handleCreateFolderAction,
      handleDelete,
      panel.id,
      panel.name,
      setEditingId,
      setEditingName,
      setOpenRowMenuId,
    ],
  );

  const handleSelectFolder = React.useCallback(() => {
    if (isEditing || isMenuOpen) return;
    onSelectFolder(panel.id);
  }, [isEditing, isMenuOpen, onSelectFolder, panel.id]);

  return (
    <div
      className={cn(
        "sidebar-row group relative flex h-8 w-full cursor-pointer items-center rounded-[4px] px-2 text-left",
        "hover:bg-[var(--sidebar-active-bg,#e7ebef)]",
        selectedFolderId === panel.id && "bg-[var(--sidebar-active-bg,#e7ebef)]",
      )}
      role="button"
      tabIndex={0}
      onClick={handleSelectFolder}
      onKeyDown={(e) => {
        if (isEditing || isMenuOpen) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleSelectFolder();
        }
      }}
      onContextMenu={(e) => {
        if (isEditing) return;
        handleContextMenu(e);
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
        anchorPoint={isMenuOpen ? anchorPoint : null}
        onOpenChange={(open) => {
          if (!open) resetAnchor();
          setOpenRowMenuId(open ? menuId : null);
        }}
        actions={menuActions}
      />
    </div>
  );
};
