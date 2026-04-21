/**
 * PDF ビューアの表示状態（currentPage / scale / fitMode / pageLayoutMode）と
 * サイドパネル状態（tab / thumbnailOrder / bookmarkPages）を管理するフック。
 */
import {
  clampScale,
  EPSILON,
  getViewerStateFromSession,
  saveViewerStateToSession,
  VIEWER_STATE_DEBOUNCE_MS,
  ZOOM_STEP,
} from "@/components/pdf/pdfViewerStateStorage";
import type { PdfPageLayoutMode, PdfSidePanelTab, PdfViewerState } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";

interface UsePdfViewerPersistenceOptions {
  docId: string;
  viewerState?: PdfViewerState | null;
  bookmarkPages?: number[];
  sidePanelTab?: PdfSidePanelTab;
  thumbnailOrder?: number[];
  getFitScale: (pageLayoutMode: PdfPageLayoutMode) => number;
  onDocumentUpdate?: (updates: {
    viewerState: PdfViewerState;
  }) => Promise<void>;
}

const sanitizeCurrentPage = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.trunc(value));
};

const sanitizeScale = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  return clampScale(value);
};

const sanitizeFitScale = (value: number) => {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return clampScale(value);
};

const sanitizeBookmarkPages = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((pageNumber): pageNumber is number => {
          return typeof pageNumber === "number" && Number.isFinite(pageNumber);
        })
        .map((pageNumber) => Math.max(1, Math.trunc(pageNumber))),
    ),
  ).sort((left, right) => left - right);
};

const sanitizeSidePanelTab = (value: unknown): PdfSidePanelTab => {
  return value === "markdown" || value === "outline" || value === "thumbnails"
    ? value
    : "thumbnails";
};

const sanitizeThumbnailOrder = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenPageNumbers = new Set<number>();
  const nextThumbnailOrder: number[] = [];

  value.forEach((pageNumber) => {
    if (typeof pageNumber !== "number" || !Number.isFinite(pageNumber)) {
      return;
    }

    const normalizedPageNumber = Math.max(1, Math.trunc(pageNumber));
    if (seenPageNumbers.has(normalizedPageNumber)) {
      return;
    }

    seenPageNumbers.add(normalizedPageNumber);
    nextThumbnailOrder.push(normalizedPageNumber);
  });

  return nextThumbnailOrder;
};

export const usePdfViewerPersistence = ({
  docId,
  viewerState,
  bookmarkPages,
  sidePanelTab,
  thumbnailOrder,
  getFitScale,
  onDocumentUpdate,
}: UsePdfViewerPersistenceOptions) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [fitMode, setFitMode] = useState<"width" | "manual">("width");
  const [scale, setScale] = useState(1.0);
  const [pageLayoutMode, setPageLayoutMode] =
    useState<PdfPageLayoutMode>("single");

  const isHydratingRef = useRef(false);
  const initializedRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDocIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastDocIdRef.current !== docId && lastDocIdRef.current !== null) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    }

    lastDocIdRef.current = docId;
    isHydratingRef.current = false;
    initializedRef.current = false;
  }, [docId]);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    isHydratingRef.current = true;

    let restoredState: PdfViewerState | null = getViewerStateFromSession(docId);

    if (!restoredState && viewerState) {
      restoredState = viewerState;
    }

    if (restoredState) {
      queueMicrotask(() => {
        setCurrentPage(sanitizeCurrentPage(restoredState?.currentPage));
        setScale(sanitizeScale(restoredState?.scale));
        setFitMode(
          restoredState?.fitMode === "manual" || restoredState?.fitMode === "width"
            ? restoredState.fitMode
            : "width",
        );
        setPageLayoutMode(
          restoredState?.pageLayoutMode === "double" ||
            restoredState?.pageLayoutMode === "single"
            ? restoredState.pageLayoutMode
            : "single",
        );
      });
    }

    Promise.resolve().then(() => {
      isHydratingRef.current = false;
    });
  }, [docId, viewerState]);

  useEffect(() => {
    if (isHydratingRef.current) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const sanitizedBookmarkPages = sanitizeBookmarkPages(bookmarkPages);
      const sanitizedThumbnailOrder = sanitizeThumbnailOrder(thumbnailOrder);
      const sanitizedSidePanelTab = sanitizeSidePanelTab(sidePanelTab);
      const nextViewerState: PdfViewerState = {
        currentPage: sanitizeCurrentPage(currentPage),
        scale: Number(sanitizeScale(scale).toFixed(3)),
        fitMode,
        pageLayoutMode,
        ...(sanitizedBookmarkPages.length > 0
          ? { bookmarkPages: sanitizedBookmarkPages }
          : {}),
        ...(sanitizedThumbnailOrder.length > 0
          ? { thumbnailOrder: sanitizedThumbnailOrder }
          : {}),
        sidePanelTab: sanitizedSidePanelTab,
      };

      saveViewerStateToSession(docId, nextViewerState);

      if (onDocumentUpdate) {
        onDocumentUpdate({ viewerState: nextViewerState }).catch((errorValue) => {
          console.warn(
            "[usePdfViewerPersistence] Failed to save viewer state",
            errorValue,
            { docId },
          );
        });
      }

      debounceTimerRef.current = null;
    }, VIEWER_STATE_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [
    bookmarkPages,
    currentPage,
    docId,
    fitMode,
    onDocumentUpdate,
    pageLayoutMode,
    scale,
    sidePanelTab,
    thumbnailOrder,
  ]);

  useEffect(() => {
    if (fitMode !== "width") {
      return;
    }

    const nextFitScale = sanitizeFitScale(getFitScale(pageLayoutMode));
    queueMicrotask(() => {
      setScale((previousScale) => {
        return Math.abs(previousScale - nextFitScale) < EPSILON
          ? previousScale
          : nextFitScale;
      });
    });
  }, [fitMode, getFitScale, pageLayoutMode]);

  const handleZoomOut = useCallback(() => {
    setFitMode("manual");
    setScale((previousScale) => {
      return clampScale(Number((previousScale - ZOOM_STEP).toFixed(2)));
    });
  }, []);

  const handleZoomIn = useCallback(() => {
    setFitMode("manual");
    setScale((previousScale) => {
      return clampScale(Number((previousScale + ZOOM_STEP).toFixed(2)));
    });
  }, []);

  const handleFitWidth = useCallback(() => {
    setFitMode("width");
    setScale(sanitizeFitScale(getFitScale(pageLayoutMode)));
  }, [getFitScale, pageLayoutMode]);

  const handleViewerScaleChange = useCallback((nextScale: number) => {
    if (!Number.isFinite(nextScale)) {
      return;
    }

    const roundedScale = Number(clampScale(nextScale).toFixed(3));
    setFitMode("manual");
    setScale((previousScale) => {
      return Math.abs(previousScale - roundedScale) < EPSILON
        ? previousScale
        : roundedScale;
    });
  }, []);

  const handlePageLayoutModeChange = useCallback(
    (nextPageLayoutMode: PdfPageLayoutMode) => {
      setPageLayoutMode((previousPageLayoutMode) => {
        return previousPageLayoutMode === nextPageLayoutMode
          ? previousPageLayoutMode
          : nextPageLayoutMode;
      });
    },
    [],
  );

  return {
    currentPage,
    scale,
    fitMode,
    pageLayoutMode,
    setCurrentPage,
    setScale,
    setFitMode,
    setPageLayoutMode,
    handleZoomIn,
    handleZoomOut,
    handleFitWidth,
    handleViewerScaleChange,
    handlePageLayoutModeChange,
  };
};
