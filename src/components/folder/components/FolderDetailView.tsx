import {
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
  type DragEvent as ReactDragEvent,
  type KeyboardEvent,
} from "react";

interface FolderDetailViewProps {
  folders: Folder[];
  cards: Card[];
  cardSets?: CardSet[];
  documents: DocumentItem[];
  currentFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  onFolderOpen: (folderId: string) => void;
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
}

type ExplorerDetailSortKey = "manual" | "name" | "updatedAt" | "kind" | "size";
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

const DETAIL_GRID_CLASS =
  "grid grid-cols-[minmax(240px,1.24fr)_minmax(140px,0.72fr)_minmax(320px,1.42fr)_150px_112px_96px]";

const DEFAULT_SORT_STATE: ExplorerDetailSortState = {
  key: "manual",
  direction: "asc",
};

const getFolderParentId = (folder: Folder): string | null => {
  return (
    folder.parentFolderId ??
    (folder as unknown as { parent_folder_id?: string | null }).parent_folder_id ??
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
  return 2;
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
  return ExplorerChromePdfIcon;
};

const getDropPositionFromPointer = (
  row: ExplorerDetailRow,
  event: ReactDragEvent<HTMLElement>,
): ExplorerDetailDropPosition => {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;

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

const HeaderCell = ({
  label,
  sortKey,
  sortState,
  onSort,
  className,
}: {
  label: string;
  sortKey?: Exclude<ExplorerDetailSortKey, "manual">;
  sortState: ExplorerDetailSortState;
  onSort: (key: Exclude<ExplorerDetailSortKey, "manual">) => void;
  className?: string;
}) => {
  const sortable = Boolean(sortKey);

  if (!sortable || !sortKey) {
    return (
      <div
        role="columnheader"
        className={cn(
          "flex min-w-0 items-center border-r border-[#e6e4dc] px-3",
          className,
        )}
      >
        <span className="truncate">{label}</span>
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
        "flex min-w-0 items-center border-r border-[#e6e4dc] px-3 text-left",
        "text-[#777671] transition-colors hover:bg-[#eeece4] hover:text-[#24231f]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span className="truncate">
        {label}
        {getHeaderSortLabel(sortState, sortKey)}
      </span>
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
}) => {
  const Icon = getRowIcon(row.kind);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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
      draggable={draggable}
      aria-grabbed={dragging ? true : undefined}
      className={cn(
        DETAIL_GRID_CLASS,
        "relative min-h-[38px] cursor-default border-b border-[#efeee8] text-[13px]",
        "text-[#24231f] outline-none transition-colors",
        selected ? "bg-[#ebe7df]" : "bg-transparent hover:bg-[#f5f3ee]",
        dragging && "opacity-45",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
      )}
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
        className="flex min-w-0 items-center px-3 text-[#777671]"
        title={formatExplorerTags(row.tags)}
      >
        <span className="truncate">{formatExplorerTags(row.tags)}</span>
      </div>
      <div
        role="cell"
        className="flex min-w-0 items-center px-3 text-[#777671]"
        title={row.path}
      >
        <span className="truncate">{row.path}</span>
      </div>
      <div role="cell" className="flex min-w-0 items-center px-3 text-[#777671]">
        <span className="truncate">{formatExplorerUpdatedAt(row.updatedAt)}</span>
      </div>
      <div role="cell" className="flex min-w-0 items-center px-3 text-[#777671]">
        <span className="truncate">{row.typeLabel}</span>
      </div>
      <div
        role="cell"
        className="flex min-w-0 items-center justify-end px-3 text-right text-[#777671]"
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
  onFolderOpen,
  onItemSelect,
  onMoveFolder,
  onReorderFolders,
  onMoveCardSetToFolder,
  onReorderCardSets,
  onMoveDocumentToFolder,
  onReorderDocuments,
}: FolderDetailViewProps) => {
  const dragPayloadRef = useRef<ExplorerDetailDragPayload | null>(null);
  const [sortState, setSortState] =
    useState<ExplorerDetailSortState>(DEFAULT_SORT_STATE);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropIntent, setDropIntent] = useState<ExplorerDetailDropIntent | null>(
    null,
  );

  const manualRows = useMemo(
    () =>
      buildExplorerDetailRows({
        folders,
        cards,
        cardSets,
        documents,
        currentFolderId,
      }),
    [cards, cardSets, currentFolderId, documents, folders],
  );

  const rows = useMemo(
    () => sortRows(manualRows, sortState),
    [manualRows, sortState],
  );

  const isManualOrder = sortState.key === "manual";

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

      if (row.selectTarget) {
        onItemSelect(row.selectTarget);
      }
    },
    [onFolderOpen, onItemSelect],
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
      onReorderDocuments,
      onReorderFolders,
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

      void onMoveDocumentToFolder?.(payload.id, targetFolderId);
    },
    [folders, onMoveCardSetToFolder, onMoveDocumentToFolder, onMoveFolder],
  );

  const handleDropOnRow = useCallback(
    (row: ExplorerDetailRow, position: ExplorerDetailDropPosition) => {
      const payload = dragPayloadRef.current;
      if (!payload) return;

      if (position === "inside" && row.kind === "folder") {
        movePayloadIntoFolder(payload, row.id);
        return;
      }

      if (position === "before" || position === "after") {
        reorderRows(payload, row, position);
      }
    },
    [movePayloadIntoFolder, reorderRows],
  );

  const handleDropOnPane = useCallback(() => {
    const payload = dragPayloadRef.current;
    if (!payload || dropIntent?.position !== "append") return;

    movePayloadIntoFolder(payload, currentFolderId);
  }, [currentFolderId, dropIntent?.position, movePayloadIntoFolder]);

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
        className="min-w-[1060px] text-[13px]"
      >
        <div
          role="row"
          className={cn(
            DETAIL_GRID_CLASS,
            "sticky top-0 z-30 h-9 border-b border-[#dddcd5]",
            "bg-[rgba(250,249,246,0.98)] text-[12px] font-medium text-[#777671]",
          )}
        >
          <HeaderCell
            label="名前"
            sortKey="name"
            sortState={sortState}
            onSort={handleSort}
          />
          <HeaderCell label="タグ" sortState={sortState} onSort={handleSort} />
          <HeaderCell label="パス" sortState={sortState} onSort={handleSort} />
          <HeaderCell
            label="更新日時"
            sortKey="updatedAt"
            sortState={sortState}
            onSort={handleSort}
          />
          <HeaderCell
            label="種類"
            sortKey="kind"
            sortState={sortState}
            onSort={handleSort}
          />
          <HeaderCell
            label="サイズ"
            sortKey="size"
            sortState={sortState}
            onSort={handleSort}
            className="justify-end border-r-0 text-right"
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
              <div key={row.key} data-detail-row="true">
                <FolderDetailRowView
                  row={row}
                  selected={selected}
                  dragging={dragging}
                  draggable={isManualOrder}
                  dropPosition={currentDropPosition}
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
                    if (!isManualOrder || !payload || isSamePayloadAndRow(payload, row)) {
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
              </div>
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
