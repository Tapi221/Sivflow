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

const LIST_ROW_HEIGHT_PX = 26;
const LIST_COLUMN_WIDTH_PX = 232;
const LIST_COLUMN_GAP_PX = 14;
const LIST_VERTICAL_PADDING_PX = 32;

const LIST_COLUMN_STYLE = {
  width: LIST_COLUMN_WIDTH_PX,
  minWidth: LIST_COLUMN_WIDTH_PX,
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

const chunkRowsByColumn = (
  rows: ExplorerDetailRow[],
  rowsPerColumn: number,
): ExplorerDetailRow[][] => {
  const normalizedRowsPerColumn = Math.max(1, rowsPerColumn);
  const columns: ExplorerDetailRow[][] = [];

  for (let index = 0; index < rows.length; index += normalizedRowsPerColumn) {
    columns.push(rows.slice(index, index + normalizedRowsPerColumn));
  }

  return columns;
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

  const columns = useMemo(
    () => chunkRowsByColumn(rows, rowsPerColumn),
    [rows, rowsPerColumn],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") return;

    const updateRowsPerColumn = () => {
      const availableHeight = Math.max(
        LIST_ROW_HEIGHT_PX,
        viewport.clientHeight - LIST_VERTICAL_PADDING_PX,
      );

      setRowsPerColumn(
        Math.max(1, Math.floor(availableHeight / LIST_ROW_HEIGHT_PX)),
      );
    };

    updateRowsPerColumn();

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
      className="h-full min-h-0 w-full overflow-auto bg-[rgba(255,255,255,0.96)] px-4 py-4"
    >
      <div
        className="flex min-h-full items-start"
        style={{ columnGap: LIST_COLUMN_GAP_PX }}
      >
        {columns.map((columnRows, columnIndex) => (
          <section
            key={`list-column:${columnIndex}`}
            aria-label={`一覧列 ${columnIndex + 1}`}
            className={cn(
              "min-h-full pr-3",
              columns.length > 1 &&
                columnIndex < columns.length - 1 &&
                "border-r border-[#f0eee8]",
            )}
            style={LIST_COLUMN_STYLE}
          >
            <div className="space-y-px">
              {columnRows.map((row) => {
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
                    className={cn(
                      "group flex h-[26px] w-full cursor-default items-center rounded-[5px] px-1.5 text-left",
                      "select-none outline-none transition-colors",
                      "hover:bg-[#f5f3ee] focus-visible:ring-2 focus-visible:ring-ring",
                      selected &&
                        "bg-[#e9f1ff] shadow-[inset_0_0_0_1px_#6aa7ff]",
                    )}
                    onClick={(event) => handleRowClick(row, event)}
                    onDoubleClick={() => openRow(row)}
                    onKeyDown={(event) => handleRowKeyDown(row, event)}
                  >
                    <span
                      role="gridcell"
                      className="flex min-w-0 flex-1 items-center gap-1.5"
                    >
                      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-[var(--sidebar-icon-color,#6f6d66)]">
                        <Icon size={15} className="h-[15px] w-[15px]" />
                      </span>

                      <span
                        className={cn(
                          "truncate text-[13px] leading-[26px]",
                          selected ? "text-[#1f4f8f]" : "text-[#2f2d29]",
                        )}
                      >
                        {row.name}
                      </span>
                    </span>

                    <span className="sr-only">{getRowKindLabel(row.kind)}</span>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <div className="min-w-[120px] flex-1" />
      </div>
    </div>
  );
};
