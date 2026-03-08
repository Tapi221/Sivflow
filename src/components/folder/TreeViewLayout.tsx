import CreateCardSelectionDialog from "@/components/card/overlays/CreateCardSelectionDialog";
import CreationModeDialog from "@/components/card/overlays/CreationModeDialog";
import { PinnedPanel } from "@/components/explorer/PinnedPanel";
import { RecentPanel } from "@/components/explorer/RecentPanel";
import { useCards } from "@/hooks/card/useCards";
import { useExplorerStore } from "@/hooks/folder/useExplorerStore";
import { useFolders } from "@/hooks/folder/useFolders";
import { useDocuments } from "@/hooks/platform/useDocuments";
import { resolveCardTagNames, useTags } from "@/hooks/settings/useTags";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import { cn } from "@/lib/utils";
import type { Card, DocumentItem, Folder, SelectedExplorerItem } from "@/types";
import { createPageUrl } from "@/utils";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TreeViewMainPane } from "./components/TreeViewMainPane";
import { TreeViewSidebar } from "./components/TreeViewSidebar";
import { FolderTreeWithCards } from "./FolderTreeWithCards";
import { ViewManagerDialog } from "./ViewManagerDialog";
import { ViewsPanel } from "./ViewsPanel";
import { useTreeViewDerivedState } from "./hooks/useTreeViewDerivedState";
import { useTreeViewSidebar } from "./hooks/useTreeViewSidebar";
import { buildVirtualTree, type ViewDef, type ViewKind } from "./viewTypes";

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

const DEFAULT_FOLDER_VIEW: ViewDef = {
  id: "folder-default",
  name: "フォルダ",
  kind: "folder",
};

const ACTIVE_VIEW_KINDS: ViewKind[] = ["folder", "tagCategory", "tagTree"];

const createViewId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `view-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

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

  const [isCreateSelectionOpen, setIsCreateSelectionOpen] = useState(false);
  const [isModeSelectionOpen, setIsModeSelectionOpen] = useState(false);
  const [isViewManagerOpen, setIsViewManagerOpen] = useState(false);
  const [createFolderRequestToken, setCreateFolderRequestToken] = useState(0);

  const handleFolderSelectWithRecent = (folderId: string | null) => {
    onFolderSelect(folderId);
    if (folderId) {
      addRecent({ type: "folder", id: folderId });
    }
  };

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
    (mode: "single" | "continuous") => {
      if (!selectedFolderId) return;
      setIsCreateSelectionOpen(false);
      if (mode === "single") {
        navigate(createPageUrl(`CardEdit?folderId=${selectedFolderId}`));
        return;
      }
      setIsModeSelectionOpen(true);
    },
    [navigate, selectedFolderId],
  );

  const handleSelectDetailedMode = useCallback(
    (mode: string, options?: { hideTitle?: boolean }) => {
      if (!selectedFolderId) return;
      setIsModeSelectionOpen(false);

      if (mode === "qa") {
        const hideTitle = options?.hideTitle ? "&hideTitle=true" : "";
        navigate(
          createPageUrl(`one-qa-mode?folderId=${selectedFolderId}${hideTitle}`),
        );
        return;
      }
      if (mode === "pair") {
        navigate(createPageUrl(`pair-mode?folderId=${selectedFolderId}`));
        return;
      }
      if (mode === "choice") {
        navigate(
          createPageUrl(`four-choice-mode?folderId=${selectedFolderId}`),
        );
        return;
      }
      navigate(
        createPageUrl(`create-mode/placeholder?folderId=${selectedFolderId}`),
      );
    },
    [navigate, selectedFolderId],
  );

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

  const isFilterTargetTab = explorerTab === "explorer";
  const isFilterActive =
    isFilterTargetTab &&
    (tagFilter.length > 0 ||
      uncertaintyFilter !== "any" ||
      bookmarkedFilter !== "any" ||
      draftFilter !== "any" ||
      contentTypeFilter.length < 3);

  const { filteredCards, filteredDocuments, isFiltering } = useMemo(() => {
    const active =
      isFilterTargetTab &&
      (tagFilter.length > 0 ||
        uncertaintyFilter !== "any" ||
        bookmarkedFilter !== "any" ||
        draftFilter !== "any" ||
        contentTypeFilter.length < 3);

    if (!active) {
      return {
        filteredCards: cards,
        filteredDocuments: documents,
        isFiltering: false,
      };
    }

    const allowCards = contentTypeFilter.includes("card");
    const allowPdf = contentTypeFilter.includes("pdf");
    const allowPptx = contentTypeFilter.includes("pptx");

    const filtered = cards.filter((card) => {
      if (!allowCards) return false;

      if (tagFilter.length > 0) {
        const resolvedNames = resolveCardTagNames(
          card.tagIds,
          card.tags,
          tagById,
        );
        if (resolvedNames.length === 0) return false;

        const cardTagSet = new Set(resolvedNames);
        const tagMatched =
          tagMatchMode === "any"
            ? tagFilter.some((t) => cardTagSet.has(t))
            : tagFilter.every((t) => cardTagSet.has(t));

        if (!tagMatched) return false;
      }

      const hasUncertainty = Boolean(
        card.hasUncertainty ?? card.hasUncertainty,
      );
      const isBookmarked = Boolean(card.isBookmarked ?? card.isBookmarked);
      const isDraft = Boolean(card.isDraft ?? card.isDraft);

      if (uncertaintyFilter === "on" && !hasUncertainty) return false;
      if (uncertaintyFilter === "off" && hasUncertainty) return false;
      if (bookmarkedFilter === "on" && !isBookmarked) return false;
      if (bookmarkedFilter === "off" && isBookmarked) return false;
      if (draftFilter === "on" && !isDraft) return false;
      if (draftFilter === "off" && isDraft) return false;

      return true;
    });

    const nextDocuments = documents.filter((document) => {
      if (document.isDeleted) return false;
      if (document.kind === "pdf") return allowPdf;
      if (document.kind === "pptx") return allowPptx;
      return false;
    });

    return {
      filteredCards: filtered,
      filteredDocuments: nextDocuments,
      isFiltering: true,
    };
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

  const renderTabContent = () => {
    switch (explorerTab) {
      case "pinned":
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

      case "recent":
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

      case "views":
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

      case "explorer":
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
            moveDocumentToFolder={(id, folderId) =>
              updateDocument(id, { folderId })
            }
            reorderCards={reorderCards}
            pinnedItems={pinnedItems}
            onPinItem={pinItem}
            onUnpinItem={unpinItem}
            isFiltering={isFiltering}
            createFolderRequestToken={createFolderRequestToken}
            navigateToSectionListToken={navigateToSectionListToken}
          />
        );
    }
  };

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
        {renderTabContent()}
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