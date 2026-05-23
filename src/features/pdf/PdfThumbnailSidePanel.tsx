import { useEffect, useMemo, useRef, useState } from "react";

import type { PdfDocumentController } from "@/features/pdf/hooks/usePdfDocument";
import { PdfPage } from "@/features/pdf/PdfPage";

import { cn } from "@/lib/utils";

interface PdfThumbnailSidePanelProps {
  documentController: PdfDocumentController;
  numPages: number;
  normalizedThumbnailOrder: number[];
  firstPageSize: { width: number; height: number } | null;
  currentPage: number;
  alignedCurrentPage: number;
  opaqueCanvas: boolean;
  scrollToPage: (pageNumber: number) => void;
  onClose?: () => void;
}

interface PdfThumbnailPageButtonProps {
  documentController: PdfDocumentController;
  pdfDocument: NonNullable<PdfDocumentController["doc"]>;
  pageNumber: number;
  thumbnailScale: number;
  fallbackPageSize: { width: number; height: number } | null;
  isActive: boolean;
  opaqueCanvas: boolean;
  scrollToPage: (pageNumber: number) => void;
}

const PDF_THUMBNAIL_TARGET_WIDTH = 78;
const PDF_THUMBNAIL_FALLBACK_SCALE = 0.13;
const PDF_THUMBNAIL_MIN_SCALE = 0.08;
const PDF_THUMBNAIL_MAX_SCALE = 0.18;
const PDF_THUMBNAIL_PRELOAD_MARGIN_PX = 360;
const PDF_THUMBNAIL_FALLBACK_WIDTH = 78;
const PDF_THUMBNAIL_FALLBACK_HEIGHT = 104;

const resolvePdfThumbnailScale = (pageWidth: number | null | undefined) => {
  if (!pageWidth || !Number.isFinite(pageWidth) || pageWidth <= 0) {
    return PDF_THUMBNAIL_FALLBACK_SCALE;
  }

  const nextScale = Number((PDF_THUMBNAIL_TARGET_WIDTH / pageWidth).toFixed(3));

  return Math.min(
    PDF_THUMBNAIL_MAX_SCALE,
    Math.max(PDF_THUMBNAIL_MIN_SCALE, nextScale),
  );
};

const resolveThumbnailPlaceholderSize = ({
  pageSize,
  fallbackPageSize,
  thumbnailScale,
}: {
  pageSize: { width: number; height: number } | undefined;
  fallbackPageSize: { width: number; height: number } | null;
  thumbnailScale: number;
}) => {
  const resolvedPageSize = pageSize ?? fallbackPageSize;

  if (
    resolvedPageSize &&
    Number.isFinite(resolvedPageSize.width) &&
    Number.isFinite(resolvedPageSize.height) &&
    resolvedPageSize.width > 0 &&
    resolvedPageSize.height > 0
  ) {
    return {
      width: Math.max(1, Math.floor(resolvedPageSize.width * thumbnailScale)),
      height: Math.max(1, Math.floor(resolvedPageSize.height * thumbnailScale)),
    };
  }

  return {
    width: PDF_THUMBNAIL_FALLBACK_WIDTH,
    height: PDF_THUMBNAIL_FALLBACK_HEIGHT,
  };
};

const PdfThumbnailPageButton = ({
  documentController,
  pdfDocument,
  pageNumber,
  thumbnailScale,
  fallbackPageSize,
  isActive,
  opaqueCanvas,
  scrollToPage,
}: PdfThumbnailPageButtonProps) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [shouldRenderThumbnail, setShouldRenderThumbnail] = useState(isActive);
  const placeholderSize = resolveThumbnailPlaceholderSize({
    pageSize: documentController.pageSizes[pageNumber],
    fallbackPageSize,
    thumbnailScale,
  });

  useEffect(() => {
    if (isActive) {
      setShouldRenderThumbnail(true);
    }
  }, [isActive]);

  useEffect(() => {
    const element = buttonRef.current;
    if (!element || shouldRenderThumbnail) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setShouldRenderThumbnail(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setShouldRenderThumbnail(true);
          observer.disconnect();
        }
      },
      {
        root: null,
        rootMargin: `${PDF_THUMBNAIL_PRELOAD_MARGIN_PX}px 0px`,
        threshold: 0,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [shouldRenderThumbnail]);

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-current={isActive ? "page" : undefined}
      aria-label={`${pageNumber}ページへ移動`}
      className={cn(
        "group flex w-full flex-col items-center rounded-xl border px-2 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8a49a]",
        isActive
          ? "border-[#b8b4a9] bg-white shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
          : "border-transparent bg-transparent hover:border-[#e2e1dc] hover:bg-white",
      )}
      onClick={() => scrollToPage(pageNumber)}
    >
      <div className="pointer-events-none max-w-full overflow-hidden rounded-lg bg-white">
        {shouldRenderThumbnail ? (
          <PdfPage
            documentKey={`${documentController.documentKey}-thumbnail`}
            pdf={pdfDocument}
            pageNumber={pageNumber}
            scale={thumbnailScale}
            baseSize={documentController.pageSizes[pageNumber]}
            opaqueCanvas={opaqueCanvas}
            renderTextLayer={false}
            acquirePage={documentController.acquirePage}
            getPageTextContent={documentController.getPageTextContent}
            onPageSize={documentController.setPageSize}
          />
        ) : (
          <div
            aria-hidden="true"
            className="rounded-lg border border-[#eeede8] bg-[#f1f0ec]"
            style={{
              width: `${placeholderSize.width}px`,
              height: `${placeholderSize.height}px`,
            }}
          />
        )}
      </div>
      <span
        className={cn(
          "mt-2 text-[11px] font-medium",
          isActive ? "text-[#2f2e2a]" : "text-[#8b8a84]",
        )}
      >
        {pageNumber}
      </span>
    </button>
  );
};

export const PdfThumbnailSidePanel = ({
  documentController,
  numPages,
  normalizedThumbnailOrder,
  firstPageSize,
  currentPage,
  alignedCurrentPage,
  opaqueCanvas,
  scrollToPage,
  onClose,
}: PdfThumbnailSidePanelProps) => {
  const pdfDocument = documentController.doc;
  const pageNumbers = numPages > 0 ? normalizedThumbnailOrder : [];
  const thumbnailScale = useMemo(
    () => resolvePdfThumbnailScale(firstPageSize?.width),
    [firstPageSize?.width],
  );

  const renderBody = () => {
    if (documentController.loading) {
      return (
        <div className="rounded-xl border border-dashed border-[#e2e1dc] bg-white px-3 py-4 text-center text-[12px] text-[#8b8a84]">
          サムネイルを読み込んでいます...
        </div>
      );
    }

    if (documentController.error) {
      return (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-4 text-[12px] leading-5 text-rose-600">
          {documentController.error}
        </div>
      );
    }

    if (!pdfDocument || pageNumbers.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-[#e2e1dc] bg-white px-3 py-4 text-center text-[12px] text-[#8b8a84]">
          表示できるページがありません。
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 items-start gap-x-3 gap-y-4">
        {pageNumbers.map((pageNumber) => {
          const isActive =
            pageNumber === currentPage || pageNumber === alignedCurrentPage;

          return (
            <PdfThumbnailPageButton
              key={`pdf-thumbnail-${documentController.documentKey}-${pageNumber}`}
              documentController={documentController}
              pdfDocument={pdfDocument}
              pageNumber={pageNumber}
              thumbnailScale={thumbnailScale}
              fallbackPageSize={firstPageSize}
              isActive={isActive}
              opaqueCanvas={opaqueCanvas}
              scrollToPage={scrollToPage}
            />
          );
        })}
      </div>
    );
  };

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-[#e5e4df] bg-[#f8f8f6]">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#e5e4df] px-3">
        <div className="min-w-0 truncate text-[12px] font-semibold text-[#2f2e2a]">
          サムネイル
        </div>
        {onClose ? (
          <button
            type="button"
            aria-label="サムネイルを閉じる"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[16px] leading-none text-[#8b8a84] transition-colors hover:bg-white hover:text-[#2f2e2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8a49a]"
            onClick={onClose}
          >
            ×
          </button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {renderBody()}
      </div>
    </aside>
  );
};
