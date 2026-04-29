import {
  ExplorerChromeCardIcon,
  ExplorerChromeCardSetIcon,
  ExplorerChromeFolderIcon,
  ExplorerChromePdfIcon,
} from "@/components/explorer/icons";
import { ExplorerDetailSyncBadge } from "@/components/folder/components/ExplorerDetailSyncBadge";
import type {
  ExplorerDetailRow,
  ExplorerDetailRowKind,
} from "@/components/folder/explorer/model/detailRows";
import {
  formatExplorerSize,
  formatExplorerUpdatedAt,
} from "@/components/folder/explorer/model/formatExplorerDetail";
import type { ExplorerDetailSyncViewState } from "@/hooks/sync/useExplorerDetailSyncStates";
import { cn } from "@/lib/utils";
import {
  useEffect,
  useRef,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { DETAIL_GRID_CLASS } from "./folderDetailColumns";
import type {
  ExplorerDetailColumnId,
  ExplorerDetailDropPosition,
  ExplorerDetailTagEditorState,
} from "./folderDetailTypes";

type FolderDetailRowProps = {
  columnOrder: readonly ExplorerDetailColumnId[];
  row: ExplorerDetailRow;
  syncState: ExplorerDetailSyncViewState;
  selected: boolean;
  dragging: boolean;
  draggable: boolean;
  dropPosition: ExplorerDetailDropPosition | null;
  onActivate: () => void;
  onDragStart: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDragEnd: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDragOver: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDrop: (event: ReactDragEvent<HTMLDivElement>) => void;
  gridStyle: CSSProperties;
  tagDisplayText: string;
  tagEditState: ExplorerDetailTagEditorState | null;
  onTagCellContextMenu: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onTagEditChange: (value: string) => void;
  onTagEditKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onTagEditBlur: () => void;
};

const renderRowIcon = (kind: ExplorerDetailRowKind) => {
  if (kind === "folder") {
    return <ExplorerChromeFolderIcon className="h-4 w-4" />;
  }

  if (kind === "cardSet") {
    return <ExplorerChromeCardSetIcon className="h-4 w-4" />;
  }

  if (kind === "card") {
    return <ExplorerChromeCardIcon className="h-4 w-4" />;
  }

  return <ExplorerChromePdfIcon className="h-4 w-4" />;
};

export const FolderDetailRow = ({
  columnOrder,
  row,
  syncState,
  selected,
  dragging,
  draggable,
  dropPosition,
  onActivate,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  gridStyle,
  tagDisplayText,
  tagEditState,
  onTagCellContextMenu,
  onTagEditChange,
  onTagEditKeyDown,
  onTagEditBlur,
}: FolderDetailRowProps) => {
  const tagInputRef = useRef<HTMLInputElement | null>(null);
  const activeTagEditState =
    tagEditState?.rowKey === row.key ? tagEditState : null;
  const isEditingTags = Boolean(activeTagEditState);

  useEffect(() => {
    if (!isEditingTags) return;

    const frameId = window.requestAnimationFrame(() => {
      tagInputRef.current?.focus({ preventScroll: true });
      tagInputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isEditingTags]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof HTMLElement) {
      const isInteractiveTarget = Boolean(
        target.closest(
          "input, textarea, select, button, [contenteditable='true'], [data-detail-tag-editor='true']",
        ),
      );

      if (isInteractiveTarget) return;
    }

    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    onActivate();
  };

  const renderCell = (columnId: ExplorerDetailColumnId) => {
    if (columnId === "name") {
      return (
        <div
          key={columnId}
          role="cell"
          className="flex min-w-0 items-center gap-2 px-3"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
            {renderRowIcon(row.kind)}
          </span>
          <span className="min-w-0 truncate" title={row.name}>
            {row.name}
          </span>
        </div>
      );
    }

    if (columnId === "tags") {
      return (
        <div
          key={columnId}
          role="cell"
          className="relative flex min-w-0 items-center px-3 text-[#777671]"
          title={tagDisplayText}
          onContextMenu={onTagCellContextMenu}
          onPointerDown={(event) => {
            if (!isEditingTags) return;
            event.stopPropagation();
          }}
          onMouseDown={(event) => {
            if (!isEditingTags) return;
            event.stopPropagation();
          }}
          onClick={(event) => {
            if (!isEditingTags) return;
            event.stopPropagation();
          }}
          onDoubleClick={(event) => {
            if (!isEditingTags) return;
            event.stopPropagation();
          }}
        >
          {activeTagEditState ? (
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <input
                ref={tagInputRef}
                data-detail-tag-editor="true"
                value={activeTagEditState.value}
                disabled={activeTagEditState.isSaving}
                aria-label={`${row.name} のタグを編集`}
                placeholder="タグ名だけで入力可。保存後は # が付きます"
                className={cn(
                  "h-7 min-w-0 rounded-[5px] border border-[#a8a176] bg-white px-2",
                  "text-[12px] text-[#24231f] shadow-[0_0_0_2px_rgba(168,161,118,0.18)] outline-none",
                  "disabled:cursor-wait disabled:opacity-70",
                )}
                onChange={(event) => onTagEditChange(event.target.value)}
                onKeyDown={onTagEditKeyDown}
                onBlur={onTagEditBlur}
                onPointerDown={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
                onDoubleClick={(event) => event.stopPropagation()}
                onContextMenu={(event) => event.stopPropagation()}
              />
              {activeTagEditState.error ? (
                <span className="truncate text-[10px] leading-none text-[#9b3f35]">
                  {activeTagEditState.error}
                </span>
              ) : null}
            </div>
          ) : (
            <span className="truncate">{tagDisplayText}</span>
          )}
        </div>
      );
    }

    if (columnId === "path") {
      return (
        <div
          key={columnId}
          role="cell"
          className="flex min-w-0 items-center px-3 text-[#777671]"
          title={row.path}
        >
          <span className="truncate">{row.path}</span>
        </div>
      );
    }

    if (columnId === "updatedAt") {
      return (
        <div
          key={columnId}
          role="cell"
          className="flex min-w-0 items-center px-3 text-[#777671]"
        >
          <span className="truncate">
            {formatExplorerUpdatedAt(row.updatedAt)}
          </span>
        </div>
      );
    }

    if (columnId === "sync") {
      return (
        <div
          key={columnId}
          role="cell"
          className="flex min-w-0 items-center px-3 text-[#777671]"
        >
          <ExplorerDetailSyncBadge state={syncState} />
        </div>
      );
    }

    if (columnId === "kind") {
      return (
        <div
          key={columnId}
          role="cell"
          className="flex min-w-0 items-center px-3 text-[#777671]"
        >
          <span className="truncate">{row.typeLabel}</span>
        </div>
      );
    }

    return (
      <div
        key={columnId}
        role="cell"
        className="flex min-w-0 items-center px-3 text-left text-[#777671]"
      >
        <span className="truncate">{formatExplorerSize(row.sizeBytes)}</span>
      </div>
    );
  };

  return (
    <div
      role="row"
      tabIndex={0}
      data-selected={selected ? "true" : undefined}
      data-detail-row="true"
      draggable={draggable && !isEditingTags}
      aria-grabbed={dragging ? true : undefined}
      className={cn(
        DETAIL_GRID_CLASS,
        "relative min-h-[38px] cursor-default border-b border-[#efeee8] text-[13px]",
        "text-[#24231f] outline-none transition-colors",
        selected ? "bg-[rgba(0,0,0,0.06)]" : "bg-transparent hover:bg-[rgba(0,0,0,0.04)]",
        dragging && "opacity-45",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
      )}
      style={gridStyle}
      onClick={onActivate}
      onKeyDown={handleKeyDown}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dropPosition === "before" ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 top-[-1px] z-20 h-[2px] bg-[#7f7a72]"
        />
      ) : null}
      {dropPosition === "after" ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[-1px] left-0 right-0 z-20 h-[2px] bg-[#7f7a72]"
        />
      ) : null}
      {dropPosition === "inside" ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-1 inset-y-[3px] z-10 rounded-[8px] shadow-[inset_0_0_0_1px_rgba(127,122,114,0.36)]"
        />
      ) : null}

      {columnOrder.map(renderCell)}
    </div>
  );
};
