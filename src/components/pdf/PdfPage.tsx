import { useEffect, useRef, useState } from "react";
import {
  PDF_PAGE_OBSERVER_ROOT_MARGIN,
  PDF_PAGE_OBSERVER_THRESHOLDS,
} from "./pdfViewerConstants";
import type {
  PageSize,
  PdfJsDocument,
  PdfJsRenderTask,
} from "./pdfViewerTypes";
import { getErrorMessage } from "./pdfViewerTypes";

interface PdfPageProps {
  pdf: PdfJsDocument;
  pageNumber: number;
  scale: number;
  opaqueCanvas: boolean;
  baseSize?: PageSize;
  rootEl: HTMLDivElement | null;
  onPageSize?: (pageNumber: number, size: PageSize) => void;
  onVisibilityChange?: (pageNumber: number, ratio: number) => void;
}

export const PdfPage = ({
  pdf,
  pageNumber,
  scale,
  opaqueCanvas,
  baseSize,
  rootEl,
  onPageSize,
  onVisibilityChange,
}: PdfPageProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pageSize, setPageSize] = useState<PageSize | null>(baseSize ?? null);
  const [shouldRender, setShouldRender] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRendered(false);
    setError(null);
  }, [opaqueCanvas, pageNumber, pdf, scale]);

  useEffect(() => {
    setPageSize((prev) => {
      if (!baseSize) {
        return null;
      }

      if (
        prev &&
        prev.width === baseSize.width &&
        prev.height === baseSize.height
      ) {
        return prev;
      }

      return baseSize;
    });
  }, [baseSize, pageNumber, pdf]);

  useEffect(() => {
    if (pageSize) return;

    let cancelled = false;

    void pdf
      .getPage(pageNumber)
      .then((page) => {
        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1 });
        const nextSize = { width: viewport.width, height: viewport.height };
        setPageSize(nextSize);
        onPageSize?.(pageNumber, nextSize);
      })
      .catch(() => {
        if (cancelled) return;

        const fallback = { width: 1, height: 1 };
        setPageSize(fallback);
        onPageSize?.(pageNumber, fallback);
      });

    return () => {
      cancelled = true;
    };
  }, [onPageSize, pageNumber, pageSize, pdf]);

  useEffect(() => {
    const target = containerRef.current;
    if (!rootEl || !target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const ratio = entry.intersectionRatio;

        onVisibilityChange?.(pageNumber, ratio);

        if (entry.isIntersecting || ratio > 0) {
          setShouldRender(true);
        }
      },
      {
        root: rootEl,
        rootMargin: PDF_PAGE_OBSERVER_ROOT_MARGIN,
        threshold: PDF_PAGE_OBSERVER_THRESHOLDS,
      },
    );

    observer.observe(target);

    return () => {
      onVisibilityChange?.(pageNumber, 0);
      observer.disconnect();
    };
  }, [onVisibilityChange, pageNumber, rootEl]);

  useEffect(() => {
    if (!shouldRender || scale <= 0) return;

    let cancelled = false;
    let renderTask: PdfJsRenderTask | null = null;

    const run = async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = opaqueCanvas
          ? canvas.getContext("2d", { alpha: false })
          : canvas.getContext("2d");

        if (!context) return;

        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
        canvas.height = Math.max(1, Math.floor(viewport.height * dpr));
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        renderTask = page.render({
          canvasContext: context,
          viewport,
          intent: "display",
        });

        await renderTask.promise;

        if (cancelled) return;

        setRendered(true);
        setError(null);
      } catch (errorValue: unknown) {
        if (cancelled) return;

        const message = getErrorMessage(errorValue);
        if (
          message.includes("cancelled") ||
          message.includes("Rendering cancelled")
        ) {
          return;
        }

        console.error("[PdfViewer] render error", errorValue);
        setError("PDFの描画に失敗しました");
      }
    };

    void run();

    return () => {
      cancelled = true;

      try {
        renderTask?.cancel?.();
      } catch {
        // noop
      }
    };
  }, [opaqueCanvas, pageNumber, pdf, scale, shouldRender]);

  const placeholderHeight =
    pageSize && pageSize.height > 0
      ? Math.max(1, Math.floor(pageSize.height * scale))
      : 0;

  return (
    <div
      ref={containerRef}
      className="flex w-full justify-center"
      style={
        placeholderHeight > 0
          ? { minHeight: `${placeholderHeight}px` }
          : undefined
      }
    >
      <div className="inline-block rounded-lg border border-slate-200 bg-white shadow-sm">
        {error && !rendered && (
          <div className="px-3 py-2 text-xs text-rose-500">{error}</div>
        )}
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  );
};
