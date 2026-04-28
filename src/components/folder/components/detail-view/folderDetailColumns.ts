import type { CSSProperties } from "react";
import type {
  ExplorerDetailColumnId,
  ExplorerDetailSortState,
} from "./folderDetailTypes";

const EXPLORER_DETAIL_COLUMN_WIDTHS_STORAGE_KEY =
  "manifolia:folder-detail-view:column-widths:v2";

const EXPLORER_DETAIL_COLUMN_ORDER_STORAGE_KEY =
  "manifolia:folder-detail-view:column-order:v2";

export const DETAIL_GRID_CLASS = "grid";

export const DETAIL_COLUMN_IDS = [
  "name",
  "tags",
  "path",
  "updatedAt",
  "sync",
  "kind",
  "size",
] as const satisfies readonly ExplorerDetailColumnId[];

export const DETAIL_DEFAULT_COLUMN_ORDER = [
  "name",
  "tags",
  "path",
  "sync",
  "kind",
  "updatedAt",
  "size",
] as const satisfies readonly ExplorerDetailColumnId[];

export type ExplorerDetailColumnWidths = Record<ExplorerDetailColumnId, number>;
export type ExplorerDetailColumnOrder = ExplorerDetailColumnId[];

export const DETAIL_DEFAULT_COLUMN_WIDTHS = {
  name: 248,
  tags: 136,
  path: 332,
  sync: 116,
  kind: 110,
  updatedAt: 148,
  size: 86,
} satisfies ExplorerDetailColumnWidths;

export const DETAIL_MIN_COLUMN_WIDTHS = {
  name: 180,
  tags: 110,
  path: 240,
  sync: 104,
  kind: 92,
  updatedAt: 128,
  size: 72,
} satisfies ExplorerDetailColumnWidths;

const DETAIL_MAX_COLUMN_WIDTH_PX = 680;
const DETAIL_FLEX_COLUMN_ID = "path" satisfies ExplorerDetailColumnId;

export const DEFAULT_SORT_STATE: ExplorerDetailSortState = {
  key: "manual",
  direction: "asc",
};

export const isExplorerDetailColumnId = (
  value: unknown,
): value is ExplorerDetailColumnId => {
  return (
    typeof value === "string" &&
    DETAIL_COLUMN_IDS.includes(value as ExplorerDetailColumnId)
  );
};

export const clampDetailColumnWidth = (
  columnId: ExplorerDetailColumnId,
  width: number,
): number => {
  if (!Number.isFinite(width)) return DETAIL_DEFAULT_COLUMN_WIDTHS[columnId];

  return Math.min(
    Math.max(Math.round(width), DETAIL_MIN_COLUMN_WIDTHS[columnId]),
    DETAIL_MAX_COLUMN_WIDTH_PX,
  );
};

export const normalizeDetailColumnWidths = (
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

export const normalizeDetailColumnOrder = (
  value: unknown,
): ExplorerDetailColumnOrder => {
  if (!Array.isArray(value)) return [...DETAIL_DEFAULT_COLUMN_ORDER];

  const next: ExplorerDetailColumnOrder = [];

  value.forEach((entry) => {
    if (!isExplorerDetailColumnId(entry)) return;
    if (next.includes(entry)) return;

    next.push(entry);
  });

  DETAIL_DEFAULT_COLUMN_ORDER.forEach((columnId) => {
    if (next.includes(columnId)) return;

    next.push(columnId);
  });

  return next;
};

export const moveDetailColumnOrder = (
  order: readonly ExplorerDetailColumnId[],
  activeColumnId: ExplorerDetailColumnId,
  targetIndex: number,
): ExplorerDetailColumnOrder => {
  const normalizedOrder = normalizeDetailColumnOrder(order);

  if (!normalizedOrder.includes(activeColumnId)) {
    return normalizedOrder;
  }

  const orderWithoutActiveColumn = normalizedOrder.filter(
    (columnId) => columnId !== activeColumnId,
  );
  const safeTargetIndex = Math.min(
    Math.max(Math.round(targetIndex), 0),
    orderWithoutActiveColumn.length,
  );

  return [
    ...orderWithoutActiveColumn.slice(0, safeTargetIndex),
    activeColumnId,
    ...orderWithoutActiveColumn.slice(safeTargetIndex),
  ];
};

export const readStoredDetailColumnWidths = (): ExplorerDetailColumnWidths => {
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

export const writeStoredDetailColumnWidths = (
  widths: ExplorerDetailColumnWidths,
) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    EXPLORER_DETAIL_COLUMN_WIDTHS_STORAGE_KEY,
    JSON.stringify(widths),
  );
};

export const readStoredDetailColumnOrder = (): ExplorerDetailColumnOrder => {
  if (typeof window === "undefined") {
    return [...DETAIL_DEFAULT_COLUMN_ORDER];
  }

  const raw = window.localStorage.getItem(
    EXPLORER_DETAIL_COLUMN_ORDER_STORAGE_KEY,
  );
  if (!raw) return [...DETAIL_DEFAULT_COLUMN_ORDER];

  try {
    return normalizeDetailColumnOrder(JSON.parse(raw) as unknown);
  } catch {
    return [...DETAIL_DEFAULT_COLUMN_ORDER];
  }
};

export const writeStoredDetailColumnOrder = (
  columnOrder: readonly ExplorerDetailColumnId[],
) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    EXPLORER_DETAIL_COLUMN_ORDER_STORAGE_KEY,
    JSON.stringify(normalizeDetailColumnOrder(columnOrder)),
  );
};

export const buildDetailGridTemplateColumns = (
  widths: ExplorerDetailColumnWidths,
  columnOrder: readonly ExplorerDetailColumnId[] = DETAIL_DEFAULT_COLUMN_ORDER,
): string => {
  const normalizedOrder = normalizeDetailColumnOrder(columnOrder);

  return normalizedOrder
    .map((columnId) => {
      const width = widths[columnId];

      if (columnId === DETAIL_FLEX_COLUMN_ID) {
        return `minmax(${width}px, 1fr)`;
      }

      return `${width}px`;
    })
    .join(" ");
};

export const getDetailGridMinWidth = (
  widths: ExplorerDetailColumnWidths,
  columnOrder: readonly ExplorerDetailColumnId[] = DETAIL_DEFAULT_COLUMN_ORDER,
): number => {
  const normalizedOrder = normalizeDetailColumnOrder(columnOrder);

  return normalizedOrder.reduce(
    (total, columnId) => total + widths[columnId],
    0,
  );
};

export const buildDetailGridStyle = (
  widths: ExplorerDetailColumnWidths,
  columnOrder: readonly ExplorerDetailColumnId[] = DETAIL_DEFAULT_COLUMN_ORDER,
): CSSProperties => {
  return {
    gridTemplateColumns: buildDetailGridTemplateColumns(widths, columnOrder),
  } satisfies CSSProperties;
};

export const buildDetailTableStyle = (
  widths: ExplorerDetailColumnWidths,
  columnOrder: readonly ExplorerDetailColumnId[] = DETAIL_DEFAULT_COLUMN_ORDER,
): CSSProperties => {
  return {
    minWidth: `${getDetailGridMinWidth(widths, columnOrder)}px`,
    width: "100%",
  } satisfies CSSProperties;
};
