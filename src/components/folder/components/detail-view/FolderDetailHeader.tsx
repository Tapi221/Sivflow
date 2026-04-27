import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { DETAIL_GRID_CLASS } from "./folderDetailColumns";
import { getHeaderAriaSort, getHeaderSortLabel } from "./folderDetailSorting";
import type {
  ExplorerDetailColumnId,
  ExplorerDetailSortKey,
  ExplorerDetailSortState,
} from "./folderDetailTypes";

type SortableDetailSortKey = Exclude<ExplorerDetailSortKey, "manual">;

type DetailHeaderColumnConfig = {
  label: string;
  sortKey?: SortableDetailSortKey;
};

type ColumnDragVisualState = {
  activeColumnId: ExplorerDetailColumnId;
  offsetX: number;
  insertIndex: number;
  insertLeft: number;
};

type PendingColumnDragState = {
  activeColumnId: ExplorerDetailColumnId;
  label: string;
  pointerId: number;
  startX: number;
  startY: number;
  hasStarted: boolean;
};

type BodyDragStyleSnapshot = {
  cursor: string;
  userSelect: string;
};

type HeaderCellProps = {
  label: string;
  columnId: ExplorerDetailColumnId;
  sortKey?: SortableDetailSortKey;
  sortState: ExplorerDetailSortState;
  isLastColumn: boolean;
  isColumnDragging: boolean;
  dragOffsetX: number;
  onSortClick: (
    key: SortableDetailSortKey,
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => void;
  onColumnPointerDown: (
    columnId: ExplorerDetailColumnId,
    label: string,
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
  onResizePointerDown: (
    columnId: ExplorerDetailColumnId,
    event: ReactPointerEvent<HTMLSpanElement>,
  ) => void;
  onResetWidth: (columnId: ExplorerDetailColumnId) => void;
};

type FolderDetailHeaderProps = {
  columnOrder: readonly ExplorerDetailColumnId[];
  gridStyle: CSSProperties;
  sortState: ExplorerDetailSortState;
  onSort: (key: SortableDetailSortKey) => void;
  onColumnReorder: (
    activeColumnId: ExplorerDetailColumnId,
    targetIndex: number,
  ) => void;
  onResizePointerDown: (
    columnId: ExplorerDetailColumnId,
    event: ReactPointerEvent<HTMLSpanElement>,
  ) => void;
  onResetWidth: (columnId: ExplorerDetailColumnId) => void;
};

const COLUMN_DRAG_START_DISTANCE_PX = 8;

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
} satisfies Record<ExplorerDetailColumnId, DetailHeaderColumnConfig>;

const HeaderCell = ({
  label,
  columnId,
  sortKey,
  sortState,
  isLastColumn,
  isColumnDragging,
  dragOffsetX,
  onSortClick,
  onColumnPointerDown,
  onResizePointerDown,
  onResetWidth,
}: HeaderCellProps) => {
  const sortable = Boolean(sortKey);
  const dragStyle =
    dragOffsetX === 0
      ? undefined
      : ({
          transform: `translate3d(${dragOffsetX}px, 0, 0)`,
        } satisfies CSSProperties);
  const baseClassName = cn(
    "relative flex min-w-0 select-none items-center border-r border-[#e6e4dc] px-3",
    "cursor-grab active:cursor-grabbing",
    "transition-colors",
    isLastColumn && "border-r-0",
    isColumnDragging && "z-50 bg-[#eeece4] shadow-[0_2px_10px_rgba(36,35,31,0.10)]",
  );
  const content = (
    <>
      <span className="truncate">
        {label}
        {sortKey ? getHeaderSortLabel(sortState, sortKey) : ""}
      </span>
      <span
        role="separator"
        aria-orientation="vertical"
        aria-label={`${label}列の幅を変更`}
        title="ドラッグで列幅を変更 / ダブルクリックで初期幅に戻す"
        data-detail-column-resizer="true"
        className={cn(
          "absolute bottom-0 right-[-3px] top-0 z-40 w-[7px] cursor-col-resize",
          "after:absolute after:bottom-1 after:right-[3px] after:top-1 after:w-px after:bg-transparent",
          "hover:after:bg-[#aaa69c] active:after:bg-[#7f7a72]",
        )}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onResizePointerDown(columnId, event);
        }}
        onDoubleClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onResetWidth(columnId);
        }}
      />
    </>
  );

  if (!sortable || !sortKey) {
    return (
      <div
        role="columnheader"
        data-detail-column-id={columnId}
        data-detail-column-dragging={isColumnDragging ? "true" : undefined}
        className={cn(baseClassName, "text-[#777671]")}
        style={dragStyle}
        onPointerDown={(event) => onColumnPointerDown(columnId, label, event)}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      role="columnheader"
      aria-sort={getHeaderAriaSort(sortState, sortKey)}
      data-detail-column-id={columnId}
      data-detail-column-dragging={isColumnDragging ? "true" : undefined}
      className={cn(
        baseClassName,
        "text-left text-[#777671] hover:bg-[#eeece4] hover:text-[#24231f]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      style={dragStyle}
      onPointerDown={(event) => onColumnPointerDown(columnId, label, event)}
      onClick={(event) => onSortClick(sortKey, event)}
    >
      {content}
    </button>
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
  const rowRef = useRef<HTMLDivElement | null>(null);
  const columnOrderRef = useRef(columnOrder);
  const onColumnReorderRef = useRef(onColumnReorder);
  const pendingColumnDragRef = useRef<PendingColumnDragState | null>(null);
  const columnDragVisualRef = useRef<ColumnDragVisualState | null>(null);
  const columnClickSuppressedRef = useRef(false);
  const bodyDragStyleSnapshotRef = useRef<BodyDragStyleSnapshot | null>(null);
  const [columnDragVisual, setColumnDragVisual] =
    useState<ColumnDragVisualState | null>(null);

  useEffect(() => {
    columnOrderRef.current = columnOrder;
  }, [columnOrder]);

  useEffect(() => {
    onColumnReorderRef.current = onColumnReorder;
  }, [onColumnReorder]);

  const restoreBodyDragStyle = useCallback(() => {
    const snapshot = bodyDragStyleSnapshotRef.current;
    if (!snapshot) return;

    document.body.style.cursor = snapshot.cursor;
    document.body.style.userSelect = snapshot.userSelect;
    bodyDragStyleSnapshotRef.current = null;
  }, []);

  const getColumnInsertPlacement = useCallback(
    (
      activeColumnId: ExplorerDetailColumnId,
      clientX: number,
    ): Pick<ColumnDragVisualState, "insertIndex" | "insertLeft"> => {
      const rowElement = rowRef.current;
      const orderedColumnIds = columnOrderRef.current.filter(
        (columnId) => columnId !== activeColumnId,
      );

      if (!rowElement || orderedColumnIds.length === 0) {
        return { insertIndex: 0, insertLeft: 0 };
      }

      const rowRect = rowElement.getBoundingClientRect();

      for (let index = 0; index < orderedColumnIds.length; index += 1) {
        const columnId = orderedColumnIds[index];
        const columnElement = rowElement.querySelector<HTMLElement>(
          `[data-detail-column-id="${columnId}"]`,
        );

        if (!columnElement) continue;

        const columnRect = columnElement.getBoundingClientRect();
        const columnCenterX = columnRect.left + columnRect.width / 2;

        if (clientX < columnCenterX) {
          return {
            insertIndex: index,
            insertLeft: columnRect.left - rowRect.left,
          };
        }
      }

      const lastColumnId = orderedColumnIds[orderedColumnIds.length - 1];
      const lastColumnElement = rowElement.querySelector<HTMLElement>(
        `[data-detail-column-id="${lastColumnId}"]`,
      );

      if (!lastColumnElement) {
        return {
          insertIndex: orderedColumnIds.length,
          insertLeft: rowRect.width,
        };
      }

      return {
        insertIndex: orderedColumnIds.length,
        insertLeft: lastColumnElement.getBoundingClientRect().right - rowRect.left,
      };
    },
    [],
  );

  const updateColumnDragVisual = useCallback(
    (event: PointerEvent, pendingDrag: PendingColumnDragState) => {
      const offsetX = event.clientX - pendingDrag.startX;
      const placement = getColumnInsertPlacement(
        pendingDrag.activeColumnId,
        event.clientX,
      );
      const nextVisual: ColumnDragVisualState = {
        activeColumnId: pendingDrag.activeColumnId,
        offsetX,
        insertIndex: placement.insertIndex,
        insertLeft: placement.insertLeft,
      };

      columnDragVisualRef.current = nextVisual;
      setColumnDragVisual(nextVisual);
    },
    [getColumnInsertPlacement],
  );

  const handleWindowPointerMove = useCallback(
    (event: PointerEvent) => {
      const pendingDrag = pendingColumnDragRef.current;
      if (!pendingDrag || event.pointerId !== pendingDrag.pointerId) return;

      const offsetX = event.clientX - pendingDrag.startX;
      const offsetY = event.clientY - pendingDrag.startY;

      if (!pendingDrag.hasStarted) {
        if (Math.abs(offsetX) < COLUMN_DRAG_START_DISTANCE_PX) return;

        pendingDrag.hasStarted = true;
        columnClickSuppressedRef.current = true;
        bodyDragStyleSnapshotRef.current = {
          cursor: document.body.style.cursor,
          userSelect: document.body.style.userSelect,
        };
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
      }

      event.preventDefault();
      updateColumnDragVisual(event, pendingDrag);

      if (Math.abs(offsetY) > Math.abs(offsetX) * 2) {
        return;
      }
    },
    [updateColumnDragVisual],
  );

  const handleWindowPointerEnd = useCallback(
    (event: PointerEvent) => {
      const pendingDrag = pendingColumnDragRef.current;
      if (!pendingDrag || event.pointerId !== pendingDrag.pointerId) return;

      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerEnd);
      window.removeEventListener("pointercancel", handleWindowPointerEnd);

      if (pendingDrag.hasStarted) {
        const visual = columnDragVisualRef.current;
        columnClickSuppressedRef.current = true;

        if (visual) {
          onColumnReorderRef.current(
            pendingDrag.activeColumnId,
            visual.insertIndex,
          );
        }
      }

      pendingColumnDragRef.current = null;
      columnDragVisualRef.current = null;
      setColumnDragVisual(null);
      restoreBodyDragStyle();
    },
    [handleWindowPointerMove, restoreBodyDragStyle],
  );

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerEnd);
      window.removeEventListener("pointercancel", handleWindowPointerEnd);
      restoreBodyDragStyle();
    };
  }, [handleWindowPointerEnd, handleWindowPointerMove, restoreBodyDragStyle]);

  const handleColumnPointerDown = useCallback(
    (
      columnId: ExplorerDetailColumnId,
      label: string,
      event: ReactPointerEvent<HTMLElement>,
    ) => {
      if (event.button !== 0) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("[data-detail-column-resizer='true']")
      ) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      pendingColumnDragRef.current = {
        activeColumnId: columnId,
        label,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        hasStarted: false,
      };

      columnDragVisualRef.current = null;
      setColumnDragVisual(null);

      window.addEventListener("pointermove", handleWindowPointerMove, {
        passive: false,
      });
      window.addEventListener("pointerup", handleWindowPointerEnd);
      window.addEventListener("pointercancel", handleWindowPointerEnd);

      if (rect.width <= 0 || rect.height <= 0) return;
    },
    [handleWindowPointerEnd, handleWindowPointerMove],
  );

  const handleSortClick = useCallback(
    (
      key: SortableDetailSortKey,
      event: ReactMouseEvent<HTMLButtonElement>,
    ) => {
      if (columnClickSuppressedRef.current) {
        columnClickSuppressedRef.current = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      onSort(key);
    },
    [onSort],
  );

  return (
    <div
      ref={rowRef}
      role="row"
      className={cn(
        DETAIL_GRID_CLASS,
        "sticky top-0 z-30 h-9 border-b border-[#dddcd5]",
        "relative bg-[rgba(250,249,246,0.98)] text-[12px] font-medium text-[#777671]",
      )}
      style={gridStyle}
    >
      {columnOrder.map((columnId, index) => {
        const column = DETAIL_HEADER_COLUMNS[columnId];
        const isColumnDragging =
          columnDragVisual?.activeColumnId === columnId;
        const dragOffsetX = isColumnDragging ? columnDragVisual.offsetX : 0;

        return (
          <HeaderCell
            key={columnId}
            label={column.label}
            columnId={columnId}
            sortKey={column.sortKey}
            sortState={sortState}
            isLastColumn={index === columnOrder.length - 1}
            isColumnDragging={isColumnDragging}
            dragOffsetX={dragOffsetX}
            onSortClick={handleSortClick}
            onColumnPointerDown={handleColumnPointerDown}
            onResizePointerDown={onResizePointerDown}
            onResetWidth={onResetWidth}
          />
        );
      })}

      {columnDragVisual ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 top-1 z-[70] w-[2px] rounded-full bg-[#7f7a72] shadow-[0_0_0_1px_rgba(255,255,255,0.72)]"
          style={{ left: columnDragVisual.insertLeft }}
        />
      ) : null}
    </div>
  );
};
