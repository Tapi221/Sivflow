import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { ImportFormat } from "@web-renderer/chip/panel/dialog.desktop/Dialog.ImportFormat";
import { ImportFormatDialog } from "@web-renderer/chip/panel/dialog.desktop/Dialog.ImportFormat";
import { MfCardImportDialog } from "@web-renderer/chip/panel/dialog.desktop/Dialog.MfCardImport";
import { MfDeckImportDialog } from "@web-renderer/chip/panel/dialog.desktop/Dialog.MfDeckImport";
import { PortableImportBatchDialog } from "@web-renderer/chip/panel/dialog.desktop/Dialog.PortableImportBatch";
import { XlsxImportDialog } from "@web-renderer/chip/panel/dialog.desktop/Dialog.XlsxImport";
import { cn } from "@web-renderer/lib/utils";
import type { DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useCardCommands } from "@/components/card/hooks/useCardCommands";
import { useCardSets } from "@/components/card/hooks/useCardSets";
import { useCardsRead } from "@/components/card/hooks/useCardsRead";
import { SectionListColumnPane } from "@/components/folder/components/SectionListColumnPane";
import { TreeViewMainPane } from "@/components/folder/components/TreeViewMainPane";
import { useTreeViewActions } from "@/components/folder/hooks/useTreeViewActions";
import { useTreeViewDerivedState } from "@/components/folder/hooks/useTreeViewDerivedState";
import { useTreeViewFilters } from "@/components/folder/hooks/useTreeViewFilters";
import { useToast } from "@/contexts/ToastContext";
import type { ExplorerBreadcrumbContext } from "@/features/breadcrumbs/breadcrumbs.types";
import { useDocumentCommands } from "@/features/document/hooks/useDocumentCommands";
import { useDocumentsRead } from "@/features/document/hooks/useDocumentsRead";
import { useExplorerStore } from "@/features/explorer/store/useExplorerStore";
import { useFolderCommands } from "@/features/folder/hooks/useFolderCommands";
import { ExplorerSearchSourceBridge } from "@/features/global-search/components/ExplorerSearchSourceBridge";
import { readDesktopImportFiles, subscribeDesktopImportFileOpen } from "@/features/import/desktop/desktopImportFiles";
import { detectImportFileKind, getPortableImportFiles, getSupportedImportFiles, isPortableImportFileKind, isSupportedImportFileKind } from "@/features/import/domain/importFileKind";
import { useTags } from "@/features/settings/hooks/useTags";
import { useUserSettings } from "@/features/settings/hooks/useUserSettings";
import { createAppDestination, createPageUrl } from "@/platform/web/navigation/toWebPath";
import type { CardSet, Folder, SelectedExplorerItem } from "@/types";



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



const MOBILE_DETAIL_MEDIA_QUERY = "(max-width: 767px)";



const isExternalFileDragEvent = (event: DragEvent<HTMLDivElement>) => {
  return Array.from(event.dataTransfer.types).includes("Files");
};
const readIsMobileViewport = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_DETAIL_MEDIA_QUERY).matches;
};
const useIsMobileViewport = (): boolean => {
  const [isMobileViewport, setIsMobileViewport] = useState(readIsMobileViewport);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQueryList = window.matchMedia(MOBILE_DETAIL_MEDIA_QUERY);
    const handleChange = () => setIsMobileViewport(mediaQueryList.matches);

    handleChange();
    mediaQueryList.addEventListener("change", handleChange);

    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, []);

  return isMobileViewport;
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
  const toast = useToast();
  const { settings } = useUserSettings();
  const { updateFolder } = useFolderCommands();
  const { cards = [], loading: cardsLoading } = useCardsRead();
  const { createCard, moveCardToSet, reorderCardsInCardSet } =
    useCardCommands();
  const { documents = [], loading: documentsLoading } = useDocumentsRead();
  const isMobileViewport = useIsMobileViewport();

  const [selectedCardSetId, setSelectedCardSetId] = useState<string | null>(
    null,
  );
  const [selectedCardSetLabel, setSelectedCardSetLabel] = useState<
    string | null
  >(null);
  const [sectionListSidebarFolderId, setSectionListSidebarFolderId] = useState<
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

  const {
    cardSets,
    loading: cardSetsLoading,
    createCardSet,
    updateCardSet,
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
          setSelectedCardSetLabel(cardSet.name ?? "無題のセット");
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

  const { updateDocument } = useDocumentCommands();
  const { tagById, addTag } = useTags();

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
      isMobile: isMobileViewport,
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

    return currentSelectedContextFolderId;
  }, [currentSelectedContextFolderId, isSectionListMode]);

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
      setSelectedCardSetLabel(cardSetName ?? "無題のセット");

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

  const handleMoveDocumentToFolder = useCallback(
    async (id, folderId) => {
      await updateDocument(id, { folderId: folderId ?? undefined });
    },
    [updateDocument],
  ) satisfies (id: string, folderId: string | null) => Promise<void>;

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
        cardSetIds.map(async (cardSetId, orderIndex) => {
          await moveCardSetToFolder(cardSetId, targetFolderId);
          await updateCardSet(cardSetId, { orderIndex });
        }),
      );
    },
    [moveCardSetToFolder, updateCardSet],
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

  const isExplorerDataLoading =
    cardsLoading || documentsLoading || cardSetsLoading;
  if (isExplorerDataLoading) {
    return <div className="h-full w-full bg-transparent" />;
  }

  return (
    <div
      onDragEnter={handleImportDragEnter}
      onDragOver={handleImportDragOver}
      onDragLeave={handleImportDragLeave}
      onDrop={handleImportDrop}
      className={cn(
        "relative flex h-full min-h-0 w-full max-w-none flex-1 items-stretch overflow-hidden",
        "rounded-b-[14px] border-r border-b border-stone-300 bg-[rgba(255,255,255,0.96)]",
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
          <div className="rounded-3xl border border-slate-200 bg-white/95 px-6 py-5 text-center shadow-[0_18px_60px_rgba(15,23,42,0.18)]">
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

      {isSectionListMode ? (
        <SectionListColumnPane
          sidebarWidth={0}
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
          showLibraryToolbar={false}
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
