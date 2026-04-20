import type { BlobUrl } from "@/types/core/branded";
import { useAuthSession } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import platform from "@/platform";
import type { PdfPageLayoutMode, PdfViewerState } from "@/types";
import { DEV_MODE, isLocalHost } from "@/utils/envGuards";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PdfOverlayToolbar } from "./PdfOverlayToolbar";
import { PdfPaneToolbar } from "./PdfPaneToolbar";
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
} from "./pdfViewerStateStorage";

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

const SEARCH_INPUT_DEBOUNCE_MS = 300;
const PDF_OVERLAY_ZOOM_STEP_PERCENT = 1;
const PDF_DOUBLE_PAGE_GAP = 16;

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

export const PdfPane = ({
  doc,
  className,
  viewerOptions,
  onDocumentUpdate,
}: PdfPaneProps) => {
  const { currentUser } = useAuthSession();
  const viewerRef = useRef<PdfViewerHandle>(null);
  const previousPageLayoutModeRef = useRef<PdfPageLayoutMode | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [basePageWidth, setBasePageWidth] = useState<number | null>(null);
  const [searchInputValue, setSearchInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchNavToken, setSearchNavToken] = useState(0);
  const [searchNavDirection, setSearchNavDirection] = useState<"next" | "prev">(
    "next",
  );
  const [totalMatches, setTotalMatches] = useState(0);
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);

  const { containerRef, containerWidth } = usePdfContainerWidth();

  const getFitScale = useCallback(
    (pageLayoutMode: PdfPageLayoutMode) => {
      if (!containerWidth || !basePageWidth) {
        return 1;
      }

      const pagesPerRow = pageLayoutMode === "double" ? 2 : 1;
      const horizontalGap =
        pageLayoutMode === "double" ? PDF_DOUBLE_PAGE_GAP : 0;
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
    effectiveRemoteUrl,
    localSourceBytes,
    handleSourceLoadError,
  } = usePdfSourceResolver(doc, currentUser?.uid);

  const scalePercent = useMemo(() => Number((scale * 100).toFixed(1)), [scale]);

  const pageStep = pageLayoutMode === "double" ? 2 : 1;
  const alignedCurrentPage = useMemo(
    () => normalizePageForLayout(currentPage, pageLayoutMode),
    [currentPage, pageLayoutMode],
  );

  const handleScalePercentChange = useCallback(
    (nextPercent: number) => {
      if (!Number.isFinite(nextPercent)) {
        return;
      }

      handleViewerScaleChange(nextPercent / 100);
    },
    [handleViewerScaleChange],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchQuery(searchInputValue);
    }, SEARCH_INPUT_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInputValue]);

  useEffect(() => {
    if (!numPages) {
      return;
    }

    if (currentPage > numPages) {
      queueMicrotask(() => setCurrentPage(numPages));
    }
  }, [numPages, currentPage, setCurrentPage]);

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

  const commitSearchQuery = useCallback(() => {
    setSearchQuery((previousQuery) =>
      previousQuery === searchInputValue ? previousQuery : searchInputValue,
    );
  }, [searchInputValue]);

  const handlePrevMatch = useCallback(() => {
    commitSearchQuery();
    setSearchNavDirection("prev");
    setSearchNavToken((previousToken) => previousToken + 1);
  }, [commitSearchQuery]);

  const handleNextMatch = useCallback(() => {
    commitSearchQuery();
    setSearchNavDirection("next");
    setSearchNavToken((previousToken) => previousToken + 1);
  }, [commitSearchQuery]);

  const handleOpenNewTab = useCallback(async () => {
    if (effectiveRemoteUrl) {
      await Promise.resolve(platform.shell.openExternal(effectiveRemoteUrl));
      return;
    }

    if (!localSourceBytes || localSourceBytes.byteLength === 0) {
      return;
    }

    const blobBytes = new Uint8Array(localSourceBytes.byteLength);
    blobBytes.set(localSourceBytes);

    const blob = new Blob([blobBytes], {
      type: doc.mimeType || "application/pdf",
    });
    const tempUrl = URL.createObjectURL(blob);

    try {
      await Promise.resolve(platform.shell.openExternal(tempUrl));
    } finally {
      window.setTimeout(() => {
        try {
          URL.revokeObjectURL(tempUrl);
        } catch {
          // noop
        }
      }, 60_000);
    }
  }, [doc.mimeType, effectiveRemoteUrl, localSourceBytes]);

  const handleFirstPageSize = useCallback(
    (size: { width: number; height: number } | null) => {
      const nextWidth = size?.width ?? null;
      setBasePageWidth((previousWidth) =>
        previousWidth === nextWidth ? previousWidth : nextWidth,
      );
    },
    [],
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
      <PdfPaneToolbar
        isLocalOnly={isLocalOnly}
        uploadStatus={doc.uploadStatus}
        sourceUnavailable={sourceUnavailable}
        canOpenExternal={!!effectiveRemoteUrl || !!localSourceBytes}
        searchQuery={searchInputValue}
        totalMatches={totalMatches}
        activeMatchIndex={activeMatchIndex}
        onSearchQueryChange={setSearchInputValue}
        onPrevMatch={handlePrevMatch}
        onNextMatch={handleNextMatch}
        onOpenNewTab={() => {
          void handleOpenNewTab();
        }}
      />

      <div
        ref={containerRef}
        className="relative flex-1 min-h-0 min-w-0 w-full overflow-hidden bg-transparent"
      >
        {sourceUnavailable ? (
          <div className="p-4 text-sm text-slate-500">
            {localDataStatus === "loading" && "ローカルPDFを復元中..."}
            {localDataStatus === "failed" &&
              "ローカルファイルが見つかりません。再アップロードしてください。"}
            {localDataStatus === "idle" && "PDFソースがありません。"}
          </div>
        ) : (
          <>
            <PdfViewer
              ref={viewerRef}
              source={source}
              scale={scale}
              minScale={FIT_MIN_SCALE}
              maxScale={FIT_MAX_SCALE}
              searchQuery={searchQuery}
              searchNavToken={searchNavToken}
              searchNavDirection={searchNavDirection}
              pageLayoutMode={pageLayoutMode}
              spreadGap={PDF_DOUBLE_PAGE_GAP}
              onScaleChange={handleViewerScaleChange}
              onNumPages={setNumPages}
              onPageChange={setCurrentPage}
              onFirstPageSize={handleFirstPageSize}
              viewerOptions={resolvedViewerOptions}
              sourceMeta={sourceMeta}
              onSourceLoadError={handleSourceLoadError}
              onSearchStateChange={({
                totalMatches: nextTotalMatches,
                activeMatchIndex: nextActiveMatchIndex,
              }) => {
                setTotalMatches(nextTotalMatches);
                setActiveMatchIndex(nextActiveMatchIndex);
              }}
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
                    scalePercent={scalePercent}
                    minScalePercent={FIT_MIN_SCALE * 100}
                    maxScalePercent={FIT_MAX_SCALE * 100}
                    fitMode={fitMode}
                    pageLayoutMode={pageLayoutMode}
                    zoomStepPercent={PDF_OVERLAY_ZOOM_STEP_PERCENT}
                    onCommitPage={handleCommitPage}
                    onPrevPage={handlePrev}
                    onNextPage={handleNext}
                    onFitWidth={handleFitWidth}
                    onScalePercentChange={handleScalePercentChange}
                    onPageLayoutModeChange={handlePageLayoutModeChange}
                    canGoToPrevPage={canGoToPrevPage}
                    canGoToNextPage={canGoToNextPage}
                  />
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};
