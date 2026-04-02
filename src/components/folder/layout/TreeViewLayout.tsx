import { useCards } from "@/hooks/card/useCards";
import { useCardSets } from "@/hooks/cardSet/useCardSets";
import { useExplorerStore } from "@/hooks/folder/useExplorerStore";
import { useFolders } from "@/hooks/folder/useFolders";
import { useDocuments } from "@/hooks/platform/useDocuments";
import { resolveCardTagNames, useTags } from "@/hooks/settings/useTags";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import { cn } from "@/lib/utils";
import type { Card, DocumentItem, Folder, SelectedExplorerItem } from "@/types";
import { createPageUrl } from "@/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { TreeViewDialogs } from "@/components/folder/components/TreeViewDialogs";
import { TreeViewMainPane } from "@/components/folder/components/TreeViewMainPane";
import { TreeViewSidebar } from "@/components/folder/components/TreeViewSidebar";
import { TreeViewTabContent } from "@/components/folder/components/TreeViewTabContent";

import { useTreeViewActions } from "@/components/folder/hooks/useTreeViewActions";
import { useTreeViewDerivedState } from "@/components/folder/hooks/useTreeViewDerivedState";
import { useTreeViewFilters } from "@/components/folder/hooks/useTreeViewFilters";
import { useTreeViewSidebar } from "@/components/folder/hooks/useTreeViewSidebar";

import {
  ACTIVE_VIEW_KINDS,
  DEFAULT_FOLDER_VIEW,
  buildVirtualTree,
  createViewId,
  type ViewDef,
  type ViewKind,
} from "@/components/folder/types/viewTypes";

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
  onFolderContextChange?: (folderId: string | null) => void;
  onCardSetContextChange?: (
    cardSet: { id: string; label: string } | null,
  ) => void;
  navigateToSectionListToken?: number;
  folderSelectionNonce?: number;
}

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
  onFolderContextChange,
  onCardSetContextChange,
  navigateToSectionListToken = 0,
  folderSelectionNonce = 0,
}: TreeViewLayoutProps) {
  const navigate = useNavigate();
  const { settings, updateSettings } = useUserSettings();
  const { createFolder, updateFolder, deleteFolder } = useFolders();
  const { createCard, updateCard, deleteCard, moveCardToFolder, reorderCards } =
    useCards();

  const [selectedCardSetId, setSelectedCardSetId] = useState<string | null>(null);
  const [selectedCardSetLabel, setSelectedCardSetLabel] = useState<string | null>(null);
  const [createCardSetRequestToken, setCreateCardSetRequestToken] = useState(0);
  const [explorerHeaderFolderId, setExplorerHeaderFolderId] = useState<string | null>(
    null,
  );

  const {
    cardSets,
    createCardSet,
    updateCardSet,
    deleteCardSet,
    moveCardSetToFolder,
  } = useCardSets();

  const handleItemSelect = useCallback(
    (item: SelectedExplorerItem) => {
      if (item?.type === "cardSet") {
        const cs = cardSets.find((s) => s.id === item.id);
        if (cs) {
          onFolderSelect(cs.folderId ?? null);
          setSelectedCardSetId(item.id);
          setSelectedCardSetLabel(cs.name || "無題のセット");

          const query = new URLSearchParams();
          query.set("cardSetId", item.id);
          if (cs.folderId) query.set("folderId", cs.folderId);

          navigate(createPageUrl(`CardView?${query.toString()}`));
        }
        return;
      }

      setSelectedCardSetId(null);
      setSelectedCardSetLabel(null);
      onItemSelect(item);
    },
    [cardSets, navigate, onFolderSelect, onItemSelect],
  );

  const { updateDocument } = useDocuments();
  const { getTagColor, getCategoryName, listCategoryIdsInUse, tagById, tags } =
    useTags();

  const {
    sidebarRef,
    contentScrollRef,
    isSidebarOpen,
    isMobile,
    isResizing,
    startResizing,
  } = useTreeViewSidebar();

  useEffect(() => {
    const scroller = contentScrollRef.current;
    if (!scroller) return;
    scroller.scrollTop = 0;
  }, [contentScrollRef, selectedFolderId, navigateToSectionListToken]);

  const {
    getFolderPath,
    selectedFolder,
    selectedDocument,
    folderCards,
    folderStats,
    showMobileDetail,
  } = useTreeViewDerivedState({
    folders,
    cards,
    documents,
    selectedFolderId,
    selectedItem,
    selectedCardId,
    selectedDocumentId,
    autoCarryOver: settings?.autoCarryOver ?? true,
    isMobile,
  });

  const explorerTab = useExplorerStore((s) => s.explorerTab);
  const setExplorerTab = useExplorerStore((s) => s.setExplorerTab);

  const pinnedItems = useExplorerStore((s) => s.pinnedItems);
  const pinItem = useExplorerStore((s) => s.pinItem);
  const unpinItem = useExplorerStore((s) => s.unpinItem);

  const recent = useExplorerStore((s) => s.recent);
  const addRecent = useExplorerStore((s) => s.addRecent);
  const clearRecent = useExplorerStore((s) => s.clearRecent);

  const tagFilter = useExplorerStore((s) => s.tagFilter);
  const tagMatchMode = useExplorerStore((s) => s.tagMatchMode);
  const uncertaintyFilter = useExplorerStore((s) => s.uncertaintyFilter);
  const bookmarkedFilter = useExplorerStore((s) => s.bookmarkedFilter);
  const draftFilter = useExplorerStore((s) => s.draftFilter);
  const contentTypeFilter = useExplorerStore((s) => s.contentTypeFilter);

  useEffect(() => {
    if (explorerTab === "inbox") {
      setExplorerTab("explorer");
    }
  }, [explorerTab, setExplorerTab]);

  const {
    isCreateSelectionOpen,
    setIsCreateSelectionOpen,
    isModeSelectionOpen,
    setIsModeSelectionOpen,
    isViewManagerOpen,
    setIsViewManagerOpen,
    createFolderRequestToken,
    setCreateFolderRequestToken,
    handleFolderSelectWithRecent,
    handleStartStudy,
    handleViewCards,
    handleOpenCreateCard,
    handleSelectCreateMode,
    handleSelectDetailedMode,
  } = useTreeViewActions({
    navigate,
    selectedFolderId,
    onFolderSelect,
    addRecent,
  });

  const handleFolderSelect = useCallback(
    (folderId: string | null) => {
      setSelectedCardSetId(null);
      setSelectedCardSetLabel(null);
      handleFolderSelectWithRecent(folderId);
    },
    [handleFolderSelectWithRecent],
  );

  const handleCardSetSelectWithoutNavigation = useCallback(
    (cardSetId: string, folderId: string, label: string) => {
      onFolderSelect(folderId);
      setSelectedCardSetId(cardSetId);
      setSelectedCardSetLabel(label);
    },
    [onFolderSelect],
  );

  const allTags = useMemo(() => {
    const tagNames = new Set<string>();
    cards.forEach((c) => {
      resolveCardTagNames(c.tagIds, c.tags, tagById).forEach((t) => {
        tagNames.add(t);
      });
    });
    return Array.from(tagNames).sort();
  }, [cards, tagById]);

  const viewDefs = useMemo(() => {
    const storedViews = Array.isArray(settings?.explorerViews)
      ? settings.explorerViews
      : [];

    const validStoredViews = storedViews.filter((view): view is ViewDef =>
      ACTIVE_VIEW_KINDS.includes(view.kind as ViewKind),
    );

    const folderView =
      validStoredViews.find((view) => view.kind === "folder") ??
      DEFAULT_FOLDER_VIEW;

    return [
      folderView,
      ...validStoredViews.filter((view) => view.kind !== "folder"),
    ];
  }, [settings]);

  const selectedViewId = useMemo(() => {
    const savedViewId = settings?.selectedExplorerViewId;
    if (savedViewId && viewDefs.some((view) => view.id === savedViewId)) {
      return savedViewId;
    }
    return viewDefs[0]?.id ?? DEFAULT_FOLDER_VIEW.id;
  }, [settings?.selectedExplorerViewId, viewDefs]);

  const selectedView = useMemo(
    () =>
      viewDefs.find((view) => view.id === selectedViewId) ??
      DEFAULT_FOLDER_VIEW,
    [selectedViewId, viewDefs],
  );

  const customViews = useMemo(
    () => viewDefs.filter((view) => view.kind !== "folder"),
    [viewDefs],
  );

  const activeCustomView = useMemo(() => {
    if (selectedView.kind !== "folder") return selectedView;
    return customViews[0] ?? null;
  }, [customViews, selectedView]);

  const categoryIdsInUse = useMemo(
    () => listCategoryIdsInUse(),
    [listCategoryIdsInUse],
  );

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const categoryId of categoryIdsInUse) {
      map.set(categoryId, getCategoryName(categoryId));
    }
    return map;
  }, [categoryIdsInUse, getCategoryName]);

  const handleCreateRootFolder = useCallback(async () => {
    setCreateFolderRequestToken((prev) => prev + 1);
  }, [setCreateFolderRequestToken]);

  const pdfTriggerRef = useRef<(() => void) | null>(null);
  const pptxTriggerRef = useRef<(() => void) | null>(null);

  const currentHeaderFolderId = useMemo(() => {
    if (selectedFolderId) return selectedFolderId;
    if (explorerHeaderFolderId) return explorerHeaderFolderId;

    if (selectedItem?.type === "cardSet") {
      return cardSets.find((s) => s.id === selectedItem.id)?.folderId ?? null;
    }

    return null;
  }, [cardSets, explorerHeaderFolderId, selectedFolderId, selectedItem]);

  useEffect(() => {
    onFolderContextChange?.(currentHeaderFolderId);
  }, [currentHeaderFolderId, onFolderContextChange]);

  const currentCardSetLabel = useMemo(() => {
    if (!selectedCardSetId) return null;
    return (
      cardSets.find((cardSet) => cardSet.id === selectedCardSetId)?.name ??
      selectedCardSetLabel
    );
  }, [cardSets, selectedCardSetId, selectedCardSetLabel]);

  useEffect(() => {
    if (!selectedCardSetId || !currentCardSetLabel) {
      onCardSetContextChange?.(null);
      return;
    }
    onCardSetContextChange?.({
      id: selectedCardSetId,
      label: currentCardSetLabel,
    });
  }, [
    currentCardSetLabel,
    onCardSetContextChange,
    selectedCardSetId,
  ]);

  const handleCreateCardSetFromHeader = useCallback(() => {
    if (!currentHeaderFolderId) return;
    setCreateCardSetRequestToken((prev) => prev + 1);
  }, [currentHeaderFolderId]);

  const handleAddPdfFromHeader = useCallback(() => {
    if (!currentHeaderFolderId) return;
    pdfTriggerRef.current?.();
  }, [currentHeaderFolderId]);

  const handleAddPptxFromHeader = useCallback(() => {
    if (!currentHeaderFolderId) return;
    pptxTriggerRef.current?.();
  }, [currentHeaderFolderId]);

  const {
    isFilterActive,
    filteredCards,
    filteredDocuments,
    isFiltering,
  } = useTreeViewFilters({
    cards,
    documents,
    explorerTab,
    tagFilter,
    tagMatchMode,
    uncertaintyFilter,
    bookmarkedFilter,
    draftFilter,
    contentTypeFilter,
    tagById,
  });

  const virtualTreeNodes = useMemo(() => {
    if (!activeCustomView) return [];
    return buildVirtualTree(
      activeCustomView,
      filteredCards,
      tags,
      categoryNameById,
    );
  }, [activeCustomView, filteredCards, tags, categoryNameById]);

  const persistSettings = useCallback(
    async (patch: Partial<typeof settings>) => {
      await updateSettings(patch);
    },
    [updateSettings],
  );

  const handleViewChange = useCallback(
    async (viewId: string) => {
      await persistSettings({ selectedExplorerViewId: viewId });
      const nextView = viewDefs.find((view) => view.id === viewId);
      if (nextView && nextView.kind !== "folder") {
        onFolderSelect(null);
      }
    },
    [onFolderSelect, persistSettings, viewDefs],
  );

  const handleAddView = useCallback(
    async (kind: ViewKind) => {
      if (kind === "folder") return;

      const nextView: ViewDef = {
        id: createViewId(),
        name: kind === "tagCategory" ? "新しいタグビュー" : "新しいタグツリー",
        kind,
        options:
          kind === "tagCategory"
            ? { categoryMode: "user-defined", ungroupedLabel: "未分類" }
            : {
                scopeMode: "all",
                hideZeroUsage: true,
                ungroupedLabel: "未分類",
              },
      };

      await persistSettings({
        explorerViews: [...viewDefs, nextView],
        selectedExplorerViewId: nextView.id,
      });
    },
    [persistSettings, viewDefs],
  );

  const handleRenameView = useCallback(
    async (viewId: string, name: string) => {
      await persistSettings({
        explorerViews: viewDefs.map((view) =>
          view.id === viewId ? { ...view, name } : view,
        ),
      });
    },
    [persistSettings, viewDefs],
  );

  const handleDeleteView = useCallback(
    async (viewId: string) => {
      const nextViews = viewDefs.filter((view) => view.id !== viewId);
      await persistSettings({
        explorerViews: nextViews,
        selectedExplorerViewId:
          selectedViewId === viewId ? DEFAULT_FOLDER_VIEW.id : selectedViewId,
      });
    },
    [persistSettings, selectedViewId, viewDefs],
  );

  const handleUpdateCategoryName = useCallback(
    async (categoryId: string, displayName: string) => {
      await updateSettings({
        tagCategoryDisplayNames: {
          ...(settings?.tagCategoryDisplayNames ?? {}),
          [categoryId]: displayName,
        },
      });
    },
    [settings?.tagCategoryDisplayNames, updateSettings],
  );

  const handleUpdateUngroupedLabel = useCallback(
    async (viewId: string, label: string) => {
      await persistSettings({
        explorerViews: viewDefs.map((view) =>
          view.id === viewId
            ? {
                ...view,
                options: {
                  ...view.options,
                  ungroupedLabel: label,
                },
              }
            : view,
        ),
      });
    },
    [persistSettings, viewDefs],
  );

  const handleUpdateViewOptions = useCallback(
    async (viewId: string, options: NonNullable<ViewDef["options"]>) => {
      await persistSettings({
        explorerViews: viewDefs.map((view) =>
          view.id === viewId
            ? {
                ...view,
                options,
              }
            : view,
        ),
      });
    },
    [persistSettings, viewDefs],
  );

  const tabContent = (
    <TreeViewTabContent
      explorerTab={explorerTab}
      pinnedItems={pinnedItems}
      recent={recent}
      folders={folders}
      cards={cards}
      cardSets={cardSets}
      documents={documents}
      filteredCards={filteredCards}
      filteredDocuments={filteredDocuments}
      selectedFolderId={selectedFolderId}
      selectedItem={selectedItem}
      activeCustomView={activeCustomView}
      customViews={customViews}
      virtualTreeNodes={virtualTreeNodes}
      isFiltering={isFiltering}
      createFolderRequestToken={createFolderRequestToken}
      createCardSetRequestToken={createCardSetRequestToken}
      onRegisterPdfTrigger={(fn) => {
        pdfTriggerRef.current = fn;
      }}
      onRegisterPptxTrigger={(fn) => {
        pptxTriggerRef.current = fn;
      }}
      navigateToSectionListToken={navigateToSectionListToken}
      folderSelectionNonce={folderSelectionNonce}
      onHeaderFolderIdChange={setExplorerHeaderFolderId}
      getFolderPath={getFolderPath}
      onFolderSelect={handleFolderSelect}
      onItemSelect={handleItemSelect}
      onClearRecent={clearRecent}
      onSelectView={handleViewChange}
      onOpenManager={() => setIsViewManagerOpen(true)}
      onCreateFolder={createFolder}
      onUpdateFolder={updateFolder}
      onDeleteFolder={deleteFolder}
      onCreateCardSet={createCardSet}
      onUpdateCardSet={updateCardSet}
      onDeleteCardSet={deleteCardSet}
      onCreateCard={createCard}
      onUpdateCard={updateCard}
      onDeleteCard={deleteCard}
      moveCardToFolder={moveCardToFolder}
      moveCardSetToFolder={moveCardSetToFolder}
      moveDocumentToFolder={(id, folderId) => updateDocument(id, { folderId })}
      reorderCards={reorderCards}
      onPinItem={pinItem}
      onUnpinItem={unpinItem}
      selectedCardSetId={selectedCardSetId}
      onSelectCardSet={handleCardSetSelectWithoutNavigation}
    />
  );

  const canCreateCardSet = Boolean(currentHeaderFolderId);
  const canAddDocuments = Boolean(currentHeaderFolderId);

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 w-full items-stretch overflow-hidden border-0 bg-transparent",
        isResizing && "select-none cursor-col-resize",
      )}
    >
      <TreeViewSidebar
        sidebarRef={sidebarRef}
        contentScrollRef={contentScrollRef}
        isSidebarOpen={isSidebarOpen}
        isResizing={isResizing}
        showMobileDetail={showMobileDetail}
        explorerTab={explorerTab}
        setExplorerTab={setExplorerTab}
        allTags={allTags}
        getTagColor={getTagColor}
        isFilterActive={isFilterActive}
        resultCount={filteredCards.length + filteredDocuments.length}
        onCreateRootFolder={handleCreateRootFolder}
        onCreateCardSet={handleCreateCardSetFromHeader}
        onAddPdf={handleAddPdfFromHeader}
        onAddPptx={handleAddPptxFromHeader}
        onStartResizing={startResizing}
        canCreateCardSet={canCreateCardSet}
        canAddDocuments={canAddDocuments}
      >
        {tabContent}
      </TreeViewSidebar>

      <TreeViewMainPane
        isMobile={isMobile}
        showMobileDetail={showMobileDetail}
        selectedItem={selectedItem}
        selectedCardId={selectedCardId}
        selectedDocument={selectedDocument}
        selectedFolderId={selectedFolderId}
        selectedFolderName={selectedFolder?.folderName ?? "フォルダ"}
        folders={folders}
        cards={cards}
        documents={documents}
        folderCards={folderCards}
        folderStats={folderStats}
        onCardUpdated={onCardUpdated}
        onDocumentUpdated={updateDocument}
        onRenameFolder={async (folderId, newName) => {
          await updateFolder(folderId, { folderName: newName });
        }}
        handlers={{
          onStartStudy: handleStartStudy,
          onViewCards: handleViewCards,
          onCreateCard: handleOpenCreateCard,
        }}
        folderSelectionNonce={folderSelectionNonce}
      />

      <TreeViewDialogs
        isCreateSelectionOpen={isCreateSelectionOpen}
        setIsCreateSelectionOpen={setIsCreateSelectionOpen}
        isModeSelectionOpen={isModeSelectionOpen}
        setIsModeSelectionOpen={setIsModeSelectionOpen}
        isViewManagerOpen={isViewManagerOpen}
        setIsViewManagerOpen={setIsViewManagerOpen}
        onSelectCreateMode={handleSelectCreateMode}
        onSelectDetailedMode={handleSelectDetailedMode}
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
