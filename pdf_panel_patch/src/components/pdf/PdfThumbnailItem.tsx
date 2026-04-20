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

const THUMBNAIL_TARGET_WIDTH_PX = 96;
const THUMBNAIL_RENDER_CONSTRAINTS = {
  maxPreferredDevicePixelRatio: 2,
  maxCanvasPixels: 1_200_000,
  maxCanvasEdgePx: 2048,
} as const;

interface PdfThumbnailItemProps {
  documentKey: string;
  pageNumber: number;
  baseSize?: PageSize;
  isActive: boolean;
  onSelect: (pageNumber: number) => void;
  rootElement: HTMLElement | null;
  acquirePage: PdfDocumentController["acquirePage"];
  setPageSize: PdfDocumentController["setPageSize"];
}

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

const PdfThumbnailItemComponent = ({
  documentKey,
  pageNumber,
  baseSize,
  isActive,
  onSelect,
  rootElement,
  acquirePage,
  setPageSize,
}: PdfThumbnailItemProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderPassIdRef = useRef(0);

  const [isVisible, setIsVisible] = useState(isActive);
  const [isRendered, setIsRendered] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const pageAspectRatio = useMemo(() => {
    if (baseSize && baseSize.width > 0 && baseSize.height > 0) {
      return `${baseSize.width} / ${baseSize.height}`;
    }

    return "210 / 297";
  }, [baseSize]);

  useEffect(() => {
    const nextButton = buttonRef.current;
    if (!nextButton || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry) {
          return;
        }

        setIsVisible(entry.isIntersecting || entry.intersectionRatio > 0);
      },
      {
        root: rootElement,
        rootMargin: "200px 0px 200px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(nextButton);

    return () => {
      observer.disconnect();
    };
  }, [rootElement]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    setIsVisible(true);
    buttonRef.current?.scrollIntoView({
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
    let rafId: number | null = null;
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

    const isStale = () =>
      disposed || renderPassIdRef.current !== renderPassId;

    setRenderError(null);
    setIsRendered(false);

    rafId = window.requestAnimationFrame(() => {
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
    });

    return () => {
      disposed = true;

      if (renderPassIdRef.current === renderPassId) {
        renderPassIdRef.current += 1;
      }

      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
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
    <button
      ref={buttonRef}
      type="button"
      onClick={() => onSelect(pageNumber)}
      aria-label={`ページ ${pageNumber} を開く`}
      className={cn(
        "group relative flex min-w-0 flex-col gap-2 rounded-[20px] border p-2 text-left transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-semantic-color-action-primary)] focus-visible:ring-offset-2",
        isActive ? "shadow-[0_10px_24px_rgba(15,23,42,0.08)]" : "hover:shadow-[0_10px_24px_rgba(15,23,42,0.05)]",
      )}
      style={{
        color: "var(--ds-semantic-color-text-primary)",
        borderColor: isActive
          ? "var(--ds-color-primary-500)"
          : "var(--ds-semantic-color-border-default)",
        background: isActive
          ? "var(--ds-semantic-color-background-sidebar-active)"
          : "color-mix(in srgb, var(--ds-semantic-color-background-sidebar) 82%, white 18%)",
      }}
    >
      {isActive ? (
        <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[var(--ds-color-primary-500)]" />
      ) : null}

      <div
        className="relative flex w-full items-center justify-center overflow-hidden rounded-[16px] border border-[color-mix(in_srgb,var(--ds-semantic-color-border-default)_72%,white_28%)] bg-white p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]"
        style={{ aspectRatio: pageAspectRatio }}
      >
        {!isRendered && !renderError ? (
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,241,235,0.72))]" />
        ) : null}

        <canvas ref={canvasRef} className="relative z-10 block max-w-full" />

        {renderError ? (
          <div className="absolute inset-0 flex items-center justify-center px-3 text-center text-[11px] font-medium text-[var(--ds-semantic-color-text-secondary)]">
            {renderError}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-[12px] font-semibold tabular-nums text-[var(--ds-semantic-color-text-strong)]">
          {pageNumber}
        </span>
        <span className="text-[10px] font-medium tracking-[0.16em] text-[var(--ds-semantic-color-text-secondary)]">
          PAGE
        </span>
      </div>
    </button>
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
    left.onSelect === right.onSelect &&
    left.rootElement === right.rootElement &&
    left.acquirePage === right.acquirePage &&
    left.setPageSize === right.setPageSize
  );
};

export const PdfThumbnailItem = memo(
  PdfThumbnailItemComponent,
  arePdfThumbnailItemPropsEqual,
);
