import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, Plus, MoreVertical, Pencil, Trash2, BellOff, Bell, BookOpen, Home, Settings, FileText, Zap, Check, X, Edit } from 'lucide-react';
import FolderPlusIcon from 'lucide-react/dist/esm/icons/folder-plus';
import GripVerticalIcon from 'lucide-react/dist/esm/icons/grip-vertical';
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

// Helper to restrict drag movement to vertical axis
const restrictToVertical = (style) => {
  if (style?.transform) {
    let y = '0px';
    const transform = style.transform;

    if (transform.includes('translate3d')) {
      // translate3d(x, y, z)
      const matches = transform.match(/translate3d\([^,]+,\s*([^,]+),\s*[^)]+\)/);
      if (matches) y = matches[1];
      return {
        ...style,
        transform: `translate3d(0px, ${y}, 0px)`
      };
    } else {
      // translate(x, y)
      const matches = transform.match(/translate\([^,]+,\s*([^)]+)\)/);
      if (matches) y = matches[1];
      return {
        ...style,
        transform: `translate(0px, ${y})`
      };
    }
  }
  return style;
};

// Timestamp / Date / epoch(ms|sec) / ISO string を Date に寄せる
const toValidDate = (v) => {
  if (v === null || v === undefined) return null;

  // Firestore Timestamp
  if (typeof v?.toDate === 'function') {
    const d = v.toDate();
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  }

  // Date
  if (v instanceof Date) return !isNaN(v.getTime()) ? v : null;

  // number (ms or sec)
  if (typeof v === 'number') {
    const ms = v < 1e12 ? v * 1000 : v;
    const d = new Date(ms);
    return !isNaN(d.getTime()) ? d : null;
  }

  // string (ISO or numeric string)
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return null;

    if (/^\d{10,13}$/.test(s)) {
      const n = Number(s);
      const ms = n < 1e12 ? n * 1000 : n;
      const d = new Date(ms);
      return !isNaN(d.getTime()) ? d : null;
    }

    const d = new Date(s);
    return !isNaN(d.getTime()) ? d : null;
  }

  return null;
};

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

  // Calculate card count (recursive with loop protection)
  const getCardCount = (folderId, visited = new Set()) => {
    if (visited.has(folderId)) return 0; // 循環参照を検知
    visited.add(folderId);

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
      return sum + getCardCount(child.id || child.folderId, visited);
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

  // ✅ ここが追加：縦方向に制限した style を適用
  const draggableStyle = restrictToVertical(provided?.draggableProps?.style);

  return (
    <div
      ref={provided?.innerRef}
      {...provided?.draggableProps}
      style={draggableStyle}
      className={cn(level === 0 ? "mb-1" : "mb-0")}
    >
      <Droppable droppableId={`drop-${folder.id}`} type="folder">
        {(droppableProvided, droppableSnapshot) => (
          <div
            ref={droppableProvided.innerRef}
            {...droppableProvided.droppableProps}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div
              data-selectable-id={`folder:${folder.id}`}
              className={cn(
                "group flex items-center gap-1.5 cursor-pointer select-none relative z-10",
                level === 0 ? "py-0.5 pl-0.5 pr-1.5 md:py-1 md:pl-1 md:pr-2" : "py-0 pl-0.5 pr-1 md:py-0.5 md:pl-1 md:pr-1.5",
                // 立体感（3D感）を出すためのボーダーと影の追加
                "bg-white border border-slate-100 border-b-2 border-b-slate-200/80 shadow-sm rounded-xl transition-all duration-300",
                // ドラッグ中でない場合のみホバー効果を適用
                !snapshot?.isDragging && "hover:bg-primary-50/30 hover:-translate-y-0.5 hover:shadow-md hover:border-b-primary-200",
                isSelected ? "ring-2 ring-primary-500 bg-primary-50/60 z-20" : "bg-white",
                snapshot?.isDragging && "z-50 shadow-xl",
                droppableSnapshot.isDraggingOver && "ring-2 ring-primary-100 bg-primary-50/30"
              )}
            >
              <div className="flex items-center gap-0 flex-shrink-0 p-0 m-0">
                {isSelectionMode ? (
                  <Checkbox
                    checked={selectedFolderIds?.includes(folder.id)}
                    onCheckedChange={() => onToggleSelection?.(folder.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-3.5 w-3.5 mr-1"
                  />
                ) : (
                  <span
                    {...provided?.dragHandleProps}
                    className={cn(
                      "relative inline-flex items-center cursor-grab active:cursor-grabbing shrink-0 p-0 m-0 transition-opacity duration-200",
                      "opacity-0 group-hover:opacity-100 active:opacity-100",
                      snapshot?.isDragging && "opacity-100",
                      // モバイルでは編集モード時のみ表示
                      "hidden md:inline-flex",
                      isEditMode && "inline-flex"
                    )}
                  >
                    <GripVerticalIcon className="w-3 h-3 text-primary-600" />
                  </span>
                )}
                {hasChildren && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(folder.id);
                    }}
                    className="flex items-center justify-center shrink-0 ml-[-3px] p-0 border-none bg-transparent outline-none"
                  >
                    <span className="relative inline-flex items-center group p-0 m-0">
                      {isExpanded ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />}
                    </span>
                  </button>
                )}
              </div>

              <div
                className="flex-1 flex items-center gap-3 min-w-0"
                onClick={() => onSelect(folder.id)}
              >
                <div className="w-6 h-6 md:w-7 md:h-7 liquid-glass-chip bg-primary-50/50 flex items-center justify-center text-primary-600 transition-all group-hover:scale-110 flex-shrink-0">
                  {(() => {
                    const iconName = folder.folderIcon || 'Folder';
                    const IconComponent = {
                      Folder, BookOpen, Home, Settings, FileText, Zap, ChevronRight: ChevronRight,
                      Plus, Check, X, Edit, Trash2
                    }[iconName] || Folder;
                    return <IconComponent className="w-3 h-3 md:w-3.5 md:h-3.5" />;
                  })()}
                </div>
                <div className="flex flex-col min-w-0 flex-1 justify-center">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="truncate text-sm md:text-[15px] font-semibold text-liquid-high tracking-tight">
                      {folder.folderName || '(名称未設定)'}
                    </span>

                    <div className="flex items-center gap-1.5 text-primary-700/70 flex-shrink-0">
                      <span className="text-[10px] md:text-[11px] font-bold opacity-80">{cardCount} cards</span>
                      {(() => {
                        const lastAccess = folder.lastAccessAt ?? folder.last_access_at;
                        const accessDate = toValidDate(lastAccess);

                        if (!accessDate) {
                          return <span className="text-[10px] md:text-[11px] font-medium opacity-60">• 未学習</span>;
                        }

                        // 現在時刻を取得
                        const now = new Date();

                        // 日付境界（0:00）を基準に日数を計算
                        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        const accessStart = new Date(accessDate.getFullYear(), accessDate.getMonth(), accessDate.getDate());

                        // ミリ秒単位の差分を日数に変換
                        const diffMs = todayStart.getTime() - accessStart.getTime();
                        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                        // 日数に応じて表示文言を決定
                        let text = '';
                        let isToday = false;

                        if (diffDays === 0) {
                          text = '今日';
                          isToday = true;
                        } else if (diffDays === 1) {
                          text = '1日前';
                        } else if (diffDays > 1) {
                          text = `${diffDays}日前`;
                        } else {
                          text = '今日';
                          isToday = true;
                        }

                        return (
                          <span className={`text-[10px] md:text-[11px] font-bold ${isToday ? 'text-primary-600' : 'text-primary-200'}`}>
                            • {text}
                          </span>
                        );
                      })()}
                    </div>

                    {isSilent && (
                      <BellOff className="w-3.5 h-3.5 text-amber-500/60 shrink-0" />
                    )}
                  </div>
                </div>
              </div>

              <div className={cn(
                "flex items-center gap-1.5 pr-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                // モバイルでは編集モード時のみ表示
                "hidden md:flex",
                isEditMode && "flex"
              )}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 liquid-glass-chip text-liquid-med hover:text-liquid-high"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateCard(folder.id);
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 liquid-glass-chip text-liquid-med hover:text-liquid-high"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
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
        <div className="relative pl-6 md:pl-8 ml-3 md:ml-4 border-l-2 border-slate-100/80 my-2 bg-slate-50/30 rounded-lg">
          <Droppable droppableId={`subfolder-${folder.id}`} type="folder">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex flex-col gap-0.5 pt-1"
              >
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

                {/* 子階層の新規フォルダ作成ボタン */}
                <button
                  onClick={() => onCreateSubfolder(folder.id)}
                  className={cn(
                    "group w-full flex items-center gap-1.5 md:gap-2 select-none cursor-pointer",
                    "py-0 pl-0.5 pr-1 md:py-0.5 md:pl-1 md:pr-1.5",
                    "bg-slate-50 border border-dashed border-slate-300 shadow-sm rounded-xl transition-all duration-300",
                    "hover:bg-slate-100 hover:border-slate-400 hover:shadow-md"
                  )}
                >
                  <span className="relative inline-flex items-center cursor-grab active:cursor-grabbing shrink-0 p-0 m-0 opacity-0">
                    <GripVerticalIcon className="w-3 h-3 text-transparent" />
                  </span>

                  <div aria-hidden="true" className="w-4 h-4 md:w-5 md:h-5 flex items-center justify-center shrink-0 opacity-0">
                    <ChevronRight className="w-3 h-3 md:w-3.5 md:h-3.5 text-transparent" />
                  </div>

                  <div className="w-6 h-6 md:w-7 md:h-7 bg-slate-100 flex items-center justify-center text-slate-400 transition-all group-hover:text-slate-600 flex-shrink-0 rounded-lg">
                    <FolderPlusIcon className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  </div>

                  <div className="flex flex-col min-w-0 flex-1 justify-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] md:text-xs font-bold text-slate-400 group-hover:text-slate-600 truncate transition-colors">
                        新規フォルダ
                      </span>
                    </div>
                  </div>
                </button>

                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
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

    // 階層制限チェック
    // 1. 現在の最大階層深度を計算
    const getDepth = (folderId, visited = new Set()) => {
      if (!folderId || visited.has(folderId)) return 0;
      visited.add(folderId);

      const folder = folders.find(f => (f.id ?? f.folderId) === folderId);
      if (!folder) return 0;

      const parentId = folder.parentFolderId ?? folder.parent_folder_id;
      if (!parentId) return 0;

      return 1 + getDepth(parentId, visited);
    };

    const maxDepth = Math.max(
      0,
      ...folders
        .filter(f => {
          const isDeleted = f.isDeleted ?? f.is_deleted;
          return isDeleted === undefined || isDeleted === false;
        })
        .map(f => getDepth(f.id ?? f.folderId))
    );

    // 2. ドラッグ中のフォルダーの現在の階層レベルを取得
    const draggedDepth = getDepth(draggableId);

    // 3. 移動先での階層レベルを計算
    const destDepth = destParentId ? getDepth(destParentId) + 1 : 0;

    // 4. 制限チェック
    // ルートフォルダー（親なし）は他のフォルダーの子にできない
    if (sourceParentId === null && destParentId !== null) {
      console.log('ルートフォルダーは他のフォルダーの子にできません');
      return;
    }

    // 現在最大階層にあるフォルダーは、それ以上深い階層に移動できない
    if (draggedDepth === maxDepth && destDepth > draggedDepth) {
      console.log('これ以上深い階層には移動できません');
      return;
    }

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
      <div className="py-0">
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
                  "min-h-[200px] transition-colors rounded-lg bg-slate-50/30 p-1 md:p-2",
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

                {/* ルート階層の新規フォルダ作成ボタン */}
                <button
                  onClick={() => onCreateFolder(null)}
                  className={cn(
                    "group w-full flex items-center gap-1.5 md:gap-2 select-none cursor-pointer",
                    "py-0.5 pl-0.5 pr-1.5 md:py-1 md:pl-1 md:pr-2",
                    "bg-slate-50 border border-dashed border-slate-300 shadow-sm rounded-xl transition-all duration-300",
                    "hover:bg-slate-100 hover:border-slate-400 hover:shadow-md"
                  )}
                >
                  <span className="relative inline-flex items-center cursor-grab active:cursor-grabbing shrink-0 p-0 m-0 opacity-0">
                    <GripVerticalIcon className="w-3 h-3 text-transparent" />
                  </span>

                  <div aria-hidden="true" className="w-4 h-4 md:w-5 md:h-5 flex items-center justify-center shrink-0 opacity-0">
                    <ChevronRight className="w-3 h-3 md:w-3.5 md:h-3.5 text-transparent" />
                  </div>

                  <div className="w-6 h-6 md:w-7 md:h-7 bg-slate-100 flex items-center justify-center text-slate-400 transition-all group-hover:text-slate-600 flex-shrink-0 rounded-lg">
                    <FolderPlusIcon className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  </div>

                  <div className="flex flex-col min-w-0 flex-1 justify-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] md:text-xs font-bold text-slate-400 group-hover:text-slate-600 truncate transition-colors">
                        新規フォルダ
                      </span>
                    </div>
                  </div>
                </button>

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
