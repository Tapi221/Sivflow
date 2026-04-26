import type { FolderTreeNode } from "@/components/folder/explorer/model/utils";
import {
  getFolderId,
  getParentFolderId,
  normalizeFolderId,
} from "@/components/folder/explorer/model/utils";
import {
  FOLDER_ROW_ICON_ACTIVE_CLASS,
  FOLDER_ROW_ICON_MUTED_CLASS,
  FOLDER_ROW_ICON_SIZE_CLASS,
  FOLDER_ROW_TITLE_CLASS,
} from "@/components/folder/explorer/rows/shared";
import { useExplorerDerivedData } from "@/components/folder/hooks/useExplorerDerivedData";
import {
  toVirtualMfCardDisplayName,
  toVirtualMfDeckDisplayName,
} from "@/features/fileDisplay/virtualFileExtensions";
import { cn } from "@/lib/utils";
import type {
  Card,
  CardSet,
  DocumentItem,
  ExplorerItem,
  SelectedExplorerItem,
} from "@/types";
import { ChevronRight, FileText, FolderOutlineIcon, Layers } from "@/ui/icons";
import type {
  CSSProperties,
  DragEvent as ReactDragEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type FolderColumnContext =
  | { type: "folder"; id: string }
  | { type: "cardSet"; id: string };

type FolderColumnEntry =
  | {
      kind: "folder";
      id: string;
      name: string;
      folder: FolderTreeNode;
      contentCount: number;
      hasNextColumn: boolean;
    }
  | {
      kind: "cardSet";
      id: string;
      name: string;
      contentCount: number;
      hasNextColumn: boolean;
    }
  | {
      kind: "card";
      id: string;
      name: string;
      cardSetId: string | null;
    }
  | {
      kind: "document";
      id: string;
      name: string;
    };

type FolderColumn = {
  id: string;
  context: FolderColumnContext | null;
  entries: FolderColumnEntry[];
};

interface FolderColumnViewProps {
  folders: FolderTreeNode[];
  cards: Card[];
  cardSets?: CardSet[];
  documents: DocumentItem[];
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  selectedCardSetId?: string | null;
  isFiltering?: boolean;
  resetToken?: number;
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
  className?: string;
}

type FolderColumnDragPayload =
  | { kind: "folder"; id: string }
  | { kind: "cardSet"; id: string }
  | { kind: "document"; id: string }
  | { kind: "card"; id: string; cardSetId: string | null };

type FolderColumnDropTarget =
  | { type: "folder"; id: string | null }
  | { type: "cardSet"; id: string };

type FolderColumnOrderScopeKey = string;

type FolderColumnDropPosition = "inside" | "before" | "after" | "append";

type FolderColumnDropIntent = {
  target: FolderColumnDropTarget;
  position: FolderColumnDropPosition;
  columnId: string;
  columnIndex: number;
  targetEntry?: {
    kind: FolderColumnEntry["kind"];
    id: string;
    name: string;
  };
};

type FolderColumnDragBadge = {
  label: string;
  icon: "into" | "below";
};

interface FolderColumnRowProps {
  entry: FolderColumnEntry;
  selected: boolean;
  draggable: boolean;
  dragging: boolean;
  dropPosition: Exclude<FolderColumnDropPosition, "append"> | null;
  onSelect: () => void;
  onDragStart: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDragEnd: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDragOver: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDrop: (event: ReactDragEvent<HTMLDivElement>) => void;
}

const FOLDER_COLUMN_WIDTHS_STORAGE_KEY =
  "manifolia:folder-column-view:column-widths";
const DEFAULT_FOLDER_COLUMN_WIDTH_PX = 280;
const MIN_FOLDER_COLUMN_WIDTH_PX = 180;
const MAX_FOLDER_COLUMN_WIDTH_PX = 520;

type FolderColumnWidthMap = Record<string, number>;

const clampFolderColumnWidth = (width: number) => {
  if (!Number.isFinite(width)) return DEFAULT_FOLDER_COLUMN_WIDTH_PX;

  return Math.min(
    Math.max(Math.round(width), MIN_FOLDER_COLUMN_WIDTH_PX),
    MAX_FOLDER_COLUMN_WIDTH_PX,
  );
};

const readStoredFolderColumnWidths = (): FolderColumnWidthMap => {
  if (typeof window === "undefined") return {};

  const storedWidths = window.localStorage.getItem(
    FOLDER_COLUMN_WIDTHS_STORAGE_KEY,
  );
  if (!storedWidths) return {};

  try {
    const parsed = JSON.parse(storedWidths) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const widths: FolderColumnWidthMap = {};

    Object.entries(parsed as Record<string, unknown>).forEach(
      ([columnId, width]) => {
        if (typeof width !== "number") return;
        widths[columnId] = clampFolderColumnWidth(width);
      },
    );

    return widths;
  } catch {
    return {};
  }
};

const writeStoredFolderColumnWidths = (widths: FolderColumnWidthMap) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    FOLDER_COLUMN_WIDTHS_STORAGE_KEY,
    JSON.stringify(widths),
  );
};

const getCardCardSetId = (card: Card) => {
  return (
    card.cardSetId ??
    (card as unknown as { card_set_id?: string | null }).card_set_id ??
    null
  );
};

const getDragPayloadKey = (payload: FolderColumnDragPayload) => {
  return `${payload.kind}:${payload.id}`;
};

const getDropTargetKey = (target: FolderColumnDropTarget) => {
  if (target.type === "folder") return `folder:${target.id ?? "__root__"}`;
  return `cardSet:${target.id}`;
};

const getDropIntentKey = (intent: FolderColumnDropIntent) => {
  const entryKey = intent.targetEntry
    ? `${intent.targetEntry.kind}:${intent.targetEntry.id}`
    : "__column__";
  return `${getDropTargetKey(intent.target)}:${intent.position}:${entryKey}`;
};

const getOrderScopeKey = (
  kind: FolderColumnDragPayload["kind"],
  target: FolderColumnDropTarget,
): FolderColumnOrderScopeKey | null => {
  if (kind === "folder" && target.type === "folder") {
    return `folder:${target.id ?? "__root__"}`;
  }

  if (kind === "cardSet" && target.type === "folder" && target.id) {
    return `cardSet:${target.id}`;
  }

  if (kind === "document" && target.type === "folder" && target.id) {
    return `document:${target.id}`;
  }

  if (kind === "card" && target.type === "cardSet") {
    return `card:${target.id}`;
  }

  return null;
};

const FOLDER_COLUMN_ROW_STYLE = {
  height: 28,
  minHeight: 28,
  lineHeight: "28px",
} satisfies CSSProperties;

const getFolderDisplayName = (folder: FolderTreeNode) => {
  return (
    (folder as { folderName?: string; folder_name?: string }).folderName ??
    (folder as { folderName?: string; folder_name?: string }).folder_name ??
    "無題のフォルダ"
  );
};

const getCardSetDisplayName = (cardSet: CardSet) => {
  return toVirtualMfDeckDisplayName(cardSet.name?.trim() || "無題のセット");
};

const getExplorerItemDisplayName = (item: ExplorerItem) => {
  if (item.type === "document") {
    return (
      item.data.title?.trim() || item.data.fileName?.trim() || "無題の文書"
    );
  }

  return toVirtualMfCardDisplayName(
    item.data.title?.trim() ||
      item.data.questionNumber?.trim() ||
      "無題のカード",
  );
};

const hasSelectedItemId = (
  item: SelectedExplorerItem,
): item is Extract<SelectedExplorerItem, { id: string }> => {
  return item !== null && "id" in item;
};

const getColumnContextKey = (context: FolderColumnContext | null) => {
  if (!context) return "__root__";
  return `${context.type}:${context.id}`;
};

const areSameColumnPaths = (
  left: FolderColumnContext[],
  right: FolderColumnContext[],
) => {
  if (left.length !== right.length) return false;
  return left.every((context, index) => {
    const other = right[index];
    return context.type === other?.type && context.id === other.id;
  });
};

const FolderColumnRow = ({
  entry,
  selected,
  draggable,
  dragging,
  dropPosition,
  onSelect,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: FolderColumnRowProps) => {
  const Icon =
    entry.kind === "folder"
      ? FolderOutlineIcon
      : entry.kind === "cardSet"
        ? Layers
        : FileText;

  const contentCount =
    entry.kind === "folder" || entry.kind === "cardSet"
      ? entry.contentCount
      : undefined;

  const hasNextColumn =
    (entry.kind === "folder" || entry.kind === "cardSet") &&
    entry.hasNextColumn;

  const trailing =
    typeof contentCount === "number" || hasNextColumn ? (
      <span className="ml-auto flex h-full shrink-0 items-center gap-1 pr-1">
        {typeof contentCount === "number" ? (
          <span className="ds-list-item__subtitle shrink-0 text-[11px] font-normal tabular-nums leading-none opacity-60">
            {contentCount}
          </span>
        ) : null}
        {hasNextColumn ? (
          <ChevronRight
            className={cn(
              "sidebar-icon ds-list-item__icon h-3.5 w-3.5",
              selected && FOLDER_ROW_ICON_ACTIVE_CLASS,
            )}
          />
        ) : null}
      </span>
    ) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      data-selected={selected ? "true" : undefined}
      data-drop-position={dropPosition ?? undefined}
      draggable={draggable}
      aria-grabbed={dragging ? true : undefined}
      style={FOLDER_COLUMN_ROW_STYLE}
      className={cn(
        "sidebar-row sidebar-row--folder ds-list-item ds-list-item--interactive",
        "relative flex w-full cursor-pointer items-center rounded-[8px] px-2 text-left",
        "select-none outline-none",
        selected && "ds-list-item--selected",
        dragging && "opacity-45",
        dropPosition === "inside" &&
          "bg-[var(--sidebar-row-hover-bg)] shadow-[inset_0_0_0_1px_rgba(120,116,108,0.22)]",
        (dropPosition === "before" || dropPosition === "after") &&
          "!bg-transparent hover:!bg-transparent !shadow-none",
      )}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={(event) => {
        if (event.defaultPrevented) return;
        onSelect();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      {dropPosition === "before" ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 top-[-1px] z-50 h-[2px] bg-[#7f7a72] shadow-[0_0_0_1px_rgba(127,122,114,0.18)]"
        />
      ) : null}
      {dropPosition === "after" ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[-1px] left-0 right-0 z-50 h-[2px] bg-[#7f7a72] shadow-[0_0_0_1px_rgba(127,122,114,0.18)]"
        />
      ) : null}

      <span className="ds-list-item__icon flex h-full w-4 shrink-0 items-center justify-center">
        <Icon
          className={cn(
            "sidebar-icon ds-list-item__icon",
            FOLDER_ROW_ICON_SIZE_CLASS,
            selected
              ? FOLDER_ROW_ICON_ACTIVE_CLASS
              : FOLDER_ROW_ICON_MUTED_CLASS,
          )}
        />
      </span>

      <div className="ds-list-item__content flex h-full min-w-0 flex-1 items-center pr-1">
        <div className="pointer-events-none flex min-w-0 flex-1 items-center">
          <span className={cn(FOLDER_ROW_TITLE_CLASS, "font-normal")}>
            {entry.name}
          </span>
        </div>
        {trailing}
      </div>
    </div>
  );
};

export const FolderColumnView = ({
  folders,
  cards,
  cardSets = [],
  documents,
  selectedFolderId,
  selectedItem,
  selectedCardSetId = null,
  isFiltering = false,
  resetToken = 0,
  onItemSelect,
  onMoveFolder,
  onReorderFolders,
  onMoveCardSetToFolder,
  onReorderCardSets,
  onMoveDocumentToFolder,
  onReorderDocuments,
  onMoveCardToSet,
  onReorderCardsInCardSet,
  className,
}: FolderColumnViewProps) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const resizeGuideRef = useRef<HTMLDivElement | null>(null);
  const dragBadgeRef = useRef<HTMLDivElement | null>(null);
  const pendingDragBadgePointRef = useRef<{
    x: number;
    y: number;
  } | null>(null);
  const columnSectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const dragPayloadRef = useRef<FolderColumnDragPayload | null>(null);
  const expandDropTargetTimeoutRef = useRef<number | null>(null);
  const columnResizeStateRef = useRef<{
    columnId: string;
    startX: number;
    startWidth: number;
  } | null>(null);
  const pendingColumnWidthRef = useRef(DEFAULT_FOLDER_COLUMN_WIDTH_PX);
  const resizeAnimationFrameRef = useRef<number | null>(null);
  const dragBadgeAnimationFrameRef = useRef<number | null>(null);
  const previousBodyUserSelectRef = useRef("");
  const previousBodyCursorRef = useRef("");

  const [columnPath, setColumnPath] = useState<FolderColumnContext[]>([]);
  const [columnWidthById, setColumnWidthById] = useState<FolderColumnWidthMap>(
    readStoredFolderColumnWidths,
  );
  const [isColumnResizing, setIsColumnResizing] = useState(false);
  const [draggingEntryKey, setDraggingEntryKey] = useState<string | null>(null);
  const [activeDropIntent, setActiveDropIntent] =
    useState<FolderColumnDropIntent | null>(null);
  const [dragBadge, setDragBadge] = useState<FolderColumnDragBadge | null>(
    null,
  );
  const optimisticOrderByScopeRef = useRef<
    Record<FolderColumnOrderScopeKey, string[]>
  >({});
  const [optimisticOrderByScope, setOptimisticOrderByScope] = useState<
    Record<FolderColumnOrderScopeKey, string[]>
  >({});

  const derived = useExplorerDerivedData({
    treeFolders: folders,
    treeCards: cards,
    cardSets,
    documents,
    isFiltering,
  });

  const {
    rootFolders,
    getChildFolders,
    getFolderItems,
    getCardSets,
    getCardSetItems,
    matchCountMap,
    getFolderContentCount,
    visibleFolderIdSet,
  } = derived;

  const folderNameById = useMemo(() => {
    const map = new Map<string, string>();

    for (const folder of folders) {
      const folderId = getFolderId(folder);
      if (!folderId) continue;
      map.set(folderId, getFolderDisplayName(folder));
    }

    return map;
  }, [folders]);

  const cardSetNameById = useMemo(() => {
    const map = new Map<string, string>();

    for (const cardSet of cardSets) {
      map.set(cardSet.id, getCardSetDisplayName(cardSet));
    }

    return map;
  }, [cardSets]);

  const parentFolderIdById = useMemo(() => {
    const map = new Map<string, string | null>();

    for (const folder of folders) {
      const folderId = getFolderId(folder);
      if (!folderId || !visibleFolderIdSet.has(folderId)) continue;

      const parentFolderId = normalizeFolderId(getParentFolderId(folder));
      map.set(
        folderId,
        parentFolderId && visibleFolderIdSet.has(parentFolderId)
          ? parentFolderId
          : null,
      );
    }

    return map;
  }, [folders, visibleFolderIdSet]);

  const buildFolderPath = useCallback(
    (folderId: string | null | undefined) => {
      if (!folderId || !visibleFolderIdSet.has(folderId)) return [];

      const path: FolderColumnContext[] = [];
      const seenFolderIds = new Set<string>();
      let currentFolderId: string | null = folderId;

      while (
        currentFolderId &&
        visibleFolderIdSet.has(currentFolderId) &&
        !seenFolderIds.has(currentFolderId)
      ) {
        seenFolderIds.add(currentFolderId);
        path.unshift({ type: "folder", id: currentFolderId });
        currentFolderId = parentFolderIdById.get(currentFolderId) ?? null;
      }

      return path;
    },
    [parentFolderIdById, visibleFolderIdSet],
  );

  const isFolderDescendantOf = useCallback(
    (candidateFolderId: string, ancestorFolderId: string) => {
      let currentFolderId: string | null =
        parentFolderIdById.get(candidateFolderId) ?? null;
      const seenFolderIds = new Set<string>();

      while (currentFolderId && !seenFolderIds.has(currentFolderId)) {
        if (currentFolderId === ancestorFolderId) return true;
        seenFolderIds.add(currentFolderId);
        currentFolderId = parentFolderIdById.get(currentFolderId) ?? null;
      }

      return false;
    },
    [parentFolderIdById],
  );

  const getColumnWidth = useCallback(
    (columnId: string) =>
      clampFolderColumnWidth(
        columnWidthById[columnId] ?? DEFAULT_FOLDER_COLUMN_WIDTH_PX,
      ),
    [columnWidthById],
  );

  const getColumnStyle = useCallback(
    (columnId: string) => {
      const widthPx = getColumnWidth(columnId);
      const cssWidth = `${widthPx}px`;

      return {
        flex: `0 0 ${cssWidth}`,
        width: cssWidth,
        minWidth: cssWidth,
        contain: "layout paint style",
        willChange: isColumnResizing
          ? "width, min-width, flex-basis"
          : undefined,
      } satisfies CSSProperties;
    },
    [getColumnWidth, isColumnResizing],
  );

  const setColumnSectionRef = useCallback(
    (columnId: string, node: HTMLElement | null) => {
      if (node) columnSectionRefs.current.set(columnId, node);
      else columnSectionRefs.current.delete(columnId);
    },
    [],
  );

  const applyColumnWidthToDom = useCallback(
    (columnId: string, width: number) => {
      const nextWidth = clampFolderColumnWidth(width);
      const section = columnSectionRefs.current.get(columnId);
      if (!section) return;

      const cssWidth = `${nextWidth}px`;
      section.style.flexBasis = cssWidth;
      section.style.width = cssWidth;
      section.style.minWidth = cssWidth;
    },
    [],
  );

  const showResizeGuide = useCallback((clientX: number) => {
    const guide = resizeGuideRef.current;
    const scroller = scrollerRef.current;
    if (!guide || !scroller) return;

    const resizeState = columnResizeStateRef.current;
    const guideClientX = resizeState
      ? resizeState.startX +
        (clampFolderColumnWidth(
          resizeState.startWidth + clientX - resizeState.startX,
        ) -
          resizeState.startWidth)
      : clientX;

    const rect = scroller.getBoundingClientRect();
    const x = Math.round(guideClientX - rect.left + scroller.scrollLeft);

    guide.style.opacity = "1";
    guide.style.transform = `translate3d(${x}px, 0, 0)`;
  }, []);

  const hideResizeGuide = useCallback(() => {
    const guide = resizeGuideRef.current;
    if (!guide) return;

    guide.style.opacity = "0";
    guide.style.transform = "translate3d(-9999px, 0, 0)";
  }, []);

  const scheduleColumnWidthApply = useCallback(
    (columnId: string, width: number) => {
      const nextWidth = clampFolderColumnWidth(width);
      pendingColumnWidthRef.current = nextWidth;

      if (typeof window === "undefined") {
        applyColumnWidthToDom(columnId, nextWidth);
        return;
      }

      if (resizeAnimationFrameRef.current !== null) return;

      resizeAnimationFrameRef.current = window.requestAnimationFrame(() => {
        resizeAnimationFrameRef.current = null;
        applyColumnWidthToDom(columnId, pendingColumnWidthRef.current);
      });
    },
    [applyColumnWidthToDom],
  );

  const restoreBodyResizeStyles = useCallback(() => {
    if (typeof document === "undefined") return;

    document.body.style.userSelect = previousBodyUserSelectRef.current;
    document.body.style.cursor = previousBodyCursorRef.current;

    previousBodyUserSelectRef.current = "";
    previousBodyCursorRef.current = "";
  }, []);

  const setOptimisticOrderForScope = useCallback(
    (
      payload: FolderColumnDragPayload,
      target: FolderColumnDropTarget,
      orderedIds: string[],
    ) => {
      const scopeKey = getOrderScopeKey(payload.kind, target);
      if (!scopeKey) return null;

      const previousOrder = optimisticOrderByScopeRef.current[scopeKey];
      const nextOrderByScope = {
        ...optimisticOrderByScopeRef.current,
        [scopeKey]: orderedIds,
      };

      optimisticOrderByScopeRef.current = nextOrderByScope;
      setOptimisticOrderByScope(nextOrderByScope);

      return { scopeKey, previousOrder };
    },
    [],
  );

  const rollbackOptimisticOrderForScope = useCallback(
    (
      snapshot: {
        scopeKey: FolderColumnOrderScopeKey;
        previousOrder?: string[];
      } | null,
    ) => {
      if (!snapshot) return;

      const nextOrderByScope = { ...optimisticOrderByScopeRef.current };

      if (snapshot.previousOrder) {
        nextOrderByScope[snapshot.scopeKey] = snapshot.previousOrder;
      } else {
        delete nextOrderByScope[snapshot.scopeKey];
      }

      optimisticOrderByScopeRef.current = nextOrderByScope;
      setOptimisticOrderByScope(nextOrderByScope);
    },
    [],
  );

  const applyOptimisticEntryOrder = useCallback(
    <TEntry extends Pick<FolderColumnEntry, "id" | "kind">>(
      entries: TEntry[],
      kind: FolderColumnDragPayload["kind"],
      target: FolderColumnDropTarget,
    ) => {
      const scopeKey = getOrderScopeKey(kind, target);
      const optimisticOrder = scopeKey
        ? optimisticOrderByScope[scopeKey]
        : undefined;

      if (!optimisticOrder || optimisticOrder.length === 0) return entries;

      const orderIndexById = new Map(
        optimisticOrder.map((id, index) => [id, index]),
      );

      return entries
        .map((entry, originalIndex) => ({ entry, originalIndex }))
        .sort((left, right) => {
          const leftOrder = orderIndexById.get(left.entry.id);
          const rightOrder = orderIndexById.get(right.entry.id);

          if (leftOrder !== undefined && rightOrder !== undefined) {
            return leftOrder - rightOrder;
          }

          if (leftOrder !== undefined) return -1;
          if (rightOrder !== undefined) return 1;

          return left.originalIndex - right.originalIndex;
        })
        .map(({ entry }) => entry);
    },
    [optimisticOrderByScope],
  );

  const applyDragBadgePosition = useCallback((x: number, y: number) => {
    const badge = dragBadgeRef.current;
    if (!badge) return;

    const nextX = Math.max(12, x + 14);
    const nextY = Math.max(12, y + 16);

    badge.style.transform = `translate3d(${nextX}px, ${nextY}px, 0)`;
  }, []);

  const cancelDragBadgeAnimationFrame = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      dragBadgeAnimationFrameRef.current !== null
    ) {
      window.cancelAnimationFrame(dragBadgeAnimationFrameRef.current);
      dragBadgeAnimationFrameRef.current = null;
    }

    pendingDragBadgePointRef.current = null;
  }, []);

  const scheduleDragBadgePosition = useCallback(
    (x: number, y: number) => {
      pendingDragBadgePointRef.current = { x, y };

      if (typeof window === "undefined") {
        applyDragBadgePosition(x, y);
        return;
      }

      if (dragBadgeAnimationFrameRef.current !== null) {
        return;
      }

      dragBadgeAnimationFrameRef.current = window.requestAnimationFrame(() => {
        dragBadgeAnimationFrameRef.current = null;

        const point = pendingDragBadgePointRef.current;
        if (!point) return;

        applyDragBadgePosition(point.x, point.y);
      });
    },
    [applyDragBadgePosition],
  );

  useEffect(() => {
    if (!dragBadge) return;

    const point = pendingDragBadgePointRef.current;
    if (!point) return;

    applyDragBadgePosition(point.x, point.y);
  }, [applyDragBadgePosition, dragBadge]);

  const getDragBadgeLabel = useCallback(
    (intent: FolderColumnDropIntent) => {
      if (intent.position === "before" || intent.position === "after") {
        return "ここに移動";
      }

      if (intent.target.type === "folder") {
        if (intent.target.id === null) return "ルートに移動";
        return `${folderNameById.get(intent.target.id) ?? "フォルダ"} に移動`;
      }

      return `${cardSetNameById.get(intent.target.id) ?? "カードセット"} に移動`;
    },
    [cardSetNameById, folderNameById],
  );

  const getDragBadgeIcon = useCallback(
    (intent: FolderColumnDropIntent): FolderColumnDragBadge["icon"] => {
      if (intent.position === "before" || intent.position === "after") {
        return "below";
      }

      return "into";
    },
    [],
  );

  const updateDragBadge = useCallback(
    (intent: FolderColumnDropIntent, event: ReactDragEvent<HTMLElement>) => {
      const nextBadge = {
        label: getDragBadgeLabel(intent),
        icon: getDragBadgeIcon(intent),
      } satisfies FolderColumnDragBadge;

      setDragBadge((previousBadge) => {
        if (
          previousBadge?.label === nextBadge.label &&
          previousBadge.icon === nextBadge.icon
        ) {
          return previousBadge;
        }

        return nextBadge;
      });

      scheduleDragBadgePosition(event.clientX, event.clientY);
    },
    [getDragBadgeIcon, getDragBadgeLabel, scheduleDragBadgePosition],
  );

  const clearDropState = useCallback(() => {
    setActiveDropIntent(null);
    setDragBadge(null);
    cancelDragBadgeAnimationFrame();

    if (
      typeof window !== "undefined" &&
      expandDropTargetTimeoutRef.current !== null
    ) {
      window.clearTimeout(expandDropTargetTimeoutRef.current);
      expandDropTargetTimeoutRef.current = null;
    }
  }, [cancelDragBadgeAnimationFrame]);

  const getDragPayloadForEntry = useCallback(
    (entry: FolderColumnEntry): FolderColumnDragPayload => {
      if (entry.kind === "card") {
        return {
          kind: "card",
          id: entry.id,
          cardSetId: entry.cardSetId,
        };
      }

      return {
        kind: entry.kind,
        id: entry.id,
      };
    },
    [],
  );

  const getDropTargetForEntry = useCallback(
    (entry: FolderColumnEntry): FolderColumnDropTarget | null => {
      if (entry.kind === "folder") return { type: "folder", id: entry.id };
      if (entry.kind === "cardSet") return { type: "cardSet", id: entry.id };
      return null;
    },
    [],
  );

  const getDropTargetForColumn = useCallback(
    (context: FolderColumnContext | null): FolderColumnDropTarget => {
      if (!context) return { type: "folder", id: null };
      if (context.type === "folder") return { type: "folder", id: context.id };
      return { type: "cardSet", id: context.id };
    },
    [],
  );

  const getEntryDropPosition = useCallback(
    (
      entry: FolderColumnEntry,
      event: ReactDragEvent<HTMLDivElement>,
    ): Exclude<FolderColumnDropPosition, "append"> => {
      const rect = event.currentTarget.getBoundingClientRect();
      const ratio =
        rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;

      if (ratio < 0.42) return "before";
      if (ratio > 0.58) return "after";

      return entry.kind === "folder" || entry.kind === "cardSet"
        ? "inside"
        : ratio < 0.5
          ? "before"
          : "after";
    },
    [],
  );

  const getEntityIdsForTarget = useCallback(
    (
      payload: FolderColumnDragPayload,
      target: FolderColumnDropTarget,
    ): string[] => {
      if (payload.kind === "folder" && target.type === "folder") {
        return (target.id ? getChildFolders(target.id) : rootFolders)
          .map((folder) => getFolderId(folder))
          .filter((id): id is string => Boolean(id));
      }

      if (payload.kind === "cardSet" && target.type === "folder" && target.id) {
        return getCardSets(target.id).map((cardSet) => cardSet.id);
      }

      if (
        payload.kind === "document" &&
        target.type === "folder" &&
        target.id
      ) {
        return getFolderItems(target.id)
          .filter((item) => item.type === "document")
          .map((item) => item.data.id);
      }

      if (payload.kind === "card" && target.type === "cardSet") {
        return getCardSetItems(target.id)
          .filter((item) => item.type === "card")
          .map((item) => item.data.id);
      }

      return [];
    },
    [
      getCardSetItems,
      getCardSets,
      getChildFolders,
      getFolderItems,
      rootFolders,
    ],
  );

  const canDropOnIntent = useCallback(
    (
      payload: FolderColumnDragPayload | null,
      intent: FolderColumnDropIntent | null,
    ) => {
      if (!payload || !intent || isFiltering) return false;

      const { target, position, targetEntry } = intent;
      const isBetweenDrop = position === "before" || position === "after";

      if (isBetweenDrop) {
        if (!targetEntry) return false;
        if (targetEntry.id === payload.id) return false;
        if (targetEntry.kind !== payload.kind) return false;
      }

      if (payload.kind === "folder") {
        if (target.type !== "folder") return false;
        if (target.id === payload.id) return false;
        if (target.id && isFolderDescendantOf(target.id, payload.id)) {
          return false;
        }

        return isBetweenDrop || position === "append"
          ? Boolean(onReorderFolders)
          : Boolean(onReorderFolders || onMoveFolder);
      }

      if (payload.kind === "cardSet") {
        if (target.type !== "folder") return false;
        if (!target.id) return false;

        return isBetweenDrop || position === "append"
          ? Boolean(onReorderCardSets)
          : Boolean(onReorderCardSets || onMoveCardSetToFolder);
      }

      if (payload.kind === "document") {
        if (target.type !== "folder") return false;
        if (!target.id) return false;

        return isBetweenDrop || position === "append"
          ? Boolean(onReorderDocuments)
          : Boolean(onReorderDocuments || onMoveDocumentToFolder);
      }

      if (payload.kind === "card") {
        if (target.type !== "cardSet") return false;
        return Boolean(onReorderCardsInCardSet);
      }

      return false;
    },
    [
      isFiltering,
      isFolderDescendantOf,
      onMoveCardSetToFolder,
      onMoveDocumentToFolder,
      onMoveFolder,
      onReorderCardSets,
      onReorderCardsInCardSet,
      onReorderDocuments,
      onReorderFolders,
    ],
  );

  const buildNextOrderedIds = useCallback(
    (payload: FolderColumnDragPayload, intent: FolderColumnDropIntent) => {
      const ids = getEntityIdsForTarget(payload, intent.target).filter(
        (id) => id !== payload.id,
      );

      if (
        (intent.position === "before" || intent.position === "after") &&
        intent.targetEntry
      ) {
        const targetIndex = ids.indexOf(intent.targetEntry.id);
        const insertIndex =
          targetIndex === -1
            ? ids.length
            : targetIndex + (intent.position === "after" ? 1 : 0);
        ids.splice(insertIndex, 0, payload.id);
        return ids;
      }

      ids.push(payload.id);
      return ids;
    },
    [getEntityIdsForTarget],
  );

  const doesDropChange = useCallback(
    (payload: FolderColumnDragPayload, intent: FolderColumnDropIntent) => {
      const currentIds = getEntityIdsForTarget(payload, intent.target);
      const nextIds = buildNextOrderedIds(payload, intent);

      if (currentIds.length !== nextIds.length) return true;

      return currentIds.some((id, index) => id !== nextIds[index]);
    },
    [buildNextOrderedIds, getEntityIdsForTarget],
  );

  const expandDropTarget = useCallback(
    (target: FolderColumnDropTarget, columnIndex: number) => {
      if (target.type === "folder" && target.id === null) return;

      const nextContext: FolderColumnContext =
        target.type === "folder"
          ? { type: "folder", id: target.id }
          : { type: "cardSet", id: target.id };

      setColumnPath((previousPath) => {
        const nextPath = [...previousPath.slice(0, columnIndex), nextContext];
        return areSameColumnPaths(previousPath, nextPath)
          ? previousPath
          : nextPath;
      });
    },
    [],
  );

  const scheduleDropTargetExpand = useCallback(
    (intent: FolderColumnDropIntent) => {
      if (typeof window === "undefined") return;
      if (intent.position !== "inside") return;
      if (intent.target.type === "folder" && intent.target.id === null) return;

      if (expandDropTargetTimeoutRef.current !== null) {
        window.clearTimeout(expandDropTargetTimeoutRef.current);
      }

      expandDropTargetTimeoutRef.current = window.setTimeout(() => {
        expandDropTargetTimeoutRef.current = null;
        expandDropTarget(intent.target, intent.columnIndex);
      }, 480);
    },
    [expandDropTarget],
  );

  const moveDraggedEntry = useCallback(
    async (
      payload: FolderColumnDragPayload,
      intent: FolderColumnDropIntent,
    ) => {
      const { target } = intent;
      const nextOrderedIds = buildNextOrderedIds(payload, intent);
      const optimisticSnapshot = setOptimisticOrderForScope(
        payload,
        target,
        nextOrderedIds,
      );

      try {
        if (payload.kind === "folder" && target.type === "folder") {
          if (onReorderFolders) {
            await onReorderFolders(target.id, nextOrderedIds);
            return;
          }

          await onMoveFolder?.(payload.id, target.id);
          return;
        }

        if (
          payload.kind === "cardSet" &&
          target.type === "folder" &&
          target.id
        ) {
          if (onReorderCardSets) {
            await onReorderCardSets(target.id, nextOrderedIds);
            return;
          }

          await onMoveCardSetToFolder?.(payload.id, target.id);
          return;
        }

        if (
          payload.kind === "document" &&
          target.type === "folder" &&
          target.id
        ) {
          if (onReorderDocuments) {
            await onReorderDocuments(target.id, nextOrderedIds);
            return;
          }

          await onMoveDocumentToFolder?.(payload.id, target.id);
          return;
        }

        if (payload.kind === "card" && target.type === "cardSet") {
          if (payload.cardSetId !== target.id) {
            await onMoveCardToSet?.(payload.id, target.id);
          }

          await onReorderCardsInCardSet?.(target.id, nextOrderedIds);
        }
      } catch (error) {
        rollbackOptimisticOrderForScope(optimisticSnapshot);
        throw error;
      }
    },
    [
      buildNextOrderedIds,
      onMoveCardSetToFolder,
      onMoveCardToSet,
      onMoveDocumentToFolder,
      onMoveFolder,
      onReorderCardSets,
      onReorderCardsInCardSet,
      onReorderDocuments,
      onReorderFolders,
      rollbackOptimisticOrderForScope,
      setOptimisticOrderForScope,
    ],
  );

  const handleEntryDragStart = useCallback(
    (entry: FolderColumnEntry, event: ReactDragEvent<HTMLDivElement>) => {
      const payload = getDragPayloadForEntry(entry);
      const payloadKey = getDragPayloadKey(payload);

      dragPayloadRef.current = payload;
      setDraggingEntryKey(payloadKey);

      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(
        "application/x-manifolia-folder-column-entry",
        JSON.stringify(payload),
      );
      event.dataTransfer.setData("text/plain", entry.name);
    },
    [getDragPayloadForEntry],
  );

  const handleEntryDragEnd = useCallback(() => {
    dragPayloadRef.current = null;
    setDraggingEntryKey(null);
    clearDropState();
  }, [clearDropState]);

  const handleDropIntentDragOver = useCallback(
    (
      intent: FolderColumnDropIntent | null,
      event: ReactDragEvent<HTMLElement>,
    ) => {
      const payload = dragPayloadRef.current;

      if (
        !payload ||
        !intent ||
        !canDropOnIntent(payload, intent) ||
        !doesDropChange(payload, intent)
      ) {
        setActiveDropIntent(null);
        setDragBadge(null);
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";

      setActiveDropIntent(intent);
      updateDragBadge(intent, event);
      scheduleDropTargetExpand(intent);
    },
    [
      canDropOnIntent,
      doesDropChange,
      scheduleDropTargetExpand,
      updateDragBadge,
    ],
  );

  const handleDropTargetDragLeave = useCallback(
    (event: ReactDragEvent<HTMLElement>) => {
      const relatedTarget = event.relatedTarget;
      if (
        relatedTarget instanceof Node &&
        event.currentTarget.contains(relatedTarget)
      ) {
        return;
      }

      clearDropState();
    },
    [clearDropState],
  );

  const handleRowDragLeave = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      event.stopPropagation();
    },
    [],
  );

  const handleDropOnIntent = useCallback(
    async (
      intent: FolderColumnDropIntent | null,
      event: ReactDragEvent<HTMLElement>,
    ) => {
      const payload = dragPayloadRef.current;
      if (
        !payload ||
        !intent ||
        !canDropOnIntent(payload, intent) ||
        !doesDropChange(payload, intent)
      ) {
        clearDropState();
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      clearDropState();
      await moveDraggedEntry(payload, intent);
      dragPayloadRef.current = null;
      setDraggingEntryKey(null);
    },
    [canDropOnIntent, clearDropState, doesDropChange, moveDraggedEntry],
  );

  const getColumnDropIntent = useCallback(
    (column: FolderColumn, columnIndex: number): FolderColumnDropIntent => ({
      target: getDropTargetForColumn(column.context),
      position: "append",
      columnId: column.id,
      columnIndex,
    }),
    [getDropTargetForColumn],
  );

  const getRowDropIntent = useCallback(
    (
      entry: FolderColumnEntry,
      column: FolderColumn,
      columnIndex: number,
      event: ReactDragEvent<HTMLDivElement>,
    ): FolderColumnDropIntent | null => {
      const position = getEntryDropPosition(entry, event);
      const target =
        position === "inside"
          ? getDropTargetForEntry(entry)
          : getDropTargetForColumn(column.context);

      if (!target) return null;

      return {
        target,
        position,
        columnId: column.id,
        columnIndex,
        targetEntry:
          position === "before" || position === "after"
            ? { kind: entry.kind, id: entry.id, name: entry.name }
            : undefined,
      };
    },
    [getDropTargetForColumn, getDropTargetForEntry, getEntryDropPosition],
  );

  const handleColumnResizeEnd = useCallback(() => {
    const resizeState = columnResizeStateRef.current;
    if (!resizeState) return;

    columnResizeStateRef.current = null;
    setIsColumnResizing(false);

    if (
      typeof window !== "undefined" &&
      resizeAnimationFrameRef.current !== null
    ) {
      window.cancelAnimationFrame(resizeAnimationFrameRef.current);
      resizeAnimationFrameRef.current = null;
    }

    const nextWidth = clampFolderColumnWidth(pendingColumnWidthRef.current);
    applyColumnWidthToDom(resizeState.columnId, nextWidth);

    setColumnWidthById((previousWidths) => {
      const nextWidths = {
        ...previousWidths,
        [resizeState.columnId]: nextWidth,
      };

      writeStoredFolderColumnWidths(nextWidths);
      return nextWidths;
    });

    restoreBodyResizeStyles();
    hideResizeGuide();
  }, [applyColumnWidthToDom, hideResizeGuide, restoreBodyResizeStyles]);

  const handleColumnResizeMove = useCallback(
    (event: PointerEvent) => {
      const resizeState = columnResizeStateRef.current;
      if (!resizeState) return;

      event.preventDefault();
      showResizeGuide(event.clientX);
      const deltaX = event.clientX - resizeState.startX;
      scheduleColumnWidthApply(
        resizeState.columnId,
        resizeState.startWidth + deltaX,
      );
    },
    [scheduleColumnWidthApply, showResizeGuide],
  );

  const handleColumnResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, columnId: string) => {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture?.(event.pointerId);

      const currentWidth = getColumnWidth(columnId);

      columnResizeStateRef.current = {
        columnId,
        startX: event.clientX,
        startWidth: currentWidth,
      };
      pendingColumnWidthRef.current = currentWidth;
      setIsColumnResizing(true);
      applyColumnWidthToDom(columnId, currentWidth);
      showResizeGuide(event.clientX);

      if (typeof document !== "undefined") {
        previousBodyUserSelectRef.current = document.body.style.userSelect;
        previousBodyCursorRef.current = document.body.style.cursor;
        document.body.style.userSelect = "none";
        document.body.style.cursor = "col-resize";
      }
    },
    [applyColumnWidthToDom, getColumnWidth, showResizeGuide],
  );

  useEffect(() => {
    if (!isColumnResizing) return;

    window.addEventListener("pointermove", handleColumnResizeMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handleColumnResizeEnd);
    window.addEventListener("pointercancel", handleColumnResizeEnd);

    return () => {
      window.removeEventListener("pointermove", handleColumnResizeMove);
      window.removeEventListener("pointerup", handleColumnResizeEnd);
      window.removeEventListener("pointercancel", handleColumnResizeEnd);
    };
  }, [handleColumnResizeEnd, handleColumnResizeMove, isColumnResizing]);

  useEffect(() => {
    return () => {
      if (
        typeof window !== "undefined" &&
        resizeAnimationFrameRef.current !== null
      ) {
        window.cancelAnimationFrame(resizeAnimationFrameRef.current);
      }

      cancelDragBadgeAnimationFrame();

      if (columnResizeStateRef.current) {
        columnResizeStateRef.current = null;
        restoreBodyResizeStyles();
        hideResizeGuide();
      }

      clearDropState();
      dragPayloadRef.current = null;
    };
  }, [
    cancelDragBadgeAnimationFrame,
    clearDropState,
    hideResizeGuide,
    restoreBodyResizeStyles,
  ]);

  useEffect(() => {
    if (!selectedFolderId || !visibleFolderIdSet.has(selectedFolderId)) return;

    const nextPath = buildFolderPath(selectedFolderId);
    setColumnPath((previousPath) =>
      areSameColumnPaths(previousPath, nextPath) ? previousPath : nextPath,
    );
  }, [buildFolderPath, selectedFolderId, visibleFolderIdSet]);

  useEffect(() => {
    setColumnPath([]);
  }, [resetToken]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollTo({
      left: scroller.scrollWidth,
      behavior: "auto",
    });
  }, [columnPath.length]);

  const hasFolderMatches = useCallback(
    (folderId: string) => {
      if (!isFiltering) return true;
      return (matchCountMap.get(folderId) ?? 0) > 0;
    },
    [isFiltering, matchCountMap],
  );

  const hasCardSetMatches = useCallback(
    (cardSetId: string) => {
      if (!isFiltering) return true;
      return getCardSetItems(cardSetId).length > 0;
    },
    [getCardSetItems, isFiltering],
  );

  const activeCardSetIdSet = useMemo(() => {
    return new Set(
      cardSets
        .filter(
          (cardSet) =>
            !(cardSet as unknown as { isDeleted?: boolean }).isDeleted,
        )
        .map((cardSet) => cardSet.id),
    );
  }, [cardSets]);

  const buildColumnEntries = useCallback(
    (context: FolderColumnContext | null): FolderColumnEntry[] => {
      if (context?.type === "cardSet") {
        const cardSetEntries = getCardSetItems(context.id).map(
          (item): FolderColumnEntry => {
            if (item.type === "card") {
              return {
                kind: "card",
                id: item.data.id,
                name: getExplorerItemDisplayName(item),
                cardSetId: getCardCardSetId(item.data),
              };
            }

            return {
              kind: "document",
              id: item.data.id,
              name: getExplorerItemDisplayName(item),
            };
          },
        );

        return applyOptimisticEntryOrder(cardSetEntries, "card", {
          type: "cardSet",
          id: context.id,
        });
      }

      const parentFolderId = context?.type === "folder" ? context.id : null;
      const targetFolderDropTarget: FolderColumnDropTarget = {
        type: "folder",
        id: parentFolderId,
      };

      let childFolders = (
        parentFolderId ? getChildFolders(parentFolderId) : rootFolders
      )
        .filter((folder) => {
          const folderId = getFolderId(folder);
          return Boolean(folderId) && hasFolderMatches(folderId);
        })
        .map((folder) => {
          const folderId = getFolderId(folder);
          const contentCount = getFolderContentCount(folderId);
          const hasNextColumn =
            getChildFolders(folderId).some((childFolder) => {
              const childFolderId = getFolderId(childFolder);
              return Boolean(childFolderId) && hasFolderMatches(childFolderId);
            }) ||
            getCardSets(folderId).some((cardSet) =>
              hasCardSetMatches(cardSet.id),
            ) ||
            getFolderItems(folderId).length > 0;

          return {
            kind: "folder" as const,
            id: folderId,
            name: getFolderDisplayName(folder),
            folder,
            contentCount,
            hasNextColumn,
          };
        });

      childFolders = applyOptimisticEntryOrder(
        childFolders,
        "folder",
        targetFolderDropTarget,
      );

      let childCardSets = getCardSets(parentFolderId)
        .filter((cardSet) => hasCardSetMatches(cardSet.id))
        .map((cardSet) => {
          const cardSetItems = getCardSetItems(cardSet.id);

          return {
            kind: "cardSet" as const,
            id: cardSet.id,
            name: getCardSetDisplayName(cardSet),
            contentCount: cardSetItems.length,
            hasNextColumn: cardSetItems.length > 0,
          };
        });

      childCardSets = applyOptimisticEntryOrder(
        childCardSets,
        "cardSet",
        targetFolderDropTarget,
      );

      const childItems = getFolderItems(parentFolderId)
        .filter((item) => {
          if (item.type === "document") return true;

          const cardSetId = getCardCardSetId(item.data);
          if (cardSetId && activeCardSetIdSet.has(cardSetId)) return false;

          return true;
        })
        .map((item): FolderColumnEntry => {
          if (item.type === "card") {
            return {
              kind: "card",
              id: item.data.id,
              name: getExplorerItemDisplayName(item),
              cardSetId: getCardCardSetId(item.data),
            };
          }

          return {
            kind: "document",
            id: item.data.id,
            name: getExplorerItemDisplayName(item),
          };
        });

      const childDocuments = applyOptimisticEntryOrder(
        childItems.filter((item) => item.kind === "document"),
        "document",
        targetFolderDropTarget,
      );
      const childCards = childItems.filter((item) => item.kind === "card");

      return [
        ...childFolders,
        ...childCardSets,
        ...childDocuments,
        ...childCards,
      ];
    },
    [
      activeCardSetIdSet,
      applyOptimisticEntryOrder,
      getCardSetItems,
      getCardSets,
      getChildFolders,
      getFolderContentCount,
      getFolderItems,
      hasCardSetMatches,
      hasFolderMatches,
      rootFolders,
    ],
  );

  const columns = useMemo<FolderColumn[]>(() => {
    const contexts = [null, ...columnPath];

    return contexts.map((context) => ({
      id: getColumnContextKey(context),
      context,
      entries: buildColumnEntries(context),
    }));
  }, [buildColumnEntries, columnPath]);

  const handleBranchEntrySelect = useCallback(
    (
      entry: Extract<FolderColumnEntry, { kind: "folder" | "cardSet" }>,
      columnIndex: number,
    ) => {
      const nextContext: FolderColumnContext = {
        type: entry.kind,
        id: entry.id,
      };

      setColumnPath((previousPath) => {
        const nextPath = [...previousPath.slice(0, columnIndex), nextContext];
        return areSameColumnPaths(previousPath, nextPath)
          ? previousPath
          : nextPath;
      });
    },
    [],
  );

  const handleEntrySelect = useCallback(
    (entry: FolderColumnEntry, columnIndex: number) => {
      if (entry.kind === "folder" || entry.kind === "cardSet") {
        handleBranchEntrySelect(entry, columnIndex);
        return;
      }

      onItemSelect({
        type: entry.kind,
        id: entry.id,
      });
    },
    [handleBranchEntrySelect, onItemSelect],
  );

  const isEntrySelected = useCallback(
    (entry: FolderColumnEntry, columnIndex: number) => {
      if (entry.kind === "folder") {
        const selectedPathEntry = columnPath[columnIndex];
        return (
          selectedPathEntry?.type === "folder" &&
          selectedPathEntry.id === entry.id
        );
      }

      if (entry.kind === "cardSet") {
        const selectedPathEntry = columnPath[columnIndex];
        if (
          selectedPathEntry?.type === "cardSet" &&
          selectedPathEntry.id === entry.id
        ) {
          return true;
        }

        return (
          selectedCardSetId === entry.id ||
          (hasSelectedItemId(selectedItem) &&
            selectedItem.type === "cardSet" &&
            selectedItem.id === entry.id)
        );
      }

      return (
        hasSelectedItemId(selectedItem) &&
        selectedItem.type === entry.kind &&
        selectedItem.id === entry.id
      );
    },
    [columnPath, selectedCardSetId, selectedItem],
  );

  return (
    <div
      ref={scrollerRef}
      className={cn(
        "folder-column-view relative h-full min-h-0 w-full overflow-x-auto overflow-y-hidden",
        isColumnResizing && "cursor-col-resize select-none",
        className,
      )}
    >
      <div
        ref={resizeGuideRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 z-50 h-full w-px bg-[#b8b3aa] opacity-0 shadow-[0_0_0_1px_rgba(120,116,108,0.18)]"
        style={{
          transform: "translate3d(-9999px, 0, 0)",
          willChange: "transform, opacity",
        }}
      />

      <div className="flex h-full min-h-0 min-w-max items-stretch">
        {columns.map((column, columnIndex) => {
          const columnDropIntent = getColumnDropIntent(column, columnIndex);
          const isColumnDropTarget =
            activeDropIntent !== null &&
            getDropIntentKey(activeDropIntent) ===
              getDropIntentKey(columnDropIntent);

          return (
            <section
              key={`${column.id}:${columnIndex}`}
              ref={(node) => setColumnSectionRef(column.id, node)}
              style={getColumnStyle(column.id)}
              className="relative h-full min-h-0 shrink-0 overflow-hidden border-r border-[#e7e5df]"
              aria-label={
                column.context?.type === "cardSet"
                  ? "カードセット内のカード"
                  : column.context?.type === "folder"
                    ? "フォルダ内の項目"
                    : "ルートフォルダ"
              }
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute right-0 top-0 z-10 h-full w-px bg-[#e1ded7]"
              />

              <div
                role="separator"
                aria-label="カラム幅を変更"
                aria-orientation="vertical"
                className="absolute right-[-6px] top-0 z-30 h-full w-3 cursor-col-resize bg-transparent"
                style={{ touchAction: "none" }}
                onPointerDown={(event) => {
                  handleColumnResizeStart(event, column.id);
                }}
              />

              <div
                className={cn(
                  "h-full min-h-0 overflow-y-auto px-1 py-1",
                  isColumnDropTarget && "bg-[rgba(122,166,161,0.055)]",
                )}
                onDragOver={(event) => {
                  handleDropIntentDragOver(columnDropIntent, event);
                }}
                onDragLeave={handleDropTargetDragLeave}
                onDrop={(event) => {
                  handleDropOnIntent(
                    activeDropIntent?.columnId === column.id
                      ? activeDropIntent
                      : columnDropIntent,
                    event,
                  );
                }}
              >
                {column.entries.length > 0 ? (
                  column.entries.map((entry) => {
                    const dragPayload = getDragPayloadForEntry(entry);
                    const dropPosition = (() => {
                      if (!activeDropIntent) return null;
                      if (activeDropIntent.columnId !== column.id) return null;
                      if (!activeDropIntent.targetEntry) return null;
                      if (activeDropIntent.targetEntry.id !== entry.id) {
                        return null;
                      }
                      if (activeDropIntent.targetEntry.kind !== entry.kind) {
                        return null;
                      }
                      if (activeDropIntent.position === "append") return null;
                      return activeDropIntent.position;
                    })();

                    return (
                      <FolderColumnRow
                        key={`${column.id}:${entry.kind}:${entry.id}`}
                        entry={entry}
                        selected={isEntrySelected(entry, columnIndex)}
                        draggable={!isFiltering}
                        dragging={
                          draggingEntryKey === getDragPayloadKey(dragPayload)
                        }
                        dropPosition={dropPosition}
                        onSelect={() => handleEntrySelect(entry, columnIndex)}
                        onDragStart={(event) => {
                          handleEntryDragStart(entry, event);
                        }}
                        onDragEnd={handleEntryDragEnd}
                        onDragOver={(event) => {
                          handleDropIntentDragOver(
                            getRowDropIntent(entry, column, columnIndex, event),
                            event,
                          );
                        }}
                        onDragLeave={handleRowDragLeave}
                        onDrop={(event) => {
                          handleDropOnIntent(
                            activeDropIntent?.columnId === column.id
                              ? activeDropIntent
                              : getRowDropIntent(
                                  entry,
                                  column,
                                  columnIndex,
                                  event,
                                ),
                            event,
                          );
                        }}
                      />
                    );
                  })
                ) : (
                  <div className="px-2 py-2 text-sm font-normal text-muted-foreground">
                    {isFiltering
                      ? "一致する項目がありません"
                      : column.context?.type === "cardSet"
                        ? "このカードセットにはカードがありません"
                        : "この階層には表示できる項目がありません"}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {dragBadge && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={dragBadgeRef}
              aria-hidden="true"
              className="pointer-events-none fixed left-0 top-0"
              style={{
                zIndex: 2147483000,
                transform: "translate3d(-9999px, -9999px, 0)",
                willChange: "transform",
                contain: "layout style paint",
              }}
            >
              <div
                className="inline-flex items-center gap-1.5 rounded-[9px] border px-2.5 py-1.5"
                style={{
                  background: "rgba(58, 55, 51, 0.86)",
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  boxShadow: "0 8px 18px rgba(0, 0, 0, 0.18)",
                  color: "rgba(255, 255, 255, 0.88)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {dragBadge.icon === "below" ? (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 5v14" />
                      <path d="m6 13 6 6 6-6" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>
                  )}
                </span>
                <span
                  className="whitespace-nowrap text-[12px] font-medium leading-none"
                  style={{ color: "rgba(255, 255, 255, 0.9)" }}
                >
                  {dragBadge.label}
                </span>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};
