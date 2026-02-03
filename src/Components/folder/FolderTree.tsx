import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, Plus, MoreVertical, Pencil, Trash2, BellOff, Bell } from 'lucide-react';
import FolderPlusIcon from 'lucide-react/dist/esm/icons/folder-plus';
import GripVerticalIcon from 'lucide-react/dist/esm/icons/grip-vertical';
import EyeOffIcon from 'lucide-react/dist/esm/icons/eye-off';
import { Button } from '@/Components/ui/button';
import { Checkbox } from '@/Components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';

function FolderItem({ 
  folder, 
  folders, 
  allFolders,
  cards,
  level = 0, 
  selectedFolderId, 
  expandedIds,
  onSelect, 
  onToggle,
  onCreateCard,
  onCreateSubfolder,
  onEdit,
  onDelete,
  onHide,
  onToggleSilent,
  isSelectionMode,
  selectedFolderIds,
  onToggleSelection,
  provided,
  snapshot,
  isEditMode = false
}) {
  const [dragOverTimer, setDragOverTimer] = useState(null);
  const timerRef = useRef(null);
  
  const childFolders = folders.filter(f => {
    // isDeleted フィールドが存在しない場合 or false の場合のみ表示
    const isDeleted = f.isDeleted ?? f.is_deleted;
    const parentId = f.parentFolderId ?? f.parent_folder_id ?? null;
    // Prevent self-reference recursion (A > A)
    if (f.id === folder.id || (f.folderId && f.folderId === folder.id)) return false;
    return (parentId === folder.id && (isDeleted === undefined || isDeleted === false));
  })
    .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  const hasChildren = childFolders.length > 0;
  const isExpanded = expandedIds.includes(folder.id);
  const isSelected = selectedFolderId === folder.id;
  const isSilent = folder?.isSilent ?? false;

  // Calculate card count (recursive)
  const getCardCount = (folderId) => {
    const directCount = cards.filter(c => {
         const cFolderId = c.folderId || c.folder_id;
         const isDeleted = c.isDeleted || c.is_deleted;
         return cFolderId === folderId && !isDeleted;
    }).length;
    
    // Use allFolders if available (for correct counts including hidden folders), otherwise folders
    const sourceFolders = allFolders || folders;
    const children = sourceFolders.filter(f => {
        const pId = f.parentFolderId || f.parent_folder_id;
        const isDel = f.isDeleted || f.is_deleted;
        return pId === folderId && !isDel;
    });
    
    const childCount = children.reduce((sum, child) => {
        return sum + getCardCount(child.id || child.folderId);
    }, 0);
    
    return directCount + childCount;
  };

  const cardCount = getCardCount(folder.id);
  
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
  
  const handleDragOver = (e) => {
    if (hasChildren && !isExpanded) {
      if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          onToggle(folder.id);
          timerRef.current = null;
        }, 800);
      }
    }
  };
  
  const handleDragLeave = (e) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  
  return (
    <div ref={provided?.innerRef} {...provided?.draggableProps}>
      <Droppable droppableId={`drop-${folder.id}`} type="folder">
        {(droppableProvided, droppableSnapshot) => (
          <div 
            ref={droppableProvided.innerRef}
            {...droppableProvided.droppableProps}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div 
              className={cn(
                "group flex items-center gap-3 p-3 md:p-4 rounded-[20px] cursor-pointer transition-all select-none mb-2 md:mb-3 border border-slate-100",
                isSelected ? "bg-primary-50/80 border-primary-200" : "bg-white hover:border-primary-600 hover:shadow-md",
                snapshot?.isDragging && "shadow-xl bg-white z-50",
                droppableSnapshot.isDraggingOver && "bg-slate-50 ring-2 ring-slate-100"
              )}
              style={{ marginLeft: `${level * 24}px` }}
            >
        {isSelectionMode ? (
          <Checkbox
            checked={selectedFolderIds?.includes(folder.id)}
            onCheckedChange={() => onToggleSelection?.(folder.id)}
            onClick={(e) => e.stopPropagation()}
            className="mr-1"
          />
        ) : (
          <span
            {...provided?.dragHandleProps}
            className={cn(
               "relative inline-flex items-center group w-4 h-4 cursor-grab active:cursor-grabbing shrink-0",
               // モバイルでは編集モード時のみ表示
               "hidden md:inline-flex",
               isEditMode && "inline-flex"
            )}
          >
            <GripVerticalIcon className="w-4 h-4 text-primary-600" />
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(folder.id);
          }}
          className="w-5 h-5 flex items-center justify-center shrink-0"
        >
          {hasChildren ? (
            <span className="relative inline-flex items-center group w-4 h-4">
              {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
            </span>
          ) : (
            <span className="w-4" />
          )}
        </button>
        
        <div 
          className="flex-1 flex items-center gap-4 min-w-0"
          onClick={() => onSelect(folder.id)}
        >
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 transition-all group-hover:scale-110 flex-shrink-0">
              <Folder className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate text-sm md:text-[16px] font-bold text-[#334155] tracking-tight">{folder.folderName || '(名称未設定)'}</span>
              {isSilent && (
                <BellOff className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </div>
            <span className="text-[10px] font-bold text-slate-300 mt-0.5">{cardCount} cards</span>
          </div>
        </div>
        
        <div className={cn(
           "flex items-center gap-1.5 pr-2 flex-shrink-0",
           // モバイルでは編集モード時のみ表示
           "hidden md:flex",
           isEditMode && "flex"
        )}>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-primary-600 hover:bg-primary-50"
            onClick={(e) => {
              e.stopPropagation();
              onCreateCard(folder.id);
            }}
          >
            <Plus className="w-5 h-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-primary-600 hover:bg-primary-50"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl border-slate-50 shadow-xl p-2">
              <DropdownMenuItem onClick={() => onCreateSubfolder(folder.id)} className="rounded-xl">
                <FolderPlusIcon className="w-4 h-4 mr-2" />
                サブフォルダ作成
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(folder)} className="rounded-xl">
                <Pencil className="w-4 h-4 mr-2" />
                名前変更
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onHide?.(folder)} className="rounded-xl">
                <EyeOffIcon className="w-4 h-4 mr-2" />
                非表示にする
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleSilent(folder)} className="rounded-xl">
                {isSilent ? (
                  <>
                    <Bell className="w-4 h-4 mr-2" />
                    通知ONにする
                  </>
                ) : (
                  <>
                    <BellOff className="w-4 h-4 mr-2" />
                    通知OFFにする
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(folder)}
                className="text-red-600 rounded-xl"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {droppableProvided.placeholder}
    </div>
  )}
</Droppable>
      
      {isExpanded && hasChildren && (
        <Droppable droppableId={`subfolder-${folder.id}`} type="folder">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {childFolders
                .filter(child => child.id != null)
                .map((child, index) => (
                  <Draggable key={child.id} draggableId={String(child.id)} index={index}>
                    {(provided, snapshot) => (
                      <FolderItem
                        folder={child}
                        folders={folders}
                        allFolders={allFolders}
                        cards={cards}
                        level={level + 1}
                        selectedFolderId={selectedFolderId}
                        expandedIds={expandedIds}
                        onSelect={onSelect}
                        onToggle={onToggle}
                        onCreateCard={onCreateCard}
                        onCreateSubfolder={onCreateSubfolder}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onHide={onHide}
                        onToggleSilent={onToggleSilent}
                        isSelectionMode={isSelectionMode}
                        selectedFolderIds={selectedFolderIds}
                        onToggleSelection={onToggleSelection}
                        provided={provided}
                        snapshot={snapshot}
                        isEditMode={isEditMode}
                      />
                    )}
                  </Draggable>
                ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )}
    </div>
  );
}

export default function FolderTree({ 
  folders, 
  allFolders,
  cards = [],
  selectedFolderId,
  onSelect,
  onCreateCard,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  onHideFolder,
  onToggleSilent,
  isSelectionMode,
  selectedFolderIds,
  onToggleSelection,
  onReorder,
  isEditMode = true // デスクトップ版やデフォルトではTrue扱いにする（下位互換性）
}) {
  const [expandedIds, setExpandedIds] = useState([]);

  const rootFolders = folders.filter(f => {
    // isDeleted フィールドが存在しない場合 or false の場合のみ表示
    const isDeleted = f.isDeleted ?? f.is_deleted;
    const parentId = f.parentFolderId ?? f.parent_folder_id ?? null;
    return (!parentId && (isDeleted === undefined || isDeleted === false));
  })
    .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  
  const handleToggle = (folderId) => {
    setExpandedIds(prev => 
      prev.includes(folderId) 
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };
  
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // Dropped at the same spot
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // フォルダ自体へのドロップ（drop-{folderId}形式）を処理
    let sourceParentId, destParentId;
    
    if (source.droppableId === 'root') {
      sourceParentId = null;
    } else if (source.droppableId.startsWith('drop-')) {
      sourceParentId = source.droppableId.replace('drop-', '');
    } else {
      sourceParentId = source.droppableId.replace('subfolder-', '');
    }
    
    if (destination.droppableId === 'root') {
      destParentId = null;
    } else if (destination.droppableId.startsWith('drop-')) {
      // フォルダ自体にドロップされた場合、そのフォルダを親にする
      destParentId = destination.droppableId.replace('drop-', '');
    } else {
      destParentId = destination.droppableId.replace('subfolder-', '');
    }

    const draggedItem = folders.find(f => f.id === draggableId || f.folderId === draggableId);
    if (!draggedItem) return;
    
    // 自分自身や自分の子孫フォルダの中には移動できない
    if (destParentId === draggableId) return;
    const isDescendant = (parentId, targetId) => {
      if (!parentId) return false;
      if (parentId === targetId) return true;
      const parent = folders.find(f => (f.id ?? f.folderId) === parentId);
      if (!parent) return false;
      return isDescendant(parent.parentFolderId ?? parent.parent_folder_id, targetId);
    };
    if (isDescendant(destParentId, draggableId)) return;

    // Moving within the same list
    if (source.droppableId === destination.droppableId) {
      const siblings = folders
        .filter(f => {
          const parentId = f.parentFolderId ?? f.parent_folder_id ?? null;
          const isDeleted = f.isDeleted ?? f.is_deleted;
          return parentId === sourceParentId && (isDeleted === undefined || isDeleted === false);
        })
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

      const [reorderedItem] = siblings.splice(source.index, 1);
      siblings.splice(destination.index, 0, reorderedItem);

      onReorder(siblings, sourceParentId, true);
    } else {
      // Moving to a different list
      
      // Update source list
      const sourceSiblings = folders
        .filter(f => {
          const parentId = f.parentFolderId ?? f.parent_folder_id ?? null;
          const isDeleted = f.isDeleted ?? f.is_deleted;
          return parentId === sourceParentId && f.id !== draggableId && f.folderId !== draggableId && (isDeleted === undefined || isDeleted === false);
        })
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
      
      // Update destination list
      const destSiblings = folders
        .filter(f => {
          const parentId = f.parentFolderId ?? f.parent_folder_id ?? null;
          const isDeleted = f.isDeleted ?? f.is_deleted;
          return parentId === destParentId && (isDeleted === undefined || isDeleted === false);
        })
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

      // フォルダ自体へのドロップの場合は先頭に挿入
      const insertIndex = destination.droppableId.startsWith('drop-') ? 0 : destination.index;
      destSiblings.splice(insertIndex, 0, draggedItem);
      
      onReorder(sourceSiblings, sourceParentId, false);
      onReorder(destSiblings, destParentId, true);
    }
  };
  
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="py-2">
        
        {rootFolders.length === 0 ? (
          <div className="px-3 py-4 text-sm text-gray-500 text-center">
            フォルダがありません
          </div>
        ) : (
          <Droppable droppableId="root" type="folder">
            {(provided, snapshot) => (
              <div 
                ref={provided.innerRef} 
                {...provided.droppableProps}
                className={cn(
                  "min-h-[200px] transition-colors rounded-lg",
                  snapshot.isDraggingOver && "bg-primary-50/50 ring-2 ring-primary-200 ring-inset"
                )}
              >
                {rootFolders
                  .filter(folder => folder.id != null)
                  .map((folder, index) => (
                    <Draggable key={folder.id} draggableId={String(folder.id)} index={index}>
                      {(provided, snapshot) => (
                        <FolderItem
                          folder={folder}
                          folders={folders}
                          allFolders={allFolders}
                          cards={cards}
                          selectedFolderId={selectedFolderId}
                          expandedIds={expandedIds}
                          onSelect={onSelect}
                          onToggle={handleToggle}
                          onCreateCard={onCreateCard}
                          onCreateSubfolder={onCreateFolder}
                          onEdit={onEditFolder}
                          onDelete={onDeleteFolder}
                          onHide={onHideFolder}
                          onToggleSilent={onToggleSilent}
                          isSelectionMode={isSelectionMode}
                          selectedFolderIds={selectedFolderIds}
                          onToggleSelection={onToggleSelection}
                          provided={provided}
                          snapshot={snapshot}
                        />
                      )}
                    </Draggable>
                  ))}
                {provided.placeholder}
                {snapshot.isDraggingOver && rootFolders.length === 0 && (
                  <div className="px-3 py-8 text-sm text-indigo-500 text-center">
                    ここにドロップしてルートレベルに移動
                  </div>
                )}
              </div>
            )}
          </Droppable>
        )}
      </div>
    </DragDropContext>
  );
}
