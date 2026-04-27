import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  DETAIL_GRID_CLASS,
  isDetailColumnId,
  normalizeDetailColumnOrder,
  type ExplorerDetailColumnOrder,
} from "./folderDetailColumns";
import { getHeaderAriaSort, getHeaderSortLabel } from "./folderDetailSorting";
import {
  useMemo,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
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

type HeaderCellProps = {
  label: string;
  columnId: ExplorerDetailColumnId;
  sortKey?: SortableDetailSortKey;
  sortState: ExplorerDetailSortState;
  onSort: (key: SortableDetailSortKey) => void;
  onResizePointerDown: (
    columnId: ExplorerDetailColumnId,
    event: ReactPointerEvent<HTMLSpanElement>,
  ) => void;
  onResetWidth: (columnId: ExplorerDetailColumnId) => void;
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

const HeaderCell = ({
  label,
  columnId,
  sortKey,
  sortState,
  onSort,
  onResizePointerDown,
  onResetWidth,
  className,
}: HeaderCellProps) => {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: columnId });

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  } satisfies CSSProperties;

  const sortLabel = (
    <>
      <span className="truncate">
        {label}
        {sortKey ? getHeaderSortLabel(sortState, sortKey) : ""}
      </span>
    </>
  );

  return (
    <div
      ref={setNodeRef}
      role="columnheader"
      aria-sort={sortKey ? getHeaderAriaSort(sortState, sortKey) : undefined}
      data-column-id={columnId}
      data-column-dragging={isDragging ? "true" : undefined}
      className={cn(
        "relative flex min-w-0 items-center gap-1 border-r border-[#e6e4dc] px-2",
        "transition-colors",
        isDragging && "z-50 bg-[#eeece4] opacity-80 shadow-sm",
        className,
      )}
      style={sortableStyle}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`${label}列をドラッグして順序を変更`}
        title="ドラッグで列の順序を変更"
        data-detail-column-reorder-handle="true"
        className={cn(
          "flex h-6 w-4 shrink-0 cursor-grab items-center justify-center rounded-[4px]",
          "text-[13px] leading-none text-[#aaa69c] transition-colors",
          "hover:bg-[#e6e4dc] hover:text-[#6f6b63] active:cursor-grabbing",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>

      {sortKey ? (
        <button
          type="button"
          className={cn(
            "flex min-w-0 flex-1 items-center text-left",
            "text-[#777671] transition-colors hover:text-[#24231f]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          onClick={() => onSort(sortKey)}
        >
          {sortLabel}
        </button>
      ) : (
        <span className="min-w-0 flex-1 truncate">{sortLabel}</span>
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
  const normalizedColumnOrder = useMemo<ExplorerDetailColumnOrder>(
    () => normalizeDetailColumnOrder(columnOrder),
    [columnOrder],
  );
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const activeColumnId = event.active.id;
    const overColumnId = event.over?.id;

    if (
      !isDetailColumnId(activeColumnId) ||
      !isDetailColumnId(overColumnId) ||
      activeColumnId === overColumnId
    ) {
      return;
    }

    onColumnReorder(activeColumnId, overColumnId);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={normalizedColumnOrder}
        strategy={horizontalListSortingStrategy}
      >
        <div
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
                onResizePointerDown={onResizePointerDown}
                onResetWidth={onResetWidth}
                className={isLastColumn ? "border-r-0" : undefined}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
};
