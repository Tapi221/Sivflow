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
  PDF_PAGE_WINDOW_SIZE,
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

    runningTop += pageHeight;

    if (index < numPages - 1) {
      runningTop += pageGap;
    }
  }

  return {
    pageTopOffsets,
    pageHeights,
    totalContentHeight: Math.max(runningTop, 1),
  };
};

const buildRenderedPageNumbers = ({
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

  const renderedPageSet = new Set<number>();

  for (
    let pageNumber = Math.max(1, currentPage - PDF_PAGE_WINDOW_SIZE);
    pageNumber <= Math.min(numPages, currentPage + PDF_PAGE_WINDOW_SIZE);
    pageNumber += 1
  ) {
    renderedPageSet.add(pageNumber);
  }

  if (typeof activeMatchPageNumber === "number") {
    for (
      let pageNumber = Math.max(1, activeMatchPageNumber - 1);
      pageNumber <= Math.min(numPages, activeMatchPageNumber + 1);
      pageNumber += 1
    ) {
      renderedPageSet.add(pageNumber);
    }
  }

  return Array.from(renderedPageSet).sort((left, right) => left - right);
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
      numPages,
      pageSizes,
      loading,
      error,
      setPageSize,
      getPage,
      getPageTextContent,
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

    const emptyRenderedPageNumbers = useMemo(() => [] as number[], []);
    const {
      pageMatches,
      flattenedMatches,
      activeMatchIndex,
    } = usePdfSearch({
      doc,
      numPages,
      currentPage,
      renderedPageNumbers: emptyRenderedPageNumbers,
      searchQuery,
      searchNavToken,
      searchNavDirection,
      getPageTextContent,
    });

    const activeMatchPageNumber = useMemo(() => {
      if (activeMatchIndex < 0 || activeMatchIndex >= flattenedMatches.length) {
        return null;
      }

      return flattenedMatches[activeMatchIndex]?.pageNumber ?? null;
    }, [activeMatchIndex, flattenedMatches]);

    const renderedPageNumbers = useMemo(
      () =>
        buildRenderedPageNumbers({
          currentPage,
          activeMatchPageNumber,
          numPages,
        }),
      [activeMatchPageNumber, currentPage, numPages],
    );

    const {
      pageMatches: prioritizedPageMatches,
      flattenedMatches: prioritizedFlattenedMatches,
      activeMatchIndex: prioritizedActiveMatchIndex,
    } = usePdfSearch({
      doc,
      numPages,
      currentPage,
      renderedPageNumbers,
      searchQuery,
      searchNavToken,
      searchNavDirection,
      getPageTextContent,
    });

    const effectivePageMatches =
      Object.keys(prioritizedPageMatches).length > 0 || !searchQuery.trim()
        ? prioritizedPageMatches
        : pageMatches;

    const effectiveFlattenedMatches =
      prioritizedFlattenedMatches.length > 0 || !searchQuery.trim()
        ? prioritizedFlattenedMatches
        : flattenedMatches;

    const effectiveActiveMatchIndex =
      prioritizedFlattenedMatches.length > 0 || !searchQuery.trim()
        ? prioritizedActiveMatchIndex
        : activeMatchIndex;

    const effectiveActiveMatchPageNumber = useMemo(() => {
      if (
        effectiveActiveMatchIndex < 0 ||
        effectiveActiveMatchIndex >= effectiveFlattenedMatches.length
      ) {
        return null;
      }

      return effectiveFlattenedMatches[effectiveActiveMatchIndex]?.pageNumber ?? null;
    }, [effectiveActiveMatchIndex, effectiveFlattenedMatches]);

    const resolvedRenderedPageNumbers = useMemo(
      () =>
        buildRenderedPageNumbers({
          currentPage,
          activeMatchPageNumber: effectiveActiveMatchPageNumber,
          numPages,
        }),
      [currentPage, effectiveActiveMatchPageNumber, numPages],
    );

    useEffect(() => {
      if (effectiveFlattenedMatches.length === 0) {
        onSearchStateChange?.({
          totalMatches: 0,
          activeMatchIndex: -1,
          activeMatchPage: null,
        });
        return;
      }

      const clampedIndex = Math.min(
        Math.max(effectiveActiveMatchIndex, 0),
        effectiveFlattenedMatches.length - 1,
      );
      const activeMatch = effectiveFlattenedMatches[clampedIndex] ?? null;

      onSearchStateChange?.({
        totalMatches: effectiveFlattenedMatches.length,
        activeMatchIndex: clampedIndex,
        activeMatchPage: activeMatch?.pageNumber ?? null,
      });
    }, [
      effectiveActiveMatchIndex,
      effectiveFlattenedMatches,
      onSearchStateChange,
    ]);

    useEffect(() => {
      if (!doc) return;
      notifyLayoutChanged();
    }, [doc, notifyLayoutChanged, pageLayoutMetrics.pageTopOffsets, scale]);

    useEffect(() => {
      if (
        effectiveActiveMatchIndex < 0 ||
        effectiveActiveMatchIndex >= effectiveFlattenedMatches.length
      ) {
        return;
      }

      const match = effectiveFlattenedMatches[effectiveActiveMatchIndex];
      scrollToPage(match.pageNumber);
    }, [effectiveActiveMatchIndex, effectiveFlattenedMatches, scrollToPage]);

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
            <div className="mb-2 text-xs text-slate-400">試み込み中...</div>
          )}

          {error && <div className="text-sm text-rose-500">{error}</div>}

          {!error && doc && (
            <div
              ref={handleContentViewportRef}
              className="relative w-full"
              style={{ height: `${pageLayoutMetrics.totalContentHeight}px` }}
            >
              {resolvedRenderedPageNumbers.map((pageNumber) => {
                const pageTop = pageLayoutMetrics.pageTopOffsets[pageNumber - 1] ?? 0;
                const placeholderHeight =
                  pageLayoutMetrics.pageHeights[pageNumber - 1] ??
                  PDF_PAGE_PLACEHOLDER_FALLBACK_HEIGHT;
                const pageSearchMatches = effectivePageMatches[pageNumber] ?? [];
                const activeSearchMatchIndexForPage =
                  effectiveActiveMatchPageNumber === pageNumber
                    ? effectiveActiveMatchIndex
                    : undefined;

                return (
                  <div
                    key={`pdf-row-${pageNumber}`}
                    className="absolute left-0 right-0 flex justify-center"
                    style={{
                      top: `${pageTop}px`,
                      minHeight: `${placeholderHeight}px`,
                    }}
                  >
                    <PdfPage
                      pdf={doc}
                      pageNumber={pageNumber}
                      scale={scale}
                      baseSize={pageSizes[pageNumber]}
                      opaqueCanvas={viewerOptions?.opaqueCanvas ?? false}
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
