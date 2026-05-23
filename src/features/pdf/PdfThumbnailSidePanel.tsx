import { useMemo } from "react";

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

const PDF_THUMBNAIL_TARGET_WIDTH = 96;
const PDF_THUMBNAIL_FALLBACK_SCALE = 0.16;
const PDF_THUMBNAIL_MIN_SCALE = 0.08;
const PDF_THUMBNAIL_MAX_SCALE = 0.22;

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
      <div className="flex flex-col gap-3">
        {pageNumbers.map((pageNumber) => {
          const isActive =
            pageNumber === currentPage || pageNumber === alignedCurrentPage;

          return (
            <button
              key={`pdf-thumbnail-${documentController.documentKey}-${pageNumber}`}
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
        })}
      </div>
    );
  };

  return (
    <aside className="flex h-full w-[168px] shrink-0 flex-col border-r border-[#e5e4df] bg-[#f8f8f6]">
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
