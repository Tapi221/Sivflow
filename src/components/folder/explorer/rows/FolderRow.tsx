import { buildFolderMenuActions } from "@/components/folder/components/menus/explorerMenuActionBuilders";
import { beginInlineRename } from "@/components/folder/components/menus/explorerMenuStateHelpers";
import {
  getParentFolderId,
  normalizeFolderId,
  ROOT_FOLDER_ID,
  type FolderTreeNode,
} from "@/components/folder/explorer/model/utils";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  FolderIcon,
  FolderOutlineIcon,
} from "@/ui/icons";
import React from "react";
import { ExplorerRow } from "./ExplorerRow";
import { ExplorerRowContent } from "./ExplorerRowContent";
import { SidebarTreeRow } from "./SidebarTreeRow";
import {
  EXPLORER_ROW_CONTENT_CLASS,
  EXPLORER_ROW_ICON_SLOT_CLASS,
  EXPLORER_ROW_INPUT_CLASS,
  EXPLORER_ROW_LEADING_SLOT_CLASS,
  EXPLORER_ROW_MOBILE_NAV_TRAILING_PADDING_CLASS,
  EXPLORER_ROW_TITLE_SLOT_CLASS,
  FOLDER_ROW_ICON_ACTIVE_CLASS,
  FOLDER_ROW_ICON_MUTED_CLASS,
  FOLDER_ROW_ICON_SIZE_CLASS,
  FOLDER_ROW_TITLE_CLASS,
} from "./shared";

type FolderRowFolder = FolderTreeNode & {
  id?: string;
  folderId?: string;
  folderName?: string;
  folder_name?: string;
  __optimistic?: boolean;
};

interface FolderRowProps {
  folder: FolderTreeNode;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  isEditing: boolean;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editingName: string;
  setEditingName: (name: string) => void;
  editingNameRef: React.MutableRefObject<string>;
  editInputRef: React.MutableRefObject<HTMLInputElement | null>;
  onToggle: () => void;
  onSelect: () => void;
  onNavigate?: () => void;
  handleCreateFolderAction: (parentId: string) => string;
  handleCreateCardSetAction: (parentId: string) => string | null;
  handleDelete: (id: string, type: "folder") => void;
  handleRenameConfirm: () => Promise<void>;
  renameCancelledRef: React.MutableRefObject<boolean>;
  isFiltering: boolean;
  matchCount: number;
  rowBaseClassName: string;
  hasUpdateOrDelete: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  setRowRef: (id: string, node: HTMLElement | null) => void;
  isDimmed: boolean;
  isFileDraggingOver: boolean;
  onDragEnterCapture: (e: React.DragEvent) => void;
  onDragOverCapture: (e: React.DragEvent) => void;
  onDragLeaveCapture: (e: React.DragEvent) => void;
  onDropCapture: (e: React.DragEvent) => void;
  hasExpandableContent: boolean;
  onBulkTag?: () => void;
  children?: React.ReactNode;
}

export const FolderRow: React.FC<FolderRowProps> = ({
  folder,
  depth,
  isExpanded,
  isSelected,
  isEditing,
  setEditingId,
  editingName,
  setEditingName,
  editingNameRef,
  editInputRef,
  onToggle,
  onSelect,
  onNavigate,
  handleCreateFolderAction,
  handleCreateCardSetAction,
  handleDelete,
  handleRenameConfirm,
  renameCancelledRef,
  isFiltering,
  matchCount,
  rowBaseClassName,
  hasUpdateOrDelete,
  menuOpen,
  onMenuOpenChange,
  setRowRef,
  isDimmed,
  isFileDraggingOver,
  onDragEnterCapture,
  onDragOverCapture,
  onDragLeaveCapture,
  onDropCapture,
  hasExpandableContent,
  onBulkTag,
  children,
}) => {
  const typedFolder = folder as FolderRowFolder;
  const folderId = typedFolder.id ?? typedFolder.folderId ?? "";
  const folderName =
    typedFolder.folderName ?? typedFolder.folder_name ?? "無題のフォルダ";
  const isOptimisticFolder = Boolean(typedFolder.__optimistic);
  const hasContextMenu = !isOptimisticFolder && hasUpdateOrDelete;
  const parentFolderId = normalizeFolderId(getParentFolderId(folder));
  const isTopLevelFolder = parentFolderId === ROOT_FOLDER_ID;
  const FolderGlyph = isTopLevelFolder ? FolderIcon : FolderOutlineIcon;

  const menuActions = React.useMemo(
    () =>
      buildFolderMenuActions({
        onCreateSubfolder: () => {
          void handleCreateFolderAction(folderId);
        },
        onCreateCardSet: () => {
          void handleCreateCardSetAction(folderId);
        },
        onRename: () => {
          beginInlineRename({
            id: folderId,
            name: folderName,
            closeMenu: () => {
              onMenuOpenChange(false);
            },
            setEditingId,
            setEditingName,
            editingNameRef,
            beforeStart: onSelect,
          });
        },
        onDelete: () => {
          handleDelete(folderId, "folder");
        },
        onBulkTag,
      }),
    [
      editingNameRef,
      folderId,
      folderName,
      handleCreateCardSetAction,
      handleCreateFolderAction,
      handleDelete,
      onBulkTag,
      onMenuOpenChange,
      onSelect,
      setEditingId,
      setEditingName,
    ],
  );

  const nestedToggleOffsetStyle = !isTopLevelFolder
    ? ({ marginLeft: "calc(var(--tree-indent-px) * -0.5)" } as const)
    : undefined;

  const attachEditInputRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      editInputRef.current = node;
      if (!node || !isEditing) return;
      node.focus({ preventScroll: true });
      node.select();
      try {
        node.setSelectionRange(0, node.value.length);
      } catch {
        // no-op: setSelectionRange をサポートしない環境がある
      }
    },
    [editInputRef, isEditing],
  );

  return (
    <div>
      <SidebarTreeRow
        menuOpen={menuOpen}
        onMenuOpenChange={onMenuOpenChange}
        menuActions={menuActions}
        hasContextMenu={hasContextMenu}
        isEditing={isEditing}
        isDimmed={isDimmed}
        isDraggingOver={isFileDraggingOver}
        onContextMenuSelect={onSelect}
      >
        <ExplorerRow
          rowRef={(node) => setRowRef(folderId, node)}
          depth={depth}
          selected={isSelected}
          className={cn(
            rowBaseClassName,
            isFileDraggingOver && "bg-blue-100 ring-1 ring-blue-300",
            "group sidebar-row--folder",
            EXPLORER_ROW_MOBILE_NAV_TRAILING_PADDING_CLASS,
          )}
          onClick={(event) => {
            if (event.defaultPrevented) return;
            onSelect();
          }}
          onDragEnterCapture={onDragEnterCapture}
          onDragOverCapture={onDragOverCapture}
          onDragLeaveCapture={onDragLeaveCapture}
          onDropCapture={onDropCapture}
        >
          <div className={cn(EXPLORER_ROW_CONTENT_CLASS, "cursor-pointer")}>
            <div
              className={EXPLORER_ROW_LEADING_SLOT_CLASS}
              style={nestedToggleOffsetStyle}
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            >
              {hasExpandableContent ? (
                isExpanded ? (
                  <ChevronDown
                    className={cn(
                      "sidebar-icon",
                      FOLDER_ROW_ICON_SIZE_CLASS,
                      FOLDER_ROW_ICON_MUTED_CLASS,
                      "group-hover:text-[var(--sidebar-text,#202123)]",
                      isSelected && FOLDER_ROW_ICON_ACTIVE_CLASS,
                    )}
                  />
                ) : (
                  <ChevronRight
                    className={cn(
                      "sidebar-icon",
                      FOLDER_ROW_ICON_SIZE_CLASS,
                      FOLDER_ROW_ICON_MUTED_CLASS,
                      "group-hover:text-[var(--sidebar-text,#202123)]",
                      isSelected && FOLDER_ROW_ICON_ACTIVE_CLASS,
                    )}
                  />
                )
              ) : null}
            </div>

            <span className={EXPLORER_ROW_ICON_SLOT_CLASS}>
              <FolderGlyph
                className={cn(
                  "sidebar-icon",
                  FOLDER_ROW_ICON_SIZE_CLASS,
                  FOLDER_ROW_ICON_MUTED_CLASS,
                  "group-hover:text-[var(--sidebar-text,#202123)]",
                  isSelected && FOLDER_ROW_ICON_ACTIVE_CLASS,
                )}
              />
            </span>

            {isEditing ? (
              <input
                ref={attachEditInputRef}
                aria-label="フォルダ名の編集"
                className={cn(
                  EXPLORER_ROW_INPUT_CLASS,
                  "z-10 surface-concave placeholder:text-[#6E6E80] focus:border-blue-400 focus:ring-2 focus:ring-blue-200 focus:bg-white",
                )}
                style={{ userSelect: "text", WebkitUserSelect: "text" }}
                defaultValue={editingName}
                onFocus={(e) => {
                  e.currentTarget.select();
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                }}
                onChange={(e) => {
                  editingNameRef.current = e.target.value;
                }}
                onKeyDown={(e) => {
                  const isComposing =
                    e.nativeEvent.isComposing || e.keyCode === 229;
                  if (e.key === "Enter" && isComposing) return;
                  if (e.key === "Enter") {
                    e.preventDefault();
                    editingNameRef.current = e.currentTarget.value;
                    e.currentTarget.blur();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    renameCancelledRef.current = true;
                    e.currentTarget.blur();
                  }
                }}
                onBlur={(e) => {
                  editingNameRef.current = e.currentTarget.value;
                  void handleRenameConfirm();
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div
                className={cn(EXPLORER_ROW_TITLE_SLOT_CLASS, "overflow-hidden")}
              >
                <ExplorerRowContent
                  left={null}
                  title={folderName}
                  titleClassName={cn(
                    "lining-nums tabular-nums",
                    FOLDER_ROW_TITLE_CLASS,
                    isSelected ? "font-medium" : "font-normal",
                  )}
                  right={
                    isFiltering && matchCount === 0 ? (
                      <span className="text-xs text-[var(--sidebar-text-muted,#6e6e80)]">
                        (0)
                      </span>
                    ) : null
                  }
                />
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="absolute right-1 top-0 h-full flex items-center pointer-events-none">
              <button
                type="button"
                aria-label="このフォルダを開く"
                className="sidebar-action md:hidden h-6 w-6 p-0 grid place-items-center rounded-md hover:bg-[var(--sidebar-active-bg,#e7ebef)] text-[var(--sidebar-text-muted,#6e6e80)] hover:text-[var(--sidebar-text,#202123)] outline-none pointer-events-auto shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  (onNavigate ?? onSelect)();
                }}
              >
                <ChevronRight className="sidebar-icon h-4 w-4" />
              </button>
            </div>
          )}
        </ExplorerRow>
      </SidebarTreeRow>

      {isExpanded && children}
    </div>
  );
};