import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { PdfPage } from "./PdfPage";
import {
  PDF_PAGE_PLACEHOLDER_FALLBACK_HEIGHT,
  PDF_PAGE_PREFETCH_EXTRA_PAGES,
  PDF_PAGE_PREFETCH_OVERSCAN_VIEWPORTS,
  PDF_PAGE_RENDER_OVERSCAN_VIEWPORTS,
} from "@constants/web/pdf";
import { usePdfCurrentPage } from "./hooks/usePdfCurrentPage";
import { usePdfDocument } from "./hooks/usePdfDocument";
import { usePdfZoom } from "./hooks/usePdfZoom";
import { usePdfSearch } from "./hooks/usePdfSearch";
import type {
  PageSize,
  PdfViewerHandle,
  PdfViewerOptions,
  PdfViewerSourceMeta,
  SourceLoadErrorKind,
} from "./pdfViewerTypes";

export type { PdfViewerHandle } from "./pdfViewerTypes";

interface PdfViewerProps {
  source: {
    url?: string | null;
    data?: Uint8Array | null;
  };
  scale: number;
  minScale?: number;
  maxScale?: number;
  zoomStep?: number;
  searchQuery?: string;
  searchNavToken?: number;
  searchNavDirection?: "next" | "prev";
  onScaleChange?: (nextScale: number, source: "wheel" | "gesture") => void;
  onNumPages: (n: number) => void;
  onFirstPageSize?: (size: PageSize | null) => void;
  onPageChange?: (page: number) => void;
  onSourceLoadError?: (details: {
    kind: SourceLoadErrorKind;
    url: string | null;
    message: string;
  }) => void;
  onSearchStateChange?: (state: {
    totalMatches: number;
    activeMatchIndex: number;
    activeMatchPage: number | null;
  }) => void;
  className?: string;
  pageGap?: number;
  sourceMeta?: PdfViewerSourceMeta;
  viewerOptions?: PdfViewerOptions;
}

type PageLayoutMetrics = {
  pageTopOffsets: number[];
  pageHeights: number[];
  pageBottomOffsets: number[];
  totalContentHeight: number;
};

const buildPageLayoutMetrics = ({
  numPages,
  pageSizes,
  scale,
  pageGap,
}: {
  numPages: number;
  pageSizes: Record<number, PageSize>;
  scale: number;
  pageGap: number;
}): PageLayoutMetrics => {
  const pageTopOffsets: number[] = [];
  const pageHeights: number[] = [];
  const pageBottomOffsets: number[] = [];
  let runningTop = 0;

  for (let index = 0; index < numPages; index += 1) {
    const pageNumber = index + 1;
    const baseSize = pageSizes[pageNumber] ?? pageSizes[1];
    const pageHeight =
      baseSize && baseSize.height > 0
        ? Math.max(1, Math.floor(baseSize.height * scale))
        : PDF_PAGE_PLACEHOLDER_FALLBACK_HEIGHT;

    pageTopOffsets.push(runningTop);
    pageHeights.push(pageHeight);
    pageBottomOffsets.push(runningTop + pageHeight);

    runningTop += pageHeight;

    if (index < numPages - 1) {
      runningTop += pageGap;
    }
  }

  return {
    pageTopOffsets,
    pageHeights,
    pageBottomOffsets,
    totalContentHeight: Math.max(runningTop, 1),
  };
};

const buildFallbackPageNumbers = ({
  currentPage,
  activeMatchPageNumber,
  numPages,
}: {
  currentPage: number;
  activeMatchPageNumber: number | null;
  numPages: number;
}) => {
  if (numPages <= 0) {
    return [];
  }

  const pageNumbers = new Set<number>();

  for (let offset = -1; offset <= 1; offset += 1) {
    const pageNumber = currentPage + offset;
    if (pageNumber >= 1 && pageNumber <= numPages) {
      pageNumbers.add(pageNumber);
    }
  }

  if (typeof activeMatchPageNumber === "number") {
    for (let offset = -1; offset <= 1; offset += 1) {
      const pageNumber = activeMatchPageNumber + offset;
      if (pageNumber >= 1 && pageNumber <= numPages) {
        pageNumbers.add(pageNumber);
      }
    }
  }

  return Array.from(pageNumbers).sort((left, right) => left - right);
};

const mergePageNumbers = (...collections: Array<number[]>) => {
  const pageNumberSet = new Set<number>();

  collections.forEach((pageNumbers) => {
    pageNumbers.forEach((pageNumber) => {
      if (Number.isFinite(pageNumber) && pageNumber > 0) {
        pageNumberSet.add(pageNumber);
      }
    });
  });

  return Array.from(pageNumberSet).sort((left, right) => left - right);
};

const findFirstIntersectingPageIndex = (
  pageBottomOffsets: number[],
  windowTop: number,
) => {
  let lo = 0;
  let hi = pageBottomOffsets.length - 1;
  let answer = pageBottomOffsets.length;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const midBottom = pageBottomOffsets[mid] ?? Number.MAX_SAFE_INTEGER;

    if (midBottom >= windowTop) {
      answer = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }

  return answer;
};

const findLastIntersectingPageIndex = (
  pageTopOffsets: number[],
  windowBottom: number,
) => {
  let lo = 0;
  let hi = pageTopOffsets.length - 1;
  let answer = -1;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const midTop = pageTopOffsets[mid] ?? Number.MAX_SAFE_INTEGER;

    if (midTop <= windowBottom) {
      answer = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return answer;
};

const buildPageNumbersInWindow = ({
  numPages,
  pageTopOffsets,
  pageBottomOffsets,
  windowTop,
  windowBottom,
}: {
  numPages: number;
  pageTopOffsets: number[];
  pageBottomOffsets: number[];
  windowTop: number;
  windowBottom: number;
}) => {
  if (
    numPages <= 0 ||
    pageTopOffsets.length === 0 ||
    pageBottomOffsets.length === 0
  ) {
    return [];
  }

  const clampedWindowTop = Math.max(0, windowTop);
  const clampedWindowBottom = Math.max(clampedWindowTop, windowBottom);

  const startIndex = findFirstIntersectingPageIndex(
    pageBottomOffsets,
    clampedWindowTop,
  );
  const endIndex = findLastIntersectingPageIndex(
    pageTopOffsets,
    clampedWindowBottom,
  );

  if (
    startIndex >= pageTopOffsets.length ||
    endIndex < 0 ||
    startIndex > endIndex
  ) {
    return [];
  }

  const pageNumbers: number[] = [];

  for (let index = startIndex; index <= endIndex; index += 1) {
    const pageNumber = index + 1;
    if (pageNumber >= 1 && pageNumber <= numPages) {
      pageNumbers.push(pageNumber);
    }
  }

  return pageNumbers;
};

const buildRenderedPageNumbers = ({
  currentPage,
  activeMatchPageNumber,
  numPages,
  pageTopOffsets,
  pageBottomOffsets,
  scrollTop,
  viewportHeight,
}: {
  currentPage: number;
  activeMatchPageNumber: number | null;
  numPages: number;
  pageTopOffsets: number[];
  pageBottomOffsets: number[];
  scrollTop: number;
  viewportHeight: number;
}) => {
  if (numPages <= 0) {
    return [];
  }

  if (viewportHeight <= 0) {
    return buildFallbackPageNumbers({
      currentPage,
      activeMatchPageNumber,
      numPages,
    });
  }

  const overscanPx = viewportHeight * PDF_PAGE_RENDER_OVERSCAN_VIEWPORTS;
  const renderedWindowPages = buildPageNumbersInWindow({
    numPages,
    pageTopOffsets,
    pageBottomOffsets,
    windowTop: scrollTop - overscanPx,
    windowBottom: scrollTop + viewportHeight + overscanPx,
  });

  const stickyPages = buildFallbackPageNumbers({
    currentPage,
    activeMatchPageNumber,
    numPages,
  });

  return mergePageNumbers(renderedWindowPages, stickyPages);
};

const buildVisibleTextLayerPageNumbers = ({
  currentPage,
  activeMatchPageNumber,
  numPages,
  pageTopOffsets,
  pageBottomOffsets,
  scrollTop,
  viewportHeight,
}: {
  currentPage: number;
  activeMatchPageNumber: number | null;
  numPages: number;
  pageTopOffsets: number[];
  pageBottomOffsets: number[];
  scrollTop: number;
  viewportHeight: number;
}) => {
  if (numPages <= 0) {
    return [];
  }

  if (viewportHeight <= 0) {
    return buildFallbackPageNumbers({
      currentPage,
      activeMatchPageNumber,
      numPages,
    });
  }

  const visiblePages = buildPageNumbersInWindow({
    numPages,
    pageTopOffsets,
    pageBottomOffsets,
    windowTop: scrollTop,
    windowBottom: scrollTop + viewportHeight,
  });

  const stickyPages =
    typeof activeMatchPageNumber === "number"
      ? [activeMatchPageNumber]
      : [currentPage];

  return mergePageNumbers(visiblePages, stickyPages);
};

const buildPrefetchPageNumbers = ({
  currentPage,
  activeMatchPageNumber,
  numPages,
  pageTopOffsets,
  pageBottomOffsets,
  scrollTop,
  viewportHeight,
}: {
  currentPage: number;
  activeMatchPageNumber: number | null;
  numPages: number;
  pageTopOffsets: number[];
  pageBottomOffsets: number[];
  scrollTop: number;
  viewportHeight: number;
}) => {
  if (numPages <= 0) {
    return [];
  }

  if (viewportHeight <= 0) {
    return buildFallbackPageNumbers({
      currentPage,
      activeMatchPageNumber,
      numPages,
    });
  }

  const overscanPx = viewportHeight * PDF_PAGE_PREFETCH_OVERSCAN_VIEWPORTS;
  const windowPages = buildPageNumbersInWindow({
    numPages,
    pageTopOffsets,
    pageBottomOffsets,
    windowTop: scrollTop - overscanPx,
    windowBottom: scrollTop + viewportHeight + overscanPx,
  });

  if (windowPages.length === 0) {
    return buildFallbackPageNumbers({
      currentPage,
      activeMatchPageNumber,
      numPages,
    });
  }

  const firstPage = windowPages[0] ?? currentPage;
  const lastPage = windowPages[windowPages.length - 1] ?? currentPage;
  const expandedPages: number[] = [];

  for (
    let pageNumber = Math.max(1, firstPage - PDF_PAGE_PREFETCH_EXTRA_PAGES);
    pageNumber <= Math.min(numPages, lastPage + PDF_PAGE_PREFETCH_EXTRA_PAGES);
    pageNumber += 1
  ) {
    expandedPages.push(pageNumber);
  }

  const stickyPages = buildFallbackPageNumbers({
    currentPage,
    activeMatchPageNumber,
    numPages,
  });

  return mergePageNumbers(windowPages, expandedPages, stickyPages);
};

export const PdfViewer = React.forwardRef<PdfViewerHandle, PdfViewerProps>(
  (
    {
      source,
      scale,
      minScale = 0.5,
      maxScale = 3,
      zoomStep = 0.1,
      searchQuery = "",
      searchNavToken = 0,
      searchNavDirection = "next",
      onScaleChange,
      onNumPages,
      onFirstPageSize,
      onPageChange,
      onSourceLoadError,
      onSearchStateChange,
      className,
      pageGap = 16,
      viewerOptions,
      sourceMeta,
    }: PdfViewerProps,
    ref,
  ) => {
    const {
      doc,
      documentKey,
      numPages,
      pageSizes,
      loading,
      error,
      setPageSize,
      getPage,
      getPageTextContent,
      prefetchPageResources,
    } = usePdfDocument({
      source,
      viewerOptions,
      sourceMeta,
      onNumPages,
      onFirstPageSize,
      onSourceLoadError,
    });

    const pageLayoutMetrics = useMemo(
      () =>
        buildPageLayoutMetrics({
          numPages,
          pageSizes,
          scale,
          pageGap,
        }),
      [numPages, pageGap, pageSizes, scale],
    );

    const {
      containerRef,
      scrollContainerEl,
      scrollViewport,
      currentPage,
      handleScroll,
      notifyLayoutChanged,
      resetNavigation,
      scrollToPage,
      getScrollDiagnostics,
      logScrollDiagnostics,
    } = usePdfCurrentPage({
      numPages,
      pageTopOffsets: pageLayoutMetrics.pageTopOffsets,
      onPageChange,
    });

    const [contentViewportEl, setContentViewportEl] =
      useState<HTMLDivElement | null>(null);

    const handleContentViewportRef = useCallback(
      (element: HTMLDivElement | null) => {
        setContentViewportEl((previous) =>
          previous === element ? previous : element,
        );
      },
      [],
    );

    usePdfZoom({
      container: scrollContainerEl,
      previewTarget: contentViewportEl,
      scale,
      minScale,
      maxScale,
      zoomStep,
      onScaleChange,
    });

    const prioritizedSearchPageNumbers = useMemo(
      () =>
        buildRenderedPageNumbers({
          currentPage,
          activeMatchPageNumber: null,
          numPages,
          pageTopOffsets: pageLayoutMetrics.pageTopOffsets,
          pageBottomOffsets: pageLayoutMetrics.pageBottomOffsets,
          scrollTop: scrollViewport.scrollTop,
          viewportHeight: scrollViewport.clientHeight,
        }),
      [
        currentPage,
        numPages,
        pageLayoutMetrics.pageBottomOffsets,
        pageLayoutMetrics.pageTopOffsets,
        scrollViewport.clientHeight,
        scrollViewport.scrollTop,
      ],
    );

    const searchState = usePdfSearch({
      doc,
      numPages,
      currentPage,
      renderedPageNumbers: prioritizedSearchPageNumbers,
      searchQuery,
      searchNavToken,
      searchNavDirection,
      getPageTextContent,
    });

    const activeMatchPageNumber = useMemo(() => {
      if (
        searchState.activeMatchIndex < 0 ||
        searchState.activeMatchIndex >= searchState.flattenedMatches.length
      ) {
        return null;
      }

      return (
        searchState.flattenedMatches[searchState.activeMatchIndex]
          ?.pageNumber ?? null
      );
    }, [searchState.activeMatchIndex, searchState.flattenedMatches]);

    const renderedPageNumbers = useMemo(
      () =>
        buildRenderedPageNumbers({
          currentPage,
          activeMatchPageNumber,
          numPages,
          pageTopOffsets: pageLayoutMetrics.pageTopOffsets,
          pageBottomOffsets: pageLayoutMetrics.pageBottomOffsets,
          scrollTop: scrollViewport.scrollTop,
          viewportHeight: scrollViewport.clientHeight,
        }),
      [
        activeMatchPageNumber,
        currentPage,
        numPages,
        pageLayoutMetrics.pageBottomOffsets,
        pageLayoutMetrics.pageTopOffsets,
        scrollViewport.clientHeight,
        scrollViewport.scrollTop,
      ],
    );

    const textLayerPageNumbers = useMemo(
      () =>
        buildVisibleTextLayerPageNumbers({
          currentPage,
          activeMatchPageNumber,
          numPages,
          pageTopOffsets: pageLayoutMetrics.pageTopOffsets,
          pageBottomOffsets: pageLayoutMetrics.pageBottomOffsets,
          scrollTop: scrollViewport.scrollTop,
          viewportHeight: scrollViewport.clientHeight,
        }),
      [
        activeMatchPageNumber,
        currentPage,
        numPages,
        pageLayoutMetrics.pageBottomOffsets,
        pageLayoutMetrics.pageTopOffsets,
        scrollViewport.clientHeight,
        scrollViewport.scrollTop,
      ],
    );

    const prefetchPageNumbers = useMemo(
      () =>
        buildPrefetchPageNumbers({
          currentPage,
          activeMatchPageNumber,
          numPages,
          pageTopOffsets: pageLayoutMetrics.pageTopOffsets,
          pageBottomOffsets: pageLayoutMetrics.pageBottomOffsets,
          scrollTop: scrollViewport.scrollTop,
          viewportHeight: scrollViewport.clientHeight,
        }),
      [
        activeMatchPageNumber,
        currentPage,
        numPages,
        pageLayoutMetrics.pageBottomOffsets,
        pageLayoutMetrics.pageTopOffsets,
        scrollViewport.clientHeight,
        scrollViewport.scrollTop,
      ],
    );

    useEffect(() => {
      if (!doc || prefetchPageNumbers.length === 0) {
        return;
      }

      let cancelled = false;

      const schedulePrefetch = () => {
        if (cancelled) {
          return;
        }

        prefetchPageResources(prefetchPageNumbers, {
          includeTextContent: false,
        });
      };

      if (
        "requestIdleCallback" in window &&
        typeof window.requestIdleCallback === "function"
      ) {
        const idleHandle = window.requestIdleCallback(schedulePrefetch, {
          timeout: 120,
        });

        return () => {
          cancelled = true;
          window.cancelIdleCallback(idleHandle);
        };
      }

      const timeoutId = window.setTimeout(schedulePrefetch, 24);

      return () => {
        cancelled = true;
        window.clearTimeout(timeoutId);
      };
    }, [doc, prefetchPageNumbers, prefetchPageResources]);

    useEffect(() => {
      if (searchState.flattenedMatches.length === 0) {
        onSearchStateChange?.({
          totalMatches: 0,
          activeMatchIndex: -1,
          activeMatchPage: null,
        });
        return;
      }

      const clampedIndex = Math.min(
        Math.max(searchState.activeMatchIndex, 0),
        searchState.flattenedMatches.length - 1,
      );
      const activeMatch = searchState.flattenedMatches[clampedIndex] ?? null;

      onSearchStateChange?.({
        totalMatches: searchState.flattenedMatches.length,
        activeMatchIndex: clampedIndex,
        activeMatchPage: activeMatch?.pageNumber ?? null,
      });
    }, [
      onSearchStateChange,
      searchState.activeMatchIndex,
      searchState.flattenedMatches,
    ]);

    useEffect(() => {
      if (!doc) {
        return;
      }

      notifyLayoutChanged();
    }, [
      doc,
      notifyLayoutChanged,
      pageLayoutMetrics.pageBottomOffsets,
      pageLayoutMetrics.pageTopOffsets,
      scale,
    ]);

    useEffect(() => {
      if (
        searchState.activeMatchIndex < 0 ||
        searchState.activeMatchIndex >= searchState.flattenedMatches.length
      ) {
        return;
      }

      const match = searchState.flattenedMatches[searchState.activeMatchIndex];
      scrollToPage(match.pageNumber);
    }, [
      scrollToPage,
      searchState.activeMatchIndex,
      searchState.flattenedMatches,
    ]);

    const previousSourceIdentityRef = useRef<{
      url: string;
      data: Uint8Array | null;
      localFileId: string | null;
    } | null>(null);

    const normalizedSourceUrl =
      typeof source?.url === "string" ? source.url.trim() : "";
    const normalizedSourceData =
      source?.data instanceof Uint8Array ? source.data : null;
    const normalizedLocalFileId = sourceMeta?.localFileId ?? null;

    useEffect(() => {
      const nextIdentity = {
        url: normalizedSourceUrl,
        data: normalizedSourceData,
        localFileId: normalizedLocalFileId,
      };

      const previousIdentity = previousSourceIdentityRef.current;
      previousSourceIdentityRef.current = nextIdentity;

      if (!previousIdentity) {
        return;
      }

      const sourceChanged =
        previousIdentity.url !== nextIdentity.url ||
        previousIdentity.data !== nextIdentity.data ||
        previousIdentity.localFileId !== nextIdentity.localFileId;

      if (!sourceChanged) {
        return;
      }

      resetNavigation();
    }, [
      normalizedLocalFileId,
      normalizedSourceData,
      normalizedSourceUrl,
      resetNavigation,
    ]);

    useImperativeHandle(
      ref,
      () => ({
        scrollToPage,
        getScrollDiagnostics,
        logScrollDiagnostics,
      }),
      [getScrollDiagnostics, logScrollDiagnostics, scrollToPage],
    );

    return (
      <div
        ref={containerRef}
        onScroll={handleScroll}
        data-testid="pdf-scroll-container"
        className={cn("h-full min-h-0 w-full bg-slate-50", className)}
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          overflow: "auto",
          overflowX: "hidden",
        }}
      >
        <div className="min-w-0 p-2">
          {loading && (
            <div className="mb-2 text-xs text-slate-400">読み込み中...</div>
          )}

          {error && <div className="text-sm text-rose-500">{error}</div>}

          {!error && doc && (
            <div
              ref={handleContentViewportRef}
              className="relative w-full"
              style={{ height: `${pageLayoutMetrics.totalContentHeight}px` }}
            >
              {renderedPageNumbers.map((pageNumber) => {
                const pageTop =
                  pageLayoutMetrics.pageTopOffsets[pageNumber - 1] ?? 0;
                const placeholderHeight =
                  pageLayoutMetrics.pageHeights[pageNumber - 1] ??
                  PDF_PAGE_PLACEHOLDER_FALLBACK_HEIGHT;
                const pageSearchMatches =
                  searchState.pageMatches[pageNumber] ?? [];
                const activeSearchMatchIndexForPage =
                  activeMatchPageNumber === pageNumber
                    ? searchState.activeMatchIndex
                    : undefined;
                const renderTextLayer =
                  textLayerPageNumbers.includes(pageNumber);

                return (
                  <div
                    key={`pdf-row-${documentKey}-${pageNumber}`}
                    className="absolute left-0 right-0 flex justify-center"
                    style={{
                      top: `${pageTop}px`,
                      minHeight: `${placeholderHeight}px`,
                    }}
                  >
                    <PdfPage
                      documentKey={documentKey}
                      pdf={doc}
                      pageNumber={pageNumber}
                      scale={scale}
                      baseSize={pageSizes[pageNumber]}
                      opaqueCanvas={viewerOptions?.opaqueCanvas ?? false}
                      renderTextLayer={renderTextLayer}
                      searchMatches={pageSearchMatches}
                      activeSearchMatchIndex={activeSearchMatchIndexForPage}
                      getPage={getPage}
                      getPageTextContent={getPageTextContent}
                      onPageSize={setPageSize}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  },
);
