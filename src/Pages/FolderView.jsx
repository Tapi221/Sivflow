import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useCards } from '@/hooks/useCards';
import { useFolders } from '@/hooks/useFolders';
import { useAuth } from '@/contexts/AuthContext';
import { storage } from '@/services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useReliableFileUpload } from '@/hooks/useReliableFileUpload';
import { Button } from '@/Components/ui/button';
import { UploadProgress } from '@/Components/ui/UploadProgress';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Skeleton } from '@/Components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { 
  ArrowLeft, 
  Plus, 
  BookOpen, 
  BarChart3,
  Bell,
  BellOff,

  ArrowUpDown,
  Calendar,
  Percent,
  Clock,
  FileText,
  X,
  Check,
  RotateCw,
  MoreVertical,
  Edit,
  Trash2,
  Tag
} from 'lucide-react';
import EyeIcon from 'lucide-react/dist/esm/icons/eye';
import FolderOpen from 'lucide-react/dist/esm/icons/folder-open';
import MapIcon from 'lucide-react/dist/esm/icons/map';
import { createPageUrl } from '@/utils';
import { firestoreDb } from '@/services/firebase';
import { useToast } from '@/contexts/ToastContext';
import { normalizeMemoryStability } from '@/utils/reviewUtils';
import { calculateResistanceScore } from '@/utils/reviewMetrics';
import { useUserSettings } from '@/hooks/useUserSettings';
import CardList from '@/Components/card/CardList';
import FolderMemo from '@/Components/folder/FolderMemo';
import FolderDialog from '@/Components/folder/FolderDialog';
import MapList from '@/Components/map/MapList';
import CreateCardSelectionDialog from '@/Components/card/CreateCardSelectionDialog';
import CreationModeDialog from '@/Components/card/CreationModeDialog';
import { Toggle } from '@/Components/ui/toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/Components/ui/dropdown-menu";
import { DragDropContext, Droppable } from '@hello-pangea/dnd';

export default function FolderView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  
  const folderId = searchParams.get('id');
  
  const { settings } = useUserSettings();
  const [activeTab, setActiveTab] = useState('cards');
  const [tabOrder, setTabOrder] = useState(['cards', 'memo', 'notes']);
  const [draggingTab, setDraggingTab] = useState(null);
  const [notePdfs, setNotePdfs] = useState([]);
  const [isPdfUploading, setIsPdfUploading] = useState(false);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isCreateCardDialogOpen, setIsCreateCardDialogOpen] = useState(false);
  const [isCreationModeDialogOpen, setIsCreationModeDialogOpen] = useState(false);
  
  // Filter state: 'all' | 'crowned' | 'uncrowned'
  const [filterMode, setFilterMode] = useState('all');
  
  // Sort state: 'custom' | 'stability_asc' | 'stability_desc' | 'created_asc' | 'created_desc'
  const [sortMode, setSortMode] = useState('custom');
  
  // useCardsフックから必要な関数とデータを取得
  const { 
    cards: allCards = [], 
    loading: cardsLoading, 
    updateCard, 
    deleteCard 
  } = useCards();
  const { folders = [], loading: foldersLoading, updateFolder } = useFolders();
  
  const folder = folders.find(f => f.id === folderId || f.folderId === folderId);
  const isSilent = folder?.isSilent ?? folder?.is_silent ?? false;
  const loading = cardsLoading || foldersLoading;



  useEffect(() => {
    setNotePdfs(folder?.notePdfs ?? folder?.note_pdfs ?? []);
  }, [folder]);
  
  const folderCards = useMemo(() => {
    return allCards.filter(c => c.folderId === folderId);
  }, [allCards, folderId]);

  const sortedCards = useMemo(() => {
    let result = [...folderCards].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    
    // Apply Crown Filter
    if (filterMode === 'all') {
        return result;
    }
    return result;
    
    // Sorting
    if (sortMode === 'custom') {
        // Default: Sort by orderIndex
        // result is already sorted by orderIndex at the beginning
    } else if (sortMode === 'stability_asc') {
        result.sort((a, b) => {
             const scoreA = calculateResistanceScore(a.interval || 0);
             const scoreB = calculateResistanceScore(b.interval || 0);
             return scoreA - scoreB;
        });
    } else if (sortMode === 'stability_desc') {
        result.sort((a, b) => {
             const scoreA = calculateResistanceScore(a.interval || 0);
             const scoreB = calculateResistanceScore(b.interval || 0);
             return scoreB - scoreA;
        });
    } else if (sortMode === 'created_asc') {
        result.sort((a, b) => {
             const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
             const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
             return dateA - dateB;
        });
    } else if (sortMode === 'created_desc') {
        result.sort((a, b) => {
             const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
             const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
             return dateB - dateA;
        });
    }
    
    return result;
  }, [folderCards, filterMode, sortMode]);
  
  const handleReorder = async (reorderedCards) => {
    // Update orderIndex for each card
    for (let i = 0; i < reorderedCards.length; i++) {
        // Only update if index changed
        if (reorderedCards[i].orderIndex !== i) {
            await updateCard(reorderedCards[i].id, { orderIndex: i });
        }
    }
  };
  
  const handleViewCard = (card) => {
    const cardIndex = sortedCards.findIndex(c => c.id === card.id);
    navigate(createPageUrl(`CardView?folderId=${folderId}&index=${cardIndex}`));
  };
  
  const handleEditCard = (card) => {
    if (card) {
      navigate(`/CardEdit?id=${card.id}&folderId=${folderId}`);
    } else {
      setIsCreateCardDialogOpen(true);
    }
  };

  const handleCreateModeSelect = (mode) => {
    setIsCreateCardDialogOpen(false);
    if (mode === 'single') {
        navigate(`/CardEdit?folderId=${folderId}`);
    } else {
        // "continuous" mode selected -> open specific mode selection dialog
        setIsCreationModeDialogOpen(true);
    }
  };

  const handleSpecificModeSelect = (modeId, options = {}) => {
      setIsCreationModeDialogOpen(false);
      
      if (modeId === 'qa') {
        const queryParams = new URLSearchParams();
        queryParams.set('folderId', folderId);
        if (options.hideTitle) {
          queryParams.set('hideTitle', 'true');
        }
        navigate(`/one-qa-mode?${queryParams.toString()}`);
        return;
      }

      // For now, redirect to placeholder for other modes
      navigate(`/create-mode/placeholder`);
  };

  const handleBackFromModeSelection = () => {
    setIsCreationModeDialogOpen(false);
    setIsCreateCardDialogOpen(true);
  };
  
  const handleDeleteCard = async (card) => {
    await deleteCard(card.id);
  };
  
  const handleToggleUncertainty = async (card) => {
    await updateCard(card.id, { hasUncertainty: !card.hasUncertainty });
  };

  const handleToggleBookmark = async (card) => {
    const current = card.isBookmarked ?? card.is_bookmarked ?? false;
    await updateCard(card.id, { isBookmarked: !current });
  };

  const { uploadFile, uploadProgress, uploadStatus, isUploading: isHookUploading } = useReliableFileUpload();
  const getStoragePath = (uid) => (fileName) => `users/${uid}/notes/${folderId}/${fileName}`;

  const uploadPdfToStorage = async (file) => {
    if (!currentUser) {
      throw new Error('アップロードにはログインが必要です。');
    }
    
    // Use the reliable upload hook which handles metadata and safe filenames
    const result = await uploadFile(
      file, 
      getStoragePath(currentUser.uid), 
      { type: 'pdf', folderId: folderId }
    );
    
    // Return compatible format for existing logic
    return { 
      url: result.url, 
      storagePath: result.storagePath 
    };
  };

  const handleAddPdf = async (file) => {
    if (!file || !folderId) return;
    setIsPdfUploading(true);
    try {
      const result = await uploadPdfToStorage(file);
      const next = [
        ...notePdfs,
        {
          id: crypto.randomUUID(),
          name: file.name,
          remoteUrl: result.url,
          storagePath: result.storagePath,
          contentType: file.type,
          size: file.size,
        }
      ];
      setNotePdfs(next);
      await updateFolder(folderId, { notePdfs: next, note_pdfs: next });
    } catch (error) {
      console.error('PDFアップロードエラー:', error);
      alert('PDFの追加に失敗しました。');
    } finally {
      setIsPdfUploading(false);
    }
  };
  
  // Build breadcrumb path
  const getBreadcrumbs = () => {
    if (!folder) return [];
    
    const path = [];
    let current = folder;
    
    while (current) {
      path.unshift(current);
      current = folders.find(f => (f.id === current.parentFolderId) || (f.folderId === current.parentFolderId));
    }
    
    return path;
  };
  
  const breadcrumbs = getBreadcrumbs();
  const childFolders = folders.filter(f => {
    const parentId = f.parentFolderId ?? f.parent_folder_id ?? null;
    const isDeleted = f.isDeleted ?? f.is_deleted;
    return parentId === folderId && (isDeleted === undefined || isDeleted === false);
  });
  
  // 各フォルダのカード数を計算
  const getFolderCardCount = (targetFolderId) => {
    return allCards.filter(c => {
      const cardFolderId = c.folderId ?? c.folder_id;
      const isDeleted = c.isDeleted ?? c.is_deleted;
      return cardFolderId === targetFolderId && (isDeleted === undefined || isDeleted === false);
    }).length;
  };

  // 現在のフォルダとそのサブフォルダに含まれる全カード数を計算
  const totalDescendantCardCount = useMemo(() => {
    if (!folderId) return 0;
    
    // 再帰的に子孫フォルダIDを取得
    const getDescendantIds = (rootId) => {
        let ids = [rootId];
        // foldersはuseFoldersフックから取得済み
        const children = folders.filter(f => {
            const pid = f.parentFolderId ?? f.parent_folder_id;
            const isDel = f.isDeleted ?? f.is_deleted;
            return pid === rootId && !isDel;
        });
        
        children.forEach(child => {
            const childId = child.id ?? child.folderId;
            if (childId) {
                ids = [...ids, ...getDescendantIds(childId)];
            }
        });
        return ids;
    };
    
    const targetFolderIds = getDescendantIds(folderId);
    
    return allCards.filter(c => {
        const cid = c.folderId ?? c.folder_id;
        const isDel = c.isDeleted ?? c.is_deleted;
        return targetFolderIds.includes(cid) && !isDel;
    }).length;
  }, [folderId, folders, allCards]);
  
  const isLoading = loading || cardsLoading;

  const handleToggleSilent = async () => {
    if (!folderId) return;
    const nextSilent = !isSilent;
    await updateFolder(folderId, { isSilent: nextSilent, is_silent: nextSilent });
  };
  
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const { createFolder } = useFolders();
  const { error: toastError, success: toastSuccess } = useToast();

  const handleCreateFolder = async (data) => {
    console.log('handleCreateFolder called', { folderId, data });
    try {
      if (typeof firestoreDb === 'undefined' || firestoreDb == null) {
        console.error('[FolderView] Firestore is not initialized. Aborting createFolder.');
        try { toastError('システムエラー: データベースが初期化されていません'); } catch (e) {}
        return;
      }
      await createFolder(
        data.folderName,
        folderId,
        data.folderColor,
        data.cloudSyncEnabled
      );
      console.log('handleCreateFolder finished createFolder call');
      try { toastSuccess('フォルダを作成しました'); } catch (e) {}
    } catch (error) {
      console.error('Failed to create folder:', error);
      try { toastError('フォルダの作成に失敗しました: ' + (error?.message || String(error))); } catch (e) {}
    }
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Case 1: Reorder within Cards
    if (source.droppableId === 'cards' && destination.droppableId === 'cards') {
        const reorderedCards = Array.from(sortedCards);
        const [removed] = reorderedCards.splice(source.index, 1);
        reorderedCards.splice(destination.index, 0, removed);
        await handleReorder(reorderedCards);
        return;
    }

    // Case 2: Move to Folder
    if (source.droppableId === 'cards' && destination.droppableId.startsWith('folder-')) {
        const targetFolderId = destination.droppableId.replace('folder-', '');
        
        try {
            await updateCard(draggableId, { folderId: targetFolderId });
        } catch (error) {
            console.error("Failed to move card", error);
            alert("カードの移動に失敗しました");
        }
    }
  };

  if (!folderId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">フォルダが指定されていません</p>
      </div>
    );
  }
  
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4 md:p-8 ml-0 md:ml-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl('Folders'))}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            {isLoading ? (
              <Skeleton className="h-8 w-48" />
            ) : (
                <div className="flex items-center gap-3">
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800 truncate max-w-[150px] md:max-w-none">
                        {folder?.folderName || 'フォルダ'}
                    </h1>
                    {isSilent && (
                        <BellOff className="w-5 h-5 text-slate-400" />
                    )}
                </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 md:gap-3">
             {/* Selection Mode Toggle */}
             <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSelectionMode(!isSelectionMode)}
                className={cn(
                    "w-10 h-10 rounded-full transition-colors",
                    isSelectionMode ? "bg-pink-50 text-pink-500" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                )}
             >
                <Check className="w-5 h-5" />
             </Button>

             {/* Sync Toggle */}
             <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleSilent}
                className={cn(
                    "w-10 h-10 rounded-full transition-colors",
                     isSilent ? "text-slate-300" : "text-slate-400 hover:bg-slate-50 hover:text-primary-600"
                )}
             >
                <RotateCw className={cn("w-5 h-5", !isSilent && "text-primary-600")} />
             </Button>

             {/* Folder Menu */}
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                        <MoreVertical className="w-5 h-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl shadow-xl p-2 min-w-[160px]">
                    <DropdownMenuItem onClick={() => setIsCreateFolderOpen(true)} className="rounded-xl py-3">
                        <Edit className="w-4 h-4 mr-3 text-slate-400" />
                        <span>フォルダ編集</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {/* Tag Manager */}} className="rounded-xl py-3" disabled>
                        <Tag className="w-4 h-4 mr-3 text-slate-400" />
                        <span>タグ管理</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { if(confirm('削除しますか？')) navigate('/Folders'); /* TODO: proper delete */ }} className="rounded-xl py-3 text-red-500 bg-red-50">
                        <Trash2 className="w-4 h-4 mr-3" />
                        <span>フォルダ削除</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
             </DropdownMenu>

             {/* Desktop Buttons (Hidden on Mobile if needed, but keeping for now) */}
             <div className="hidden md:flex items-center gap-3 ml-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateCardDialogOpen(true)}
                  className="bg-white text-primary-600 border-primary-600/20 hover:bg-primary-600/5 h-10 md:h-11 px-3 md:px-6 rounded-full font-bold flex items-center gap-2 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>新規カード</span>
                </Button>
                <Button
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 md:px-6 py-2 h-10 md:h-11 rounded-lg font-bold shadow-sm transition-all"
                  onClick={() => navigate(createPageUrl(`StudyMode?folderId=${folderId}`))}
                  disabled={sortedCards.filter(c => !c.isDraft).length === 0}
                >
                  学習開始
                </Button>
             </div>
          </div>
        </div>

        <div className="border-t border-slate-100 w-full mb-8"></div>
        
        {/* Sub Folders Section */}
        <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
                 <h3 className="text-xs font-bold text-slate-300 tracking-wider uppercase flex items-center gap-2 select-none">
                    <div className="w-8 h-[1px] bg-slate-200"></div>
                    階層構造 (SUB FOLDERS)
                </h3>
            </div>
           
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* New Folder Button */}
                 <button
                    className="group border border-dashed border-slate-200 rounded-2xl h-16 flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all select-none"
                    onClick={() => setIsCreateFolderOpen(true)}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">新規フォルダ</span>
                  </button>

              {childFolders.map(childFolder => {
                const cardCount = getFolderCardCount(childFolder.id ?? childFolder.folderId);
                const targetId = childFolder.id ?? childFolder.folderId;
                
                return (
                  <Droppable key={targetId} droppableId={`folder-${targetId}`} isCombineEnabled={false}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                             "group flex items-center px-4 h-16 bg-white rounded-2xl border shadow-sm transition-all duration-200 select-none text-left relative overflow-hidden",
                             snapshot.isDraggingOver ? "border-primary-600 ring-2 ring-primary-600/20 bg-primary-600/5" : "border-slate-100 hover:shadow-md hover:border-slate-200 cursor-pointer"
                        )}
                        onClick={() => {
                          if (targetId) navigate(`/FolderView?id=${targetId}`);
                        }}
                      >
                         {/* Visual Content */}
                        <div className="w-8 h-8 rounded-lg bg-primary-600/10 flex items-center justify-center mr-3 group-hover:bg-primary-600/20 transition-colors z-10">
                          <FolderOpen className="w-4 h-4 text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0 z-10">
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-sm font-bold text-slate-700 truncate group-hover:text-primary-600 transition-colors">
                                    {childFolder.folderName ?? childFolder.folder_name}
                                </span>
                                {(childFolder.isSilent ?? childFolder.is_silent) && (
                                    <BellOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                              </div>
                            <span className="text-[10px] text-slate-400">
                                 {cardCount} items
                            </span>
                        </div>
                        
                        {/* Drag Overlay Hint */}
                        {snapshot.isDraggingOver && (
                             <div className="absolute inset-0 flex items-center justify-end pr-4 pointer-events-none">
                                 <div className="bg-primary-600 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">
                                     移動
                                 </div>
                             </div>
                        )}
                        
                        {/* Hidden placeholder mandated by Droppable */}
                        <div className="hidden">{provided.placeholder}</div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
        </div>
        
        {/* Tabs and Content */}
        <Tabs defaultValue="cards" className="w-full" onValueChange={setActiveTab}>
          <div className="border-b border-slate-200 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <TabsList className="flex justify-start gap-4 md:gap-8 bg-transparent p-0 h-auto overflow-x-auto no-scrollbar w-full sm:w-auto">
              {['cards', 'memo', 'notes', 'map'].map((value) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="rounded-none border-b-2 border-transparent px-0 py-2 text-xs font-bold text-slate-400 uppercase tracking-wide data-[state=active]:border-primary-600 data-[state=active]:text-primary-600 data-[state=active]:bg-transparent shadow-none"
                >
                  {value === 'cards' && 'CARDS'}
                  {value === 'memo' && 'MEMO'}
                  {value === 'notes' && 'NOTES'}
                  {value === 'map' && 'MAP'}
                </TabsTrigger>
              ))}
            </TabsList>

            {activeTab === 'cards' && (
                <div className="flex items-center gap-1 mb-1 pl-4 border-l border-slate-200">


                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className={cn(
                            "h-8 px-2 md:px-3 ml-1 md:ml-2 gap-2 rounded-full border border-dashed hover:border-solid transition-all text-[10px] font-bold",
                            sortMode !== 'custom' 
                                ? "bg-primary-600/10 text-primary-600 border-primary-600/20"
                                : "text-slate-400 border-slate-200 hover:bg-slate-50 hover:text-slate-600"
                          )}
                        >
                          {sortMode === 'custom' && <ArrowUpDown className="w-3.5 h-3.5" />}
                          {sortMode === 'stability_asc' && <Percent className="w-3.5 h-3.5 rotate-180" />}
                          {sortMode === 'stability_desc' && <Percent className="w-3.5 h-3.5" />}
                          {sortMode === 'created_asc' && <Calendar className="w-3.5 h-3.5 rotate-180" />}
                          {sortMode === 'created_desc' && <Calendar className="w-3.5 h-3.5" />}
                          
                          <span className="hidden sm:inline">
                            {sortMode === 'custom' && '並び順'}
                            {sortMode === 'stability_asc' && '耐性スコア (昇順)'}
                            {sortMode === 'stability_desc' && '耐性スコア (降順)'}
                            {sortMode === 'created_asc' && '作成日 (昇順)'}
                            {sortMode === 'created_desc' && '作成日 (降順)'}
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>並び替え</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setSortMode('custom')}>
                          <ArrowUpDown className="w-4 h-4 mr-2" />
                          カスタム (標準)
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setSortMode('stability_desc')}>
                          <Percent className="w-4 h-4 mr-2" />
                          耐性スコア (高い順)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortMode('stability_asc')}>
                          <Percent className="w-4 h-4 mr-2 opacity-50" />
                          耐性スコア (低い順)
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setSortMode('created_desc')}>
                           <Calendar className="w-4 h-4 mr-2" />
                          作成日 (新しい順)
                        </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSortMode('created_asc')}>
                           <Calendar className="w-4 h-4 mr-2 opacity-50" />
                          作成日 (古い順)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
          </div>
          
          <TabsContent value="cards" className="mt-0">
             {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
                  </div>
                ) : (
                  <CardList
                    cards={sortedCards}
                    onReorder={handleReorder}
                    onView={handleViewCard}
                    onEdit={handleEditCard}
                    onDelete={handleDeleteCard}
                    onToggleUncertainty={handleToggleUncertainty}
                    onToggleBookmark={handleToggleBookmark}
                    onBulkClearDraft={async (cardsToUpdate) => {
                      for (const card of cardsToUpdate) {
                        await updateCard(card.id, { isDraft: false });
                      }
                    }}
                    enableDrag={true}
                    droppableId="cards"
                  />
                )}
          </TabsContent>
          
          <TabsContent value="memo" className="mt-0">
            <div className="max-w-3xl">
              <FolderMemo
                folder={folder}
                onUpdate={async (data) => {
                  if (folderId) {
                    await updateFolder(folderId, data);
                  }
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="notes" className="mt-0">
             <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800">資料 (PDF)</h3>
                  <div className="relative">
                    <Button
                      variant="outline"
                      className="border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                      onClick={() => document.getElementById('pdf-upload').click()}
                      disabled={isHookUploading || isPdfUploading}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      PDFを追加
                    </Button>
                    <input
                      id="pdf-upload"
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleAddPdf(file);
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                </div>

                {(uploadStatus === 'uploading' || uploadStatus === 'failed') && (
                  <div className="max-w-xl">
                      <UploadProgress 
                        fileName="PDFアップロード"
                        progress={uploadProgress}
                        status={uploadStatus}
                        error={uploadStatus === 'failed' ? 'アップロードに失敗しました' : undefined}
                      />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {notePdfs.map((pdf) => (
                    <div 
                      key={pdf.id} 
                      className="group p-4 rounded-xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm transition-all flex items-start gap-3"
                    >
                      <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0 text-red-500">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-slate-700 truncate mb-1">
                          {pdf.name}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span>{pdf.size ? (pdf.size / 1024 / 1024).toFixed(1) + ' MB' : 'PDF'}</span>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-primary-600"
                          onClick={() => window.open(pdf.remoteUrl || pdf.url, '_blank')}
                        >
                          <EyeIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-red-500"
                          onClick={async () => {
                             if (!confirm('このPDFを削除しますか？')) return;
                             const next = notePdfs.filter(p => p.id !== pdf.id);
                             setNotePdfs(next);
                             await updateFolder(folderId, { notePdfs: next, note_pdfs: next });
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {notePdfs.length === 0 && uploadStatus !== 'uploading' && (
                    <div className="col-span-full py-12 text-center text-slate-400">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="font-bold text-sm">PDFファイルがありません</p>
                      <p className="text-xs mt-1">「PDFを追加」から資料をアップロードできます</p>
                    </div>
                  )}
                </div>
             </div>
          </TabsContent>

          <TabsContent value="map" className="mt-0">
          <TabsContent value="map" className="mt-0">
             <MapList folderId={folderId} totalCardCount={totalDescendantCardCount} />
          </TabsContent>
          </TabsContent>
        </Tabs>

        <FolderDialog
          open={isCreateFolderOpen}
          onOpenChange={setIsCreateFolderOpen}
          parentFolderId={folderId}
          onSave={handleCreateFolder}
        />

        <CreateCardSelectionDialog
            open={isCreateCardDialogOpen}
            onOpenChange={setIsCreateCardDialogOpen}
            onSelectMode={handleCreateModeSelect}
        />

        <CreationModeDialog
            open={isCreationModeDialogOpen}
            onOpenChange={setIsCreationModeDialogOpen}
            onSelectMode={handleSpecificModeSelect}
            onBack={handleBackFromModeSelection} 
        />
      </div>
    </div>
    </DragDropContext>
  );
}