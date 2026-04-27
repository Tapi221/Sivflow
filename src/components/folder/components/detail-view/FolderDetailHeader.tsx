import { cn } from "@/lib/utils";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  DETAIL_GRID_CLASS,
  isDetailColumnId,
  normalizeDetailColumnOrder,
  type ExplorerDetailColumnOrder,
} from "./folderDetailColumns";
import { getHeaderAriaSort, getHeaderSortLabel } from "./folderDetailSorting";
import type {
  ExplorerDetailColumnId,
  ExplorerDetailSortKey,
  ExplorerDetailSortState,
} from "./folderDetailTypes";

type SortableDetailSortKey = Exclude<ExplorerDetailSortKey, "manual">;

type HeaderColumnDefinition = {
  label: string;
  sortKey?: SortableDetailSortKey;
};

type ColumnDropIndicatorPosition = "before" | "after";

type ColumnDragPreviewState = {
  left: number;
  top: number;
  width: number;
  height: number;
  label: string;
};

type ColumnDragState = {
  activeColumnId: ExplorerDetailColumnId;
  overColumnId: ExplorerDetailColumnId;
  isDragging: boolean;
  preview: ColumnDragPreviewState;
};

type HeaderCellProps = {
  label: string;
  columnId: ExplorerDetailColumnId;
  sortKey?: SortableDetailSortKey;
  sortState: ExplorerDetailSortState;
  onSort: (key: SortableDetailSortKey) => void;
  onHeaderPointerDown: (
    columnId: ExplorerDetailColumnId,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => void;
  shouldSuppressSortClick: () => boolean;
  onResizePointerDown: (
    columnId: ExplorerDetailColumnId,
    event: ReactPointerEvent<HTMLSpanElement>,
  ) => void;
  onResetWidth: (columnId: ExplorerDetailColumnId) => void;
  dropIndicatorPosition: ColumnDropIndicatorPosition | null;
  isColumnDragging: boolean;
  isColumnOver: boolean;
  className?: string;
};

type FolderDetailHeaderProps = {
  columnOrder: readonly ExplorerDetailColumnId[];
  gridStyle: CSSProperties;
  sortState: ExplorerDetailSortState;
  onSort: (key: SortableDetailSortKey) => void;
  onColumnReorder: (
    activeColumnId: ExplorerDetailColumnId,
    overColumnId: ExplorerDetailColumnId,
  ) => void;
  onResizePointerDown: (
    columnId: ExplorerDetailColumnId,
    event: ReactPointerEvent<HTMLSpanElement>,
  ) => void;
  onResetWidth: (columnId: ExplorerDetailColumnId) => void;
};

type ColumnPointerSession = {
  activeColumnId: ExplorerDetailColumnId;
  startX: number;
  startY: number;
  dragging: boolean;
  cancelled: boolean;
  previousCursor: string;
  previousUserSelect: string;
  previewOffsetX: number;
  previewTop: number;
  previewWidth: number;
  previewHeight: number;
  minPreviewLeft: number;
  maxPreviewLeft: number;
  label: string;
};

const DETAIL_HEADER_COLUMNS = {
  name: {
    label: "名前",
    sortKey: "name",
  },
  tags: {
    label: "タグ",
  },
  path: {
    label: "パス",
  },
  updatedAt: {
    label: "更新日時",
    sortKey: "updatedAt",
  },
  sync: {
    label: "同期",
  },
  kind: {
    label: "種類",
    sortKey: "kind",
  },
  size: {
    label: "サイズ",
    sortKey: "size",
  },
} satisfies Record<ExplorerDetailColumnId, HeaderColumnDefinition>;

const COLUMN_DRAG_ACTIVATION_DISTANCE_PX = 6;
const COLUMN_DRAG_VERTICAL_CANCEL_DISTANCE_PX = 12;
const COLUMN_DRAG_HORIZONTAL_INTENT_RATIO = 1.15;

const clampNumber = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const HeaderColumnDragPreview = ({
  preview,
}: {
  preview: ColumnDragPreviewState;
}) => {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed z-[1000] flex items-center px-3",
        "rounded-[6px] border border-[#d8d3c8] bg-[rgba(250,249,246,0.96)]",
        "text-[12px] font-medium text-[#24231f]",
        "shadow-[0_10px_24px_rgba(36,35,31,0.16)] ring-1 ring-black/5",
      )}
      style={{
        left: preview.left,
        top: preview.top,
        width: preview.width,
        height: preview.height,
      }}
    >
      <span className="truncate">{preview.label}</span>
    </div>
  );
};

const HeaderCell = ({
  label,
  columnId,
  sortKey,
  sortState,
  onSort,
  onHeaderPointerDown,
  shouldSuppressSortClick,
  onResizePointerDown,
  onResetWidth,
  dropIndicatorPosition,
  isColumnDragging,
  isColumnOver,
  className,
}: HeaderCellProps) => {
  const labelContent = (
    <span className="truncate">
      {label}
      {sortKey ? getHeaderSortLabel(sortState, sortKey) : ""}
    </span>
  );

  return (
    <div
      role="columnheader"
      aria-sort={sortKey ? getHeaderAriaSort(sortState, sortKey) : undefined}
      data-detail-column-id={columnId}
      data-column-dragging={isColumnDragging ? "true" : undefined}
      title={
        sortKey
          ? "クリックで並び替え / 横にドラッグして列順を変更"
          : "横にドラッグして列順を変更"
      }
      className={cn(
        "relative flex min-w-0 items-center border-r border-[#e6e4dc] px-3",
        "cursor-grab transition-colors active:cursor-grabbing",
        "hover:bg-[#eeece4] hover:text-[#24231f]",
        isColumnOver && "bg-[#f7f4ec] text-[#24231f]",
        isColumnDragging && "bg-[#eeece4] text-[#24231f] opacity-80",
        className,
      )}
      onPointerDown={(event) => onHeaderPointerDown(columnId, event)}
    >
      {dropIndicatorPosition ? (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute bottom-0 top-0 z-50 w-[2px] bg-[#7f7a72]",
            "shadow-[0_0_0_1px_rgba(127,122,114,0.18)]",
            dropIndicatorPosition === "before" ? "left-0" : "right-0",
          )}
        />
      ) : null}

      {sortKey ? (
        <button
          type="button"
          aria-label={`${label}列で並び替え`}
          className={cn(
            "flex min-w-0 flex-1 cursor-inherit items-center text-left",
            "text-[#777671] transition-colors hover:text-[#24231f]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          onClick={(event) => {
            if (shouldSuppressSortClick()) {
              event.preventDefault();
              event.stopPropagation();
              return;
            }

            onSort(sortKey);
          }}
        >
          {labelContent}
        </button>
      ) : (
        <span className="min-w-0 flex-1 truncate">{labelContent}</span>
      )}

      <span
        role="separator"
        aria-orientation="vertical"
        aria-label={`${label}列の幅を変更`}
        title="ドラッグで列幅を変更 / ダブルクリックで初期幅に戻す"
        className={cn(
          "absolute bottom-0 right-[-3px] top-0 z-40 w-[7px] cursor-col-resize",
          "after:absolute after:bottom-1 after:right-[3px] after:top-1 after:w-px after:bg-transparent",
          "hover:after:bg-[#aaa69c] active:after:bg-[#7f7a72]",
        )}
        onPointerDown={(event) => {
          event.stopPropagation();
          onResizePointerDown(columnId, event);
        }}
        onDoubleClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onResetWidth(columnId);
        }}
      />
    </div>
  );
};

export const FolderDetailHeader = ({
  columnOrder,
  gridStyle,
  sortState,
  onSort,
  onColumnReorder,
  onResizePointerDown,
  onResetWidth,
}: FolderDetailHeaderProps) => {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const dragSessionRef = useRef<ColumnPointerSession | null>(null);
  const suppressNextSortClickRef = useRef(false);
  const [dragState, setDragState] = useState<ColumnDragState | null>(null);

  const normalizedColumnOrder = useMemo<ExplorerDetailColumnOrder>(
    () => normalizeDetailColumnOrder(columnOrder),
    [columnOrder],
  );

  const getColumnIdAtClientX = useCallback(
    (clientX: number): ExplorerDetailColumnId | null => {
      const headerElement = headerRef.current;
      if (!headerElement) return null;

      const columnElements = Array.from(
        headerElement.querySelectorAll<HTMLElement>("[data-detail-column-id]"),
      );
      if (columnElements.length === 0) return null;

      for (const columnElement of columnElements) {
        const rect = columnElement.getBoundingClientRect();
        if (clientX < rect.left || clientX > rect.right) continue;

        const columnId = columnElement.dataset.detailColumnId;
        return isDetailColumnId(columnId) ? columnId : null;
      }

      const firstColumn = columnElements[0];
      const lastColumn = columnElements[columnElements.length - 1];
      const firstRect = firstColumn.getBoundingClientRect();
      const lastRect = lastColumn.getBoundingClientRect();

      if (clientX < firstRect.left) {
        const columnId = firstColumn.dataset.detailColumnId;
        return isDetailColumnId(columnId) ? columnId : null;
      }

      if (clientX > lastRect.right) {
        const columnId = lastColumn.dataset.detailColumnId;
        return isDetailColumnId(columnId) ? columnId : null;
      }

      return null;
    },
    [],
  );

  const buildPreviewState = useCallback(
    (
      session: ColumnPointerSession,
      clientX: number,
    ): ColumnDragPreviewState => {
      return {
        left: clampNumber(
          clientX - session.previewOffsetX,
          session.minPreviewLeft,
          session.maxPreviewLeft,
        ),
        top: session.previewTop,
        width: session.previewWidth,
        height: session.previewHeight,
        label: session.label,
      };
    },
    [],
  );

  const shouldSuppressSortClick = useCallback(() => {
    return suppressNextSortClickRef.current;
  }, []);

  const clearColumnDragSession = useCallback(() => {
    const session = dragSessionRef.current;

    if (session?.dragging) {
      document.body.style.cursor = session.previousCursor;
      document.body.style.userSelect = session.previousUserSelect;
    }

    dragSessionRef.current = null;
    setDragState(null);
  }, []);

  const handleHeaderPointerDown = useCallback(
    (
      columnId: ExplorerDetailColumnId,
      event: ReactPointerEvent<HTMLDivElement>,
    ) => {
      if (event.button !== 0) return;

      const columnRect = event.currentTarget.getBoundingClientRect();
      const headerRect =
        headerRef.current?.getBoundingClientRect() ?? columnRect;
      const maxPreviewLeft = Math.max(
        headerRect.left,
        headerRect.right - columnRect.width,
      );

      dragSessionRef.current = {
        activeColumnId: columnId,
        startX: event.clientX,
        startY: event.clientY,
        dragging: false,
        cancelled: false,
        previousCursor: document.body.style.cursor,
        previousUserSelect: document.body.style.userSelect,
        previewOffsetX: event.clientX - columnRect.left,
        previewTop: columnRect.top,
        previewWidth: columnRect.width,
        previewHeight: columnRect.height,
        minPreviewLeft: headerRect.left,
        maxPreviewLeft,
        label: DETAIL_HEADER_COLUMNS[columnId].label,
      };

      const handlePointerMove = (pointerEvent: PointerEvent) => {
        const session = dragSessionRef.current;
        if (!session || session.cancelled) return;

        const deltaX = pointerEvent.clientX - session.startX;
        const deltaY = pointerEvent.clientY - session.startY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        if (!session.dragging) {
          const isVerticalIntent =
            absDeltaY >= COLUMN_DRAG_VERTICAL_CANCEL_DISTANCE_PX &&
            absDeltaY > absDeltaX * COLUMN_DRAG_HORIZONTAL_INTENT_RATIO;

          if (isVerticalIntent) {
            session.cancelled = true;
            dragSessionRef.current = session;
            return;
          }

          const hasHorizontalIntent =
            absDeltaX >= COLUMN_DRAG_ACTIVATION_DISTANCE_PX &&
            absDeltaX > absDeltaY * COLUMN_DRAG_HORIZONTAL_INTENT_RATIO;

          if (!hasHorizontalIntent) return;

          session.dragging = true;
          dragSessionRef.current = session;
          suppressNextSortClickRef.current = true;
          document.body.style.cursor = "grabbing";
          document.body.style.userSelect = "none";
        }

        pointerEvent.preventDefault();

        const overColumnId =
          getColumnIdAtClientX(pointerEvent.clientX) ?? session.activeColumnId;

        setDragState({
          activeColumnId: session.activeColumnId,
          overColumnId,
          isDragging: true,
          preview: buildPreviewState(session, pointerEvent.clientX),
        });
      };

      const handlePointerUp = (pointerEvent: PointerEvent) => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);

        const session = dragSessionRef.current;
        const overColumnId = session?.dragging
          ? getColumnIdAtClientX(pointerEvent.clientX)
          : null;

        if (
          session?.dragging &&
          overColumnId &&
          overColumnId !== session.activeColumnId
        ) {
          onColumnReorder(session.activeColumnId, overColumnId);
        }

        clearColumnDragSession();

        window.setTimeout(() => {
          suppressNextSortClickRef.current = false;
        }, 0);
      };

      window.addEventListener("pointermove", handlePointerMove, {
        passive: false,
      });
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [
      buildPreviewState,
      clearColumnDragSession,
      getColumnIdAtClientX,
      onColumnReorder,
    ],
  );

  const getDropIndicatorPosition = useCallback(
    (columnId: ExplorerDetailColumnId): ColumnDropIndicatorPosition | null => {
      if (!dragState?.isDragging) return null;
      if (dragState.activeColumnId === columnId) return null;
      if (dragState.overColumnId !== columnId) return null;

      const activeIndex = normalizedColumnOrder.indexOf(dragState.activeColumnId);
      const overIndex = normalizedColumnOrder.indexOf(columnId);

      if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) {
        return null;
      }

      return activeIndex < overIndex ? "after" : "before";
    },
    [dragState, normalizedColumnOrder],
  );

  return (
    <>
      <div
        ref={headerRef}
        role="row"
        className={cn(
          DETAIL_GRID_CLASS,
          "sticky top-0 z-30 h-9 border-b border-[#dddcd5]",
          "bg-[rgba(250,249,246,0.98)] text-[12px] font-medium text-[#777671]",
        )}
        style={gridStyle}
      >
        {normalizedColumnOrder.map((columnId, index) => {
          const column = DETAIL_HEADER_COLUMNS[columnId];
          const isLastColumn = index === normalizedColumnOrder.length - 1;

          return (
            <HeaderCell
              key={columnId}
              label={column.label}
              columnId={columnId}
              sortKey={column.sortKey}
              sortState={sortState}
              onSort={onSort}
              onHeaderPointerDown={handleHeaderPointerDown}
              shouldSuppressSortClick={shouldSuppressSortClick}
              onResizePointerDown={onResizePointerDown}
              onResetWidth={onResetWidth}
              dropIndicatorPosition={getDropIndicatorPosition(columnId)}
              isColumnDragging={dragState?.activeColumnId === columnId}
              isColumnOver={
                dragState?.isDragging === true && dragState.overColumnId === columnId
              }
              className={isLastColumn ? "border-r-0" : undefined}
            />
          );
        })}
      </div>

      {dragState?.isDragging ? (
        <HeaderColumnDragPreview preview={dragState.preview} />
      ) : null}
    </>
  );
};
