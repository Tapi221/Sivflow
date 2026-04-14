import React, {
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
import { extractTextItems, findPageSearchMatches } from "./pdfTextSearch";
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

    const {
      containerRef,
      scrollContainerEl,
      currentPage,
      handleScroll,
      handleVisibilityChange,
      registerPageRef,
      notifyLayoutChanged,
      resetNavigation,
      scrollToPage,
      getScrollDiagnostics,
      logScrollDiagnostics,
    } = usePdfCurrentPage({
      numPages,
      onPageChange,
    });

    usePdfZoom({
      container: scrollContainerEl,
      scale,
      minScale,
      maxScale,
      zoomStep,
      onScaleChange,
    });

    const [pageMatches, setPageMatches] = useState<
      Record<number, PdfPageSearchMatch[]>
    >({});
    const [activeMatchIndex, setActiveMatchIndex] = useState(-1);
    const normalizedSearchQuery = searchQuery.trim();
    const lastSearchNavTokenRef = useRef(searchNavToken);

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
      setPageMatches({});
      setActiveMatchIndex(-1);
    }, [
      normalizedLocalFileId,
      normalizedSourceData,
      normalizedSourceUrl,
      resetNavigation,
    ]);

    useEffect(() => {
      if (!doc) {
        setPageMatches({});
        setActiveMatchIndex(-1);
        return;
      }

      if (!normalizedSearchQuery) {
        setPageMatches({});
        setActiveMatchIndex(-1);
        return;
      }

      let cancelled = false;

      const run = async () => {
        const nextMatches: Record<number, PdfPageSearchMatch[]> = {};
        let globalOffset = 0;

        for (const pageNumber of pageNumbers) {
          const textContent = await getPageTextContent(pageNumber);
          if (cancelled) {
            return;
          }

          const matches = findPageSearchMatches({
            pageNumber,
            textItems: extractTextItems(textContent),
            query: normalizedSearchQuery,
            globalOffset,
          });

          globalOffset += matches.length;
          nextMatches[pageNumber] = matches;
        }

        if (cancelled) {
          return;
        }

        setPageMatches(nextMatches);
        setActiveMatchIndex(globalOffset > 0 ? 0 : -1);
      };

      void run();

      return () => {
        cancelled = true;
      };
    }, [doc, getPageTextContent, normalizedSearchQuery, pageNumbers]);

    const flattenedMatches = useMemo(
      () =>
        Object.values(pageMatches)
          .flat()
          .sort((left, right) => left.globalIndex - right.globalIndex),
      [pageMatches],
    );

    const activeMatchPageNumber = useMemo(() => {
      if (activeMatchIndex < 0 || activeMatchIndex >= flattenedMatches.length) {
        return null;
      }

      return flattenedMatches[activeMatchIndex]?.pageNumber ?? null;
    }, [activeMatchIndex, flattenedMatches]);

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
    }, [doc, notifyLayoutChanged, scale]);

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
              className="flex flex-col items-center"
              style={{ gap: `${pageGap}px` }}
            >
              {pageNumbers.map((pageNumber) => {
                const inWindow =
                  Math.abs(pageNumber - currentPage) <= PDF_PAGE_WINDOW_SIZE;

                const baseSize = pageSizes[pageNumber] ?? pageSizes[1];
                const placeholderHeight =
                  baseSize && baseSize.height > 0
                    ? Math.max(1, Math.floor(baseSize.height * scale))
                    : PDF_PAGE_PLACEHOLDER_FALLBACK_HEIGHT;
                const pageSearchMatches = pageMatches[pageNumber] ?? [];
                const activeSearchMatchIndexForPage =
                  activeMatchPageNumber === pageNumber
                    ? activeMatchIndex
                    : undefined;

                return (
                  <div
                    key={`pdf-row-${pageNumber}`}
                    ref={(el) => {
                      registerPageRef(pageNumber, el);
                    }}
                    className="flex w-full justify-center"
                    style={{ minHeight: `${placeholderHeight}px` }}
                  >
                    {inWindow ? (
                      <PdfPage
                        pdf={doc}
                        pageNumber={pageNumber}
                        scale={scale}
                        baseSize={pageSizes[pageNumber]}
                        rootEl={scrollContainerEl}
                        opaqueCanvas={resolvedOpaqueCanvas}
                        searchMatches={pageSearchMatches}
                        activeSearchMatchIndex={activeSearchMatchIndexForPage}
                        getPage={getPage}
                        getPageTextContent={getPageTextContent}
                        onPageSize={setPageSize}
                        onVisibilityChange={handleVisibilityChange}
                      />
                    ) : (
                      <div className="w-full" />
                    )}
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
