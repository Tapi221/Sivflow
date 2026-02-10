import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderTreeWithCards } from './FolderTreeWithCards';
import { RightPane } from './RightPane';
import { ExplorerTabs } from '../explorer/ExplorerTabs';
import { FavoritesPanel } from '../explorer/FavoritesPanel';
import { RecentPanel } from '../explorer/RecentPanel';
import { InboxPanel } from '../explorer/InboxPanel';
import { cn } from '@/lib/utils';
import { useFolders } from '@/hooks/useFolders';
import { useDocuments } from '@/hooks/useDocuments';
import { Folder, FileText, Bookmark, Clock, Inbox, Filter } from 'lucide-react';
import type { Card, DocumentItem, SelectedExplorerItem } from '@/types';
import { useCards } from '@/hooks/useCards';
import { useExplorerStore } from '@/hooks/useExplorerStore';
import { X } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useUserSettings } from '@/hooks/useUserSettings';

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

  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWRef = useRef(0);
  const pendingWRef = useRef(sidebarWidth);
  const rafIdRef = useRef<number | null>(null);

  const clamp = (w: number) => Math.min(Math.max(w, MIN_SIDEBAR_W), MAX_SIDEBAR_W);

  const applyWidthDom = useCallback(
    (w: number) => {
      pendingWRef.current = clamp(w);

      if (rafIdRef.current != null) return;
      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null;
        const el = sidebarRef.current;
        if (!el) return;
        el.style.width = isSidebarOpen ? `${pendingWRef.current}px` : '0px';
      });
    },
    [isSidebarOpen]
  );

  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    el.style.width = isSidebarOpen ? `${sidebarWidth}px` : '0px';
    pendingWRef.current = sidebarWidth;
  }, [sidebarWidth, isSidebarOpen]);

  const handleCardSelectWithRecent = (cardId: string) => {
    onItemSelect({ type: 'card', id: cardId });
    addRecent({ type: 'card', id: cardId, ts: Date.now() });
  };

  const handleDocumentSelectWithRecent = (docId: string) => {
    onItemSelect({ type: 'document', id: docId });
    addRecent({ type: 'pdf' as any, id: docId, ts: Date.now() });
  };

  const handleFolderSelectWithRecent = (folderId: string | null) => {
    onFolderSelect(folderId);
    if (folderId) {
      addRecent({ type: 'folder', id: folderId, ts: Date.now() });
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

  const handleCreateCardQuick = useCallback(() => {
    if (!selectedFolderId) return;
    navigate(createPageUrl(`CardEdit?folderId=${selectedFolderId}`));
  }, [navigate, selectedFolderId]);

  const handleBulkCreate = useCallback(() => {
    if (!selectedFolderId) return;
    navigate(createPageUrl(`FolderView?id=${selectedFolderId}&openCreationMode=1`));
  }, [navigate, selectedFolderId]);

  const recentFolderIds = useMemo(() => {
    return recent.filter((r) => r.type === 'folder').map((r) => r.id).slice(0, 5);
  }, [recent]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    cards.forEach((c) => c.tags?.forEach((t: string) => tags.add(t)));
    return Array.from(tags).sort();
  }, [cards]);

  const isFilterTargetTab = explorerTab === 'explorer' || explorerTab === 'inbox';
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

        {/* ここが“デカすぎ問題”の修正ポイント */}
        <div className="flex flex-wrap gap-1">
          {tagFilter.map((tag) => (
            <span
              key={tag}
              className={cn(
                "inline-flex items-center max-w-full",
                "px-1.5 py-0.5 rounded-full text-[11px] leading-4",
                "bg-primary-100 text-primary-700 border border-primary-200"
              )}
              title={`#${tag}`}
            >
              <span className="truncate max-w-[140px]">#{tag}</span>
              <button
                type="button"
                aria-label={`${tag}を削除`}
                onClick={() => toggleTag(tag)}
                className="ml-1 grid place-items-center rounded-full text-primary-600 hover:text-primary-800 hover:bg-primary-200/60 w-4 h-4 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
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
            onCardSelect={handleCardSelectWithRecent}
            onDocumentSelect={handleDocumentSelectWithRecent}
            onClearRecent={clearRecent}
          />
        );
      case 'inbox':
        return (
          <InboxPanel
            cards={filteredCards}
            folders={folders}
            onCardSelect={handleCardSelectWithRecent}
            onMoveCard={moveCardToFolder}
            recentFolderIds={recentFolderIds}
          />
        );
      case 'explorer':
      default:
        return (
          <div className="hidden md:block">
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

  // NOTE:
  // 100dvh から固定オフセットを引くのは、Folders ページの上部固定領域
  // （ヘッダカード + 余白 + モバイル/デスクトップ差分）を差し引いて
  // 作業ペイン全体を 1 つのビューポートに収めるため。
  // 将来的には上位レイアウトの `h-screen + flex` へ移行し、この calc 依存を減らす。
  return (
    <div
      className={cn(
        "flex min-h-0 h-[calc(100dvh-288px)] md:h-[calc(100dvh-152px)] items-stretch border border-slate-200 rounded-xl shadow-sm bg-white overflow-hidden relative",
        isResizing && "select-none cursor-col-resize"
      )}
    >
      <div
        ref={sidebarRef}
        className={cn(
          "shrink-0 flex flex-col bg-white border-r border-slate-200 relative group/sidebar select-none overflow-hidden will-change-[width]",
          isResizing ? "transition-none" : "transition-all duration-300 ease-in-out",
          !isSidebarOpen && "w-0 border-r-0 overflow-hidden"
        )}
        style={{ width: isSidebarOpen ? `${sidebarWidth}px` : '0px' }}
      >
        <ExplorerTabs activeTab={explorerTab} onTabChange={setExplorerTab} allTags={allTags} />

        {renderFilterChips()}

        <div className="flex-1 overflow-y-auto outline-none min-w-[200px]">{renderTabContent()}</div>

        {isSidebarOpen && (
          <div
            className={cn(
              "absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-50 hover:bg-primary-600/10 transition-colors",
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

      <div className="flex-1 min-h-0 min-w-0 bg-white flex flex-col overflow-hidden">
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
            onCreateCard: handleCreateCardQuick,
            onBulkCreate: handleBulkCreate,
          }}
        />
      </div>
    </div>
  );
}

export default TreeViewLayout;
