import { useAuthSession } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { DocumentItem } from "@/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { PdfPage } from "./PdfPage";
import { usePdfContainerWidth } from "./hooks/usePdfContainerWidth";
import { usePdfDocument } from "./hooks/usePdfDocument";
import { usePdfSourceResolver } from "./hooks/usePdfSourceResolver";
import type {
  PageSize,
  PdfJsDocument,
  PdfJsPage,
  PdfJsTextContent,
} from "./pdfViewerTypes";

const THUMBNAIL_GRID_GAP_PX = 8;
const MIN_THUMBNAIL_WIDTH_PX = 72;
const MIN_THUMBNAIL_COLUMN_WIDTH_PX = 118;
const FALLBACK_THUMBNAIL_SCALE = 0.18;
const INITIAL_VISIBLE_PAGE_COUNT = 6;
const MAX_THUMBNAIL_COLUMNS = 3;

const sanitizeCurrentPage = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.trunc(value));
};

const normalizeThumbnailOrder = (value: unknown, numPages: number) => {
  const defaultOrder = Array.from({ length: numPages }, (_, index) => index + 1);

  if (numPages <= 0) {
    return [];
  }

  if (!Array.isArray(value) || value.length === 0) {
    return defaultOrder;
  }

  const seen = new Set<number>();
  const nextOrder: number[] = [];

  value.forEach((pageNumber) => {
    if (typeof pageNumber !== "number" || !Number.isFinite(pageNumber)) {
      return;
    }

    const normalizedPageNumber = Math.max(1, Math.trunc(pageNumber));
    if (normalizedPageNumber > numPages || seen.has(normalizedPageNumber)) {
      return;
    }

    seen.add(normalizedPageNumber);
    nextOrder.push(normalizedPageNumber);
  });

  defaultOrder.forEach((pageNumber) => {
    if (!seen.has(pageNumber)) {
      nextOrder.push(pageNumber);
    }
  });

  return nextOrder;
};

const resolveThumbnailColumnCount = (containerWidth: number) => {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
    return 2;
  }

  for (let candidate = MAX_THUMBNAIL_COLUMNS; candidate >= 2; candidate -= 1) {
    const totalGapWidth = THUMBNAIL_GRID_GAP_PX * (candidate - 1);
    const cellWidth = Math.floor((containerWidth - totalGapWidth) / candidate);

    if (cellWidth >= MIN_THUMBNAIL_COLUMN_WIDTH_PX) {
      return candidate;
    }
  }

  return 2;
};

interface PdfThumbnailSidebarProps {
  doc: DocumentItem;
}

interface PdfThumbnailTileProps {
  pdf: PdfJsDocument;
  documentKey: string;
  pageNumber: number;
  scale: number;
  baseSize?: PageSize;
  isActive: boolean;
  observerRoot: HTMLDivElement | null;
  acquirePage: (
    pageNumber: number,
  ) => Promise<{ page: PdfJsPage; release: () => void }>;
  getPageTextContent: (pageNumber: number) => Promise<PdfJsTextContent>;
  onPageSize: (pageNumber: number, size: PageSize) => void;
}

const PdfThumbnailTile = ({
  pdf,
  documentKey,
  pageNumber,
  scale,
  baseSize,
  isActive,
  observerRoot,
  acquirePage,
  getPageTextContent,
  onPageSize,
}: PdfThumbnailTileProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(
    pageNumber <= INITIAL_VISIBLE_PAGE_COUNT,
  );

  useEffect(() => {
    if (shouldRender) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setShouldRender(true);
      return;
    }

    const node = hostRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const isIntersecting = entries.some((entry) => {
          return entry.isIntersecting || entry.intersectionRatio > 0;
        });

        if (!isIntersecting) {
          return;
        }

        setShouldRender(true);
        observer.disconnect();
      },
      {
        root: observerRoot,
        rootMargin: "240px 0px 240px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [observerRoot, shouldRender]);

  const placeholderHeight =
    baseSize && baseSize.width > 0
      ? Math.max(96, Math.floor(baseSize.height * scale))
      : 144;

  return (
    <div ref={hostRef} className="min-w-0">
      <div
        className={cn(
          "overflow-hidden rounded-xl border bg-white p-1 shadow-sm",
          isActive
            ? "border-primary-500 ring-2 ring-primary-500/20"
            : "border-slate-200",
        )}
      >
        {shouldRender ? (
          <PdfPage
            className="pointer-events-none"
            documentKey={documentKey}
            pdf={pdf}
            pageNumber={pageNumber}
            scale={scale}
            baseSize={baseSize}
            opaqueCanvas={false}
            renderTextLayer={false}
            acquirePage={acquirePage}
            getPageTextContent={getPageTextContent}
            onPageSize={onPageSize}
          />
        ) : (
          <div
            className="rounded-lg bg-slate-100"
            style={{ height: `${placeholderHeight}px` }}
          />
        )}
      </div>

      <div
        className={cn(
          "pt-1 text-center text-[11px] leading-4",
          isActive ? "font-semibold text-slate-900" : "text-slate-500",
        )}
      >
        {pageNumber}
      </div>
    </div>
  );
};

export const PdfThumbnailSidebar = ({ doc }: PdfThumbnailSidebarProps) => {
  const { currentUser } = useAuthSession();
  const scrollRootRef = useRef<HTMLDivElement | null>(null);
  const { containerRef, containerWidth } = usePdfContainerWidth();
  const [firstPageSize, setFirstPageSize] = useState<PageSize | null>(null);

  const {
    source,
    sourceMeta,
    sourceUnavailable,
    localDataStatus,
    handleSourceLoadError,
  } = usePdfSourceResolver(doc, currentUser?.uid);

  const documentController = usePdfDocument({
    docId: doc.id,
    source,
    sourceMeta,
    onNumPages: () => {},
    onFirstPageSize: (size) => {
      setFirstPageSize(size ?? null);
    },
    onSourceLoadError: handleSourceLoadError,
  });

  const columnCount = useMemo(() => {
    return resolveThumbnailColumnCount(containerWidth);
  }, [containerWidth]);

  const thumbnailWidth = useMemo(() => {
    if (!containerWidth) {
      return 96;
    }

    const totalGapWidth = THUMBNAIL_GRID_GAP_PX * (columnCount - 1);

    return Math.max(
      MIN_THUMBNAIL_WIDTH_PX,
      Math.floor((containerWidth - totalGapWidth) / columnCount),
    );
  }, [columnCount, containerWidth]);

  const thumbnailScale = useMemo(() => {
    if (!firstPageSize || firstPageSize.width <= 0) {
      return FALLBACK_THUMBNAIL_SCALE;
    }

    return Number((thumbnailWidth / firstPageSize.width).toFixed(3));
  }, [firstPageSize, thumbnailWidth]);

  const currentPage = useMemo(() => {
    return sanitizeCurrentPage(doc.viewerState?.currentPage);
  }, [doc.viewerState?.currentPage]);

  const orderedPageNumbers = useMemo(() => {
    return normalizeThumbnailOrder(
      doc.viewerState?.thumbnailOrder,
      documentController.numPages,
    );
  }, [doc.viewerState?.thumbnailOrder, documentController.numPages]);

  const statusMessage = useMemo(() => {
    if (documentController.error) {
      return documentController.error;
    }

    if (sourceUnavailable) {
      if (localDataStatus === "loading") {
        return "ローカルPDFを復元中...";
      }

      if (localDataStatus === "failed") {
        return "PDFの復元に失敗しました。";
      }

      return "PDFソースがありません。";
    }

    if (documentController.loading && documentController.numPages === 0) {
      return "サムネイルを読み込み中...";
    }

    return null;
  }, [
    documentController.error,
    documentController.loading,
    documentController.numPages,
    localDataStatus,
    sourceUnavailable,
  ]);

  if (doc.kind !== "pdf") {
    return null;
  }

  if (!documentController.doc || statusMessage) {
    return (
      <div className="flex h-full min-h-0 items-start justify-center px-3 py-3">
        <div className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
          {statusMessage ?? "サムネイルを初期化中..."}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      <div
        ref={scrollRootRef}
        className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 pt-2"
      >
        <div
          ref={containerRef}
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
          }}
        >
          {orderedPageNumbers.map((pageNumber) => (
            <PdfThumbnailTile
              key={`${doc.id}:thumbnail:${pageNumber}`}
              pdf={documentController.doc!}
              documentKey={documentController.documentKey}
              pageNumber={pageNumber}
              scale={thumbnailScale}
              baseSize={
                documentController.pageSizes[pageNumber] ??
                firstPageSize ??
                undefined
              }
              isActive={pageNumber === currentPage}
              observerRoot={scrollRootRef.current}
              acquirePage={documentController.acquirePage}
              getPageTextContent={documentController.getPageTextContent}
              onPageSize={documentController.setPageSize}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
