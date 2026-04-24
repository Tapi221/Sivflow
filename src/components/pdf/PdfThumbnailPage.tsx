import { useEffect, useMemo, useRef, useState } from "react";
import {
  commitPdfBitmapToCanvas,
  createDetachedPdfCanvasSurface,
  prepareDetachedPdfCanvasSurfaceForRender,
} from "./pdfCanvasRenderUtils";
import {
  getCachedPdfPageBitmap,
  setCachedPdfPageBitmap,
} from "./pdfPageBitmapCache";
import { resolvePdfRenderBackingStore } from "./pdfRenderQuality";
import type {
  PageSize,
  PdfJsPage,
  PdfJsRenderTask,
  PdfJsViewport,
} from "./pdfViewerTypes";
import { isPdfAbortError } from "./pdfViewerTypes";

interface PdfThumbnailPageProps {
  documentKey: string;
  pageNumber: number;
  boxWidthPx: number;
  boxHeightPx: number;
  baseSize?: PageSize;
  acquirePage: (
    pageNumber: number,
  ) => Promise<{ page: PdfJsPage; release: () => void }>;
  onPageSize: (pageNumber: number, size: PageSize) => void;
}

type ThumbnailPageSizeState = {
  pageIdentity: string;
  size: PageSize | null;
};

type ThumbnailContainLayout = {
  scale: number;
  cssWidthPx: number;
  cssHeightPx: number;
};

const OPAQUE_THUMBNAIL_CANVAS = false;

const buildPageIdentity = (documentKey: string, pageNumber: number) =>
  `${documentKey}::thumbnail::${pageNumber}`;

const buildRenderIdentity = ({
  documentKey,
  pageNumber,
  boxWidthPx,
  boxHeightPx,
  scale,
  devicePixelRatio,
}: {
  documentKey: string;
  pageNumber: number;
  boxWidthPx: number;
  boxHeightPx: number;
  scale: number;
  devicePixelRatio: number;
}) =>
  [
    documentKey,
    "thumbnail",
    pageNumber,
    `${boxWidthPx}x${boxHeightPx}`,
    scale.toFixed(6),
    devicePixelRatio.toFixed(3),
  ].join("::");

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

const resolveContainLayout = ({
  pageSize,
  boxWidthPx,
  boxHeightPx,
}: {
  pageSize: PageSize;
  boxWidthPx: number;
  boxHeightPx: number;
}): ThumbnailContainLayout | null => {
  if (
    pageSize.width <= 0 ||
    pageSize.height <= 0 ||
    boxWidthPx <= 0 ||
    boxHeightPx <= 0
  ) {
    return null;
  }

  const scale = Math.min(boxWidthPx / pageSize.width, boxHeightPx / pageSize.height);
  if (!Number.isFinite(scale) || scale <= 0) {
    return null;
  }

  return {
    scale,
    cssWidthPx: Math.max(1, pageSize.width * scale),
    cssHeightPx: Math.max(1, pageSize.height * scale),
  };
};

const createFallbackPageSize = ({
  boxWidthPx,
  boxHeightPx,
}: {
  boxWidthPx: number;
  boxHeightPx: number;
}): PageSize => ({
  width: Math.max(1, boxWidthPx),
  height: Math.max(1, boxHeightPx),
});

const commitThumbnailBitmap = ({
  canvas,
  bitmap,
  viewport,
  devicePixelRatio,
}: {
  canvas: HTMLCanvasElement;
  bitmap: HTMLCanvasElement | ImageBitmap;
  viewport: PdfJsViewport;
  devicePixelRatio: number;
}) => {
  const renderBackingStore = resolvePdfRenderBackingStore({
    viewportWidthPx: viewport.width,
    viewportHeightPx: viewport.height,
    devicePixelRatio,
  });

  return commitPdfBitmapToCanvas({
    targetCanvas: canvas,
    bitmap,
    viewport,
    renderBackingStore,
    opaqueCanvas: OPAQUE_THUMBNAIL_CANVAS,
  });
};

export const PdfThumbnailPage = ({
  documentKey,
  pageNumber,
  boxWidthPx,
  boxHeightPx,
  baseSize,
  acquirePage,
  onPageSize,
}: PdfThumbnailPageProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRenderPassIdRef = useRef(0);
  const pageIdentity = useMemo(
    () => buildPageIdentity(documentKey, pageNumber),
    [documentKey, pageNumber],
  );

  const [renderDevicePixelRatio, setRenderDevicePixelRatio] = useState<number>(
    () => readWindowDevicePixelRatio(),
  );
  const [measuredPageState, setMeasuredPageState] =
    useState<ThumbnailPageSizeState>({
      pageIdentity: "",
      size: null,
    });

  const resolvedPageSize =
    baseSize ??
    (measuredPageState.pageIdentity === pageIdentity
      ? measuredPageState.size
      : null);

  const layout = useMemo(() => {
    if (!resolvedPageSize) {
      return null;
    }

    return resolveContainLayout({
      pageSize: resolvedPageSize,
      boxWidthPx,
      boxHeightPx,
    });
  }, [boxHeightPx, boxWidthPx, resolvedPageSize]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let animationFrameId: number | null = null;

    const syncRenderDevicePixelRatio = () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;

        const nextDevicePixelRatio = readWindowDevicePixelRatio();
        setRenderDevicePixelRatio((previousDevicePixelRatio) =>
          Math.abs(previousDevicePixelRatio - nextDevicePixelRatio) < 0.001
            ? previousDevicePixelRatio
            : nextDevicePixelRatio,
        );
      });
    };

    syncRenderDevicePixelRatio();

    window.addEventListener("resize", syncRenderDevicePixelRatio, {
      passive: true,
    });
    window.visualViewport?.addEventListener(
      "resize",
      syncRenderDevicePixelRatio,
    );

    return () => {
      window.removeEventListener("resize", syncRenderDevicePixelRatio);
      window.visualViewport?.removeEventListener(
        "resize",
        syncRenderDevicePixelRatio,
      );

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  useEffect(() => {
    if (baseSize) {
      return;
    }

    if (
      measuredPageState.pageIdentity === pageIdentity &&
      measuredPageState.size !== null
    ) {
      return;
    }

    let cancelled = false;

    void acquirePage(pageNumber)
      .then(({ page, release }) => {
        try {
          if (cancelled) {
            return;
          }

          const viewport = page.getViewport({ scale: 1 });
          const nextSize = { width: viewport.width, height: viewport.height };

          setMeasuredPageState({
            pageIdentity,
            size: nextSize,
          });
          onPageSize(pageNumber, nextSize);
        } finally {
          release();
        }
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        const fallbackSize = createFallbackPageSize({ boxWidthPx, boxHeightPx });
        setMeasuredPageState({
          pageIdentity,
          size: fallbackSize,
        });
        onPageSize(pageNumber, fallbackSize);
      });

    return () => {
      cancelled = true;
    };
  }, [
    acquirePage,
    baseSize,
    boxHeightPx,
    boxWidthPx,
    measuredPageState.pageIdentity,
    measuredPageState.size,
    onPageSize,
    pageIdentity,
    pageNumber,
  ]);

  useEffect(() => {
    if (!layout || typeof window === "undefined") {
      return;
    }

    if (!canvasRef.current) {
      return;
    }

    const renderPassId = canvasRenderPassIdRef.current + 1;
    canvasRenderPassIdRef.current = renderPassId;

    let disposed = false;
    let renderTask: PdfJsRenderTask | null = null;
    let renderStartRafId: number | null = null;
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
      disposed || canvasRenderPassIdRef.current !== renderPassId;

    const renderIdentity = buildRenderIdentity({
      documentKey,
      pageNumber,
      boxWidthPx,
      boxHeightPx,
      scale: layout.scale,
      devicePixelRatio: renderDevicePixelRatio,
    });

    const run = async () => {
      try {
        const pageLease = await acquirePage(pageNumber);
        if (isStale()) {
          pageLease.release();
          return;
        }

        activePageRelease = pageLease.release;
        const page = pageLease.page;
        const viewport = page.getViewport({ scale: layout.scale });
        const targetCanvas = canvasRef.current;
        if (!targetCanvas) {
          return;
        }

        const renderBackingStore = resolvePdfRenderBackingStore({
          viewportWidthPx: viewport.width,
          viewportHeightPx: viewport.height,
          devicePixelRatio: renderDevicePixelRatio,
        });

        const cachedBitmap = getCachedPdfPageBitmap(renderIdentity);
        if (
          cachedBitmap &&
          cachedBitmap.width === renderBackingStore.canvasWidthPx &&
          cachedBitmap.height === renderBackingStore.canvasHeightPx
        ) {
          commitThumbnailBitmap({
            canvas: targetCanvas,
            bitmap: cachedBitmap,
            viewport,
            devicePixelRatio: renderDevicePixelRatio,
          });
          return;
        }

        const renderSurface = createDetachedPdfCanvasSurface({
          renderBackingStore,
          opaqueCanvas: OPAQUE_THUMBNAIL_CANVAS,
        });

        if (!renderSurface) {
          return;
        }

        prepareDetachedPdfCanvasSurfaceForRender({
          surface: renderSurface,
          renderBackingStore,
          opaqueCanvas: OPAQUE_THUMBNAIL_CANVAS,
        });

        renderTask = page.render({
          canvasContext: renderSurface.context,
          viewport,
          intent: "display",
        });

        await renderTask.promise;
        if (isStale()) {
          return;
        }

        const didCommit = commitThumbnailBitmap({
          canvas: targetCanvas,
          bitmap: renderSurface.canvas,
          viewport,
          devicePixelRatio: renderDevicePixelRatio,
        });

        if (!didCommit || isStale()) {
          return;
        }

        void setCachedPdfPageBitmap(
          renderIdentity,
          documentKey,
          renderSurface.canvas,
        ).catch(() => {
          // noop
        });
      } catch (errorValue: unknown) {
        if (isStale() || isPdfAbortError(errorValue)) {
          return;
        }

        console.warn("[PdfThumbnailPage] render error", {
          documentKey,
          pageNumber,
          error: errorValue,
        });
      } finally {
        releasePage();
      }
    };

    renderStartRafId = window.requestAnimationFrame(() => {
      if (isStale()) {
        return;
      }

      renderStartRafId = null;
      void run();
    });

    return () => {
      disposed = true;

      if (canvasRenderPassIdRef.current === renderPassId) {
        canvasRenderPassIdRef.current += 1;
      }

      if (renderStartRafId !== null) {
        window.cancelAnimationFrame(renderStartRafId);
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
    boxHeightPx,
    boxWidthPx,
    documentKey,
    layout,
    pageNumber,
    renderDevicePixelRatio,
  ]);

  return (
    <div
      className="flex items-center justify-center overflow-hidden rounded-lg bg-slate-100"
      style={{
        width: `${boxWidthPx}px`,
        height: `${boxHeightPx}px`,
      }}
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  );
};
