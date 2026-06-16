import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@web-renderer/lib/utils";
import { useLocation, useSearchParams } from "react-router-dom";
import { SectionListBlankPane } from "./SectionListBlankPane";
import type { BreadcrumbCrumb } from "@/features/breadcrumbs/breadcrumbs.types";
import { CardSetLibraryDashboard } from "@/features/library-cardset/components/CardSetLibraryDashboard";
import { PdfLibraryDashboard } from "@/features/library-pdf/components/PdfLibraryDashboard";
import type { Card, CardSet, DocumentItem, Folder, SelectedExplorerItem } from "@/types";



interface SectionListColumnPaneProps {
  className?: string;
  sidebarWidth: number;
  topOffsetPx: number;
  leftInsetPx?: number;
  rightInsetPx?: number;
  folders: Folder[];
  cards: Card[];
  cardSets?: CardSet[];
  documents: DocumentItem[];
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  selectedCardSetId?: string | null;
  isFiltering?: boolean;
  resetToken?: number;
  showLibraryToolbar?: boolean;
  onFolderSelect?: (folderId: string | null) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
  onMoveFolder?: (
    folderId: string,
    targetParentFolderId: string | null,
  ) => Promise<void>;
  onReorderFolders?: (
    targetParentFolderId: string | null,
    folderIds: string[],
  ) => Promise<void>;
  onMoveCardSetToFolder?: (
    cardSetId: string,
    targetFolderId: string,
  ) => Promise<void>;
  onReorderCardSets?: (
    targetFolderId: string,
    cardSetIds: string[],
  ) => Promise<void>;
  onMoveDocumentToFolder?: (
    documentId: string,
    targetFolderId: string,
  ) => Promise<void>;
  onReorderDocuments?: (
    targetFolderId: string,
    documentIds: string[],
  ) => Promise<void>;
  onMoveCardToSet?: (cardId: string, targetCardSetId: string) => Promise<void>;
  onReorderCardsInCardSet?: (
    cardSetId: string,
    cardIds: string[],
  ) => Promise<void>;
}
type ExplorerColumnPathWindow = Window & {
  __sivflowExplorerColumnPathCrumbs?: BreadcrumbCrumb[];
};
type ExplorerColumnPathNavigateEventDetail = {
  folderId?: string | null;
};
type ExplorerColumnPathChangeEventDetail = {
  crumbs?: BreadcrumbCrumb[];
  active?: boolean;
};
type FolderLike = Pick<Folder, "id" | "folderName"> & {
  parentFolderId?: string | null;
  folder_name?: string | null;
  parent_folder_id?: string | null;
};
type ExternalPathSelectionSnapshot = {
  resetToken: number;
  selectedFolderId: string | null;
};



const EXPLORER_COLUMN_PATH_CHANGE_EVENT =
  "sivflow:explorer-column-path-change";
const EXPLORER_COLUMN_PATH_NAVIGATE_EVENT =
  "sivflow:explorer-column-path-navigate";



const normalizeFolderParentId = (folder: FolderLike): string | null => {
  return folder.parentFolderId ?? folder.parent_folder_id ?? null;
};
const getFolderLabel = (folder: FolderLike): string => {
  return folder.folderName ?? folder.folder_name ?? "無題のフォルダ";
};
const getCardSetFolderId = (cardSet: CardSet): string | null => {
  return (
    cardSet.folderId ??
    (cardSet as unknown as { folder_id?: string | null; }).folder_id ??
    null
  );
};
const getCardSetLabel = (cardSet: CardSet): string => {
  const baseLabel = cardSet.name?.trim() ?? "無題のセット";
  return baseLabel.endsWith(".mfdeck") ? baseLabel : `${baseLabel}.mfdeck`;
};
const getDocumentFolderId = (document: DocumentItem): string | null => {
  return (
    document.folderId ??
    (document as unknown as { folder_id?: string | null; }).folder_id ??
    null
  );
};
const getDocumentLabel = (document: DocumentItem): string => {
  return (document.title?.trim() || document.fileName?.trim()) ?? "無題の文書";
};
const getCardCardSetId = (card: Card): string | null => {
  return (
    card.cardSetId ??
    (card as unknown as { card_set_id?: string | null; }).card_set_id ??
    null
  );
};
const getCardSetByCard = (
  card: Card,
  cardSetById: Map<string, CardSet>,
): CardSet | null => {
  const cardSetId = getCardCardSetId(card);
  if (!cardSetId) return null;

  return cardSetById.get(cardSetId) ?? null;
};
const getCardFolderId = (
  card: Card,
  cardSetById: Map<string, CardSet>,
): string | null => {
  const directFolderId =
    (card as unknown as { folderId?: string | null; }).folderId ??
    (card as unknown as { folder_id?: string | null; }).folder_id ??
    null;
  if (directFolderId) return directFolderId;

  const cardSet = getCardSetByCard(card, cardSetById);
  return cardSet ? getCardSetFolderId(cardSet) : null;
};
const getCardLabel = (card: Card): string => {
  const title = card.title?.trim();
  if (title) return title;

  const questionNumber =
    (card as unknown as { questionNumber?: string | null; }).questionNumber ??
    (card as unknown as { question_number?: string | null; }).question_number ??
    null;

  return questionNumber?.trim() ?? "無題のカード";
};
const buildFolderRoute = (folderId: string): string => {
  const searchParams = new URLSearchParams();
  searchParams.set("folderId", folderId);
  return `/library?${searchParams.toString()}`;
};
const resolveLibraryType = (pathname: string, searchParams: URLSearchParams) => {
  const normalizedPathname = pathname.toLowerCase().replace(/\/+$/, "");

  if (normalizedPathname === "/library/flashcard" || normalizedPathname === "/library/flashcards") {
    return "flashcards";
  }

  if (normalizedPathname === "/library/pdf") {
    return "pdf";
  }

  const queryLibraryType = searchParams.get("libraryType");
  return queryLibraryType === "flashcard" ? "flashcards" : (queryLibraryType ?? "pdf");
};
const dispatchExplorerColumnPathChange = (crumbs: BreadcrumbCrumb[]) => {
  if (typeof window === "undefined") return;

  const stableCrumbs = crumbs.map((crumb) => ({ ...crumb }));
  (window as ExplorerColumnPathWindow).__sivflowExplorerColumnPathCrumbs =
    stableCrumbs;

  window.dispatchEvent(
    new CustomEvent<ExplorerColumnPathChangeEventDetail>(
      EXPLORER_COLUMN_PATH_CHANGE_EVENT,
      {
        detail: { crumbs: stableCrumbs, active: true },
      },
    ),
  );
};
const dispatchExplorerColumnPathInactive = () => {
  if (typeof window === "undefined") return;

  delete (window as ExplorerColumnPathWindow)
    .__sivflowExplorerColumnPathCrumbs;

  window.dispatchEvent(
    new CustomEvent<ExplorerColumnPathChangeEventDetail>(
      EXPLORER_COLUMN_PATH_CHANGE_EVENT,
      {
        detail: { crumbs: [], active: false },
      },
    ),
  );
};
const getSelectedItemKey = (item: SelectedExplorerItem): string => {
  if (!item) return "__none__";
  return "id" in item ? `${item.type}:${item.id}` : item.type;
};



const SectionListColumnPane = ({
  className,
  sidebarWidth,
  topOffsetPx,
  leftInsetPx = 12,
  rightInsetPx = 12,
  folders,
  cards,
  cardSets = [],
  documents,
  selectedFolderId,
  selectedItem,
  selectedCardSetId = null,
  isFiltering = false,
  resetToken = 0,
  showLibraryToolbar = true,
  onFolderSelect,
  onItemSelect,
  onMoveFolder,
  onReorderFolders,
  onMoveCardSetToFolder,
  onReorderCardSets,
  onMoveDocumentToFolder,
  onReorderDocuments,
  onMoveCardToSet,
  onReorderCardsInCardSet,
}: SectionListColumnPaneProps) => {
  void isFiltering;
  void onFolderSelect;
  void onMoveFolder;
  void onReorderFolders;
  void onMoveCardSetToFolder;
  void onReorderCardSets;
  void onMoveDocumentToFolder;
  void onReorderDocuments;
  void onMoveCardToSet;
  void onReorderCardsInCardSet;

  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const libraryType = resolveLibraryType(pathname, searchParams);
  const isPdfLibraryView = libraryType === "pdf";
  const isFlashcardLibraryView = libraryType === "flashcards";

  const folderById = useMemo(() => {
    const map = new Map<string, FolderLike>();
    folders.forEach((folder) => map.set(folder.id, folder as FolderLike));
    return map;
  }, [folders]);

  const cardSetById = useMemo(() => {
    const map = new Map<string, CardSet>();
    cardSets.forEach((cardSet) => map.set(cardSet.id, cardSet));
    return map;
  }, [cardSets]);

  const buildFolderPathIds = useCallback(
    (folderId: string | null | undefined): string[] => {
      if (!folderId) return [];

      const pathIds: string[] = [];
      const seenFolderIds = new Set<string>();
      let currentFolderId: string | null = folderId;

      while (currentFolderId && !seenFolderIds.has(currentFolderId)) {
        const folder = folderById.get(currentFolderId);
        if (!folder) break;

        pathIds.unshift(currentFolderId);
        seenFolderIds.add(currentFolderId);
        currentFolderId = normalizeFolderParentId(folder);
      }

      return pathIds;
    },
    [folderById],
  );

  const buildFolderCrumbs = useCallback(
    (folderIds: string[]): BreadcrumbCrumb[] => {
      return folderIds.reduce<BreadcrumbCrumb[]>((crumbs, folderId) => {
        const folder = folderById.get(folderId);
        if (!folder) return crumbs;

        crumbs.push({
          label: getFolderLabel(folder),
          to: buildFolderRoute(folderId),
          folderId,
        });
        return crumbs;
      }, []);
    },
    [folderById],
  );

  const selectedFolderPathIds = useMemo(
    () => buildFolderPathIds(selectedFolderId),
    [buildFolderPathIds, selectedFolderId],
  );

  const [columnPathIds, setColumnPathIds] = useState<string[]>(
    selectedFolderPathIds,
  );
  const [activeLeafCrumbs, setActiveLeafCrumbs] = useState<BreadcrumbCrumb[]>(
    [],
  );
  const externalPathSelectionRef = useRef<ExternalPathSelectionSnapshot>({
    resetToken,
    selectedFolderId,
  });
  const syncedSelectedItemKeyRef = useRef<string | null>(null);

  const resetToFolderPath = useCallback(
    (folderId: string | null) => {
      setColumnPathIds(buildFolderPathIds(folderId));
      setActiveLeafCrumbs([]);
    },
    [buildFolderPathIds],
  );

  useEffect(() => {
    const previous = externalPathSelectionRef.current;
    const resetChanged = previous.resetToken !== resetToken;
    const selectedFolderChanged =
      previous.selectedFolderId !== selectedFolderId;

    externalPathSelectionRef.current = { resetToken, selectedFolderId };

    if (!resetChanged && !selectedFolderChanged) {
      return;
    }

    resetToFolderPath(selectedFolderId);
  }, [resetToFolderPath, resetToken, selectedFolderId]);

  useEffect(() => {
    if (!selectedCardSetId) {
      return;
    }

    const cardSet = cardSetById.get(selectedCardSetId);
    if (!cardSet) {
      return;
    }

    setColumnPathIds(buildFolderPathIds(getCardSetFolderId(cardSet)));
    setActiveLeafCrumbs([{ label: getCardSetLabel(cardSet) }]);
  }, [buildFolderPathIds, cardSetById, selectedCardSetId]);

  useEffect(() => {
    dispatchExplorerColumnPathChange([
      ...buildFolderCrumbs(columnPathIds),
      ...activeLeafCrumbs,
    ]);
  }, [activeLeafCrumbs, buildFolderCrumbs, columnPathIds]);

  useEffect(() => {
    const handleColumnPathNavigate = ((event: Event) => {
      const detail = (
        event as CustomEvent<ExplorerColumnPathNavigateEventDetail>
      ).detail;
      resetToFolderPath(detail?.folderId ?? null);
    }) as EventListener;

    window.addEventListener(
      EXPLORER_COLUMN_PATH_NAVIGATE_EVENT,
      handleColumnPathNavigate,
    );

    return () => {
      window.removeEventListener(
        EXPLORER_COLUMN_PATH_NAVIGATE_EVENT,
        handleColumnPathNavigate,
      );
    };
  }, [resetToFolderPath]);

  useEffect(() => {
    return () => {
      dispatchExplorerColumnPathInactive();
    };
  }, []);

  useEffect(() => {
    const selectedItemKey = getSelectedItemKey(selectedItem);

    if (syncedSelectedItemKeyRef.current === selectedItemKey) {
      return;
    }

    syncedSelectedItemKeyRef.current = selectedItemKey;

    if (selectedItem?.type === "cardSet") {
      const cardSet = cardSetById.get(selectedItem.id);

      setColumnPathIds(
        buildFolderPathIds(cardSet ? getCardSetFolderId(cardSet) : null),
      );
      setActiveLeafCrumbs(cardSet ? [{ label: getCardSetLabel(cardSet) }] : []);
      return;
    }

    if (selectedItem?.type === "document") {
      const documentItem = documents.find(
        (document) => document.id === selectedItem.id,
      );

      setColumnPathIds(
        buildFolderPathIds(
          documentItem ? getDocumentFolderId(documentItem) : null,
        ),
      );
      setActiveLeafCrumbs(
        documentItem ? [{ label: getDocumentLabel(documentItem) }] : [],
      );
      return;
    }

    if (selectedItem?.type === "card") {
      const card = cards.find((candidate) => candidate.id === selectedItem.id);
      const cardSet = card ? getCardSetByCard(card, cardSetById) : null;
      const leafCrumbs: BreadcrumbCrumb[] = [];

      if (cardSet) {
        leafCrumbs.push({ label: getCardSetLabel(cardSet) });
      }

      if (card) {
        leafCrumbs.push({ label: getCardLabel(card) });
      }

      setColumnPathIds(
        buildFolderPathIds(card ? getCardFolderId(card, cardSetById) : null),
      );
      setActiveLeafCrumbs(leafCrumbs);
      return;
    }

    setActiveLeafCrumbs([]);
  }, [buildFolderPathIds, cardSetById, cards, documents, selectedItem]);

  const handleOpenDocument = useCallback(
    (documentId: string) => {
      onItemSelect({ type: "document", id: documentId });
    },
    [onItemSelect],
  );

  const handleOpenCardSet = useCallback(
    (cardSetId: string) => {
      onItemSelect({ type: "cardSet", id: cardSetId });
    },
    [onItemSelect],
  );

  return (
    <SectionListBlankPane
      className={cn(className)}
      sidebarWidth={sidebarWidth}
      topOffsetPx={topOffsetPx}
      leftInsetPx={leftInsetPx}
      rightInsetPx={rightInsetPx}
    >
      {isPdfLibraryView ? (
        <PdfLibraryDashboard
          folders={folders}
          documents={documents}
          onOpenDocument={handleOpenDocument}
          showToolbar={showLibraryToolbar}
        />
      ) : null}
      {isFlashcardLibraryView ? (
        <CardSetLibraryDashboard
          folders={folders}
          cards={cards}
          cardSets={cardSets}
          onOpenCardSet={handleOpenCardSet}
          showToolbar={showLibraryToolbar}
        />
      ) : null}
    </SectionListBlankPane>
  );
};



export { SectionListColumnPane };
