import { cn } from "@/lib/utils";
import type { PointerEvent as ReactPointerEvent, CSSProperties } from "react";
import { DETAIL_GRID_CLASS } from "./folderDetailColumns";
import { getHeaderAriaSort, getHeaderSortLabel } from "./folderDetailSorting";
import type {
  ExplorerDetailColumnId,
  ExplorerDetailSortKey,
  ExplorerDetailSortState,
} from "./folderDetailTypes";

type SortableDetailSortKey = Exclude<ExplorerDetailSortKey, "manual">;

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
  gridStyle: CSSProperties;
  sortState: ExplorerDetailSortState;
  onSort: (key: SortableDetailSortKey) => void;
  onResizePointerDown: (
    columnId: ExplorerDetailColumnId,
    event: ReactPointerEvent<HTMLSpanElement>,
  ) => void;
  onResetWidth: (columnId: ExplorerDetailColumnId) => void;
};

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
  const sortable = Boolean(sortKey);
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
        className={cn(
          "absolute bottom-0 right-[-3px] top-0 z-40 w-[7px] cursor-col-resize",
          "after:absolute after:bottom-1 after:right-[3px] after:top-1 after:w-px after:bg-transparent",
          "hover:after:bg-[#aaa69c] active:after:bg-[#7f7a72]",
        )}
        onPointerDown={(event) => onResizePointerDown(columnId, event)}
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
        className={cn(
          "relative flex min-w-0 items-center border-r border-[#e6e4dc] px-3",
          className,
        )}
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
      onClick={() => onSort(sortKey)}
      className={cn(
        "relative flex min-w-0 items-center border-r border-[#e6e4dc] px-3 text-left",
        "text-[#777671] transition-colors hover:bg-[#eeece4] hover:text-[#24231f]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {content}
    </button>
  );
};

export const FolderDetailHeader = ({
  gridStyle,
  sortState,
  onSort,
  onResizePointerDown,
  onResetWidth,
}: FolderDetailHeaderProps) => {
  return (
    <div
      role="row"
      className={cn(
        DETAIL_GRID_CLASS,
        "sticky top-0 z-30 h-9 border-b border-[#dddcd5]",
        "bg-[rgba(250,249,246,0.98)] text-[12px] font-medium text-[#777671]",
      )}
      style={gridStyle}
    >
      <HeaderCell
        label="名前"
        columnId="name"
        sortKey="name"
        sortState={sortState}
        onSort={onSort}
        onResizePointerDown={onResizePointerDown}
        onResetWidth={onResetWidth}
      />
      <HeaderCell
        label="タグ"
        columnId="tags"
        sortState={sortState}
        onSort={onSort}
        onResizePointerDown={onResizePointerDown}
        onResetWidth={onResetWidth}
      />
      <HeaderCell
        label="パス"
        columnId="path"
        sortState={sortState}
        onSort={onSort}
        onResizePointerDown={onResizePointerDown}
        onResetWidth={onResetWidth}
      />
      <HeaderCell
        label="更新日時"
        columnId="updatedAt"
        sortKey="updatedAt"
        sortState={sortState}
        onSort={onSort}
        onResizePointerDown={onResizePointerDown}
        onResetWidth={onResetWidth}
      />
      <HeaderCell
        label="同期"
        columnId="sync"
        sortState={sortState}
        onSort={onSort}
        onResizePointerDown={onResizePointerDown}
        onResetWidth={onResetWidth}
      />
      <HeaderCell
        label="種類"
        columnId="kind"
        sortKey="kind"
        sortState={sortState}
        onSort={onSort}
        onResizePointerDown={onResizePointerDown}
        onResetWidth={onResetWidth}
      />
      <HeaderCell
        label="サイズ"
        columnId="size"
        sortKey="size"
        sortState={sortState}
        onSort={onSort}
        onResizePointerDown={onResizePointerDown}
        onResetWidth={onResetWidth}
        className="border-r-0 text-left"
      />
    </div>
  );
};
