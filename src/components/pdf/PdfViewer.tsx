import React, { useEffect, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";
import { PdfPage } from "./PdfPage";
import {
  PDF_PAGE_PLACEHOLDER_FALLBACK_HEIGHT,
  PDF_PAGE_WINDOW_SIZE,
} from "./pdfViewerConstants";
import { usePdfCurrentPage } from "./hooks/usePdfCurrentPage";
import { usePdfDocument } from "./hooks/usePdfDocument";
import { usePdfZoom } from "./hooks/usePdfZoom";
import type {
  PageSize,
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
  onScaleChange?: (nextScale: number, source: PdfScaleChangeSource) => void;
  onNumPages: (n: number) => void;
  onFirstPageSize?: (size: PageSize | null) => void;
  onPageChange?: (page: number) => void;
  onSourceLoadError?: (details: {
    kind: SourceLoadErrorKind;
    url: string | null;
    message: string;
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
      onScaleChange,
      onNumPages,
      onFirstPageSize,
      onPageChange,
      onSourceLoadError,
      className,
      pageGap = 16,
      viewerOptions,
      sourceMeta,
    }: PdfViewerProps,
    ref,
  ) => {
    const { doc, numPages, pageSizes, loading, error, setPageSize } =
      usePdfDocument({
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

    useEffect(() => {
      if (!doc) return;
      notifyLayoutChanged();
    }, [doc, notifyLayoutChanged, scale]);

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
              {Array.from({ length: numPages }).map((_, index) => {
                const pageNumber = index + 1;
                const inWindow =
                  Math.abs(pageNumber - currentPage) <= PDF_PAGE_WINDOW_SIZE;

                const baseSize = pageSizes[pageNumber] ?? pageSizes[1];
                const placeholderHeight =
                  baseSize && baseSize.height > 0
                    ? Math.max(1, Math.floor(baseSize.height * scale))
                    : PDF_PAGE_PLACEHOLDER_FALLBACK_HEIGHT;

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
                        opaqueCanvas={viewerOptions?.opaqueCanvas ?? false}
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
