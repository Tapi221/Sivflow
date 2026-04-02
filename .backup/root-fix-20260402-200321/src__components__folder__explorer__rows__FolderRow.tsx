import { ContextMenu } from "@/components/folder/components/menus/ContextMenu";
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
  MoreVertical,
} from "@/ui/icons";
import React, { useEffect } from "react";
import { ExplorerRow } from "./ExplorerRow";
import { ExplorerRowContent } from "./ExplorerRowContent";
import {
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
  editInputRef: React.RefObject<HTMLInputElement | null>;
  onToggle: () => void;
  onSelect: () => void;
  onNavigate?: () => void;
  handleCreateFolderAction: (parentId: string) => Promise<void>;
  handleCreateCardSetAction: (parentId: string) => Promise<void>;
  handleDelete: (id: string, type: "folder") => Promise<void>;
  handleRenameConfirm: () => Promise<void>;
  renameCancelledRef: React.MutableRefObject<boolean>;
  isPinned: boolean;
  handleTogglePin: () => void;
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
  isPinned,
  handleTogglePin,
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

  const nestedToggleOffsetStyle = !isTopLevelFolder
    ? ({ marginLeft: "calc(var(--tree-indent-px) * -0.5)" } as const)
    : undefined;
  useEffect(() => {
    if (!isEditing) return;

    let rafId1 = 0;
    let rafId2 = 0;
    let timeoutId = 0;

    const applySelection = () => {
      const input = editInputRef.current;
      if (!input) return;
      input.focus({ preventScroll: true });
      input.select();
      try {
        input.setSelectionRange(0, input.value.length);
      } catch {}
    };

    rafId1 = requestAnimationFrame(() => {
      applySelection();
      rafId2 = requestAnimationFrame(() => {
        applySelection();
      });
    });

    timeoutId = window.setTimeout(() => {
      applySelection();
    }, 30);

    return () => {
      cancelAnimationFrame(rafId1);
      cancelAnimationFrame(rafId2);
      window.clearTimeout(timeoutId);
    };
  }, [isEditing, editInputRef]);

  return (
    <div key={folderId} className={cn(isDimmed && "opacity-50")}>
      <div
        className={cn(
          "relative",
          isFileDraggingOver && "bg-blue-50/50 ring-1 ring-blue-200/50 rounded-sm",
        )}
      >
        <ExplorerRow
          rowRef={(node) => setRowRef(folderId, node)}
          depth={depth}
          selected={isSelected}
          className={cn(
            rowBaseClassName,
            isFileDraggingOver && "bg-blue-100 ring-1 ring-blue-300",
            "group pr-8 sidebar-row--folder",
          )}
          onClick={onSelect}
          onDragEnterCapture={onDragEnterCapture}
          onDragOverCapture={onDragOverCapture}
          onDragLeaveCapture={onDragLeaveCapture}
          onDropCapture={onDropCapture}
        >
          <div className="flex-1 flex items-center min-w-0 h-full pr-1 cursor-pointer">
            <div
              className="sidebar-action w-4 h-4 flex items-center justify-center flex-shrink-0 mr-0"
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

            <FolderGlyph
              className={cn(
                "sidebar-icon flex-shrink-0 mr-0",
                FOLDER_ROW_ICON_SIZE_CLASS,
                FOLDER_ROW_ICON_MUTED_CLASS,
                "group-hover:text-[var(--sidebar-text,#202123)]",
                isSelected && FOLDER_ROW_ICON_ACTIVE_CLASS,
              )}
            />

            {isEditing ? (
              <input
                ref={editInputRef}
                aria-label="フォルダ名の編集"
                className="text-sm text-[#202123] bg-white border border-slate-300 rounded px-1 outline-none z-10 h-6 w-full leading-5 surface-concave placeholder:text-[#6E6E80] focus:border-blue-400 focus:ring-2 focus:ring-blue-200 focus:bg-white select-text"
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
                  const isComposing = e.nativeEvent.isComposing || e.keyCode === 229;
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
              <div className="flex-1 overflow-hidden pointer-events-none">
                <ExplorerRowContent
                  left={null}
                  title={folderName}
                  titleClassName={cn(
                    "lining-nums tabular-nums",
                    FOLDER_ROW_TITLE_CLASS,
                    isSelected
                      ? "font-medium"
                      : "font-normal",
                  )}
                  right={
                    isFiltering && matchCount === 0 ? (
                      <span className="text-xs text-[var(--sidebar-text-muted,#6e6e80)]">(0)</span>
                    ) : null
                  }
                />
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="absolute right-1 top-0 h-full flex items-center gap-1 pointer-events-none">
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

              {hasContextMenu && (
                <ContextMenu
                  open={menuOpen}
                  onOpenChange={onMenuOpenChange}
                  type="folder"
                  onCreateSubfolder={() =>
                    void handleCreateFolderAction(folderId)
                  }
                  onCreateCardSet={() => void handleCreateCardSetAction(folderId)}
                  onRename={() => {
                    onSelect();
                    onMenuOpenChange(false);
                    const forceSelectRenameInput = () => {
                      const input = editInputRef.current;
                      if (!input) return;
                      input.focus({ preventScroll: true });
                      input.select();
                      try {
                        input.setSelectionRange(0, input.value.length);
                      } catch {}
                    };
                    window.setTimeout(() => {
                      setEditingId(folderId);
                      setEditingName(folderName);
                      editingNameRef.current = folderName;
                      requestAnimationFrame(() => {
                        forceSelectRenameInput();
                        requestAnimationFrame(() => {
                          forceSelectRenameInput();
                        });
                      });
                      window.setTimeout(() => {
                        forceSelectRenameInput();
                      }, 40);
                    }, 0);
                  }}
                  onDelete={() => handleDelete(folderId, "folder")}
                  onBulkTag={onBulkTag}
                  isPinned={isPinned}
                  onTogglePin={handleTogglePin}
                >
                  <button
                    type="button"
                    aria-label="フォルダメニューを開く"
                    className={cn(
                      "sidebar-action h-6 w-6 p-0 grid place-items-center rounded-md hover:bg-[var(--sidebar-active-bg,#e7ebef)] text-[var(--sidebar-text-muted,#6e6e80)] hover:text-[var(--sidebar-text,#202123)] outline-none pointer-events-auto shrink-0",
                      "opacity-0 group-hover:opacity-100",
                      (isSelected || menuOpen) && "opacity-100",
                    )}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="sidebar-icon h-4 w-4" />
                  </button>
                </ContextMenu>
              )}
            </div>
          )}
        </ExplorerRow>
      </div>

      {isExpanded && children}
    </div>
  );
};
