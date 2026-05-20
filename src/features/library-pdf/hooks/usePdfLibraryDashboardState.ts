import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ColumnBase<TColumnId extends string> = {
  id: TColumnId;
  label: string;
  width: number;
  minWidth: number;
  maxWidth?: number;
  resizable: boolean;
  align?: "left" | "center" | "right";
};

type SelectedColumnOverlay = {
  left: number;
  width: number;
} | null;

type UsePdfLibraryDashboardStateParams<
  TRow extends { id: string },
  TColumnId extends string,
  TColumn extends ColumnBase<TColumnId>,
> = {
  rows: TRow[];
  defaultColumns: TColumn[];
  columnStorageKey: string;
  pageSize: number;
  columnGapPx?: number;
};

const clampColumnWidth = (
  width: number,
  minWidth: number,
  maxWidth?: number,
): number => {
  if (!Number.isFinite(width)) {
    return minWidth;
  }

  if (typeof maxWidth === "number") {
    return Math.min(Math.max(width, minWidth), maxWidth);
  }

  return Math.max(width, minWidth);
};

const loadStoredColumns = <
  TColumnId extends string,
  TColumn extends ColumnBase<TColumnId>,
>(
  defaultColumns: TColumn[],
  columnStorageKey: string,
): TColumn[] => {
  if (typeof window === "undefined") {
    return defaultColumns;
  }

  try {
    const raw = window.localStorage.getItem(columnStorageKey);

    if (!raw) {
      return defaultColumns;
    }

    const parsed = JSON.parse(raw) as Partial<Record<TColumnId, number>>;

    return defaultColumns.map((column) => {
      const storedWidth = parsed[column.id];

      if (typeof storedWidth !== "number") {
        return column;
      }

      return {
        ...column,
        width: clampColumnWidth(storedWidth, column.minWidth, column.maxWidth),
      };
    });
  } catch {
    return defaultColumns;
  }
};

export const usePdfLibraryDashboardState = <
  TRow extends { id: string },
  TColumnId extends string,
  TColumn extends ColumnBase<TColumnId>,
>({
  rows,
  defaultColumns,
  columnStorageKey,
  pageSize,
  columnGapPx = 16,
}: UsePdfLibraryDashboardStateParams<TRow, TColumnId, TColumn>) => {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null,
  );
  const [selectedColumnId, setSelectedColumnId] = useState<TColumnId | null>(
    null,
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [columns, setColumns] = useState<TColumn[]>(() =>
    loadStoredColumns(defaultColumns, columnStorageKey),
  );
  const [isColumnResizing, setIsColumnResizing] = useState(false);
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const widthMap = Object.fromEntries(
      columns.map((column) => [column.id, column.width]),
    );

    window.localStorage.setItem(columnStorageKey, JSON.stringify(widthMap));
  }, [columnStorageKey, columns]);

  useEffect(() => {
    return () => {
      resizeCleanupRef.current?.();
      resizeCleanupRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isColumnResizing) {
      return;
    }

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [isColumnResizing]);

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedDocumentId(null);
      setPageIndex(0);
      return;
    }

    setSelectedDocumentId((currentValue) => {
      if (currentValue && rows.some((row) => row.id === currentValue)) {
        return currentValue;
      }

      return rows[0]?.id ?? null;
    });
  }, [rows]);

  const totalPageCount = Math.max(1, Math.ceil(rows.length / pageSize));

  useEffect(() => {
    setPageIndex((currentValue) =>
      Math.max(0, Math.min(currentValue, totalPageCount - 1)),
    );
  }, [totalPageCount]);

  useEffect(() => {
    if (!selectedDocumentId) {
      return;
    }

    const selectedIndex = rows.findIndex(
      (row) => row.id === selectedDocumentId,
    );

    if (selectedIndex === -1) {
      return;
    }

    const nextPageIndex = Math.floor(selectedIndex / pageSize);
    setPageIndex((currentValue) =>
      currentValue === nextPageIndex ? currentValue : nextPageIndex,
    );
  }, [pageSize, rows, selectedDocumentId]);

  const selectedRow = useMemo(() => {
    if (!selectedDocumentId) {
      return null;
    }

    return rows.find((row) => row.id === selectedDocumentId) ?? null;
  }, [rows, selectedDocumentId]);

  const selectedColumnOverlay = useMemo<SelectedColumnOverlay>(() => {
    if (!selectedColumnId) {
      return null;
    }

    const selectedIndex = columns.findIndex(
      (column) => column.id === selectedColumnId,
    );

    if (selectedIndex === -1) {
      return null;
    }

    const left =
      columns
        .slice(0, selectedIndex)
        .reduce((sum, column) => sum + column.width, 0) +
      selectedIndex * columnGapPx;

    const beforeGap = selectedIndex === 0 ? 0 : columnGapPx / 2;
    const afterGap = selectedIndex === columns.length - 1 ? 0 : columnGapPx / 2;

    return {
      left: left - beforeGap,
      width: columns[selectedIndex].width + beforeGap + afterGap,
    };
  }, [columnGapPx, columns, selectedColumnId]);

  const handleColumnResizeReset = (columnId: TColumnId) => {
    setColumns((currentColumns) =>
      currentColumns.map((column) => {
        if (column.id !== columnId) {
          return column;
        }

        const defaultColumn = defaultColumns.find(
          (candidate) => candidate.id === columnId,
        );

        if (!defaultColumn) {
          return column;
        }

        return {
          ...column,
          width: defaultColumn.width,
        };
      }),
    );
  };

  const handleColumnResizeStart = (
    event: ReactPointerEvent<HTMLDivElement>,
    columnId: TColumnId,
  ) => {
    const targetColumn = columns.find((column) => column.id === columnId);

    if (!targetColumn || !targetColumn.resizable) {
      return;
    }

    resizeCleanupRef.current?.();

    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = targetColumn.width;
    setIsColumnResizing(true);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;

      setColumns((currentColumns) =>
        currentColumns.map((column) => {
          if (column.id !== columnId) {
            return column;
          }

          return {
            ...column,
            width: clampColumnWidth(
              startWidth + deltaX,
              column.minWidth,
              column.maxWidth,
            ),
          };
        }),
      );
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      setIsColumnResizing(false);
      resizeCleanupRef.current = null;
    };

    const handlePointerUp = () => {
      cleanup();
    };

    resizeCleanupRef.current = cleanup;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  };

  return {
    columns,
    pageIndex,
    selectedColumnId,
    selectedColumnOverlay,
    selectedDocumentId,
    selectedRow,
    setPageIndex,
    setSelectedColumnId,
    setSelectedDocumentId,
    totalPageCount,
    handleColumnResizeReset,
    handleColumnResizeStart,
  };
};
