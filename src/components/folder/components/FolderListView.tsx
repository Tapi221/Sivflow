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
  type DragEvent as ReactDragEvent,
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

type ListColumnMetrics = {
  rowsPerColumn: number;
  itemCount: number;
};

type ExplorerListDropPosition = "before" | "after" | "inside" | "append";

type ExplorerListDragPayload = {
  kind: ExplorerDetailRowKind;
  id: string;
};

type ExplorerListDropIntent = {
  rowKey: string;
  position: ExplorerListDropPosition;
};

type FolderLikeForDnD = Folder & {
  folderId?: string;
  parentFolderId?: string | null;
  parent_folder_id?: string | null;
};

const LIST_ROW_HEIGHT_PX = 28;
const LIST_ROW_GAP_PX = 2;
const LIST_COLUMN_WIDTH_PX = 236;
const LIST_COLUMN_GAP_PX = 24;
const LIST_VIEW_PADDING_Y_PX = 24;
const LIST_VIEW_PADDING_X_CLASS = "px-2";
const LIST_APPEND_DROP_KEY = "__append__";
const LIST_DRAG_DATA_TYPE = "application/x-manifolia-explorer-list-row";

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
  if (key === "ArrowDown")
    return clampIndex(currentIndex + 1, metrics.itemCount);
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
    Math.floor(
      (availableHeight + LIST_ROW_GAP_PX) /
        (LIST_ROW_HEIGHT_PX + LIST_ROW_GAP_PX),
    ),
  );
};

const getFolderParentId = (folder: Folder): string | null => {
  const folderLike = folder as FolderLikeForDnD;
  return folderLike.parentFolderId ?? folderLike.parent_folder_id ?? null;
};

const getFolderStableId = (folder: Folder): string => {
  const folderLike = folder as FolderLikeForDnD;
  return folderLike.id || folderLike.folderId || "";
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

const moveIdToEnd = (orderedIds: string[], movingId: string): string[] => {
  return [...orderedIds.filter((id) => id !== movingId), movingId];
};

const hasSameOrder = (left: string[], right: string[]): boolean => {
  return (
    left.length === right.length &&
    left.every((id, index) => id === right[index])
  );
};

const isSamePayloadAndRow = (
  payload: ExplorerListDragPayload,
  row: ExplorerDetailRow,
): boolean => {
  return payload.kind === row.kind && payload.id === row.id;
};

const getDragPayloadFromEvent = (
  event: ReactDragEvent<HTMLElement>,
): ExplorerListDragPayload | null => {
  try {
    const raw = event.dataTransfer.getData(LIST_DRAG_DATA_TYPE);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ExplorerListDragPayload>;
    if (
      typeof parsed.id !== "string" ||
      (parsed.kind !== "folder" &&
        parsed.kind !== "cardSet" &&
        parsed.kind !== "card" &&
        parsed.kind !== "document")
    ) {
      return null;
    }

    return { kind: parsed.kind, id: parsed.id };
  } catch {
    return null;
  }
};

const getDropPositionFromPointer = (
  row: ExplorerDetailRow,
  payload: ExplorerListDragPayload,
  event: ReactDragEvent<HTMLElement>,
): ExplorerListDropPosition => {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio =
    rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;

  const canDropInsideFolder = row.kind === "folder" && payload.kind !== "card";
  const canDropInsideCardSet =
    row.kind === "cardSet" && payload.kind === "card";

  if (
    (canDropInsideFolder || canDropInsideCardSet) &&
    ratio >= 0.32 &&
    ratio <= 0.68
  ) {
    return "inside";
  }

  return ratio < 0.5 ? "before" : "after";
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
  onMoveFolder,
  onReorderFolders,
  onMoveCardSetToFolder,
  onReorderCardSets,
  onMoveDocumentToFolder,
  onReorderDocuments,
  onMoveCardToSet,
  onReorderCardsInCardSet,
}: FolderListViewProps) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragPayloadRef = useRef<ExplorerListDragPayload | null>(null);
  const [focusedRowKey, setFocusedRowKey] = useState<string | null>(null);
  const [rowsPerColumn, setRowsPerColumn] = useState(1);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropIntent, setDropIntent] = useState<ExplorerListDropIntent | null>(
    null,
  );

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

  const rowsByKey = useMemo(() => {
    const map = new Map<string, ExplorerDetailRow>();
    rows.forEach((row) => map.set(row.key, row));
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

  const getRowsOfKind = useCallback(
    (kind: ExplorerDetailRowKind): ExplorerDetailRow[] => {
      return rows.filter((row) => row.kind === kind);
    },
    [rows],
  );

  const canReorderKind = useCallback(
    (kind: ExplorerDetailRowKind): boolean => {
      if (kind === "folder") return Boolean(onReorderFolders);
      if (kind === "cardSet")
        return Boolean(currentFolderId && onReorderCardSets);
      if (kind === "document") {
        return Boolean(currentFolderId && onReorderDocuments);
      }
      return Boolean(currentCardSetId && onReorderCardsInCardSet);
    },
    [
      currentCardSetId,
      currentFolderId,
      onReorderCardSets,
      onReorderCardsInCardSet,
      onReorderDocuments,
      onReorderFolders,
    ],
  );

  const canDragRow = useCallback(
    (row: ExplorerDetailRow): boolean => {
      if (row.kind === "folder")
        return Boolean(onMoveFolder || onReorderFolders);
      if (row.kind === "cardSet") {
        return Boolean(onMoveCardSetToFolder || onReorderCardSets);
      }
      if (row.kind === "document") {
        return Boolean(onMoveDocumentToFolder || onReorderDocuments);
      }
      return Boolean(onMoveCardToSet || onReorderCardsInCardSet);
    },
    [
      onMoveCardSetToFolder,
      onMoveCardToSet,
      onMoveDocumentToFolder,
      onMoveFolder,
      onReorderCardSets,
      onReorderCardsInCardSet,
      onReorderDocuments,
      onReorderFolders,
    ],
  );

  const canDropInsideRow = useCallback(
    (payload: ExplorerListDragPayload, row: ExplorerDetailRow): boolean => {
      if (isSamePayloadAndRow(payload, row)) return false;

      if (row.kind === "folder") {
        if (payload.kind === "folder") {
          if (!onMoveFolder || payload.id === row.id) return false;
          return !isFolderDescendantOf(folders, row.id, payload.id);
        }

        if (payload.kind === "cardSet") return Boolean(onMoveCardSetToFolder);
        if (payload.kind === "document") return Boolean(onMoveDocumentToFolder);
        return false;
      }

      if (row.kind === "cardSet" && payload.kind === "card") {
        return Boolean(onMoveCardToSet && payload.id !== row.id);
      }

      return false;
    },
    [
      folders,
      onMoveCardSetToFolder,
      onMoveCardToSet,
      onMoveDocumentToFolder,
      onMoveFolder,
    ],
  );

  const canDropBeforeOrAfterRow = useCallback(
    (payload: ExplorerListDragPayload, row: ExplorerDetailRow): boolean => {
      if (isSamePayloadAndRow(payload, row)) return false;
      if (payload.kind !== row.kind) return false;
      return canReorderKind(payload.kind);
    },
    [canReorderKind],
  );

  const canDropAppend = useCallback(
    (payload: ExplorerListDragPayload): boolean => {
      if (currentCardSetId) {
        return payload.kind === "card" && Boolean(onReorderCardsInCardSet);
      }

      if (payload.kind === "folder") {
        if (currentFolderId && payload.id === currentFolderId) return false;
        if (
          currentFolderId &&
          isFolderDescendantOf(folders, currentFolderId, payload.id)
        ) {
          return false;
        }

        return Boolean(onMoveFolder || onReorderFolders);
      }

      if (payload.kind === "cardSet") {
        return Boolean(currentFolderId && onMoveCardSetToFolder);
      }

      if (payload.kind === "document") {
        return Boolean(currentFolderId && onMoveDocumentToFolder);
      }

      return false;
    },
    [
      currentCardSetId,
      currentFolderId,
      folders,
      onMoveCardSetToFolder,
      onMoveDocumentToFolder,
      onMoveFolder,
      onReorderCardsInCardSet,
      onReorderFolders,
    ],
  );

  const canDrop = useCallback(
    (
      payload: ExplorerListDragPayload,
      row: ExplorerDetailRow | null,
      position: ExplorerListDropPosition,
    ): boolean => {
      if (position === "append") return canDropAppend(payload);
      if (!row) return false;
      if (position === "inside") return canDropInsideRow(payload, row);
      return canDropBeforeOrAfterRow(payload, row);
    },
    [canDropAppend, canDropBeforeOrAfterRow, canDropInsideRow],
  );

  const reorderWithinKind = useCallback(
    async (
      payload: ExplorerListDragPayload,
      targetRow: ExplorerDetailRow,
      position: "before" | "after",
    ) => {
      const orderedIds = getRowsOfKind(payload.kind).map((row) => row.id);
      if (
        !orderedIds.includes(payload.id) ||
        !orderedIds.includes(targetRow.id)
      ) {
        return;
      }

      const nextIds = moveIdBeforeOrAfter(
        orderedIds,
        payload.id,
        targetRow.id,
        position,
      );

      if (hasSameOrder(orderedIds, nextIds)) return;

      if (payload.kind === "folder") {
        await onReorderFolders?.(currentFolderId, nextIds);
        return;
      }

      if (payload.kind === "cardSet" && currentFolderId) {
        await onReorderCardSets?.(currentFolderId, nextIds);
        return;
      }

      if (payload.kind === "document" && currentFolderId) {
        await onReorderDocuments?.(currentFolderId, nextIds);
        return;
      }

      if (payload.kind === "card" && currentCardSetId) {
        await onReorderCardsInCardSet?.(currentCardSetId, nextIds);
      }
    },
    [
      currentCardSetId,
      currentFolderId,
      getRowsOfKind,
      onReorderCardSets,
      onReorderCardsInCardSet,
      onReorderDocuments,
      onReorderFolders,
    ],
  );

  const moveInsideRow = useCallback(
    async (payload: ExplorerListDragPayload, targetRow: ExplorerDetailRow) => {
      if (targetRow.kind === "folder") {
        if (payload.kind === "folder") {
          await onMoveFolder?.(payload.id, targetRow.id);
          return;
        }

        if (payload.kind === "cardSet") {
          await onMoveCardSetToFolder?.(payload.id, targetRow.id);
          return;
        }

        if (payload.kind === "document") {
          await onMoveDocumentToFolder?.(payload.id, targetRow.id);
        }

        return;
      }

      if (targetRow.kind === "cardSet" && payload.kind === "card") {
        await onMoveCardToSet?.(payload.id, targetRow.id);
      }
    },
    [
      onMoveCardSetToFolder,
      onMoveCardToSet,
      onMoveDocumentToFolder,
      onMoveFolder,
    ],
  );

  const appendPayload = useCallback(
    async (payload: ExplorerListDragPayload) => {
      if (currentCardSetId && payload.kind === "card") {
        const orderedIds = getRowsOfKind("card").map((row) => row.id);
        if (orderedIds.includes(payload.id)) {
          const nextIds = moveIdToEnd(orderedIds, payload.id);
          if (!hasSameOrder(orderedIds, nextIds)) {
            await onReorderCardsInCardSet?.(currentCardSetId, nextIds);
          }
          return;
        }

        await onMoveCardToSet?.(payload.id, currentCardSetId);
        return;
      }

      if (payload.kind === "folder") {
        const orderedIds = getRowsOfKind("folder").map((row) => row.id);
        if (orderedIds.includes(payload.id) && onReorderFolders) {
          const nextIds = moveIdToEnd(orderedIds, payload.id);
          if (!hasSameOrder(orderedIds, nextIds)) {
            await onReorderFolders(currentFolderId, nextIds);
          }
          return;
        }

        await onMoveFolder?.(payload.id, currentFolderId);
        return;
      }

      if (payload.kind === "cardSet" && currentFolderId) {
        await onMoveCardSetToFolder?.(payload.id, currentFolderId);
        return;
      }

      if (payload.kind === "document" && currentFolderId) {
        await onMoveDocumentToFolder?.(payload.id, currentFolderId);
      }
    },
    [
      currentCardSetId,
      currentFolderId,
      getRowsOfKind,
      onMoveCardSetToFolder,
      onMoveCardToSet,
      onMoveDocumentToFolder,
      onMoveFolder,
      onReorderCardsInCardSet,
      onReorderFolders,
    ],
  );

  const applyDrop = useCallback(
    async (
      payload: ExplorerListDragPayload,
      targetRow: ExplorerDetailRow | null,
      position: ExplorerListDropPosition,
    ) => {
      if (!canDrop(payload, targetRow, position)) return;

      if (position === "append") {
        await appendPayload(payload);
        return;
      }

      if (!targetRow) return;

      if (position === "inside") {
        await moveInsideRow(payload, targetRow);
        return;
      }

      await reorderWithinKind(payload, targetRow, position);
    },
    [appendPayload, canDrop, moveInsideRow, reorderWithinKind],
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

  useEffect(() => {
    if (!dropIntent) return;
    if (dropIntent.position === "append") return;
    if (rowsByKey.has(dropIntent.rowKey)) return;
    setDropIntent(null);
  }, [dropIntent, rowsByKey]);

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

  const handleRowDragStart = useCallback(
    (row: ExplorerDetailRow, event: ReactDragEvent<HTMLDivElement>) => {
      if (!canDragRow(row)) {
        event.preventDefault();
        return;
      }

      const payload = {
        kind: row.kind,
        id: row.id,
      } satisfies ExplorerListDragPayload;

      dragPayloadRef.current = payload;
      setDraggingKey(row.key);
      setFocusedRowKey(row.key);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(LIST_DRAG_DATA_TYPE, JSON.stringify(payload));
      event.dataTransfer.setData("text/plain", row.name);
    },
    [canDragRow],
  );

  const handleRowDragEnd = useCallback(() => {
    dragPayloadRef.current = null;
    setDraggingKey(null);
    setDropIntent(null);
  }, []);

  const handleRowDragOver = useCallback(
    (row: ExplorerDetailRow, event: ReactDragEvent<HTMLDivElement>) => {
      const payload = dragPayloadRef.current ?? getDragPayloadFromEvent(event);
      if (!payload) return;

      const position = getDropPositionFromPointer(row, payload, event);
      if (!canDrop(payload, row, position)) {
        setDropIntent(null);
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      setDropIntent({ rowKey: row.key, position });
    },
    [canDrop],
  );

  const handleRowDragLeave = useCallback(
    (row: ExplorerDetailRow, event: ReactDragEvent<HTMLDivElement>) => {
      const nextTarget = event.relatedTarget;
      if (
        nextTarget instanceof Node &&
        event.currentTarget.contains(nextTarget)
      ) {
        return;
      }

      setDropIntent((current) =>
        current?.rowKey === row.key && current.position !== "append"
          ? null
          : current,
      );
    },
    [],
  );

  const handleRowDrop = useCallback(
    async (row: ExplorerDetailRow, event: ReactDragEvent<HTMLDivElement>) => {
      const payload = dragPayloadRef.current ?? getDragPayloadFromEvent(event);
      if (!payload) return;

      const position =
        dropIntent?.rowKey === row.key
          ? dropIntent.position
          : getDropPositionFromPointer(row, payload, event);

      if (!canDrop(payload, row, position)) return;

      event.preventDefault();
      event.stopPropagation();
      setDropIntent(null);
      await applyDrop(payload, row, position);
    },
    [applyDrop, canDrop, dropIntent],
  );

  const handleViewportDragOver = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("[data-list-row='true']")
      ) {
        return;
      }

      const payload = dragPayloadRef.current ?? getDragPayloadFromEvent(event);
      if (!payload || !canDrop(payload, null, "append")) {
        setDropIntent(null);
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDropIntent({ rowKey: LIST_APPEND_DROP_KEY, position: "append" });
    },
    [canDrop],
  );

  const handleViewportDragLeave = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      const nextTarget = event.relatedTarget;
      if (
        nextTarget instanceof Node &&
        event.currentTarget.contains(nextTarget)
      ) {
        return;
      }

      setDropIntent((current) =>
        current?.position === "append" ? null : current,
      );
    },
    [],
  );

  const handleViewportDrop = useCallback(
    async (event: ReactDragEvent<HTMLDivElement>) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("[data-list-row='true']")
      ) {
        return;
      }

      const payload = dragPayloadRef.current ?? getDragPayloadFromEvent(event);
      if (!payload || !canDrop(payload, null, "append")) return;

      event.preventDefault();
      setDropIntent(null);
      await applyDrop(payload, null, "append");
    },
    [applyDrop, canDrop],
  );

  if (rows.length === 0) {
    return (
      <div
        className="flex h-full min-h-0 w-full items-center justify-center bg-[rgba(255,255,255,0.96)] text-[12px] text-[#8f8d86]"
        onDragOver={handleViewportDragOver}
        onDragLeave={handleViewportDragLeave}
        onDrop={handleViewportDrop}
      >
        この場所には表示できる項目がありません。
      </div>
    );
  }

  const appendDropActive =
    dropIntent?.rowKey === LIST_APPEND_DROP_KEY &&
    dropIntent.position === "append";

  return (
    <div
      ref={viewportRef}
      role="grid"
      aria-label="エクスプローラー 一覧表示"
      className={cn(
        "relative h-full min-h-0 w-full overflow-auto bg-[rgba(255,255,255,0.96)] py-3",
        LIST_VIEW_PADDING_X_CLASS,
      )}
      onDragOver={handleViewportDragOver}
      onDragLeave={handleViewportDragLeave}
      onDrop={handleViewportDrop}
    >
      {appendDropActive ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-3 left-2 right-2 z-20 h-[2px] rounded-full bg-[#7f7a72]"
        />
      ) : null}

      <div className="grid min-h-max w-max content-start" style={listGridStyle}>
        {rows.map((row) => {
          const Icon = getRowIcon(row.kind);
          const selected = isSelected(row);
          const draggable = canDragRow(row);
          const dropPosition =
            dropIntent?.rowKey === row.key ? dropIntent.position : null;

          return (
            <div
              key={row.key}
              ref={(node) => setRowRef(row.key, node)}
              role="row"
              tabIndex={0}
              aria-selected={selected}
              aria-grabbed={draggingKey === row.key ? true : undefined}
              data-selected={selected ? "true" : undefined}
              data-list-row="true"
              draggable={draggable}
              title={row.name}
              style={LIST_ROW_STYLE}
              className={cn(
                "sidebar-row sidebar-row--folder ds-list-item ds-list-item--interactive",
                "relative flex w-full cursor-pointer items-center rounded-[8px] px-2 text-left",
                "select-none outline-none transition-opacity",
                selected && "ds-list-item--selected",
                draggingKey === row.key && "opacity-45",
                !draggable && "cursor-default",
              )}
              onClick={(event) => handleRowClick(row, event)}
              onDoubleClick={() => openRow(row)}
              onKeyDown={(event) => handleRowKeyDown(row, event)}
              onDragStart={(event) => handleRowDragStart(row, event)}
              onDragEnd={handleRowDragEnd}
              onDragOver={(event) => handleRowDragOver(row, event)}
              onDragLeave={(event) => handleRowDragLeave(row, event)}
              onDrop={(event) => handleRowDrop(row, event)}
            >
              {dropPosition === "before" ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1 right-1 top-[-1px] z-20 h-[2px] rounded-full bg-[#7f7a72]"
                />
              ) : null}
              {dropPosition === "after" ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-[-1px] left-1 right-1 z-20 h-[2px] rounded-full bg-[#7f7a72]"
                />
              ) : null}
              {dropPosition === "inside" ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-1 inset-y-[3px] z-10 rounded-[8px] shadow-[inset_0_0_0_1px_rgba(127,122,114,0.42)]"
                />
              ) : null}

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
