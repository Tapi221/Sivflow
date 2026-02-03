import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCards } from '@/hooks/useCards';
import { useFolders } from '@/hooks/useFolders';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { localDb } from '@/services/localDB';
import { firestoreDb } from '@/services/firebase';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Skeleton } from '@/Components/ui/skeleton';
import { Checkbox } from '@/Components/ui/checkbox';
import FolderTree from '@/Components/folder/FolderTree';
import FolderDialog from '@/Components/folder/FolderDialog';
import DeleteFolderDialog from '@/Components/folder/DeleteFolderDialog';
import TagManagerDialog from '@/Components/tag/TagManagerDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { MoreVertical, Settings, Tag, Trash2, Plus, BellOff, Bell, ArrowLeft, ChevronRight, Edit, X } from 'lucide-react';
import FolderPlus from 'lucide-react/dist/esm/icons/folder-plus';
import EyeOffIcon from 'lucide-react/dist/esm/icons/eye-off';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';

export default function Folders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [parentFolderId, setParentFolderId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingFolder, setDeletingFolder] = useState(null);
  const [selectedFolderIds, setSelectedFolderIds] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // モバイル専用の編集モード

  const [isHiddenOpen, setIsHiddenOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  
  const { folders = [], loading: foldersLoading, error: foldersError } = useFolders();
  const { cards = [], loading: cardsLoading, error: cardsError } = useCards();
  const [displayFolders, setDisplayFolders] = useState([]);
  

  
  const { createFolder, updateFolder, deleteFolder } = useFolders();
  const { success, error: toastError } = useToast();
  
  const updateFolderMutation = useMutation({
    mutationFn: ({ id, data }) => updateFolder(id, data),
  });
  
  const handleSelectFolder = (folderId) => {
    navigate(createPageUrl(`FolderView?id=${folderId}`));
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
    setDeletingFolder(folder);
    setDeleteDialogOpen(true);
  };

  const handleHideFolder = async (folder) => {
    const targetFolderId = folder.folderId ?? folder.id;
    if (!targetFolderId) return;

    const getDescendantIds = (parentId) => {
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
          ids = [...ids, ...getDescendantIds(childId)];
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
  
  const getDescendantStats = (folderId) => {
    const getDescendantIds = (parentId) => {
      const children = folders.filter(f => {
        const parent = f.parentFolderId ?? f.parent_folder_id ?? null;
        const isDeleted = f.isDeleted ?? f.is_deleted;
        return parent === parentId && (isDeleted === undefined || isDeleted === false);
      });
      let ids = [];
      children.forEach(child => {
        const childId = child.folderId ?? child.id;
        ids.push(childId);
        ids = [...ids, ...getDescendantIds(childId)];
      });
      return ids;
    };
    
    const descendantFolderIds = getDescendantIds(folderId);
    const allFolderIds = [folderId, ...descendantFolderIds];
    const cardCount = cards.filter(c => {
      const folderIdForCard = c.folderId ?? c.folder_id;
      const isDeleted = c.isDeleted ?? c.is_deleted;
      return allFolderIds.includes(folderIdForCard) && (isDeleted === undefined || isDeleted === false);
    }).length;
    
    return {
      subfolderCount: descendantFolderIds.length,
      cardCount
    };
  };
  
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
    <div className="min-h-screen bg-[#F8FAFB]">
      <div className="max-w-[1400px] mx-auto p-4 md:p-14">
        {/* Header */}
        <Card className="rounded-[32px] border-none shadow-[0_4px_40px_-10px_rgba(0,0,0,0.02)] bg-white overflow-hidden">
          <CardContent className="p-4 md:p-8">
            <div className="flex items-center justify-end mb-2 md:mb-4">

              <div className="flex items-center gap-2">
                {/* Desktop Tools */}
                <div className="hidden md:flex items-center bg-white rounded-xl shadow-sm border border-slate-50 p-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-9 h-9 rounded-lg text-slate-300 hover:bg-primary-50 hover:text-primary-600"
                      onClick={() => setTagManagerOpen(true)}
                    >
                      <Tag className="w-4.5 h-4.5" />
                    </Button>
                    <div className="w-[1px] h-5 bg-slate-100 mx-0.5"></div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-9 h-9 rounded-lg text-slate-300 hover:bg-primary-50 hover:text-primary-600 relative"
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
                      className="w-9 h-9 rounded-lg text-slate-300 hover:bg-primary-50 hover:text-primary-600"
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
                      <DropdownMenuContent align="end" className="rounded-2xl shadow-xl p-2 min-w-[160px]">
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
                        className="h-10 px-6 bg-white text-slate-400 font-bold text-xs rounded-xl shadow-sm border border-slate-50"
                        onClick={() => setIsSelectionMode(true)}
                    >
                        選択
                    </Button>

                    <Button 
                        onClick={() => handleCreateFolder(null)} 
                        className="h-10 px-6 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-md border-none flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      新規フォルダ
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
            
            {/* Folder Tree */}
            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : activeFolders.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FolderPlus className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">フォルダがありません</p>
                <p className="text-sm mb-4">最初のフォルダを作成しましょう</p>

              </div>
            ) : (
              <FolderTree
                folders={activeFolders}
                allFolders={folders}
                cards={cards}
                selectedFolderId={selectedFolderId}
                onSelect={handleSelectFolder}
                onCreateCard={handleCreateCard}
                onCreateFolder={handleCreateFolder}
                onEditFolder={handleEditFolder}
                onDeleteFolder={handleDeleteFolder}
                onHideFolder={handleHideFolder}
                isSelectionMode={isSelectionMode}
                selectedFolderIds={selectedFolderIds}
                onToggleSelection={handleToggleSelection}
                onToggleSilent={async (folder) => {
                  const currentSilent = folder.isSilent ?? folder.is_silent ?? false;
                  const nextSilent = !currentSilent;
                  await updateFolderMutation.mutateAsync({
                    id: folder.id,
                    data: { isSilent: nextSilent, is_silent: nextSilent }
                  });
                }}
                onReorder={async (reorderedFolders, parentId, shouldUpdateUI = true) => {
                  // UI即時反映（最後の呼び出しのみ）
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
              />
            )}
          </CardContent>
        </Card>

        {/* Floating Action Button (Mobile) */}
        {!isSelectionMode && (
          <Button
            onClick={() => handleCreateFolder(null)}
            className="md:hidden fixed bottom-24 right-6 w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-lg flex items-center justify-center border-none z-50 transition-transform active:scale-95"
          >
            <Plus className="w-6 h-6" />
          </Button>
        )}

        {/* Hidden Folders */}
        <div className="mt-6 mb-20 md:mb-0">
            <button
                type="button"
                onClick={() => setIsHiddenOpen(prev => !prev)}
                className="w-full h-16 flex items-center justify-between px-8 rounded-[24px] bg-white shadow-sm border border-slate-50 transition-all hover:shadow-md relative z-10 hidden-folders-section"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
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
        
        {/* Dialogs */}
        <FolderDialog
          open={folderDialogOpen}
          onOpenChange={setFolderDialogOpen}
          folder={editingFolder}
          parentFolderId={parentFolderId}
          onSave={handleSaveFolder}
        />
        
        {deletingFolder && (
          <DeleteFolderDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            folder={deletingFolder}
            {...getDescendantStats(deletingFolder.id)}
            onConfirm={handleConfirmDelete}
          />
        )}
        
        <TagManagerDialog 
            open={tagManagerOpen}
            onOpenChange={setTagManagerOpen}
        />
      </div>
    </div>
  );
}