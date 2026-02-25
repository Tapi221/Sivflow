import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { FolderTreeWithCards } from './FolderTreeWithCards';
import { RightPane } from './RightPane';
import { ExplorerTabs } from '../explorer/ExplorerTabs';
import { FavoritesPanel } from '../explorer/FavoritesPanel';
import { RecentPanel } from '../explorer/RecentPanel';
import { cn } from '@/lib/utils';
import { useFolders } from '@/hooks/useFolders';
import { useDocuments } from '@/hooks/useDocuments';
import { createPageUrl } from '@/utils';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useTags } from '@/hooks/useTags';
import { TagBadge } from '@/Components/tag/TagBadge';
import type { Card, DocumentItem, SelectedExplorerItem } from '@/types';
import { useCards } from '@/hooks/useCards';
import { useExplorerStore } from '@/hooks/useExplorerStore';


interface TreeViewLayoutProps {
  folders: any[];
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

const MIN_SIDEBAR_W = 200;
const MAX_SIDEBAR_W = 600;
const DEFAULT_SIDEBAR_W = 320;

const toDate = (value: any): Date | null => {
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
  const { settings } = useUserSettings();
  const { createFolder, updateFolder, deleteFolder } = useFolders();
  const { createCard, updateCard, deleteCard, moveCardToFolder, reorderCards } = useCards();
  const { updateDocument } = useDocuments();
  const { getTagColor } = useTags();

  const {
    explorerTab,
    setExplorerTab,
    favorites,
    addFavorite,
    removeFavorite,
    recent,
    addRecent,
    clearRecent,
    tagFilter,
    toggleTag,
    clearTagFilter,
    tagMatchMode,
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
  const sidebarRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  // モバイルでのスクロールに応じたExplorerTabsの縮小 (廃止: 常に表示)
  // const isTabsCompact = useHeaderCompact(32, 8, contentScrollRef);

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
        // モバイルでない場合のみ幅を適用したいが、JSでは判定が難しいのでCSSに任せるのが理想だが
        // ここでは applyWidthDom が desktop でしか呼ばれない前提（リサイズハンドルがないため）で動く。
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

  const showMobileDetail = isMobile && Boolean(selectedFolderId || selectedCardId || selectedDocumentId);

  const handleCardSelectWithRecent = (cardId: string) => {
    onItemSelect({ type: 'card', id: cardId });
    addRecent({ type: 'card', id: cardId });
  };

  const handleDocumentSelectWithRecent = (docId: string) => {
    onItemSelect({ type: 'document', id: docId });
    addRecent({ type: 'pdf' as any, id: docId });
  };

  const handleFolderSelectWithRecent = (folderId: string | null) => {
    onFolderSelect(folderId);
    if (folderId) {
      addRecent({ type: 'folder', id: folderId });
    }
  };

  const getFolderPath = useCallback((folderId: string | null): string => {
    if (!folderId) return '';
    const path: string[] = [];
    let currentFolder = folders.find(f => f.id === folderId);
    while (currentFolder) {
      path.unshift(currentFolder.name);
      currentFolder = folders.find(f => f.id === currentFolder.parentId);
    }
    return path.join(' / ');
  }, [folders]);

  const selectedFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    return folders.find(f => (f.id ?? (f as any).folderId) === selectedFolderId) || null;
  }, [folders, selectedFolderId]);

  const selectedDocument = useMemo(() => {
    if (!selectedDocumentId) return null;
    return documents.find(d => (d.id || (d as any).documentId) === selectedDocumentId) || null;
  }, [documents, selectedDocumentId]);

  const folderCards = useMemo(() => {
    if (!selectedFolderId) return [];
    return cards.filter((c) => {
      const fid = c.folderId ?? (c as any).folder_id;
      if (fid !== selectedFolderId) return false;
      const isDeleted = c.isDeleted ?? (c as any).is_deleted;
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
      const isDraft = card.isDraft ?? (card as any).is_draft;
      if (!isDraft) {
        const reviewDate = toDate(card.nextReviewDate ?? (card as any).next_review_date);
        if (reviewDate) {
          const rDate = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
          if (autoCarryOver ? rDate <= tDate : rDate.getTime() === tDate.getTime()) {
            dueCount += 1;
          }
        }
      }

      const reviewCount = card.reviewCount ?? (card as any).review_count ?? 0;
      if (!isDraft && reviewCount === 0) {
        unlearnedCount += 1;
      }

      const lastReview = toDate(card.lastReviewAt ?? (card as any).last_review_at);
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

  const handleCreateCardQuick = useCallback(async () => {
    if (!selectedFolderId) return;
    try {
      const createdCard = await createCard({ folderId: selectedFolderId, title: '' });
      const createdCardId = createdCard?.id ?? createdCard?.cardId ?? null;
      if (!createdCardId) return;
      handleCardSelectWithRecent(createdCardId);
    } catch (error) {
      console.error('[TreeViewLayout] Failed to create card from dashboard action:', error);
    }
  }, [createCard, handleCardSelectWithRecent, selectedFolderId]);

  const handleBulkCreate = useCallback(() => {
    if (!selectedFolderId) return;
    navigate(createPageUrl(`CardEdit?folderId=${selectedFolderId}&mode=continuous`));
  }, [navigate, selectedFolderId]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    cards.forEach((c) => c.tags?.forEach((t: string) => tags.add(t)));
    return Array.from(tags).sort();
  }, [cards]);

  const handleCreateRootFolder = useCallback(async () => {
    try {
      await createFolder('新規フォルダ');
    } catch (error) {
      console.error('[TreeViewLayout] Failed to create root folder from tabs:', error);
    }
  }, [createFolder]);

  const isFilterTargetTab = explorerTab === 'explorer';
  const isFilterActive = isFilterTargetTab && tagFilter.length > 0;

  const { filteredCards, isFiltering } = useMemo(() => {
    const active = tagFilter.length > 0 && isFilterTargetTab;
    if (!active) return { filteredCards: cards, isFiltering: false };

    const filtered = cards.filter((card) => {
      if (!card.tags || card.tags.length === 0) return false;
      const cardTags = new Set(card.tags);
      if (tagMatchMode === 'any') return tagFilter.some((t) => cardTags.has(t));
      return tagFilter.every((t) => cardTags.has(t));
    });

    return { filteredCards: filtered, isFiltering: true };
  }, [cards, tagFilter, tagMatchMode, isFilterTargetTab]);

  const matchModeLabel = useMemo(() => {
    return tagMatchMode === 'any' ? 'どれか一致（OR）' : '全部一致（AND）';
  }, [tagMatchMode]);

  const renderFilterChips = () => {
    if (!isFilterActive) return null;

    const resultCount = filteredCards.length;

    return (
      <div className="px-2 py-2 bg-slate-50/60 border-b border-slate-100">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="min-w-0 flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600 shrink-0">絞り込み中</span>
            <span className="text-[11px] text-slate-500 truncate">
              {matchModeLabel}
              <span className="mx-1 text-slate-300">•</span>
              結果 {resultCount} 件
            </span>
            {resultCount === 0 && <span className="text-[11px] text-rose-500/90 shrink-0">一致なし</span>}
          </div>

          <button
            type="button"
            onClick={clearTagFilter}
            className="shrink-0 text-[11px] px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
          >
            クリア
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {tagFilter.map((tag) => (
            <TagBadge
              key={tag}
              label={tag}
              size="sm"
              colorClass={getTagColor(tag)}
              className="max-w-[180px]"
              title={tag}
              onRemove={() => toggleTag(tag)}
              removeAriaLabel={`${tag}を削除`}
            />
          ))}
        </div>

        <div className="mt-1 text-[11px] text-slate-400 leading-4">
          {tagMatchMode === 'any'
            ? '選んだタグのどれかが付いているカードを表示します。'
            : '選んだタグがすべて付いているカードだけ表示します。'}
        </div>
      </div>
    );
  };

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
      case 'favorites':
        return (
          <FavoritesPanel
            favorites={favorites}
            folders={folders}
            cards={cards}
            documents={documents}
            onFolderSelect={handleFolderSelectWithRecent}
            onItemSelect={onItemSelect}
            onRemoveFavorite={removeFavorite}
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
      case 'trash':
        return (
          <div className="p-4">
            <button
              type="button"
              onClick={() => navigate(createPageUrl('Trash'))}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ごみ箱を開く
            </button>
          </div>
        );
      case 'explorer':
      default:
        return (
          <div className="block">
            <FolderTreeWithCards
              folders={folders}
              cards={filteredCards}
              documents={documents}
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
              reorderCards={reorderCards}
              favorites={favorites}
              onAddFavorite={addFavorite}
              onRemoveFavorite={removeFavorite}
              isFiltering={isFiltering}
            />
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 items-stretch overflow-hidden border-0 bg-transparent md:border-r md:border-slate-200 md:bg-white",
        isResizing && "select-none cursor-col-resize"
      )}
    >
      <div
        ref={sidebarRef}
        className={cn(
          "shrink-0 flex-col bg-[#F8FAFB] md:bg-[#F8FAFB] border-r-0 md:border-r border-sidebar-border relative group/sidebar select-none overflow-hidden will-change-[width] font-serif",
          showMobileDetail ? "hidden md:flex" : "flex",
          "md:ring-1 md:ring-black/5 md:shadow-[inset_0_1px_0_rgba(255,255,255,0.75),inset_-1px_0_0_rgba(255,255,255,0.5),10px_0_24px_-20px_rgba(15,23,42,0.35)]",
          isResizing ? "transition-none" : "transition-all duration-300 ease-in-out",
          "w-[100dvw] max-w-[100dvw] md:w-auto md:max-w-none",
          !isSidebarOpen && "md:w-0 md:border-r-0 md:overflow-hidden"
        )}
      >
        <div className={cn(
            "flex flex-col h-full w-full font-serif",
             "bg-[#F8FAFB] md:bg-[#F8FAFB]"
        )}>
            {/* ExplorerTabs: 常にSticky表示 */}
            <div 
              className={cn(
                "sticky top-0 z-10 bg-[#F8FAFB] md:bg-[#F8FAFB]",
                "transition-all duration-200 ease-out",
                "motion-reduce:transition-none",
                // "md:relative" // デスクトップでもStickyで良いが、元々 relative だったなら戻しても良い。
                // 今回はモバイルでの Sticky 化が主眼。
                // 元のコードでは md:relative だったのでそれは維持しつつ、
                // モバイルでの hidden/max-h-0 を削除する。
                "md:relative"
              )}
            >
              <ExplorerTabs
                activeTab={explorerTab}
                onTabChange={setExplorerTab}
                allTags={allTags}
                onCreateRootFolder={handleCreateRootFolder}
                showExplorerActions={explorerTab === 'explorer'}
              />
            </div>

            {renderFilterChips()}

            <div 
              ref={contentScrollRef}
              className="flex-1 overflow-y-auto outline-none min-w-0"
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

      {/* 右ペイン: モバイルでは非表示 */}
      <div className={cn(
        "flex-1 min-h-0 min-w-0 bg-white flex-col overflow-hidden",
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
            <span className="text-sm font-semibold text-slate-700">フォルダ</span>
          </div>
        )}
        <RightPane
          selectedCardId={selectedCardId}
          selectedDocument={selectedDocument}
          selectedFolderId={selectedFolderId}
          selectedFolderName={selectedFolder?.folderName ?? (selectedFolder as any)?.folder_name ?? 'フォルダ'}
          folderCards={folderCards}
          folderStats={folderStats}
          onCardUpdated={onCardUpdated}
          onDocumentUpdated={updateDocument}
          handlers={{
            onStartStudy: handleStartStudy,
            onViewCards: handleViewCards,
            onCreateCard: handleCreateCardQuick,
            onBulkCreate: handleBulkCreate,
          }}
        />
      </div>
    </div>
  );
}

export default TreeViewLayout;
