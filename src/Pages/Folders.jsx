import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCards } from '@/hooks/useCards';
import { useFolders } from '@/hooks/useFolders';
import { useDocuments } from '@/hooks/useDocuments'; // ✅追加
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getLocalDb } from '../services/localDB';
import { firestoreDb } from '@/services/firebase';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Skeleton } from '@/Components/ui/skeleton';
import { Checkbox } from '@/Components/ui/checkbox';
import FolderTree from '@/Components/folder/FolderTree';
import ColumnNavigator from '@/Components/folder/ColumnNavigator';
import TreeViewLayout from '@/Components/folder/TreeViewLayout';
import FolderDialog from '@/Components/folder/FolderDialog';
import TagManagerDialog from '@/Components/tag/TagManagerDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { MoreVertical, Settings, Tag, Trash2, Plus, BellOff, Bell, ArrowLeft, ChevronRight, Edit, X } from 'lucide-react';
import EyeOffIcon from 'lucide-react/dist/esm/icons/eye-off';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import backgroundImage from '@/assets/background.jpg';

export default function Folders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // 選択状態
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null); // { type: 'card' | 'document', id: string } | null加
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [parentFolderId, setParentFolderId] = useState(null);
  const [selectedFolderIds, setSelectedFolderIds] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // モバイル専用の編集モード
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem('folderViewMode');
    return saved !== null ? saved : 'tree';
  });

  // 範囲選択用の状態
  const [selectionRect, setSelectionRect] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const containerRef = useRef(null);

  // 表示モードが変更されたらlocalStorageに保存
  useEffect(() => {
    localStorage.setItem('folderViewMode', viewMode);
  }, [viewMode]);

  // 作業モード時、html要素にno-page-scrollクラスを追加してページ全体のスクロールを無効化
  useEffect(() => {
    if (viewMode === 'work') {
      document.documentElement.classList.add('no-page-scroll');
    } else {
      document.documentElement.classList.remove('no-page-scroll');
    }
    // cleanup: コンポーネントがアンマウントされた時にクラスを削除
    return () => {
      document.documentElement.classList.remove('no-page-scroll');
    };
  }, [viewMode]);

  const [isHiddenOpen, setIsHiddenOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  
  const { folders = [], loading: foldersLoading, error: foldersError } = useFolders();
  const { cards = [], loading: cardsLoading, error: cardsError } = useCards();
  const { documents = [] } = useDocuments(); // ✅追加
  const [displayFolders, setDisplayFolders] = useState([]);
  
  const { createFolder, updateFolder, deleteFolder } = useFolders();
  const { success, error: toastError } = useToast();
  
  const updateFolderMutation = useMutation({
    mutationFn: ({ id, data }) => updateFolder(id, data),
  });
  
  const handleSelectFolder = (folderId) => {
    navigate(createPageUrl(`FolderView?id=${folderId}`));
  };

  const handleSelectCard = (cardId) => {
    navigate(createPageUrl(`CardView?id=${cardId}`));
  };
  
  // --- 選択ハンドラ (Workモード用) ---
  const handleSelectFolderInWork = (folderId) => {
    setSelectedFolderId(folderId);
    setSelectedItem(null);
  };

  const handleSelectCardInWork = (cardId) => {
    // フォルダは解除せず、アイテムのみ更新
    setSelectedItem({ type: 'card', id: cardId });
  };

  // ✅追加: ドキュメント選択時の処理
  const handleSelectDocumentInWork = (docId) => {
    setSelectedItem({ type: 'document', id: docId });
    
    // PDFを開く（FolderTreeWithCards 側でも実行しているが、一貫性のため）
    const doc = documents.find(d => (d.id || d.documentId) === docId);
    if (doc?.downloadUrl) {
      window.open(doc.downloadUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSelectItemInWork = (item) => {
    if (!item) {
      setSelectedItem(null);
      return;
    }
    if (item.type === 'card') handleSelectCardInWork(item.id);
    else if (item.type === 'document') handleSelectDocumentInWork(item.id);
  };
  
  const handleCreateCard = (folderId) => {
    navigate(createPageUrl(`CardEdit?folderId=${folderId}`));
  };
  
  const handleCreateFolder = (parentId) => {
    setEditingFolder(null);
    setParentFolderId(parentId);
    setFolderDialogOpen(true);
  };
  
  const handleEditFolder = (folder) => {
    setEditingFolder(folder);
    setParentFolderId(null);
    setFolderDialogOpen(true);
  };
  
  const handleDeleteFolder = (folder) => {
    handleConfirmDelete(folder);
  };

  const handleHideFolder = async (folder) => {
    const targetFolderId = folder.folderId ?? folder.id;
    if (!targetFolderId) return;

    const getDescendantIds = (parentId, visited = new Set()) => {
      if (visited.has(parentId)) return [];
      visited.add(parentId);

      const children = folders.filter(f => {
        const parent = f.parentFolderId ?? f.parent_folder_id ?? null;
        const isDeleted = f.isDeleted ?? f.is_deleted;
        return parent === parentId && (isDeleted === undefined || isDeleted === false);
      });
      let ids = [];
      children.forEach(child => {
        const childId = child.folderId ?? child.id;
        if (childId) {
          ids.push(childId);
          ids = [...ids, ...getDescendantIds(childId, visited)];
        }
      });
      return ids;
    };

    const folderIdsToHide = [targetFolderId, ...getDescendantIds(targetFolderId)];

    for (const id of folderIdsToHide) {
      await updateFolderMutation.mutateAsync({
        id,
        data: {
          isHidden: true,
          is_hidden: true
        }
      });
    }
  };
  
  const handleSaveFolder = async (data, folderId) => {
    if (folderId) {
      await updateFolderMutation.mutateAsync({ 
        id: folderId, 
        data: {
          folderName: data.folderName,
          folderColor: data.folderColor,
          cloudSyncEnabled: data.cloudSyncEnabled ?? true,
        }
      });
    } else {
      try {
          // Guard: ensure Firestore is initialized before proceeding to createFolder
          if (typeof firestoreDb === 'undefined' || firestoreDb == null) {
            console.error('[Folders] Firestore is not initialized. Aborting createFolder.');
            toastError('システムエラー: データベースが初期化されていません');
            return;
          }

          await createFolder(
            data.folderName || data.folder_name, 
            data.parentFolderId || data.parent_folder_id, 
            data.folderColor,
            data.cloudSyncEnabled ?? true
          );
        success('フォルダを作成しました');
      } catch (err) {
        console.error('createFolder failed', err);
        toastError('フォルダの作成に失敗しました');
        throw err;
      }
    }
  };
  
  const handleToggleSelection = (folderId) => {
    setSelectedFolderIds(prev => 
      prev.includes(folderId) 
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedFolderIds.length === activeFolders.length) {
      setSelectedFolderIds([]);
    } else {
      setSelectedFolderIds(activeFolders.map(f => f.id ?? f.folderId));
    }
  };

  const handleBulkSilent = async () => {
    const updates = selectedFolderIds.map(id => 
      updateFolderMutation.mutateAsync({
        id,
        data: { isSilent: true, is_silent: true }
      })
    );
    await Promise.all(updates);
    setSelectedFolderIds([]);
    setIsSelectionMode(false);
  };

  const handleBulkUnsilent = async () => {
    const updates = selectedFolderIds.map(id => 
      updateFolderMutation.mutateAsync({
        id,
        data: { isSilent: false, is_silent: false }
      })
    );
    await Promise.all(updates);
    setSelectedFolderIds([]);
    setIsSelectionMode(false);
  };

  const handleBulkDelete = async () => {
    for (const id of selectedFolderIds) {
      const folder = folders.find(f => (f.id ?? f.folderId) === id);
      if (folder) {
        await handleConfirmDelete(folder);
      }
    }
    setSelectedFolderIds([]);
    setIsSelectionMode(false);
  };

  const handleConfirmDelete = async (folder) => {
    const targetFolderId = folder.folderId ?? folder.id;
    if (!targetFolderId) return;

    try {
      // hooks 経由で削除（Local softDelete + Sync Queue）
      await deleteFolder(targetFolderId);
    } catch (error) {
      console.error("Delete operation failed:", error);
    }
  };

  // 範囲選択のマウスイベント
  const handleMouseDown = (e) => {
    // 作業モードでは範囲選択を無効化
    if (viewMode === 'work') {
      return;
    }
    
    // ボタンや入力要素、または既にチェックボックスをクリックしている場合は無視
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('[role="button"]')) {
      return;
    }

    // 選択モードがオフ、かつシングルクリックでないことを期待（ドラッグ開始のみ）
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!dragStart) return;

      const x = Math.min(dragStart.x, e.clientX);
      const y = Math.min(dragStart.y, e.clientY);
      const width = Math.abs(dragStart.x - e.clientX);
      const height = Math.abs(dragStart.y - e.clientY);

      // 一定距離（5px以上）ドラッグした場合のみ矩形を表示
      if (width > 5 || height > 5) {
        setSelectionRect({ x, y, width, height });
        if (!isSelectionMode) setIsSelectionMode(true);
      }
    };

    const handleGlobalMouseUp = () => {
      if (dragStart && selectionRect) {
        // 矩形内のアイテムを選択
        const elements = document.querySelectorAll('[data-selectable-id^="folder:"]');
        const newlySelectedIds = [];

        elements.forEach(el => {
          const rect = el.getBoundingClientRect();
          const overlap = !(
            rect.right < selectionRect.x ||
            rect.left > selectionRect.x + selectionRect.width ||
            rect.bottom < selectionRect.y ||
            rect.top > selectionRect.y + selectionRect.height
          );

          if (overlap) {
            const id = el.getAttribute('data-selectable-id').replace('folder:', '');
            newlySelectedIds.push(id);
          }
        });

        if (newlySelectedIds.length > 0) {
          setSelectedFolderIds(prev => {
            const next = new Set([...prev, ...newlySelectedIds]);
            return Array.from(next);
          });
        }
      }

      setDragStart(null);
      setSelectionRect(null);
    };

    if (dragStart) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [dragStart, selectionRect, isSelectionMode]);
  
  useEffect(() => {
    setDisplayFolders(folders);
  }, [folders]);

  const isLoading = foldersLoading || cardsLoading;
  const activeFolders = displayFolders.filter(f => {
    // isDeleted フィールドが存在しない場合 or false の場合のみ表示
    const isDeleted = f.isDeleted ?? f.is_deleted;
    const isHidden = f.isHidden ?? f.is_hidden;
    return (isDeleted === undefined || isDeleted === false) && (isHidden === undefined || isHidden === false);
  });
  const hiddenFolders = displayFolders.filter(f => {
    const isHidden = f.isHidden ?? f.is_hidden;
    return isHidden === true;
  });

  const hasSyncError = foldersError || cardsError;
  
  return (
    <div className={cn(
      "bg-[#F8FAFB] transition-colors duration-500",
      viewMode === 'work' ? 'h-screen overflow-hidden' : 'min-h-screen'
    )}>
      <div className={cn(
        "w-full mx-auto",
        viewMode !== 'work' && "p-2 md:p-4"
      )}>
        {/* Header */}
        <div className={cn(
          "bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6",
          viewMode !== 'work' && "mb-4"
        )}>
            <div className="flex items-center justify-end mb-2 md:mb-4">

              <div className="flex items-center gap-2">
                {/* 表示切り替えボタン (Desktop) */}
                <div className="hidden md:flex items-center bg-slate-50/50 rounded-xl p-1 gap-1 border border-slate-100/50 mr-2">
                  <Button
                    variant={viewMode === 'tree' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-8 px-3 rounded-lg text-xs font-bold ${viewMode === 'tree' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                    onClick={() => setViewMode('tree')}
                  >
                    ツリー
                  </Button>
                  <Button
                    variant={viewMode === 'column' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-8 px-3 rounded-lg text-xs font-bold ${viewMode === 'column' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                    onClick={() => setViewMode('column')}
                  >
                    カラム
                  </Button>
                  <Button
                    variant={viewMode === 'work' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-8 px-3 rounded-lg text-xs font-bold ${viewMode === 'work' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                    onClick={() => setViewMode('work')}
                  >
                    作業
                  </Button>
                </div>

                {/* Desktop Tools */}
                <div className="hidden md:flex items-center bg-slate-50/50 rounded-xl p-1 gap-1 border border-slate-100/50">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-9 h-9 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      onClick={() => setTagManagerOpen(true)}
                    >
                      <Tag className="w-4.5 h-4.5" />
                    </Button>
                    <div className="w-[1px] h-5 bg-slate-200 mx-0.5"></div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-9 h-9 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 relative"
                      onClick={() => navigate(createPageUrl('SyncSettings'))}
                    >
                      <Settings className="w-4.5 h-4.5" />
                      {hasSyncError && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-9 h-9 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      onClick={() => navigate(createPageUrl('Trash'))}
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </Button>
                </div>

                {/* Mobile Tools (Overflow Menu) */}
                <div className="md:hidden flex items-center gap-1">
                  {!isEditMode && !isSelectionMode && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-10 h-10 text-slate-400">
                          <MoreVertical className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="p-2 min-w-[160px] liquid-glass rounded-[20px] shadow-2xl border-none">
                        <DropdownMenuItem onClick={() => setTagManagerOpen(true)} className="rounded-xl py-3">
                          <Tag className="w-4 h-4 mr-3 text-slate-400" />
                          <span>タグ管理</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(createPageUrl('SyncSettings'))} className="rounded-xl py-3">
                          <Settings className="w-4 h-4 mr-3 text-slate-400" />
                          <span>同期設定</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(createPageUrl('Trash'))} className="rounded-xl py-3">
                          <Trash2 className="w-4 h-4 mr-3 text-slate-400" />
                          <span>ゴミ箱</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsEditMode(true)} className="rounded-xl py-3 text-primary-600">
                          <Edit className="w-4 h-4 mr-3" />
                          <span>編集モード</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  
                  {isEditMode && (
                    <Button 
                      variant="ghost" 
                      onClick={() => setIsEditMode(false)}
                      className="text-slate-500 font-bold text-sm"
                    >
                      完了
                    </Button>
                  )}
                </div>

                {/* Shared Selection Mode UI (Desktop & Mobile Refined) */}
                {isSelectionMode ? (
                  <div className="flex items-center gap-1">
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setIsSelectionMode(false);
                          setSelectedFolderIds([]);
                        }}
                        className="h-10 px-4 text-slate-400 font-bold text-xs"
                      >
                        キャンセル
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleBulkDelete}
                        disabled={selectedFolderIds.length === 0}
                        className="h-10 px-4 bg-white text-red-600 font-bold text-xs rounded-xl shadow-sm border border-slate-50"
                      >
                        削除({selectedFolderIds.length})
                      </Button>
                  </div>
                ) : (
                  <div className="hidden md:flex items-center gap-2">
                    <Button
                        variant="ghost"
                        className="h-10 px-6 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-100 border border-slate-200"
                        onClick={() => setIsSelectionMode(true)}
                    >
                        選択
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Edit Mode Banner (Mobile) */}
            {isEditMode && (
              <div className="md:hidden bg-primary-600/10 text-primary-600 px-4 py-2 rounded-xl mb-6 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                <span className="text-xs font-bold">編集モード実行中</span>
                <span className="text-[10px] opacity-70">並び替えや設定が可能です</span>
              </div>
            )}
            
            {/* Folder Tree / Column Navigator */}
            <div 
              ref={containerRef}
              onMouseDown={handleMouseDown}
              className={cn(
                "min-h-[400px]",
                viewMode !== 'work' && "mb-20 md:mb-0"
              )}
            >
              {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                ))}
              </div>
            ) : (
              <>
                {/* PC: 表示モードに応じて切り替え */}
                <div className="hidden md:block">
                  {viewMode === 'work' ? (
                    <TreeViewLayout
                      folders={displayFolders}
                      cards={cards}
                      documents={documents}
                      selectedFolderId={selectedFolderId}
                      selectedItem={selectedItem}
                      onFolderSelect={handleSelectFolderInWork}
                      onItemSelect={handleSelectItemInWork}
                      onCardUpdated={() => {
                        // カード更新後の処理(必要に応じて)
                      }}
                    />
                  ) : viewMode === 'column' ? (
                  <ColumnNavigator
                    folders={activeFolders}
                    allFolders={folders}
                    cards={cards}
                    onSelect={handleSelectFolder}
                    onCardSelect={handleSelectCard}
                    onCreateCard={handleCreateCard}
                    onCreateFolder={handleCreateFolder}
                    onQuickCreateFolder={async (name, parentId) => {
                      try {
                        await createFolder(name, parentId);
                        success('フォルダを作成しました');
                      } catch (err) {
                        console.error('Quick create failed:', err);
                        toastError('フォルダの作成に失敗しました');
                      }
                    }}
                    onEdit={handleEditFolder}
                    onDelete={handleDeleteFolder}
                    onHide={handleHideFolder}
                    onToggleSilent={async (folder) => {
                      const targetFolderId = folder.folderId ?? folder.id;
                      const currentSilent = folder.isSilent ?? folder.is_silent ?? false;
                      if (!targetFolderId) return;
                      await updateFolder(targetFolderId, { isSilent: !currentSilent });
                    }}
                    onReorder={async (reorderedFolders, parentId, shouldUpdateUI = true) => {
                      // UI即時反映(最後の呼び出しのみ)
                      if (shouldUpdateUI) {
                        setDisplayFolders(prev => {
                          const newFolders = [...prev];
                          reorderedFolders.forEach((f, i) => {
                            const key = f.id ?? f.folderId;
                            const index = newFolders.findIndex(nf => (nf.id ?? nf.folderId) === key);
                            if (index !== -1) {
                              newFolders[index] = {
                                ...newFolders[index],
                                orderIndex: i,
                                order_index: i,
                                parentFolderId: parentId,
                                parent_folder_id: parentId,
                              };
                            }
                          });
                          return newFolders;
                        });
                      }

                      // バックグラウンドで差分更新
                      const updates = reorderedFolders
                        .map((folder, i) => {
                          const currentOrder = folder.orderIndex ?? folder.order_index ?? 0;
                          const currentParent = folder.parentFolderId ?? folder.parent_folder_id ?? null;
                          if (currentOrder === i && currentParent === parentId) return null;
                          return {
                            id: folder.id ?? folder.folderId,
                            data: {
                              orderIndex: i,
                              parentFolderId: parentId,
                              order_index: i,
                              parent_folder_id: parentId,
                            }
                          };
                        })
                        .filter(Boolean);

                      if (updates.length === 0) return;
                      Promise.all(updates.map(u => updateFolderMutation.mutateAsync(u))).catch(err => {
                        console.error('フォルダ並び替え更新に失敗:', err);
                      });
                    }}
                    isEditMode={isEditMode}
                    isSelectionMode={isSelectionMode}
                    selectedFolderIds={selectedFolderIds}
                    onToggleSelection={handleToggleSelection}
                  />
                  ) : (
                    <FolderTree
                      folders={displayFolders}
                      allFolders={folders}
                      cards={cards}
                      onSelect={handleSelectFolder}
                      onCreateCard={handleCreateCard}
                      onCreateSubfolder={handleCreateFolder}
                      onEdit={handleEditFolder}
                      onDelete={handleDeleteFolder}
                      onHide={handleHideFolder}
                      onToggleSilent={async (folder) => {
                        const targetFolderId = folder.folderId ?? folder.id;
                        const currentSilent = folder.isSilent ?? folder.is_silent ?? false;
                        if (!targetFolderId) return;
                        await updateFolder(targetFolderId, { isSilent: !currentSilent });
                      }}
                      onReorder={async (reorderedFolders, parentId, shouldUpdateUI = true) => {
                        // UI即時反映(最後の呼び出しのみ)
                        if (shouldUpdateUI) {
                          setDisplayFolders(prev => {
                            const newFolders = [...prev];
                            reorderedFolders.forEach((f, i) => {
                              const key = f.id ?? f.folderId;
                              const index = newFolders.findIndex(nf => (nf.id ?? nf.folderId) === key);
                              if (index !== -1) {
                                newFolders[index] = {
                                  ...newFolders[index],
                                  orderIndex: i,
                                  order_index: i,
                                  parentFolderId: parentId,
                                  parent_folder_id: parentId,
                                };
                              }
                            });
                            return newFolders;
                          });
                        }

                        // バックグラウンドで差分更新
                        const updates = reorderedFolders
                          .map((folder, i) => {
                            const currentOrder = folder.orderIndex ?? folder.order_index ?? 0;
                            const currentParent = folder.parentFolderId ?? folder.parent_folder_id ?? null;
                            if (currentOrder === i && currentParent === parentId) return null;
                            return {
                              id: folder.id ?? folder.folderId,
                              data: {
                                orderIndex: i,
                                parentFolderId: parentId,
                                order_index: i,
                                parent_folder_id: parentId,
                              }
                            };
                          })
                          .filter(Boolean);

                        if (updates.length === 0) return;
                        Promise.all(updates.map(u => updateFolderMutation.mutateAsync(u))).catch(err => {
                          console.error('フォルダ並び替え更新に失敗:', err);
                        });
                      }}
                      isEditMode={isEditMode}
                      isSelectionMode={isSelectionMode}
                      selectedFolderIds={selectedFolderIds}
                      onToggleSelection={handleToggleSelection}
                    />
                  )}
                </div>
                
                {/* モバイル: 既存のツリー型 */}
                <div className="md:hidden">
                  <FolderTree
                    folders={displayFolders}
                    allFolders={folders}
                    cards={cards}
                    onSelect={handleSelectFolder}
                    onCreateCard={handleCreateCard}
                    onCreateSubfolder={handleCreateFolder}
                    onEdit={handleEditFolder}
                    onDelete={handleDeleteFolder}
                    onHide={handleHideFolder}
                    onToggleSilent={async (folder) => {
                      const targetFolderId = folder.folderId ?? folder.id;
                      const currentSilent = folder.isSilent ?? folder.is_silent ?? false;
                      if (!targetFolderId) return;
                      await updateFolder(targetFolderId, { isSilent: !currentSilent });
                    }}
                    onReorder={async (reorderedFolders, parentId, shouldUpdateUI = true) => {
                      // UI即時反映(最後の呼び出しのみ)
                      if (shouldUpdateUI) {
                        setDisplayFolders(prev => {
                          const newFolders = [...prev];
                          reorderedFolders.forEach((f, i) => {
                            const key = f.id ?? f.folderId;
                            const index = newFolders.findIndex(nf => (nf.id ?? nf.folderId) === key);
                            if (index !== -1) {
                              newFolders[index] = {
                                ...newFolders[index],
                                orderIndex: i,
                                order_index: i,
                                parentFolderId: parentId,
                                parent_folder_id: parentId,
                              };
                            }
                          });
                          return newFolders;
                        });
                      }

                      // バックグラウンドで差分更新
                      const updates = reorderedFolders
                        .map((folder, i) => {
                          const currentOrder = folder.orderIndex ?? folder.order_index ?? 0;
                          const currentParent = folder.parentFolderId ?? folder.parent_folder_id ?? null;
                          if (currentOrder === i && currentParent === parentId) return null;
                          return {
                            id: folder.id ?? folder.folderId,
                            data: {
                              orderIndex: i,
                              parentFolderId: parentId,
                              order_index: i,
                              parent_folder_id: parentId,
                            }
                          };
                        })
                        .filter(Boolean);

                      if (updates.length === 0) return;
                      Promise.all(updates.map(u => updateFolderMutation.mutateAsync(u))).catch(err => {
                        console.error('フォルダ並び替え更新に失敗:', err);
                      });
                    }}
                    isEditMode={isEditMode}
                    isSelectionMode={isSelectionMode}
                    selectedFolderIds={selectedFolderIds}
                    onToggleSelection={handleToggleSelection}
                  />
                </div>
              </>
            )}
          </div>
        </div>



        {/* Hidden Folders */}
        <div className="mt-6 mb-20 md:mb-0">
            <button
                type="button"
                onClick={() => setIsHiddenOpen(prev => !prev)}
                className="w-full h-16 flex items-center justify-between px-8 liquid-glass-header transition-all hover:shadow-md relative z-10 hidden-folders-section"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 liquid-glass-chip flex items-center justify-center text-liquid-low">
                        <EyeOffIcon className="w-4 h-4" />
                    </div>
                    <span className="text-[12px] font-bold text-slate-400">
                        非表示のフォルダ <span className="text-slate-300 ml-1">[{hiddenFolders.length}]</span>
                    </span>
                </div>
                <ChevronRight className={cn("w-4 h-4 text-slate-200 transition-transform", isHiddenOpen && "rotate-90")} />
            </button>
          {isHiddenOpen && (
            <div className="mt-2 p-3 rounded-lg bg-white/70 border border-slate-200/60">
              {hiddenFolders.length === 0 ? (
                <div className="text-sm text-gray-500">非表示のフォルダはありません</div>
              ) : (
                <ul className="space-y-2">
                  {hiddenFolders.map(folder => (
                    <li key={folder.id ?? folder.folderId} className="flex items-center justify-between gap-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2 min-w-0">
                        <EyeOffIcon className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate">{folder.folderName || folder.folder_name || '(名称未設定)'}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const id = folder.id ?? folder.folderId;
                          // Local First & Sync Queued
                          await updateFolder(id, { isHidden: false });
                        }}
                      >
                        表示する
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
        
        {/* Dialogs */}
        <FolderDialog
          open={folderDialogOpen}
          onOpenChange={setFolderDialogOpen}
          folder={editingFolder}
          parentFolderId={parentFolderId}
          onSave={handleSaveFolder}
        />
        
        <TagManagerDialog 
            open={tagManagerOpen}
            onOpenChange={setTagManagerOpen}
        />

        {/* 範囲選択の描画オーバーレイ */}
        {selectionRect && (
          <div
            style={{
              position: 'fixed',
              left: selectionRect.x,
              top: selectionRect.y,
              width: selectionRect.width,
              height: selectionRect.height,
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.5)',
              borderRadius: '2px',
              zIndex: 9999,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
  );
}