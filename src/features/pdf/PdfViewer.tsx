import React, { useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";

import { PDF_PAGE_PLACEHOLDER_FALLBACK_HEIGHT, PDF_PAGE_PREFETCH_EXTRA_PAGES, PDF_PAGE_RENDER_OVERSCAN_VIEWPORTS } from "@/features/pdf";

import { usePdfCurrentPage } from "./hooks/usePdfCurrentPage";
import { type PdfDocumentController, usePdfDocument } from "./hooks/usePdfDocument";
import { usePdfSearch } from "./hooks/usePdfSearch";
import { usePdfZoom } from "./hooks/usePdfZoom";
import { PdfPage } from "./PdfPage";
import type { PageSize, PdfScaleChangeSource, PdfViewerHandle, PdfViewerOptions, PdfViewerSourceMeta, SourceLoadErrorKind } from "./pdfViewer.types";

import { cn } from "@/lib/utils";
import type { PdfPageLayoutMode } from "@/types";

export type { PdfViewerHandle } from "./pdfViewer.types";

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
  onScaleChange?: (nextScale: number, source: PdfScaleChangeSource) => void;
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

type PdfViewerProps = PdfViewerSourceProps | PdfViewerDocumentControllerProps;

type PageLayoutMetrics = {
  visualPageNumbers: number[];
  visualPageAnchorPageNumbers: number[];
  visualPageTopOffsets: number[];
  visualPageBottomOffsets: number[];
  pageScrollTopsByPageNumber: Record<number, number>;
  pageRowIndexesByPageNumber: Record<number, number>;
  rowTopOffsets: number[];
  rowBottomOffsets: number[];
  rowHeights: number[];
  rowPageNumbers: number[][];
  totalContentHeight: number;
};

interface PdfViewerInnerProps extends PdfViewerCommonProps {
  documentController: PdfDocumentController;
}

const EMPTY_PAGE_NUMBERS: number[] = [];

const normalizePageOrder = (
  pageOrder: number[] | undefined,
  numPages: number,
): number[] => {
  if (numPages <= 0) {
    return EMPTY_PAGE_NUMBERS;
  }

  if (!pageOrder || pageOrder.length === 0) {
    return Array.from({ length: numPages }, (_, index) => index + 1);
  }

  const seen = new Set<number>();
  const normalized: number[] = [];

  for (const value of pageOrder) {
    if (!Number.isInteger(value) || value < 1 || value > numPages) {
      continue;
    }

    if (seen.has(value)) {
      continue;
    }

    seen.add(value);
    normalized.push(value);
  }

  for (let pageNumber = 1; pageNumber <= numPages; pageNumber += 1) {
    if (!seen.has(pageNumber)) {
      normalized.push(pageNumber);
    }
  }

  return normalized;
};

const getPageSizeOrFallback = (
  pageSizes: Record<number, PageSize>,
  pageNumber: number,
): PageSize =>
  pageSizes[pageNumber] ?? {
    width: 1,
    height: PDF_PAGE_PLACEHOLDER_FALLBACK_HEIGHT,
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
  const rows: number[][] = [];

  if (pageLayoutMode === "double") {
    for (let index = 0; index < orderedPageNumbers.length; index += 2) {
      rows.push(orderedPageNumbers.slice(index, index + 2));
    }
  } else {
    orderedPageNumbers.forEach((pageNumber) => rows.push([pageNumber]));
  }

  const visualPageNumbers: number[] = [];
  const visualPageAnchorPageNumbers: number[] = [];
  const visualPageTopOffsets: number[] = [];
  const visualPageBottomOffsets: number[] = [];
  const pageScrollTopsByPageNumber: Record<number, number> = {};
  const pageRowIndexesByPageNumber: Record<number, number> = {};
  const rowTopOffsets: number[] = [];
  const rowBottomOffsets: number[] = [];
  const rowHeights: number[] = [];

  let top = 0;

  rows.forEach((row, rowIndex) => {
    const rowHeight = row.reduce((maxHeight, pageNumber) => {
      const pageSize = getPageSizeOrFallback(pageSizes, pageNumber);
      return Math.max(maxHeight, pageSize.height * scale);
    }, 0);

    rowTopOffsets.push(top);
    rowBottomOffsets.push(top + rowHeight);
    rowHeights.push(rowHeight);

    row.forEach((pageNumber) => {
      visualPageNumbers.push(pageNumber);
      visualPageAnchorPageNumbers.push(pageNumber);
      visualPageTopOffsets.push(top);
      visualPageBottomOffsets.push(top + rowHeight);
      pageScrollTopsByPageNumber[pageNumber] = top;
      pageRowIndexesByPageNumber[pageNumber] = rowIndex;
    });

    top += rowHeight + pageGap;
  });

  return {
    visualPageNumbers,
    visualPageAnchorPageNumbers,
    visualPageTopOffsets,
    visualPageBottomOffsets,
    pageScrollTopsByPageNumber,
    pageRowIndexesByPageNumber,
    rowTopOffsets,
    rowBottomOffsets,
    rowHeights,
    rowPageNumbers: rows,
    totalContentHeight: Math.max(0, top - pageGap),
  };
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
    return EMPTY_PAGE_NUMBERS;
  }

  const minTop = scrollTop - viewportHeight * PDF_PAGE_RENDER_OVERSCAN_VIEWPORTS;
  const maxBottom = scrollTop + viewportHeight * (1 + PDF_PAGE_RENDER_OVERSCAN_VIEWPORTS);
  const pages = new Set<number>([currentPage]);

  if (activeMatchPageNumber !== null) {
    pages.add(activeMatchPageNumber);
  }

  visualPageNumbers.forEach((pageNumber, index) => {
    const top = pageTopOffsets[index] ?? 0;
    const bottom = pageBottomOffsets[index] ?? top;

    if (bottom >= minTop && top <= maxBottom) {
      pages.add(pageNumber);
    }
  });

  return Array.from(pages).filter(
    (pageNumber) => pageNumber >= 1 && pageNumber <= numPages,
  );
};

const buildPrefetchPageNumbers = ({
  renderedPageNumbers,
  numPages,
}: {
  renderedPageNumbers: number[];
  numPages: number;
}) => {
  if (numPages <= 0 || renderedPageNumbers.length === 0) {
    return EMPTY_PAGE_NUMBERS;
  }

  const pages = new Set<number>();

  renderedPageNumbers.forEach((pageNumber) => {
    for (
      let offset = -PDF_PAGE_PREFETCH_EXTRA_PAGES;
      offset <= PDF_PAGE_PREFETCH_EXTRA_PAGES;
      offset += 1
    ) {
      const candidate = pageNumber + offset;
      if (candidate >= 1 && candidate <= numPages) {
        pages.add(candidate);
      }
    }
  });

  return Array.from(pages).sort((left, right) => left - right);
};

const PdfViewerInner = React.forwardRef<PdfViewerHandle, PdfViewerInnerProps>(
  (
    {
      documentController,
      scale,
      minScale = 0.5,
      maxScale = 4,
      zoomStep,
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
      opaqueCanvas = false,
    },
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
      gestureScale: scale,
      minGestureScale: minScale,
      maxGestureScale: maxScale,
      zoomStep,
      onGestureScaleChange: onScaleChange,
    });

    void contentViewportEl;

    const prioritizedSearchPageNumbers = useMemo(
      () =>
        searchQuery.trim().length > 0
          ? buildRenderedPageNumbers({
            currentPage,
            activeMatchPageNumber: null,
            numPages,
            pageTopOffsets: pageLayoutMetrics.visualPageTopOffsets,
            pageBottomOffsets: pageLayoutMetrics.visualPageBottomOffsets,
            visualPageNumbers: pageLayoutMetrics.visualPageNumbers,
            scrollTop: scrollViewport.scrollTop,
            viewportHeight: scrollViewport.clientHeight,
          })
          : EMPTY_PAGE_NUMBERS,
      [
        currentPage,
        numPages,
        pageLayoutMetrics.visualPageBottomOffsets,
        pageLayoutMetrics.visualPageTopOffsets,
        pageLayoutMetrics.visualPageNumbers,
        scrollViewport.clientHeight,
        scrollViewport.scrollTop,
        searchQuery,
      ],
    );

    const {
      matches,
      activeMatchIndex,
      activeMatchPage,
      activeMatchPageNumber,
      handleSearchNavToken,
    } = usePdfSearch({
      query: searchQuery,
      numPages,
      getPageTextContent,
      prioritizedPageNumbers: prioritizedSearchPageNumbers,
    });

    useEffect(() => {
      onSearchStateChange?.({
        totalMatches: matches.length,
        activeMatchIndex,
        activeMatchPage,
      });
    }, [activeMatchIndex, activeMatchPage, matches.length, onSearchStateChange]);

    useEffect(() => {
      handleSearchNavToken(searchNavToken, searchNavDirection);
    }, [handleSearchNavToken, searchNavDirection, searchNavToken]);

    useEffect(() => {
      if (activeMatchPageNumber !== null) {
        scrollToPage(activeMatchPageNumber, { behavior: "smooth" });
      }
    }, [activeMatchPageNumber, scrollToPage]);

    useEffect(() => {
      notifyLayoutChanged();
    }, [notifyLayoutChanged, pageLayoutMetrics.totalContentHeight]);

    useEffect(() => {
      resetNavigation();
    }, [documentKey, resetNavigation]);

    useEffect(() => {
      const prefetch = buildPrefetchPageNumbers({
        renderedPageNumbers: buildRenderedPageNumbers({
          currentPage,
          activeMatchPageNumber,
          numPages,
          pageTopOffsets: pageLayoutMetrics.visualPageTopOffsets,
          pageBottomOffsets: pageLayoutMetrics.visualPageBottomOffsets,
          visualPageNumbers: pageLayoutMetrics.visualPageNumbers,
          scrollTop: scrollViewport.scrollTop,
          viewportHeight: scrollViewport.clientHeight,
        }),
        numPages,
      });

      prefetchPageResources(prefetch, { includeTextContent: true });
    }, [
      activeMatchPageNumber,
      currentPage,
      numPages,
      pageLayoutMetrics.visualPageBottomOffsets,
      pageLayoutMetrics.visualPageTopOffsets,
      pageLayoutMetrics.visualPageNumbers,
      prefetchPageResources,
      scrollViewport.clientHeight,
      scrollViewport.scrollTop,
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

    const renderedPageNumbers = buildRenderedPageNumbers({
      currentPage,
      activeMatchPageNumber,
      numPages,
      pageTopOffsets: pageLayoutMetrics.visualPageTopOffsets,
      pageBottomOffsets: pageLayoutMetrics.visualPageBottomOffsets,
      visualPageNumbers: pageLayoutMetrics.visualPageNumbers,
      scrollTop: scrollViewport.scrollTop,
      viewportHeight: scrollViewport.clientHeight,
    });

    return (
      <div className={cn("flex h-full min-h-0 flex-col", className)}>
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div
          ref={containerRef}
          data-testid="pdf-scroll-container"
          className="min-h-0 flex-1 overflow-auto overscroll-contain"
          onScroll={handleScroll}
        >
          <div
            ref={handleContentViewportRef}
            className="relative mx-auto w-max min-w-full px-4 py-4"
            style={{ minHeight: pageLayoutMetrics.totalContentHeight }}
          >
            {loading && !doc ? (
              <div className="text-center text-sm text-muted-foreground">
                PDFを読み込んでいます…
              </div>
            ) : null}

            {pageLayoutMetrics.rowPageNumbers.map((rowPageNumbers, rowIndex) => {
              const top = pageLayoutMetrics.rowTopOffsets[rowIndex] ?? 0;
              const rowHeight = pageLayoutMetrics.rowHeights[rowIndex] ?? 0;

              return (
                <div
                  key={`row-${rowPageNumbers.join("-")}`}
                  className="absolute left-0 right-0 flex justify-center"
                  style={{
                    top,
                    height: rowHeight,
                    gap: spreadGap,
                  }}
                >
                  {rowPageNumbers.map((pageNumber) => {
                    const pageSize = getPageSizeOrFallback(pageSizes, pageNumber);
                    const isRendered = renderedPageNumbers.includes(pageNumber);
                    const pageMatches = matches.filter(
                      (match) => match.pageNumber === pageNumber,
                    );
                    const activeMatch =
                      activeMatchIndex >= 0
                        ? matches[activeMatchIndex] ?? null
                        : null;

                    return (
                      <PdfPage
                        key={`${documentKey}-${pageNumber}`}
                        documentKey={documentKey}
                        pageNumber={pageNumber}
                        pageSize={pageSize}
                        scale={scale}
                        visible={isRendered}
                        acquirePage={acquirePage}
                        setPageSize={setPageSize}
                        searchMatches={pageMatches}
                        activeSearchMatch={
                          activeMatch?.pageNumber === pageNumber
                            ? activeMatch
                            : null
                        }
                        opaqueCanvas={opaqueCanvas}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  },
);

PdfViewerInner.displayName = "PdfViewerInner";

export const PdfViewer = React.forwardRef<PdfViewerHandle, PdfViewerProps>(
  (props, ref) => {
    const createdController = usePdfDocument({
      docId: "pdf-viewer",
      source: props.source ?? {},
      viewerOptions: props.viewerOptions,
      sourceMeta: props.sourceMeta,
      onNumPages: props.onNumPages ?? (() => undefined),
      onFirstPageSize: props.onFirstPageSize,
      onSourceLoadError: props.onSourceLoadError,
    });

    const controller = props.documentController ?? createdController;

    return (
      <PdfViewerInner
        ref={ref}
        documentController={controller}
        scale={props.scale}
        minScale={props.minScale}
        maxScale={props.maxScale}
        zoomStep={props.zoomStep}
        searchQuery={props.searchQuery}
        searchNavToken={props.searchNavToken}
        searchNavDirection={props.searchNavDirection}
        pageLayoutMode={props.pageLayoutMode}
        pageOrder={props.pageOrder}
        onScaleChange={props.onScaleChange}
        onPageChange={props.onPageChange}
        onSearchStateChange={props.onSearchStateChange}
        className={props.className}
        pageGap={props.pageGap}
        spreadGap={props.spreadGap}
        navigationIdentity={props.navigationIdentity}
        opaqueCanvas={props.opaqueCanvas ?? props.viewerOptions?.opaqueCanvas}
      />
    );
  },
);

PdfViewer.displayName = "PdfViewer";
