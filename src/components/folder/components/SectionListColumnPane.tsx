import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { FolderColumnView } from "@/components/folder/components/FolderColumnView";
import { FolderDetailView } from "@/components/folder/components/FolderDetailView";
import { SectionListBlankPane } from "@/components/folder/components/SectionListBlankPane";
import type { FolderTreeNode } from "@/components/folder/explorer/model/utils";
import type { BreadcrumbCrumb } from "@/features/breadcrumbs/types";
import { useExplorerStore } from "@/hooks/folder/useExplorerStore";
import type {
  Card,
  CardSet,
  DocumentItem,
  Folder,
  SelectedExplorerItem,
} from "@/types";

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
  __manifoliaExplorerColumnPathCrumbs?: BreadcrumbCrumb[];
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

type ColumnFolderEntry = {
  kind: "folder";
  id: string;
  label: string;
};

const EXPLORER_COLUMN_PATH_CHANGE_EVENT =
  "manifolia:explorer-column-path-change";
const EXPLORER_COLUMN_PATH_NAVIGATE_EVENT =
  "manifolia:explorer-column-path-navigate";
const ROOT_FOLDER_KEY = "__root__";
const DEFAULT_COLUMN_WIDTH_PX = 280;

const normalizeFolderParentId = (folder: FolderLike): string | null => {
  return folder.parentFolderId ?? folder.parent_folder_id ?? null;
};

const getFolderLabel = (folder: FolderLike): string => {
  return folder.folderName ?? folder.folder_name ?? "無題のフォルダ";
};

const getCardSetFolderId = (cardSet: CardSet): string | null => {
  return (
    cardSet.folderId ??
    (cardSet as unknown as { folder_id?: string | null }).folder_id ??
    null
  );
};

const getCardSetLabel = (cardSet: CardSet): string => {
  const baseLabel = cardSet.name?.trim() || "無題のセット";
  return baseLabel.endsWith(".mfdeck") ? baseLabel : `${baseLabel}.mfdeck`;
};

const getDocumentFolderId = (document: DocumentItem): string | null => {
  return (
    document.folderId ??
    (document as unknown as { folder_id?: string | null }).folder_id ??
    null
  );
};

const getDocumentLabel = (document: DocumentItem): string => {
  return document.title?.trim() || document.fileName?.trim() || "無題の文書";
};

const getCardCardSetId = (card: Card): string | null => {
  return (
    card.cardSetId ??
    (card as unknown as { card_set_id?: string | null }).card_set_id ??
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
    (card as unknown as { folderId?: string | null }).folderId ??
    (card as unknown as { folder_id?: string | null }).folder_id ??
    null;
  if (directFolderId) return directFolderId;

  const cardSet = getCardSetByCard(card, cardSetById);
  return cardSet ? getCardSetFolderId(cardSet) : null;
};

const getCardLabel = (card: Card): string => {
  const title = card.title?.trim();
  if (title) return title;

  const questionNumber =
    (card as unknown as { questionNumber?: string | null }).questionNumber ??
    (card as unknown as { question_number?: string | null }).question_number ??
    null;

  return questionNumber?.trim() || "無題のカード";
};

const normalizeLabel = (label: string): string => {
  return label.replace(/\s+/g, " ").trim();
};

const buildFolderRoute = (folderId: string): string => {
  const searchParams = new URLSearchParams();
  searchParams.set("folderId", folderId);
  return `/folders?${searchParams.toString()}`;
};

const dispatchExplorerColumnPathChange = (crumbs: BreadcrumbCrumb[]) => {
  if (typeof window === "undefined") return;

  const stableCrumbs = crumbs.map((crumb) => ({ ...crumb }));
  (window as ExplorerColumnPathWindow).__manifoliaExplorerColumnPathCrumbs =
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

  delete (window as ExplorerColumnPathWindow).__manifoliaExplorerColumnPathCrumbs;

  window.dispatchEvent(
    new CustomEvent<ExplorerColumnPathChangeEventDetail>(
      EXPLORER_COLUMN_PATH_CHANGE_EVENT,
      {
        detail: { crumbs: [], active: false },
      },
    ),
  );
};

const getFolderKey = (folderId: string | null): string => {
  return folderId ?? ROOT_FOLDER_KEY;
};

const getFocusableColumnRows = (root: HTMLElement): HTMLElement[] => {
  return Array.from(root.querySelectorAll<HTMLElement>("[role='button']")).filter(
    (row) => root.contains(row),
  );
};

const getLikelyColumnNodes = (root: HTMLElement): HTMLElement[] => {
  const sections = Array.from(root.querySelectorAll<HTMLElement>("section"))
    .filter((section) => root.contains(section))
    .filter((section) => getFocusableColumnRows(section).length > 0);

  if (sections.length > 0) return sections;

  return Array.from(root.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && getFocusableColumnRows(child).length > 0,
  );
};

const resolveClickedColumnIndex = (
  root: HTMLElement,
  row: HTMLElement,
): number => {
  const columnNodes = getLikelyColumnNodes(root);
  const owningColumnIndex = columnNodes.findIndex((columnNode) =>
    columnNode.contains(row),
  );

  if (owningColumnIndex >= 0) return owningColumnIndex;

  const rootRect = root.getBoundingClientRect();
  const rowRect = row.getBoundingClientRect();
  return Math.max(
    0,
    Math.floor((rowRect.left - rootRect.left) / DEFAULT_COLUMN_WIDTH_PX),
  );
};

const resolveClickedRowLabel = (row: HTMLElement): string => {
  const spanLabels = Array.from(row.querySelectorAll("span"))
    .map((span) => normalizeLabel(span.textContent ?? ""))
    .filter(Boolean)
    .filter((label) => !/^\d+$/.test(label))
    .filter((label) => label !== "›" && label !== ">")
    .sort((left, right) => right.length - left.length);

  if (spanLabels.length > 0) return spanLabels[0];

  return normalizeLabel(row.textContent ?? "");
};

/**
 * セクション一覧モードの右側パネル。
 * 表示モードに応じて Finder 風カラムビューと詳細リストビューを切り替える。
 */
export const SectionListColumnPane = ({
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
  const contentRef = useRef<HTMLDivElement | null>(null);
  const explorerLayoutMode = useExplorerStore(
    (state) => state.explorerLayoutMode,
  );

  // 詳細ビュー内のフォルダ移動は右側ペインだけで完結させる。
  // 親の folder selection に同期すると、セクション一覧サイドバーまで遷移してしまう。
  void onFolderSelect;

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

  const childFoldersByParentKey = useMemo(() => {
    const map = new Map<string, FolderLike[]>();

    folders.forEach((folder) => {
      const folderLike = folder as FolderLike;
      const parentKey = getFolderKey(normalizeFolderParentId(folderLike));
      const siblings = map.get(parentKey) ?? [];
      siblings.push(folderLike);
      map.set(parentKey, siblings);
    });

    return map;
  }, [folders]);

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
      return folderIds
        .map((folderId) => {
          const folder = folderById.get(folderId);
          if (!folder) return null;

          return {
            label: getFolderLabel(folder),
            to: buildFolderRoute(folderId),
            folderId,
          } satisfies BreadcrumbCrumb;
        })
        .filter((crumb): crumb is BreadcrumbCrumb => crumb !== null);
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
  const [detailCardSetId, setDetailCardSetId] = useState<string | null>(
    selectedCardSetId,
  );

  useEffect(() => {
    setColumnPathIds(selectedFolderPathIds);
    setDetailCardSetId(null);
  }, [resetToken, selectedFolderPathIds]);

  useEffect(() => {
    setDetailCardSetId(selectedCardSetId);
  }, [selectedCardSetId]);

  useEffect(() => {
    dispatchExplorerColumnPathChange(buildFolderCrumbs(columnPathIds));
  }, [buildFolderCrumbs, columnPathIds]);

  useEffect(() => {
    return () => {
      dispatchExplorerColumnPathInactive();
    };
  }, []);

  const getFolderEntriesForColumn = useCallback(
    (columnIndex: number): ColumnFolderEntry[] => {
      const parentFolderId =
        columnIndex === 0 ? null : (columnPathIds[columnIndex - 1] ?? null);
      const foldersInColumn =
        childFoldersByParentKey.get(getFolderKey(parentFolderId)) ?? [];

      return foldersInColumn.map((folder) => ({
        kind: "folder",
        id: folder.id,
        label: getFolderLabel(folder),
      }));
    },
    [childFoldersByParentKey, columnPathIds],
  );

  const handleColumnClickCapture = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const root = contentRef.current;
      if (!root) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const row = target.closest<HTMLElement>("[role='button']");
      if (!row || !root.contains(row)) return;

      const columnIndex = resolveClickedColumnIndex(root, row);
      const rowLabel = resolveClickedRowLabel(row);
      if (!rowLabel) return;

      const entries = getFolderEntriesForColumn(columnIndex);
      const clickedFolder = entries.find(
        (entry) => normalizeLabel(entry.label) === rowLabel,
      );

      if (!clickedFolder) return;

      setColumnPathIds((previousPathIds) => [
        ...previousPathIds.slice(0, columnIndex),
        clickedFolder.id,
      ]);
    },
    [getFolderEntriesForColumn],
  );

  const handleDetailFolderOpen = useCallback(
    (folderId: string) => {
      const folderPathIds = buildFolderPathIds(folderId);
      setDetailCardSetId(null);
      setColumnPathIds(folderPathIds);
      dispatchExplorerColumnPathChange(buildFolderCrumbs(folderPathIds));
    },
    [buildFolderCrumbs, buildFolderPathIds],
  );

  const handleDetailCardSetOpen = useCallback(
    (cardSetId: string | null) => {
      if (!cardSetId) {
        setDetailCardSetId(null);
        dispatchExplorerColumnPathChange(buildFolderCrumbs(columnPathIds));
        return;
      }

      const cardSet = cardSetById.get(cardSetId);
      if (!cardSet) return;

      const folderPathIds = buildFolderPathIds(getCardSetFolderId(cardSet));
      const crumbs = buildFolderCrumbs(folderPathIds);
      crumbs.push({ label: getCardSetLabel(cardSet) });
      setDetailCardSetId(cardSetId);
      setColumnPathIds(folderPathIds);
      dispatchExplorerColumnPathChange(crumbs);
    },
    [buildFolderCrumbs, buildFolderPathIds, cardSetById, columnPathIds],
  );

  const handleItemSelect = useCallback(
    (item: SelectedExplorerItem) => {
      if (item?.type === "cardSet") {
        const cardSet = cardSetById.get(item.id);
        const folderPathIds = buildFolderPathIds(
          cardSet ? getCardSetFolderId(cardSet) : null,
        );
        const crumbs = buildFolderCrumbs(folderPathIds);

        if (cardSet) {
          crumbs.push({ label: getCardSetLabel(cardSet) });
        }

        setDetailCardSetId(item.id);
        setColumnPathIds(folderPathIds);
        dispatchExplorerColumnPathChange(crumbs);
      }

      if (item?.type === "document") {
        const documentItem = documents.find((document) => document.id === item.id);
        const folderPathIds = buildFolderPathIds(
          documentItem ? getDocumentFolderId(documentItem) : null,
        );
        const crumbs = buildFolderCrumbs(folderPathIds);

        if (documentItem) {
          crumbs.push({ label: getDocumentLabel(documentItem) });
        }

        setDetailCardSetId(null);
        setColumnPathIds(folderPathIds);
        dispatchExplorerColumnPathChange(crumbs);
      }

      if (item?.type === "card") {
        const card = cards.find((candidate) => candidate.id === item.id);
        const folderPathIds = buildFolderPathIds(
          card ? getCardFolderId(card, cardSetById) : null,
        );
        const crumbs = buildFolderCrumbs(folderPathIds);
        const cardSet = card ? getCardSetByCard(card, cardSetById) : null;

        if (cardSet) {
          crumbs.push({ label: getCardSetLabel(cardSet) });
        }

        if (card) {
          crumbs.push({ label: getCardLabel(card) });
        }

        setDetailCardSetId(cardSet?.id ?? null);
        setColumnPathIds(folderPathIds);
        dispatchExplorerColumnPathChange(crumbs);
      }

      onItemSelect(item);
    },
    [
      buildFolderCrumbs,
      buildFolderPathIds,
      cardSetById,
      cards,
      documents,
      onItemSelect,
    ],
  );

  useEffect(() => {
    if (selectedItem?.type === "cardSet") {
      const cardSet = cardSetById.get(selectedItem.id);
      if (!cardSet) return;

      const folderPathIds = buildFolderPathIds(getCardSetFolderId(cardSet));
      const crumbs = buildFolderCrumbs(folderPathIds);
      crumbs.push({ label: getCardSetLabel(cardSet) });
      setDetailCardSetId(selectedItem.id);
      dispatchExplorerColumnPathChange(crumbs);
      return;
    }

    if (selectedItem?.type === "document") {
      const documentItem = documents.find(
        (document) => document.id === selectedItem.id,
      );
      if (!documentItem) return;

      const folderPathIds = buildFolderPathIds(getDocumentFolderId(documentItem));
      const crumbs = buildFolderCrumbs(folderPathIds);
      crumbs.push({ label: getDocumentLabel(documentItem) });
      setDetailCardSetId(null);
      dispatchExplorerColumnPathChange(crumbs);
      return;
    }

    if (selectedItem?.type === "card") {
      const card = cards.find((candidate) => candidate.id === selectedItem.id);
      if (!card) return;

      const folderPathIds = buildFolderPathIds(
        getCardFolderId(card, cardSetById),
      );
      const crumbs = buildFolderCrumbs(folderPathIds);
      const cardSet = getCardSetByCard(card, cardSetById);

      if (cardSet) {
        crumbs.push({ label: getCardSetLabel(cardSet) });
      }

      crumbs.push({ label: getCardLabel(card) });
      setDetailCardSetId(cardSet?.id ?? null);
      dispatchExplorerColumnPathChange(crumbs);
    }
  }, [
    buildFolderCrumbs,
    buildFolderPathIds,
    cardSetById,
    cards,
    documents,
    selectedItem,
  ]);

  useEffect(() => {
    const handleColumnPathNavigate = ((event: Event) => {
      const detail = (
        event as CustomEvent<ExplorerColumnPathNavigateEventDetail>
      ).detail;
      const folderId = detail?.folderId ?? null;
      const folderPathIds = buildFolderPathIds(folderId);

      setDetailCardSetId(null);
      setColumnPathIds(folderPathIds);
      dispatchExplorerColumnPathChange(buildFolderCrumbs(folderPathIds));
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
  }, [buildFolderCrumbs, buildFolderPathIds]);

  const currentPaneFolderId =
    columnPathIds.length > 0 ? columnPathIds[columnPathIds.length - 1] : null;
  const isDetailLayout = explorerLayoutMode === "detail";

  return (
    <SectionListBlankPane
      className={className}
      contentClassName="explorer-chrome-font p-0"
      sidebarWidth={sidebarWidth}
      topOffsetPx={topOffsetPx}
      leftInsetPx={leftInsetPx}
      rightInsetPx={rightInsetPx}
    >
      <div
        ref={contentRef}
        className="h-full min-h-0 w-full"
        onClickCapture={isDetailLayout ? undefined : handleColumnClickCapture}
      >
        {isDetailLayout ? (
          <FolderDetailView
            folders={folders}
            cards={cards}
            cardSets={cardSets}
            documents={documents}
            currentFolderId={currentPaneFolderId}
            selectedItem={selectedItem}
            currentCardSetId={detailCardSetId}
            onFolderOpen={handleDetailFolderOpen}
            onCardSetOpen={handleDetailCardSetOpen}
            onItemSelect={handleItemSelect}
            onMoveFolder={onMoveFolder}
            onReorderFolders={onReorderFolders}
            onMoveCardSetToFolder={onMoveCardSetToFolder}
            onReorderCardSets={onReorderCardSets}
            onMoveDocumentToFolder={onMoveDocumentToFolder}
            onReorderDocuments={onReorderDocuments}
            onMoveCardToSet={onMoveCardToSet}
            onReorderCardsInCardSet={onReorderCardsInCardSet}
          />
        ) : (
          <FolderColumnView
            folders={folders as unknown as FolderTreeNode[]}
            cards={cards}
            cardSets={cardSets}
            documents={documents}
            selectedFolderId={currentPaneFolderId}
            selectedItem={selectedItem}
            selectedCardSetId={selectedCardSetId}
            isFiltering={isFiltering}
            resetToken={resetToken}
            onItemSelect={handleItemSelect}
            onMoveFolder={onMoveFolder}
            onReorderFolders={onReorderFolders}
            onMoveCardSetToFolder={onMoveCardSetToFolder}
            onReorderCardSets={onReorderCardSets}
            onMoveDocumentToFolder={onMoveDocumentToFolder}
            onReorderDocuments={onReorderDocuments}
            onMoveCardToSet={onMoveCardToSet}
            onReorderCardsInCardSet={onReorderCardsInCardSet}
          />
        )}
      </div>
    </SectionListBlankPane>
  );
};
