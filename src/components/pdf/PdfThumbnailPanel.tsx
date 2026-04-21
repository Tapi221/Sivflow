import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { PdfPageLayoutMode } from "@/types";
import type { PdfDocumentController } from "./hooks/usePdfDocument";
import { PdfThumbnailItem } from "./PdfThumbnailItem";

const DESKTOP_PANEL_WIDTH_PX = 320;
const DESKTOP_PANEL_COLLAPSED_WIDTH_PX = 56;

type PdfSidePanelTab = "markdown" | "outline" | "thumbnails";

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
  pageLayoutMode?: PdfPageLayoutMode;
  bookmarkedPageNumbers?: ReadonlySet<number>;
  isMobileViewport: boolean;
  isOpen: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  onSelectPage: (pageNumber: number) => void;
  onToggleBookmark: (pageNumber: number) => void;
  orderedThumbnailPageNumbers?: readonly number[];
  selectedTab?: PdfSidePanelTab;
  onTabChange?: (nextTab: PdfSidePanelTab) => void;
  onThumbnailOrderChange?: (nextOrder: number[]) => void;
  [key: string]: unknown;
}

interface IconProps {
  className?: string;
}

const BookmarkIcon = ({ className }: IconProps) => {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M6.2 3.25c-.994 0-1.8.806-1.8 1.8v11.273c0 .407.46.643.79.405L10 13.552l4.81 3.176a.487.487 0 0 0 .79-.405V5.05c0-.994-.806-1.8-1.8-1.8H6.2Z" />
    </svg>
  );
};

const GridIcon = ({ className }: IconProps) => {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={className}>
      <rect x="3" y="3" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="12" y="3" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="3" y="12" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="12" y="12" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
};

const OutlineIcon = ({ className }: IconProps) => {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M5 5.5h10M5 10h10M5 14.5h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="3.5" cy="5.5" r="0.8" fill="currentColor" />
      <circle cx="3.5" cy="10" r="0.8" fill="currentColor" />
      <circle cx="3.5" cy="14.5" r="0.8" fill="currentColor" />
    </svg>
  );
};

const ChevronLeftIcon = ({ className }: IconProps) => {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M11.75 4.5 6.25 10l5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const ChevronRightIcon = ({ className }: IconProps) => {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={className}>
      <path d="m8.25 4.5 5.5 5.5-5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const XIcon = ({ className }: IconProps) => {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={className}>
      <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
};

const TAB_ITEMS = [
  { id: "markdown", icon: BookmarkIcon, label: "ブックマーク" },
  { id: "outline", icon: OutlineIcon, label: "アウトライン" },
  { id: "thumbnails", icon: GridIcon, label: "サムネイル" },
] as const satisfies ReadonlyArray<{
  id: PdfSidePanelTab;
  icon: (props: IconProps) => JSX.Element;
  label: string;
}>;

const buildDefaultPageNumbers = (numPages: number) => {
  return Array.from({ length: Math.max(0, numPages) }, (_, index) => index + 1);
};

const buildPageNumbers = (
  numPages: number,
  orderedThumbnailPageNumbers?: readonly number[],
) => {
  if (!orderedThumbnailPageNumbers || orderedThumbnailPageNumbers.length === 0) {
    return buildDefaultPageNumbers(numPages);
  }

  const seen = new Set<number>();
  const normalized = orderedThumbnailPageNumbers
    .filter((pageNumber): pageNumber is number => typeof pageNumber === "number" && Number.isFinite(pageNumber))
    .map((pageNumber) => Math.max(1, Math.trunc(pageNumber)))
    .filter((pageNumber) => pageNumber <= numPages)
    .filter((pageNumber) => {
      if (seen.has(pageNumber)) {
        return false;
      }

      seen.add(pageNumber);
      return true;
    });

  if (normalized.length === numPages) {
    return normalized;
  }

  const missing = buildDefaultPageNumbers(numPages).filter((pageNumber) => !seen.has(pageNumber));
  return [...normalized, ...missing];
};

const buildOutlineItems = (pageNumbers: number[]) => {
  return pageNumbers.map((pageNumber) => ({
    id: `outline-${pageNumber}`,
    pageNumber,
    label: `Page ${pageNumber}`,
  }));
};

const renderThumbnailGrid = ({
  pageNumbers,
  documentController,
  currentPage,
  bookmarkedPageNumbers,
  scrollRootElement,
  onSelectPage,
  onToggleBookmark,
}: {
  pageNumbers: number[];
  documentController: PdfDocumentController;
  currentPage: number;
  bookmarkedPageNumbers: ReadonlySet<number>;
  scrollRootElement: HTMLElement | null;
  onSelectPage: (pageNumber: number) => void;
  onToggleBookmark: (pageNumber: number) => void;
}) => {
  if (pageNumbers.length === 0) {
    return (
      <div className="px-4 py-6 text-sm" style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}>
        表示できるページがありません。
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {pageNumbers.map((pageNumber) => (
        <PdfThumbnailItem
          key={`pdf-thumbnail-${documentController.documentKey}-${pageNumber}`}
          documentKey={documentController.documentKey}
          pageNumber={pageNumber}
          baseSize={documentController.pageSizes[pageNumber]}
          isActive={currentPage === pageNumber}
          isBookmarked={bookmarkedPageNumbers.has(pageNumber)}
          onSelect={onSelectPage}
          onToggleBookmark={onToggleBookmark}
          rootElement={scrollRootElement}
          acquirePage={documentController.acquirePage}
          setPageSize={documentController.setPageSize}
        />
      ))}
    </div>
  );
};

export const PdfThumbnailPanel = ({
  documentController,
  currentPage,
  bookmarkedPageNumbers = new Set<number>(),
  isMobileViewport,
  isOpen,
  onOpenChange,
  onSelectPage,
  onToggleBookmark,
  orderedThumbnailPageNumbers,
  selectedTab = "thumbnails",
  onTabChange,
}: PdfThumbnailPanelProps) => {
  const [scrollRootElement, setScrollRootElement] = useState<HTMLElement | null>(null);

  const pageNumbers = useMemo(
    () => buildPageNumbers(documentController.numPages, orderedThumbnailPageNumbers),
    [documentController.numPages, orderedThumbnailPageNumbers],
  );

  const bookmarkedPages = useMemo(
    () => pageNumbers.filter((pageNumber) => bookmarkedPageNumbers.has(pageNumber)),
    [bookmarkedPageNumbers, pageNumbers],
  );

  const outlineItems = useMemo(() => buildOutlineItems(pageNumbers), [pageNumbers]);

  const handleScrollRootRef = useCallback((element: HTMLDivElement | null) => {
    setScrollRootElement((previousElement) => (previousElement === element ? previousElement : element));
  }, []);

  const panelContent = (
    <>
      <div className="px-4 pt-3 pb-2">
        <div
          className="grid grid-cols-3 gap-2 rounded-full border p-2"
          style={{
            borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
            background: "rgba(248,247,245,0.8)",
          }}
        >
          {TAB_ITEMS.map((tabItem) => {
            const Icon = tabItem.icon;
            const isActive = selectedTab === tabItem.id;

            return (
              <button
                key={tabItem.id}
                type="button"
                aria-label={tabItem.label}
                aria-pressed={isActive}
                onClick={() => onTabChange?.(tabItem.id)}
                className="inline-flex h-10 items-center justify-center rounded-full border transition-colors duration-150"
                style={{
                  borderColor: isActive ? PDF_THUMBNAIL_PANEL_COLORS.accent : "transparent",
                  background: isActive ? PDF_THUMBNAIL_PANEL_COLORS.surfaceSoft : "transparent",
                  color: isActive ? PDF_THUMBNAIL_PANEL_COLORS.accent : PDF_THUMBNAIL_PANEL_COLORS.textMuted,
                }}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>

      <div ref={handleScrollRootRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {documentController.loading && pageNumbers.length === 0 ? (
          <div className="grid grid-cols-2 gap-3 p-4">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={`pdf-thumbnail-skeleton-${index}`}
                className="h-[9rem] rounded-[20px] border"
                style={{
                  borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
                  background: PDF_THUMBNAIL_PANEL_COLORS.surfacePaper,
                }}
              />
            ))}
          </div>
        ) : null}

        {!documentController.loading && documentController.error ? (
          <div className="px-4 py-6 text-sm" style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}>
            ページ一覧を準備できませんでした。
          </div>
        ) : null}

        {!documentController.loading && !documentController.error ? (
          <>
            {selectedTab === "markdown" ? (
              bookmarkedPages.length > 0 ? (
                renderThumbnailGrid({
                  pageNumbers: bookmarkedPages,
                  documentController,
                  currentPage,
                  bookmarkedPageNumbers,
                  scrollRootElement,
                  onSelectPage,
                  onToggleBookmark,
                })
              ) : (
                <div className="px-4 py-6 text-sm" style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}>
                  ブックマークされたページはありません。
                </div>
              )
            ) : null}

            {selectedTab === "outline" ? (
              outlineItems.length > 0 ? (
                <div className="flex flex-col gap-2 p-4">
                  {outlineItems.map((outlineItem) => {
                    const isActive = currentPage === outlineItem.pageNumber;

                    return (
                      <button
                        key={outlineItem.id}
                        type="button"
                        onClick={() => onSelectPage(outlineItem.pageNumber)}
                        className="flex items-center justify-between rounded-2xl border px-3 py-2 text-left transition-colors duration-150"
                        style={{
                          borderColor: isActive ? PDF_THUMBNAIL_PANEL_COLORS.accent : PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
                          background: isActive ? PDF_THUMBNAIL_PANEL_COLORS.surfaceSoft : PDF_THUMBNAIL_PANEL_COLORS.surfacePaper,
                          color: isActive ? PDF_THUMBNAIL_PANEL_COLORS.textStrong : PDF_THUMBNAIL_PANEL_COLORS.textMuted,
                        }}
                      >
                        <span className="truncate text-sm font-medium">{outlineItem.label}</span>
                        <span className="ml-3 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{
                            background: "rgba(255,255,255,0.7)",
                            color: PDF_THUMBNAIL_PANEL_COLORS.textMuted,
                          }}
                        >
                          {outlineItem.pageNumber}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-6 text-sm" style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}>
                  アウトラインを表示できません。
                </div>
              )
            ) : null}

            {selectedTab === "thumbnails" ? (
              renderThumbnailGrid({
                pageNumbers,
                documentController,
                currentPage,
                bookmarkedPageNumbers,
                scrollRootElement,
                onSelectPage,
                onToggleBookmark,
              })
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );

  if (isMobileViewport) {
    return (
      <>
        <button
          type="button"
          aria-label={isOpen ? "サイドパネルを閉じる" : "サイドパネルを開く"}
          onClick={() => onOpenChange(!isOpen)}
          className="absolute left-3 top-3 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-sm transition-colors duration-150"
          style={{
            color: PDF_THUMBNAIL_PANEL_COLORS.textStrong,
            background: "rgba(248,247,245,0.94)",
            borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
            boxShadow: "0 10px 22px rgba(216, 175, 181, 0.18)",
          }}
        >
          {isOpen ? <XIcon className="h-4 w-4" /> : <GridIcon className="h-4 w-4" />}
        </button>

        {isOpen ? (
          <button
            type="button"
            aria-label="サイドパネルを閉じる"
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
            background: "linear-gradient(180deg, #F8F7F5 0%, #F7EFED 100%)",
            borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
            boxShadow: PDF_THUMBNAIL_PANEL_COLORS.shadow,
            opacity: isOpen ? 1 : 0,
            transform: isOpen ? "translateX(0)" : "translateX(calc(-100% - 1rem))",
          }}
        >
          {panelContent}
        </aside>
      </>
    );
  }

  return (
    <aside
      className="relative z-10 h-full shrink-0 overflow-hidden border-r transition-[width] duration-150 ease-out"
      style={{
        width: isOpen ? `${DESKTOP_PANEL_WIDTH_PX}px` : `${DESKTOP_PANEL_COLLAPSED_WIDTH_PX}px`,
        background: "linear-gradient(180deg, #F8F7F5 0%, #F7EFED 100%)",
        borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
      }}
    >
      <div className="flex h-full min-w-0">
        <div
          className="flex w-14 shrink-0 flex-col items-center gap-2 border-r px-2 py-3"
          style={{ borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted }}
        >
          <button
            type="button"
            aria-label={isOpen ? "サイドパネルを閉じる" : "サイドパネルを開く"}
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
              <span className="absolute -right-4 top-1/2 -translate-y-1/2" style={{ color: PDF_THUMBNAIL_PANEL_COLORS.accent }}>
                {isOpen ? <ChevronLeftIcon className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
              </span>
            </span>
          </button>

          <div
            className="rounded-full px-2 py-1 text-[10px] font-semibold tabular-nums shadow-sm"
            style={{
              background: PDF_THUMBNAIL_PANEL_COLORS.surfaceSoft,
              color: PDF_THUMBNAIL_PANEL_COLORS.textMuted,
              boxShadow: "0 4px 12px rgba(216, 175, 181, 0.12)",
            }}
          >
            {documentController.numPages}
          </div>
        </div>

        <div
          className={cn(
            "min-w-0 flex-1 flex-col transition-opacity duration-150 ease-out",
            isOpen ? "flex opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-hidden={!isOpen}
        >
          {panelContent}
        </div>
      </div>
    </aside>
  );
};
