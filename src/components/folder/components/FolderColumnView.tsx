import type { FolderTreeNode } from "@/components/folder/explorer/model/utils";
import {
  getFolderId,
  getParentFolderId,
  normalizeFolderId,
} from "@/components/folder/explorer/model/utils";
import {
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

type FolderColumnContext =
  | { type: "folder"; id: string }
  | { type: "cardSet"; id: string };

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
      hasNextColumn: boolean;
    }
  | {
      kind: "card" | "document";
      id: string;
      name: string;
    };

type FolderColumn = {
  id: string;
  context: FolderColumnContext | null;
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

const FOLDER_COLUMN_WIDTHS_STORAGE_KEY =
  "manifolia:folder-column-view:column-widths";
const DEFAULT_FOLDER_COLUMN_WIDTH_PX = 280;
const MIN_FOLDER_COLUMN_WIDTH_PX = 180;
const MAX_FOLDER_COLUMN_WIDTH_PX = 520;

type FolderColumnWidthMap = Record<string, number>;

const clampFolderColumnWidth = (width: number) => {
  if (!Number.isFinite(width)) return DEFAULT_FOLDER_COLUMN_WIDTH_PX;

  return Math.min(
    Math.max(Math.round(width), MIN_FOLDER_COLUMN_WIDTH_PX),
    MAX_FOLDER_COLUMN_WIDTH_PX,
  );
};

const readStoredFolderColumnWidths = (): FolderColumnWidthMap => {
  if (typeof window === "undefined") {
    return {};
  }

  const storedWidths = window.localStorage.getItem(
    FOLDER_COLUMN_WIDTHS_STORAGE_KEY,
  );
  if (!storedWidths) return {};

  try {
    const parsed = JSON.parse(storedWidths) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const widths: FolderColumnWidthMap = {};

    Object.entries(parsed as Record<string, unknown>).forEach(
      ([columnId, width]) => {
        if (typeof width !== "number") return;
        widths[columnId] = clampFolderColumnWidth(width);
      },
    );

    return widths;
  } catch {
    return {};
  }
};

const writeStoredFolderColumnWidths = (widths: FolderColumnWidthMap) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    FOLDER_COLUMN_WIDTHS_STORAGE_KEY,
    JSON.stringify(widths),
  );
};

const FOLDER_COLUMN_ROW_STYLE = {
  height: 28,
  minHeight: 28,
  lineHeight: "28px",
} satisfies CSSProperties;

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

const getColumnContextKey = (context: FolderColumnContext | null) => {
  if (!context) return "__root__";
  return `${context.type}:${context.id}`;
};

const areSameColumnPaths = (
  left: FolderColumnContext[],
  right: FolderColumnContext[],
) => {
  if (left.length !== right.length) return false;
  return left.every((context, index) => {
    const other = right[index];
    return context.type === other?.type && context.id === other.id;
  });
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

  const hasNextColumn =
    (entry.kind === "folder" || entry.kind === "cardSet") && entry.hasNextColumn;

  const trailing =
    typeof contentCount === "number" || hasNextColumn ? (
      <span className="ml-auto flex h-full shrink-0 items-center gap-1 pr-1">
        {typeof contentCount === "number" ? (
          <span className="ds-list-item__subtitle shrink-0 text-[11px] font-normal tabular-nums leading-none opacity-60">
            {contentCount}
          </span>
        ) : null}
        {hasNextColumn ? (
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
    <div
      role="button"
      tabIndex={0}
      data-selected={selected ? "true" : undefined}
      style={FOLDER_COLUMN_ROW_STYLE}
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
        <Icon
          className={cn(
            "sidebar-icon ds-list-item__icon",
            FOLDER_ROW_ICON_SIZE_CLASS,
            selected
              ? FOLDER_ROW_ICON_ACTIVE_CLASS
              : FOLDER_ROW_ICON_MUTED_CLASS,
          )}
        />
      </span>

      <div className="ds-list-item__content flex h-full min-w-0 flex-1 items-center pr-1">
        <div className="pointer-events-none flex min-w-0 flex-1 items-center">
          <span className={cn(FOLDER_ROW_TITLE_CLASS, "font-normal")}>
            {entry.name}
          </span>
        </div>
        {trailing}
      </div>
    </div>
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
  const resizeGuideRef = useRef<HTMLDivElement | null>(null);
  const columnSectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const columnResizeStateRef = useRef<{
    columnId: string;
    startX: number;
    startWidth: number;
  } | null>(null);
  const pendingColumnWidthRef = useRef(DEFAULT_FOLDER_COLUMN_WIDTH_PX);
  const resizeAnimationFrameRef = useRef<number | null>(null);
  const previousBodyUserSelectRef = useRef("");
  const previousBodyCursorRef = useRef("");

  const [columnPath, setColumnPath] = useState<FolderColumnContext[]>([]);
  const [columnWidthById, setColumnWidthById] = useState<FolderColumnWidthMap>(
    readStoredFolderColumnWidths,
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

      const path: FolderColumnContext[] = [];
      const seenFolderIds = new Set<string>();
      let currentFolderId: string | null = folderId;

      while (
        currentFolderId &&
        visibleFolderIdSet.has(currentFolderId) &&
        !seenFolderIds.has(currentFolderId)
      ) {
        seenFolderIds.add(currentFolderId);
        path.unshift({ type: "folder", id: currentFolderId });
        currentFolderId = parentFolderIdById.get(currentFolderId) ?? null;
      }

      return path;
    },
    [parentFolderIdById, visibleFolderIdSet],
  );

  const getColumnWidth = useCallback(
    (columnId: string) =>
      clampFolderColumnWidth(
        columnWidthById[columnId] ?? DEFAULT_FOLDER_COLUMN_WIDTH_PX,
      ),
    [columnWidthById],
  );

  const getColumnStyle = useCallback(
    (columnId: string) => {
      const widthPx = getColumnWidth(columnId);
      const cssWidth = `${widthPx}px`;

      return {
        flex: `0 0 ${cssWidth}`,
        width: cssWidth,
        minWidth: cssWidth,
        contain: "layout paint style",
        willChange: isColumnResizing
          ? "width, min-width, flex-basis"
          : undefined,
      } satisfies CSSProperties;
    },
    [getColumnWidth, isColumnResizing],
  );

  const setColumnSectionRef = useCallback(
    (columnId: string, node: HTMLElement | null) => {
      if (node) columnSectionRefs.current.set(columnId, node);
      else columnSectionRefs.current.delete(columnId);
    },
    [],
  );

  const applyColumnWidthToDom = useCallback((columnId: string, width: number) => {
    const nextWidth = clampFolderColumnWidth(width);
    const section = columnSectionRefs.current.get(columnId);
    if (!section) return;

    const cssWidth = `${nextWidth}px`;
    section.style.flexBasis = cssWidth;
    section.style.width = cssWidth;
    section.style.minWidth = cssWidth;
  }, []);

  const showResizeGuide = useCallback((clientX: number) => {
    const guide = resizeGuideRef.current;
    const scroller = scrollerRef.current;
    if (!guide || !scroller) return;

    const rect = scroller.getBoundingClientRect();
    const x = Math.round(clientX - rect.left + scroller.scrollLeft);

    guide.style.opacity = "1";
    guide.style.transform = `translate3d(${x}px, 0, 0)`;
  }, []);

  const hideResizeGuide = useCallback(() => {
    const guide = resizeGuideRef.current;
    if (!guide) return;

    guide.style.opacity = "0";
    guide.style.transform = "translate3d(-9999px, 0, 0)";
  }, []);

  const scheduleColumnWidthApply = useCallback(
    (columnId: string, width: number) => {
      const nextWidth = clampFolderColumnWidth(width);
      pendingColumnWidthRef.current = nextWidth;

      if (typeof window === "undefined") {
        applyColumnWidthToDom(columnId, nextWidth);
        return;
      }

      if (resizeAnimationFrameRef.current !== null) {
        return;
      }

      resizeAnimationFrameRef.current = window.requestAnimationFrame(() => {
        resizeAnimationFrameRef.current = null;
        applyColumnWidthToDom(columnId, pendingColumnWidthRef.current);
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
    const resizeState = columnResizeStateRef.current;
    if (!resizeState) return;

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
    applyColumnWidthToDom(resizeState.columnId, nextWidth);

    setColumnWidthById((previousWidths) => {
      const nextWidths = {
        ...previousWidths,
        [resizeState.columnId]: nextWidth,
      };

      writeStoredFolderColumnWidths(nextWidths);

      return nextWidths;
    });

    restoreBodyResizeStyles();
    hideResizeGuide();
  }, [applyColumnWidthToDom, hideResizeGuide, restoreBodyResizeStyles]);

  const handleColumnResizeMove = useCallback(
    (event: PointerEvent) => {
      const resizeState = columnResizeStateRef.current;
      if (!resizeState) return;

      event.preventDefault();

      showResizeGuide(event.clientX);
      const deltaX = event.clientX - resizeState.startX;
      scheduleColumnWidthApply(
        resizeState.columnId,
        resizeState.startWidth + deltaX,
      );
    },
    [scheduleColumnWidthApply, showResizeGuide],
  );

  const handleColumnResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, columnId: string) => {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture?.(event.pointerId);

      const currentWidth = getColumnWidth(columnId);

      columnResizeStateRef.current = {
        columnId,
        startX: event.clientX,
        startWidth: currentWidth,
      };
      pendingColumnWidthRef.current = currentWidth;
      setIsColumnResizing(true);
      applyColumnWidthToDom(columnId, currentWidth);
      showResizeGuide(event.clientX);

      if (typeof document !== "undefined") {
        previousBodyUserSelectRef.current = document.body.style.userSelect;
        previousBodyCursorRef.current = document.body.style.cursor;
        document.body.style.userSelect = "none";
        document.body.style.cursor = "col-resize";
      }
    },
    [applyColumnWidthToDom, getColumnWidth, showResizeGuide],
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
        hideResizeGuide();
      }
    };
  }, [hideResizeGuide, restoreBodyResizeStyles]);

  useEffect(() => {
    if (!selectedFolderId || !visibleFolderIdSet.has(selectedFolderId)) return;

    const nextPath = buildFolderPath(selectedFolderId);
    setColumnPath((previousPath) =>
      areSameColumnPaths(previousPath, nextPath) ? previousPath : nextPath,
    );
  }, [buildFolderPath, selectedFolderId, visibleFolderIdSet]);

  useEffect(() => {
    setColumnPath([]);
  }, [resetToken]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollTo({
      left: scroller.scrollWidth,
      behavior: "auto",
    });
  }, [columnPath.length]);

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
    (context: FolderColumnContext | null): FolderColumnEntry[] => {
      if (context?.type === "cardSet") {
        return getCardSetItems(context.id).map((item) => ({
          kind: item.type,
          id: item.data.id,
          name: getExplorerItemDisplayName(item),
        }));
      }

      const parentFolderId = context?.type === "folder" ? context.id : null;

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
        .map((cardSet) => {
          const cardSetItems = getCardSetItems(cardSet.id);

          return {
            kind: "cardSet" as const,
            id: cardSet.id,
            name: getCardSetDisplayName(cardSet),
            contentCount: cardSetItems.length,
            hasNextColumn: cardSetItems.length > 0,
          };
        });

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
    const contexts = [null, ...columnPath];

    return contexts.map((context) => ({
      id: getColumnContextKey(context),
      context,
      entries: buildColumnEntries(context),
    }));
  }, [buildColumnEntries, columnPath]);

  const handleBranchEntrySelect = useCallback(
    (
      entry: Extract<FolderColumnEntry, { kind: "folder" | "cardSet" }>,
      columnIndex: number,
    ) => {
      const nextContext: FolderColumnContext = {
        type: entry.kind,
        id: entry.id,
      };

      setColumnPath((previousPath) => {
        const nextPath = [...previousPath.slice(0, columnIndex), nextContext];
        return areSameColumnPaths(previousPath, nextPath)
          ? previousPath
          : nextPath;
      });
    },
    [],
  );

  const handleEntrySelect = useCallback(
    (entry: FolderColumnEntry, columnIndex: number) => {
      if (entry.kind === "folder" || entry.kind === "cardSet") {
        handleBranchEntrySelect(entry, columnIndex);
        return;
      }

      onItemSelect({
        type: entry.kind,
        id: entry.id,
      });
    },
    [handleBranchEntrySelect, onItemSelect],
  );

  const isEntrySelected = useCallback(
    (entry: FolderColumnEntry, columnIndex: number) => {
      if (entry.kind === "folder") {
        const selectedPathEntry = columnPath[columnIndex];
        return (
          selectedPathEntry?.type === "folder" &&
          selectedPathEntry.id === entry.id
        );
      }

      if (entry.kind === "cardSet") {
        const selectedPathEntry = columnPath[columnIndex];
        if (
          selectedPathEntry?.type === "cardSet" &&
          selectedPathEntry.id === entry.id
        ) {
          return true;
        }

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
    [columnPath, selectedCardSetId, selectedItem],
  );

  return (
    <div
      ref={scrollerRef}
      className={cn(
        "folder-column-view relative h-full min-h-0 w-full overflow-x-auto overflow-y-hidden",
        isColumnResizing && "cursor-col-resize select-none",
        className,
      )}
    >
      <div
        ref={resizeGuideRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 z-50 h-full w-px bg-[#b8b3aa] opacity-0 shadow-[0_0_0_1px_rgba(120,116,108,0.18)]"
        style={{
          transform: "translate3d(-9999px, 0, 0)",
          willChange: "transform, opacity",
        }}
      />

      <div className="flex h-full min-h-0 min-w-max items-stretch">
        {columns.map((column, columnIndex) => (
          <section
            key={`${column.id}:${columnIndex}`}
            ref={(node) => setColumnSectionRef(column.id, node)}
            style={getColumnStyle(column.id)}
            className={cn(
              "relative h-full min-h-0 shrink-0 overflow-hidden border-r border-[#e7e5df]",
            )}
            aria-label={
              column.context?.type === "cardSet"
                ? "カードセット内のカード"
                : column.context?.type === "folder"
                  ? "フォルダ内の項目"
                  : "ルートフォルダ"
            }
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-0 top-0 z-10 h-full w-px bg-[#e1ded7]"
            />

            <div
              role="separator"
              aria-label="カラム幅を変更"
              aria-orientation="vertical"
              className="absolute right-[-6px] top-0 z-30 h-full w-3 cursor-col-resize bg-transparent"
              style={{ touchAction: "none" }}
              onPointerDown={(event) => {
                handleColumnResizeStart(event, column.id);
              }}
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
                    : column.context?.type === "cardSet"
                      ? "このカードセットにはカードがありません"
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
