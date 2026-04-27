import {
  ExplorerChromeCardIcon,
  ExplorerChromeCardSetIcon,
  ExplorerChromeFolderIcon,
  ExplorerChromePdfIcon,
} from "@/components/explorer/icons";
import {
  buildExplorerDetailRows,
  type ExplorerDetailRow,
  type ExplorerDetailRowKind,
} from "@/components/folder/explorer/model/detailRows";
import { cn } from "@/lib/utils";
import type {
  Card,
  CardSet,
  DocumentItem,
  Folder,
  SelectedExplorerItem,
} from "@/types";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

interface FolderListViewProps {
  folders: Folder[];
  cards: Card[];
  cardSets?: CardSet[];
  documents: DocumentItem[];
  currentFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  currentCardSetId?: string | null;
  onFolderOpen: (folderId: string) => void;
  onCardSetOpen?: (cardSetId: string | null) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
}

type ListColumnMetrics = {
  rowsPerColumn: number;
  itemCount: number;
};

const LIST_ROW_HEIGHT_PX = 28;
const LIST_ROW_GAP_PX = 2;
const LIST_COLUMN_WIDTH_PX = 236;
const LIST_COLUMN_GAP_PX = 36;
const LIST_VIEW_PADDING_Y_PX = 24;
const LIST_VIEW_PADDING_X_CLASS = "px-4";

const LIST_ROW_STYLE = {
  height: LIST_ROW_HEIGHT_PX,
  minHeight: LIST_ROW_HEIGHT_PX,
  lineHeight: `${LIST_ROW_HEIGHT_PX}px`,
} satisfies CSSProperties;

const getRowIcon = (kind: ExplorerDetailRowKind) => {
  if (kind === "folder") return ExplorerChromeFolderIcon;
  if (kind === "cardSet") return ExplorerChromeCardSetIcon;
  if (kind === "card") return ExplorerChromeCardIcon;
  return ExplorerChromePdfIcon;
};

const getRowKindLabel = (kind: ExplorerDetailRowKind): string => {
  if (kind === "folder") return "フォルダー";
  if (kind === "cardSet") return "カードセット";
  if (kind === "card") return "カード";
  return "PDF";
};

const getSelectableItem = (row: ExplorerDetailRow): SelectedExplorerItem => {
  if (row.kind === "card" || row.kind === "document") return row.selectTarget;
  return null;
};

const clampIndex = (index: number, max: number): number => {
  if (max <= 0) return 0;
  return Math.min(Math.max(index, 0), max - 1);
};

const getNextIndex = (
  currentIndex: number,
  key: string,
  metrics: ListColumnMetrics,
): number => {
  if (key === "ArrowUp") return clampIndex(currentIndex - 1, metrics.itemCount);
  if (key === "ArrowDown") return clampIndex(currentIndex + 1, metrics.itemCount);
  if (key === "ArrowLeft") {
    return clampIndex(currentIndex - metrics.rowsPerColumn, metrics.itemCount);
  }
  if (key === "ArrowRight") {
    return clampIndex(currentIndex + metrics.rowsPerColumn, metrics.itemCount);
  }
  if (key === "Home") return 0;
  if (key === "End") return Math.max(0, metrics.itemCount - 1);
  return currentIndex;
};

const calculateRowsPerColumn = (viewportHeight: number): number => {
  const availableHeight = Math.max(
    LIST_ROW_HEIGHT_PX,
    viewportHeight - LIST_VIEW_PADDING_Y_PX,
  );

  return Math.max(
    1,
    Math.floor((availableHeight + LIST_ROW_GAP_PX) / (LIST_ROW_HEIGHT_PX + LIST_ROW_GAP_PX)),
  );
};

export const FolderListView = ({
  folders,
  cards,
  cardSets = [],
  documents,
  currentFolderId,
  selectedItem,
  currentCardSetId = null,
  onFolderOpen,
  onCardSetOpen,
  onItemSelect,
}: FolderListViewProps) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [focusedRowKey, setFocusedRowKey] = useState<string | null>(null);
  const [rowsPerColumn, setRowsPerColumn] = useState(1);

  const rows = useMemo(
    () =>
      buildExplorerDetailRows({
        folders,
        cards,
        cardSets,
        documents,
        currentFolderId,
        currentCardSetId,
      }),
    [cards, cardSets, currentCardSetId, currentFolderId, documents, folders],
  );

  const rowKeyIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row, index) => map.set(row.key, index));
    return map;
  }, [rows]);

  const listGridStyle = useMemo(
    () =>
      ({
        gridAutoColumns: `${LIST_COLUMN_WIDTH_PX}px`,
        gridAutoFlow: "column",
        gridTemplateRows: `repeat(${rowsPerColumn}, ${LIST_ROW_HEIGHT_PX}px)`,
        columnGap: `${LIST_COLUMN_GAP_PX}px`,
        rowGap: `${LIST_ROW_GAP_PX}px`,
      }) satisfies CSSProperties,
    [rowsPerColumn],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateRowsPerColumn = () => {
      const nextRowsPerColumn = calculateRowsPerColumn(viewport.clientHeight);
      setRowsPerColumn((currentRowsPerColumn) =>
        currentRowsPerColumn === nextRowsPerColumn
          ? currentRowsPerColumn
          : nextRowsPerColumn,
      );
    };

    updateRowsPerColumn();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateRowsPerColumn);
      return () => {
        window.removeEventListener("resize", updateRowsPerColumn);
      };
    }

    const resizeObserver = new ResizeObserver(updateRowsPerColumn);
    resizeObserver.observe(viewport);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!focusedRowKey) return;
    if (rowKeyIndexMap.has(focusedRowKey)) return;
    setFocusedRowKey(null);
  }, [focusedRowKey, rowKeyIndexMap]);

  const setRowRef = useCallback((key: string, node: HTMLDivElement | null) => {
    if (node) {
      rowRefs.current.set(key, node);
      return;
    }

    rowRefs.current.delete(key);
  }, []);

  const openRow = useCallback(
    (row: ExplorerDetailRow) => {
      if (row.openFolderId) {
        onFolderOpen(row.openFolderId);
        return;
      }

      if (row.openCardSetId) {
        onCardSetOpen?.(row.openCardSetId);
        return;
      }

      if (row.selectTarget) {
        onItemSelect(row.selectTarget);
      }
    },
    [onCardSetOpen, onFolderOpen, onItemSelect],
  );

  const selectRow = useCallback(
    (row: ExplorerDetailRow) => {
      setFocusedRowKey(row.key);

      const item = getSelectableItem(row);
      if (item) onItemSelect(item);
    },
    [onItemSelect],
  );

  const isSelected = useCallback(
    (row: ExplorerDetailRow): boolean => {
      if (focusedRowKey === row.key) return true;

      if (row.kind === "cardSet" && currentCardSetId === row.id) {
        return true;
      }

      if (!selectedItem || !("id" in selectedItem)) return false;
      return selectedItem.type === row.kind && selectedItem.id === row.id;
    },
    [currentCardSetId, focusedRowKey, selectedItem],
  );

  const focusRowByIndex = useCallback(
    (index: number) => {
      const row = rows[index];
      if (!row) return;

      setFocusedRowKey(row.key);
      rowRefs.current.get(row.key)?.focus({ preventScroll: false });
    },
    [rows],
  );

  const handleRowClick = useCallback(
    (row: ExplorerDetailRow, event: MouseEvent<HTMLDivElement>) => {
      if (event.defaultPrevented) return;
      selectRow(row);
    },
    [selectRow],
  );

  const handleRowKeyDown = useCallback(
    (row: ExplorerDetailRow, event: KeyboardEvent<HTMLDivElement>) => {
      if (
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === "Home" ||
        event.key === "End"
      ) {
        event.preventDefault();

        const currentIndex = rowKeyIndexMap.get(row.key) ?? 0;
        const nextIndex = getNextIndex(currentIndex, event.key, {
          rowsPerColumn,
          itemCount: rows.length,
        });

        focusRowByIndex(nextIndex);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        openRow(row);
        return;
      }

      if (event.key === " ") {
        event.preventDefault();
        selectRow(row);
      }
    },
    [
      focusRowByIndex,
      openRow,
      rowKeyIndexMap,
      rows.length,
      rowsPerColumn,
      selectRow,
    ],
  );

  if (rows.length === 0) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center bg-[rgba(255,255,255,0.96)] text-[12px] text-[#8f8d86]">
        この場所には表示できる項目がありません。
      </div>
    );
  }

  return (
    <div
      ref={viewportRef}
      role="grid"
      aria-label="エクスプローラー 一覧表示"
      className={cn(
        "h-full min-h-0 w-full overflow-auto bg-[rgba(255,255,255,0.96)] py-3",
        LIST_VIEW_PADDING_X_CLASS,
      )}
    >
      <div className="grid min-h-max w-max content-start" style={listGridStyle}>
        {rows.map((row) => {
          const Icon = getRowIcon(row.kind);
          const selected = isSelected(row);

          return (
            <div
              key={row.key}
              ref={(node) => setRowRef(row.key, node)}
              role="row"
              tabIndex={0}
              aria-selected={selected}
              data-selected={selected ? "true" : undefined}
              title={row.name}
              style={LIST_ROW_STYLE}
              className={cn(
                "sidebar-row sidebar-row--folder ds-list-item ds-list-item--interactive",
                "relative flex w-full cursor-pointer items-center rounded-[8px] px-2 text-left",
                "select-none outline-none",
                selected && "ds-list-item--selected",
              )}
              onClick={(event) => handleRowClick(row, event)}
              onDoubleClick={() => openRow(row)}
              onKeyDown={(event) => handleRowKeyDown(row, event)}
            >
              <span className="ds-list-item__icon flex h-full w-4 shrink-0 items-center justify-center">
                <Icon className="h-3.5 w-3.5" />
              </span>

              <div className="ds-list-item__content flex h-full min-w-0 flex-1 items-center pr-1">
                <div className="pointer-events-none flex min-w-0 flex-1 items-center">
                  <span className="ds-list-item__title truncate text-[13px] font-normal">
                    {row.name}
                  </span>
                </div>
              </div>

              <span className="sr-only">{getRowKindLabel(row.kind)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
