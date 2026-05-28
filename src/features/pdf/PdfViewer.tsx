import React, { useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { type PdfDocumentController, usePdfDocument } from "@/features/pdf/hooks/usePdfDocument";
import { usePdfSearch } from "@/features/pdf/hooks/usePdfSearch";
import { buildPdfPageLayoutMetrics, getPdfPageSizeOrFallback, normalizePdfPageOrder } from "@/features/scroll/pdf/pdfScrollLayout";
import { EMPTY_PDF_RENDER_PAGE_NUMBERS, buildPdfPrefetchPageNumbers, buildPdfRenderedPageNumbers } from "@/features/scroll/pdf/pdfScrollRenderWindow";
import { usePdfCurrentPage } from "@/features/scroll/pdf/usePdfCurrentPage";
import { usePdfZoom } from "@/features/zoom/pdf/usePdfZoom";
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

interface PdfViewerInnerProps extends PdfViewerCommonProps {
  documentController: PdfDocumentController;
}

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
      () => normalizePdfPageOrder(pageOrder, numPages),
      [numPages, pageOrder],
    );

    const pageLayoutMetrics = useMemo(
      () =>
        buildPdfPageLayoutMetrics({
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
          ? buildPdfRenderedPageNumbers({
            currentPage,
            activeMatchPageNumber: null,
            numPages,
            pageTopOffsets: pageLayoutMetrics.visualPageTopOffsets,
            pageBottomOffsets: pageLayoutMetrics.visualPageBottomOffsets,
            visualPageNumbers: pageLayoutMetrics.visualPageNumbers,
            scrollTop: scrollViewport.scrollTop,
            viewportHeight: scrollViewport.clientHeight,
          })
          : EMPTY_PDF_RENDER_PAGE_NUMBERS,
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
      const prefetch = buildPdfPrefetchPageNumbers({
        renderedPageNumbers: buildPdfRenderedPageNumbers({
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

    const renderedPageNumbers = buildPdfRenderedPageNumbers({
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

            {doc ? pageLayoutMetrics.rowPageNumbers.map((rowPageNumbers, rowIndex) => {
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
                    const pageSize = getPdfPageSizeOrFallback(pageSizes, pageNumber);
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
                        pdf={doc}
                        pageNumber={pageNumber}
                        baseSize={pageSize}
                        scale={scale}
                        opaqueCanvas={opaqueCanvas}
                        renderTextLayer={isRendered}
                        acquirePage={acquirePage}
                        getPageTextContent={getPageTextContent}
                        onPageSize={setPageSize}
                        searchMatches={pageMatches}
                        activeSearchMatchIndex={
                          activeMatch?.pageNumber === pageNumber
                            ? activeMatch.globalIndex
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              );
            }) : null}
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
