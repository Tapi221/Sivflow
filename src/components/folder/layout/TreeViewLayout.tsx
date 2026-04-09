import { useToast } from "@/contexts/ToastContext";
import type { ExplorerBreadcrumbContext } from "@/features/breadcrumbs/types";
import { XlsxImportDialog } from "@/features/import/ui/XlsxImportDialog";
import { useCards } from "@/hooks/card/useCards";
import { useCardSets } from "@/hooks/cardSet/useCardSets";
import { useExplorerStore } from "@/hooks/folder/useExplorerStore";
import { useFolders } from "@/hooks/folder/useFolders";
import { useDocuments } from "@/hooks/platform/useDocuments";
import { resolveCardTagNames, useTags } from "@/hooks/settings/useTags";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import { cn } from "@/lib/utils";
import { createPageUrl } from "@/platform/web/navigation/toWebPath";
import type {
  Card,
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

import { useTreeViewActions } from "@/components/folder/hooks/useTreeViewActions";
import { useTreeViewDerivedState } from "@/components/folder/hooks/useTreeViewDerivedState";
import { useTreeViewFilters } from "@/components/folder/hooks/useTreeViewFilters";
import { useTreeViewSidebar } from "@/components/folder/hooks/useTreeViewSidebar";

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
  onBreadcrumbContextChange?: (context: ExplorerBreadcrumbContext) => void;
  navigateToSectionListToken?: number;
  folderSelectionNonce?: number;
}

type TreeViewTabContentProps = ComponentProps<typeof TreeViewTabContent>;

const TreeViewLayout = ({
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
  onBreadcrumbContextChange,
  navigateToSectionListToken = 0,
  folderSelectionNonce = 0,
}: TreeViewLayoutProps) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { settings } = useUserSettings();
  const { createFolder, updateFolder, deleteFolder } = useFolders();
  const { createCard, updateCard, deleteCard, moveCardToFolder, reorderCards } =
    useCards();

  const [selectedCardSetId, setSelectedCardSetId] = useState<string | null>(
    null,
  );
  const [selectedCardSetLabel, setSelectedCardSetLabel] = useState<
    string | null
  >(null);
  const [isSectionListMode, setIsSectionListMode] = useState(false);
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
    createCardSet,
    updateCardSet,
    deleteCardSet,
    moveCardSetToFolder,
  } = useCardSets();

  const handleItemSelect = useCallback(
    (item: SelectedExplorerItem) => {
      if (item?.type === "cardSet") {
        const cardSet = cardSets.find((set: CardSet) => set.id === item.id);
        if (cardSet) {
          onFolderSelect(cardSet.folderId ?? null);
          setSelectedCardSetId(item.id);
          setSelectedCardSetLabel(cardSet.name || "無題のセット");

          const query = new URLSearchParams();
          query.set("cardSetId", item.id);
          if (cardSet.folderId) query.set("folderId", cardSet.folderId);

          navigate(createPageUrl(`CardSetView?${query.toString()}`));
        }
        return;
      }

      setSelectedCardSetId(null);
      setSelectedCardSetLabel(null);
      onItemSelect(item);
    },
    [cardSets, navigate, onFolderSelect, onItemSelect],
  );

  const { updateDocument, deleteDocument } = useDocuments();
  const { getTagColor, tagById } = useTags();

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

  const explorerTab = useExplorerStore((state) => state.explorerTab);
  const setExplorerTab = useExplorerStore((state) => state.setExplorerTab);

  const recent = useExplorerStore((state) => state.recent);
  const addRecent = useExplorerStore((state) => state.addRecent);
  const clearRecent = useExplorerStore((state) => state.clearRecent);

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

  useEffect(() => {
    if (explorerTab === "inbox") {
      setExplorerTab("explorer");
    }
  }, [explorerTab, setExplorerTab]);

  const {
    handleFolderSelectWithRecent,
    handleStartStudy,
    handleViewCards,
    handleOpenCreateCard,
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
    cards.forEach((card) => {
      resolveCardTagNames(card.tagIds, tagById).forEach((tag) => {
        tagNames.add(tag);
      });
    });
    return Array.from(tagNames).sort();
  }, [cards, tagById]);

  const currentHeaderFolderId = useMemo(() => {
    if (selectedFolderId) return selectedFolderId;
    if (explorerHeaderFolderId) return explorerHeaderFolderId;

    if (selectedItem?.type === "cardSet") {
      return (
        cardSets.find((set: CardSet) => set.id === selectedItem.id)?.folderId ??
        null
      );
    }

    return null;
  }, [cardSets, explorerHeaderFolderId, selectedFolderId, selectedItem]);

  const currentCardSetLabel = useMemo(() => {
    if (!selectedCardSetId) return null;
    return (
      cardSets.find((cardSet: CardSet) => cardSet.id === selectedCardSetId)
        ?.name ?? selectedCardSetLabel
    );
  }, [cardSets, selectedCardSetId, selectedCardSetLabel]);

  useLayoutEffect(() => {
    onBreadcrumbContextChange?.({
      folderId: currentHeaderFolderId,
      cardSet:
        selectedCardSetId && currentCardSetLabel
          ? {
              id: selectedCardSetId,
              label: currentCardSetLabel,
            }
          : null,
    });
  }, [
    currentCardSetLabel,
    currentHeaderFolderId,
    onBreadcrumbContextChange,
    selectedCardSetId,
  ]);

  const handleCreateRootFolder = useCallback(() => {
    createFolderTriggerRef.current?.();
  }, []);

  const handleCreateCardSetFromHeader = useCallback(() => {
    if (!currentHeaderFolderId) return;
    createCardSetTriggerRef.current?.(currentHeaderFolderId);
  }, [currentHeaderFolderId]);

  const handleAddDocumentFromHeader = useCallback(() => {
    if (!currentHeaderFolderId) return;
    documentTriggerRef.current?.();
  }, [currentHeaderFolderId]);

  const handleOpenBulkImport = useCallback(() => {
    if (!currentHeaderFolderId) {
      toast.error("一括インポート先のフォルダを先に選択してください。");
      return;
    }

    setIsImportDialogOpen(true);
  }, [currentHeaderFolderId, toast]);

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
      addRecent({ type: "folder", id: folderId });
      onFolderSelect(folderId);
      setSelectedCardSetId(cardSetId);
      setSelectedCardSetLabel(cardSetName || "無題のセット");
      setExplorerTab("explorer");

      const query = new URLSearchParams();
      query.set("cardSetId", cardSetId);
      query.set("folderId", folderId);
      navigate(createPageUrl(`CardSetView?${query.toString()}`));
    },
    [addRecent, navigate, onFolderSelect, setExplorerTab],
  );

  const importTargetCardSets = useMemo(() => {
    if (!currentHeaderFolderId) {
      return [];
    }

    return cardSets.filter(
      (cardSet: CardSet) => cardSet.folderId === currentHeaderFolderId,
    );
  }, [cardSets, currentHeaderFolderId]);

  const { isFilterActive, filteredCards, filteredDocuments, isFiltering } =
    useTreeViewFilters({
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

  const tabContent = (
    <TreeViewTabContent
      explorerTab={explorerTab}
      sidebarDisplayMode={settings?.folderSidebarDisplayMode ?? "auto"}
      recent={recent}
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
      onSectionListModeChange={setIsSectionListMode}
      onHeaderFolderIdChange={setExplorerHeaderFolderId}
      onFolderSelect={handleFolderSelect}
      onItemSelect={handleItemSelect}
      onClearRecent={clearRecent}
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
      moveCardToFolder={moveCardToFolder}
      moveCardSetToFolder={moveCardSetToFolder}
      moveDocumentToFolder={handleMoveDocumentToFolder}
      reorderCards={reorderCards}
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
        fillAvailableWidth={false}
        explorerTab={explorerTab}
        setExplorerTab={setExplorerTab}
        allTags={allTags}
        getTagColor={getTagColor}
        isFilterActive={isFilterActive}
        resultCount={filteredCards.length + filteredDocuments.length}
        onCreateRootFolder={handleCreateRootFolder}
        onCreateCardSet={handleCreateCardSetFromHeader}
        onAddDocument={handleAddDocumentFromHeader}
        onBulkImport={handleOpenBulkImport}
        onStartResizing={startResizing}
        canCreateCardSet={canCreateCardSet}
        canAddDocuments={canAddDocuments}
        canBulkImport={Boolean(currentHeaderFolderId)}
        preferDirectRootFolderCreate={isSectionListMode}
      >
        {tabContent}
      </TreeViewSidebar>

      <TreeViewMainPane
        isMobile={isMobile}
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
        folderStats={folderStats}
        onCardUpdated={onCardUpdated}
        onDocumentUpdated={updateDocument}
        onRenameFolder={async (folderId, newName) => {
          await updateFolder(folderId, { folderName: newName });
        }}
        onItemSelect={onItemSelect}
        onFolderSelect={onFolderSelect}
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
        folderId={currentHeaderFolderId}
        folderName={
          currentHeaderFolderId
            ? (folders.find((folder) => folder.id === currentHeaderFolderId)
                ?.folderName ?? null)
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
