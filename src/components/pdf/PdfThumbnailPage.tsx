import { useEffect, useRef } from "react";
import type { PageSize, PdfJsPage, PdfJsRenderTask } from "./pdfViewerTypes";

interface PdfThumbnailPageProps {
  documentKey: string;
  pageNumber: number;
  boxWidthPx: number;
  boxHeightPx: number;
  acquirePage: (
    pageNumber: number,
  ) => Promise<{ page: PdfJsPage; release: () => void }>;
  onPageSize: (pageNumber: number, size: PageSize) => void;
}

const MAX_THUMBNAIL_DEVICE_PIXEL_RATIO = 2;

const readDevicePixelRatio = () => {
  if (typeof window === "undefined") {
    return 1;
  }

  const value = window.devicePixelRatio;
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return Math.min(value, MAX_THUMBNAIL_DEVICE_PIXEL_RATIO);
};

const normalizePositiveFinite = (value: number, fallback: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
};

const resolveContainLayout = ({
  pageSize,
  boxWidthPx,
  boxHeightPx,
}: {
  pageSize: PageSize;
  boxWidthPx: number;
  boxHeightPx: number;
}) => {
  const safePageWidthPx = normalizePositiveFinite(pageSize.width, boxWidthPx);
  const safePageHeightPx = normalizePositiveFinite(pageSize.height, boxHeightPx);
  const widthScale = boxWidthPx / safePageWidthPx;
  const heightScale = boxHeightPx / safePageHeightPx;
  const scale = Math.min(widthScale, heightScale);

  return {
    scale,
    cssWidthPx: Math.max(1, safePageWidthPx * scale),
    cssHeightPx: Math.max(1, safePageHeightPx * scale),
  };
};

const buildRenderIdentity = ({
  documentKey,
  pageNumber,
  boxWidthPx,
  boxHeightPx,
  devicePixelRatio,
}: {
  documentKey: string;
  pageNumber: number;
  boxWidthPx: number;
  boxHeightPx: number;
  devicePixelRatio: number;
}) => {
  return [
    documentKey,
    pageNumber,
    boxWidthPx,
    boxHeightPx,
    devicePixelRatio.toFixed(3),
  ].join("::");
};

export const PdfThumbnailPage = ({
  documentKey,
  pageNumber,
  boxWidthPx,
  boxHeightPx,
  acquirePage,
  onPageSize,
}: PdfThumbnailPageProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderPassRef = useRef(0);
  const lastRenderIdentityRef = useRef<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const devicePixelRatio = readDevicePixelRatio();
    const renderIdentity = buildRenderIdentity({
      documentKey,
      pageNumber,
      boxWidthPx,
      boxHeightPx,
      devicePixelRatio,
    });

    if (lastRenderIdentityRef.current === renderIdentity) {
      return;
    }

    lastRenderIdentityRef.current = renderIdentity;

    const renderPass = renderPassRef.current + 1;
    renderPassRef.current = renderPass;

    let disposed = false;
    let renderTask: PdfJsRenderTask | null = null;
    let releasePage: (() => void) | null = null;

    const isStale = () => disposed || renderPassRef.current !== renderPass;

    const releaseActivePage = () => {
      const release = releasePage;
      releasePage = null;
      release?.();
    };

    const run = async () => {
      try {
        const pageLease = await acquirePage(pageNumber);

        if (isStale()) {
          pageLease.release();
          return;
        }

        releasePage = pageLease.release;

        const page = pageLease.page;
        const baseViewport = page.getViewport({ scale: 1 });
        const pageSize = {
          width: baseViewport.width,
          height: baseViewport.height,
        };
        const layout = resolveContainLayout({
          pageSize,
          boxWidthPx,
          boxHeightPx,
        });
        const viewport = page.getViewport({ scale: layout.scale });
        const canvasWidthPx = Math.max(
          1,
          Math.ceil(layout.cssWidthPx * devicePixelRatio),
        );
        const canvasHeightPx = Math.max(
          1,
          Math.ceil(layout.cssHeightPx * devicePixelRatio),
        );

        if (isStale()) {
          return;
        }

        onPageSize(pageNumber, pageSize);

        canvas.style.width = `${layout.cssWidthPx}px`;
        canvas.style.height = `${layout.cssHeightPx}px`;
        canvas.width = canvasWidthPx;
        canvas.height = canvasHeightPx;

        const context = canvas.getContext("2d", { alpha: false });
        if (!context) {
          return;
        }

        context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, layout.cssWidthPx, layout.cssHeightPx);

        renderTask = page.render({
          canvasContext: context,
          viewport,
          intent: "display",
        });

        await renderTask.promise;
      } finally {
        releaseActivePage();
      }
    };

    void run().catch(() => {
      if (lastRenderIdentityRef.current === renderIdentity) {
        lastRenderIdentityRef.current = null;
      }
    });

    return () => {
      disposed = true;

      if (renderPassRef.current === renderPass) {
        renderPassRef.current += 1;
      }

      try {
        renderTask?.cancel?.();
      } catch {
        // noop
      }

      releasePage?.();
    };
  }, [acquirePage, boxHeightPx, boxWidthPx, documentKey, onPageSize, pageNumber]);

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
