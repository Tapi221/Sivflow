import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Checkbox } from '@/Components/ui/checkbox';
import { Skeleton } from '@/Components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/Components/ui/alert-dialog';
import { 
  ArrowLeft, 
  Trash2, 
  RotateCcw,
  Folder,
  FileText,
  AlertTriangle,
  Search,
  Filter,
  ChevronDown
} from 'lucide-react';
import { createPageUrl, normalizeCard, normalizeFolder } from '@/utils';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { getLocalDb } from '../services/localDB';
import { firestoreDb } from '@/services/firebase';
import { updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { folderDocPathSegments, cardDocPathSegments } from '@/services/firestorePaths';

export default function Trash() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // IndexedDBから削除されたアイテムを直接取得
  const allFolders = useLiveQuery(
    async () => {
      if (!currentUser) return [];
      try {
        const db = await getLocalDb(currentUser.uid);
        const folders = await db.getAllFolders();
        // normalizeFolder で正規化（isDeleted, deletedAt を一貫して処理）
        return folders.map(normalizeFolder);
      } catch (err) {
        console.error('Failed to load folders:', err);
        return [];
      }
    },
    [currentUser?.uid],
    []
  );
  
  const allCards = useLiveQuery(
    async () => {
      if (!currentUser) return [];
      try {
        const db = await getLocalDb(currentUser.uid);
        const cards = await db.getAllCards();
        // normalizeCard で正規化（isDeleted, deletedAt を一貫して処理）
        return cards.map(normalizeCard);
      } catch (err) {
        console.error('Failed to load cards:', err);
        return [];
      }
    },
    [currentUser?.uid],
    []
  );
  
  // 削除されたフォルダのみ（normalize済みなので isDeleted のみチェック）
  const deletedFolders = useMemo(() => 
    (allFolders || []).filter(f => f.isDeleted === true),
    [allFolders]
  );
  
  // すべてのフォルダ（削除済み・未削除を含む）
  const folders = allFolders || [];
  const allCardsData = allCards || [];
  
  // 削除されたカード、または削除されたフォルダに属するカード
  // normalize済みなので isDeleted のみチェック
  const cards = useMemo(() => {
    const deletedFolderIds = deletedFolders.map(f => f.id);
    return allCardsData.filter(c => 
      c.isDeleted === true || deletedFolderIds.includes(c.folderId)
    );
  }, [allCardsData, deletedFolders]);
  
  const isLoading = allFolders === undefined || allCards === undefined;
  
  // デバッグ情報
  console.log('=== Trash Debug ===');
  console.log('allFolders:', allFolders);
  console.log('allCards:', allCards);
  console.log('deletedFolders:', deletedFolders);
  console.log('cards:', cards);
  console.log('isLoading:', isLoading);
  console.log('isEmpty:', deletedFolders.length === 0 && cards.length === 0);
  
  const [selectedIds, setSelectedIds] = useState({ folders: [], cards: [] });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewCard, setPreviewCard] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'week', 'month'
  
  const hasSelection = selectedIds.folders.length > 0 || selectedIds.cards.length > 0;
  
  // 日付フィルタロジック
  const filterByDate = (deletedAt) => {
    if (dateFilter === 'all') return true;
    if (!deletedAt) return false;
    
    const now = new Date();
    const deleted = new Date(deletedAt);
    const diffMs = now - deleted;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    switch (dateFilter) {
      case 'today': return diffDays < 1;
      case 'week': return diffDays < 7;
      case 'month': return diffDays < 30;
      default: return true;
    }
  };
  
  // 検索フィルタロジック
  const matchesSearch = (item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = (item.folderName || item.folder_name || item.questionText || item.question_text || item.title || '').toLowerCase();
    return name.includes(query);
  };
  
  // フィルタ適用済みデータ
  const filteredFolders = deletedFolders.filter(f => matchesSearch(f) && filterByDate(f.deletedAt));
  const filteredCards = cards.filter(c => matchesSearch(c) && filterByDate(c.deletedAt));
  
  // カードまたはフォルダが1つでも削除されていればごみ箱は空ではない
  const isEmpty = deletedFolders.length === 0 && cards.length === 0;
  const isFilteredEmpty = filteredFolders.length === 0 && filteredCards.length === 0;
  
  const toggleFolder = (id) => {
    setSelectedIds(prev => ({
      ...prev,
      folders: prev.folders.includes(id)
        ? prev.folders.filter(fid => fid !== id)
        : [...prev.folders, id]
    }));
  };
  
  const toggleCard = (id) => {
    setSelectedIds(prev => ({
      ...prev,
      cards: prev.cards.includes(id)
        ? prev.cards.filter(cid => cid !== id)
        : [...prev.cards, id]
    }));
  };
  
  const selectAll = () => {
    setSelectedIds({
      folders: deletedFolders.map(f => f.id),
      cards: cards.map(c => c.id)
    });
  };
  
  const clearSelection = () => {
    setSelectedIds({ folders: [], cards: [] });
  };
  
  const handleRestore = async () => {
    if (!currentUser) return;
    setIsProcessing(true);
    
    try {
      const db = await getLocalDb(currentUser.uid);
      // まず、選択されたカードの親フォルダを特定
      const parentFolderIds = new Set();
      for (const cardId of selectedIds.cards) {
        const card = cards.find(c => c.id === cardId);
        if (card && card.folderId) {
          parentFolderIds.add(card.folderId);
        }
      }
      
      // 親フォルダも復元対象に追加（削除されている場合のみ）
      for (const folderId of parentFolderIds) {
        const folder = deletedFolders.find(f => f.id === folderId);
        if (folder && folder.isDeleted) {
          // 親フォルダの親フォルダも再帰的に復元
          await restoreFolderWithParents(folderId);
        }
      }
      
      // 選択されたフォルダを復元（localDB.restore → Firestore）
      for (const id of selectedIds.folders) {
        // IndexedDB を先に更新（ローカルファースト）
        await db.restore('folders', id);
        
        // Firestore も更新
        const folderRef = doc(firestoreDb, ...folderDocPathSegments(currentUser.uid, id));
        await updateDoc(folderRef, {
          isDeleted: false,
          deletedAt: null,
          updatedAt: Timestamp.now()
        });
      }
      
      // 選択されたカードを復元（localDB.restore → Firestore）
      for (const id of selectedIds.cards) {
        // IndexedDB を先に更新（ローカルファースト）
        await db.restore('cards', id);
        
        // Firestore も更新
        const cardRef = doc(firestoreDb, ...cardDocPathSegments(currentUser.uid, id));
        await updateDoc(cardRef, {
          isDeleted: false,
          deletedAt: null,
          updatedAt: Timestamp.now()
        });
      }
      
      setSelectedIds({ folders: [], cards: [] });
      alert('復元しました');
    } catch (error) {
      console.error('Failed to restore items:', error);
      alert(`復元に失敗しました: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // フォルダとその親フォルダを再帰的に復元
  const restoreFolderWithParents = async (folderId) => {
    try {
      if (!currentUser) return;
      const db = await getLocalDb(currentUser.uid);
      const rawFolder = await db.getItem('folders', folderId);
      if (!rawFolder) {
        console.error('Folder not found:', folderId);
        return;
      }
      
      // 正規化してから判定
      const folder = normalizeFolder(rawFolder);
      console.log('Restoring folder:', folder);
      
      // 親フォルダが存在し、削除されている場合は先に復元
      if (folder.parentFolderId) {
        const rawParentFolder = await db.getItem('folders', folder.parentFolderId);
        if (rawParentFolder) {
          const parentFolder = normalizeFolder(rawParentFolder);
          if (parentFolder.isDeleted) {
            console.log('Restoring parent folder first:', folder.parentFolderId);
            await restoreFolderWithParents(folder.parentFolderId);
          }
        }
      }
      
      // 自身を復元（IndexedDB → Firestore）ローカルファースト
      await db.restore('folders', folderId);
      
      // Firestore も更新
      const folderRef = doc(firestoreDb, ...folderDocPathSegments(currentUser.uid, folderId));
      await updateDoc(folderRef, {
        isDeleted: false,
        deletedAt: null,
        updatedAt: Timestamp.now()
      });
      
      console.log('Folder restored:', folderId);
    } catch (error) {
      console.error('Error restoring folder:', folderId, error);
      throw error;
    }
  };
  
  // 完全削除 - TRASHED → PURGED
  // IndexedDB と Firestore 両方から物理削除
  const handlePermanentDelete = async () => {
    if (!currentUser) return;
    setIsProcessing(true);
    
    try {
      const db = await getLocalDb(currentUser.uid);
      // フォルダを完全削除
      for (const id of selectedIds.folders) {
        // IndexedDB から削除（ローカルファースト）
        await db.purge('folders', id);
        
        // Firestore からも削除
        try {
          const folderRef = doc(firestoreDb, ...folderDocPathSegments(currentUser.uid, id));
          await deleteDoc(folderRef);
        } catch (firestoreError) {
          console.warn(`Firestore delete failed for folder ${id}:`, firestoreError);
          // Firestore 削除失敗はログのみ（オフライン時など）
          // TODO: syncQueue に追加して後で再試行
        }
      }
      
      // カードを完全削除
      for (const id of selectedIds.cards) {
        // IndexedDB から削除（ローカルファースト）
        await db.purge('cards', id);
        
        // Firestore からも削除
        try {
          const cardRef = doc(firestoreDb, ...cardDocPathSegments(currentUser.uid, id));
          await deleteDoc(cardRef);
        } catch (firestoreError) {
          console.warn(`Firestore delete failed for card ${id}:`, firestoreError);
          // Firestore 削除失敗はログのみ（オフライン時など）
          // TODO: syncQueue に追加して後で再試行
        }
      }
      
      setSelectedIds({ folders: [], cards: [] });
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Failed to delete items:', error);
      alert('削除に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleEmptyTrash = async () => {
    setSelectedIds({
      folders: deletedFolders.map(f => f.id),
      cards: cards.map(c => c.id)
    });
    setDeleteDialogOpen(true);
  };
  
  return (
    <div className="min-h-screen bg-[#F8FAFB] text-slate-800 selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto p-6 md:p-14">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-12">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl('Dashboard'))}
              className="mt-1 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors w-9 h-9"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-7 h-7 flex items-center justify-center text-primary-600">
                    <Trash2 className="w-5.5 h-5.5" />
                </div>
                <h1 className="text-2xl font-extrabold text-[#334155] tracking-tight">ごみ箱</h1>
              </div>
              <p className="text-sm text-slate-400 font-bold ml-10 tracking-tight">削除されたアイテムは30日後に自動的に完全削除されます。</p>
            </div>
          </div>
          
          {!isEmpty && (
            <div className="flex items-center gap-4">
                <Badge variant="outline" className="h-9 px-4 rounded-xl text-slate-500 bg-white border-slate-200 shadow-sm">
                  {deletedFolders.length + cards.length} 件
                </Badge>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleEmptyTrash}
                  disabled={isProcessing}
                  className="rounded-xl font-bold"
                >
                  ごみ箱を空にする
                </Button>
            </div>
          )}
        </div>
        
        {/* Search and Filter */}
        {!isEmpty && (
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="カードやフォルダを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 bg-white shadow-sm transition-all text-slate-700 font-bold placeholder:text-slate-300"
              />
            </div>
            
            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="pl-11 pr-8 py-2.5 border border-slate-200 rounded-2xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 shadow-sm appearance-none font-bold text-slate-600 cursor-pointer hover:border-slate-300 transition-all"
                >
                    <option value="all">すべての期間</option>
                    <option value="today">今日</option>
                    <option value="week">過去7日間</option>
                    <option value="month">過去30日間</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        )}
        
        {/* Filter Results Info */}
        {!isEmpty && (searchQuery || dateFilter !== 'all') && (
          <div className="mb-4 text-sm text-gray-600">
            {isFilteredEmpty ? (
              <span>条件に一致するアイテムがありません</span>
            ) : (
              <span>
                {filteredFolders.length + filteredCards.length}件のアイテムが見つかりました
                {searchQuery && <span className="ml-1">（「{searchQuery}」で検索）</span>}
              </span>
            )}
          </div>
        )}
        {/* Actions */}
        {!isEmpty && (
          <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                すべて選択
              </Button>
              {hasSelection && (
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  選択解除
                </Button>
              )}
              {hasSelection && (
                <span className="text-sm text-gray-500 select-none">
                  {selectedIds.folders.length + selectedIds.cards.length} 件選択中
                </span>
              )}
            </div>
            
            {hasSelection && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRestore}
                  disabled={isProcessing}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  復元
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isProcessing}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  完全削除
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* Content */}
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : isEmpty ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Trash2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h2 className="text-xl font-bold mb-2 select-none">ごみ箱は空です</h2>
              <p className="text-gray-500 select-none">
                削除したフォルダやカードがここに表示されます
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* 削除されたフォルダとそのカードを表示 */}
            {deletedFolders.map(folder => {
              // このフォルダに属するすべてのカード（削除済み・未削除を含む）
              const folderCards = allCardsData.filter(c => 
                c.folderId && c.folderId.toLowerCase() === folder.id.toLowerCase()
              );
              
              return (
                <Card key={folder.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedIds.folders.includes(folder.id)}
                          onCheckedChange={() => toggleFolder(folder.id)}
                        />
                        <Folder className="w-5 h-5 text-indigo-500" />
                        <div>
                          <CardTitle className="text-base select-none">
                            {folder.folderName || folder.folder_name}
                          </CardTitle>
                          <p className="text-xs text-gray-500">
                            カード {folderCards.length}枚 | 
                            {/* normalize済みなのでdeletedAtは常にDateまたはnull */}
                            削除日: {folder.deletedAt ? format(folder.deletedAt, 'yyyy/MM/dd HH:mm', { locale: ja }) : '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            setIsProcessing(true);
                            try {
                              console.log('Restoring folder with cards:', folder.id);
                              await restoreFolderWithParents(folder.id);
                              
                              // フォルダ内のカードも自動復元（カード自体が isDeleted=true の場合のみ）
                              // 親フォルダ削除により不可視になっていたカードは状態変更不要
                              console.log('Restoring cards:', folderCards.length);
                              const db = await getLocalDb(currentUser.uid);
                              for (const card of folderCards) {
                                if (card.isDeleted) {
                                  await db.restore('cards', card.id);
                                  // Firestore も更新
                                  try {
                                    const cardRef = doc(firestoreDb, ...cardDocPathSegments(currentUser.uid, card.id));
                                    await updateDoc(cardRef, {
                                      isDeleted: false,
                                      deletedAt: null,
                                      updatedAt: Timestamp.now()
                                    });
                                  } catch (firestoreError) {
                                    console.warn(`Firestore update failed for card ${card.id}:`, firestoreError);
                                  }
                                }
                              }
                              
                              console.log('Folder and cards restored successfully');
                              alert(`フォルダとカード${folderCards.length}枚を復元しました`);
                            } catch (error) {
                              console.error('Failed to restore folder:', error);
                              alert('復元に失敗しました: ' + error.message);
                            } finally {
                              setIsProcessing(false);
                            }
                          }}
                          disabled={isProcessing}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          フォルダごと復元
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {folderCards.length > 0 && (
                    <CardContent>
                      <div className="space-y-2">
                        {folderCards.map((card, index) => (
                          <div
                            key={card.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg ml-8 cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => setPreviewCard(card)}
                          >
                            <Checkbox
                              checked={selectedIds.cards.includes(card.id)}
                              onCheckedChange={() => toggleCard(card.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <FileText className="w-4 h-4 text-gray-400" />
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                Q{index + 1}: {card.title || card.questionText?.substring(0, 30) || '(無題)'}
                              </p>
                              <p className="text-xs text-gray-500">
                                削除日: {card.deletedAt ? format(card.deletedAt, 'yyyy/MM/dd HH:mm', { locale: ja }) : '-'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
            
            {/* フォルダごとにグループ化して表示（親フォルダが存在し未削除のカード） */}
            {(() => {
              // 削除されたフォルダのIDリスト
              const deletedFolderIds = deletedFolders.map(f => f.id.toLowerCase());
              
              // フォルダIDでグループ化（削除されたフォルダ以外）
              const cardsByFolder = {};
              cards.forEach(card => {
                if (card.folderId && !deletedFolderIds.includes(card.folderId.toLowerCase())) {
                  if (!cardsByFolder[card.folderId]) {
                    cardsByFolder[card.folderId] = [];
                  }
                  cardsByFolder[card.folderId].push(card);
                }
              });
              
              console.log('Cards by folder:', cardsByFolder);
              console.log('Folder IDs:', Object.keys(cardsByFolder));
              
              return Object.entries(cardsByFolder).map(([folderId, folderCards]) => {
                // 大文字小文字を区別しない検索
                const folder = folders.find(f => 
                  f.id.toLowerCase() === folderId.toLowerCase()
                );
                
                console.log(`Folder ${folderId}:`, { folder, cardsCount: folderCards.length });
                
                // フォルダが見つからない場合はスキップ
                if (!folder) {
                  console.log(`Folder ${folderId} not found!`);
                  return null;
                }
                
                return (
                  <Card key={folderId}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Folder className="w-5 h-5 text-gray-400" />
                          <div>
                            <CardTitle className="text-base select-none text-gray-600">
                              {folder.folderName || folder.folder_name}
                            </CardTitle>
                            <p className="text-xs text-gray-500">
                              削除されたカード {folderCards.length}枚
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            setIsProcessing(true);
                            try {
                              const db = await getLocalDb(currentUser.uid);
                              // カードを復元（localDB.restore → Firestore）
                              for (const card of folderCards) {
                                await db.restore('cards', card.id);
                                // Firestore も更新
                                try {
                                  const cardRef = doc(firestoreDb, ...cardDocPathSegments(currentUser.uid, card.id));
                                  await updateDoc(cardRef, {
                                    isDeleted: false,
                                    deletedAt: null,
                                    updatedAt: Timestamp.now()
                                  });
                                } catch (firestoreError) {
                                  console.warn(`Firestore update failed for card ${card.id}:`, firestoreError);
                                }
                              }
                              alert(`${folderCards.length}枚のカードを復元しました`);
                            } catch (error) {
                              console.error('Failed to restore cards:', error);
                              alert('復元に失敗しました');
                            } finally {
                              setIsProcessing(false);
                            }
                          }}
                          disabled={isProcessing}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          すべて復元
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-2">
                        {folderCards.map((card, index) => (
                          <div
                            key={card.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg ml-8 cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => setPreviewCard(card)}
                          >
                            <Checkbox
                              checked={selectedIds.cards.includes(card.id)}
                              onCheckedChange={() => toggleCard(card.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <FileText className="w-4 h-4 text-gray-400" />
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                Q{index + 1}: {card.title || card.questionText?.substring(0, 30) || '(無題)'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {/* normalize済みなのでdeletedAtは常にDateまたはnull */}
                                削除日: {card.deletedAt ? format(card.deletedAt, 'yyyy/MM/dd HH:mm', { locale: ja }) : '-'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              });
            })()}
            
            {/* フォルダIDがないカード（エラー状態） */}
            {cards.filter(c => !c.folderId).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 select-none text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    フォルダなしカード ({cards.filter(c => !c.folderId).length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-2">
                    これらのカードにはフォルダIDが設定されていません。復元するには手動で修正が必要です。
                  </p>
                  <div className="space-y-2">
                    {cards.filter(c => !c.folderId).map(card => (
                      <div
                        key={card.id}
                        className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200 cursor-pointer hover:bg-red-100 transition-colors"
                        onClick={() => setPreviewCard(card)}
                      >
                        <Checkbox
                          checked={selectedIds.cards.includes(card.id)}
                          onCheckedChange={() => toggleCard(card.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <FileText className="w-4 h-4 text-red-400" />
                        <div className="flex-1">
                          <p className="font-medium">
                            {card.title || card.questionText?.substring(0, 30) || '(無題)'}
                          </p>
                          <p className="text-xs text-gray-500">
                            削除日: {card.deletedAt ? format(new Date(card.deletedAt), 'yyyy/MM/dd HH:mm', { locale: ja }) : '-'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {/* Delete Confirmation Dialog - 二段階確認 */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setConfirmationText('');
        }}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                完全に削除しますか？
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                    <p className="font-medium mb-1">この操作は取り消せません</p>
                    <p>削除されたデータは復元できません。バックアップがない場合、永久に失われます。</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">削除対象:</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {selectedIds.folders.length > 0 && (
                        <li>フォルダ: {selectedIds.folders.length}件</li>
                      )}
                      {selectedIds.cards.length > 0 && (
                        <li>カード: {selectedIds.cards.length}枚</li>
                      )}
                    </ul>
                  </div>
                  
                  {/* 入力確認を削除 */}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                disabled={isProcessing}
                onClick={() => setConfirmationText('')}
              >
                キャンセル
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handlePermanentDelete}
                disabled={isProcessing}
                className="bg-red-500 hover:bg-red-600 border-none text-white font-bold"
              >
                {isProcessing ? '削除中...' : '完全に削除'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Card Preview Dialog */}
        <AlertDialog open={!!previewCard} onOpenChange={() => setPreviewCard(null)}>
          <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="select-none">
                カードプレビュー
              </AlertDialogTitle>
            </AlertDialogHeader>
            {previewCard && (
              <div className="space-y-4">
                {/* Question */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-gray-700">問題</h3>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="whitespace-pre-wrap">{previewCard.questionText || '(問題なし)'}</p>
                    {previewCard.questionImages?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {previewCard.questionImages.map((img, idx) => (
                          <img
                            key={idx}
                            src={img?.remoteUrl ?? img?.localUrl ?? img?.url ?? img}
                            alt={`Question ${idx + 1}`}
                            className="max-w-full rounded"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Answer */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-gray-700">解答</h3>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="whitespace-pre-wrap">{previewCard.answerText || '(解答なし)'}</p>
                    {previewCard.answerImages?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {previewCard.answerImages.map((img, idx) => (
                          <img
                            key={idx}
                            src={img?.remoteUrl ?? img?.localUrl ?? img?.url ?? img}
                            alt={`Answer ${idx + 1}`}
                            className="max-w-full rounded"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Metadata */}
                <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
                  <p>作成日: {previewCard.createdAt ? format(new Date(previewCard.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja }) : '-'}</p>
                  <p>削除日: {previewCard.deletedAt ? format(new Date(previewCard.deletedAt), 'yyyy/MM/dd HH:mm', { locale: ja }) : '-'}</p>
                </div>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPreviewCard(null)}>閉じる</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
