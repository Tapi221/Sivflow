import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useCards } from '@/hooks/useCards';
import { useFolders } from '@/hooks/useFolders';
import { useAuth } from '@/contexts/AuthContext';
import { useReliableFileUpload } from '@/hooks/useReliableFileUpload';
import { useTags } from '@/hooks/useTags'; // Added
import { Checkbox } from '@/Components/ui/checkbox'; // Added
import { Button } from '@/Components/ui/button';
import { UploadProgress } from '@/Components/ui/UploadProgress';
import { Skeleton } from '@/Components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { 
  ArrowLeft, 
  Plus, 
  BellOff,

  ArrowUpDown,
  Calendar,
  Percent,
  FileText,
  X,
  Check,
  RotateCw,
  MoreVertical,
  Edit,
  Trash2,
  Tag,
  LayoutGrid, // Added
  List, // Added
  Filter, // Added
  AlignJustify, // Added
  LayoutDashboard, // Added
  Waypoints, // Added
  Table,
  Maximize2,
  Newspaper,
  StickyNote,
  Minus,
  ChevronRight, // Added
  Folder // Added
} from 'lucide-react';
import EyeIcon from 'lucide-react/dist/esm/icons/eye';
import FolderOpen from 'lucide-react/dist/esm/icons/folder-open';
import { createPageUrl } from '@/utils';
import { firestoreDb } from '@/services/firebase';
import { useToast } from '@/contexts/ToastContext';
import { calculateResistanceScore } from '@/utils/reviewMetrics';
import { useUserSettings } from '@/hooks/useUserSettings';
import CardList from '@/Components/card/CardList';
import FolderMemo from '@/Components/folder/FolderMemo';
import FolderDialog from '@/Components/folder/FolderDialog';
import MapList from '@/Components/map/MapList';
import CreateCardSelectionDialog from '@/Components/card/CreateCardSelectionDialog';
import CreationModeDialog from '@/Components/card/CreationModeDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/Components/ui/dropdown-menu";
import { DragDropContext, Droppable } from '@hello-pangea/dnd';

const getFolderId = (f) => (f?.id ?? f?.folderId ?? null);
const getParentFolderId = (f) => (f?.parentFolderId ?? f?.parent_folder_id ?? null);
const getCardFolderId = (c) => (c?.folderId ?? c?.folder_id ?? null);

const isDeletedEntity = (x) => Boolean(x?.isDeleted ?? x?.is_deleted ?? false);

const getCreatedAtMs = (x) => {
  const v = x?.createdAt ?? x?.created_at;
  if (!v) return 0;
  if (typeof v === 'object' && typeof v.seconds === 'number') return v.seconds * 1000;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
};

export default function FolderView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  
  const folderId = searchParams.get('id');

  useUserSettings();
  const [activeTab, setActiveTab] = useState('cards');
  const [notePdfs, setNotePdfs] = useState([]);
  const [isPdfUploading, setIsPdfUploading] = useState(false);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isCreateCardDialogOpen, setIsCreateCardDialogOpen] = useState(false);
  const [isCreationModeDialogOpen, setIsCreationModeDialogOpen] = useState(false);
  
  // Filter state: 'all' | 'crowned' | 'uncrowned'
  const [filterMode] = useState('all');
  
  // Sort state: 'custom' | 'stability_asc' | 'stability_desc' | 'created_asc' | 'created_desc'
  const [sortMode, setSortMode] = useState('custom');
  
  // View state: 'grid' | 'list'
  const [viewMode, setViewMode] = useState('grid');
  
  // Tag Filter state
  const [selectedTags, setSelectedTags] = useState([]);

  // Folder Sort state: 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc'
  const [folderSortMode] = useState('created_desc');

  
  // useCardsフックから必要な関数とデータを取得
  const { 
    cards: allCards = [], 
    loading: cardsLoading, 
    updateCard, 
    deleteCard 
  } = useCards();
  const { folders = [], loading: foldersLoading, updateFolder, createFolder } = useFolders();
  
  const folder = folders.find(f => f.id === folderId || f.folderId === folderId);
  const isSilent = folder?.isSilent ?? folder?.is_silent ?? false;
  const loading = cardsLoading || foldersLoading;



  useEffect(() => {
    setNotePdfs(folder?.notePdfs ?? folder?.note_pdfs ?? []);
  }, [folder]);

  const lastAccessUpdatedRef = useRef(null);
  
  // フォルダアクセス時に lastAccessAt を更新
  useEffect(() => {
    const updateLastAccess = async () => {
      if (!folderId || !folder || !updateFolder) return;
      if (lastAccessUpdatedRef.current === folderId) return;

      lastAccessUpdatedRef.current = folderId;

      try {
        const now = new Date();
        await updateFolder(folderId, { lastAccessAt: now, last_access_at: now });
      } catch (error) {
        console.error('Failed to update lastAccessAt:', error);
      }
    };
    
    updateLastAccess();
  }, [folderId, folder, updateFolder]);
  
  // Root Folder Resolution for Tags
  const rootFolder = useMemo(() => {
    if (!folder) return null;
    let current = folder;
    // Safety break to prevent infinite loops in cyclic references (though unlikely)
    let depth = 0;
    while (current && depth < 50) {
      const parentId = current.parentFolderId ?? current.parent_folder_id;
      if (!parentId) return current; // Found root
      
      const parent = folders.find(f => (f.id === parentId) || (f.folderId === parentId));
      if (!parent) return current; // Parent not found in loaded folders, treat current as root accessible
      
      current = parent;
      depth++;
    }
    return current;
  }, [folder, folders]);

  const rootFolderId = rootFolder?.id || rootFolder?.folderId;
  const { tags: availableTags } = useTags(rootFolderId);
  const tagList = useMemo(() => Array.from(new Set(availableTags.map(t => t.name))).sort(), [availableTags]);

  const folderCards = useMemo(() => {
    return allCards.filter(c => {
      if (isDeletedEntity(c)) return false;
      return getCardFolderId(c) === folderId;
    });
  }, [allCards, folderId]);

  const sortedCards = useMemo(() => {
    let result = [...folderCards].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    // Crown filter: bookmark を王冠扱い
    if (filterMode === 'crowned') {
      result = result.filter(c => (c.isBookmarked ?? c.is_bookmarked) === true);
    } else if (filterMode === 'uncrowned') {
      result = result.filter(c => (c.isBookmarked ?? c.is_bookmarked) !== true);
    }

    // Tag filter
    if (selectedTags.length > 0) {
      result = result.filter(card => {
        const cardTags = card.tags || [];
        return cardTags.some((tag) => selectedTags.includes(tag));
      });
    }

    // Sort
    if (sortMode === 'custom') {
      // orderIndex のまま
    } else if (sortMode === 'stability_asc') {
      result.sort((a, b) => calculateResistanceScore(a.interval || 0) - calculateResistanceScore(b.interval || 0));
    } else if (sortMode === 'stability_desc') {
      result.sort((a, b) => calculateResistanceScore(b.interval || 0) - calculateResistanceScore(a.interval || 0));
    } else if (sortMode === 'created_asc') {
      result.sort((a, b) => getCreatedAtMs(a) - getCreatedAtMs(b));
    } else if (sortMode === 'created_desc') {
      result.sort((a, b) => getCreatedAtMs(b) - getCreatedAtMs(a));
    }

    return result;
  }, [folderCards, filterMode, sortMode, selectedTags]);

  
  const handleReorder = async (reorderedCards) => {
    const updates = [];
    for (let i = 0; i < reorderedCards.length; i++) {
      if (reorderedCards[i].orderIndex !== i) {
        updates.push(updateCard(reorderedCards[i].id, { orderIndex: i }));
      }
    }
    await Promise.all(updates);
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
      
      if (modeId === 'choice') {
        const queryParams = new URLSearchParams();
        queryParams.set('folderId', folderId);
        navigate(`/four-choice-mode?${queryParams.toString()}`);
        return;
      }

      if (modeId === 'pair') {
        const queryParams = new URLSearchParams();
        queryParams.set('folderId', folderId);
        navigate(`/pair-mode?${queryParams.toString()}`);
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
  
  const folderById = useMemo(() => {
    const m = new Map();
    for (const f of folders) {
      const id = getFolderId(f);
      if (id) m.set(id, f);
    }
    return m;
  }, [folders]);

  const breadcrumbs = useMemo(() => {
    if (!folder) return [];
    const path = [];
    let cur = folder;
    const visited = new Set();

    while (cur) {
      const id = getFolderId(cur);
      if (id && visited.has(id)) break;
      if (id) visited.add(id);

      path.unshift(cur);

      const pid = getParentFolderId(cur);
      if (!pid) break;

      cur = folderById.get(pid);
    }

    return path;
  }, [folder, folderById]);

  const cardCountByFolderId = useMemo(() => {
    const m = new Map();
    for (const c of allCards) {
      const fid = getCardFolderId(c);
      if (!fid) continue;
      if (isDeletedEntity(c)) continue;
      m.set(fid, (m.get(fid) || 0) + 1);
    }
    return m;
  }, [allCards]);

  const getFolderCardCountFast = useCallback(
    (targetFolderId) => cardCountByFolderId.get(targetFolderId) || 0,
    [cardCountByFolderId]
  );

  const childFolders = useMemo(() => {
    return folders.filter(f => {
      if (isDeletedEntity(f)) return false;
      return getParentFolderId(f) === folderId;
    });
  }, [folders, folderId]);

  const sortedChildFolders = useMemo(() => {
    let result = [...childFolders];
    
    if (folderSortMode === 'created_desc') {
      result.sort((a, b) => getCreatedAtMs(b) - getCreatedAtMs(a));
    } else if (folderSortMode === 'created_asc') {
      result.sort((a, b) => getCreatedAtMs(a) - getCreatedAtMs(b));
    } else if (folderSortMode === 'name_asc') {
      result.sort((a, b) => (a.folderName || "").localeCompare(b.folderName || ""));
    } else if (folderSortMode === 'name_desc') {
      result.sort((a, b) => (b.folderName || "").localeCompare(a.folderName || ""));
    }
    
    return result;
  }, [childFolders, folderSortMode]);

  const childrenByParentId = useMemo(() => {
    const m = new Map();
    for (const f of folders) {
      if (isDeletedEntity(f)) continue;
      const pid = getParentFolderId(f);
      const id = getFolderId(f);
      if (!pid || !id) continue;
      if (!m.has(pid)) m.set(pid, []);
      const arr = m.get(pid);
      if (arr) arr.push(f);
    }
    return m;
  }, [folders]);

  const totalDescendantCardCount = useMemo(() => {
    if (!folderId) return 0;

    const ids = new Set();
    const stack = [folderId];

    while (stack.length) {
      const id = stack.pop();
      if (!id || ids.has(id)) continue;
      ids.add(id);

      const children = childrenByParentId.get(id) || [];
      for (const ch of children) {
        const cid = getFolderId(ch);
        if (cid) stack.push(cid);
      }
    }

    let total = 0;
    for (const id of ids) total += getFolderCardCountFast(id);
    return total;
  }, [folderId, childrenByParentId, getFolderCardCountFast]);
  
  const isLoading = loading || cardsLoading;

  const canDragReorder = sortMode === 'custom' && selectedTags.length === 0 && filterMode === 'all';

  const handleToggleSilent = async () => {
    if (!folderId) return;
    const nextSilent = !isSilent;
    await updateFolder(folderId, { isSilent: nextSilent, is_silent: nextSilent });
  };
  
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
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
    <div className="min-h-screen bg-[#F8FAFB] transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 pt-1 pb-4 md:px-8 md:pt-1 md:pb-8 ml-0 md:ml-12">


        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          {/* Back Button - Extreme left */}
          <div className="shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl('Folders'))}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 h-8 w-8"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* Breadcrumbs - Left side, next to back button */}
          <div className="flex-1 min-w-0 overflow-hidden">
             {isLoading ? (
               <Skeleton className="h-6 w-32" />
             ) : (
               <div className="flex items-center gap-1 overflow-x-auto no-scrollbar whitespace-nowrap mask-image-scroll-fade py-1">
                  <button 
                      onClick={() => navigate('/Folders')}
                      className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 px-1.5 py-0.5 rounded-md transition-all select-none"
                  >
                      <Folder className="w-3 h-3" />
                      <span className="hidden sm:inline">フォルダ一覧</span>
                  </button>
                  
                  {breadcrumbs.map((crumb, index) => {
                      const isLast = index === breadcrumbs.length - 1;
                      return (
                          <React.Fragment key={crumb.id || crumb.folderId}>
                              <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
                              <button 
                                  onClick={() => !isLast && navigate(`/FolderView?id=${crumb.id || crumb.folderId}`)}
                                  disabled={isLast}
                                  className={cn(
                                      "flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md transition-all select-none max-w-[120px] truncate",
                                      isLast 
                                          ? "text-slate-600 cursor-default" 
                                          : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                  )}
                              >
                                  {isLast ? (
                                      <FolderOpen className="w-3 h-3 text-slate-400" />
                                  ) : (
                                      <Folder className="w-3 h-3" />
                                  )}
                                  <span className="truncate">{crumb.folderName || crumb.folder_name}</span>
                              </button>
                          </React.Fragment>
                      );
                  })}
                  {isSilent && (
                      <BellOff className="w-3 h-3 text-slate-400 ml-1" />
                  )}
               </div>
             )}
          </div>

          {/* Actions Area - Extreme right */}
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
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

             {/* Desktop Buttons */}
             <div className="hidden md:flex items-center gap-3 ml-2 mr-32">
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


        {/* Sub Folders Section - Compact & Headerless */}
        <div className="mb-1 flex items-center gap-4 bg-slate-50/50 p-2 md:p-3 rounded-2xl border border-slate-100/50 mt-0.5">
            <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 -mx-4 px-4 md:mx-0 md:px-0 mask-image-scroll-fade">
                {/* New Folder Button */}
                 <button
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-white rounded-full border border-dashed border-slate-300 hover:border-primary-600 hover:text-primary-600 transition-all whitespace-nowrap flex-shrink-0 text-slate-400 font-bold text-[10px] group"
                    onClick={() => setIsCreateFolderOpen(true)}
                  >
                    <Plus className="w-3 h-3 group-hover:scale-110 transition-transform" />
                    <span>新規フォルダ</span>
                  </button>

              {sortedChildFolders.map(childFolder => {
                const cardCount = getFolderCardCountFast(childFolder.id ?? childFolder.folderId);
                const targetId = childFolder.id ?? childFolder.folderId;
                
                return (
                  <Droppable key={targetId} droppableId={`folder-${targetId}`} isCombineEnabled={false}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                             "group flex items-center gap-1.5 px-2.5 py-1.5 bg-white rounded-full border border-slate-200 border-b-2 border-b-slate-300 shadow-sm transition-all duration-300 select-none cursor-pointer flex-shrink-0 relative overflow-hidden",
                             // ホバー時の浮き上がり効果
                             "hover:-translate-y-0.5 hover:shadow-md hover:border-primary-600/40 hover:text-primary-600",
                             snapshot.isDraggingOver ? "border-primary-600 ring-2 ring-primary-600/20 bg-primary-600/5 text-primary-600" : ""
                        )}
                        onClick={() => {
                          if (targetId) navigate(`/FolderView?id=${targetId}`);
                        }}
                      >
                         {/* Visual Content */}
                        <FolderOpen className={cn(
                            "w-3 h-3 transition-colors",
                            snapshot.isDraggingOver ? "text-primary-600" : "text-slate-400 group-hover:text-primary-600"
                        )} />
                        
                        <span className="text-[10px] font-bold truncate max-w-[150px]">
                            {childFolder.folderName ?? childFolder.folder_name}
                        </span>
                        
                        {(childFolder.isSilent ?? childFolder.is_silent) && (
                            <BellOff className="w-2.5 h-2.5 text-slate-300" />
                        )}

                        <span className={cn(
                            "ml-0.5 text-[9px] font-bold px-1 py-0 rounded-full transition-colors",
                            snapshot.isDraggingOver ? "bg-primary-600/20 text-primary-700" : "bg-slate-100 text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-600"
                        )}>
                            {cardCount}
                        </span>
                        
                        {/* Drag Overlay Hint */}
                        {snapshot.isDraggingOver && (
                             <div className="absolute inset-0 bg-primary-600/10 z-10" />
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
                    {/* View Mode Toggle */}
                    <div className="flex bg-slate-100 rounded-lg p-0.5 mr-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'grid' ? "bg-white shadow-sm text-primary-600" : "text-slate-400 hover:text-slate-600"
                            )}
                            title="グリッド表示"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'list' ? "bg-white shadow-sm text-primary-600" : "text-slate-400 hover:text-slate-600"
                            )}
                            title="リスト表示"
                        >
                            <List className="w-4 h-4" />
                        </button>
                         <button
                            onClick={() => setViewMode('compact')}
                            className={cn(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'compact' ? "bg-white shadow-sm text-primary-600" : "text-slate-400 hover:text-slate-600"
                            )}
                            title="コンパクト表示"
                        >
                            <AlignJustify className="w-4 h-4" />
                        </button>
                         <button
                            onClick={() => setViewMode('gallery')}
                            className={cn(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'gallery' ? "bg-white shadow-sm text-primary-600" : "text-slate-400 hover:text-slate-600"
                            )}
                            title="ギャラリー表示"
                        >
                            <LayoutDashboard className="w-4 h-4" />
                        </button>
                         <button
                            onClick={() => setViewMode('timeline')}
                            className={cn(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'timeline' ? "bg-white shadow-sm text-primary-600" : "text-slate-400 hover:text-slate-600"
                            )}
                            title="タイムライン表示"
                        >
                            <Waypoints className="w-4 h-4" />
                        </button>
                         <button
                            onClick={() => setViewMode('table')}
                            className={cn(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'table' ? "bg-white shadow-sm text-primary-600" : "text-slate-400 hover:text-slate-600"
                            )}
                            title="テーブル表示"
                        >
                            <Table className="w-4 h-4" />
                        </button>
                         <button
                            onClick={() => setViewMode('hero')}
                            className={cn(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'hero' ? "bg-white shadow-sm text-primary-600" : "text-slate-400 hover:text-slate-600"
                            )}
                            title="ヒーロー表示"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                         <button
                            onClick={() => setViewMode('magazine')}
                            className={cn(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'magazine' ? "bg-white shadow-sm text-primary-600" : "text-slate-400 hover:text-slate-600"
                            )}
                            title="マガジン表示"
                        >
                            <Newspaper className="w-4 h-4" />
                        </button>
                         <button
                            onClick={() => setViewMode('sticky')}
                            className={cn(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'sticky' ? "bg-white shadow-sm text-primary-600" : "text-slate-400 hover:text-slate-600"
                            )}
                            title="付箋表示"
                        >
                            <StickyNote className="w-4 h-4" />
                        </button>
                         <button
                            onClick={() => setViewMode('bullet')}
                            className={cn(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'bullet' ? "bg-white shadow-sm text-primary-600" : "text-slate-400 hover:text-slate-600"
                            )}
                            title="バレット表示"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                    </div>

                    <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                           <Button
                               variant="ghost"
                               className={cn(
                                   "p-1.5 rounded-md transition-all mr-2",
                                   selectedTags.length > 0 ? "bg-primary-50 text-primary-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                               )}
                               title="タグで絞り込み"
                           >
                               <Filter className={cn("w-4 h-4", selectedTags.length > 0 && "fill-current")} />
                               {selectedTags.length > 0 && (
                                   <span className="ml-1 text-[10px] font-bold">{selectedTags.length}</span>
                               )}
                           </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end" className="w-56 p-2 max-h-[300px] overflow-y-auto">
                           <DropdownMenuLabel>タグフィルター</DropdownMenuLabel>
                           <DropdownMenuSeparator />
                           {tagList.length === 0 ? (
                               <div className="p-2 text-xs text-slate-400 text-center">タグが見つかりません</div>
                           ) : (
                               <>
                                   <div className="mb-2 px-2">
                                       <Button 
                                           variant="outline" 
                                           size="sm" 
                                           className="w-full text-xs h-7"
                                           onClick={() => setSelectedTags([])}
                                           disabled={selectedTags.length === 0}
                                       >
                                           全選択解除
                                       </Button>
                                   </div>
                                   {tagList.map(tag => (
                                       <div key={tag} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded-md cursor-pointer" onClick={() => {
                                            if (selectedTags.includes(tag)) {
                                                setSelectedTags(prev => prev.filter(t => t !== tag));
                                            } else {
                                                setSelectedTags(prev => [...prev, tag]);
                                            }
                                       }}>
                                           <Checkbox 
                                               id={`filter-tag-${tag}`} 
                                               checked={selectedTags.includes(tag)}
                                               onCheckedChange={(checked) => {
                                                   if (checked) {
                                                       setSelectedTags(prev => [...prev, tag]);
                                                   } else {
                                                       setSelectedTags(prev => prev.filter(t => t !== tag));
                                                   }
                                               }}
                                           />
                                           <label 
                                               htmlFor={`filter-tag-${tag}`} 
                                               className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                               onClick={(e) => e.preventDefault()} // Prevent double toggle due to parent click
                                           >
                                               {tag}
                                           </label>
                                       </div>
                                   ))}
                               </>
                           )}
                       </DropdownMenuContent>
                    </DropdownMenu>

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
                    enableDrag={canDragReorder}
                    droppableId="cards"
                    viewMode={viewMode}
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
             <MapList folderId={folderId} totalCardCount={totalDescendantCardCount} />
          </TabsContent>
        </Tabs>

        <FolderDialog
          open={isCreateFolderOpen}
          onOpenChange={setIsCreateFolderOpen}
          parentFolderId={folderId}
          onSave={handleCreateFolder}
        />

        {/* Mobile Floating Action Button for New Card */}
        <div className="md:hidden fixed bottom-20 right-4 z-40">
            <Button
                size="icon"
                className="w-14 h-14 rounded-full shadow-lg bg-primary-600 hover:bg-primary-700 text-white transition-transform active:scale-95"
                onClick={() => setIsCreateCardDialogOpen(true)}
            >
                <Plus className="w-6 h-6" />
            </Button>
        </div>

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