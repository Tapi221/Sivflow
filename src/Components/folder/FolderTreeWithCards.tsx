import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText, MoreVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { ContextMenu } from './ContextMenu';
import { useFolderDnD, DnDHelpers } from '@/hooks/useFolderDnD';
import type { Card, DocumentItem, ExplorerItem, SelectedExplorerItem } from '@/types';

interface FolderTreeWithCardsProps {
  folders: any[];
  cards: Card[];
  documents: DocumentItem[];
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  onFolderSelect: (folderId: string | null) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
  onCreateFolder?: (name: string, parentId?: string) => Promise<string>;
  onUpdateFolder?: (folderId: string, data: any) => Promise<void>;
  onDeleteFolder?: (folderId: string) => Promise<void>;
  onCreateCard?: (data: any) => Promise<any>;
  onUpdateCard?: (cardId: string, data: any) => Promise<void>;
  onDeleteCard?: (cardId: string) => Promise<void>;
  moveCardToFolder?: (cardId: string, targetFolderId: string) => Promise<void>;
  reorderCards?: (folderId: string, cardIds: string[]) => Promise<void>;
  favorites?: Array<{ type: 'folder' | 'card'; id: string }>;
  onAddFavorite?: (item: { type: 'folder' | 'card'; id: string }) => void;
  onRemoveFavorite?: (item: { type: 'folder' | 'card'; id: string }) => void;
  isFiltering?: boolean;
}

export function FolderTreeWithCards({
  folders,
  cards,
  documents,
  selectedFolderId,
  selectedItem,
  onFolderSelect,
  onItemSelect,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  moveCardToFolder,
  reorderCards,
  favorites,
  onAddFavorite,
  onRemoveFavorite,
  isFiltering = false,
}: FolderTreeWithCardsProps) {
  // フォルダ・カード共通の行スタイル（高さ・padding・背景の描画範囲を完全統一）
  // overflow-hidden を入れて「選択背景が行の縦幅を超えて見える」問題を確実に切る
  const ROW_BASE =
    "group flex items-center h-8 min-h-0 box-border pr-2 py-0 relative w-full text-left rounded-md overflow-hidden transition-colors";

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const { onDragEnd } = useFolderDnD({
    cards,
    moveCardToFolder: moveCardToFolder || (async () => {}),
    reorderCards: reorderCards || (async () => {}),
  });

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const currentId = selectedItem?.id || selectedFolderId;
      if (!currentId) return;

      const isCard = selectedItem?.type === 'card';
      const isDoc = selectedItem?.type === 'document';

      if (e.key === 'F2') {
        e.preventDefault();
        let name = '';
        if (selectedItem?.type === 'card') {
          const card = cards.find(c => c.id === selectedItem.id);
          name = card?.title || '無題のカード';
        } else if (selectedItem?.type === 'document') {
          const doc = documents.find(d => d.id === selectedItem.id);
          name = doc?.title || '無題のドキュメント';
        } else if (selectedFolderId) {
          const folder = folders.find(f => (f.id || (f as any).folderId) === selectedFolderId);
          name = folder?.folderName || folder?.folder_name || '';
        }

        if (name || selectedFolderId) {
          setEditingId(currentId);
          setEditingName(name || '');
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (isCard) handleDelete(currentId, 'card');
        else if (isDoc) { /* ドキュメント削除は未実装なら無視、または必要に応じ追加 */ }
        else handleDelete(currentId, 'folder');
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        if (selectedFolderId) handleCreateCard(selectedFolderId);
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        if (selectedFolderId) handleCreateSubfolder(selectedFolderId);
      }

      if (e.key === 'Enter' && isCard) {
        e.preventDefault();
        onItemSelect({ type: 'card', id: currentId });
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        handleArrowNavigation(e.key, currentId, !!selectedItem);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, selectedFolderId, folders, cards, documents, expandedFolders]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const rootFolders = useMemo(() => folders
    .filter(f => {
      const parentId = f.parentFolderId ?? f.parent_folder_id;
      const isDeleted = f.isDeleted ?? f.is_deleted;
      const isHidden = f.isHidden ?? f.is_hidden;
      return !parentId && !isDeleted && !isHidden;
    })
    .sort((a, b) => {
      const orderA = a.orderIndex ?? a.order_index ?? 0;
      const orderB = b.orderIndex ?? b.order_index ?? 0;
      return orderA - orderB;
    }), [folders]);

  const getChildFolders = (parentId: string) => {
    return folders
      .filter(f => {
        const parent = f.parentFolderId ?? f.parent_folder_id;
        const isDeleted = f.isDeleted ?? f.is_deleted;
        const isHidden = f.isHidden ?? f.is_hidden;
        return parent === parentId && !isDeleted && !isHidden;
      })
      .sort((a, b) => {
        const orderA = a.orderIndex ?? a.order_index ?? 0;
        const orderB = b.orderIndex ?? b.order_index ?? 0;
        return orderA - orderB;
      });
  };

  const getFolderCards = (folderId: string | null) => {
    return cards
      .filter(c => {
        const cardFolderId = c.folderId;
        const isDeleted = c.isDeleted;
        return cardFolderId === folderId && !isDeleted;
      })
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  };

  /**
   * ✅ ExplorerItem[] を返すように修正
   */
  const getFolderItems = (folderId: string | null): ExplorerItem[] => {
    const fCards: ExplorerItem[] = cards
      .filter(c => c.folderId === folderId && !c.isDeleted)
      .map(c => ({ type: 'card', data: c }));

    const fDocs: ExplorerItem[] = documents
      .filter(d => d.folderId === folderId && !d.isDeleted)
      .map(d => ({ type: 'document', data: d }));

    return [...fCards, ...fDocs].sort((a, b) => {
      const orderA = a.data.orderIndex ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.data.orderIndex ?? Number.MAX_SAFE_INTEGER;
      
      if (orderA !== orderB) return orderA - orderB;
      
      // タイブレーク: updatedAt (新しい順)
      const timeA = a.data.updatedAt instanceof Date 
        ? a.data.updatedAt.getTime() 
        : (a.data.updatedAt?.toDate?.()?.getTime() ?? 0);
      const timeB = b.data.updatedAt instanceof Date 
        ? b.data.updatedAt.getTime() 
        : (b.data.updatedAt?.toDate?.()?.getTime() ?? 0);
      return timeB - timeA;
    });
  };

  // フィルタリング時の再帰的なマッチ数計算
  const getRecursiveMatchCount = (folderId: string): number => {
    const directCount = getFolderItems(folderId).length;
    const children = getChildFolders(folderId);
    const childCount = children.reduce((acc, child) => acc + getRecursiveMatchCount(child.id || (child as any).folderId), 0);
    return directCount + childCount;
  };

  const handleCreateSubfolder = async (parentId: string) => {
    const name = prompt('新しいフォルダ名を入力してください');
    if (name && onCreateFolder) {
      await onCreateFolder(name, parentId);
      setExpandedFolders(prev => new Set(prev).add(parentId));
    }
  };

  const handleCreateCard = async (folderId: string) => {
    if (onCreateCard) {
      await onCreateCard({ folderId, title: '新規カード', blocks: [] });
      setExpandedFolders(prev => new Set(prev).add(folderId));
    }
  };

  const handleRenameConfirm = async () => {
    if (!editingId || !editingName.trim()) {
      setEditingId(null);
      return;
    }
    const isFolder = folders.some(f => (f.id || f.folderId) === editingId);
    if (isFolder) {
      await onUpdateFolder?.(editingId, { folderName: editingName });
    } else {
      await onUpdateCard?.(editingId, { title: editingName });
    }
    setEditingId(null);
  };

  const handleDelete = async (id: string, type: 'folder' | 'card') => {
    const confirmMessage = type === 'folder'
      ? 'このフォルダを削除しますか?'
      : 'このカードを削除しますか?';

    if (!confirm(confirmMessage)) return;

    if (type === 'folder') await onDeleteFolder?.(id);
    else await onDeleteCard?.(id);
  };

  const handleMoveCard = async (cardId: string) => {
    const targetFolderName = prompt('移動先のフォルダ名を入力してください(完全一致)');
    if (!targetFolderName) return;

    const targetFolder = folders.find(f => (f.folderName || f.folder_name) === targetFolderName);

    if (targetFolder) {
      await onUpdateCard?.(cardId, { folderId: targetFolder.id || targetFolder.folderId });
    } else {
      alert('フォルダが見つかりませんでした。');
    }
  };

  const handleArrowNavigation = (key: string, currentId: string, hasItemSelection: boolean) => {
    const flatList: Array<{ id: string; type: 'folder' | 'card' | 'document'; parentId: string | null }> = [];

    const addFolderAndChildren = (folderId: string | null) => {
      const folderList = folderId === null ? rootFolders : getChildFolders(folderId);

      folderList.forEach(folder => {
        const id = folder.id ?? folder.folderId;
        flatList.push({ id, type: 'folder', parentId: folderId });

        if (expandedFolders.has(id)) {
          addFolderAndChildren(id);
          getFolderItems(id).forEach(item => {
            flatList.push({ 
              id: item.data.id || (item.data as any).cardId || (item.data as any).documentId, 
              type: item.type as any, 
              parentId: id 
            });
          });
        }
      });
    };

    addFolderAndChildren(null);

    const currentIndex = flatList.findIndex(item => item.id === currentId);
    if (currentIndex === -1) return;

    const currentItem = flatList[currentIndex];

    if (key === 'ArrowUp' && currentIndex > 0) {
      const prevItem = flatList[currentIndex - 1];
      if (prevItem.type === 'folder') onFolderSelect(prevItem.id);
      else onItemSelect({ type: prevItem.type, id: prevItem.id });
    } else if (key === 'ArrowDown' && currentIndex < flatList.length - 1) {
      const nextItem = flatList[currentIndex + 1];
      if (nextItem.type === 'folder') onFolderSelect(nextItem.id);
      else onItemSelect({ type: nextItem.type, id: nextItem.id });
    } else if (key === 'ArrowRight' && currentItem.type === 'folder') {
      if (!expandedFolders.has(currentId)) {
        toggleFolder(currentId);
      } else {
        const children = getChildFolders(currentId);
        const folderItems = getFolderItems(currentId);
        if (children.length > 0) onFolderSelect(children[0].id ?? children[0].folderId);
        else if (folderItems.length > 0) {
          onItemSelect({ 
            type: folderItems[0].type === 'card' ? 'card' : 'document', 
            id: folderItems[0].data.id || (folderItems[0].data as any).cardId || (folderItems[0].data as any).documentId 
          });
        }
      }
    } else if (key === 'ArrowLeft') {
      if (currentItem.type === 'folder' && expandedFolders.has(currentId)) {
        toggleFolder(currentId);
      } else if (currentItem.parentId) {
        onFolderSelect(currentItem.parentId);
      }
    }
  };

  const renderFolder = (folder: any, depth: number = 0) => {
    const folderId = folder.id ?? folder.folderId;
    const folderName = folder.folderName ?? folder.folder_name ?? '(名称未設定)';
    const isExpanded = expandedFolders.has(folderId);
    const isSelected = selectedFolderId === folderId;
    const isEditing = editingId === folderId;
    const childFolders = getChildFolders(folderId);
    const folderCards = isExpanded ? getFolderCards(folderId) : [];
    const hasContextMenu = onCreateFolder || onUpdateFolder || onDeleteFolder;

    const isPinned = favorites?.some(f => f.type === 'folder' && f.id === folderId);
    const handleTogglePin = () => {
      if (isPinned) onRemoveFavorite?.({ type: 'folder', id: folderId });
      else onAddFavorite?.({ type: 'folder', id: folderId });
    };

    const matchCount = isFiltering ? getRecursiveMatchCount(folderId) : -1;
    const isDimmed = isFiltering && matchCount === 0;

    return (
      <div key={folderId} className={cn(isDimmed && "opacity-50")}>
        <Droppable droppableId={DnDHelpers.createCardDroppableId(folderId)}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                ROW_BASE,
                isSelected && "bg-primary-50",
                "hover:bg-slate-100",
                snapshot.isDraggingOver && "bg-blue-100 ring-1 ring-blue-300"
              )}
              style={{
                paddingLeft: `${depth * 16 + 8}px`,
                height: 32,
                minHeight: 32,
                boxSizing: 'border-box',
              }}
            >
              <div
                className="flex-1 flex items-center min-w-0 h-full cursor-pointer"
                onClick={() => {
                  if (!isEditing) {
                    toggleFolder(folderId);
                    onFolderSelect(folderId);
                  }
                }}
              >
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 mr-1">
                  {(childFolders.length > 0 ||
                    (isFiltering ? matchCount > 0 : getFolderItems(folderId).length > 0)) ? (
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
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameConfirm();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onBlur={handleRenameConfirm}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="flex items-center gap-1 flex-1 overflow-hidden">
                    <span className={cn("text-sm truncate leading-5", isSelected ? "text-primary-700 font-medium" : "text-slate-700")}>
                      {folderName}
                    </span>
                    {isFiltering && matchCount === 0 && <span className="text-xs text-slate-400">(0)</span>}
                  </div>
                )}
              </div>

              {hasContextMenu && !isEditing && (
                <div className="absolute right-1 top-0 h-full flex items-center pointer-events-none">
                  <ContextMenu
                    type="folder"
                    onCreateSubfolder={() => handleCreateSubfolder(folderId)}
                    onCreateCard={() => handleCreateCard(folderId)}
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
                </div>
              )}
              <div className="hidden">{provided.placeholder}</div>
            </div>
          )}
        </Droppable>

        {isExpanded && (
          <div>
            {childFolders.map(childFolder => renderFolder(childFolder, depth + 1))}

            <Droppable droppableId={DnDHelpers.createCardListDroppableId(folderId)}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className={cn("min-h-[2px] block")}>
                  {getFolderItems(folderId).map((item, index) => (
                    item.type === 'card' 
                      ? renderCard(item.data, depth + 1, index)
                      : renderDocument(item.data, depth + 1, index)
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        )}
      </div>
    );
  };

  /**
   * ✅追加: PDFドキュメントのレンダリング
   */
  const renderDocument = (doc: DocumentItem, depth: number, index: number) => {
    const docId = doc.id;
    const title = doc.title || '無題のドキュメント';
    const isSelected = selectedItem?.type === 'document' && selectedItem.id === docId;
    
    return (
      <div
        key={docId}
        className={cn(
          ROW_BASE,
          isSelected && "bg-primary-50",
          "hover:bg-slate-100 cursor-pointer"
        )}
        style={{
          paddingLeft: `${depth * 16 + 8}px`,
          height: 32,
          minHeight: 32,
          boxSizing: 'border-box',
        }}
        onClick={() => {
          onItemSelect({ type: 'document', id: docId });
          if (doc.downloadUrl) {
            window.open(doc.downloadUrl, '_blank', 'noopener,noreferrer');
          }
        }}
      >
        <div className="flex-1 flex items-center min-w-0 h-full">
          <FileText className="w-4 h-4 text-rose-500 mr-2 shrink-0" />
          <span className={cn(
            "text-sm truncate leading-5",
            isSelected ? "text-primary-700 font-medium" : "text-slate-700"
          )}>
            {title}
          </span>
          {doc.sizeBytes && (
            <span className="ml-2 text-[10px] text-slate-400 shrink-0">
              {(doc.sizeBytes / 1024).toFixed(1)}KB
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderCard = (card: Card, depth: number, index: number) => {
    const cardId = card.id;
    const cardTitle = card.title || '無題のカード';
    const isSelected = selectedItem?.type === 'card' && selectedItem.id === cardId;
    const isEditing = editingId === cardId;
    const hasContextMenu = onUpdateCard || onDeleteCard;

    const isPinned = favorites?.some(f => f.type === 'card' && f.id === cardId);
    const handleTogglePin = () => {
      if (isPinned) onRemoveFavorite?.({ type: 'card', id: cardId });
      else onAddFavorite?.({ type: 'card', id: cardId });
    };

    return (
      <Draggable key={cardId} draggableId={DnDHelpers.createCardDraggableId(cardId)} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={cn(
              ROW_BASE,
              isSelected && "bg-primary-50",
              "hover:bg-slate-100",
              snapshot.isDragging && "bg-white shadow-lg opacity-90 z-50 ring-1 ring-primary-200"
            )}
            style={{
              ...provided.draggableProps.style,
              paddingLeft: `${depth * 16 + 8}px`,
              height: 32,
              minHeight: 32,
              boxSizing: 'border-box',
            }}
          >
            <div
              className="flex-1 flex items-center min-w-0 h-full cursor-pointer"
              onClick={() => {
                if (!isEditing) onItemSelect({ type: 'card', id: cardId });
              }}
            >
              <div className="w-4 h-4 flex-shrink-0 mr-1" />
              <FileText className={cn("w-4 h-4 flex-shrink-0 mr-1", isPinned ? "text-amber-500 fill-amber-100" : "text-slate-400")} />

              {isEditing ? (
                <input
                  ref={editInputRef}
                  aria-label="カード名の編集"
                  className="text-sm bg-white border border-primary-300 rounded px-1 outline-none ring-1 ring-primary-100 h-6 w-full leading-5"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameConfirm();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onBlur={handleRenameConfirm}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="flex items-center gap-1 flex-1 overflow-hidden">
                  <span className={cn("text-sm truncate leading-5", isSelected ? "text-primary-700 font-medium" : "text-slate-600")}>
                    {cardTitle}
                  </span>
                </div>
              )}
            </div>

            {hasContextMenu && !isEditing && (
              <div className="absolute right-1 top-0 h-full flex items-center pointer-events-none">
                <ContextMenu
                  type="card"
                  onRename={() => {
                    setEditingId(cardId);
                    setEditingName(cardTitle);
                  }}
                  onMove={() => handleMoveCard(cardId)}
                  onDelete={() => handleDelete(cardId, 'card')}
                  isPinned={isPinned}
                  onTogglePin={handleTogglePin}
                >
                  <button
                    type="button"
                    aria-label="カードメニューを開く"
                    className="h-6 w-6 p-0 grid place-items-center rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 outline-none pointer-events-auto transition-colors shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </ContextMenu>
              </div>
            )}
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="">
        {rootFolders.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Folder className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">フォルダがありません</p>
          </div>
        ) : (
          <div>
            {rootFolders.map(folder => renderFolder(folder, 0))}
          </div>
        )}
      </div>
    </DragDropContext>
  );
}
