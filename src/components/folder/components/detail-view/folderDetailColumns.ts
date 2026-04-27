import type { CSSProperties } from "react";
import type {
  ExplorerDetailColumnId,
  ExplorerDetailSortState,
} from "./folderDetailTypes";

const EXPLORER_DETAIL_COLUMN_WIDTHS_STORAGE_KEY =
  "manifolia:folder-detail-view:column-widths";
const EXPLORER_DETAIL_COLUMN_ORDER_STORAGE_KEY =
  "manifolia:folder-detail-view:column-order:v1";

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
  ...DETAIL_COLUMN_IDS,
] satisfies readonly ExplorerDetailColumnId[];

export type ExplorerDetailColumnWidths = Record<ExplorerDetailColumnId, number>;
export type ExplorerDetailColumnOrder = ExplorerDetailColumnId[];

export const DETAIL_DEFAULT_COLUMN_WIDTHS = {
  name: 320,
  tags: 190,
  path: 420,
  updatedAt: 168,
  sync: 132,
  kind: 128,
  size: 112,
} satisfies ExplorerDetailColumnWidths;

export const DETAIL_MIN_COLUMN_WIDTHS = {
  name: 180,
  tags: 120,
  path: 220,
  updatedAt: 132,
  sync: 104,
  kind: 96,
  size: 84,
} satisfies ExplorerDetailColumnWidths;

const DETAIL_MAX_COLUMN_WIDTH_PX = 820;

export const DEFAULT_SORT_STATE: ExplorerDetailSortState = {
  key: "manual",
  direction: "asc",
};

export const isDetailColumnId = (
  value: unknown,
): value is ExplorerDetailColumnId => {
  return (
    typeof value === "string" &&
    (DETAIL_COLUMN_IDS as readonly string[]).includes(value)
  );
};

export const normalizeDetailColumnOrder = (
  value: unknown,
): ExplorerDetailColumnOrder => {
  if (!Array.isArray(value)) return [...DETAIL_DEFAULT_COLUMN_ORDER];

  const next: ExplorerDetailColumnOrder = [];

  value.forEach((entry) => {
    if (!isDetailColumnId(entry)) return;
    if (next.includes(entry)) return;
    next.push(entry);
  });

  DETAIL_DEFAULT_COLUMN_ORDER.forEach((columnId) => {
    if (next.includes(columnId)) return;
    next.push(columnId);
  });

  return next;
};

export const moveDetailColumnToIndex = (
  currentOrder: readonly ExplorerDetailColumnId[],
  activeColumnId: ExplorerDetailColumnId,
  overColumnId: ExplorerDetailColumnId,
): ExplorerDetailColumnOrder => {
  const normalizedOrder = normalizeDetailColumnOrder(currentOrder);
  const activeIndex = normalizedOrder.indexOf(activeColumnId);
  const overIndex = normalizedOrder.indexOf(overColumnId);

  if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) {
    return normalizedOrder;
  }

  const nextOrder = [...normalizedOrder];
  const [activeColumn] = nextOrder.splice(activeIndex, 1);
  nextOrder.splice(overIndex, 0, activeColumn);

  return nextOrder;
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
    JSON.stringify(normalizeDetailColumnWidths(widths)),
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
  return columnOrder.map((columnId) => `${widths[columnId]}px`).join(" ");
};

export const getDetailGridMinWidth = (
  widths: ExplorerDetailColumnWidths,
  columnOrder: readonly ExplorerDetailColumnId[] = DETAIL_DEFAULT_COLUMN_ORDER,
): number => {
  return columnOrder.reduce((total, columnId) => total + widths[columnId], 0);
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
  } satisfies CSSProperties;
};
