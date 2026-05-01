import { useEffect, useState } from "react";
import type { ColumnSizingState } from "@tanstack/react-table";

const COLUMN_STORAGE_KEY = "pdf-library-dashboard:column-widths:v3";

const DEFAULT_COLUMN_SIZING: ColumnSizingState = {
  name: 420,
  tags: 240,
  page: 88,
  lastViewed: 168,
  updatedAt: 168,
  actions: 32,
};

const COLUMN_MIN_SIZES: Record<string, number> = {
  name: 260,
  tags: 160,
  page: 72,
  lastViewed: 140,
  updatedAt: 140,
  actions: 32,
};

const COLUMN_MAX_SIZES: Record<string, number | undefined> = {
  name: undefined,
  tags: undefined,
  page: 140,
  lastViewed: 260,
  updatedAt: 260,
  actions: 32,
};

const clampWidth = (columnId: string, width: number): number => {
  const minWidth = COLUMN_MIN_SIZES[columnId] ?? 48;
  const maxWidth = COLUMN_MAX_SIZES[columnId];

  if (!Number.isFinite(width)) {
    return minWidth;
  }

  if (typeof maxWidth === "number") {
    return Math.min(Math.max(width, minWidth), maxWidth);
  }

  return Math.max(width, minWidth);
};

const sanitizeColumnSizing = (value: unknown): ColumnSizingState => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_COLUMN_SIZING;
  }

  return Object.fromEntries(
    Object.entries(DEFAULT_COLUMN_SIZING).map(([columnId, defaultWidth]) => {
      const candidate = (value as Record<string, unknown>)[columnId];

      if (typeof candidate !== "number") {
        return [columnId, defaultWidth];
      }

      return [columnId, clampWidth(columnId, candidate)];
    }),
  );
};

const loadColumnSizing = (): ColumnSizingState => {
  if (typeof window === "undefined") {
    return DEFAULT_COLUMN_SIZING;
  }

  try {
    const raw = window.localStorage.getItem(COLUMN_STORAGE_KEY);

    if (!raw) {
      return DEFAULT_COLUMN_SIZING;
    }

    return sanitizeColumnSizing(JSON.parse(raw));
  } catch {
    return DEFAULT_COLUMN_SIZING;
  }
};

export const usePdfLibraryColumnSizing = () => {
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() =>
    loadColumnSizing(),
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      COLUMN_STORAGE_KEY,
      JSON.stringify(columnSizing),
    );
  }, [columnSizing]);

  const resetColumnSizing = () => {
    setColumnSizing(DEFAULT_COLUMN_SIZING);
  };

  return {
    columnSizing,
    setColumnSizing,
    resetColumnSizing,
  };
};
