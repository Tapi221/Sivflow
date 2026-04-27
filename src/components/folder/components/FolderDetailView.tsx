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
import {
  formatExplorerSize,
  formatExplorerTags,
  formatExplorerUpdatedAt,
} from "@/components/folder/explorer/model/formatExplorerDetail";
import { isSameSelectedExplorerItem } from "@/features/explorer/utils/isSameSelectedExplorerItem";
import { useCardCommands } from "@/hooks/card/useCardCommands";
import { useCardSets } from "@/hooks/cardSet/useCardSets";
import { useExplorerStore } from "@/hooks/folder/useExplorerStore";
import { useFolderCommands } from "@/hooks/folder/useFolderCommands";
import { useDocumentCommands } from "@/hooks/platform/useDocumentCommands";
import { useTags } from "@/hooks/settings/useTags";
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
  type DragEvent as ReactDragEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

interface FolderDetailViewProps {
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
  onMoveFolder?: (
    folderId: string,
    targetParentFolderId: string | null,
  ) => Promise<void>;
  onReorderFolders?: (
    targetParentFolderId: string | null,
    folderIds: string[],
  ) => Promise<void>;
  onMoveCardSetToFolder?: (
    cardSetId: string,
    targetFolderId: string,
  ) => Promise<void>;
  onReorderCardSets?: (
    targetFolderId: string,
    cardSetIds: string[],
  ) => Promise<void>;
  onMoveDocumentToFolder?: (
    documentId: string,
    targetFolderId: string,
  ) => Promise<void>;
  onReorderDocuments?: (
    targetFolderId: string,
    documentIds: string[],
  ) => Promise<void>;
  onMoveCardToSet?: (cardId: string, targetCardSetId: string) => Promise<void>;
  onReorderCardsInCardSet?: (
    cardSetId: string,
    cardIds: string[],
  ) => Promise<void>;
}

type ExplorerDetailSortKey = "manual" | "name" | "updatedAt" | "kind" | "size";
type ExplorerDetailColumnId =
  | "name"
  | "tags"
  | "path"
  | "updatedAt"
  | "kind"
  | "size";
type ExplorerDetailSortDirection = "asc" | "desc";
type ExplorerDetailDropPosition = "before" | "after" | "inside" | "append";

type ExplorerDetailSortState = {
  key: ExplorerDetailSortKey;
  direction: ExplorerDetailSortDirection;
};

type ExplorerDetailDragPayload = {
  kind: ExplorerDetailRowKind;
  id: string;
};

type ExplorerDetailDropIntent = {
  rowKey: string;
  position: ExplorerDetailDropPosition;
};

type ExplorerDetailTagEditorState = {
  rowKey: string;
  rowKind: ExplorerDetailRowKind;
  rowId: string;
  value: string;
  error: string | null;
  isSaving: boolean;
};

const EXPLORER_DETAIL_COLUMN_WIDTHS_STORAGE_KEY =
  "manifolia:folder-detail-view:column-widths";

const DETAIL_GRID_CLASS = "grid";

const DETAIL_COLUMN_IDS = [
  "name",
  "tags",
  "path",
  "updatedAt",
  "kind",
  "size",
] as const satisfies readonly ExplorerDetailColumnId[];

type ExplorerDetailColumnWidths = Record<ExplorerDetailColumnId, number>;

const DETAIL_DEFAULT_COLUMN_WIDTHS = {
  name: 320,
  tags: 190,
  path: 420,
  updatedAt: 168,
  kind: 128,
  size: 112,
} satisfies ExplorerDetailColumnWidths;

const DETAIL_MIN_COLUMN_WIDTHS = {
  name: 180,
  tags: 120,
  path: 220,
  updatedAt: 132,
  kind: 96,
  size: 84,
} satisfies ExplorerDetailColumnWidths;

const DETAIL_MAX_COLUMN_WIDTH_PX = 820;

const DEFAULT_SORT_STATE: ExplorerDetailSortState = {
  key: "manual",
  direction: "asc",
};

const clampDetailColumnWidth = (
  columnId: ExplorerDetailColumnId,
  width: number,
): number => {
  if (!Number.isFinite(width)) return DETAIL_DEFAULT_COLUMN_WIDTHS[columnId];

  return Math.min(
    Math.max(Math.round(width), DETAIL_MIN_COLUMN_WIDTHS[columnId]),
    DETAIL_MAX_COLUMN_WIDTH_PX,
  );
};

const normalizeDetailColumnWidths = (
  value: unknown,
): ExplorerDetailColumnWidths => {
  const next = { ...DETAIL_DEFAULT_COLUMN_WIDTHS };

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return next;
  }

  const record = value as Partial<Record<ExplorerDetailColumnId, unknown>>;

  DETAIL_COLUMN_IDS.forEach((columnId) => {
    const width = record[columnId];
    if (typeof width !== "number") return;
    next[columnId] = clampDetailColumnWidth(columnId, width);
  });

  return next;
};

const readStoredDetailColumnWidths = (): ExplorerDetailColumnWidths => {
  if (typeof window === "undefined") {
    return { ...DETAIL_DEFAULT_COLUMN_WIDTHS };
  }

  const raw = window.localStorage.getItem(
    EXPLORER_DETAIL_COLUMN_WIDTHS_STORAGE_KEY,
  );
  if (!raw) return { ...DETAIL_DEFAULT_COLUMN_WIDTHS };

  try {
    return normalizeDetailColumnWidths(JSON.parse(raw) as unknown);
  } catch {
    return { ...DETAIL_DEFAULT_COLUMN_WIDTHS };
  }
};

const writeStoredDetailColumnWidths = (widths: ExplorerDetailColumnWidths) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    EXPLORER_DETAIL_COLUMN_WIDTHS_STORAGE_KEY,
    JSON.stringify(widths),
  );
};

const buildDetailGridTemplateColumns = (
  widths: ExplorerDetailColumnWidths,
): string => {
  return DETAIL_COLUMN_IDS.map((columnId) => `${widths[columnId]}px`).join(" ");
};

const getDetailGridMinWidth = (widths: ExplorerDetailColumnWidths): number => {
  return DETAIL_COLUMN_IDS.reduce(
    (total, columnId) => total + widths[columnId],
    0,
  );
};

const getFolderParentId = (folder: Folder): string | null => {
  return (
    folder.parentFolderId ??
    (folder as unknown as { parent_folder_id?: string | null })
      .parent_folder_id ??
    null
  );
};

const getFolderStableId = (folder: Folder): string => {
  return folder.id || folder.folderId;
};

const sortByString = (
  left: string,
  right: string,
  direction: ExplorerDetailSortDirection,
): number => {
  const result = left.localeCompare(right, "ja");
  return direction === "asc" ? result : -result;
};

const sortByNumber = (
  left: number,
  right: number,
  direction: ExplorerDetailSortDirection,
): number => {
  const result = left - right;
  return direction === "asc" ? result : -result;
};

const getKindSortValue = (kind: ExplorerDetailRowKind): number => {
  if (kind === "folder") return 0;
  if (kind === "cardSet") return 1;
  if (kind === "card") return 2;
  return 3;
};

const sortRows = (
  rows: ExplorerDetailRow[],
  sortState: ExplorerDetailSortState,
): ExplorerDetailRow[] => {
  if (sortState.key === "manual") return rows;

  return [...rows].sort((left, right) => {
    if (sortState.key === "name") {
      return sortByString(left.name, right.name, sortState.direction);
    }

    if (sortState.key === "updatedAt") {
      return sortByNumber(
        left.updatedAtMs,
        right.updatedAtMs,
        sortState.direction,
      );
    }

    if (sortState.key === "kind") {
      return sortByNumber(
        getKindSortValue(left.kind),
        getKindSortValue(right.kind),
        sortState.direction,
      );
    }

    const leftSize = left.sizeBytes ?? -1;
    const rightSize = right.sizeBytes ?? -1;
    return sortByNumber(leftSize, rightSize, sortState.direction);
  });
};

const getNextSortState = (
  current: ExplorerDetailSortState,
  key: Exclude<ExplorerDetailSortKey, "manual">,
): ExplorerDetailSortState => {
  if (current.key !== key) {
    return {
      key,
      direction: key === "updatedAt" ? "desc" : "asc",
    };
  }

  if (current.direction === "asc") {
    return { key, direction: "desc" };
  }

  return DEFAULT_SORT_STATE;
};

const getHeaderSortLabel = (
  sortState: ExplorerDetailSortState,
  key: Exclude<ExplorerDetailSortKey, "manual">,
): string => {
  if (sortState.key !== key) return "";
  return sortState.direction === "asc" ? " ▲" : " ▼";
};

const getHeaderAriaSort = (
  sortState: ExplorerDetailSortState,
  key: Exclude<ExplorerDetailSortKey, "manual">,
): "ascending" | "descending" | "none" => {
  if (sortState.key !== key) return "none";
  return sortState.direction === "asc" ? "ascending" : "descending";
};

const getRowIcon = (kind: ExplorerDetailRowKind) => {
  if (kind === "folder") return ExplorerChromeFolderIcon;
  if (kind === "cardSet") return ExplorerChromeCardSetIcon;
  if (kind === "card") return ExplorerChromeCardIcon;
  return ExplorerChromePdfIcon;
};

const getDropPositionFromPointer = (
  row: ExplorerDetailRow,
  event: ReactDragEvent<HTMLElement>,
): ExplorerDetailDropPosition => {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio =
    rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;

  if (row.kind === "folder" && ratio >= 0.32 && ratio <= 0.68) {
    return "inside";
  }

  return ratio < 0.5 ? "before" : "after";
};

const moveIdBeforeOrAfter = (
  orderedIds: string[],
  movingId: string,
  targetId: string,
  position: "before" | "after",
): string[] => {
  const withoutMoving = orderedIds.filter((id) => id !== movingId);
  const targetIndex = withoutMoving.indexOf(targetId);

  if (targetIndex < 0) {
    return [...withoutMoving, movingId];
  }

  const insertionIndex = position === "before" ? targetIndex : targetIndex + 1;
  return [
    ...withoutMoving.slice(0, insertionIndex),
    movingId,
    ...withoutMoving.slice(insertionIndex),
  ];
};

const isSamePayloadAndRow = (
  payload: ExplorerDetailDragPayload,
  row: ExplorerDetailRow,
): boolean => {
  return payload.kind === row.kind && payload.id === row.id;
};

const isFolderDescendantOf = (
  folders: Folder[],
  candidateFolderId: string,
  ancestorFolderId: string,
): boolean => {
  const parentById = new Map<string, string | null>();

  folders.forEach((folder) => {
    const folderId = getFolderStableId(folder);
    if (!folderId) return;

    parentById.set(folderId, getFolderParentId(folder));
  });

  const seenFolderIds = new Set<string>();
  let currentFolderId = parentById.get(candidateFolderId) ?? null;

  while (currentFolderId && !seenFolderIds.has(currentFolderId)) {
    if (currentFolderId === ancestorFolderId) return true;
    seenFolderIds.add(currentFolderId);
    currentFolderId = parentById.get(currentFolderId) ?? null;
  }

  return false;
};

const normalizeTagName = (tag: string): string => {
  return tag.replace(/^#+/, "").trim();
};

const toHashTagDisplayName = (tag: string): string => {
  const normalizedTagName = normalizeTagName(tag);
  return normalizedTagName ? `#${normalizedTagName}` : "";
};

const parseTagEditorValue = (value: string): string[] => {
  const tagNames = value
    .split(/[\s,、]+/u)
    .map(normalizeTagName)
    .filter(Boolean);

  return Array.from(new Set(tagNames));
};

const buildTagEditorValue = (tags: string[]): string => {
  return tags.map(toHashTagDisplayName).filter(Boolean).join(" ");
};

const formatExplorerTagNames = (tags: string[]): string => {
  return formatExplorerTags(tags.map(toHashTagDisplayName).filter(Boolean));
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
}: {
  label: string;
  columnId: ExplorerDetailColumnId;
  sortKey?: Exclude<ExplorerDetailSortKey, "manual">;
  sortState: ExplorerDetailSortState;
  onSort: (key: Exclude<ExplorerDetailSortKey, "manual">) => void;
  onResizePointerDown: (
    columnId: ExplorerDetailColumnId,
    event: ReactPointerEvent<HTMLSpanElement>,
  ) => void;
  onResetWidth: (columnId: ExplorerDetailColumnId) => void;
  className?: string;
}) => {
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

const FolderDetailRowView = ({
  row,
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
}: {
  row: ExplorerDetailRow;
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
}) => {
  const Icon = getRowIcon(row.kind);
  const tagInputRef = useRef<HTMLInputElement | null>(null);
  const isEditingTags = tagEditState?.rowKey === row.key;

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
        selected ? "bg-[#ebe7df]" : "bg-transparent hover:bg-[#f5f3ee]",
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

      <div role="cell" className="flex min-w-0 items-center gap-2 px-3">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 truncate" title={row.name}>
          {row.name}
        </span>
      </div>
      <div
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
        {isEditingTags ? (
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <input
              ref={tagInputRef}
              data-detail-tag-editor="true"
              value={tagEditState.value}
              disabled={tagEditState.isSaving}
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
            {tagEditState.error ? (
              <span className="truncate text-[10px] leading-none text-[#9b3f35]">
                {tagEditState.error}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="truncate">{tagDisplayText}</span>
        )}
      </div>
      <div
        role="cell"
        className="flex min-w-0 items-center px-3 text-[#777671]"
        title={row.path}
      >
        <span className="truncate">{row.path}</span>
      </div>
      <div
        role="cell"
        className="flex min-w-0 items-center px-3 text-[#777671]"
      >
        <span className="truncate">
          {formatExplorerUpdatedAt(row.updatedAt)}
        </span>
      </div>
      <div
        role="cell"
        className="flex min-w-0 items-center px-3 text-[#777671]"
      >
        <span className="truncate">{row.typeLabel}</span>
      </div>
      <div
        role="cell"
        className="flex min-w-0 items-center px-3 text-left text-[#777671]"
      >
        <span className="truncate">{formatExplorerSize(row.sizeBytes)}</span>
      </div>
    </div>
  );
};

export const FolderDetailView = ({
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
  onMoveFolder,
  onReorderFolders,
  onMoveCardSetToFolder,
  onReorderCardSets,
  onMoveDocumentToFolder,
  onReorderDocuments,
  onMoveCardToSet,
  onReorderCardsInCardSet,
}: FolderDetailViewProps) => {
  const dragPayloadRef = useRef<ExplorerDetailDragPayload | null>(null);
  const [columnWidths, setColumnWidths] = useState<ExplorerDetailColumnWidths>(
    readStoredDetailColumnWidths,
  );
  const [sortState, setSortState] =
    useState<ExplorerDetailSortState>(DEFAULT_SORT_STATE);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropIntent, setDropIntent] = useState<ExplorerDetailDropIntent | null>(
    null,
  );
  const [tagEditor, setTagEditor] =
    useState<ExplorerDetailTagEditorState | null>(null);
  const tagEditorSkipNextBlurRef = useRef(false);
  const { tags, tagById, addTag } = useTags();
  const { updateCard } = useCardCommands();
  const { updateDocument } = useDocumentCommands();
  const { updateFolder } = useFolderCommands();
  const { updateCardSet } = useCardSets();
  const setExplorerLayoutMode = useExplorerStore(
    (state) => state.setExplorerLayoutMode,
  );

  useEffect(() => {
    writeStoredDetailColumnWidths(columnWidths);
  }, [columnWidths]);

  const detailGridStyle = useMemo(
    () =>
      ({
        gridTemplateColumns: buildDetailGridTemplateColumns(columnWidths),
      }) satisfies CSSProperties,
    [columnWidths],
  );

  const detailTableStyle = useMemo(
    () =>
      ({
        minWidth: `${getDetailGridMinWidth(columnWidths)}px`,
      }) satisfies CSSProperties,
    [columnWidths],
  );

  const handleResizePointerDown = useCallback(
    (
      columnId: ExplorerDetailColumnId,
      event: ReactPointerEvent<HTMLSpanElement>,
    ) => {
      if (event.button !== 0) return;

      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startWidth = columnWidths[columnId];
      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const handlePointerMove = (pointerEvent: PointerEvent) => {
        const deltaX = pointerEvent.clientX - startX;
        const nextWidth = clampDetailColumnWidth(columnId, startWidth + deltaX);
        setColumnWidths((current) => ({
          ...current,
          [columnId]: nextWidth,
        }));
      };

      const handlePointerUp = () => {
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [columnWidths],
  );

  const handleResetColumnWidth = useCallback(
    (columnId: ExplorerDetailColumnId) => {
      setColumnWidths((current) => ({
        ...current,
        [columnId]: DETAIL_DEFAULT_COLUMN_WIDTHS[columnId],
      }));
    },
    [],
  );

  const manualRows = useMemo(
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

  const rows = useMemo(
    () => sortRows(manualRows, sortState),
    [manualRows, sortState],
  );

  const isManualOrder = sortState.key === "manual";

  const resolveRowTagNames = useCallback(
    (row: ExplorerDetailRow): string[] => {
      if (row.kind !== "card") {
        return row.tags;
      }

      return row.tags.map((tagId) => tagById.get(tagId)?.name ?? tagId);
    },
    [tagById],
  );

  const resolveTagIds = useCallback(
    async (tagNames: string[]): Promise<string[]> => {
      const tagIds: string[] = [];

      for (const tagName of tagNames) {
        const normalizedName = normalizeTagName(tagName);
        if (!normalizedName) continue;

        const existingTag = tags.find(
          (tag) =>
            tag.name === normalizedName ||
            tag.nameLower === normalizedName.toLowerCase(),
        );
        const tag = existingTag ?? (await addTag(normalizedName));

        if (!tagIds.includes(tag.id)) {
          tagIds.push(tag.id);
        }
      }

      return tagIds;
    },
    [addTag, tags],
  );

  const saveTagEditor = useCallback(async () => {
    const editor = tagEditor;
    if (!editor || editor.isSaving) return;

    const tagNames = parseTagEditorValue(editor.value);

    setTagEditor((current) =>
      current?.rowKey === editor.rowKey
        ? { ...current, isSaving: true, error: null }
        : current,
    );

    try {
      const tagIds = await resolveTagIds(tagNames);

      if (editor.rowKind === "card") {
        await updateCard(editor.rowId, { tagIds });
      } else if (editor.rowKind === "document") {
        await updateDocument(editor.rowId, { tags: tagNames });
      } else if (editor.rowKind === "folder") {
        await updateFolder(editor.rowId, {
          tags: tagNames,
        } as unknown as Partial<Folder>);
      } else {
        await updateCardSet(editor.rowId, {
          tags: tagNames,
        } as unknown as Parameters<typeof updateCardSet>[1]);
      }

      setTagEditor((current) =>
        current?.rowKey === editor.rowKey ? null : current,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "タグを保存できませんでした。";
      setTagEditor((current) =>
        current?.rowKey === editor.rowKey
          ? { ...current, isSaving: false, error: message }
          : current,
      );
    }
  }, [
    resolveTagIds,
    tagEditor,
    updateCard,
    updateCardSet,
    updateDocument,
    updateFolder,
  ]);

  const cancelTagEditor = useCallback(() => {
    tagEditorSkipNextBlurRef.current = true;
    setTagEditor(null);
  }, []);

  const openTagEditor = useCallback(
    (row: ExplorerDetailRow) => {
      setExplorerLayoutMode("detail");
      setTagEditor({
        rowKey: row.key,
        rowKind: row.kind,
        rowId: row.id,
        value: buildTagEditorValue(resolveRowTagNames(row)),
        error: null,
        isSaving: false,
      });
      setDropIntent(null);
      setDraggingKey(null);
      dragPayloadRef.current = null;
    },
    [resolveRowTagNames, setExplorerLayoutMode],
  );

  const handleTagEditorValueChange = useCallback((value: string) => {
    setTagEditor((current) => (current ? { ...current, value } : current));
  }, []);

  const handleTagEditorBlur = useCallback(() => {
    if (tagEditorSkipNextBlurRef.current) {
      tagEditorSkipNextBlurRef.current = false;
      return;
    }

    void saveTagEditor();
  }, [saveTagEditor]);

  const handleTagEditorKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      event.stopPropagation();

      if (event.key === "Enter") {
        event.preventDefault();
        void saveTagEditor();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        cancelTagEditor();
      }
    },
    [cancelTagEditor, saveTagEditor],
  );

  const handleSort = useCallback(
    (key: Exclude<ExplorerDetailSortKey, "manual">) => {
      setSortState((current) => getNextSortState(current, key));
      setDropIntent(null);
      setDraggingKey(null);
      dragPayloadRef.current = null;
    },
    [],
  );

  const handleActivateRow = useCallback(
    (row: ExplorerDetailRow) => {
      if (row.openFolderId) {
        onFolderOpen(row.openFolderId);
        return;
      }

      if (row.openCardSetId) {
        onCardSetOpen?.(row.openCardSetId);
        setDropIntent(null);
        setDraggingKey(null);
        dragPayloadRef.current = null;
        return;
      }

      if (row.selectTarget) {
        onItemSelect(row.selectTarget);
      }
    },
    [onCardSetOpen, onFolderOpen, onItemSelect],
  );

  const clearDragState = useCallback(() => {
    dragPayloadRef.current = null;
    setDraggingKey(null);
    setDropIntent(null);
  }, []);

  const reorderRows = useCallback(
    (
      payload: ExplorerDetailDragPayload,
      targetRow: ExplorerDetailRow,
      position: "before" | "after",
    ) => {
      if (payload.kind !== targetRow.kind) return;

      const scopedRows = manualRows.filter((row) => row.kind === payload.kind);
      const orderedIds = moveIdBeforeOrAfter(
        scopedRows.map((row) => row.id),
        payload.id,
        targetRow.id,
        position,
      );

      setSortState(DEFAULT_SORT_STATE);

      if (payload.kind === "folder") {
        void onReorderFolders?.(currentFolderId, orderedIds);
        return;
      }

      if (payload.kind === "card") {
        if (!currentCardSetId) return;
        void onReorderCardsInCardSet?.(currentCardSetId, orderedIds);
        return;
      }

      if (!currentFolderId) return;

      if (payload.kind === "cardSet") {
        void onReorderCardSets?.(currentFolderId, orderedIds);
        return;
      }

      void onReorderDocuments?.(currentFolderId, orderedIds);
    },
    [
      currentFolderId,
      manualRows,
      onReorderCardSets,
      onReorderCardsInCardSet,
      onReorderDocuments,
      onReorderFolders,
      currentCardSetId,
    ],
  );

  const movePayloadIntoFolder = useCallback(
    (payload: ExplorerDetailDragPayload, targetFolderId: string | null) => {
      if (
        payload.kind === "folder" &&
        targetFolderId &&
        (payload.id === targetFolderId ||
          isFolderDescendantOf(folders, targetFolderId, payload.id))
      ) {
        return;
      }

      setSortState(DEFAULT_SORT_STATE);

      if (payload.kind === "folder") {
        void onMoveFolder?.(payload.id, targetFolderId);
        return;
      }

      if (!targetFolderId) return;

      if (payload.kind === "cardSet") {
        void onMoveCardSetToFolder?.(payload.id, targetFolderId);
        return;
      }

      if (payload.kind === "document") {
        void onMoveDocumentToFolder?.(payload.id, targetFolderId);
      }
    },
    [folders, onMoveCardSetToFolder, onMoveDocumentToFolder, onMoveFolder],
  );

  const movePayloadIntoCardSet = useCallback(
    (payload: ExplorerDetailDragPayload, targetCardSetId: string) => {
      if (payload.kind !== "card") return;

      setSortState(DEFAULT_SORT_STATE);
      void onMoveCardToSet?.(payload.id, targetCardSetId);
    },
    [onMoveCardToSet],
  );

  const handleDropOnRow = useCallback(
    (row: ExplorerDetailRow, position: ExplorerDetailDropPosition) => {
      const payload = dragPayloadRef.current;
      if (!payload) return;

      if (position === "inside" && row.kind === "folder") {
        movePayloadIntoFolder(payload, row.id);
        return;
      }

      if (position === "inside" && row.kind === "cardSet") {
        movePayloadIntoCardSet(payload, row.id);
        return;
      }

      if (position === "before" || position === "after") {
        reorderRows(payload, row, position);
      }
    },
    [movePayloadIntoCardSet, movePayloadIntoFolder, reorderRows],
  );

  const handleDropOnPane = useCallback(() => {
    const payload = dragPayloadRef.current;
    if (!payload || dropIntent?.position !== "append") return;

    if (currentCardSetId && payload.kind === "card") {
      movePayloadIntoCardSet(payload, currentCardSetId);
      return;
    }

    movePayloadIntoFolder(payload, currentFolderId);
  }, [
    currentFolderId,
    dropIntent?.position,
    movePayloadIntoCardSet,
    movePayloadIntoFolder,
    currentCardSetId,
  ]);

  return (
    <div
      className="h-full min-h-0 w-full overflow-auto bg-[rgba(255,255,255,0.96)]"
      onDragOver={(event) => {
        if (!isManualOrder || !dragPayloadRef.current) return;

        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.closest("[role='row'][data-detail-row='true']")) return;

        event.preventDefault();
        setDropIntent({ rowKey: "__pane__", position: "append" });
      }}
      onDrop={(event) => {
        if (!isManualOrder || !dragPayloadRef.current) return;

        event.preventDefault();
        handleDropOnPane();
        clearDragState();
      }}
    >
      <div
        role="table"
        aria-label="エクスプローラー詳細表示"
        aria-rowcount={rows.length + 1}
        className="text-[13px]"
        style={detailTableStyle}
      >
        <div
          role="row"
          className={cn(
            DETAIL_GRID_CLASS,
            "sticky top-0 z-30 h-9 border-b border-[#dddcd5]",
            "bg-[rgba(250,249,246,0.98)] text-[12px] font-medium text-[#777671]",
          )}
          style={detailGridStyle}
        >
          <HeaderCell
            label="名前"
            columnId="name"
            sortKey="name"
            sortState={sortState}
            onSort={handleSort}
            onResizePointerDown={handleResizePointerDown}
            onResetWidth={handleResetColumnWidth}
          />
          <HeaderCell
            label="タグ"
            columnId="tags"
            sortState={sortState}
            onSort={handleSort}
            onResizePointerDown={handleResizePointerDown}
            onResetWidth={handleResetColumnWidth}
          />
          <HeaderCell
            label="パス"
            columnId="path"
            sortState={sortState}
            onSort={handleSort}
            onResizePointerDown={handleResizePointerDown}
            onResetWidth={handleResetColumnWidth}
          />
          <HeaderCell
            label="更新日時"
            columnId="updatedAt"
            sortKey="updatedAt"
            sortState={sortState}
            onSort={handleSort}
            onResizePointerDown={handleResizePointerDown}
            onResetWidth={handleResetColumnWidth}
          />
          <HeaderCell
            label="種類"
            columnId="kind"
            sortKey="kind"
            sortState={sortState}
            onSort={handleSort}
            onResizePointerDown={handleResizePointerDown}
            onResetWidth={handleResetColumnWidth}
          />
          <HeaderCell
            label="サイズ"
            columnId="size"
            sortKey="size"
            sortState={sortState}
            onSort={handleSort}
            onResizePointerDown={handleResizePointerDown}
            onResetWidth={handleResetColumnWidth}
            className="border-r-0 text-left"
          />
        </div>

        {rows.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-[12px] text-[#8f8d86]">
            この場所には表示できる項目がありません。
          </div>
        ) : (
          rows.map((row) => {
            const selected =
              row.selectTarget !== null &&
              isSameSelectedExplorerItem(selectedItem, row.selectTarget);
            const dragging = draggingKey === row.key;
            const currentDropPosition =
              dropIntent?.rowKey === row.key ? dropIntent.position : null;

            return (
              <FolderDetailRowView
                key={row.key}
                row={row}
                selected={selected}
                dragging={dragging}
                draggable={isManualOrder}
                dropPosition={currentDropPosition}
                gridStyle={detailGridStyle}
                tagDisplayText={formatExplorerTagNames(resolveRowTagNames(row))}
                tagEditState={tagEditor}
                onTagCellContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  openTagEditor(row);
                }}
                onTagEditChange={handleTagEditorValueChange}
                onTagEditKeyDown={handleTagEditorKeyDown}
                onTagEditBlur={handleTagEditorBlur}
                onActivate={() => handleActivateRow(row)}
                onDragStart={(event) => {
                  if (!isManualOrder) {
                    event.preventDefault();
                    return;
                  }

                  dragPayloadRef.current = { kind: row.kind, id: row.id };
                  setDraggingKey(row.key);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData(
                    "application/x-manifolia-explorer-detail-row",
                    row.key,
                  );
                }}
                onDragEnd={() => {
                  clearDragState();
                }}
                onDragOver={(event) => {
                  const payload = dragPayloadRef.current;
                  if (
                    !isManualOrder ||
                    !payload ||
                    isSamePayloadAndRow(payload, row)
                  ) {
                    return;
                  }

                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";

                  const position = getDropPositionFromPointer(row, event);
                  setDropIntent({ rowKey: row.key, position });
                }}
                onDragLeave={(event) => {
                  const relatedTarget = event.relatedTarget;
                  if (
                    relatedTarget instanceof Node &&
                    event.currentTarget.contains(relatedTarget)
                  ) {
                    return;
                  }

                  setDropIntent((current) =>
                    current?.rowKey === row.key ? null : current,
                  );
                }}
                onDrop={(event) => {
                  if (!isManualOrder || !dragPayloadRef.current) return;

                  event.preventDefault();
                  const position = getDropPositionFromPointer(row, event);
                  handleDropOnRow(row, position);
                  clearDragState();
                }}
              />
            );
          })
        )}
      </div>

      {dropIntent?.position === "append" ? (
        <div
          aria-hidden="true"
          className="pointer-events-none sticky bottom-0 mx-3 mb-2 h-8 rounded-[8px] border border-dashed border-[#bdb9ae] bg-[#f5f3ee]/80"
        />
      ) : null}
    </div>
  );
};
