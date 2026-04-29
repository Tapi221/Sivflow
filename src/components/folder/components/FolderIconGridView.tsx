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
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

interface FolderIconGridViewProps {
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

type GridColumnMetrics = {
  columnCount: number;
  itemCount: number;
};

const TILE_WIDTH_PX = 132;
const TILE_GAP_X_PX = 32;

const getTileKindLabel = (kind: ExplorerDetailRowKind) => {
  if (kind === "folder") return "フォルダー";
  if (kind === "cardSet") return "カードセット";
  if (kind === "card") return "カード";
  return "PDF";
};

const getSelectableItem = (row: ExplorerDetailRow): SelectedExplorerItem => {
  if (row.kind === "card" || row.kind === "document") return row.selectTarget;
  return null;
};

const getGridColumnMetrics = (
  container: HTMLDivElement | null,
  itemCount: number,
): GridColumnMetrics => {
  if (!container) return { columnCount: 1, itemCount };

  const width = container.clientWidth;
  const columnCount = Math.max(
    1,
    Math.floor((width + TILE_GAP_X_PX) / (TILE_WIDTH_PX + TILE_GAP_X_PX)),
  );

  return { columnCount, itemCount };
};

const clampIndex = (index: number, max: number) => {
  if (max <= 0) return 0;
  return Math.min(Math.max(index, 0), max - 1);
};

const getNextIndex = (
  currentIndex: number,
  key: string,
  { columnCount, itemCount }: GridColumnMetrics,
) => {
  if (key === "ArrowLeft") return clampIndex(currentIndex - 1, itemCount);
  if (key === "ArrowRight") return clampIndex(currentIndex + 1, itemCount);
  if (key === "ArrowUp")
    return clampIndex(currentIndex - columnCount, itemCount);
  if (key === "ArrowDown")
    return clampIndex(currentIndex + columnCount, itemCount);
  if (key === "Home") return 0;
  if (key === "End") return Math.max(0, itemCount - 1);
  return currentIndex;
};

const IconVisual = ({ row }: { row: ExplorerDetailRow }) => {
  if (row.kind === "folder") {
    return (
      <span className="grid h-[78px] w-[78px] place-items-center text-[var(--sidebar-icon-color,#6f6d66)]">
        <ExplorerChromeFolderIcon size={64} variant="large" />
      </span>
    );
  }

  if (row.kind === "cardSet") {
    return (
      <span className="grid h-[78px] w-[78px] place-items-center text-[var(--sidebar-icon-color,#6f6d66)]">
        <ExplorerChromeCardSetIcon size={54} />
      </span>
    );
  }

  if (row.kind === "card") {
    return (
      <span className="grid h-[78px] w-[78px] place-items-center text-[var(--sidebar-icon-color,#6f6d66)]">
        <ExplorerChromeCardIcon size={50} />
      </span>
    );
  }

  return (
    <span className="grid h-[78px] w-[78px] place-items-center text-[var(--sidebar-icon-color,#6f6d66)]">
      <ExplorerChromePdfIcon size={50} />
    </span>
  );
};

export const FolderIconGridView = ({
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
}: FolderIconGridViewProps) => {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const tileRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [focusedTileKey, setFocusedTileKey] = useState<string | null>(null);

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

  const setTileRef = useCallback(
    (key: string, node: HTMLButtonElement | null) => {
      if (node) tileRefs.current.set(key, node);
      else tileRefs.current.delete(key);
    },
    [],
  );

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
      setFocusedTileKey(row.key);

      const item = getSelectableItem(row);
      if (item) onItemSelect(item);
    },
    [onItemSelect],
  );

  const isSelected = useCallback(
    (row: ExplorerDetailRow) => {
      if (focusedTileKey === row.key) return true;

      if (row.kind === "cardSet" && currentCardSetId === row.id) {
        return true;
      }

      if (!selectedItem || !("id" in selectedItem)) return false;
      return selectedItem.type === row.kind && selectedItem.id === row.id;
    },
    [currentCardSetId, focusedTileKey, selectedItem],
  );

  const focusRowByIndex = useCallback(
    (index: number) => {
      const row = rows[index];
      if (!row) return;

      setFocusedTileKey(row.key);
      tileRefs.current.get(row.key)?.focus({ preventScroll: false });
    },
    [rows],
  );

  const handleTileClick = useCallback(
    (row: ExplorerDetailRow, event: MouseEvent<HTMLButtonElement>) => {
      if (event.defaultPrevented) return;
      selectRow(row);
    },
    [selectRow],
  );

  const handleTileKeyDown = useCallback(
    (row: ExplorerDetailRow, event: KeyboardEvent<HTMLButtonElement>) => {
      if (
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "Home" ||
        event.key === "End"
      ) {
        event.preventDefault();
        const currentIndex = rowKeyIndexMap.get(row.key) ?? 0;
        const nextIndex = getNextIndex(
          currentIndex,
          event.key,
          getGridColumnMetrics(gridRef.current, rows.length),
        );
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
    [focusRowByIndex, openRow, rowKeyIndexMap, rows.length, selectRow],
  );

  if (rows.length === 0) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center bg-transparent text-[12px] text-[#8f8d86]">
        この場所には表示できる項目がありません。
      </div>
    );
  }

  return (
    <div
      ref={gridRef}
      role="grid"
      aria-label="エクスプローラー アイコン表示"
      className="h-full min-h-0 w-full overflow-auto bg-transparent px-8 py-8"
    >
      <div
        className="grid gap-x-8 gap-y-9"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${TILE_WIDTH_PX}px, ${TILE_WIDTH_PX}px))`,
        }}
      >
        {rows.map((row) => {
          const selected = isSelected(row);

          return (
            <button
              key={row.key}
              ref={(node) => setTileRef(row.key, node)}
              type="button"
              role="gridcell"
              aria-label={`${row.name}、${getTileKindLabel(row.kind)}`}
              aria-selected={selected}
              title={row.name}
              className={cn(
                "group flex min-h-[132px] w-[132px] flex-col items-center justify-start gap-2",
                "rounded-[10px] px-2 py-3 text-center outline-none transition-colors",
                "hover:bg-[#f3f1ea] focus-visible:ring-2 focus-visible:ring-ring",
                selected && "bg-[#e9f1ff] shadow-[inset_0_0_0_1px_#6aa7ff]",
              )}
              onClick={(event) => handleTileClick(row, event)}
              onDoubleClick={() => openRow(row)}
              onKeyDown={(event) => handleTileKeyDown(row, event)}
            >
              <IconVisual row={row} />

              <span
                className={cn(
                  "line-clamp-2 max-w-[118px] break-words text-[13px] leading-[1.35]",
                  selected ? "text-[#1f4f8f]" : "text-[#2f2d29]",
                )}
              >
                {row.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
