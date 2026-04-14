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
} from "./pdfViewerConstants";
import { usePdfCurrentPage } from "./hooks/usePdfCurrentPage";
import { usePdfDocument } from "./hooks/usePdfDocument";
import { usePdfZoom } from "./hooks/usePdfZoom";
import {
  buildPageSearchIndex,
  findPageSearchMatches,
  type PdfPageSearchIndex,
} from "./pdfTextSearch";
import type {
  PageSize,
  PdfPageSearchMatch,
  PdfScaleChangeSource,
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
  onScaleChange?: (nextScale: number, source: PdfScaleChangeSource) => void;
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

const EMPTY_SEARCH_MATCHES: PdfPageSearchMatch[] = [];
const SEARCH_INDEX_CONCURRENCY = 6;

const buildSearchIndexMap = async ({
  pageNumbers,
  getPageSearchIndex,
  concurrency,
}: {
  pageNumbers: number[];
  getPageSearchIndex: (pageNumber: number) => Promise<PdfPageSearchIndex>;
  concurrency: number;
}) => {
  const limitedConcurrency = Math.max(
    1,
    Math.min(concurrency, pageNumbers.length || 1),
  );
  const searchIndexMap = new Map<number, PdfPageSearchIndex>();
  let cursor = 0;

  const worker = async () => {
    while (cursor < pageNumbers.length) {
      const currentIndex = cursor;
      cursor += 1;

      const pageNumber = pageNumbers[currentIndex];
      if (typeof pageNumber !== "number") {
        return;
      }

      const searchIndex = await getPageSearchIndex(pageNumber);
      searchIndexMap.set(pageNumber, searchIndex);
    }
  };

  await Promise.all(Array.from({ length: limitedConcurrency }, () => worker()));

  return searchIndexMap;
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

    const [pageMatches, setPageMatches] = useState<
      Record<number, PdfPageSearchMatch[]>
    >({});
    const [flattenedMatches, setFlattenedMatches] = useState<
      PdfPageSearchMatch[]
    >([]);
    const [activeMatchIndex, setActiveMatchIndex] = useState(-1);
    const normalizedSearchQuery = searchQuery.trim();
    const lastSearchNavTokenRef = useRef(searchNavToken);
    const searchIndexPromiseCacheRef = useRef<
      Map<number, Promise<PdfPageSearchIndex>>
    >(new Map());

    const normalizedSourceUrl =
      typeof source?.url === "string" ? source.url.trim() : "";
    const normalizedSourceData =
      source?.data instanceof Uint8Array ? source.data : null;
    const normalizedLocalFileId = sourceMeta?.localFileId ?? null;

    const previousSourceIdentityRef = useRef<{
      url: string;
      data: Uint8Array | null;
      localFileId: string | null;
    } | null>(null);

    const pageNumbers = useMemo(
      () => Array.from({ length: numPages }, (_, index) => index + 1),
      [numPages],
    );
    const resolvedOpaqueCanvas = viewerOptions?.opaqueCanvas ?? false;

    const resetSearchIndexCache = useCallback(() => {
      searchIndexPromiseCacheRef.current.clear();
    }, []);

    const getPageSearchIndex = useCallback(
      (pageNumber: number): Promise<PdfPageSearchIndex> => {
        const safePageNumber = Math.max(1, Math.floor(pageNumber));
        const existingPromise =
          searchIndexPromiseCacheRef.current.get(safePageNumber);
        if (existingPromise) {
          return existingPromise;
        }

        const nextPromise = getPageTextContent(safePageNumber)
          .then((textContent) => buildPageSearchIndex(textContent))
          .catch((errorValue) => {
            searchIndexPromiseCacheRef.current.delete(safePageNumber);
            throw errorValue;
          });

        searchIndexPromiseCacheRef.current.set(safePageNumber, nextPromise);
        return nextPromise;
      },
      [getPageTextContent],
    );

    useEffect(() => {
      const nextIdentity = {
        url: normalizedSourceUrl,
        data: normalizedSourceData,
        localFileId: normalizedLocalFileId,
      };

      const previousIdentity = previousSourceIdentityRef.current;
      previousSourceIdentityRef.current = nextIdentity;

      if (!previousIdentity) {
        resetSearchIndexCache();
        return;
      }

      const sourceChanged =
        previousIdentity.url !== nextIdentity.url ||
        previousIdentity.data !== nextIdentity.data ||
        previousIdentity.localFileId !== nextIdentity.localFileId;

      if (!sourceChanged) {
        return;
      }

      resetSearchIndexCache();
      resetNavigation();
      setPageMatches({});
      setFlattenedMatches([]);
      setActiveMatchIndex(-1);
    }, [
      normalizedLocalFileId,
      normalizedSourceData,
      normalizedSourceUrl,
      resetNavigation,
      resetSearchIndexCache,
    ]);

    useEffect(() => {
      if (!doc) {
        resetSearchIndexCache();
        setPageMatches({});
        setFlattenedMatches([]);
        setActiveMatchIndex(-1);
        return;
      }

      if (!normalizedSearchQuery) {
        setPageMatches({});
        setFlattenedMatches([]);
        setActiveMatchIndex(-1);
        return;
      }

      let cancelled = false;

      const run = async () => {
        const searchIndexMap = await buildSearchIndexMap({
          pageNumbers,
          getPageSearchIndex,
          concurrency: SEARCH_INDEX_CONCURRENCY,
        });

        if (cancelled) {
          return;
        }

        const nextMatches: Record<number, PdfPageSearchMatch[]> = {};
        const nextFlattenedMatches: PdfPageSearchMatch[] = [];
        let globalOffset = 0;

        for (const pageNumber of pageNumbers) {
          const searchIndex = searchIndexMap.get(pageNumber);
          if (!searchIndex) {
            nextMatches[pageNumber] = EMPTY_SEARCH_MATCHES;
            continue;
          }

          const matches = findPageSearchMatches({
            pageNumber,
            searchIndex,
            query: normalizedSearchQuery,
            globalOffset,
          });

          globalOffset += matches.length;
          nextMatches[pageNumber] = matches;
          nextFlattenedMatches.push(...matches);
        }

        if (cancelled) {
          return;
        }

        setPageMatches(nextMatches);
        setFlattenedMatches(nextFlattenedMatches);
        setActiveMatchIndex(nextFlattenedMatches.length > 0 ? 0 : -1);
      };

      void run();

      return () => {
        cancelled = true;
      };
    }, [
      doc,
      getPageSearchIndex,
      normalizedSearchQuery,
      pageNumbers,
      resetSearchIndexCache,
    ]);

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

    useEffect(() => {
      if (flattenedMatches.length === 0) {
        onSearchStateChange?.({
          totalMatches: 0,
          activeMatchIndex: -1,
          activeMatchPage: null,
        });
        return;
      }

      const clampedIndex = Math.min(
        Math.max(activeMatchIndex, 0),
        flattenedMatches.length - 1,
      );
      const activeMatch = flattenedMatches[clampedIndex] ?? null;

      onSearchStateChange?.({
        totalMatches: flattenedMatches.length,
        activeMatchIndex: clampedIndex,
        activeMatchPage: activeMatch?.pageNumber ?? null,
      });
    }, [activeMatchIndex, flattenedMatches, onSearchStateChange]);

    useEffect(() => {
      if (searchNavToken === lastSearchNavTokenRef.current) {
        return;
      }

      lastSearchNavTokenRef.current = searchNavToken;

      if (flattenedMatches.length === 0) {
        return;
      }

      setActiveMatchIndex((previous) => {
        const baseIndex = previous < 0 ? 0 : previous;
        const delta = searchNavDirection === "prev" ? -1 : 1;
        const nextIndex =
          (baseIndex + delta + flattenedMatches.length) %
          flattenedMatches.length;
        return nextIndex;
      });
    }, [flattenedMatches.length, searchNavDirection, searchNavToken]);

    useEffect(() => {
      if (!doc) return;
      notifyLayoutChanged();
    }, [doc, notifyLayoutChanged, pageLayoutMetrics.pageTopOffsets, scale]);

    useEffect(() => {
      if (activeMatchIndex < 0 || activeMatchIndex >= flattenedMatches.length) {
        return;
      }

      const match = flattenedMatches[activeMatchIndex];
      scrollToPage(match.pageNumber);
    }, [activeMatchIndex, flattenedMatches, scrollToPage]);

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
                  pageMatches[pageNumber] ?? EMPTY_SEARCH_MATCHES;
                const activeSearchMatchIndexForPage =
                  activeMatchPageNumber === pageNumber
                    ? activeMatchIndex
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
                      opaqueCanvas={resolvedOpaqueCanvas}
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
