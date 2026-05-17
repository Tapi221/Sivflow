import {
  clampScale,
  getViewerStateFromSession,
  saveViewerStateToSession,
} from "@/features/pdf/pdfViewerStateStorage";

import {
  EPSILON,
  VIEWER_STATE_DEBOUNCE_MS,
  ZOOM_STEP,
} from "@/features/pdf/pdf.constants.desktop";

import type {
  PdfPageLayoutMode,
  PdfSidePanelTab,
  PdfViewerState,
} from "@/types";

import { useCallback, useEffect, useRef, useState } from "react";

interface UsePdfViewerPersistenceOptions {
  docId: string;
  viewerState?: PdfViewerState | null;
  bookmarkPages?: number[];
  sidePanelTab?: PdfSidePanelTab | "markdown";
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
  if (value === "markdown") {
    return "bookmarks";
  }

  return value === "bookmarks" ||
    value === "outline" ||
    value === "ocr" ||
    value === "thumbnails"
    ? value
    : "thumbnails";
};

const sanitizeThumbnailOrder = (value: unknown): number[] => {
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
  );
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
  const lastDocIdRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    let restoredState = getViewerStateFromSession(docId);

    if (!restoredState && viewerState) {
      restoredState = viewerState;
    }

    if (restoredState) {
      queueMicrotask(() => {
        setCurrentPage(sanitizeCurrentPage(restoredState?.currentPage));
      });

      queueMicrotask(() => {
        setScale(sanitizeScale(restoredState?.scale));
      });

      if (
        restoredState.fitMode === "width" ||
        restoredState.fitMode === "manual"
      ) {
        queueMicrotask(() => {
          setFitMode(restoredState.fitMode ?? "width");
        });
      }

      if (
        restoredState.pageLayoutMode === "single" ||
        restoredState.pageLayoutMode === "double"
      ) {
        queueMicrotask(() => {
          setPageLayoutMode(restoredState.pageLayoutMode ?? "single");
        });
      }
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
      const sanitizedSidePanelTab = sanitizeSidePanelTab(sidePanelTab);
      const sanitizedThumbnailOrder = sanitizeThumbnailOrder(thumbnailOrder);

      const newViewerState: PdfViewerState = {
        currentPage: sanitizeCurrentPage(currentPage),
        scale: parseFloat(sanitizeScale(scale).toFixed(3)),
        fitMode,
        pageLayoutMode,
        ...(sanitizedBookmarkPages.length > 0
          ? { bookmarkPages: sanitizedBookmarkPages }
          : {}),
        sidePanelTab: sanitizedSidePanelTab,
        ...(sanitizedThumbnailOrder.length > 0
          ? { thumbnailOrder: sanitizedThumbnailOrder }
          : {}),
      };

      saveViewerStateToSession(docId, newViewerState);

      if (onDocumentUpdate) {
        onDocumentUpdate({ viewerState: newViewerState }).catch(
          (errorValue) => {
            console.warn(
              "[usePdfViewerPersistence] Failed to save viewer state",
              errorValue,
              { docId },
            );
          },
        );
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
      setScale((previousScale) =>
        Math.abs(previousScale - nextFitScale) < EPSILON
          ? previousScale
          : nextFitScale,
      );
    });
  }, [fitMode, getFitScale, pageLayoutMode]);

  const handleZoomOut = useCallback(() => {
    setFitMode("manual");
    setScale((previousScale) =>
      clampScale(parseFloat((previousScale - ZOOM_STEP).toFixed(2))),
    );
  }, []);

  const handleZoomIn = useCallback(() => {
    setFitMode("manual");
    setScale((previousScale) =>
      clampScale(parseFloat((previousScale + ZOOM_STEP).toFixed(2))),
    );
  }, []);

  const handleFitWidth = useCallback(() => {
    setFitMode("width");
    setScale(sanitizeFitScale(getFitScale(pageLayoutMode)));
  }, [getFitScale, pageLayoutMode]);

  const handleViewerScaleChange = useCallback((nextScale: number) => {
    if (!Number.isFinite(nextScale)) {
      return;
    }

    const clamped = clampScale(nextScale);
    const rounded = parseFloat(clamped.toFixed(3));
    setFitMode("manual");
    setScale((previousScale) =>
      Math.abs(previousScale - rounded) < EPSILON ? previousScale : rounded,
    );
  }, []);

  const handlePageLayoutModeChange = useCallback(
    (nextPageLayoutMode: PdfPageLayoutMode) => {
      setPageLayoutMode((previousPageLayoutMode) =>
        previousPageLayoutMode === nextPageLayoutMode
          ? previousPageLayoutMode
          : nextPageLayoutMode,
      );
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
