
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PdfPageLayoutMode } from "@/types";
import { cn } from "@/lib/utils";
import { PdfPage } from "./PdfPage";
import {
  PDF_PAGE_PLACEHOLDER_FALLBACK_HEIGHT,
  PDF_PAGE_PREFETCH_EXTRA_PAGES,
  PDF_PAGE_PREFETCH_OVERSCAN_VIEWPORTS,
  PDF_PAGE_RENDER_OVERSCAN_VIEWPORTS,
} from "@constants/web/pdf";
import { usePdfCurrentPage } from "./hooks/usePdfCurrentPage";
import {
  usePdfDocument,
  type PdfDocumentController,
} from "./hooks/usePdfDocument";
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

interface PdfViewerCommonProps {
  scale: number;
  minScale?: number;
  maxScale?: number;
  zoomStep?: number;
  searchQuery?: string;
  searchNavToken?: number;
  searchNavDirection?: "next" | "prev";
  pageLayoutMode?: PdfPageLayoutMode;
  pageOrder?: number[];
  onScaleChange?: (nextScale: number, source: "wheel" | "gesture") => void;
  onPageChange?: (page: number) => void;
  onSearchStateChange?: (state: {
    totalMatches: number;
    activeMatchIndex: number;
    activeMatchPage: number | null;
  }) => void;
  className?: string;
  pageGap?: number;
  spreadGap?: number;
  navigationIdentity?: string | null;
  opaqueCanvas?: boolean;
}

interface PdfViewerSourceProps extends PdfViewerCommonProps {
  source: {
    url?: string | null;
    data?: Uint8Array | null;
  };
  onNumPages: (n: number) => void;
  onFirstPageSize?: (size: PageSize | null) => void;
  onSourceLoadError?: (details: {
    kind: SourceLoadErrorKind;
    url: string | null;
    message: string;
  }) => void;
  sourceMeta?: PdfViewerSourceMeta;
  viewerOptions?: PdfViewerOptions;
  documentController?: never;
}

interface PdfViewerDocumentControllerProps extends PdfViewerCommonProps {
  documentController: PdfDocumentController;
  source?: never;
  onNumPages?: never;
  onFirstPageSize?: never;
  onSourceLoadError?: never;
  sourceMeta?: never;
  viewerOptions?: never;
}

type PdfViewerProps =
  | PdfViewerSourceProps
  | PdfViewerDocumentControllerProps;

type PageLayoutMetrics = {
  visualPageNumbers: number[];
  visualPageAnchorPageNumbers: number[];
  visualPageTopOffsets: number[];
  visualPageBottomOffsets: number[];
  pageScrollTopsByPageNumber: Record<number, number>;
  rowTopOffsets: number[];
  rowHeights: number[];
  rowPageNumbers: number[][];
  totalContentHeight: number;
};

interface PdfViewerInnerProps extends PdfViewerCommonProps {
  documentController: PdfDocumentController;
}

const normalizePageOrder = (pageOrder: number[] | undefined, numPages: number) => {
  const defaultOrder = Array.from({ length: numPages }, (_, index) => index + 1);
  if (numPages <= 0) {
    return [];
  }

  if (!Array.isArray(pageOrder) || pageOrder.length === 0) {
    return defaultOrder;
  }

  const seen = new Set<number>();
  const orderedPages: number[] = [];

  pageOrder.forEach((pageNumber) => {
    if (
      typeof pageNumber !== "number" ||
      !Number.isFinite(pageNumber)
    ) {
      return;
    }

    const normalizedPageNumber = Math.max(1, Math.trunc(pageNumber));
    if (normalizedPageNumber > numPages || seen.has(normalizedPageNumber)) {
      return;
    }

    seen.add(normalizedPageNumber);
    orderedPages.push(normalizedPageNumber);
  });

  defaultOrder.forEach((pageNumber) => {
    if (seen.has(pageNumber)) {
      return;
    }

    orderedPages.push(pageNumber);
  });

  return orderedPages;
};

const buildPageRows = ({
  orderedPageNumbers,
  pageLayoutMode,
}: {
  orderedPageNumbers: number[];
  pageLayoutMode: PdfPageLayoutMode;
}) => {
  const rows: number[][] = [];

  if (orderedPageNumbers.length === 0) {
    return rows;
  }

  const pagesPerRow = pageLayoutMode === "double" ? 2 : 1;

  for (
    let visualIndex = 0;
    visualIndex < orderedPageNumbers.length;
    visualIndex += pagesPerRow
  ) {
    rows.push(orderedPageNumbers.slice(visualIndex, visualIndex + pagesPerRow));
  }

  return rows;
};

const buildPageLayoutMetrics = ({
  orderedPageNumbers,
  pageSizes,
  scale,
  pageGap,
  pageLayoutMode,
}: {
  orderedPageNumbers: number[];
  pageSizes: Record<number, PageSize>;
  scale: number;
  pageGap: number;
  pageLayoutMode: PdfPageLayoutMode;
}): PageLayoutMetrics => {
  const visualPageNumbers: number[] = [];
  const visualPageAnchorPageNumbers: number[] = [];
  const visualPageTopOffsets: number[] = [];
  const visualPageBottomOffsets: number[] = [];
  const pageScrollTopsByPageNumber: Record<number, number> = {};
  const rowTopOffsets: number[] = [];
  const rowHeights: number[] = [];
  const rowPageNumbers = buildPageRows({
    orderedPageNumbers,
    pageLayoutMode,
  });

  let runningTop = 0;

  rowPageNumbers.forEach((currentRowPageNumbers, rowIndex) => {
    const measuredPageHeights = currentRowPageNumbers.map((pageNumber) => {
      const baseSize = pageSizes[pageNumber] ?? pageSizes[orderedPageNumbers[0] ?? 1];
      return baseSize && baseSize.height > 0
        ? Math.max(1, Math.floor(baseSize.height * scale))
        : PDF_PAGE_PLACEHOLDER_FALLBACK_HEIGHT;
    });

    const rowHeight =
      measuredPageHeights.length > 0
        ? Math.max(...measuredPageHeights)
        : PDF_PAGE_PLACEHOLDER_FALLBACK_HEIGHT;
    const rowAnchorPageNumber = currentRowPageNumbers[0] ?? 1;

    rowTopOffsets.push(runningTop);
    rowHeights.push(rowHeight);

    currentRowPageNumbers.forEach((pageNumber) => {
      visualPageNumbers.push(pageNumber);
      visualPageAnchorPageNumbers.push(rowAnchorPageNumber);
      visualPageTopOffsets.push(runningTop);
      visualPageBottomOffsets.push(runningTop + rowHeight);
      pageScrollTopsByPageNumber[pageNumber] = runningTop;
    });

    runningTop += rowHeight;

    if (rowIndex < rowPageNumbers.length - 1) {
      runningTop += pageGap;
    }
  });

  return {
    visualPageNumbers,
    visualPageAnchorPageNumbers,
    visualPageTopOffsets,
    visualPageBottomOffsets,
    pageScrollTopsByPageNumber,
    rowTopOffsets,
    rowHeights,
    rowPageNumbers,
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
  pageTopOffsets,
  pageBottomOffsets,
  visualPageNumbers,
  windowTop,
  windowBottom,
}: {
  pageTopOffsets: number[];
  pageBottomOffsets: number[];
  visualPageNumbers: number[];
  windowTop: number;
  windowBottom: number;
}) => {
  if (
    pageTopOffsets.length === 0 ||
    pageBottomOffsets.length === 0 ||
    visualPageNumbers.length === 0
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
    const pageNumber = visualPageNumbers[index];
    if (typeof pageNumber === "number") {
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
  visualPageNumbers,
  scrollTop,
  viewportHeight,
}: {
  currentPage: number;
  activeMatchPageNumber: number | null;
  numPages: number;
  pageTopOffsets: number[];
  pageBottomOffsets: number[];
  visualPageNumbers: number[];
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
    pageTopOffsets,
    pageBottomOffsets,
    visualPageNumbers,
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
  visualPageNumbers,
  scrollTop,
  viewportHeight,
}: {
  currentPage: number;
  activeMatchPageNumber: number | null;
  numPages: number;
  pageTopOffsets: number[];
  pageBottomOffsets: number[];
  visualPageNumbers: number[];
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
    pageTopOffsets,
    pageBottomOffsets,
    visualPageNumbers,
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
  visualPageNumbers,
  scrollTop,
  viewportHeight,
}: {
  currentPage: number;
  activeMatchPageNumber: number | null;
  numPages: number;
  pageTopOffsets: number[];
  pageBottomOffsets: number[];
  visualPageNumbers: number[];
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
    pageTopOffsets,
    pageBottomOffsets,
    visualPageNumbers,
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

  const sortedWindowPages = visualPageNumbers.filter((pageNumber) =>
    windowPages.includes(pageNumber),
  );
  const firstPage = sortedWindowPages[0] ?? currentPage;
  const lastPage = sortedWindowPages[sortedWindowPages.length - 1] ?? currentPage;
  const firstVisualIndex = visualPageNumbers.indexOf(firstPage);
  const lastVisualIndex = visualPageNumbers.indexOf(lastPage);

  const expandedPages = visualPageNumbers.slice(
    Math.max(0, firstVisualIndex - PDF_PAGE_PREFETCH_EXTRA_PAGES),
    Math.min(
      visualPageNumbers.length,
      lastVisualIndex + PDF_PAGE_PREFETCH_EXTRA_PAGES + 1,
    ),
  );

  const stickyPages = buildFallbackPageNumbers({
    currentPage,
    activeMatchPageNumber,
    numPages,
  });

  return mergePageNumbers(windowPages, expandedPages, stickyPages);
};

const PdfViewerInner = React.forwardRef<PdfViewerHandle, PdfViewerInnerProps>(
  (
    {
      documentController,
      scale,
      minScale = 0.5,
      maxScale = 3,
      zoomStep = 0.1,
      searchQuery = "",
      searchNavToken = 0,
      searchNavDirection = "next",
      pageLayoutMode = "single",
      pageOrder,
      onScaleChange,
      onPageChange,
      onSearchStateChange,
      className,
      pageGap = 16,
      spreadGap = 16,
      navigationIdentity,
      opaqueCanvas = false,
    }: PdfViewerInnerProps,
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
      acquirePage,
      getPageTextContent,
      prefetchPageResources,
    } = documentController;

    const orderedPageNumbers = useMemo(
      () => normalizePageOrder(pageOrder, numPages),
      [numPages, pageOrder],
    );

    const pageLayoutMetrics = useMemo(
      () =>
        buildPageLayoutMetrics({
          orderedPageNumbers,
          pageSizes,
          scale,
          pageGap,
          pageLayoutMode,
        }),
      [orderedPageNumbers, pageGap, pageLayoutMode, pageSizes, scale],
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
      pageTopOffsets: pageLayoutMetrics.visualPageTopOffsets,
      pageNavigationPageNumbers: pageLayoutMetrics.visualPageAnchorPageNumbers,
      pageScrollTopsByPageNumber: pageLayoutMetrics.pageScrollTopsByPageNumber,
      onPageChange,
    });

    const [contentViewportEl, setContentViewportEl] =
      useState<HTMLDivElement | null>(null);

    const handleContentViewportRef = useCallback(
      (element: HTMLDivElement | null) => {
        setContentViewportEl((previousElement) =>
          previousElement === element ? previousElement : element,
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
          pageTopOffsets: pageLayoutMetrics.visualPageTopOffsets,
          pageBottomOffsets: pageLayoutMetrics.visualPageBottomOffsets,
          visualPageNumbers: pageLayoutMetrics.visualPageNumbers,
          scrollTop: scrollViewport.scrollTop,
          viewportHeight: scrollViewport.clientHeight,
        }),
      [
        currentPage,
        numPages,
        pageLayoutMetrics.visualPageBottomOffsets,
        pageLayoutMetrics.visualPageNumbers,
        pageLayoutMetrics.visualPageTopOffsets,
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
          pageTopOffsets: pageLayoutMetrics.visualPageTopOffsets,
          pageBottomOffsets: pageLayoutMetrics.visualPageBottomOffsets,
          visualPageNumbers: pageLayoutMetrics.visualPageNumbers,
          scrollTop: scrollViewport.scrollTop,
          viewportHeight: scrollViewport.clientHeight,
        }),
      [
        activeMatchPageNumber,
        currentPage,
        numPages,
        pageLayoutMetrics.visualPageBottomOffsets,
        pageLayoutMetrics.visualPageNumbers,
        pageLayoutMetrics.visualPageTopOffsets,
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
          pageTopOffsets: pageLayoutMetrics.visualPageTopOffsets,
          pageBottomOffsets: pageLayoutMetrics.visualPageBottomOffsets,
          visualPageNumbers: pageLayoutMetrics.visualPageNumbers,
          scrollTop: scrollViewport.scrollTop,
          viewportHeight: scrollViewport.clientHeight,
        }),
      [
        activeMatchPageNumber,
        currentPage,
        numPages,
        pageLayoutMetrics.visualPageBottomOffsets,
        pageLayoutMetrics.visualPageNumbers,
        pageLayoutMetrics.visualPageTopOffsets,
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
          pageTopOffsets: pageLayoutMetrics.visualPageTopOffsets,
          pageBottomOffsets: pageLayoutMetrics.visualPageBottomOffsets,
          visualPageNumbers: pageLayoutMetrics.visualPageNumbers,
          scrollTop: scrollViewport.scrollTop,
          viewportHeight: scrollViewport.clientHeight,
        }),
      [
        activeMatchPageNumber,
        currentPage,
        numPages,
        pageLayoutMetrics.visualPageBottomOffsets,
        pageLayoutMetrics.visualPageNumbers,
        pageLayoutMetrics.visualPageTopOffsets,
        scrollViewport.clientHeight,
        scrollViewport.scrollTop,
      ],
    );

    const renderedRows = useMemo(() => {
      const renderedPageNumberSet = new Set(renderedPageNumbers);

      return pageLayoutMetrics.rowPageNumbers
        .map((rowPageNumbers, rowIndex) => ({
          rowIndex,
          rowPageNumbers,
        }))
        .filter(({ rowPageNumbers }) =>
          rowPageNumbers.some((pageNumber) =>
            renderedPageNumberSet.has(pageNumber),
          ),
        );
    }, [pageLayoutMetrics.rowPageNumbers, renderedPageNumbers]);

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
      orderedPageNumbers,
      pageLayoutMetrics.visualPageAnchorPageNumbers,
      pageLayoutMetrics.visualPageBottomOffsets,
      pageLayoutMetrics.visualPageTopOffsets,
      pageLayoutMode,
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

    const previousNavigationIdentityRef = useRef<string | null>(null);

    useEffect(() => {
      if (!navigationIdentity) {
        return;
      }

      const previousNavigationIdentity = previousNavigationIdentityRef.current;
      previousNavigationIdentityRef.current = navigationIdentity;

      if (!previousNavigationIdentity) {
        return;
      }

      if (previousNavigationIdentity === navigationIdentity) {
        return;
      }

      resetNavigation();
    }, [navigationIdentity, resetNavigation]);

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
        className={cn("h-full min-h-0 w-full bg-transparent", className)}
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
              {renderedRows.map(({ rowIndex, rowPageNumbers }) => {
                const rowStartPageNumber = rowPageNumbers[0] ?? rowIndex + 1;
                const rowTop = pageLayoutMetrics.rowTopOffsets[rowIndex] ?? 0;
                const rowHeight =
                  pageLayoutMetrics.rowHeights[rowIndex] ??
                  PDF_PAGE_PLACEHOLDER_FALLBACK_HEIGHT;

                return (
                  <div
                    key={`pdf-row-${documentKey}-${rowStartPageNumber}`}
                    className="absolute left-0 right-0 flex items-start justify-center"
                    style={{
                      top: `${rowTop}px`,
                      minHeight: `${rowHeight}px`,
                      columnGap:
                        pageLayoutMode === "double" ? `${spreadGap}px` : "0px",
                    }}
                  >
                    {rowPageNumbers.map((pageNumber) => {
                      const pageSearchMatches =
                        searchState.pageMatches[pageNumber] ?? [];
                      const activeSearchMatchIndexForPage =
                        activeMatchPageNumber === pageNumber
                          ? searchState.activeMatchIndex
                          : undefined;
                      const renderTextLayer =
                        textLayerPageNumbers.includes(pageNumber);

                      return (
                        <PdfPage
                          key={`pdf-page-${documentKey}-${pageNumber}`}
                          className="shrink-0"
                          documentKey={documentKey}
                          pdf={doc}
                          pageNumber={pageNumber}
                          scale={scale}
                          baseSize={pageSizes[pageNumber]}
                          opaqueCanvas={opaqueCanvas}
                          renderTextLayer={renderTextLayer}
                          searchMatches={pageSearchMatches}
                          activeSearchMatchIndex={activeSearchMatchIndexForPage}
                          acquirePage={acquirePage}
                          getPageTextContent={getPageTextContent}
                          onPageSize={setPageSize}
                        />
                      );
                    })}
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

PdfViewerInner.displayName = "PdfViewerInner";

const PdfViewerWithSource = React.forwardRef<PdfViewerHandle, PdfViewerSourceProps>(
  (
    {
      source,
      onNumPages,
      onFirstPageSize,
      onSourceLoadError,
      sourceMeta,
      viewerOptions,
      ...viewerProps
    },
    ref,
  ) => {
    const documentController = usePdfDocument({
      source,
      viewerOptions,
      sourceMeta,
      onNumPages,
      onFirstPageSize,
      onSourceLoadError,
    });

    const navigationIdentity = useMemo(() => {
      const normalizedSourceUrl =
        typeof source.url === "string" ? source.url.trim() : "";
      const normalizedSourceMeta = [
        sourceMeta?.localFileId ?? "",
        sourceMeta?.url ?? "",
        sourceMeta?.blobUrl ?? "",
        sourceMeta?.remoteUrl ?? "",
      ].join("::");
      const sourceDataIdentity = source.data
        ? `bytes:${source.data.byteLength}`
        : "bytes:0";

      return [normalizedSourceUrl, normalizedSourceMeta, sourceDataIdentity]
        .filter((value) => value.length > 0)
        .join("::");
    }, [source.data, source.url, sourceMeta]);

    return (
      <PdfViewerInner
        ref={ref}
        {...viewerProps}
        documentController={documentController}
        navigationIdentity={
          (viewerProps.navigationIdentity ?? navigationIdentity) || null
        }
        opaqueCanvas={viewerProps.opaqueCanvas ?? viewerOptions?.opaqueCanvas ?? false}
      />
    );
  },
);

PdfViewerWithSource.displayName = "PdfViewerWithSource";

const isDocumentControllerProps = (
  props: PdfViewerProps,
): props is PdfViewerDocumentControllerProps => {
  return "documentController" in props;
};

export const PdfViewer = React.forwardRef<PdfViewerHandle, PdfViewerProps>(
  (props, ref) => {
    if (isDocumentControllerProps(props)) {
      return <PdfViewerInner ref={ref} {...props} />;
    }

    return <PdfViewerWithSource ref={ref} {...props} />;
  },
);

PdfViewer.displayName = "PdfViewer";
