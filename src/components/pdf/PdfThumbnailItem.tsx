import { memo, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { PageSize, PdfJsRenderTask } from "./pdfViewerTypes";
import { isPdfAbortError } from "./pdfViewerTypes";
import type { PdfDocumentController } from "./hooks/usePdfDocument";
import { resolvePdfRenderBackingStore } from "./pdfRenderQuality";
import {
  commitPdfBitmapToCanvas,
  createDetachedPdfCanvasSurface,
  prepareDetachedPdfCanvasSurfaceForRender,
} from "./pdfCanvasRenderUtils";

const THUMBNAIL_TARGET_WIDTH_PX = 84;
const THUMBNAIL_RENDER_CONSTRAINTS = {
  maxPreferredDevicePixelRatio: 1.25,
  maxCanvasPixels: 480_000,
  maxCanvasEdgePx: 1024,
} as const;
const EAGER_THUMBNAIL_PAGE_COUNT = 12;

type ThumbnailBitmapCacheEntry = {
  bitmap: HTMLCanvasElement;
  size: PageSize;
};

const thumbnailBitmapCache = new Map<string, ThumbnailBitmapCacheEntry>();

const PDF_THUMBNAIL_PANEL_COLORS = {
  accent: "#D8AFB5",
  surfaceSoft: "#F5EBE9",
  surfaceMuted: "#F1E2E1",
  surfacePaper: "#F8F7F5",
  surfaceBlush: "#F7EFED",
  textStrong: "#5E545B",
  textMuted: "#8C7C83",
} as const;

interface PdfThumbnailItemProps {
  documentKey: string;
  pageNumber: number;
  baseSize?: PageSize;
  isActive: boolean;
  isBookmarked: boolean;
  hasOcrText?: boolean;
  onSelect: (pageNumber: number) => void;
  onToggleBookmark: (pageNumber: number) => void;
  rootElement: HTMLElement | null;
  acquirePage: PdfDocumentController["acquirePage"];
  setPageSize: PdfDocumentController["setPageSize"];
}

interface IconProps {
  className?: string;
}

const BookmarkIcon = ({ className }: IconProps) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path d="M6.2 3.25c-.994 0-1.8.806-1.8 1.8v11.273c0 .407.46.643.79.405L10 13.552l4.81 3.176a.487.487 0 0 0 .79-.405V5.05c0-.994-.806-1.8-1.8-1.8H6.2Z" />
    </svg>
  );
};

const arePageSizesEqual = (
  left: PageSize | undefined,
  right: PageSize | undefined,
) => {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return !left && !right;
  }

  return left.width === right.width && left.height === right.height;
};

const readWindowDevicePixelRatio = () => {
  if (typeof window === "undefined") {
    return 1;
  }

  const rawDevicePixelRatio = window.devicePixelRatio;
  if (!Number.isFinite(rawDevicePixelRatio) || rawDevicePixelRatio <= 0) {
    return 1;
  }

  return rawDevicePixelRatio;
};

const buildThumbnailCacheKey = (documentKey: string, pageNumber: number) => {
  return `${documentKey}::thumbnail::${pageNumber}`;
};

const cloneCanvasBitmap = (sourceCanvas: HTMLCanvasElement) => {
  const nextCanvas = document.createElement("canvas");
  nextCanvas.width = sourceCanvas.width;
  nextCanvas.height = sourceCanvas.height;

  const nextContext = nextCanvas.getContext("2d", { alpha: false });
  if (!nextContext) {
    return null;
  }

  nextContext.drawImage(sourceCanvas, 0, 0);
  return nextCanvas;
};

const PdfThumbnailItemComponent = ({
  documentKey,
  pageNumber,
  baseSize,
  isActive,
  isBookmarked,
  hasOcrText = false,
  onSelect,
  onToggleBookmark,
  rootElement,
  acquirePage,
  setPageSize,
}: PdfThumbnailItemProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderPassIdRef = useRef(0);

  const [isVisible, setIsVisible] = useState(
    () => isActive || pageNumber <= EAGER_THUMBNAIL_PAGE_COUNT,
  );
  const [isRendered, setIsRendered] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const pageAspectRatio = useMemo(() => {
    if (baseSize && baseSize.width > 0 && baseSize.height > 0) {
      return `${baseSize.width} / ${baseSize.height}`;
    }

    return "210 / 297";
  }, [baseSize]);

  useEffect(() => {
    const nextCard = cardRef.current;
    if (!nextCard || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry) {
          return;
        }

        setIsVisible((previousIsVisible) => {
          return (
            previousIsVisible ||
            entry.isIntersecting ||
            entry.intersectionRatio > 0
          );
        });
      },
      {
        root: rootElement,
        rootMargin: "320px 0px 320px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(nextCard);

    return () => {
      observer.disconnect();
    };
  }, [rootElement]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    setIsVisible(true);
    cardRef.current?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [isActive]);

  useEffect(() => {
    const shouldRenderThumbnail = isVisible || isActive;
    if (!shouldRenderThumbnail) {
      return;
    }

    const renderPassId = renderPassIdRef.current + 1;
    renderPassIdRef.current = renderPassId;

    let disposed = false;
    let renderTask: PdfJsRenderTask | null = null;
    let activePageRelease: (() => void) | null = null;

    const releasePage = () => {
      if (!activePageRelease) {
        return;
      }

      const release = activePageRelease;
      activePageRelease = null;
      release();
    };

    const isStale = () => {
      return disposed || renderPassIdRef.current !== renderPassId;
    };

    const cachedEntry = thumbnailBitmapCache.get(
      buildThumbnailCacheKey(documentKey, pageNumber),
    );
    const resolvedSize = baseSize ?? cachedEntry?.size;

    if (cachedEntry && resolvedSize) {
      const viewportWidthPx = THUMBNAIL_TARGET_WIDTH_PX;
      const viewportHeightPx = Math.max(
        1,
        (resolvedSize.height / Math.max(1, resolvedSize.width)) *
          THUMBNAIL_TARGET_WIDTH_PX,
      );
      const renderBackingStore = resolvePdfRenderBackingStore({
        viewportWidthPx,
        viewportHeightPx,
        devicePixelRatio: 1,
        constraints: THUMBNAIL_RENDER_CONSTRAINTS,
      });

      const canvas = canvasRef.current;
      if (canvas) {
        const didCommit = commitPdfBitmapToCanvas({
          targetCanvas: canvas,
          bitmap: cachedEntry.bitmap,
          viewport: {
            width: viewportWidthPx,
            height: viewportHeightPx,
            scale: 1,
            transform: [1, 0, 0, 1, 0, 0],
          },
          renderBackingStore,
          opaqueCanvas: true,
        });

        if (didCommit) {
          setRenderError(null);
          setIsRendered(true);
          return () => {
            disposed = true;
          };
        }
      }
    }

    setRenderError(null);

    void (async () => {
      try {
        const pageLease = await acquirePage(pageNumber);
        if (isStale()) {
          pageLease.release();
          return;
        }

        activePageRelease = pageLease.release;

        const baseViewport = pageLease.page.getViewport({ scale: 1 });
        const nextPageSize = {
          width: baseViewport.width,
          height: baseViewport.height,
        };

        if (!arePageSizesEqual(baseSize, nextPageSize)) {
          setPageSize(pageNumber, nextPageSize);
        }

        const thumbnailScale = Math.max(
          0.01,
          THUMBNAIL_TARGET_WIDTH_PX / Math.max(1, nextPageSize.width),
        );
        const viewport = pageLease.page.getViewport({ scale: thumbnailScale });
        const renderBackingStore = resolvePdfRenderBackingStore({
          viewportWidthPx: viewport.width,
          viewportHeightPx: viewport.height,
          devicePixelRatio: readWindowDevicePixelRatio(),
          constraints: THUMBNAIL_RENDER_CONSTRAINTS,
        });
        const renderSurface = createDetachedPdfCanvasSurface({
          renderBackingStore,
          opaqueCanvas: true,
        });

        if (!renderSurface) {
          throw new Error("thumbnail surface unavailable");
        }

        prepareDetachedPdfCanvasSurfaceForRender({
          surface: renderSurface,
          renderBackingStore,
          opaqueCanvas: true,
        });

        renderTask = pageLease.page.render({
          canvasContext: renderSurface.context,
          viewport,
          intent: "display",
        });

        await renderTask.promise;
        if (isStale()) {
          return;
        }

        const canvas = canvasRef.current;
        if (!canvas) {
          return;
        }

        const didCommit = commitPdfBitmapToCanvas({
          targetCanvas: canvas,
          bitmap: renderSurface.canvas,
          viewport,
          renderBackingStore,
          opaqueCanvas: true,
        });

        if (!didCommit) {
          throw new Error("thumbnail canvas commit failed");
        }

        if (isStale()) {
          return;
        }

        const clonedBitmap = cloneCanvasBitmap(renderSurface.canvas);
        if (clonedBitmap) {
          thumbnailBitmapCache.set(
            buildThumbnailCacheKey(documentKey, pageNumber),
            {
              bitmap: clonedBitmap,
              size: nextPageSize,
            },
          );
        }

        setRenderError(null);
        setIsRendered(true);
      } catch (errorValue: unknown) {
        if (isStale() || isPdfAbortError(errorValue)) {
          return;
        }

        console.error("[PdfThumbnailItem] render error", {
          documentKey,
          pageNumber,
          error: errorValue,
        });

        if (isStale()) {
          return;
        }

        setIsRendered(false);
        setRenderError("サムネイルを表示できません");
      } finally {
        releasePage();
      }
    })();

    return () => {
      disposed = true;

      if (renderPassIdRef.current === renderPassId) {
        renderPassIdRef.current += 1;
      }

      try {
        renderTask?.cancel?.();
      } catch {
        // noop
      }

      releasePage();
    };
  }, [
    acquirePage,
    baseSize,
    documentKey,
    isActive,
    isVisible,
    pageNumber,
    setPageSize,
  ]);

  return (
    <div ref={cardRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => onSelect(pageNumber)}
        aria-label={`ページ ${pageNumber} を開く`}
        className={cn(
          "group relative flex w-full min-w-0 flex-col rounded-[20px] border p-2 text-left transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          isActive
            ? "shadow-[0_12px_28px_rgba(216,175,181,0.22)]"
            : "hover:shadow-[0_10px_24px_rgba(216,175,181,0.14)]",
        )}
        style={{
          color: PDF_THUMBNAIL_PANEL_COLORS.textStrong,
          borderColor: isActive
            ? PDF_THUMBNAIL_PANEL_COLORS.accent
            : PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
          background: isActive
            ? PDF_THUMBNAIL_PANEL_COLORS.surfaceBlush
            : PDF_THUMBNAIL_PANEL_COLORS.surfacePaper,
          boxShadow: isActive
            ? "0 12px 28px rgba(216, 175, 181, 0.16), inset 0 1px 0 rgba(255,255,255,0.95)"
            : "inset 0 1px 0 rgba(255,255,255,0.95)",
          outline: isActive ? "1px solid rgba(216, 175, 181, 0.28)" : "none",
        }}
      >
        <div
          className="relative flex w-full items-center justify-center overflow-hidden rounded-[16px] border bg-white p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]"
          style={{
            aspectRatio: pageAspectRatio,
            borderColor: PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
            background: "linear-gradient(180deg, #FFFFFF 0%, #F8F7F5 100%)",
          }}
        >
          {!isRendered && !renderError ? (
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(248,247,245,0.96), rgba(247,239,237,0.92))",
              }}
            />
          ) : null}

          <canvas ref={canvasRef} className="relative z-10 block max-w-full" />

          {renderError ? (
            <div
              className="absolute inset-0 flex items-center justify-center px-3 text-center text-[11px] font-medium"
              style={{ color: PDF_THUMBNAIL_PANEL_COLORS.textMuted }}
            >
              {renderError}
            </div>
          ) : null}
        </div>
      </button>

      <div className="pointer-events-none absolute left-3 top-3 z-20 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[rgba(248,247,245,0.94)] px-2 text-[12px] font-semibold tabular-nums shadow-[0_4px_12px_rgba(216,175,181,0.10)]">
        {pageNumber}
      </div>

      {hasOcrText ? (
        <div
          className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
          style={{
            color: PDF_THUMBNAIL_PANEL_COLORS.accent,
            borderColor: "rgba(216,175,181,0.32)",
            background: "rgba(248,247,245,0.95)",
          }}
        >
          OCR
        </div>
      ) : null}

      <button
        type="button"
        aria-label={
          isBookmarked
            ? `ページ ${pageNumber} のブックマークを外す`
            : `ページ ${pageNumber} をブックマークする`
        }
        aria-pressed={isBookmarked}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggleBookmark(pageNumber);
        }}
        className="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-150 ease-out hover:scale-[1.03]"
        style={{
          borderColor: isBookmarked
            ? PDF_THUMBNAIL_PANEL_COLORS.accent
            : PDF_THUMBNAIL_PANEL_COLORS.surfaceMuted,
          background: isBookmarked
            ? PDF_THUMBNAIL_PANEL_COLORS.surfaceSoft
            : "rgba(248,247,245,0.95)",
          color: isBookmarked
            ? PDF_THUMBNAIL_PANEL_COLORS.accent
            : PDF_THUMBNAIL_PANEL_COLORS.textMuted,
          boxShadow: isBookmarked
            ? "0 8px 18px rgba(216, 175, 181, 0.18)"
            : "0 4px 12px rgba(216, 175, 181, 0.10)",
        }}
      >
        <BookmarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
};

const arePdfThumbnailItemPropsEqual = (
  left: PdfThumbnailItemProps,
  right: PdfThumbnailItemProps,
) => {
  return (
    left.documentKey === right.documentKey &&
    left.pageNumber === right.pageNumber &&
    arePageSizesEqual(left.baseSize, right.baseSize) &&
    left.isActive === right.isActive &&
    left.isBookmarked === right.isBookmarked &&
    left.hasOcrText === right.hasOcrText &&
    left.onSelect === right.onSelect &&
    left.onToggleBookmark === right.onToggleBookmark &&
    left.rootElement === right.rootElement &&
    left.acquirePage === right.acquirePage &&
    left.setPageSize === right.setPageSize
  );
};

export const PdfThumbnailItem = memo(
  PdfThumbnailItemComponent,
  arePdfThumbnailItemPropsEqual,
);
