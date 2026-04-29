import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ExplorerChromeCardIcon,
  ExplorerChromeCardSetIcon,
  ExplorerChromeFolderIcon,
  ExplorerChromePdfIcon,
} from "@/components/explorer/icons";
import { FolderDetailView } from "@/components/folder/components/FolderDetailView";
import { FolderListView } from "@/components/folder/components/FolderListView";
import { SectionListBlankPane } from "@/components/folder/components/SectionListBlankPane";
import type { BreadcrumbCrumb } from "@/features/breadcrumbs/types";
import { useExplorerStore } from "@/hooks/folder/useExplorerStore";
import { cn } from "@/lib/utils";
import type {
  Card,
  CardSet,
  DocumentItem,
  Folder,
  SelectedExplorerItem,
} from "@/types";
import { ChevronRight } from "@/ui/icons";

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
  isDeleted?: boolean;
  is_deleted?: boolean;
  isHidden?: boolean;
  is_hidden?: boolean;
  orderIndex?: number;
  order_index?: number;
  updatedAt?: unknown;
  createdAt?: unknown;
};

type ExternalPathSelectionSnapshot = {
  resetToken: number;
  selectedFolderId: string | null;
};

type ControlledColumnContext =
  | { type: "folder"; id: string | null; key: string }
  | { type: "cardSet"; id: string; key: string };

type ControlledColumnEntry =
  | {
      kind: "folder";
      id: string;
      label: string;
      count: number;
      hasNextColumn: boolean;
    }
  | {
      kind: "cardSet";
      id: string;
      label: string;
      count: number;
      hasNextColumn: boolean;
    }
  | {
      kind: "document";
      id: string;
      label: string;
    }
  | {
      kind: "card";
      id: string;
      label: string;
    };

interface ControlledColumnViewProps {
  folders: Folder[];
  cards: Card[];
  cardSets: CardSet[];
  documents: DocumentItem[];
  folderPathIds: string[];
  activeCardSetId: string | null;
  selectedItem: SelectedExplorerItem;
  isFiltering: boolean;
  onFolderPathChange: (folderPathIds: string[]) => void;
  onCardSetOpen: (cardSetId: string | null) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
}

const EXPLORER_COLUMN_PATH_CHANGE_EVENT =
  "manifolia:explorer-column-path-change";
const EXPLORER_COLUMN_PATH_NAVIGATE_EVENT =
  "manifolia:explorer-column-path-navigate";
const ROOT_FOLDER_KEY = "__root__";
const DEFAULT_COLUMN_WIDTH_PX = 280;

const CONTROLLED_COLUMN_STYLE = {
  flex: `0 0 ${DEFAULT_COLUMN_WIDTH_PX}px`,
  width: DEFAULT_COLUMN_WIDTH_PX,
  minWidth: DEFAULT_COLUMN_WIDTH_PX,
} satisfies CSSProperties;

const CONTROLLED_COLUMN_ROW_STYLE = {
  height: 28,
  minHeight: 28,
  lineHeight: "28px",
} satisfies CSSProperties;

const normalizeFolderParentId = (folder: FolderLike): string | null => {
  return folder.parentFolderId ?? folder.parent_folder_id ?? null;
};

const getFolderLabel = (folder: FolderLike): string => {
  return folder.folderName ?? folder.folder_name ?? "無題のフォルダ";
};

const getFolderOrderIndex = (folder: FolderLike): number => {
  return folder.orderIndex ?? folder.order_index ?? Number.MAX_SAFE_INTEGER;
};

const isSoftDeleted = (
  entity?: { isDeleted?: boolean; is_deleted?: boolean } | null,
): boolean => Boolean(entity?.isDeleted ?? entity?.is_deleted);

const isFolderHidden = (folder: FolderLike): boolean => {
  return Boolean(folder.isHidden ?? folder.is_hidden);
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

const getCardFileLabel = (card: Card): string => {
  const baseLabel = getCardLabel(card);
  return baseLabel.endsWith(".mfcard") ? baseLabel : `${baseLabel}.mfcard`;
};

const getOrderIndex = (entity: { orderIndex?: number }): number => {
  return entity.orderIndex ?? Number.MAX_SAFE_INTEGER;
};

const getFolderKey = (folderId: string | null): string => {
  return folderId ?? ROOT_FOLDER_KEY;
};

const compareLabels = (left: string, right: string): number => {
  return left.localeCompare(right, "ja", {
    numeric: true,
    sensitivity: "base",
  });
};

const compareFolders = (left: FolderLike, right: FolderLike): number => {
  const leftOrder = getFolderOrderIndex(left);
  const rightOrder = getFolderOrderIndex(right);
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return compareLabels(getFolderLabel(left), getFolderLabel(right));
};

const compareCardSets = (left: CardSet, right: CardSet): number => {
  const leftOrder = getOrderIndex(left);
  const rightOrder = getOrderIndex(right);
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return compareLabels(getCardSetLabel(left), getCardSetLabel(right));
};

const compareDocuments = (left: DocumentItem, right: DocumentItem): number => {
  const leftOrder = getOrderIndex(left);
  const rightOrder = getOrderIndex(right);
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return compareLabels(getDocumentLabel(left), getDocumentLabel(right));
};

const compareCards = (left: Card, right: Card): number => {
  const leftOrder = getOrderIndex(left);
  const rightOrder = getOrderIndex(right);
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return compareLabels(getCardFileLabel(left), getCardFileLabel(right));
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

  delete (window as ExplorerColumnPathWindow)
    .__manifoliaExplorerColumnPathCrumbs;

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

const isEntrySelected = (
  entry: ControlledColumnEntry,
  selectedItem: SelectedExplorerItem,
  selectedFolderId: string | null,
  activeCardSetId: string | null,
): boolean => {
  if (entry.kind === "folder") return entry.id === selectedFolderId;
  if (entry.kind === "cardSet") return entry.id === activeCardSetId;
  if (!selectedItem || !("id" in selectedItem)) return false;
  return selectedItem.type === entry.kind && selectedItem.id === entry.id;
};

const ControlledColumnRow = ({
  entry,
  selected,
  onSelect,
}: {
  entry: ControlledColumnEntry;
  selected: boolean;
  onSelect: () => void;
}) => {
  const Icon =
    entry.kind === "folder"
      ? ExplorerChromeFolderIcon
      : entry.kind === "cardSet"
        ? ExplorerChromeCardSetIcon
        : entry.kind === "card"
          ? ExplorerChromeCardIcon
          : ExplorerChromePdfIcon;

  const contentCount =
    entry.kind === "folder" || entry.kind === "cardSet"
      ? entry.count
      : undefined;

  const hasNextColumn =
    (entry.kind === "folder" || entry.kind === "cardSet") &&
    entry.hasNextColumn;

  return (
    <div
      role="button"
      tabIndex={0}
      data-selected={selected ? "true" : undefined}
      style={CONTROLLED_COLUMN_ROW_STYLE}
      className={cn(
        "sidebar-row sidebar-row--folder ds-list-item ds-list-item--interactive",
        "relative flex w-full cursor-pointer items-center rounded-[8px] px-2 text-left",
        "select-none outline-none",
        selected && "ds-list-item--selected",
      )}
      onClick={(event) => {
        if (event.defaultPrevented) return;
        onSelect();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <span className="ds-list-item__icon flex h-full w-4 shrink-0 items-center justify-center">
        <Icon className="h-3.5 w-3.5" />
      </span>

      <div className="ds-list-item__content flex h-full min-w-0 flex-1 items-center pr-1">
        <div className="pointer-events-none flex min-w-0 flex-1 items-center">
          <span className="ds-list-item__title truncate text-[13px] font-normal">
            {entry.label}
          </span>
        </div>

        {typeof contentCount === "number" || hasNextColumn ? (
          <span className="ml-auto flex h-full shrink-0 items-center gap-1 pr-1">
            {typeof contentCount === "number" ? (
              <span className="ds-list-item__subtitle shrink-0 text-[11px] font-normal tabular-nums leading-none opacity-60">
                {contentCount}
              </span>
            ) : null}
            {hasNextColumn ? (
              <ChevronRight className="sidebar-icon ds-list-item__icon h-3.5 w-3.5" />
            ) : null}
          </span>
        ) : null}
      </div>
    </div>
  );
};

const ControlledColumnView = ({
  folders,
  cards,
  cardSets,
  documents,
  folderPathIds,
  activeCardSetId,
  selectedItem,
  isFiltering,
  onFolderPathChange,
  onCardSetOpen,
  onItemSelect,
}: ControlledColumnViewProps) => {
  void isFiltering;

  const activeFolders = useMemo(
    () =>
      folders
        .filter((folder) => !isSoftDeleted(folder) && !isFolderHidden(folder))
        .map((folder) => folder as FolderLike),
    [folders],
  );

  const childFoldersByParentKey = useMemo(() => {
    const map = new Map<string, FolderLike[]>();

    activeFolders.forEach((folder) => {
      const parentKey = getFolderKey(normalizeFolderParentId(folder));
      const siblings = map.get(parentKey) ?? [];
      siblings.push(folder);
      map.set(parentKey, siblings);
    });

    for (const siblings of map.values()) {
      siblings.sort(compareFolders);
    }

    return map;
  }, [activeFolders]);

  const activeCardSets = useMemo(
    () => cardSets.filter((cardSet) => !isSoftDeleted(cardSet)),
    [cardSets],
  );

  const cardSetsByFolderKey = useMemo(() => {
    const map = new Map<string, CardSet[]>();

    activeCardSets.forEach((cardSet) => {
      const folderKey = getFolderKey(getCardSetFolderId(cardSet));
      const siblings = map.get(folderKey) ?? [];
      siblings.push(cardSet);
      map.set(folderKey, siblings);
    });

    for (const siblings of map.values()) {
      siblings.sort(compareCardSets);
    }

    return map;
  }, [activeCardSets]);

  const documentsByFolderKey = useMemo(() => {
    const map = new Map<string, DocumentItem[]>();

    documents.forEach((document) => {
      if (document.kind !== "pdf") return;
      if (isSoftDeleted(document)) return;

      const folderKey = getFolderKey(getDocumentFolderId(document));
      const siblings = map.get(folderKey) ?? [];
      siblings.push(document);
      map.set(folderKey, siblings);
    });

    for (const siblings of map.values()) {
      siblings.sort(compareDocuments);
    }

    return map;
  }, [documents]);

  const cardsByCardSetId = useMemo(() => {
    const map = new Map<string, Card[]>();

    cards.forEach((card) => {
      if (isSoftDeleted(card)) return;
      const cardSetId = getCardCardSetId(card);
      if (!cardSetId) return;

      const siblings = map.get(cardSetId) ?? [];
      siblings.push(card);
      map.set(cardSetId, siblings);
    });

    for (const siblings of map.values()) {
      siblings.sort(compareCards);
    }

    return map;
  }, [cards]);

  const getFolderDirectCount = useCallback(
    (folderId: string | null) => {
      const folderKey = getFolderKey(folderId);
      return (
        (childFoldersByParentKey.get(folderKey)?.length ?? 0) +
        (cardSetsByFolderKey.get(folderKey)?.length ?? 0) +
        (documentsByFolderKey.get(folderKey)?.length ?? 0)
      );
    },
    [childFoldersByParentKey, cardSetsByFolderKey, documentsByFolderKey],
  );

  const columns = useMemo<ControlledColumnContext[]>(() => {
    const folderColumns: ControlledColumnContext[] = [
      { type: "folder", id: null, key: "folder:__root__" },
      ...folderPathIds.map((folderId) => ({
        type: "folder" as const,
        id: folderId,
        key: `folder:${folderId}`,
      })),
    ];

    if (!activeCardSetId) return folderColumns;

    return [
      ...folderColumns,
      {
        type: "cardSet",
        id: activeCardSetId,
        key: `cardSet:${activeCardSetId}`,
      },
    ];
  }, [activeCardSetId, folderPathIds]);

  const getEntriesForColumn = useCallback(
    (column: ControlledColumnContext): ControlledColumnEntry[] => {
      if (column.type === "cardSet") {
        return (cardsByCardSetId.get(column.id) ?? []).map((card) => ({
          kind: "card",
          id: card.id,
          label: getCardFileLabel(card),
        }));
      }

      const folderKey = getFolderKey(column.id);
      const folderEntries: ControlledColumnEntry[] = (
        childFoldersByParentKey.get(folderKey) ?? []
      ).map((folder) => {
        const count = getFolderDirectCount(folder.id);
        return {
          kind: "folder",
          id: folder.id,
          label: getFolderLabel(folder),
          count,
          hasNextColumn: count > 0,
        };
      });

      const cardSetEntries: ControlledColumnEntry[] = (
        cardSetsByFolderKey.get(folderKey) ?? []
      ).map((cardSet) => {
        const count = cardsByCardSetId.get(cardSet.id)?.length ?? 0;
        return {
          kind: "cardSet",
          id: cardSet.id,
          label: getCardSetLabel(cardSet),
          count,
          hasNextColumn: count > 0,
        };
      });

      const documentEntries: ControlledColumnEntry[] = (
        documentsByFolderKey.get(folderKey) ?? []
      ).map((document) => ({
        kind: "document",
        id: document.id,
        label: getDocumentLabel(document),
      }));

      return [...folderEntries, ...cardSetEntries, ...documentEntries];
    },
    [
      cardsByCardSetId,
      cardSetsByFolderKey,
      childFoldersByParentKey,
      documentsByFolderKey,
      getFolderDirectCount,
    ],
  );

  const handleEntrySelect = useCallback(
    (entry: ControlledColumnEntry, columnIndex: number) => {
      if (entry.kind === "folder") {
        onFolderPathChange([...folderPathIds.slice(0, columnIndex), entry.id]);
        return;
      }

      if (entry.kind === "cardSet") {
        onCardSetOpen(entry.id);
        return;
      }

      if (entry.kind === "document") {
        onItemSelect({ type: "document", id: entry.id });
        return;
      }

      onItemSelect({ type: "card", id: entry.id });
    },
    [folderPathIds, onCardSetOpen, onFolderPathChange, onItemSelect],
  );

  return (
    <div className="h-full min-h-0 w-full overflow-x-auto overflow-y-hidden">
      <div className="flex h-full min-w-max items-stretch">
        {columns.map((column, columnIndex) => {
          const selectedFolderInColumn = folderPathIds[columnIndex] ?? null;
          const entries = getEntriesForColumn(column);

          return (
            <section
              key={column.key}
              aria-label={
                column.type === "folder" ? "フォルダ列" : "カードセット列"
              }
              className="h-full min-h-0 overflow-y-auto border-r border-[#e6e4dc] bg-white px-2 py-3"
              style={CONTROLLED_COLUMN_STYLE}
            >
              <div className="space-y-0.5">
                {entries.map((entry) => (
                  <ControlledColumnRow
                    key={`${entry.kind}:${entry.id}`}
                    entry={entry}
                    selected={isEntrySelected(
                      entry,
                      selectedItem,
                      selectedFolderInColumn,
                      activeCardSetId,
                    )}
                    onSelect={() => handleEntrySelect(entry, columnIndex)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        <div className="min-w-[160px] flex-1 bg-white" />
      </div>
    </div>
  );
};

/**
 * セクション一覧モードの右側パネル。
 * 表示モードに応じて Finder 風カラムビュー、Explorer 風一覧ビュー、詳細リストビューを切り替える。
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
  const explorerLayoutMode = useExplorerStore(
    (state) => state.explorerLayoutMode,
  );

  // 詳細/カラム/一覧ペイン内のフォルダ移動は右側ペインだけで完結させる。
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
  const [activeLeafCrumbs, setActiveLeafCrumbs] = useState<BreadcrumbCrumb[]>(
    [],
  );
  const externalPathSelectionRef = useRef<ExternalPathSelectionSnapshot>({
    resetToken,
    selectedFolderId,
  });
  const syncedSelectedItemKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const previous = externalPathSelectionRef.current;
    const resetChanged = previous.resetToken !== resetToken;
    const selectedFolderChanged =
      previous.selectedFolderId !== selectedFolderId;

    externalPathSelectionRef.current = { resetToken, selectedFolderId };

    if (!resetChanged && !selectedFolderChanged) {
      return;
    }

    setColumnPathIds(buildFolderPathIds(selectedFolderId));
    setDetailCardSetId(null);
    setActiveLeafCrumbs([]);
  }, [buildFolderPathIds, resetToken, selectedFolderId]);

  useEffect(() => {
    setDetailCardSetId(selectedCardSetId);
    if (selectedCardSetId) {
      const cardSet = cardSetById.get(selectedCardSetId);
      if (cardSet) {
        setActiveLeafCrumbs([{ label: getCardSetLabel(cardSet) }]);
      }
      return;
    }

    setActiveLeafCrumbs([]);
  }, [cardSetById, selectedCardSetId]);

  useEffect(() => {
    dispatchExplorerColumnPathChange([
      ...buildFolderCrumbs(columnPathIds),
      ...activeLeafCrumbs,
    ]);
  }, [activeLeafCrumbs, buildFolderCrumbs, columnPathIds]);

  useEffect(() => {
    return () => {
      dispatchExplorerColumnPathInactive();
    };
  }, []);

  const setFolderPathForPane = useCallback((folderPathIds: string[]) => {
    setDetailCardSetId(null);
    setActiveLeafCrumbs([]);
    setColumnPathIds(folderPathIds);
  }, []);

  const handleDetailFolderOpen = useCallback(
    (folderId: string) => {
      setFolderPathForPane(buildFolderPathIds(folderId));
    },
    [buildFolderPathIds, setFolderPathForPane],
  );

  const handleDetailCardSetOpen = useCallback(
    (cardSetId: string | null) => {
      if (!cardSetId) {
        setDetailCardSetId(null);
        setActiveLeafCrumbs([]);
        return;
      }

      const cardSet = cardSetById.get(cardSetId);
      if (!cardSet) return;

      const folderPathIds = buildFolderPathIds(getCardSetFolderId(cardSet));
      setDetailCardSetId(cardSetId);
      setActiveLeafCrumbs([{ label: getCardSetLabel(cardSet) }]);
      setColumnPathIds(folderPathIds);
    },
    [buildFolderPathIds, cardSetById],
  );

  const handleItemSelect = useCallback(
    (item: SelectedExplorerItem) => {
      if (item?.type === "cardSet") {
        const cardSet = cardSetById.get(item.id);
        const folderPathIds = buildFolderPathIds(
          cardSet ? getCardSetFolderId(cardSet) : null,
        );
        setDetailCardSetId(item.id);
        setActiveLeafCrumbs(
          cardSet ? [{ label: getCardSetLabel(cardSet) }] : [],
        );
        setColumnPathIds(folderPathIds);
        return;
      }

      if (item?.type === "document") {
        const documentItem = documents.find(
          (document) => document.id === item.id,
        );
        const folderPathIds = buildFolderPathIds(
          documentItem ? getDocumentFolderId(documentItem) : null,
        );
        setDetailCardSetId(null);
        setActiveLeafCrumbs(
          documentItem ? [{ label: getDocumentLabel(documentItem) }] : [],
        );
        setColumnPathIds(folderPathIds);
        onItemSelect(item);
        return;
      }

      if (item?.type === "card") {
        const card = cards.find((candidate) => candidate.id === item.id);
        const folderPathIds = buildFolderPathIds(
          card ? getCardFolderId(card, cardSetById) : null,
        );
        const cardSet = card ? getCardSetByCard(card, cardSetById) : null;
        const leafCrumbs: BreadcrumbCrumb[] = [];

        if (cardSet) {
          leafCrumbs.push({ label: getCardSetLabel(cardSet) });
        }

        if (card) {
          leafCrumbs.push({ label: getCardLabel(card) });
        }

        setDetailCardSetId(cardSet?.id ?? null);
        setActiveLeafCrumbs(leafCrumbs);
        setColumnPathIds(folderPathIds);
        onItemSelect(item);
        return;
      }

      onItemSelect(item);
    },
    [buildFolderPathIds, cardSetById, cards, documents, onItemSelect],
  );

  useEffect(() => {
    const selectedItemKey = getSelectedItemKey(selectedItem);

    if (syncedSelectedItemKeyRef.current === selectedItemKey) {
      return;
    }

    syncedSelectedItemKeyRef.current = selectedItemKey;

    if (selectedItem?.type === "cardSet") {
      const cardSet = cardSetById.get(selectedItem.id);
      if (!cardSet) return;

      const folderPathIds = buildFolderPathIds(getCardSetFolderId(cardSet));
      setDetailCardSetId(selectedItem.id);
      setActiveLeafCrumbs([{ label: getCardSetLabel(cardSet) }]);
      setColumnPathIds(folderPathIds);
      return;
    }

    if (selectedItem?.type === "document") {
      const documentItem = documents.find(
        (document) => document.id === selectedItem.id,
      );
      if (!documentItem) return;

      const folderPathIds = buildFolderPathIds(
        getDocumentFolderId(documentItem),
      );
      setDetailCardSetId(null);
      setActiveLeafCrumbs([{ label: getDocumentLabel(documentItem) }]);
      setColumnPathIds(folderPathIds);
      return;
    }

    if (selectedItem?.type === "card") {
      const card = cards.find((candidate) => candidate.id === selectedItem.id);
      if (!card) return;

      const cardSet = getCardSetByCard(card, cardSetById);
      const folderPathIds = buildFolderPathIds(
        getCardFolderId(card, cardSetById),
      );
      const leafCrumbs: BreadcrumbCrumb[] = [];

      if (cardSet) {
        leafCrumbs.push({ label: getCardSetLabel(cardSet) });
      }

      leafCrumbs.push({ label: getCardLabel(card) });

      setDetailCardSetId(cardSet?.id ?? null);
      setActiveLeafCrumbs(leafCrumbs);
      setColumnPathIds(folderPathIds);
    }
  }, [buildFolderPathIds, cardSetById, cards, documents, selectedItem]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleColumnPathNavigate = (event: Event) => {
      const customEvent =
        event as CustomEvent<ExplorerColumnPathNavigateEventDetail>;
      const folderId = customEvent.detail?.folderId ?? null;
      setFolderPathForPane(buildFolderPathIds(folderId));
    };

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
  }, [buildFolderPathIds, setFolderPathForPane]);

  const currentFolderId = columnPathIds[columnPathIds.length - 1] ?? null;

  return (
    <SectionListBlankPane
      className={className}
      sidebarWidth={sidebarWidth}
      topOffsetPx={topOffsetPx}
      leftInsetPx={leftInsetPx}
      rightInsetPx={rightInsetPx}
    >
      {explorerLayoutMode === "column" ? (
        <ControlledColumnView
          folders={folders}
          cards={cards}
          cardSets={cardSets}
          documents={documents}
          folderPathIds={columnPathIds}
          activeCardSetId={detailCardSetId}
          selectedItem={selectedItem}
          isFiltering={isFiltering}
          onFolderPathChange={setFolderPathForPane}
          onCardSetOpen={handleDetailCardSetOpen}
          onItemSelect={handleItemSelect}
        />
      ) : explorerLayoutMode === "list" ? (
        <FolderListView
          folders={folders}
          cards={cards}
          cardSets={cardSets}
          documents={documents}
          currentFolderId={currentFolderId}
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
        <FolderDetailView
          folders={folders}
          cards={cards}
          cardSets={cardSets}
          documents={documents}
          currentFolderId={currentFolderId}
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
      )}
    </SectionListBlankPane>
  );
};
