import { useAuthSession } from "@/contexts/AuthContext";
import type {
  DocumentItem,
  PdfPageLayoutMode,
  PdfSidePanelTab,
  PdfViewerState,
} from "@/types";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { arrayMove } from "@dnd-kit/sortable";

import type { PdfViewerHandle } from "@/components/pdf/PdfViewer";
import { defaultPdfViewerOptions } from "@/components/pdf/defaultPdfViewerOptions";
import { usePdfContainerWidth } from "@/components/pdf/hooks/usePdfContainerWidth";
import { usePdfDocument } from "@/components/pdf/hooks/usePdfDocument";
import { usePdfSourceResolver } from "@/components/pdf/hooks/usePdfSourceResolver";
import { usePdfViewerPersistence } from "@/components/pdf/hooks/usePdfViewerPersistence";
import {
  FIT_MAX_SCALE,
  FIT_MIN_SCALE,
  FIT_PADDING_X,
  clampScale,
  getViewerStateFromSession,
} from "@/components/pdf/pdfViewerStateStorage";

const PDF_OVERLAY_ZOOM_STEP_PERCENT = 1;
const PDF_DOUBLE_PAGE_GAP = 16;
const PDF_ZOOM_UI_MIN_PERCENT = 0;
const PDF_ZOOM_UI_MAX_PERCENT = 100;
const PDF_ZOOM_UI_RANGE_PERCENT =
  PDF_ZOOM_UI_MAX_PERCENT - PDF_ZOOM_UI_MIN_PERCENT;
const PDF_SCALE_RANGE = FIT_MAX_SCALE - FIT_MIN_SCALE;

const normalizePageForLayout = (
  page: number,
  pageLayoutMode: PdfPageLayoutMode,
) => {
  if (pageLayoutMode !== "double") {
    return Math.max(1, Math.trunc(page));
  }

  const normalizedPage = Math.max(1, Math.trunc(page));
  return normalizedPage - ((normalizedPage - 1) % 2);
};

const clampZoomUiPercent = (value: number) => {
  if (!Number.isFinite(value)) {
    return PDF_ZOOM_UI_MIN_PERCENT;
  }

  return Math.min(
    PDF_ZOOM_UI_MAX_PERCENT,
    Math.max(PDF_ZOOM_UI_MIN_PERCENT, value),
  );
};

const scaleToZoomUiPercent = (value: number) => {
  const clampedScale = clampScale(value);

  if (PDF_SCALE_RANGE <= 0 || PDF_ZOOM_UI_RANGE_PERCENT <= 0) {
    return PDF_ZOOM_UI_MAX_PERCENT;
  }

  const ratio = (clampedScale - FIT_MIN_SCALE) / PDF_SCALE_RANGE;
  const normalizedRatio = Math.min(1, Math.max(0, ratio));

  return Number(
    (
      PDF_ZOOM_UI_MIN_PERCENT +
      normalizedRatio * PDF_ZOOM_UI_RANGE_PERCENT
    ).toFixed(0),
  );
};

const zoomUiPercentToScale = (value: number) => {
  const clampedUiPercent = clampZoomUiPercent(value);

  if (PDF_SCALE_RANGE <= 0 || PDF_ZOOM_UI_RANGE_PERCENT <= 0) {
    return clampScale(FIT_MIN_SCALE);
  }

  const ratio =
    (clampedUiPercent - PDF_ZOOM_UI_MIN_PERCENT) / PDF_ZOOM_UI_RANGE_PERCENT;

  return clampScale(
    Number((FIT_MIN_SCALE + ratio * PDF_SCALE_RANGE).toFixed(3)),
  );
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

const normalizeThumbnailOrder = (
  value: unknown,
  numPages: number,
): number[] => {
  const defaultOrder = Array.from(
    { length: numPages },
    (_, index) => index + 1,
  );

  if (numPages <= 0) {
    return [];
  }

  if (!Array.isArray(value) || value.length === 0) {
    return defaultOrder;
  }

  const seen = new Set<number>();
  const nextOrder: number[] = [];

  value.forEach((pageNumber) => {
    if (typeof pageNumber !== "number" || !Number.isFinite(pageNumber)) {
      return;
    }

    const normalizedPageNumber = Math.max(1, Math.trunc(pageNumber));
    if (normalizedPageNumber > numPages || seen.has(normalizedPageNumber)) {
      return;
    }

    seen.add(normalizedPageNumber);
    nextOrder.push(normalizedPageNumber);
  });

  defaultOrder.forEach((pageNumber) => {
    if (!seen.has(pageNumber)) {
      nextOrder.push(pageNumber);
    }
  });

  return nextOrder;
};

const areNumberArraysEqual = (left: number[], right: number[]) => {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
};

const readInitialViewerState = (
  docId: string,
  viewerState?: PdfViewerState | null,
) => {
  return getViewerStateFromSession(docId) ?? viewerState ?? null;
};

export interface PdfWorkspaceViewerOptions {
  enableXfa?: boolean;
  useSystemFonts?: boolean;
  cMapUrl?: string;
  standardFontDataUrl?: string;
  opaqueCanvas?: boolean;
}

export interface PdfWorkspaceContextValue {
  doc: DocumentItem;
  containerRef: RefObject<HTMLDivElement | null>;
  containerWidth: number;
  documentController: ReturnType<typeof usePdfDocument>;
  viewerRef: RefObject<PdfViewerHandle | null>;
  currentPage: number;
  alignedCurrentPage: number;
  scale: number;
  fitMode: "width" | "manual";
  pageLayoutMode: PdfPageLayoutMode;
  bookmarkPages: number[];
  sidePanelTab: PdfSidePanelTab;
  thumbnailOrder: number[];
  normalizedThumbnailOrder: number[];
  zoomPercent: number;
  pageStep: number;
  canGoToPrevPage: boolean;
  canGoToNextPage: boolean;
  sourceUnavailable: boolean;
  localDataStatus: "idle" | "loading" | "ready" | "failed";
  firstPageSize: { width: number; height: number } | null;
  resolvedViewerOptions: typeof defaultPdfViewerOptions;
  setCurrentPage: (pageNumber: number) => void;
  setBookmarkPages: (pageNumbers: number[]) => void;
  setSidePanelTab: (tab: PdfSidePanelTab) => void;
  setThumbnailOrder: (pageNumbers: number[]) => void;
  reorderThumbnailOrder: (
    activePageNumber: number,
    overPageNumber: number,
  ) => void;
  scrollToPage: (pageNumber: number) => void;
  handleFitWidth: () => void;
  handleViewerScaleChange: (nextScale: number) => void;
  handlePageLayoutModeChange: (nextPageLayoutMode: PdfPageLayoutMode) => void;
  handleZoomPercentChange: (nextPercent: number) => void;
  handlePrevPage: () => void;
  handleNextPage: () => void;
  handleCommitPage: (nextPage: number) => void;
}

export const PdfWorkspaceContext =
  createContext<PdfWorkspaceContextValue | null>(null);

interface PdfWorkspaceProviderProps {
  doc: DocumentItem;
  viewerOptions?: PdfWorkspaceViewerOptions;
  onDocumentUpdate?: (updates: Partial<DocumentItem>) => Promise<void>;
  children: ReactNode;
}

export const PdfWorkspaceProvider = ({
  doc,
  viewerOptions,
  onDocumentUpdate,
  children,
}: PdfWorkspaceProviderProps) => {
  const { currentUser } = useAuthSession();
  const viewerRef = useRef<PdfViewerHandle>(null);
  const previousPageLayoutModeRef = useRef<PdfPageLayoutMode | null>(null);

  const initialViewerState = useMemo(
    () => readInitialViewerState(doc.id, doc.viewerState),
    [doc.id, doc.viewerState],
  );

  const [basePageWidth, setBasePageWidth] = useState<number | null>(null);
  const [firstPageSize, setFirstPageSize] = useState<{
    width: number;
    height: number;
  } | null>(() => null);
  const [bookmarkPages, setBookmarkPagesState] = useState<number[]>(() => {
    return sanitizeBookmarkPages(initialViewerState?.bookmarkPages);
  });
  const [sidePanelTab, setSidePanelTabState] = useState<PdfSidePanelTab>(() => {
    return sanitizeSidePanelTab(initialViewerState?.sidePanelTab);
  });
  const [thumbnailOrder, setThumbnailOrderState] = useState<number[]>(() => {
    return sanitizeThumbnailOrder(initialViewerState?.thumbnailOrder);
  });

  const { containerRef, containerWidth } = usePdfContainerWidth();

  const getFitScale = useCallback(
    (nextPageLayoutMode: PdfPageLayoutMode) => {
      if (!containerWidth || !basePageWidth) {
        return 1;
      }

      const pagesPerRow = nextPageLayoutMode === "double" ? 2 : 1;
      const horizontalGap =
        nextPageLayoutMode === "double" ? PDF_DOUBLE_PAGE_GAP : 0;
      const usableWidth = Math.max(
        1,
        containerWidth - FIT_PADDING_X - horizontalGap,
      );

      return clampScale(
        Number((usableWidth / (basePageWidth * pagesPerRow)).toFixed(3)),
      );
    },
    [basePageWidth, containerWidth],
  );

  const resolvedViewerOptions = useMemo(() => {
    return {
      ...defaultPdfViewerOptions,
      ...viewerOptions,
    };
  }, [viewerOptions]);

  const {
    currentPage,
    scale,
    fitMode,
    pageLayoutMode,
    setCurrentPage,
    handleFitWidth,
    handleViewerScaleChange,
    handlePageLayoutModeChange,
  } = usePdfViewerPersistence({
    docId: doc.id,
    viewerState: doc.viewerState,
    bookmarkPages,
    sidePanelTab,
    thumbnailOrder,
    getFitScale,
    onDocumentUpdate: onDocumentUpdate
      ? async (updates) => onDocumentUpdate(updates as Partial<DocumentItem>)
      : undefined,
  });

  const {
    source,
    sourceMeta,
    sourceUnavailable,
    localDataStatus,
    handleSourceLoadError,
  } = usePdfSourceResolver(doc, currentUser?.uid);

  const handleFirstPageSize = useCallback(
    (size: { width: number; height: number } | null) => {
      const nextWidth = size?.width ?? null;
      setBasePageWidth((previousWidth) =>
        previousWidth === nextWidth ? previousWidth : nextWidth,
      );
      setFirstPageSize((previousSize) => {
        if (!size) {
          return previousSize === null ? previousSize : null;
        }

        if (
          previousSize?.width === size.width &&
          previousSize.height === size.height
        ) {
          return previousSize;
        }

        return size;
      });
    },
    [],
  );

  const documentController = usePdfDocument({
    docId: doc.id,
    source,
    viewerOptions: resolvedViewerOptions,
    sourceMeta,
    onNumPages: () => {
      // no-op
    },
    onFirstPageSize: handleFirstPageSize,
    onSourceLoadError: handleSourceLoadError,
  });

  const numPages = documentController.numPages;
  const normalizedThumbnailOrder = useMemo(
    () => normalizeThumbnailOrder(thumbnailOrder, numPages),
    [numPages, thumbnailOrder],
  );
  const zoomPercent = useMemo(() => scaleToZoomUiPercent(scale), [scale]);

  const pageStep = pageLayoutMode === "double" ? 2 : 1;
  const alignedCurrentPage = useMemo(
    () => normalizePageForLayout(currentPage, pageLayoutMode),
    [currentPage, pageLayoutMode],
  );

  const setBookmarkPages = useCallback((pageNumbers: number[]) => {
    setBookmarkPagesState(sanitizeBookmarkPages(pageNumbers));
  }, []);

  const setSidePanelTab = useCallback((tab: PdfSidePanelTab) => {
    setSidePanelTabState(sanitizeSidePanelTab(tab));
  }, []);

  const setThumbnailOrder = useCallback(
    (pageNumbers: number[]) => {
      setThumbnailOrderState((previousOrder) => {
        const nextOrder = normalizeThumbnailOrder(pageNumbers, numPages);
        return areNumberArraysEqual(previousOrder, nextOrder)
          ? previousOrder
          : nextOrder;
      });
    },
    [numPages],
  );

  const reorderThumbnailOrder = useCallback(
    (activePageNumber: number, overPageNumber: number) => {
      setThumbnailOrderState((previousOrder) => {
        const baseOrder = normalizeThumbnailOrder(previousOrder, numPages);
        const activeIndex = baseOrder.indexOf(activePageNumber);
        const overIndex = baseOrder.indexOf(overPageNumber);

        if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) {
          return previousOrder;
        }

        const nextOrder = arrayMove(baseOrder, activeIndex, overIndex);
        return areNumberArraysEqual(previousOrder, nextOrder)
          ? previousOrder
          : nextOrder;
      });
    },
    [numPages],
  );

  const scrollToPage = useCallback(
    (pageNumber: number) => {
      if (!numPages) {
        return;
      }

      const normalizedPage = Math.min(
        numPages,
        Math.max(1, Math.trunc(pageNumber)),
      );
      const targetPage = normalizePageForLayout(normalizedPage, pageLayoutMode);

      setCurrentPage(targetPage);
      viewerRef.current?.scrollToPage(targetPage);
    },
    [numPages, pageLayoutMode, setCurrentPage],
  );

  const handleZoomPercentChange = useCallback(
    (nextPercent: number) => {
      if (!Number.isFinite(nextPercent)) {
        return;
      }

      handleViewerScaleChange(zoomUiPercentToScale(nextPercent));
    },
    [handleViewerScaleChange],
  );

  useEffect(() => {
    if (!numPages) {
      return;
    }

    setThumbnailOrderState((previousOrder) => {
      const nextOrder = normalizeThumbnailOrder(previousOrder, numPages);
      return areNumberArraysEqual(previousOrder, nextOrder)
        ? previousOrder
        : nextOrder;
    });
  }, [numPages]);

  useEffect(() => {
    if (!numPages) {
      return;
    }

    if (currentPage > numPages) {
      queueMicrotask(() => setCurrentPage(numPages));
    }
  }, [currentPage, numPages, setCurrentPage]);

  useEffect(() => {
    if (previousPageLayoutModeRef.current === pageLayoutMode) {
      return;
    }

    previousPageLayoutModeRef.current = pageLayoutMode;

    const normalizedPage = normalizePageForLayout(currentPage, pageLayoutMode);

    if (normalizedPage !== currentPage) {
      setCurrentPage(normalizedPage);
    }

    const rafId = window.requestAnimationFrame(() => {
      viewerRef.current?.scrollToPage(normalizedPage);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [currentPage, pageLayoutMode, setCurrentPage]);

  const handlePrevPage = useCallback(() => {
    const nextPage = Math.max(1, alignedCurrentPage - pageStep);
    scrollToPage(nextPage);
  }, [alignedCurrentPage, pageStep, scrollToPage]);

  const handleNextPage = useCallback(() => {
    const nextPage = Math.min(
      numPages || alignedCurrentPage,
      alignedCurrentPage + pageStep,
    );
    scrollToPage(nextPage);
  }, [alignedCurrentPage, numPages, pageStep, scrollToPage]);

  const handleCommitPage = useCallback(
    (nextPage: number) => {
      if (!Number.isFinite(nextPage) || numPages <= 0) {
        return;
      }

      scrollToPage(nextPage);
    },
    [numPages, scrollToPage],
  );

  const canGoToPrevPage = alignedCurrentPage > 1;
  const canGoToNextPage = alignedCurrentPage + pageStep <= numPages;

  const contextValue = useMemo(() => {
    return {
      doc,
      containerRef,
      containerWidth,
      documentController,
      viewerRef,
      currentPage,
      alignedCurrentPage,
      scale,
      fitMode,
      pageLayoutMode,
      bookmarkPages,
      sidePanelTab,
      thumbnailOrder,
      normalizedThumbnailOrder,
      zoomPercent,
      pageStep,
      canGoToPrevPage,
      canGoToNextPage,
      sourceUnavailable,
      localDataStatus,
      firstPageSize,
      resolvedViewerOptions,
      setCurrentPage,
      setBookmarkPages,
      setSidePanelTab,
      setThumbnailOrder,
      reorderThumbnailOrder,
      scrollToPage,
      handleFitWidth,
      handleViewerScaleChange,
      handlePageLayoutModeChange,
      handleZoomPercentChange,
      handlePrevPage,
      handleNextPage,
      handleCommitPage,
    } satisfies PdfWorkspaceContextValue;
  }, [
    alignedCurrentPage,
    bookmarkPages,
    canGoToNextPage,
    canGoToPrevPage,
    containerRef,
    containerWidth,
    currentPage,
    doc,
    documentController,
    firstPageSize,
    fitMode,
    handleCommitPage,
    handleFitWidth,
    handleNextPage,
    handlePageLayoutModeChange,
    handlePrevPage,
    handleViewerScaleChange,
    handleZoomPercentChange,
    localDataStatus,
    normalizedThumbnailOrder,
    pageLayoutMode,
    pageStep,
    reorderThumbnailOrder,
    resolvedViewerOptions,
    scale,
    scrollToPage,
    setBookmarkPages,
    setCurrentPage,
    setSidePanelTab,
    setThumbnailOrder,
    sidePanelTab,
    sourceUnavailable,
    thumbnailOrder,
    viewerRef,
    zoomPercent,
  ]);

  return (
    <PdfWorkspaceContext.Provider value={contextValue}>
      {children}
    </PdfWorkspaceContext.Provider>
  );
};
