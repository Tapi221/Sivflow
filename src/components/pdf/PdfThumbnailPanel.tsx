import { useCallback, useMemo, useState } from "react";
import type { PdfPageLayoutMode } from "@/types";
import { cn } from "@/lib/utils";
import type { PdfDocumentController } from "./hooks/usePdfDocument";
import { PdfThumbnailItem } from "./PdfThumbnailItem";

const DESKTOP_PANEL_WIDTH_PX = 320;
const DESKTOP_PANEL_COLLAPSED_WIDTH_PX = 56;

const PDF_THUMBNAIL_PANEL_COLORS = {
  accent: "#D8AFB5",
  surfaceSoft: "#F5EBE9",
  surfaceMuted: "#F1E2E1",
  surfacePaper: "#F8F7F5",
  surfaceBlush: "#F7EFED",
  textStrong: "#5E545B",
  textMuted: "#8C7C83",
  shadow: "0 12px 28px rgba(216, 175, 181, 0.22)",
} as const;

interface PdfThumbnailPanelProps {
  documentController: PdfDocumentController;
  currentPage: number;
  pageLayoutMode: PdfPageLayoutMode;
  bookmarkedPageNumbers: ReadonlySet<number>;
  isMobileViewport: boolean;
  isOpen: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  onSelectPage: (pageNumber: number) => void;
  onToggleBookmark: (pageNumber: number) => void;
}

interface IconProps {
  className?: string;
}

const GridIcon = ({ className }: IconProps) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className={className}
    >
      <rect x="3" y="3" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="12" y="3" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="3" y="12" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="12" y="12" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
};

const ChevronLeftIcon = ({ className }: IconProps) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className={className}
    >
      <path
        d="M11.75 4.5 6.25 10l5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const ChevronRightIcon = ({ className }: IconProps) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className={className}
    >
      <path
        d="m8.25 4.5 5.5 5.5-5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const XIcon = ({ className }: IconProps) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className={className}
    >
      <path
        d="m5 5 10 10M15 5 5 15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
};

const buildPageNumbers = (numPages: number) => {
  return Array.from({ length: numPages }, (_, index) => index + 1);
};

export const PdfThumbnailPanel = ({
  documentController,
  currentPage,
  pageLayoutMode,
  bookmarkedPageNumbers,
  isMobileViewport,
  isOpen,
  onOpenChange,
  onSelectPage,
  onToggleBookmark,
}: PdfThumbnailPanelProps) => {
  const [scrollRootElement, setScrollRootElement] = useState<HTMLElement | null>(
    null,
  );

  const pageNumbers = useMemo(
    () => buildPageNumbers(documentController.numPages),
    [documentController.numPages],
  );

  const activePageNumbers = useMemo(() => {
    const nextActivePageNumbers = new Set<number>([currentPage]);

    if (
      pageLayoutMode === "double" &&
      currentPage >= 1 &&
      currentPage < documentController.numPages
    ) {
      nextActivePageNumbers.add(currentPage + 1);
    }

    return nextActivePageNumbers;
  }, [currentPage, documentController.numPages, pageLayoutMode]);

  const bookmarkCount = bookmarkedPageNumbers.size;

  const handleScrollRootRef = useCallback((element: HTMLDivElement | null) => {
    setScrollRootElement((previousElement) =>
      previousElement === element ? previousElement : element,
    );
  }, []);

  const panelListContent = (
    <>
      {documentController.loading && pageNumbers.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 p-4">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={`pdf-thumbnail-skeleton-${index}`}
              className="flex flex-col gap-2 rounded-[20px] border p-2"
              style={{
                borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
                background: PDF_THUMBNAIL_PANEL_COLORS.surfacePaper,
              }}
            >
              <div className="aspect-[210/297] rounded-[16px] border"
                style={{
                  borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
                  background: PDF_THUMBNAIL_PANEL_COLORS.surfaceBlush,
                }} />
              <div className="h-3 w-10 rounded-full bg-white/80" />
            </div>
          ))}
        </div>
      ) : null}

      {!documentController.loading && documentController.error ? (
        <div className="px-4 py-6 text-sm"
          style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}>
          ページ一覧を準備できませんでした。
        </div>
      ) : null}

      {!documentController.loading &&
      !documentController.error &&
      pageNumbers.length === 0 ? (
        <div className="px-4 py-6 text-sm"
          style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}>
          ページ情報を読み込み中です。
        </div>
      ) : null}

      {pageNumbers.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 p-4">
          {pageNumbers.map((pageNumber) => {
            return (
              <PdfThumbnailItem
                key={`pdf-thumbnail-${documentController.documentKey}-${pageNumber}`}
                documentKey={documentController.documentKey}
                pageNumber={pageNumber}
                baseSize={documentController.pageSizes[pageNumber]}
                isActive={activePageNumbers.has(pageNumber)}
                isBookmarked={bookmarkedPageNumbers.has(pageNumber)}
                onSelect={onSelectPage}
                onToggleBookmark={onToggleBookmark}
                rootElement={scrollRootElement}
                acquirePage={documentController.acquirePage}
                setPageSize={documentController.setPageSize}
              />
            );
          })}
        </div>
      ) : null}
    </>
  );

  if (isMobileViewport) {
    return (
      <>
        <button
          type="button"
          aria-label={isOpen ? "ページ一覧を閉じる" : "ページ一覧を開く"}
          onClick={() => onOpenChange(!isOpen)}
          className="absolute left-3 top-3 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-sm transition-colors duration-150"
          style={{
            color: PDF_THUMBNAIL_PANEL_COLORS.textStrong,
            background: "rgba(248, 247, 245, 0.94)",
            borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
            boxShadow: "0 10px 22px rgba(216, 175, 181, 0.18)",
          }}
        >
          {isOpen ? (
            <XIcon className="h-4 w-4" />
          ) : (
            <GridIcon className="h-4 w-4" />
          )}
        </button>

        {isOpen ? (
          <button
            type="button"
            aria-label="ページ一覧を閉じる"
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 z-20 bg-black/10 backdrop-blur-[1px]"
          />
        ) : null}

        <aside
          className={cn(
            "absolute inset-y-3 left-3 z-30 flex min-w-0 flex-col overflow-hidden rounded-[24px] border transition-all duration-150 ease-out",
            isOpen ? "pointer-events-auto" : "pointer-events-none",
          )}
          style={{
            width: "min(20rem, calc(100% - 1.5rem))",
            background:
              "linear-gradient(180deg, #F8F7F5 0%, #F7EFED 100%)",
            borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
            boxShadow: PDF_THUMBNAIL_PANEL_COLORS.shadow,
            opacity: isOpen ? 1 : 0,
            transform: isOpen ? "translateX(0)" : "translateX(calc(-100% - 1rem))",
          }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{
              borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
            }}
          >
            <div className="min-w-0">
              <div className="text-[11px] font-semibold tracking-[0.24em]"
                style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}>
                PAGES
              </div>
              <div className="mt-1 text-sm font-semibold"
                style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textStrong }}>
                {documentController.numPages} pages
              </div>
              <div className="mt-1 text-xs font-medium"
                style={{ color: PDF_THUMBNAIL_PANEL_COLORS.accent }}>
                Bookmarks {bookmarkCount}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="ページ一覧を閉じる"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors duration-150"
              style={{
                color: PDF_THUMBNAIL_PANEL_COLORS.textStrong,
                background: "rgba(248, 247, 245, 0.92)",
                borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
              }}
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          <div
            ref={handleScrollRootRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            {panelListContent}
          </div>
        </aside>
      </>
    );
  }

  return (
    <aside
      className="relative z-10 h-full shrink-0 overflow-hidden border-r transition-[width] duration-150 ease-out"
      style={{
        width: isOpen
          ? `${DESKTOP_PANEL_WIDTH_PX}px`
          : `${DESKTOP_PANEL_COLLAPSED_WIDTH_PX}px`,
        background: "linear-gradient(180deg, #F8F7F5 0%, #F7EFED 100%)",
        borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
      }}
    >
      <div className="flex h-full min-w-0">
        <div
          className="flex w-14 shrink-0 flex-col items-center gap-2 border-r px-2 py-3"
          style={{
            borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
          }}
        >
          <button
            type="button"
            aria-label={isOpen ? "ページ一覧を閉じる" : "ページ一覧を開く"}
            onClick={() => onOpenChange(!isOpen)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-150"
            style={{
              color: PDF_THUMBNAIL_PANEL_COLORS.textStrong,
              background: "rgba(248, 247, 245, 0.92)",
              borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
              boxShadow: "0 6px 16px rgba(216, 175, 181, 0.16)",
            }}
          >
            <span className="relative inline-flex items-center justify-center">
              <GridIcon className="h-4 w-4" />
              <span className="absolute -right-4 top-1/2 -translate-y-1/2"
                style={{ color: PDF_THUMBNAIL_PANEL_COLORS.accent }}>
                {isOpen ? (
                  <ChevronLeftIcon className="h-3 w-3" />
                ) : (
                  <ChevronRightIcon className="h-3 w-3" />
                )}
              </span>
            </span>
          </button>

          <div className="rounded-full px-2 py-1 text-[10px] font-semibold tabular-nums shadow-sm"
            style={{
              background: PDF_THUMBNAIL_PANEL_COLORS.surfaceSoft,
              color: PDF_THUMBNAIL_PANEL_COLORS.textMuted,
              boxShadow: "0 4px 12px rgba(216, 175, 181, 0.12)",
            }}>
            {documentController.numPages}
          </div>

          <div className="mt-auto text-[10px] font-semibold tracking-[0.22em] [writing-mode:vertical-rl] rotate-180"
            style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}>
            PAGES
          </div>
        </div>

        <div
          className={cn(
            "min-w-0 flex-1 flex-col transition-opacity duration-150 ease-out",
            isOpen ? "flex opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-hidden={!isOpen}
        >
          <div
            className="border-b px-4 py-3"
            style={{
              borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
            }}
          >
            <div className="text-[11px] font-semibold tracking-[0.24em]"
                style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}>
              PAGES
            </div>
            <div className="mt-1 text-sm font-semibold"
                style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textStrong }}>
              {documentController.numPages} pages
            </div>
            <div className="mt-1 text-xs font-medium"
                style={{ color: PDF_THUMBNAIL_PANEL_COLORS.accent }}>
              Bookmarks {bookmarkCount}
            </div>
          </div>

          <div
            ref={handleScrollRootRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            {panelListContent}
          </div>
        </div>
      </div>
    </aside>
  );
};
