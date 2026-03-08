import { useCards } from "@/hooks/card/useCards";
import { useExplorerStore } from "@/hooks/folder/useExplorerStore";
import { useFolders } from "@/hooks/folder/useFolders";
import { useDocuments } from "@/hooks/platform/useDocuments";
import { resolveCardTagNames, useTags } from "@/hooks/settings/useTags";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import { cn } from "@/lib/utils";
import type { Card, DocumentItem, Folder, SelectedExplorerItem } from "@/types";
import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TreeViewDialogs } from "./components/TreeViewDialogs";
import { TreeViewMainPane } from "./components/TreeViewMainPane";
import { TreeViewSidebar } from "./components/TreeViewSidebar";
import { TreeViewTabContent } from "./components/TreeViewTabContent";
import { useTreeViewActions } from "./hooks/useTreeViewActions";
import { useTreeViewDerivedState } from "./hooks/useTreeViewDerivedState";
import { useTreeViewFilters } from "./hooks/useTreeViewFilters";
import { useTreeViewSidebar } from "./hooks/useTreeViewSidebar";
import {
  ACTIVE_VIEW_KINDS,
  DEFAULT_FOLDER_VIEW,
  buildVirtualTree,
  createViewId,
  type ViewDef,
  type ViewKind,
} from "./viewTypes";

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
  navigateToSectionListToken?: number;
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
  navigateToSectionListToken = 0,
}: TreeViewLayoutProps) {
  const navigate = useNavigate();
  const { settings, updateSettings } = useUserSettings();
  const { createFolder, updateFolder, deleteFolder } = useFolders();
  const { createCard, updateCard, deleteCard, moveCardToFolder, reorderCards } =
    useCards();
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

  const {
    getFolderPath,
    selectedFolder,
    selectedDocument,
    mobileDetailTitle,
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

  const allTags = useMemo(() => {
    const tagNames = new Set<string>();
    cards.forEach((c) => {
      resolveCardTagNames(c.tagIds, c.tags, tagById).forEach((t) =>
        tagNames.add(t),
      );
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
  }, []);

  const {
    isFilterTargetTab,
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
      navigateToSectionListToken={navigateToSectionListToken}
      getFolderPath={getFolderPath}
      onFolderSelect={handleFolderSelectWithRecent}
      onItemSelect={onItemSelect}
      onClearRecent={clearRecent}
      onSelectView={handleViewChange}
      onOpenManager={() => setIsViewManagerOpen(true)}
      onCreateFolder={createFolder}
      onUpdateFolder={updateFolder}
      onDeleteFolder={deleteFolder}
      onCreateCard={createCard}
      onUpdateCard={updateCard}
      onDeleteCard={deleteCard}
      moveCardToFolder={moveCardToFolder}
      moveDocumentToFolder={(id, folderId) => updateDocument(id, { folderId })}
      reorderCards={reorderCards}
      onPinItem={pinItem}
      onUnpinItem={unpinItem}
    />
  );
  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 items-stretch overflow-hidden border-0 bg-transparent",
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
        onStartResizing={startResizing}
      >
        {tabContent}
      </TreeViewSidebar>

      <TreeViewMainPane
        isMobile={isMobile}
        showMobileDetail={showMobileDetail}
        mobileDetailTitle={mobileDetailTitle}
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
        onItemSelect={onItemSelect}
        onFolderSelect={onFolderSelect}
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
      />    </div>
  );
}

export default TreeViewLayout;
