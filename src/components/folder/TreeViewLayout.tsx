import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from '@/ui/icons';
import { FolderTreeWithCards } from './FolderTreeWithCards';
import { RightPane } from './RightPane';
import { ExplorerTabs } from '../explorer/ExplorerTabs';
import { PinnedPanel } from '../explorer/PinnedPanel';
import { RecentPanel } from '../explorer/RecentPanel';
import { cn } from '@/lib/utils';
import { useFolders } from '@/hooks/useFolders';
import { useDocuments } from '@/hooks/useDocuments';
import { createPageUrl } from '@/utils';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useTags, resolveCardTagNames } from '@/hooks/useTags';
import type { Card, DocumentItem, Folder, SelectedExplorerItem } from '@/types';
import { useCards } from '@/hooks/useCards';
import { useExplorerStore } from '@/hooks/useExplorerStore';
import CreateCardSelectionDialog from '@/components/card/overlays/CreateCardSelectionDialog';
import CreationModeDialog from '@/components/card/overlays/CreationModeDialog';
import { ViewManagerDialog } from './ViewManagerDialog';
import { ViewsPanel } from './ViewsPanel';
import { buildVirtualTree, type ViewDef, type ViewKind } from './viewTypes';
import { ExplorerFilterSummary } from './ExplorerFilterSummary';

interface TreeViewLayoutProps {
  folders: Folder[];
  cards: Card[];
  documents: DocumentItem[];
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  selectedCardId: string | null;
  selectedDocumentId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
  onCardUpdated: () => void;
}

type LegacyCardFields = {
  folder_id?: string;
  is_deleted?: boolean;
  is_draft?: boolean;
  next_review_date?: unknown;
  review_count?: number;
  last_review_at?: unknown;
  has_uncertainty?: boolean;
  is_bookmarked?: boolean;
};

type CardLike = Card & LegacyCardFields;

const MIN_SIDEBAR_W = 200;
const MAX_SIDEBAR_W = 600;
const DEFAULT_SIDEBAR_W = 320;
const DEFAULT_FOLDER_VIEW: ViewDef = { id: 'folder-default', name: 'フォルダ', kind: 'folder' };
const ACTIVE_VIEW_KINDS: ViewKind[] = ['folder', 'tagCategory', 'tagTree'];

const createViewId = () =>
  (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `view-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

const toDate = (value: unknown): Date | null => {
  if (value === null || value === undefined) return null;
  if (typeof value?.toDate === 'function') {
    const d = value.toDate();
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  }
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

function TreeViewLayout({
  folders,
  cards,
  documents,
  selectedFolderId,
  selectedItem,
  selectedCardId,
  selectedDocumentId,
  onFolderSelect,
  onItemSelect,
  onCardUpdated,
}: TreeViewLayoutProps) {
  const navigate = useNavigate();
  const { settings, updateSettings } = useUserSettings();
  const { createFolder, updateFolder, deleteFolder } = useFolders();
  const { createCard, updateCard, deleteCard, moveCardToFolder, reorderCards } = useCards();
  const { updateDocument } = useDocuments();
  const { getTagColor, getCategoryName, listCategoryIdsInUse, tagById, tags } = useTags();

  const {
    explorerTab,
    setExplorerTab,
    pinnedItems,
    pinItem,
    unpinItem,
    recent,
    addRecent,
    clearRecent,
    tagFilter,
    tagMatchMode,
    uncertaintyFilter,
    bookmarkedFilter,
    draftFilter,
    contentTypeFilter,
  } = useExplorerStore();

  useEffect(() => {
    if (explorerTab === 'inbox') {
      setExplorerTab('explorer');
    }
  }, [explorerTab, setExplorerTab]);

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_SIDEBAR_W;
    const saved = localStorage.getItem('ui.sidebarWidth');
    return saved ? parseInt(saved, 10) : DEFAULT_SIDEBAR_W;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('ui.sidebarOpen');
    return saved !== null ? saved === 'true' : true;
  });

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  const [isResizing, setIsResizing] = useState(false);
  const [isCreateSelectionOpen, setIsCreateSelectionOpen] = useState(false);
  const [isModeSelectionOpen, setIsModeSelectionOpen] = useState(false);
  const [isViewManagerOpen, setIsViewManagerOpen] = useState(false);
  const [createFolderRequestToken, setCreateFolderRequestToken] = useState(0);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWRef = useRef(0);
  const pendingWRef = useRef(sidebarWidth);
  const rafIdRef = useRef<number | null>(null);

  const clamp = (w: number) => Math.min(Math.max(w, MIN_SIDEBAR_W), MAX_SIDEBAR_W);

  const applyWidthDom = useCallback(
    (w: number) => {
      if (isMobile) return;
      pendingWRef.current = clamp(w);

      if (rafIdRef.current != null) return;
      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null;
        const el = sidebarRef.current;
        if (!el) return;
        el.style.width = isSidebarOpen ? `${pendingWRef.current}px` : '0px';
      });
    },
    [isMobile, isSidebarOpen]
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    if (!isMobile) {
      el.style.width = isSidebarOpen ? `${sidebarWidth}px` : '0px';
    } else {
      // モバイル時は常に画面幅優先。desktop時のinline widthを完全に破棄する。
      el.style.width = '';
    }
    pendingWRef.current = sidebarWidth;
  }, [isMobile, sidebarWidth, isSidebarOpen]);

  const showMobileDetail = isMobile && Boolean(selectedFolderId || selectedCardId || selectedDocumentId || selectedItem);

  const handleFolderSelectWithRecent = (folderId: string | null) => {
    onFolderSelect(folderId);
    if (folderId) {
      addRecent({ type: 'folder', id: folderId });
    }
  };

  const getFolderPath = useCallback((folderId: string | null): string => {
    if (!folderId) return '';
    const path: string[] = [];
    let currentFolder = folders.find((folder) => folder.id === folderId);
    while (currentFolder) {
      path.unshift(currentFolder.folderName);
      currentFolder = folders.find((folder) => folder.id === currentFolder?.parentFolderId);
    }
    return path.join(' / ');
  }, [folders]);

  const selectedFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    return folders.find((folder) => folder.id === selectedFolderId) ?? null;
  }, [folders, selectedFolderId]);

  const selectedDocument = useMemo(() => {
    if (!selectedDocumentId) return null;
    return documents.find((document) => (document.id || document.documentId) === selectedDocumentId) ?? null;
  }, [documents, selectedDocumentId]);

  const mobileDetailTitle = useMemo(() => {
    if (selectedItem?.type === 'directory') return 'ディレクトリ';
    if (selectedItem?.type === 'today-study') return '今日の学習';
    if (selectedItem?.type === 'gallery') return 'ギャラリー';
    if (selectedItem?.type === 'calendar') return '予定表';
    if (selectedItem?.type === 'settings') return '設定';
    if (selectedItem?.type === 'trash') return 'ごみ箱';
    if (selectedItem?.type === 'card') return 'カード';
    if (selectedItem?.type === 'document') return 'ドキュメント';
    return selectedFolder?.folderName ?? 'フォルダ';
  }, [selectedItem, selectedFolder]);

  const folderCards = useMemo(() => {
    if (!selectedFolderId) return [];
    return cards.filter((card): card is CardLike => {
      const fid = card.folderId ?? card.folder_id;
      if (fid !== selectedFolderId) return false;
      const isDeleted = card.isDeleted ?? card.is_deleted;
      return !isDeleted;
    });
  }, [cards, selectedFolderId]);

  const folderStats = useMemo(() => {
    const autoCarryOver = settings?.autoCarryOver ?? true;
    const today = new Date();
    const tDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let dueCount = 0;
    let unlearnedCount = 0;
    let lastReviewedAt: Date | null = null;

    for (const card of folderCards) {
      const isDraft = card.isDraft ?? card.is_draft;
      if (!isDraft) {
        const reviewDate = toDate(card.nextReviewDate ?? card.next_review_date);
        if (reviewDate) {
          const rDate = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
          if (autoCarryOver ? rDate <= tDate : rDate.getTime() === tDate.getTime()) {
            dueCount += 1;
          }
        }
      }

      const reviewCount = card.reviewCount ?? card.review_count ?? 0;
      if (!isDraft && reviewCount === 0) {
        unlearnedCount += 1;
      }

      const lastReview = toDate(card.lastReviewAt ?? card.last_review_at);
      if (lastReview && (!lastReviewedAt || lastReview > lastReviewedAt)) {
        lastReviewedAt = lastReview;
      }
    }

    return {
      dueCount,
      unlearnedCount,
      lastReviewedAt,
    };
  }, [folderCards, settings?.autoCarryOver]);

  const handleStartStudy = useCallback(() => {
    if (!selectedFolderId) return;
    navigate(createPageUrl(`StudyMode?folderId=${selectedFolderId}`));
  }, [navigate, selectedFolderId]);

  const handleViewCards = useCallback(() => {
    if (!selectedFolderId) return;
    navigate(createPageUrl(`CardView?folderId=${selectedFolderId}`));
  }, [navigate, selectedFolderId]);

  const handleOpenCreateCard = useCallback(() => {
    if (!selectedFolderId) return;
    setIsCreateSelectionOpen(true);
  }, [selectedFolderId]);

  const handleSelectCreateMode = useCallback(
    (mode: 'single' | 'continuous') => {
      if (!selectedFolderId) return;
      setIsCreateSelectionOpen(false);
      if (mode === 'single') {
        navigate(createPageUrl(`CardEdit?folderId=${selectedFolderId}`));
        return;
      }
      setIsModeSelectionOpen(true);
    },
    [navigate, selectedFolderId]
  );

  const handleSelectDetailedMode = useCallback(
    (mode: string, options?: { hideTitle?: boolean }) => {
      if (!selectedFolderId) return;
      setIsModeSelectionOpen(false);

      if (mode === 'qa') {
        const hideTitle = options?.hideTitle ? '&hideTitle=true' : '';
        navigate(createPageUrl(`one-qa-mode?folderId=${selectedFolderId}${hideTitle}`));
        return;
      }
      if (mode === 'pair') {
        navigate(createPageUrl(`pair-mode?folderId=${selectedFolderId}`));
        return;
      }
      if (mode === 'choice') {
        navigate(createPageUrl(`four-choice-mode?folderId=${selectedFolderId}`));
        return;
      }
      navigate(createPageUrl(`create-mode/placeholder?folderId=${selectedFolderId}`));
    },
    [navigate, selectedFolderId]
  );

  const allTags = useMemo(() => {
    const tagNames = new Set<string>();
    cards.forEach((c) => {
      resolveCardTagNames(c.tagIds, c.tags, tagById).forEach(t => tagNames.add(t));
    });
    return Array.from(tagNames).sort();
  }, [cards, tagById]);

  const viewDefs = useMemo(() => {
    const storedViews = Array.isArray(settings?.explorerViews) ? settings.explorerViews : [];
    const validStoredViews = storedViews.filter((view): view is ViewDef => ACTIVE_VIEW_KINDS.includes(view.kind as ViewKind));
    const folderView = validStoredViews.find((view) => view.kind === 'folder') ?? DEFAULT_FOLDER_VIEW;
    return [folderView, ...validStoredViews.filter((view) => view.kind !== 'folder')];
  }, [settings]);

  const selectedViewId = useMemo(() => {
    const savedViewId = settings?.selectedExplorerViewId;
    if (savedViewId && viewDefs.some((view) => view.id === savedViewId)) return savedViewId;
    return viewDefs[0]?.id ?? DEFAULT_FOLDER_VIEW.id;
  }, [settings?.selectedExplorerViewId, viewDefs]);

  const selectedView = useMemo(
    () => viewDefs.find((view) => view.id === selectedViewId) ?? DEFAULT_FOLDER_VIEW,
    [selectedViewId, viewDefs]
  );

  const customViews = useMemo(
    () => viewDefs.filter((view) => view.kind !== 'folder'),
    [viewDefs]
  );

  const activeCustomView = useMemo(() => {
    if (selectedView.kind !== 'folder') return selectedView;
    return customViews[0] ?? null;
  }, [customViews, selectedView]);

  const categoryIdsInUse = useMemo(() => listCategoryIdsInUse(), [listCategoryIdsInUse]);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const categoryId of categoryIdsInUse) {
      map.set(categoryId, getCategoryName(categoryId));
    }
    return map;
  }, [categoryIdsInUse, getCategoryName]);

  const handleCreateRootFolder = useCallback(async () => {
    setCreateFolderRequestToken((prev) => prev + 1);
  }, []);

  const isFilterTargetTab = explorerTab === 'explorer';
  const isFilterActive =
    isFilterTargetTab &&
    (tagFilter.length > 0 ||
      uncertaintyFilter !== 'any' ||
      bookmarkedFilter !== 'any' ||
      draftFilter !== 'any' ||
      contentTypeFilter.length < 3);

  const { filteredCards, filteredDocuments, isFiltering } = useMemo(() => {
    const active =
      isFilterTargetTab &&
      (tagFilter.length > 0 ||
        uncertaintyFilter !== 'any' ||
        bookmarkedFilter !== 'any' ||
        draftFilter !== 'any' ||
        contentTypeFilter.length < 3);
    if (!active) return { filteredCards: cards, filteredDocuments: documents, isFiltering: false };

    const allowCards = contentTypeFilter.includes('card');
    const allowPdf = contentTypeFilter.includes('pdf');
    const allowPptx = contentTypeFilter.includes('pptx');

    const filtered = cards.filter((card) => {
      if (!allowCards) return false;
      if (tagFilter.length > 0) {
        const resolvedNames = resolveCardTagNames(card.tagIds, card.tags, tagById);
        if (resolvedNames.length === 0) return false;
        const cardTagSet = new Set(resolvedNames);
        const tagMatched =
          tagMatchMode === 'any'
            ? tagFilter.some((t) => cardTagSet.has(t))
            : tagFilter.every((t) => cardTagSet.has(t));
        if (!tagMatched) return false;
      }

      const hasUncertainty = Boolean(card.hasUncertainty ?? card.has_uncertainty);
      const isBookmarked = Boolean(card.isBookmarked ?? card.is_bookmarked);
      const isDraft = Boolean(card.isDraft ?? card.is_draft);

      if (uncertaintyFilter === 'on' && !hasUncertainty) return false;
      if (uncertaintyFilter === 'off' && hasUncertainty) return false;
      if (bookmarkedFilter === 'on' && !isBookmarked) return false;
      if (bookmarkedFilter === 'off' && isBookmarked) return false;
      if (draftFilter === 'on' && !isDraft) return false;
      if (draftFilter === 'off' && isDraft) return false;

      return true;
    });

    const nextDocuments = documents.filter((document) => {
      if (document.isDeleted) return false;
      if (document.kind === 'pdf') return allowPdf;
      if (document.kind === 'pptx') return allowPptx;
      return false;
    });

    return { filteredCards: filtered, filteredDocuments: nextDocuments, isFiltering: true };
  }, [
    cards,
    documents,
    tagFilter,
    tagMatchMode,
    isFilterTargetTab,
    uncertaintyFilter,
    bookmarkedFilter,
    draftFilter,
    contentTypeFilter,
    tagById,
  ]);

  const virtualTreeNodes = useMemo(() => {
    if (!activeCustomView) return [];
    return buildVirtualTree(activeCustomView, filteredCards, tags, categoryNameById);
  }, [activeCustomView, filteredCards, tags, categoryNameById]);

  const persistSettings = useCallback(async (patch: Partial<typeof settings>) => {
    await updateSettings(patch);
  }, [updateSettings]);

  const handleViewChange = useCallback(async (viewId: string) => {
    await persistSettings({ selectedExplorerViewId: viewId });
    const nextView = viewDefs.find((view) => view.id === viewId);
    if (nextView && nextView.kind !== 'folder') {
      onFolderSelect(null);
    }
  }, [onFolderSelect, persistSettings, viewDefs]);

  const handleAddView = useCallback(async (kind: ViewKind) => {
    if (kind === 'folder') return;
    const nextView: ViewDef = {
      id: createViewId(),
      name: kind === 'tagCategory' ? '新しいタグビュー' : '新しいタグツリー',
      kind,
      options: kind === 'tagCategory'
        ? { categoryMode: 'user-defined', ungroupedLabel: '未分類' }
        : { scopeMode: 'all', hideZeroUsage: true, ungroupedLabel: '未分類' },
    };
    await persistSettings({
      explorerViews: [...viewDefs, nextView],
      selectedExplorerViewId: nextView.id,
    });
  }, [persistSettings, viewDefs]);

  const handleRenameView = useCallback(async (viewId: string, name: string) => {
    await persistSettings({
      explorerViews: viewDefs.map((view) => (view.id === viewId ? { ...view, name } : view)),
    });
  }, [persistSettings, viewDefs]);

  const handleDeleteView = useCallback(async (viewId: string) => {
    const nextViews = viewDefs.filter((view) => view.id !== viewId);
    await persistSettings({
      explorerViews: nextViews,
      selectedExplorerViewId: selectedViewId === viewId ? DEFAULT_FOLDER_VIEW.id : selectedViewId,
    });
  }, [persistSettings, selectedViewId, viewDefs]);

  const handleUpdateCategoryName = useCallback(async (categoryId: string, displayName: string) => {
    await updateSettings({
      tagCategoryDisplayNames: {
        ...(settings?.tagCategoryDisplayNames ?? {}),
        [categoryId]: displayName,
      },
    });
  }, [settings?.tagCategoryDisplayNames, updateSettings]);

  const handleUpdateUngroupedLabel = useCallback(async (viewId: string, label: string) => {
    await persistSettings({
      explorerViews: viewDefs.map((view) => (
        view.id === viewId
          ? {
              ...view,
              options: {
                ...view.options,
                ungroupedLabel: label,
              },
            }
          : view
      )),
    });
  }, [persistSettings, viewDefs]);

  const handleUpdateViewOptions = useCallback(async (viewId: string, options: NonNullable<ViewDef['options']>) => {
    await persistSettings({
      explorerViews: viewDefs.map((view) => (
        view.id === viewId
          ? {
              ...view,
              options,
            }
          : view
      )),
    });
  }, [persistSettings, viewDefs]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        e.preventDefault();
        setIsSidebarOpen((prev) => {
          const newState = !prev;
          localStorage.setItem('ui.sidebarOpen', String(newState));
          return newState;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const startResizing = useCallback(
    (e: React.PointerEvent) => {
      if (!isSidebarOpen) return;
      e.preventDefault();

      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

      resizingRef.current = true;
      setIsResizing(true);

      startXRef.current = e.clientX;
      startWRef.current = pendingWRef.current;

      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    },
    [isSidebarOpen]
  );

  const stopResizing = useCallback(() => {
    if (!resizingRef.current) return;

    resizingRef.current = false;
    setIsResizing(false);

    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    const finalW = pendingWRef.current;
    setSidebarWidth(finalW);
    localStorage.setItem('ui.sidebarWidth', String(finalW));
  }, []);

  const onResizeMove = useCallback(
    (e: PointerEvent) => {
      if (!resizingRef.current) return;
      const dx = e.clientX - startXRef.current;
      applyWidthDom(startWRef.current + dx);
    },
    [applyWidthDom]
  );

  useEffect(() => {
    if (!isResizing) return;

    window.addEventListener('pointermove', onResizeMove, { passive: true });
    window.addEventListener('pointerup', stopResizing);
    window.addEventListener('pointercancel', stopResizing);

    return () => {
      window.removeEventListener('pointermove', onResizeMove);
      window.removeEventListener('pointerup', stopResizing);
      window.removeEventListener('pointercancel', stopResizing);
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    };
  }, [isResizing, onResizeMove, stopResizing]);

  const renderTabContent = () => {
    switch (explorerTab) {
      case 'pinned':
        return (
          <PinnedPanel
            pinnedItems={pinnedItems}
            folders={folders}
            cards={cards}
            documents={documents}
            onFolderSelect={handleFolderSelectWithRecent}
            onItemSelect={onItemSelect}
            onUnpinItem={unpinItem}
            getFolderPath={getFolderPath}
          />
        );
      case 'recent':
        return (
          <RecentPanel
            recent={recent}
            folders={folders}
            cards={cards}
            documents={documents}
            onFolderSelect={handleFolderSelectWithRecent}
            onItemSelect={onItemSelect}
            onClearRecent={clearRecent}
          />
        );
      case 'views':
        return (
          <ViewsPanel
            views={customViews}
            selectedViewId={activeCustomView?.id ?? null}
            nodes={virtualTreeNodes}
            cards={filteredCards}
            selectedItem={selectedItem}
            onSelectView={handleViewChange}
            onItemSelect={onItemSelect}
            onOpenManager={() => setIsViewManagerOpen(true)}
          />
        );
      case 'explorer':
      default:
        return (
          <FolderTreeWithCards
              folders={folders}
              cards={filteredCards}
              documents={filteredDocuments}
              selectedFolderId={selectedFolderId}
              selectedItem={selectedItem}
              onFolderSelect={handleFolderSelectWithRecent}
              onItemSelect={onItemSelect}
              onCreateFolder={createFolder}
              onUpdateFolder={updateFolder}
              onDeleteFolder={deleteFolder}
              onCreateCard={createCard}
              onUpdateCard={updateCard}
              onDeleteCard={deleteCard}
              moveCardToFolder={moveCardToFolder}
              moveDocumentToFolder={(id, folderId) => updateDocument(id, { folderId })}
              reorderCards={reorderCards}
              pinnedItems={pinnedItems}
              onPinItem={pinItem}
              onUnpinItem={unpinItem}
              isFiltering={isFiltering}
              createFolderRequestToken={createFolderRequestToken}
            />
        );
    }
  };

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 items-stretch overflow-hidden border-0 bg-transparent md:border-r md:border-sidebar-border md:bg-sidebar",
        isResizing && "select-none cursor-col-resize"
      )}
    >
      {/* =====================================================
          サイドバー
          【修正】overflow-hidden を常時から削除。
          will-change-[width] もリサイズ中のみに限定。
          理由: overflow-hidden + will-change の組み合わせが新しい
          スタッキングコンテキストを形成し、Radix UI の DropdownMenu
          (ContextMenu) がポータル経由で描画されてもポインターイベントが
          サイドバー要素に届かなくなっていた。
          サイドバーを閉じた時は !isSidebarOpen 条件クラスの
          md:overflow-hidden が適用されるため見た目は壊れない。
      ===================================================== */}
      <div
        ref={sidebarRef}
        style={{ backgroundColor: "var(--sidebar-bg)" }}
        className={cn(
          "shrink-0 flex-col bg-sidebar md:bg-sidebar border-r-0 md:border-r border-sidebar-border relative group/sidebar select-none",
          showMobileDetail ? "hidden md:flex" : "flex",
          "md:shadow-none",
          isResizing ? "transition-none will-change-[width]" : "transition-all duration-300 ease-in-out",
          "w-[100dvw] max-w-[100dvw] md:w-auto md:max-w-none",
          !isSidebarOpen && "md:w-0 md:border-r-0 md:overflow-hidden"
        )}
      >
        <div className="flex flex-col h-full min-h-0 w-full overflow-hidden">
            {/* ExplorerTabs: 常に固定ヘッダー */}
            <div className="shrink-0">
              <ExplorerTabs
                activeTab={explorerTab}
                onTabChange={setExplorerTab}
                allTags={allTags}
                onCreateRootFolder={handleCreateRootFolder}
                showExplorerActions={explorerTab === 'explorer'}
              />
            </div>

            <div className="shrink-0">
              <ExplorerFilterSummary
                getTagColor={getTagColor}
                isFilterActive={isFilterActive}
                resultCount={filteredCards.length + filteredDocuments.length}
              />
            </div>

            <div
              ref={contentScrollRef}
              className="flex-1 min-h-0 overflow-y-auto outline-none min-w-0"
            >
              {renderTabContent()}
            </div>
        </div>

        {/* リサイズハンドル: デスクトップのみ表示 */}
        {isSidebarOpen && (
          <div
            className={cn(
              "hidden md:block absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-50 hover:bg-primary-600/10 transition-colors",
              isResizing && "bg-primary-600/20"
            )}
            onPointerDown={startResizing}
            role="separator"
            aria-label="サイドバーのサイズ変更"
            tabIndex={0}
            style={{ touchAction: 'none' }}
          >
            <div
              className={cn(
                "absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-slate-200 transition-colors",
                "group-hover/sidebar:bg-primary-400 md:group-hover/sidebar:bg-primary-400"
              )}
            />
          </div>
        )}
      </div>

      {/* =====================================================
          右ペイン
          【修正】overflow-hidden を削除。
          理由: 右ペインの overflow-hidden も新しいスタッキングコンテキストを
          作り、サイドバー内の Radix UI DropdownMenu のイベント伝播を
          妨害していた。
      ===================================================== */}
      <div className={cn(
        "flex-1 min-h-0 min-w-0 bg-white flex-col",
        showMobileDetail ? "flex" : "hidden md:flex"
      )}>
        {isMobile && showMobileDetail && (
          <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-white">
            <button
              type="button"
              onClick={() => {
                onItemSelect(null);
                onFolderSelect(null);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
              aria-label="一覧に戻る"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-slate-700">{mobileDetailTitle}</span>
          </div>
        )}
        <RightPane
          selectedItem={selectedItem}
          selectedCardId={selectedCardId}
          selectedDocument={selectedDocument}
          selectedFolderId={selectedFolderId}
          selectedFolderName={selectedFolder?.folderName ?? 'フォルダ'}
          folders={folders}
          cards={cards}
          documents={documents}
          folderCards={folderCards}
          folderStats={folderStats}
          onCardUpdated={onCardUpdated}
          onDocumentUpdated={updateDocument}
          handlers={{
            onStartStudy: handleStartStudy,
            onViewCards: handleViewCards,
            onCreateCard: handleOpenCreateCard,
          }}
        />
      </div>

      <CreateCardSelectionDialog
        open={isCreateSelectionOpen}
        onOpenChange={setIsCreateSelectionOpen}
        onSelectMode={handleSelectCreateMode}
      />

      <CreationModeDialog
        open={isModeSelectionOpen}
        onOpenChange={setIsModeSelectionOpen}
        onSelectMode={handleSelectDetailedMode}
        onBack={() => {
          setIsModeSelectionOpen(false);
          setIsCreateSelectionOpen(true);
        }}
      />
      <ViewManagerDialog
        open={isViewManagerOpen}
        onOpenChange={setIsViewManagerOpen}
        views={viewDefs}
        tags={tags}
        categoryNameEntries={Array.from(categoryNameById.entries())}
        onAddView={handleAddView}
        onRenameView={handleRenameView}
        onDeleteView={handleDeleteView}
        onUpdateCategoryName={handleUpdateCategoryName}
        onUpdateUngroupedLabel={handleUpdateUngroupedLabel}
        onUpdateViewOptions={handleUpdateViewOptions}
      />
    </div>
  );
}

export default TreeViewLayout;
