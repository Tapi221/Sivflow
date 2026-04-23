import type { BlobUrl } from "@/types/core/branded";
import { useAuthSession } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type {
  PdfPageLayoutMode,
  PdfSidePanelTab,
  PdfViewerState,
} from "@/types";
import { DEV_MODE, isLocalHost } from "@/utils/envGuards";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PdfOverlayToolbar } from "./PdfOverlayToolbar";
import type { PdfViewerHandle } from "./PdfViewer";
import { PdfViewer } from "./PdfViewer";
import { usePdfContainerWidth } from "./hooks/usePdfContainerWidth";
import { usePdfSourceResolver } from "./hooks/usePdfSourceResolver";
import { defaultPdfViewerOptions } from "./defaultPdfViewerOptions";
import { usePdfViewerPersistence } from "./hooks/usePdfViewerPersistence";
import {
  FIT_MAX_SCALE,
  FIT_MIN_SCALE,
  FIT_PADDING_X,
  clampScale,
  getViewerStateFromSession,
} from "./pdfViewerStateStorage";
import { usePdfDocument } from "./hooks/usePdfDocument";

interface PdfPaneDoc {
  id: string;
  name?: string;
  title?: string;
  remoteUrl?: string | null;
  blobUrl?: BlobUrl | null;
  localUrl?: BlobUrl | null;
  localFileId?: string | null;
  downloadUrl?: string | null;
  uploadStatus?: "pending" | "queued" | "uploading" | "ready" | "failed" | null;
  updatedAt?: unknown;
  mimeType?: string;
  viewerState?: PdfViewerState | null;
}

interface PdfPaneProps {
  doc: PdfPaneDoc;
  className?: string;
  viewerOptions?: {
    enableXfa?: boolean;
    useSystemFonts?: boolean;
    cMapUrl?: string;
    standardFontDataUrl?: string;
    opaqueCanvas?: boolean;
  };
  onDocumentUpdate?: (updates: Partial<PdfPaneDoc>) => Promise<void>;
}

const PDF_OVERLAY_ZOOM_STEP_PERCENT = 1;
const PDF_DOUBLE_PAGE_GAP = 16;
const PDF_ZOOM_UI_MIN_PERCENT = 0;
const PDF_ZOOM_UI_MAX_PERCENT = 100;
const PDF_ZOOM_UI_RANGE_PERCENT = PDF_ZOOM_UI_MAX_PERCENT - PDF_ZOOM_UI_MIN_PERCENT;
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

const readInitialViewerState = (
  docId: string,
  viewerState?: PdfViewerState | null,
) => {
  return getViewerStateFromSession(docId) ?? viewerState ?? null;
};

export const PdfPane = ({
  doc,
  className,
  viewerOptions,
  onDocumentUpdate,
}: PdfPaneProps) => {
  const { currentUser } = useAuthSession();
  const viewerRef = useRef<PdfViewerHandle>(null);
  const previousPageLayoutModeRef = useRef<PdfPageLayoutMode | null>(null);

  const initialViewerState = useMemo(
    () => readInitialViewerState(doc.id, doc.viewerState),
    [doc.id, doc.viewerState],
  );

  const [basePageWidth, setBasePageWidth] = useState<number | null>(null);
  // 旧サイドパネルの viewer state は次の白パネル実装まで保持する
  // UI では使わないが persistence は壊さない
  const [bookmarkPages, setBookmarkPages] = useState<number[]>(() => {
    return sanitizeBookmarkPages(initialViewerState?.bookmarkPages);
  });
  const [sidePanelTab, setSidePanelTab] = useState<PdfSidePanelTab>(() => {
    return sanitizeSidePanelTab(initialViewerState?.sidePanelTab);
  });
  const [thumbnailOrder, setThumbnailOrder] = useState<number[]>(() => {
    return Array.isArray(initialViewerState?.thumbnailOrder)
      ? initialViewerState.thumbnailOrder.filter(
          (pageNumber): pageNumber is number => typeof pageNumber === "number",
        )
      : [];
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
      ? (updates) => onDocumentUpdate(updates)
      : undefined,
  });

  const {
    source,
    sourceMeta,
    sourceUnavailable,
    isLocalOnly,
    localDataStatus,
    handleSourceLoadError,
  } = usePdfSourceResolver(doc, currentUser?.uid);

  const handleFirstPageSize = useCallback(
    (size: { width: number; height: number } | null) => {
      const nextWidth = size?.width ?? null;
      setBasePageWidth((previousWidth) =>
        previousWidth === nextWidth ? previousWidth : nextWidth,
      );
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
  const zoomPercent = useMemo(() => scaleToZoomUiPercent(scale), [scale]);

  const pageStep = pageLayoutMode === "double" ? 2 : 1;
  const alignedCurrentPage = useMemo(
    () => normalizePageForLayout(currentPage, pageLayoutMode),
    [currentPage, pageLayoutMode],
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
    const restoredViewerState = readInitialViewerState(doc.id, doc.viewerState);

    setBookmarkPages(sanitizeBookmarkPages(restoredViewerState?.bookmarkPages));
    setSidePanelTab(sanitizeSidePanelTab(restoredViewerState?.sidePanelTab));
    setThumbnailOrder(
      Array.isArray(restoredViewerState?.thumbnailOrder)
        ? restoredViewerState.thumbnailOrder.filter(
            (pageNumber): pageNumber is number =>
              typeof pageNumber === "number",
          )
        : [],
    );
  }, [doc.id, doc.viewerState]);

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

  const handlePrev = useCallback(() => {
    const nextPage = Math.max(1, alignedCurrentPage - pageStep);
    viewerRef.current?.scrollToPage(nextPage);
  }, [alignedCurrentPage, pageStep]);

  const handleNext = useCallback(() => {
    const nextPage = Math.min(
      numPages || alignedCurrentPage,
      alignedCurrentPage + pageStep,
    );
    viewerRef.current?.scrollToPage(nextPage);
  }, [alignedCurrentPage, numPages, pageStep]);

  const handleCommitPage = useCallback(
    (nextPage: number) => {
      if (!Number.isFinite(nextPage) || numPages <= 0) {
        return;
      }

      const normalizedPage = Math.min(
        numPages,
        Math.max(1, Math.trunc(nextPage)),
      );
      const targetPage = normalizePageForLayout(normalizedPage, pageLayoutMode);

      viewerRef.current?.scrollToPage(targetPage);
    },
    [numPages, pageLayoutMode],
  );

  useEffect(() => {
    if (!DEV_MODE) {
      return;
    }

    if (!isLocalHost(window.location.hostname)) {
      return;
    }

    const debugWindow = window as Window & {
      __logPdfScrollDiagnostics?: () => void;
      __getPdfScrollDiagnostics?: () => ReturnType<
        PdfViewerHandle["getScrollDiagnostics"]
      >;
    };

    debugWindow.__logPdfScrollDiagnostics = () => {
      viewerRef.current?.logScrollDiagnostics();
    };
    debugWindow.__getPdfScrollDiagnostics = () => {
      return viewerRef.current?.getScrollDiagnostics() ?? null;
    };

    return () => {
      delete debugWindow.__logPdfScrollDiagnostics;
      delete debugWindow.__getPdfScrollDiagnostics;
    };
  }, []);

  const shouldRenderOverlayToolbar = !sourceUnavailable && numPages > 0;
  const canGoToPrevPage = alignedCurrentPage > 1;
  const canGoToNextPage = alignedCurrentPage + pageStep <= numPages;

  return (
    <div className={cn("flex h-full min-h-0 min-w-0 flex-col", className)}>
      <div className="relative flex-1 min-h-0 min-w-0 w-full overflow-hidden bg-transparent">
        {sourceUnavailable ? (
          <div className="p-4 text-sm text-slate-500">
            {localDataStatus === "loading" && "ローカルPDFを復元中..."}
            {localDataStatus === "failed" &&
              "ローカルファイルが見つかりません。再アップロードしてください。"}
            {localDataStatus === "idle" && "PDFソースがありません。"}
          </div>
        ) : (
          <div
            ref={containerRef}
            className="relative flex h-full min-h-0 min-w-0 w-full overflow-hidden bg-transparent"
          >
            <PdfViewer
              ref={viewerRef}
              documentController={documentController}
              navigationIdentity={doc.id}
              scale={scale}
              minScale={FIT_MIN_SCALE}
              maxScale={FIT_MAX_SCALE}
              opaqueCanvas={resolvedViewerOptions.opaqueCanvas ?? false}
              pageLayoutMode={pageLayoutMode}
              spreadGap={PDF_DOUBLE_PAGE_GAP}
              onScaleChange={handleViewerScaleChange}
              onPageChange={setCurrentPage}
              className="h-full w-full"
            />

            {shouldRenderOverlayToolbar ? (
              <div
                className="pointer-events-none absolute z-20 flex items-end gap-2"
                style={{
                  right: "max(1rem, env(safe-area-inset-right))",
                  bottom:
                    "max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))",
                }}
              >
                <div className="pointer-events-auto">
                  <PdfOverlayToolbar
                    currentPage={alignedCurrentPage}
                    numPages={numPages}
                    zoomPercent={zoomPercent}
                    minZoomPercent={PDF_ZOOM_UI_MIN_PERCENT}
                    maxZoomPercent={PDF_ZOOM_UI_MAX_PERCENT}
                    fitMode={fitMode}
                    pageLayoutMode={pageLayoutMode}
                    zoomStepPercent={PDF_OVERLAY_ZOOM_STEP_PERCENT}
                    onCommitPage={handleCommitPage}
                    onPrevPage={handlePrev}
                    onNextPage={handleNext}
                    onFitWidth={handleFitWidth}
                    onZoomPercentChange={handleZoomPercentChange}
                    onPageLayoutModeChange={handlePageLayoutModeChange}
                    canGoToPrevPage={canGoToPrevPage}
                    canGoToNextPage={canGoToNextPage}
                  />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
