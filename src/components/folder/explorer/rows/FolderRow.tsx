import React from "react";
import {
  ChevronRight,
  ChevronDown,
  FolderIcon,
  FolderOutlineIcon,
  MoreVertical,
} from "@/ui/icons";
import { Droppable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { ContextMenu } from "../../ContextMenu";
import { DnDHelpers } from "@/hooks/useFolderDnD";
import {
  getParentFolderId,
  normalizeFolderId,
  ROOT_FOLDER_ID,
  type FolderTreeNode,
} from "../model/utils";
import { ExplorerRow } from "./ExplorerRow";
import { ExplorerRowContent } from "./ExplorerRowContent";

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
  editInputRef: React.RefObject<HTMLInputElement>;
  onToggle: () => void;
  onSelect: () => void;
  onNavigate?: () => void;
  handleCreateFolderAction: (parentId: string) => Promise<void>;
  handleCreateCardAction: (parentId: string) => Promise<void>;
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
  // 追加属性
  setRowRef: (id: string, node: HTMLElement | null) => void;
  isDimmed: boolean;
  isFileDraggingOver: boolean;
  onDragEnterCapture: (e: React.DragEvent) => void;
  onDragOverCapture: (e: React.DragEvent) => void;
  onDragLeaveCapture: (e: React.DragEvent) => void;
  onDropCapture: (e: React.DragEvent) => void;
  hasExpandableContent: boolean;
  onBulkTag?: () => void;
  // 子要素
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
  handleCreateCardAction,
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
  const folderId = folder.id || (folder as unknown).folderId;
  const folderName =
    folder.folderName || folder.folder_name || "無題のフォルダ";
  const isOptimisticFolder = Boolean(folder.__optimistic);
  const hasContextMenu = !isOptimisticFolder && hasUpdateOrDelete;
  const parentFolderId = normalizeFolderId(getParentFolderId(folder));
  const isTopLevelFolder = parentFolderId === ROOT_FOLDER_ID;
  const FolderGlyph = isTopLevelFolder ? FolderIcon : FolderOutlineIcon;
  const nestedToggleOffsetStyle = !isTopLevelFolder
    ? ({ marginLeft: "calc(var(--tree-indent-px) * -0.5)" } as const)
    : undefined;

  return (
    <div key={folderId} className={cn(isDimmed && "opacity-50")}>
      <Droppable
        droppableId={DnDHelpers.createCardDroppableId(folderId)}
        type="folder"
        isDropDisabled={isOptimisticFolder}
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "relative",
              snapshot.isDraggingOver &&
                "bg-blue-50/50 ring-1 ring-blue-200/50 rounded-sm",
            )}
          >
            <ExplorerRow
              rowRef={(node) => setRowRef(folderId, node)}
              depth={depth}
              selected={isSelected}
              className={cn(
                rowBaseClassName,
                snapshot.isDraggingOver && "bg-blue-100 ring-1 ring-blue-300",
                isFileDraggingOver && "bg-blue-50 ring-1 ring-blue-400",
                "group pr-8",
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
                          "sidebar-icon w-4 h-4 text-[#6E6E80] group-hover:text-[#202123]",
                          isSelected && "text-primary-700",
                        )}
                      />
                    ) : (
                      <ChevronRight
                        className={cn(
                          "sidebar-icon w-4 h-4 text-[#6E6E80] group-hover:text-[#202123]",
                          isSelected && "text-primary-700",
                        )}
                      />
                    )
                  ) : null}
                </div>

                <FolderGlyph
                  className={cn(
                    "sidebar-icon w-4 h-4 flex-shrink-0 mr-0 text-[#6E6E80] group-hover:text-[#202123]",
                    isSelected && "text-primary-700",
                  )}
                />

                {isEditing ? (
                  <input
                    ref={editInputRef}
                    aria-label="フォルダ名の編集"
                    className="text-sm text-[#202123] bg-white border border-[var(--surface-border)] rounded px-1 outline-none z-10 h-6 w-full leading-5 surface-concave placeholder:text-[#6E6E80] focus:border-[#cfcfcf] focus:bg-white"
                    value={editingName}
                    onChange={(e) => {
                      setEditingName(e.target.value);
                      editingNameRef.current = e.target.value;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        e.stopPropagation();
                        renameCancelledRef.current = true;
                        e.currentTarget.blur();
                      }
                    }}
                    onBlur={() => void handleRenameConfirm()}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="flex-1 overflow-hidden pointer-events-none">
                    <ExplorerRowContent
                      left={null}
                      title={folderName}
                      titleClassName={cn(
                        "lining-nums tabular-nums",
                        isSelected
                          ? "text-primary-700 font-medium"
                          : "text-[#202123]",
                      )}
                      right={
                        isFiltering && matchCount === 0 ? (
                          <span className="text-xs text-[#6E6E80]">(0)</span>
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
                    className="sidebar-action md:hidden h-6 w-6 p-0 grid place-items-center rounded-md hover:bg-slate-200 text-[#6E6E80] hover:text-[#202123] outline-none pointer-events-auto transition-colors shrink-0"
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
                      onCreateCard={() => void handleCreateCardAction(folderId)}
                      onRename={() => {
                        setEditingId(folderId);
                        setEditingName(folderName);
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
                          "sidebar-action h-6 w-6 p-0 grid place-items-center rounded-md hover:bg-slate-200 text-[#6E6E80] hover:text-[#202123] outline-none pointer-events-auto transition-all shrink-0",
                          "opacity-0 group-hover:opacity-100",
                          (isSelected || menuOpen) && "opacity-100",
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="sidebar-icon h-4 w-4" />
                      </button>
                    </ContextMenu>
                  )}
                </div>
              )}
            </ExplorerRow>

            <div className="h-0 overflow-hidden">{provided.placeholder}</div>
          </div>
        )}
      </Droppable>

      {isExpanded && children}
    </div>
  );
};
