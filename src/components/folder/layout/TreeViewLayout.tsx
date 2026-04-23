import { useToast } from "@/contexts/ToastContext";
import type { ExplorerBreadcrumbContext } from "@/features/breadcrumbs/types";
import { XlsxImportDialog } from "@/features/import/presentation/web/XlsxImportDialog";
import { useCardCommands } from "@/hooks/card/useCardCommands";
import { useCardsRead } from "@/hooks/card/useCardsRead";
import { useCardSets } from "@/hooks/cardSet/useCardSets";
import { useExplorerStore } from "@/hooks/folder/useExplorerStore";
import { useFolderCommands } from "@/hooks/folder/useFolderCommands";
import { useDocumentCommands } from "@/hooks/platform/useDocumentCommands";
import { useDocumentsRead } from "@/hooks/platform/useDocumentsRead";
import { resolveCardTagNames, useTags } from "@/hooks/settings/useTags";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import { cn } from "@/lib/utils";
import {
  createAppDestination,
  createPageUrl,
} from "@/platform/web/navigation/toWebPath";
import type {
  CardSet,
  DocumentItem,
  Folder,
  SelectedExplorerItem,
} from "@/types";
import type { ComponentProps } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import { TreeViewMainPane } from "@/components/folder/components/TreeViewMainPane";
import { TreeViewSidebar } from "@/components/folder/components/TreeViewSidebar";
import { TreeViewTabContent } from "@/components/folder/components/TreeViewTabContent";
import { Skeleton } from "@/components/ui/skeleton";

import { useTreeViewActions } from "@/components/folder/hooks/useTreeViewActions";
import { useTreeViewDerivedState } from "@/components/folder/hooks/useTreeViewDerivedState";
import { useTreeViewFilters } from "@/components/folder/hooks/useTreeViewFilters";
import { useTreeViewSidebar } from "@/components/folder/hooks/useTreeViewSidebar";

interface TreeViewLayoutProps {
  folders: Folder[];
  isSectionListMode: boolean;
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  selectedCardId: string | null;
  selectedDocumentId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
  onCardUpdated: () => void;
  onBreadcrumbContextChange?: (context: ExplorerBreadcrumbContext) => void;
  navigateToSectionListToken?: number;
  folderSelectionNonce?: number;
}

type TreeViewTabContentProps = ComponentProps<typeof TreeViewTabContent>;

const TreeViewLayout = ({
  folders,
  isSectionListMode,
  selectedFolderId,
  selectedItem,
  selectedCardId,
  selectedDocumentId,
  onFolderSelect,
  onItemSelect,
  onCardUpdated,
  onBreadcrumbContextChange,
  navigateToSectionListToken = 0,
  folderSelectionNonce = 0,
}: TreeViewLayoutProps) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { settings } = useUserSettings();
  const { createFolder, updateFolder, deleteFolder } = useFolderCommands();
  const { cards = [], loading: cardsLoading } = useCardsRead();
  const {
    createCard,
    updateCard,
    deleteCard,
    moveCardToSet,
    reorderCardsInCardSet,
  } = useCardCommands();
  const { documents = [], loading: documentsLoading } = useDocumentsRead();

  const [selectedCardSetId, setSelectedCardSetId] = useState<string | null>(
    null,
  );
  const [selectedCardSetLabel, setSelectedCardSetLabel] = useState<
    string | null
  >(null);
  const [explorerHeaderFolderId, setExplorerHeaderFolderId] = useState<
    string | null
  >(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const createFolderTriggerRef = useRef<(() => void) | null>(null);
  const createCardSetTriggerRef = useRef<
    ((folderId?: string | null) => void) | null
  >(null);
  const documentTriggerRef = useRef<(() => void) | null>(null);

  const {
    cardSets,
    loading: cardSetsLoading,
    createCardSet,
    updateCardSet,
    deleteCardSet,
    moveCardSetToFolder,
  } = useCardSets();

  const routeSelectedCardSet = useMemo(
    () =>
      selectedItem?.type === "cardSet"
        ? (cardSets.find((set: CardSet) => set.id === selectedItem.id) ?? null)
        : null,
    [cardSets, selectedItem],
  );

  useEffect(() => {
    if (selectedItem?.type === "cardSet") {
      return;
    }

    setSelectedCardSetId(null);
    setSelectedCardSetLabel(null);
  }, [selectedItem]);

  const activeSelectedCardSetId =
    routeSelectedCardSet?.id ?? selectedCardSetId ?? null;

  const activeSelectedCardSetLabel = useMemo(() => {
    if (!activeSelectedCardSetId) return null;

    return (
      cardSets.find(
        (cardSet: CardSet) => cardSet.id === activeSelectedCardSetId,
      )?.name ??
      (routeSelectedCardSet?.id === activeSelectedCardSetId
        ? routeSelectedCardSet.name
        : selectedCardSetLabel)
    );
  }, [
    activeSelectedCardSetId,
    cardSets,
    routeSelectedCardSet,
    selectedCardSetLabel,
  ]);

  const handleItemSelect = useCallback(
    (item: SelectedExplorerItem) => {
      if (item?.type === "cardSet") {
        const cardSet = cardSets.find((set: CardSet) => set.id === item.id);
        if (cardSet) {
          onFolderSelect(cardSet.folderId ?? null);
          setSelectedCardSetId(item.id);
          setSelectedCardSetLabel(cardSet.name || "無題のセット");

          navigate(
            createPageUrl(
              createAppDestination("cardSetView", {
                cardSetId: item.id,
                ...(cardSet.folderId ? { folderId: cardSet.folderId } : {}),
              }),
            ),
          );
        }
        return;
      }

      setSelectedCardSetId(null);
      setSelectedCardSetLabel(null);
      onItemSelect(item);
    },
    [cardSets, navigate, onFolderSelect, onItemSelect],
  );

  const { updateDocument, deleteDocument } = useDocumentCommands();
  const { tagById } = useTags();

  const {
    sidebarRef,
    contentScrollRef,
    renderedSidebarWidth,
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
    selectedFolder,
    selectedDocument,
    folderCards,
    folderStats,
    showMobileDetail,
  } = useTreeViewDerivedState({
    folders,
    cards,
    cardSets,
    documents,
    selectedFolderId,
    selectedItem,
    selectedCardId,
    selectedDocumentId,
    autoCarryOver: settings?.autoCarryOver ?? true,
    isMobile,
  });

  const tagFilter = useExplorerStore((state) => state.tagFilter);
  const tagMatchMode = useExplorerStore((state) => state.tagMatchMode);
  const uncertaintyFilter = useExplorerStore(
    (state) => state.uncertaintyFilter,
  );
  const bookmarkedFilter = useExplorerStore((state) => state.bookmarkedFilter);
  const draftFilter = useExplorerStore((state) => state.draftFilter);
  const contentTypeFilter = useExplorerStore(
    (state) => state.contentTypeFilter,
  );

  const {
    handleFolderSelect: handleFolderSelectBase,
    handleStartStudy,
    handleViewCards,
    handleOpenCreateCard,
  } = useTreeViewActions({
    navigate,
    selectedFolderId,
    onFolderSelect,
  });

  const handleFolderSelect = useCallback(
    (folderId: string | null) => {
      setSelectedCardSetId(null);
      setSelectedCardSetLabel(null);
      handleFolderSelectBase(folderId);
    },
    [handleFolderSelectBase],
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
    cards.forEach((card) => {
      resolveCardTagNames(card.tagIds, tagById).forEach((tag) => {
        tagNames.add(tag);
      });
    });
    return Array.from(tagNames).sort();
  }, [cards, tagById]);

  const currentSelectedContextFolderId = useMemo(() => {
    if (isSectionListMode) return null;
    if (selectedFolderId) return selectedFolderId;

    if (activeSelectedCardSetId) {
      return (
        cardSets.find(
          (cardSet: CardSet) => cardSet.id === activeSelectedCardSetId,
        )?.folderId ??
        routeSelectedCardSet?.folderId ??
        null
      );
    }

    return null;
  }, [
    activeSelectedCardSetId,
    cardSets,
    isSectionListMode,
    routeSelectedCardSet,
    selectedFolderId,
  ]);

  const currentHeaderActionFolderId = currentSelectedContextFolderId;

  const currentHeaderFolderId = useMemo(() => {
    if (isSectionListMode) {
      return null;
    }

    if (currentSelectedContextFolderId !== null) {
      return currentSelectedContextFolderId;
    }

    if (explorerHeaderFolderId) {
      return explorerHeaderFolderId;
    }

    return null;
  }, [
    currentSelectedContextFolderId,
    explorerHeaderFolderId,
    isSectionListMode,
  ]);

  useLayoutEffect(() => {
    onBreadcrumbContextChange?.({
      folderId: currentHeaderFolderId,
      cardSet:
        activeSelectedCardSetId && activeSelectedCardSetLabel
          ? {
              id: activeSelectedCardSetId,
              label: activeSelectedCardSetLabel,
            }
          : null,
    });
  }, [
    activeSelectedCardSetId,
    activeSelectedCardSetLabel,
    currentHeaderFolderId,
    onBreadcrumbContextChange,
  ]);

  const handleCreateRootFolder = useCallback(() => {
    createFolderTriggerRef.current?.();
  }, []);

  const handleCreateCardSetFromHeader = useCallback(() => {
    if (!currentHeaderActionFolderId) return;
    createCardSetTriggerRef.current?.(currentHeaderActionFolderId);
  }, [currentHeaderActionFolderId]);

  const handleAddDocumentFromHeader = useCallback(() => {
    if (!currentHeaderActionFolderId) return;
    documentTriggerRef.current?.();
  }, [currentHeaderActionFolderId]);

  const handleOpenBulkImport = useCallback(() => {
    if (!currentHeaderActionFolderId) {
      toast.error("一括インポート先のフォルダを先に選択してください。");
      return;
    }

    setIsImportDialogOpen(true);
  }, [currentHeaderActionFolderId, toast]);

  const handleImportCompleted = useCallback(
    ({
      cardSetId,
      cardSetName,
      folderId,
    }: {
      cardSetId: string;
      cardSetName: string;
      folderId: string;
      createdCount: number;
    }) => {
      onFolderSelect(folderId);
      setSelectedCardSetId(cardSetId);
      setSelectedCardSetLabel(cardSetName || "無題のセット");

      navigate(
        createPageUrl(
          createAppDestination("cardSetView", {
            cardSetId,
            folderId,
          }),
        ),
      );
    },
    [navigate, onFolderSelect],
  );

  const importTargetCardSets = useMemo(() => {
    if (!currentHeaderActionFolderId) {
      return [];
    }

    return cardSets.filter(
      (cardSet: CardSet) => cardSet.folderId === currentHeaderActionFolderId,
    );
  }, [cardSets, currentHeaderActionFolderId]);

  const { filteredCards, filteredDocuments, isFiltering } = useTreeViewFilters({
    cards,
    documents,
    tagFilter,
    tagMatchMode,
    uncertaintyFilter,
    bookmarkedFilter,
    draftFilter,
    contentTypeFilter,
    tagById,
  });

  const handleUpdateFolderForTree: NonNullable<
    TreeViewTabContentProps["onUpdateFolder"]
  > = useCallback(
    async (folderId, data) => {
      await updateFolder(folderId, data as Record<string, unknown>);
    },
    [updateFolder],
  );

  const handleUpdateCardSetForTree: NonNullable<
    TreeViewTabContentProps["onUpdateCardSet"]
  > = useCallback(
    async (cardSetId, data) => {
      await updateCardSet(cardSetId, data as Record<string, unknown>);
    },
    [updateCardSet],
  );

  const handleCreateCardForTree: NonNullable<
    TreeViewTabContentProps["onCreateCard"]
  > = useCallback(
    async (data) => createCard(data as Record<string, unknown>),
    [createCard],
  );

  const handleUpdateCardForTree: NonNullable<
    TreeViewTabContentProps["onUpdateCard"]
  > = useCallback(
    async (cardId, data) => {
      await updateCard(cardId, data as Record<string, unknown>);
    },
    [updateCard],
  );

  const handleUpdateDocumentForTree: NonNullable<
    TreeViewTabContentProps["onUpdateDocument"]
  > = useCallback(
    async (documentId, data) => {
      await updateDocument(documentId, data as Partial<DocumentItem>);
    },
    [updateDocument],
  );

  const handleMoveDocumentToFolder: NonNullable<
    TreeViewTabContentProps["moveDocumentToFolder"]
  > = useCallback(
    async (id, folderId) => {
      await updateDocument(id, { folderId });
    },
    [updateDocument],
  );

  const resolvedSidebarDisplayMode =
    settings?.folderSidebarDisplayMode === "navigation" ? "navigation" : "tree";

  const isExplorerDataLoading =
    cardsLoading || documentsLoading || cardSetsLoading;

  if (isExplorerDataLoading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(3)].map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  const sidebarContent = (
    <TreeViewTabContent
      sidebarDisplayMode={resolvedSidebarDisplayMode}
      folders={folders}
      cards={cards}
      cardSets={cardSets}
      documents={documents}
      filteredCards={filteredCards}
      filteredDocuments={filteredDocuments}
      selectedFolderId={selectedFolderId}
      selectedItem={selectedItem}
      isFiltering={isFiltering}
      onRegisterCreateFolderTrigger={(fn) => {
        createFolderTriggerRef.current = fn;
      }}
      onRegisterCreateCardSetTrigger={(fn) => {
        createCardSetTriggerRef.current = fn;
      }}
      onRegisterDocumentTrigger={(fn) => {
        documentTriggerRef.current = fn;
      }}
      navigateToSectionListToken={navigateToSectionListToken}
      folderSelectionNonce={folderSelectionNonce}
      forceSectionListRoot={isSectionListMode}
      onHeaderFolderIdChange={setExplorerHeaderFolderId}
      onFolderSelect={handleFolderSelect}
      onItemSelect={handleItemSelect}
      onCreateFolder={createFolder}
      onUpdateFolder={handleUpdateFolderForTree}
      onDeleteFolder={deleteFolder}
      onCreateCardSet={createCardSet}
      onUpdateCardSet={handleUpdateCardSetForTree}
      onDeleteCardSet={deleteCardSet}
      onCreateCard={handleCreateCardForTree}
      onUpdateCard={handleUpdateCardForTree}
      onDeleteCard={deleteCard}
      onUpdateDocument={handleUpdateDocumentForTree}
      onDeleteDocument={deleteDocument}
      moveCardToSet={moveCardToSet}
      moveCardSetToFolder={moveCardSetToFolder}
      moveDocumentToFolder={handleMoveDocumentToFolder}
      reorderCardsInCardSet={reorderCardsInCardSet}
      selectedCardSetId={activeSelectedCardSetId}
      onSelectCardSet={handleCardSetSelectWithoutNavigation}
    />
  );

  const canCreateCardSet = Boolean(currentHeaderActionFolderId);
  const canAddDocuments = Boolean(currentHeaderActionFolderId);

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
        renderedSidebarWidth={renderedSidebarWidth}
        isSidebarOpen={isSidebarOpen}
        isResizing={isResizing}
        showMobileDetail={showMobileDetail}
        allTags={allTags}
        onCreateRootFolder={handleCreateRootFolder}
        onCreateCardSet={handleCreateCardSetFromHeader}
        onAddDocument={handleAddDocumentFromHeader}
        onBulkImport={handleOpenBulkImport}
        onStartResizing={startResizing}
        canCreateCardSet={canCreateCardSet}
        canAddDocuments={canAddDocuments}
        canBulkImport={Boolean(currentHeaderActionFolderId)}
        preferDirectRootFolderCreate={currentHeaderActionFolderId === null}
      >
        {sidebarContent}
      </TreeViewSidebar>

      <TreeViewMainPane
        showMobileDetail={showMobileDetail}
        hideOnSectionList={isSectionListMode}
        selectedItem={selectedItem}
        selectedCardId={selectedCardId}
        selectedDocument={selectedDocument}
        selectedFolderId={selectedFolderId}
        selectedFolderName={selectedFolder?.folderName ?? "フォルダ"}
        folders={folders}
        cards={cards}
        documents={documents}
        folderCards={folderCards}
        onCardUpdated={onCardUpdated}
        onDocumentUpdated={updateDocument}
        onRenameFolder={
          selectedFolderId
            ? async (newName: string) => {
                await updateFolder(selectedFolderId, { folderName: newName });
              }
            : undefined
        }
        handlers={{
          onStartStudy: handleStartStudy,
          onViewCards: handleViewCards,
          onCreateCard: handleOpenCreateCard,
        }}
        folderSelectionNonce={folderSelectionNonce}
      />

      <XlsxImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        folderId={currentHeaderActionFolderId}
        folderName={
          currentHeaderActionFolderId
            ? (folders.find(
                (folder) => folder.id === currentHeaderActionFolderId,
              )?.folderName ?? null)
            : null
        }
        cardSets={importTargetCardSets}
        onImported={handleImportCompleted}
        createCardSet={createCardSet}
        createCard={createCard}
      />
    </div>
  );
};

export default TreeViewLayout;
