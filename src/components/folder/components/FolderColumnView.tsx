import type { FolderTreeNode } from "@/components/folder/explorer/model/utils";
import {
  getFolderId,
  getParentFolderId,
  normalizeFolderId,
} from "@/components/folder/explorer/model/utils";
import { SidebarEntityRow } from "@/components/folder/explorer/rows/SidebarEntityRow";
import {
  EXPLORER_ROW_CONTENT_CLASS,
  EXPLORER_ROW_ICON_SLOT_CLASS,
  EXPLORER_ROW_TITLE_SLOT_CLASS,
  FOLDER_ROW_ICON_ACTIVE_CLASS,
  FOLDER_ROW_ICON_MUTED_CLASS,
  FOLDER_ROW_ICON_SIZE_CLASS,
  FOLDER_ROW_TITLE_CLASS,
} from "@/components/folder/explorer/rows/shared";
import { useExplorerDerivedData } from "@/components/folder/hooks/useExplorerDerivedData";
import { cn } from "@/lib/utils";
import type {
  Card,
  CardSet,
  DocumentItem,
  ExplorerItem,
  SelectedExplorerItem,
} from "@/types";
import { ChevronRight, FileText, FolderOutlineIcon, Layers } from "@/ui/icons";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type FolderColumnEntry =
  | {
      kind: "folder";
      id: string;
      name: string;
      folder: FolderTreeNode;
      contentCount: number;
      hasNextColumn: boolean;
    }
  | {
      kind: "cardSet";
      id: string;
      name: string;
      contentCount: number;
    }
  | {
      kind: "card" | "document";
      id: string;
      name: string;
    };

type FolderColumn = {
  id: string;
  parentFolderId: string | null;
  entries: FolderColumnEntry[];
};

interface FolderColumnViewProps {
  folders: FolderTreeNode[];
  cards: Card[];
  cardSets?: CardSet[];
  documents: DocumentItem[];
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  selectedCardSetId?: string | null;
  isFiltering?: boolean;
  resetToken?: number;
  onItemSelect: (item: SelectedExplorerItem) => void;
  className?: string;
}

interface FolderColumnRowProps {
  entry: FolderColumnEntry;
  selected: boolean;
  onSelect: () => void;
}

const FOLDER_COLUMN_WIDTH_STORAGE_KEY =
  "manifolia:folder-column-view:column-width";
const DEFAULT_FOLDER_COLUMN_WIDTH_PX = 280;
const MIN_FOLDER_COLUMN_WIDTH_PX = 180;
const MAX_FOLDER_COLUMN_WIDTH_PX = 520;

const clampFolderColumnWidth = (width: number) => {
  if (!Number.isFinite(width)) return DEFAULT_FOLDER_COLUMN_WIDTH_PX;

  return Math.min(
    Math.max(Math.round(width), MIN_FOLDER_COLUMN_WIDTH_PX),
    MAX_FOLDER_COLUMN_WIDTH_PX,
  );
};

const readStoredFolderColumnWidth = () => {
  if (typeof window === "undefined") {
    return DEFAULT_FOLDER_COLUMN_WIDTH_PX;
  }

  const storedWidth = window.localStorage.getItem(
    FOLDER_COLUMN_WIDTH_STORAGE_KEY,
  );
  const parsedWidth = Number.parseInt(storedWidth ?? "", 10);

  if (!Number.isFinite(parsedWidth)) {
    return DEFAULT_FOLDER_COLUMN_WIDTH_PX;
  }

  return clampFolderColumnWidth(parsedWidth);
};

const getFolderDisplayName = (folder: FolderTreeNode) => {
  return (
    (folder as { folderName?: string; folder_name?: string }).folderName ??
    (folder as { folderName?: string; folder_name?: string }).folder_name ??
    "無題のフォルダ"
  );
};

const getCardSetDisplayName = (cardSet: CardSet) => {
  return cardSet.name?.trim() || "無題のセット";
};

const getExplorerItemDisplayName = (item: ExplorerItem) => {
  if (item.type === "document") {
    return (
      item.data.title?.trim() ||
      item.data.fileName?.trim() ||
      "無題の文書"
    );
  }

  return (
    item.data.title?.trim() ||
    item.data.questionNumber?.trim() ||
    "無題のカード"
  );
};

const hasSelectedItemId = (
  item: SelectedExplorerItem,
): item is Extract<SelectedExplorerItem, { id: string }> => {
  return item !== null && "id" in item;
};

const areSameFolderPaths = (left: string[], right: string[]) => {
  if (left.length !== right.length) return false;
  return left.every((folderId, index) => folderId === right[index]);
};

const FolderColumnRow = ({
  entry,
  selected,
  onSelect,
}: FolderColumnRowProps) => {
  const Icon =
    entry.kind === "folder"
      ? FolderOutlineIcon
      : entry.kind === "cardSet"
        ? Layers
        : FileText;

  const contentCount =
    entry.kind === "folder" || entry.kind === "cardSet"
      ? entry.contentCount
      : undefined;

  const trailing =
    typeof contentCount === "number" || entry.kind === "folder" ? (
      <span className="ml-auto flex h-full shrink-0 items-center gap-1 pr-1">
        {typeof contentCount === "number" ? (
          <span className="ds-list-item__subtitle shrink-0 text-[11px] font-normal tabular-nums leading-none opacity-60">
            {contentCount}
          </span>
        ) : null}
        {entry.kind === "folder" && entry.hasNextColumn ? (
          <ChevronRight
            className={cn(
              "sidebar-icon ds-list-item__icon h-3.5 w-3.5",
              selected && FOLDER_ROW_ICON_ACTIVE_CLASS,
            )}
          />
        ) : null}
      </span>
    ) : null;

  return (
    <SidebarEntityRow
      selected={selected}
      contentClassName={EXPLORER_ROW_CONTENT_CLASS}
      iconClassName={EXPLORER_ROW_ICON_SLOT_CLASS}
      titleSlotClassName={EXPLORER_ROW_TITLE_SLOT_CLASS}
      title={entry.name}
      titleClassName={cn(
        FOLDER_ROW_TITLE_CLASS,
        selected ? "font-medium" : "font-normal",
      )}
      trailing={trailing}
      icon={
        <Icon
          className={cn(
            "sidebar-icon",
            FOLDER_ROW_ICON_SIZE_CLASS,
            selected
              ? FOLDER_ROW_ICON_ACTIVE_CLASS
              : FOLDER_ROW_ICON_MUTED_CLASS,
          )}
        />
      }
      role="button"
      tabIndex={0}
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
    />
  );
};

export const FolderColumnView = ({
  folders,
  cards,
  cardSets = [],
  documents,
  selectedFolderId,
  selectedItem,
  selectedCardSetId = null,
  isFiltering = false,
  resetToken = 0,
  onItemSelect,
  className,
}: FolderColumnViewProps) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const columnResizeStateRef = useRef<{
    startX: number;
    startWidth: number;
  } | null>(null);
  const pendingColumnWidthRef = useRef(readStoredFolderColumnWidth());
  const resizeAnimationFrameRef = useRef<number | null>(null);
  const previousBodyUserSelectRef = useRef("");
  const previousBodyCursorRef = useRef("");

  const [columnFolderPath, setColumnFolderPath] = useState<string[]>([]);
  const [columnWidthPx, setColumnWidthPx] = useState(
    readStoredFolderColumnWidth,
  );
  const [isColumnResizing, setIsColumnResizing] = useState(false);

  const derived = useExplorerDerivedData({
    treeFolders: folders,
    treeCards: cards,
    cardSets,
    documents,
    isFiltering,
  });

  const {
    rootFolders,
    getChildFolders,
    getFolderItems,
    getCardSets,
    getCardSetItems,
    matchCountMap,
    getFolderContentCount,
    visibleFolderIdSet,
  } = derived;

  const parentFolderIdById = useMemo(() => {
    const map = new Map<string, string | null>();

    for (const folder of folders) {
      const folderId = getFolderId(folder);
      if (!folderId || !visibleFolderIdSet.has(folderId)) continue;

      const parentFolderId = normalizeFolderId(getParentFolderId(folder));
      map.set(
        folderId,
        parentFolderId && visibleFolderIdSet.has(parentFolderId)
          ? parentFolderId
          : null,
      );
    }

    return map;
  }, [folders, visibleFolderIdSet]);

  const buildFolderPath = useCallback(
    (folderId: string | null | undefined) => {
      if (!folderId || !visibleFolderIdSet.has(folderId)) return [];

      const path: string[] = [];
      const seenFolderIds = new Set<string>();
      let currentFolderId: string | null = folderId;

      while (
        currentFolderId &&
        visibleFolderIdSet.has(currentFolderId) &&
        !seenFolderIds.has(currentFolderId)
      ) {
        seenFolderIds.add(currentFolderId);
        path.unshift(currentFolderId);
        currentFolderId = parentFolderIdById.get(currentFolderId) ?? null;
      }

      return path;
    },
    [parentFolderIdById, visibleFolderIdSet],
  );

  const columnViewStyle = useMemo(
    () =>
      ({
        "--folder-column-width-px": `${columnWidthPx}px`,
      }) as CSSProperties,
    [columnWidthPx],
  );

  const columnStyle = useMemo(
    () =>
      ({
        width: "var(--folder-column-width-px)",
        minWidth: "var(--folder-column-width-px)",
      }) satisfies CSSProperties,
    [],
  );

  const applyColumnWidthToDom = useCallback((width: number) => {
    const nextWidth = clampFolderColumnWidth(width);
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.style.setProperty("--folder-column-width-px", `${nextWidth}px`);
  }, []);

  const scheduleColumnWidthApply = useCallback(
    (width: number) => {
      pendingColumnWidthRef.current = clampFolderColumnWidth(width);

      if (typeof window === "undefined") {
        return;
      }

      if (resizeAnimationFrameRef.current !== null) {
        return;
      }

      resizeAnimationFrameRef.current = window.requestAnimationFrame(() => {
        resizeAnimationFrameRef.current = null;
        applyColumnWidthToDom(pendingColumnWidthRef.current);
      });
    },
    [applyColumnWidthToDom],
  );

  const restoreBodyResizeStyles = useCallback(() => {
    if (typeof document === "undefined") return;

    document.body.style.userSelect = previousBodyUserSelectRef.current;
    document.body.style.cursor = previousBodyCursorRef.current;

    previousBodyUserSelectRef.current = "";
    previousBodyCursorRef.current = "";
  }, []);

  const handleColumnResizeEnd = useCallback(() => {
    if (!columnResizeStateRef.current) return;

    columnResizeStateRef.current = null;
    setIsColumnResizing(false);

    if (
      typeof window !== "undefined" &&
      resizeAnimationFrameRef.current !== null
    ) {
      window.cancelAnimationFrame(resizeAnimationFrameRef.current);
      resizeAnimationFrameRef.current = null;
    }

    const nextWidth = clampFolderColumnWidth(pendingColumnWidthRef.current);
    applyColumnWidthToDom(nextWidth);
    setColumnWidthPx(nextWidth);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        FOLDER_COLUMN_WIDTH_STORAGE_KEY,
        String(nextWidth),
      );
    }

    restoreBodyResizeStyles();
  }, [applyColumnWidthToDom, restoreBodyResizeStyles]);

  const handleColumnResizeMove = useCallback(
    (event: PointerEvent) => {
      const resizeState = columnResizeStateRef.current;
      if (!resizeState) return;

      event.preventDefault();

      const deltaX = event.clientX - resizeState.startX;
      scheduleColumnWidthApply(resizeState.startWidth + deltaX);
    },
    [scheduleColumnWidthApply],
  );

  const handleColumnResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const currentWidth = pendingColumnWidthRef.current || columnWidthPx;

      columnResizeStateRef.current = {
        startX: event.clientX,
        startWidth: currentWidth,
      };
      pendingColumnWidthRef.current = currentWidth;
      setIsColumnResizing(true);
      applyColumnWidthToDom(currentWidth);

      if (typeof document !== "undefined") {
        previousBodyUserSelectRef.current = document.body.style.userSelect;
        previousBodyCursorRef.current = document.body.style.cursor;
        document.body.style.userSelect = "none";
        document.body.style.cursor = "col-resize";
      }
    },
    [applyColumnWidthToDom, columnWidthPx],
  );

  useEffect(() => {
    if (!isColumnResizing) return;

    window.addEventListener("pointermove", handleColumnResizeMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handleColumnResizeEnd);
    window.addEventListener("pointercancel", handleColumnResizeEnd);

    return () => {
      window.removeEventListener("pointermove", handleColumnResizeMove);
      window.removeEventListener("pointerup", handleColumnResizeEnd);
      window.removeEventListener("pointercancel", handleColumnResizeEnd);
    };
  }, [handleColumnResizeEnd, handleColumnResizeMove, isColumnResizing]);

  useEffect(() => {
    return () => {
      if (
        typeof window !== "undefined" &&
        resizeAnimationFrameRef.current !== null
      ) {
        window.cancelAnimationFrame(resizeAnimationFrameRef.current);
      }

      if (columnResizeStateRef.current) {
        columnResizeStateRef.current = null;
        restoreBodyResizeStyles();
      }
    };
  }, [restoreBodyResizeStyles]);

  useEffect(() => {
    if (!selectedFolderId || !visibleFolderIdSet.has(selectedFolderId)) return;

    const nextPath = buildFolderPath(selectedFolderId);
    setColumnFolderPath((previousPath) =>
      areSameFolderPaths(previousPath, nextPath) ? previousPath : nextPath,
    );
  }, [buildFolderPath, selectedFolderId, visibleFolderIdSet]);

  useEffect(() => {
    setColumnFolderPath([]);
  }, [resetToken]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollTo({
      left: scroller.scrollWidth,
      behavior: "auto",
    });
  }, [columnFolderPath.length]);

  const hasFolderMatches = useCallback(
    (folderId: string) => {
      if (!isFiltering) return true;
      return (matchCountMap.get(folderId) ?? 0) > 0;
    },
    [isFiltering, matchCountMap],
  );

  const hasCardSetMatches = useCallback(
    (cardSetId: string) => {
      if (!isFiltering) return true;
      return getCardSetItems(cardSetId).length > 0;
    },
    [getCardSetItems, isFiltering],
  );

  const buildColumnEntries = useCallback(
    (parentFolderId: string | null): FolderColumnEntry[] => {
      const childFolders = (
        parentFolderId ? getChildFolders(parentFolderId) : rootFolders
      )
        .filter((folder) => {
          const folderId = getFolderId(folder);
          return Boolean(folderId) && hasFolderMatches(folderId);
        })
        .map((folder) => {
          const folderId = getFolderId(folder);
          const contentCount = getFolderContentCount(folderId);
          const hasNextColumn =
            getChildFolders(folderId).some((childFolder) => {
              const childFolderId = getFolderId(childFolder);
              return Boolean(childFolderId) && hasFolderMatches(childFolderId);
            }) ||
            getCardSets(folderId).some((cardSet) =>
              hasCardSetMatches(cardSet.id),
            ) ||
            getFolderItems(folderId).length > 0;

          return {
            kind: "folder" as const,
            id: folderId,
            name: getFolderDisplayName(folder),
            folder,
            contentCount,
            hasNextColumn,
          };
        });

      const childCardSets = getCardSets(parentFolderId)
        .filter((cardSet) => hasCardSetMatches(cardSet.id))
        .map((cardSet) => ({
          kind: "cardSet" as const,
          id: cardSet.id,
          name: getCardSetDisplayName(cardSet),
          contentCount: getCardSetItems(cardSet.id).length,
        }));

      const childItems = getFolderItems(parentFolderId).map((item) => ({
        kind: item.type,
        id: item.data.id,
        name: getExplorerItemDisplayName(item),
      }));

      return [...childFolders, ...childCardSets, ...childItems];
    },
    [
      getCardSetItems,
      getCardSets,
      getChildFolders,
      getFolderContentCount,
      getFolderItems,
      hasCardSetMatches,
      hasFolderMatches,
      rootFolders,
    ],
  );

  const columns = useMemo<FolderColumn[]>(() => {
    const parentFolderIds = [null, ...columnFolderPath];

    return parentFolderIds.map((parentFolderId) => ({
      id: parentFolderId ?? "__root__",
      parentFolderId,
      entries: buildColumnEntries(parentFolderId),
    }));
  }, [buildColumnEntries, columnFolderPath]);

  const handleFolderEntrySelect = useCallback(
    (folderId: string, columnIndex: number) => {
      setColumnFolderPath((previousPath) => {
        const nextPath = [...previousPath.slice(0, columnIndex), folderId];
        return areSameFolderPaths(previousPath, nextPath) ? previousPath : nextPath;
      });
    },
    [],
  );

  const handleEntrySelect = useCallback(
    (entry: FolderColumnEntry, columnIndex: number) => {
      if (entry.kind === "folder") {
        handleFolderEntrySelect(entry.id, columnIndex);
        return;
      }

      onItemSelect({
        type: entry.kind,
        id: entry.id,
      });
    },
    [handleFolderEntrySelect, onItemSelect],
  );

  const isEntrySelected = useCallback(
    (entry: FolderColumnEntry, columnIndex: number) => {
      if (entry.kind === "folder") {
        return columnFolderPath[columnIndex] === entry.id;
      }

      if (entry.kind === "cardSet") {
        return (
          selectedCardSetId === entry.id ||
          (hasSelectedItemId(selectedItem) &&
            selectedItem.type === "cardSet" &&
            selectedItem.id === entry.id)
        );
      }

      return (
        hasSelectedItemId(selectedItem) &&
        selectedItem.type === entry.kind &&
        selectedItem.id === entry.id
      );
    },
    [columnFolderPath, selectedCardSetId, selectedItem],
  );

  return (
    <div
      ref={scrollerRef}
      style={columnViewStyle}
      className={cn(
        "folder-column-view h-full min-h-0 w-full overflow-x-auto overflow-y-hidden",
        isColumnResizing && "cursor-col-resize select-none",
        className,
      )}
    >
      <div className="flex h-full min-h-0 min-w-max items-stretch">
        {columns.map((column, columnIndex) => (
          <section
            key={`${column.id}:${columnIndex}`}
            style={columnStyle}
            className={cn(
              "relative h-full min-h-0 shrink-0 overflow-hidden border-r border-[#e7e5df]",
              columnIndex === columns.length - 1 && "border-r-0",
            )}
            aria-label={
              column.parentFolderId ? "フォルダ内の項目" : "ルートフォルダ"
            }
          >
            <div
              role="separator"
              aria-label="カラム幅を変更"
              aria-orientation="vertical"
              className="absolute right-[-4px] top-0 z-20 h-full w-2 cursor-col-resize bg-transparent hover:bg-[#d9d7d0]"
              style={{ touchAction: "none" }}
              onPointerDown={handleColumnResizeStart}
            />

            <div className="h-full min-h-0 overflow-y-auto px-1 py-1">
              {column.entries.length > 0 ? (
                column.entries.map((entry) => (
                  <FolderColumnRow
                    key={`${column.id}:${entry.kind}:${entry.id}`}
                    entry={entry}
                    selected={isEntrySelected(entry, columnIndex)}
                    onSelect={() => handleEntrySelect(entry, columnIndex)}
                  />
                ))
              ) : (
                <div className="px-2 py-2 text-sm font-normal text-muted-foreground">
                  {isFiltering
                    ? "一致する項目がありません"
                    : "この階層には表示できる項目がありません"}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
