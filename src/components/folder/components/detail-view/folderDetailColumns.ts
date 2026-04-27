import type { CSSProperties } from "react";
import type { ExplorerDetailColumnId, ExplorerDetailSortState } from "./folderDetailTypes";

const EXPLORER_DETAIL_COLUMN_WIDTHS_STORAGE_KEY =
  "manifolia:folder-detail-view:column-widths";

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

export type ExplorerDetailColumnWidths = Record<ExplorerDetailColumnId, number>;

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

export const writeStoredDetailColumnWidths = (widths: ExplorerDetailColumnWidths) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    EXPLORER_DETAIL_COLUMN_WIDTHS_STORAGE_KEY,
    JSON.stringify(widths),
  );
};

export const buildDetailGridTemplateColumns = (
  widths: ExplorerDetailColumnWidths,
): string => {
  return DETAIL_COLUMN_IDS.map((columnId) => `${widths[columnId]}px`).join(" ");
};

export const getDetailGridMinWidth = (widths: ExplorerDetailColumnWidths): number => {
  return DETAIL_COLUMN_IDS.reduce(
    (total, columnId) => total + widths[columnId],
    0,
  );
};

export const buildDetailGridStyle = (
  widths: ExplorerDetailColumnWidths,
): CSSProperties => {
  return {
    gridTemplateColumns: buildDetailGridTemplateColumns(widths),
  } satisfies CSSProperties;
};

export const buildDetailTableStyle = (
  widths: ExplorerDetailColumnWidths,
): CSSProperties => {
  return {
    minWidth: `${getDetailGridMinWidth(widths)}px`,
  } satisfies CSSProperties;
};
