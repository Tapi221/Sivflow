import { useToast } from "@/contexts/ToastContext";
import type { ExplorerBreadcrumbContext } from "@/features/breadcrumbs/types";
import { ExplorerSearchSourceBridge } from "@/features/global-search/components/ExplorerSearchSourceBridge";
import { MfCardImportDialog } from "@/features/cardFile/presentation/web/MfCardImportDialog";
import { MfDeckImportDialog } from "@/features/deckFile/presentation/web/MfDeckImportDialog";
import { PortableImportBatchDialog } from "@/features/import/presentation/web/PortableImportBatchDialog";
import {
  ImportFormatDialog,
  type ImportFormat,
} from "@/features/import/presentation/web/ImportFormatDialog";
import {
  detectImportFileKind,
  getPortableImportFiles,
  getSupportedImportFiles,
  isPortableImportFileKind,
  isSupportedImportFileKind,
} from "@/features/import/domain/importFileKind";
import {
  readDesktopImportFiles,
  subscribeDesktopImportFileOpen,
} from "@/features/import/desktop/desktopImportFiles";
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
import { ChevronDown, ChevronRight } from "@/ui/icons";
import type {
  CardSet,
  DocumentItem,
  Folder,
  SelectedExplorerItem,
} from "@/types";
import type { ComponentProps, DragEvent } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import { PinnedFolderSidebarSection } from "@/components/folder/components/PinnedFolderSidebarSection";
import { SectionListColumnPane } from "@/components/folder/components/SectionListColumnPane";
import { TreeViewMainPane } from "@/components/folder/components/TreeViewMainPane";
import { TreeViewSidebar } from "@/components/folder/components/TreeViewSidebar";
import { TreeViewTabContent } from "@/components/folder/components/TreeViewTabContent";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDockPanel } from "@/features/calendar/ui/CalendarDockPanel";
import { useCalendarDockPanelStore } from "@/features/calendar/store/useCalendarDockPanelStore";

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

const isExternalFileDragEvent = (event: DragEvent<HTMLDivElement>) => {
  return Array.from(event.dataTransfer.types).includes("Files");
};

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
  const isCalendarDockOpen = useCalendarDockPanelStore((state) => state.isOpen);
  const closeCalendarDock = useCalendarDockPanelStore((state) => state.close);
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
  const [sectionListSidebarFolderId, setSectionListSidebarFolderId] = useState<
    string | null
  >(null);
  const [explorerHeaderFolderId, setExplorerHeaderFolderId] = useState<
    string | null
  >(null);
  const [isImportFormatDialogOpen, setIsImportFormatDialogOpen] =
    useState(false);
  const [isXlsxImportDialogOpen, setIsXlsxImportDialogOpen] = useState(false);
  const [isMfDeckImportDialogOpen, setIsMfDeckImportDialogOpen] =
    useState(false);
  const [isMfCardImportDialogOpen, setIsMfCardImportDialogOpen] =
    useState(false);
  const [pendingMfDeckFile, setPendingMfDeckFile] = useState<File | null>(null);
  const [pendingMfDeckFileRevision, setPendingMfDeckFileRevision] = useState(0);
  const [pendingMfCardFile, setPendingMfCardFile] = useState<File | null>(null);
  const [pendingMfCardFileRevision, setPendingMfCardFileRevision] = useState(0);
  const [queuedPortableImportFiles, setQueuedPortableImportFiles] = useState<
    File[]
  >([]);
  const [portableImportFilesRevision, setPortableImportFilesRevision] =
    useState(0);
  const [isPortableImportBatchDialogOpen, setIsPortableImportBatchDialogOpen] =
    useState(false);
  const [, setImportDragDepth] = useState(0);
  const [isImportDragActive, setIsImportDragActive] = useState(false);
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
  useEffect(() => {
    if (!isSectionListMode) {
      setSectionListSidebarFolderId(null);
      return;
    }

    setSelectedCardSetId(null);
    setSelectedCardSetLabel(null);
    setSectionListSidebarFolderId(null);
  }, [isSectionListMode, navigateToSectionListToken]);

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
        }

        onItemSelect(item);
        return;
      }

      setSelectedCardSetId(null);
      setSelectedCardSetLabel(null);
      onItemSelect(item);
    },
    [cardSets, onFolderSelect, onItemSelect],
  );

  const { updateDocument, deleteDocument } = useDocumentCommands();
  const { tagById, addTag } = useTags();

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

  const { selectedFolder, selectedDocument, folderCards, showMobileDetail } =
    useTreeViewDerivedState({
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

  const handleSidebarFolderSelect = useCallback(
    (folderId: string | null) => {
      if (isSectionListMode) {
        setSelectedCardSetId(null);
        setSelectedCardSetLabel(null);
        setSectionListSidebarFolderId(folderId);
        return;
      }

      handleFolderSelect(folderId);
    },
    [handleFolderSelect, isSectionListMode],
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

    setIsImportFormatDialogOpen(true);
  }, [currentHeaderActionFolderId, toast]);

  const handleImportFormatSelect = useCallback((format: ImportFormat) => {
    if (format === "mfdeck") {
      setIsMfDeckImportDialogOpen(true);
      return;
    }

    if (format === "mfcard") {
      setIsMfCardImportDialogOpen(true);
      return;
    }

    setIsXlsxImportDialogOpen(true);
  }, []);

  const handleMfDeckImportDialogOpenChange = useCallback((open: boolean) => {
    setIsMfDeckImportDialogOpen(open);

    if (!open) {
      setPendingMfDeckFile(null);
    }
  }, []);

  const handleMfCardImportDialogOpenChange = useCallback((open: boolean) => {
    setIsMfCardImportDialogOpen(open);

    if (!open) {
      setPendingMfCardFile(null);
    }
  }, []);

  const openImportFiles = useCallback(
    (files: File[]) => {
      if (!currentHeaderActionFolderId) {
        toast.error("インポート先のフォルダを先に選択してください。");
        return;
      }

      const supportedFiles = getSupportedImportFiles(files);

      if (supportedFiles.length === 0) {
        toast.error("対応していないファイル形式です。");
        return;
      }

      const portableFiles = getPortableImportFiles(supportedFiles);

      if (portableFiles.length > 1) {
        setQueuedPortableImportFiles(portableFiles);
        setPortableImportFilesRevision((revision) => revision + 1);
        setIsPortableImportBatchDialogOpen(true);
        return;
      }

      const [file] = supportedFiles;
      const kind = detectImportFileKind(file);

      if (!isSupportedImportFileKind(kind)) {
        toast.error("対応していないファイル形式です。");
        return;
      }

      if (isPortableImportFileKind(kind) && supportedFiles.length > 1) {
        setQueuedPortableImportFiles(portableFiles);
        setPortableImportFilesRevision((revision) => revision + 1);
        setIsPortableImportBatchDialogOpen(true);
        return;
      }

      if (kind === "mfdeck") {
        setPendingMfDeckFile(file);
        setPendingMfDeckFileRevision((revision) => revision + 1);
        setIsMfDeckImportDialogOpen(true);
        return;
      }

      if (kind === "mfcard") {
        setPendingMfCardFile(file);
        setPendingMfCardFileRevision((revision) => revision + 1);
        setIsMfCardImportDialogOpen(true);
        return;
      }

      setIsXlsxImportDialogOpen(true);
    },
    [currentHeaderActionFolderId, toast],
  );

  useEffect(() => {
    return subscribeDesktopImportFileOpen(async (payload) => {
      if (payload.paths.length === 0) {
        return;
      }

      try {
        const files = await readDesktopImportFiles(payload.paths);
        openImportFiles(files);
      } catch (error) {
        console.error(
          "[TreeViewLayout] desktop import file open failed",
          error,
        );
        toast.error("ファイルを開けませんでした。");
      }
    });
  }, [openImportFiles, toast]);

  const handleImportDragEnter = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!isExternalFileDragEvent(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setImportDragDepth((depth) => depth + 1);
      setIsImportDragActive(true);
    },
    [],
  );

  const handleImportDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!isExternalFileDragEvent(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = currentHeaderActionFolderId
        ? "copy"
        : "none";
    },
    [currentHeaderActionFolderId],
  );

  const handleImportDragLeave = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!isExternalFileDragEvent(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setImportDragDepth((depth) => {
        const nextDepth = Math.max(0, depth - 1);

        if (nextDepth === 0) {
          setIsImportDragActive(false);
        }

        return nextDepth;
      });
    },
    [],
  );

  const handleImportDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!isExternalFileDragEvent(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setImportDragDepth(0);
      setIsImportDragActive(false);

      const files = getSupportedImportFiles(event.dataTransfer.files);

      if (files.length === 0) {
        toast.error("対応しているファイルをドロップしてください。");
        return;
      }

      openImportFiles(files);
    },
    [openImportFiles, toast],
  );

  const ensureMfDeckTagByName = useCallback(
    async (name: string) => {
      const tag = await addTag(name);
      return tag.id;
    },
    [addTag],
  );

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

  const handleMoveFolderFromColumnPane = useCallback(
    async (folderId: string, targetParentFolderId: string | null) => {
      await updateFolder(folderId, { parentFolderId: targetParentFolderId });
    },
    [updateFolder],
  );

  const handleReorderFoldersFromColumnPane = useCallback(
    async (targetParentFolderId: string | null, folderIds: string[]) => {
      await Promise.all(
        folderIds.map((folderId, orderIndex) =>
          updateFolder(folderId, {
            parentFolderId: targetParentFolderId,
            orderIndex,
          }),
        ),
      );
    },
    [updateFolder],
  );

  const handleMoveCardSetToFolderFromColumnPane = useCallback(
    async (cardSetId: string, targetFolderId: string) => {
      await moveCardSetToFolder(cardSetId, targetFolderId);
    },
    [moveCardSetToFolder],
  );

  const handleReorderCardSetsFromColumnPane = useCallback(
    async (targetFolderId: string, cardSetIds: string[]) => {
      await Promise.all(
        cardSetIds.map((cardSetId, orderIndex) =>
          updateCardSet(cardSetId, {
            folderId: targetFolderId,
            orderIndex,
          }),
        ),
      );
    },
    [updateCardSet],
  );

  const handleReorderDocumentsFromColumnPane = useCallback(
    async (targetFolderId: string, documentIds: string[]) => {
      await Promise.all(
        documentIds.map((documentId, orderIndex) =>
          updateDocument(documentId, {
            folderId: targetFolderId,
            orderIndex,
          }),
        ),
      );
    },
    [updateDocument],
  );

  // フォルダサイドバーは白いパネル型の遷移表示に一本化する。
  const resolvedSidebarDisplayMode = "navigation" as const;

  const isExplorerDataLoading =
    cardsLoading || documentsLoading || cardSetsLoading;
  const isFolderListSectionCollapsed = useExplorerStore(
    (state) => state.isFolderListSectionCollapsed,
  );
  const isTagSectionCollapsed = useExplorerStore(
    (state) => state.isTagSectionCollapsed,
  );
  const toggleTagSectionCollapsed = useExplorerStore(
    (state) => state.toggleTagSectionCollapsed,
  );
  const isCalendarSectionCollapsed = useExplorerStore(
    (state) => state.isCalendarSectionCollapsed,
  );
  const toggleCalendarSectionCollapsed = useExplorerStore(
    (state) => state.toggleCalendarSectionCollapsed,
  );

  if (isExplorerDataLoading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(3)].map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  const sidebarSelectedFolderId = isSectionListMode
    ? sectionListSidebarFolderId
    : selectedFolderId;
  const sidebarContent = (
    <div className="flex h-full min-h-0 flex-col">
      <PinnedFolderSidebarSection
        folders={folders}
        cards={filteredCards}
        cardSets={cardSets}
        documents={filteredDocuments}
        selectedFolderId={sidebarSelectedFolderId}
        isFiltering={isFiltering}
        onFolderSelect={handleSidebarFolderSelect}
      />

      <div
        id="folder-list-sidebar-section-content"
        className={cn(
          "min-h-0 flex-1 overflow-hidden",
          isFolderListSectionCollapsed && "hidden",
        )}
      >
        <TreeViewTabContent
          sidebarDisplayMode={resolvedSidebarDisplayMode}
          folders={folders}
          cards={cards}
          cardSets={cardSets}
          documents={documents}
          filteredCards={filteredCards}
          filteredDocuments={filteredDocuments}
          selectedFolderId={sidebarSelectedFolderId}
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
          onFolderSelect={handleSidebarFolderSelect}
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
      </div>

      <div className="mt-1 border-t border-border/60 px-2 pb-1 pt-2">
        <button
          type="button"
          className={cn(
            "group flex h-7 w-full items-center gap-1 rounded-md px-1 text-left",
            "text-[11px] font-medium leading-5 text-muted-foreground transition",
            "hover:bg-muted/70 hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-expanded={!isTagSectionCollapsed}
          aria-controls="tag-sidebar-section-content"
          onClick={toggleTagSectionCollapsed}
        >
          {isTagSectionCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
          )}
          <span className="min-w-0 flex-1 truncate">タグ</span>
          <span className="tabular-nums opacity-60">0</span>
        </button>
      </div>

      <div className="mt-1 border-t border-border/60 px-2 pb-1 pt-2">
        <button
          type="button"
          className={cn(
            "group flex h-7 w-full items-center gap-1 rounded-md px-1 text-left",
            "text-[11px] font-medium leading-5 text-muted-foreground transition",
            "hover:bg-muted/70 hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-expanded={!isCalendarSectionCollapsed}
          aria-controls="calendar-sidebar-section-content"
          onClick={toggleCalendarSectionCollapsed}
        >
          {isCalendarSectionCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
          )}
          <span className="min-w-0 flex-1 truncate">カレンダー</span>
          <span className="tabular-nums opacity-60">0</span>
        </button>
      </div>
    </div>
  );

  const canCreateCardSet = Boolean(currentHeaderActionFolderId);
  const canCreateCard = Boolean(currentHeaderActionFolderId);
  const canAddDocuments = Boolean(currentHeaderActionFolderId);

  return (
    <div
      onDragEnter={handleImportDragEnter}
      onDragOver={handleImportDragOver}
      onDragLeave={handleImportDragLeave}
      onDrop={handleImportDrop}
      className={cn(
        "relative flex h-full min-h-0 w-full max-w-none flex-1 items-stretch overflow-hidden",
        "rounded-b-[14px] border-x border-b border-[#dddcd5] bg-[rgba(255,255,255,0.96)]",
        isResizing && "select-none cursor-col-resize",
      )}
    >
      <ExplorerSearchSourceBridge
        folders={folders}
        cards={cards}
        cardSets={cardSets}
        documents={documents}
        onFolderSelect={handleFolderSelect}
        onItemSelect={handleItemSelect}
      />

      {isImportDragActive ? (
        <div className="pointer-events-none absolute inset-0 z-[80] flex items-center justify-center bg-slate-900/10 backdrop-blur-[1px]">
          <div className="rounded-[28px] border border-slate-200 bg-white/95 px-6 py-5 text-center shadow-[0_18px_60px_rgba(15,23,42,0.18)]">
            <p className="text-sm font-bold text-slate-800">
              ファイルをドロップしてインポート
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              .mfdeck / .mfcard を選択中のフォルダへ追加します。
            </p>
            {!currentHeaderActionFolderId ? (
              <p className="mt-2 text-xs font-semibold text-rose-600">
                先にインポート先フォルダを選択してください。
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

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
        canCreateCard={canCreateCard}
        canAddDocuments={canAddDocuments}
        canBulkImport={Boolean(currentHeaderActionFolderId)}
        preferDirectRootFolderCreate={currentHeaderActionFolderId === null}
        collapseContent={false}
        integratedChrome
      >
        {sidebarContent}
      </TreeViewSidebar>

      {isCalendarDockOpen ? (
        <CalendarDockPanel onClose={closeCalendarDock} />
      ) : null}

      {isSectionListMode ? (
        <SectionListColumnPane
          sidebarWidth={isSidebarOpen ? renderedSidebarWidth : 0}
          topOffsetPx={0}
          leftInsetPx={0}
          rightInsetPx={0}
          folders={folders}
          cards={filteredCards}
          cardSets={cardSets}
          documents={filteredDocuments}
          selectedFolderId={sectionListSidebarFolderId}
          selectedItem={selectedItem}
          selectedCardSetId={activeSelectedCardSetId}
          isFiltering={isFiltering}
          resetToken={navigateToSectionListToken + folderSelectionNonce}
          onFolderSelect={handleSidebarFolderSelect}
          onItemSelect={handleItemSelect}
          onMoveFolder={handleMoveFolderFromColumnPane}
          onReorderFolders={handleReorderFoldersFromColumnPane}
          onMoveCardSetToFolder={handleMoveCardSetToFolderFromColumnPane}
          onReorderCardSets={handleReorderCardSetsFromColumnPane}
          onMoveDocumentToFolder={handleMoveDocumentToFolder}
          onReorderDocuments={handleReorderDocumentsFromColumnPane}
          onMoveCardToSet={moveCardToSet}
          onReorderCardsInCardSet={reorderCardsInCardSet}
        />
      ) : null}

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

      <ImportFormatDialog
        open={isImportFormatDialogOpen}
        onOpenChange={setIsImportFormatDialogOpen}
        onSelect={handleImportFormatSelect}
      />

      <XlsxImportDialog
        open={isXlsxImportDialogOpen}
        onOpenChange={setIsXlsxImportDialogOpen}
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

      <PortableImportBatchDialog
        open={isPortableImportBatchDialogOpen}
        onOpenChange={setIsPortableImportBatchDialogOpen}
        folderId={currentHeaderActionFolderId}
        folderName={
          currentHeaderActionFolderId
            ? (folders.find(
                (folder) => folder.id === currentHeaderActionFolderId,
              )?.folderName ?? null)
            : null
        }
        files={queuedPortableImportFiles}
        filesRevision={portableImportFilesRevision}
        onImported={handleImportCompleted}
        createCardSet={createCardSet}
        updateCardSet={updateCardSet}
        createCard={createCard}
        ensureTagByName={ensureMfDeckTagByName}
      />

      <MfDeckImportDialog
        open={isMfDeckImportDialogOpen}
        onOpenChange={handleMfDeckImportDialogOpenChange}
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
        updateCardSet={updateCardSet}
        createCard={createCard}
        ensureTagByName={ensureMfDeckTagByName}
        initialFile={pendingMfDeckFile}
        initialFileRevision={pendingMfDeckFileRevision}
      />

      <MfCardImportDialog
        open={isMfCardImportDialogOpen}
        onOpenChange={handleMfCardImportDialogOpenChange}
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
        updateCardSet={updateCardSet}
        createCard={createCard}
        ensureTagByName={ensureMfDeckTagByName}
        initialFile={pendingMfCardFile}
        initialFileRevision={pendingMfCardFileRevision}
      />
    </div>
  );
};

export default TreeViewLayout;


