import React from 'react';
import { ChevronRight, ChevronDown, Folder, MoreVertical } from 'lucide-react';
import { Droppable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { ContextMenu } from '../../ContextMenu';
import { DnDHelpers } from '@/hooks/useFolderDnD';
import type { FolderTreeNode } from '../model/utils';

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
  handleDelete: (id: string, type: 'folder') => Promise<void>;
  handleRenameConfirm: () => Promise<void>;
  renameCancelledRef: React.MutableRefObject<boolean>;
  isPinned: boolean;
  handleTogglePin: () => void;
  isFiltering: boolean;
  matchCount: number;
  rowBaseClassName: string;
  isDragging: boolean;
  hasUpdateOrDelete: boolean;
  // 追加属性
  setRowRef: (id: string, node: HTMLElement | null) => void;
  isDimmed: boolean;
  isFileDraggingOver: boolean;
  onDragEnterCapture: (e: React.DragEvent) => void;
  onDragOverCapture: (e: React.DragEvent) => void;
  onDragLeaveCapture: (e: React.DragEvent) => void;
  onDropCapture: (e: React.DragEvent) => void;
  hasExpandableContent: boolean;
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
  isDragging,
  hasUpdateOrDelete,
  setRowRef,
  isDimmed,
  isFileDraggingOver,
  onDragEnterCapture,
  onDragOverCapture,
  onDragLeaveCapture,
  onDropCapture,
  hasExpandableContent,
  children,
}) => {
  const folderId = folder.id || (folder as any).folderId;
  const folderName = folder.folderName || folder.folder_name || '無題のフォルダ';
  const isOptimisticFolder = Boolean(folder.__optimistic);
  const hasContextMenu = !isOptimisticFolder && hasUpdateOrDelete;

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
              snapshot.isDraggingOver && "bg-blue-50/50 ring-1 ring-blue-200/50 rounded-sm"
            )}
          >
            <div
              ref={(node) => setRowRef(folderId, node)}
              className={cn(
                rowBaseClassName,
                !isDragging && "hover:bg-slate-100",
                isSelected && "bg-primary-100/80",
                snapshot.isDraggingOver && "bg-blue-100 ring-1 ring-blue-300",
                isFileDraggingOver && "bg-blue-50 ring-1 ring-blue-400",
                "group pr-8"
              )}
              style={{ paddingLeft: `${depth * 12 + 4}px`, height: 32, minHeight: 32, boxSizing: 'border-box' }}
              onClick={onSelect}
              onDragEnterCapture={onDragEnterCapture}
              onDragOverCapture={onDragOverCapture}
              onDragLeaveCapture={onDragLeaveCapture}
              onDropCapture={onDropCapture}
            >
              <div className="flex-1 flex items-center min-w-0 h-full pr-1 cursor-pointer">
                <div
                  className="w-4 h-4 flex items-center justify-center flex-shrink-0 mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                  }}
                >
                  {hasExpandableContent ? (
                    isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )
                  ) : null}
                </div>

                <Folder className={cn("w-4 h-4 flex-shrink-0 mr-1", isPinned ? "text-amber-500 fill-amber-100" : "text-slate-400")} />

                {isEditing ? (
                  <input
                    ref={editInputRef}
                    aria-label="フォルダ名の編集"
                    className="text-sm bg-white border border-primary-300 rounded px-1 outline-none ring-1 ring-primary-100 z-10 h-6 w-full leading-5"
                    value={editingName}
                    onChange={(e) => {
                      setEditingName(e.target.value);
                      editingNameRef.current = e.target.value;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                      if (e.key === 'Escape') {
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
                  <div className="flex items-center gap-1 flex-1 overflow-hidden pointer-events-none">
                    <span className={cn("text-sm truncate leading-5 lining-nums tabular-nums", isSelected ? "text-primary-700 font-medium" : "text-slate-700")}>
                      {folderName}
                    </span>
                    {isFiltering && matchCount === 0 && <span className="text-xs text-slate-400">(0)</span>}
                  </div>
                )}
              </div>

              {!isEditing && (
                <div className="absolute right-1 top-0 h-full flex items-center gap-1 pointer-events-none">
                  <button
                    type="button"
                    aria-label="このフォルダを開く"
                    className="md:hidden h-6 w-6 p-0 grid place-items-center rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 outline-none pointer-events-auto transition-colors shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      (onNavigate ?? onSelect)();
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  {hasContextMenu && (
                  <ContextMenu
                    type="folder"
                    onCreateSubfolder={() => void handleCreateFolderAction(folderId)}
                    onCreateCard={() => void handleCreateCardAction(folderId)}
                    onRename={() => {
                      setEditingId(folderId);
                      setEditingName(folderName);
                    }}
                    onDelete={() => handleDelete(folderId, 'folder')}
                    isPinned={isPinned}
                    onTogglePin={handleTogglePin}
                  >
                    <button
                      type="button"
                      aria-label="フォルダメニューを開く"
                      className="h-6 w-6 p-0 grid place-items-center rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 outline-none pointer-events-auto transition-colors shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </ContextMenu>
                  )}
                </div>
              )}
            </div>

            <div className="h-0 overflow-hidden">
              {provided.placeholder}
            </div>
          </div>
        )}
      </Droppable>

      {isExpanded && children}
    </div>
  );
};
