import React, { useState, useEffect, useRef, useMemo } from 'react';
import FolderColumn from './FolderColumn';
import type { Folder } from '@/types';
import { useTags } from '@/hooks/useTags';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';
import { Tag as TagIcon, X } from 'lucide-react';
import { DragDropContext } from '@hello-pangea/dnd';

interface ColumnNavigatorProps {
  folders: Folder[];
  allFolders: Folder[];
  cards: any[];
  onSelect: (folderId: string) => void;
  onCardSelect?: (cardId: string) => void;
  onCreateCard: (folderId: string) => void;
  onCreateFolder: (parentId: string | null) => void;
  onQuickCreateFolder?: (name: string, parentId: string | null) => Promise<void>;
  onEdit: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
  onHide: (folder: Folder) => void;
  onToggleSilent: (folder: Folder) => void;
  onReorder?: (folders: Folder[], parentId: string | null, shouldUpdateUI: boolean) => void;
  isEditMode?: boolean;
  // 複数選択用のプロップス
  isSelectionMode?: boolean;
  selectedFolderIds?: string[];
  onToggleSelection?: (id: string) => void;
}

export default function ColumnNavigator({
  folders, // 実際には全フォルダが渡される場合が多いが、整合性のため allFolders を優先
  allFolders,
  cards,
  onSelect,
  onCardSelect,
  onCreateCard,
  onCreateFolder,
  onQuickCreateFolder,
  onEdit,
  onDelete,
  onHide,
  onToggleSilent,
  onReorder,
  isEditMode,
  isSelectionMode,
  selectedFolderIds,
  onToggleSelection,
}: ColumnNavigatorProps) {
  // 階層パス: [null, 'folder-1', 'folder-2', ...]
  const [hierarchyPath, setHierarchyPath] = useState<(string | null)[]>([null]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // キーボードナビゲーション用の状態
  const [focusedColumnIndex, setFocusedColumnIndex] = useState<number>(0);
  const [focusedFolderIndex, setFocusedFolderIndex] = useState<number>(0);
  
  // ナビゲーション履歴管理
  const [navigationHistory, setNavigationHistory] = useState<(string | null)[][]>([[null]]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // タグ関連の状態
  const { tags } = useTags();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // ユニークなタグ名のリストを取得(rootFolderIdに依存しない全タグの一覧を表示)
  const uniqueTagNames = useMemo(() => {
    const names = new Set<string>();
    tags.forEach(t => names.add(t.name));
    return Array.from(names).sort();
  }, [tags]);

  // 表示すべきフォルダIDのセットを計算
  const visibleFolderIds = useMemo(() => {
    if (selectedTags.length === 0) return null;

    const visibleSet = new Set<string>();
    
    // 1. 選択されたタグを持つカードが含まれるフォルダを特定
    const targetFolderIds = new Set<string>();
    cards.forEach(card => {
      const cardTags = card.tags || [];
      if (selectedTags.some(tag => cardTags.includes(tag))) {
        const folderId = card.folderId || card.folder_id;
        if (folderId) targetFolderIds.add(folderId);
      }
    });

    // 2. それらのフォルダ、およびそのすべての親(祖先)フォルダを可視化セットに追加
    const folderMap = new Map<string, Folder>();
    allFolders.forEach(f => {
      const id = f.id || f.folderId;
      if (id) folderMap.set(id, f);
    });

    targetFolderIds.forEach(id => {
      let currentId: string | null = id;
      while (currentId) {
        visibleSet.add(currentId);
        const folder = folderMap.get(currentId);
        currentId = folder ? (folder.parentFolderId || (folder as any).parent_folder_id || null) : null;
      }
    });

    return visibleSet;
  }, [selectedTags, cards, allFolders]);

  // 現在のカラムで表示されているフォルダリストを取得
  const getCurrentColumnFolders = (columnIndex: number) => {
    const parentId = hierarchyPath[columnIndex];
    return allFolders
      .filter((f) => {
        const isDeleted = f.isDeleted ?? (f as any).is_deleted;
        const pId = f.parentFolderId ?? (f as any).parent_folder_id ?? null;
        const folderId = f.id || f.folderId;
        
        const isMatch = pId === parentId && (isDeleted === undefined || isDeleted === false);
        if (!isMatch) return false;

        if (visibleFolderIds && folderId && !visibleFolderIds.has(folderId)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  };

  // タグのトグル
  const toggleTag = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  // ナビゲーション履歴に追加
  const addToHistory = (path: (string | null)[]) => {
    const newHistory = navigationHistory.slice(0, historyIndex + 1);
    newHistory.push([...path]);
    setNavigationHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // ショートカットキーハンドラー: ↑ - 前のフォルダを選択
  const handleArrowUp = () => {
    const folders = getCurrentColumnFolders(focusedColumnIndex);
    if (folders.length === 0) return;
    
    setFocusedFolderIndex(prev => Math.max(0, prev - 1));
  };

  // ショートカットキーハンドラー: ↓ - 次のフォルダを選択
  const handleArrowDown = () => {
    const folders = getCurrentColumnFolders(focusedColumnIndex);
    if (folders.length === 0) return;
    
    setFocusedFolderIndex(prev => Math.min(folders.length - 1, prev + 1));
  };

  // ショートカットキーハンドラー: → - フォルダを開く
  const handleArrowRight = () => {
    const folders = getCurrentColumnFolders(focusedColumnIndex);
    if (folders.length === 0) return;
    
    const selectedFolder = folders[focusedFolderIndex];
    if (!selectedFolder) return;
    
    const folderId = selectedFolder.id || selectedFolder.folderId;
    handleFolderClick(folderId, focusedColumnIndex);
    
    // 次のカラムにフォーカスを移動
    setFocusedColumnIndex(prev => prev + 1);
    setFocusedFolderIndex(0);
  };

  // ショートカットキーハンドラー: ← - 親フォルダへ戻る
  const handleArrowLeft = () => {
    if (focusedColumnIndex > 0) {
      setFocusedColumnIndex(prev => prev - 1);
      setFocusedFolderIndex(0);
      
      // 階層パスを一つ戻す
      const newPath = hierarchyPath.slice(0, -1);
      if (newPath.length > 0) {
        setHierarchyPath(newPath);
        addToHistory(newPath);
      }
    }
  };

  // ショートカットキーハンドラー: Alt + ← - 履歴を戻る
  const handleHistoryBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setHierarchyPath([...navigationHistory[newIndex]]);
      setFocusedColumnIndex(Math.max(0, navigationHistory[newIndex].length - 1));
      setFocusedFolderIndex(0);
    }
  };

  // ショートカットキーハンドラー: Alt + → - 履歴を進む
  const handleHistoryForward = () => {
    if (historyIndex < navigationHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setHierarchyPath([...navigationHistory[newIndex]]);
      setFocusedColumnIndex(Math.max(0, navigationHistory[newIndex].length - 1));
      setFocusedFolderIndex(0);
    }
  };

  // ショートカットキーハンドラー: Ctrl/Cmd + N - 新規フォルダ
  const handleCreateFolder = () => {
    const parentId = hierarchyPath[focusedColumnIndex];
    onCreateFolder(parentId);
  };

  // ショートカットキーハンドラー: Ctrl/Cmd + Shift + N - 新規カード
  const handleCreateCard = () => {
    const folders = getCurrentColumnFolders(focusedColumnIndex);
    if (folders.length === 0) return;
    
    const selectedFolder = folders[focusedFolderIndex];
    if (!selectedFolder) return;
    
    const folderId = selectedFolder.id || selectedFolder.folderId;
    onCreateCard(folderId);
  };

  // ショートカットキーハンドラー: Enter / F2 - 名前変更
  const handleRename = () => {
    const folders = getCurrentColumnFolders(focusedColumnIndex);
    if (folders.length === 0) return;
    
    const selectedFolder = folders[focusedFolderIndex];
    if (selectedFolder) {
      onEdit(selectedFolder);
    }
  };

  // ショートカットキーハンドラー: Delete - 削除
  const handleDelete = () => {
    const folders = getCurrentColumnFolders(focusedColumnIndex);
    if (folders.length === 0) return;
    
    const selectedFolder = folders[focusedFolderIndex];
    if (selectedFolder) {
      onDelete(selectedFolder);
    }
  };

  // フォルダクリック時: 階層パスを更新
  const handleFolderClick = (folderId: string, columnIndex: number) => {
    const newPath = hierarchyPath.slice(0, columnIndex + 1);
    
    // 子フォルダがあるか、またはそのフォルダ直下にカードがある場合のみ次のカラムを追加
    const hasChildFolder = allFolders.some(f => 
      (f.parentFolderId || (f as any).parent_folder_id) === folderId && 
      !(f.isDeleted || (f as any).is_deleted) &&
      (!visibleFolderIds || visibleFolderIds.has(f.id || f.folderId))
    );

    const hasCards = cards.some(c => 
      (c.folderId || (c as any).folder_id) === folderId && 
      !(c.isDeleted || (c as any).is_deleted)
    );

    if (hasChildFolder || hasCards) {
      newPath.push(folderId);
    }
    
    setHierarchyPath(newPath);
    addToHistory(newPath); // 履歴に追加
  };

  // フォルダ名を取得
  const getFolderName = (folderId: string | null): string => {
    if (folderId === null) return 'すべてのフォルダ';
    const folder = allFolders.find((f) => f.id === folderId || f.folderId === folderId);
    return folder ? (folder.folderName || (folder as any).folder_name || '(名称未設定)') : '(不明なフォルダ)';
  };

  // ショートカットキーの登録
  useKeyboardShortcuts([
    // ナビゲーション系
    { key: 'ArrowUp', action: handleArrowUp, description: '前のフォルダを選択' },
    { key: 'ArrowDown', action: handleArrowDown, description: '次のフォルダを選択' },
    { key: 'ArrowRight', action: handleArrowRight, description: 'フォルダを開く' },
    { key: 'ArrowLeft', action: handleArrowLeft, description: '親フォルダへ戻る' },
    { key: 'ArrowLeft', alt: true, action: handleHistoryBack, description: '履歴: 前の場所' },
    { key: 'ArrowRight', alt: true, action: handleHistoryForward, description: '履歴: 次の場所' },
    
    // フォルダ・カード操作系
    { key: 'n', ctrl: true, action: handleCreateFolder, description: '新規フォルダ' },
    { key: 'n', ctrl: true, shift: true, action: handleCreateCard, description: '新規カード' },
    { key: 'Enter', action: handleRename, description: '名前変更' },
    { key: 'F2', action: handleRename, description: '名前変更(Windows)' },
    { key: 'Delete', action: handleDelete, description: '削除' },
    { key: 'Backspace', action: handleDelete, description: '削除' },
  ]);

  // 横スクロールを右端に移動
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      setTimeout(() => {
        container.scrollTo({
          left: container.scrollWidth,
          behavior: 'smooth'
        });
      }, 50);
    }
  }, [hierarchyPath]);

  // フィルタ適用時にパスをリセット(ルートに戻す)
  useEffect(() => {
    setHierarchyPath([null]);
  }, [selectedTags]);

  // ドラッグ終了時の処理
  const handleDragEnd = (result: any) => {
    if (!result.destination || !onReorder) return;

    const { source, destination, draggableId } = result;

    // 同じ場所でのドロップ
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // 親IDの特定
    let sourceParentId: string | null = null;
    let destParentId: string | null = null;

    if (source.droppableId === 'column-null') {
      sourceParentId = null;
    } else if (source.droppableId.startsWith('column-')) {
      sourceParentId = source.droppableId.replace('column-', '');
    }

    if (destination.droppableId === 'column-null') {
      destParentId = null;
    } else if (destination.droppableId.startsWith('column-')) {
      destParentId = destination.droppableId.replace('column-', '');
    } else if (destination.droppableId.startsWith('drop-')) {
      // フォルダ自体にドロップされた場合、そのフォルダを親にする
      destParentId = destination.droppableId.replace('drop-', '');
    }

    const draggedItem = allFolders.find(f => (f.id || f.folderId) === draggableId);
    if (!draggedItem) return;

    // 自分自身や自分の子孫フォルダの中には移動できない
    if (destParentId === draggableId) return;
    const isDescendant = (parentId: string | null, targetId: string): boolean => {
      if (!parentId) return false;
      if (parentId === targetId) return true;
      const parent = allFolders.find(f => (f.id ?? f.folderId) === parentId);
      if (!parent) return false;
      return isDescendant(parent.parentFolderId ?? (parent as any).parent_folder_id ?? null, targetId);
    };
    if (isDescendant(destParentId, draggableId)) return;

    // 階層制限チェック
    const getDepth = (folderId: string | null, visited = new Set<string>()): number => {
      if (!folderId || visited.has(folderId)) return 0;
      visited.add(folderId);
      
      const folder = allFolders.find(f => (f.id ?? f.folderId) === folderId);
      if (!folder) return 0;
      
      const parentId = folder.parentFolderId ?? (folder as any).parent_folder_id ?? null;
      if (!parentId) return 0;
      
      return 1 + getDepth(parentId, visited);
    };

    const maxDepth = Math.max(
      0,
      ...allFolders
        .filter(f => {
          const isDeleted = f.isDeleted ?? (f as any).is_deleted;
          return isDeleted === undefined || isDeleted === false;
        })
        .map(f => getDepth(f.id ?? f.folderId))
    );

    const draggedDepth = getDepth(draggableId);
    const destDepth = destParentId ? getDepth(destParentId) + 1 : 0;

    // ルートフォルダーは他のフォルダーの子にできない制限（FolderTree.tsxに合わせる）
    if (sourceParentId === null && destParentId !== null) {
      console.log('ルートフォルダーは他のフォルダーの子にできません');
      return;
    }

    // 最大深度制限
    if (draggedDepth === maxDepth && destDepth > draggedDepth) {
      console.log('これ以上深い階層には移動できません');
      return;
    }

    // 移動処理
    if (source.droppableId === destination.droppableId) {
      // 同じカラム内での並び替え
      const siblings = allFolders
        .filter(f => {
          const pId = f.parentFolderId ?? (f as any).parent_folder_id ?? null;
          const isDeleted = f.isDeleted ?? (f as any).is_deleted;
          return pId === sourceParentId && (isDeleted === undefined || isDeleted === false);
        })
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

      const [reorderedItem] = siblings.splice(source.index, 1);
      siblings.splice(destination.index, 0, reorderedItem);

      onReorder(siblings, sourceParentId, true);
    } else {
      // 別のカラムまたはフォルダへの移動
      const sourceSiblings = allFolders
        .filter(f => {
          const pId = f.parentFolderId ?? (f as any).parent_folder_id ?? null;
          const isDeleted = f.isDeleted ?? (f as any).is_deleted;
          return pId === sourceParentId && (f.id || f.folderId) !== draggableId && (isDeleted === undefined || isDeleted === false);
        })
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
      
      const destSiblings = allFolders
        .filter(f => {
          const pId = f.parentFolderId ?? (f as any).parent_folder_id ?? null;
          const isDeleted = f.isDeleted ?? (f as any).is_deleted;
          return pId === destParentId && (isDeleted === undefined || isDeleted === false);
        })
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

      const insertIndex = destination.droppableId.startsWith('drop-') ? 0 : destination.index;
      destSiblings.splice(insertIndex, 0, draggedItem);
      
      onReorder(sourceSiblings, sourceParentId, false);
      onReorder(destSiblings, destParentId, true);
    }
  };

  return (
    <div className="relative w-full space-y-3">
      {/* タグ選択UI */}
      {uniqueTagNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <div className="flex items-center gap-1.5 mr-2 text-slate-400">
            <TagIcon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">タグ絞り込み:</span>
          </div>
          {uniqueTagNames.map(tagName => {
            const isSelected = selectedTags.includes(tagName);
            return (
              <button
                key={tagName}
                onClick={() => toggleTag(tagName)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200 border",
                  isSelected
                    ? "bg-primary-500 text-white border-primary-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-primary-300 hover:bg-slate-50"
                )}
              >
                {tagName}
              </button>
            );
          })}
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-3 h-3" />
              <span className="text-[10px] font-medium">クリア</span>
            </button>
          )}
        </div>
      )}

      {/* 横スクロールコンテナ */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div
          ref={scrollContainerRef}
          className="flex gap-0 overflow-x-auto pb-4 pt-1 px-1 scroll-smooth no-scrollbar bg-white border border-slate-300/40 rounded-xl shadow-md overflow-hidden"
          style={{
            height: '500px'
          }}
        >
          {hierarchyPath.map((parentId, index) => {
            const parentName = getFolderName(parentId);
            // この階層で選択されている（次のカラムを開いている）フォルダID
            const activeFolderId = hierarchyPath[index + 1] || null;
            
            return (
              <FolderColumn
                key={`${parentId}-${index}`}
                parentId={parentId}
                parentName={parentName}
                folders={allFolders} // 常に全フォルダから検索
                allFolders={allFolders}
                cards={cards}
                onFolderClick={(folderId) => handleFolderClick(folderId, index)}
                onCreateCard={onCreateCard}
                onCreateFolder={onCreateFolder}
                onQuickCreateFolder={onQuickCreateFolder}
                onEdit={onEdit}
                onDelete={onDelete}
                onHide={onHide}
                onToggleSilent={onToggleSilent}
                onSelect={onSelect} // フォルダを開くボタン用
                onCardClick={onCardSelect}
                selectedFolderId={activeFolderId as string}
                visibleFolderIds={visibleFolderIds}
                selectedTags={selectedTags} // 🔥 Add this
                isSelectionMode={isSelectionMode}
                selectedFolderIds={selectedFolderIds}
                onToggleSelection={onToggleSelection}
              />
            );
          })}
        </div>
      </DragDropContext>

      {/* スクロールヒント */}
      <div className="absolute top-0 right-0 bottom-4 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none z-20 rounded-r-xl"></div>
    </div>
  );
}
