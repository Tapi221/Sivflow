import { useEffect, useRef, useState } from "react";
import type { PageSize, PdfDocumentProxy } from "./hooks/usePdfDocument";

interface PdfPageProps {
  pdf: PdfDocumentProxy;
  pageNumber: number;
  scale: number;
  opaqueCanvas: boolean;
  baseSize?: PageSize;
  rootEl: HTMLDivElement | null;
  pageRef: (el: HTMLDivElement | null) => void;
  onPageSize?: (pageNumber: number, size: PageSize) => void;
  onVisibilityChange?: (pageNumber: number, ratio: number) => void;
}

export function PdfPage({
  pdf,
  pageNumber,
  scale,
  opaqueCanvas,
  baseSize,
  rootEl,
  pageRef,
  onPageSize,
  onVisibilityChange,
}: PdfPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pageSize, setPageSize] = useState<PageSize | null>(baseSize ?? null);
  const [shouldRender, setShouldRender] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pageRef(containerRef.current);
    return () => pageRef(null);
  }, [pageRef]);

  useEffect(() => {
    queueMicrotask(() => setRendered(false));
    queueMicrotask(() => setError(null));
  }, [pdf, pageNumber, scale, opaqueCanvas]);

  useEffect(() => {
    if (!baseSize) return;
    queueMicrotask(() => setPageSize(baseSize));
  }, [baseSize, baseSize?.width, baseSize?.height]);

  useEffect(() => {
    if (!pdf || pageSize) return;
    let cancelled = false;
    pdf
      .getPage(pageNumber)
      .then((page) => {
        if (cancelled) return;
        const vp = page.getViewport({ scale: 1 });
        const nextSize: PageSize = { width: vp.width, height: vp.height };
        setPageSize(nextSize);
        onPageSize?.(pageNumber, nextSize);
      })
      .catch(() => {
        if (!cancelled) {
          const fallback: PageSize = { width: 1, height: 1 };
          setPageSize(fallback);
          onPageSize?.(pageNumber, fallback);
        }
      });
    return () => { cancelled = true; };
  }, [pdf, pageNumber, pageSize, onPageSize]);

  useEffect(() => {
    const target = containerRef.current;
    if (!rootEl || !target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const ratio = entry.intersectionRatio;
        onVisibilityChange?.(pageNumber, ratio);
        if (entry.isIntersecting || ratio > 0) setShouldRender(true);
      },
      { root: rootEl, rootMargin: "800px 0px", threshold: [0, 0.05, 0.1, 0.25, 0.5, 0.75, 1] },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [rootEl, onVisibilityChange, pageNumber]);

  useEffect(() => {
    if (!pdf || !shouldRender || scale <= 0) return;
    let cancelled = false;
    let renderTask: { promise: Promise<void>; cancel(): void } | null = null;

    (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = opaqueCanvas
          ? canvas.getContext("2d", { alpha: false })
          : canvas.getContext("2d");
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
        canvas.height = Math.max(1, Math.floor(viewport.height * dpr));
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        renderTask = page.render({ canvasContext: ctx, viewport, intent: "display" });
        await renderTask.promise;
        if (!cancelled) { setRendered(true); setError(null); }
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = String((err as { message?: string })?.message ?? "");
        if (msg.includes("cancelled") || msg.includes("Rendering cancelled")) return;
        console.error("[PdfViewer] render error", err);
        setError("PDFの描画に失敗しました");
      }
    })();

    return () => {
      cancelled = true;
      try { renderTask?.cancel(); } catch { /* noop */ }
    };
  }, [pdf, pageNumber, scale, shouldRender, opaqueCanvas]);

  const placeholderHeight =
    pageSize && pageSize.height > 0 ? Math.max(1, Math.floor(pageSize.height * scale)) : 0;

  return (
    <div
      ref={containerRef}
      className="w-full flex justify-center"
      style={placeholderHeight > 0 ? { minHeight: `${placeholderHeight}px` } : undefined}
    >
      <div className="inline-block bg-white rounded-lg shadow-sm border border-slate-200">
        {error && !rendered && (
          <div className="text-xs text-rose-500 px-3 py-2">{error}</div>
        )}
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  );
}



