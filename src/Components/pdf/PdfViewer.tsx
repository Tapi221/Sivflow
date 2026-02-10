import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { pdfjsLib } from '@/lib/pdfjs';
import { cn } from '@/lib/utils';

export interface PdfViewerHandle {
  scrollToPage: (page: number) => void;
  getScrollDiagnostics: () => {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
    maxScrollTop: number;
    overflowY: string;
    overscrollBehaviorY: string;
    isScrollable: boolean;
    numPages: number;
    currentPage: number;
    ancestorTransforms: Array<{
      tag: string;
      className: string;
      transform: string;
    }>;
  } | null;
  logScrollDiagnostics: () => void;
}

type PageSize = { width: number; height: number };

interface PdfViewerProps {
  source: {
    url?: string | null;
    data?: Uint8Array | null;
  };
  scale: number;
  minScale?: number;
  maxScale?: number;
  zoomStep?: number;
  onScaleChange?: (nextScale: number, source: 'wheel' | 'gesture') => void;
  onNumPages: (n: number) => void;
  onFirstPageSize?: (size: PageSize | null) => void;
  onPageChange?: (page: number) => void;
  onSourceLoadError?: (details: {
    kind: 'remote-url' | 'blob-url' | 'data' | 'unknown';
    url: string | null;
    message: string;
  }) => void;
  className?: string;
  pageGap?: number;
  sourceMeta?: {
    url?: string | null;
    blobUrl?: string | null;
    localFileId?: string | null;
    remoteUrl?: string | null;
    updatedAt?: string | number | null;
  };
  viewerOptions?: {
    enableXfa?: boolean;
    useSystemFonts?: boolean;
    cMapUrl?: string;
    standardFontDataUrl?: string;
    opaqueCanvas?: boolean;
  };
}

interface PdfPageProps {
  pdf: any;
  pageNumber: number;
  scale: number;
  opaqueCanvas: boolean;
  baseSize?: PageSize;
  rootEl: HTMLDivElement | null;
  pageRef: (el: HTMLDivElement | null) => void;
  onPageSize?: (pageNumber: number, size: PageSize) => void;
  onVisibilityChange?: (pageNumber: number, ratio: number) => void;
}

function PdfPage({
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
    setRendered(false);
    setError(null);
  }, [pdf, pageNumber, scale, opaqueCanvas]);

  useEffect(() => {
    if (!baseSize) return;
    setPageSize(baseSize);
  }, [baseSize?.width, baseSize?.height]);

  useEffect(() => {
    if (!pdf || pageSize) return;
    let cancelled = false;
    pdf
      .getPage(pageNumber)
      .then((page: any) => {
        if (cancelled) return;
        const viewport = page.getViewport({ scale: 1 });
        const nextSize = { width: viewport.width, height: viewport.height };
        setPageSize(nextSize);
        onPageSize?.(pageNumber, nextSize);
      })
      .catch(() => {
        if (!cancelled) {
          const fallback = { width: 1, height: 1 };
          setPageSize(fallback);
          onPageSize?.(pageNumber, fallback);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber, pageSize, onPageSize]);

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
        rootMargin: '800px 0px',
        threshold: [0, 0.05, 0.1, 0.25, 0.5, 0.75, 1],
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [rootEl, onVisibilityChange, pageNumber]);

  useEffect(() => {
    if (!pdf || !shouldRender || scale <= 0) return;
    let cancelled = false;
    let renderTask: any | null = null;

    (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = opaqueCanvas ? canvas.getContext('2d', { alpha: false }) : canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
        canvas.height = Math.max(1, Math.floor(viewport.height * dpr));
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        renderTask = page.render({ canvasContext: ctx, viewport, intent: 'display' });
        await renderTask.promise;

        if (!cancelled) {
          setRendered(true);
          setError(null);
        }
      } catch (err: any) {
        if (cancelled) return;
        const msg = String(err?.message ?? '');
        if (msg.includes('cancelled') || msg.includes('Rendering cancelled')) return;

        console.error('[PdfViewer] render error', err);
        setError('PDFの描画に失敗しました');
      }
    })();

    return () => {
      cancelled = true;
      if (renderTask?.cancel) {
        try {
          renderTask.cancel();
        } catch {}
      }
    };
  }, [pdf, pageNumber, scale, shouldRender, opaqueCanvas]);

  const placeholderHeight = pageSize && pageSize.height > 0 ? Math.max(1, Math.floor(pageSize.height * scale)) : 0;

  return (
    <div
      ref={containerRef}
      className="w-full flex justify-center"
      style={placeholderHeight > 0 ? { minHeight: `${placeholderHeight}px` } : undefined}
    >
      <div className="inline-block bg-white rounded-lg shadow-sm border border-slate-200">
        {error && !rendered && <div className="text-xs text-rose-500 px-3 py-2">{error}</div>}
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  );
}

export const PdfViewer = React.forwardRef<PdfViewerHandle, PdfViewerProps>(function PdfViewer(
  {
    source,
    scale,
    minScale = 0.5,
    maxScale = 3,
    zoomStep = 0.1,
    onScaleChange,
    onNumPages,
    onFirstPageSize,
    onPageChange,
    onSourceLoadError,
    className,
    pageGap = 16,
    viewerOptions,
    sourceMeta,
  }: PdfViewerProps,
  ref
) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollContainerEl, setScrollContainerEl] = useState<HTMLDivElement | null>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const rafRef = useRef<number | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const pageChangeRafRef = useRef<number | null>(null);
  const pendingPageForCallbackRef = useRef<number | null>(null);
  const docRef = useRef<any | null>(null);
  const visibilityRatiosRef = useRef<Record<number, number>>({});
  const currentPageRef = useRef(1);
  const onPageChangeRef = useRef(onPageChange);

  const [doc, setDoc] = useState<any | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageSizes, setPageSizes] = useState<Record<number, PageSize>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const sourceUrl = typeof source?.url === 'string' ? source.url.trim() : '';
  const sourceData = source?.data instanceof Uint8Array ? source.data : null;
  const sourceDataLength = sourceData?.byteLength ?? 0;
  const sourceMetaUrl = sourceMeta?.url ?? null;
  const sourceMetaBlobUrl = sourceMeta?.blobUrl ?? null;
  const sourceMetaLocalFileId = sourceMeta?.localFileId ?? null;
  const sourceMetaRemoteUrl = sourceMeta?.remoteUrl ?? null;
  const sourceMetaUpdatedAt = sourceMeta?.updatedAt ?? null;
  const scaleRef = useRef(scale);
  const minScaleRef = useRef(minScale);
  const maxScaleRef = useRef(maxScale);
  const zoomStepRef = useRef(zoomStep);
  const onScaleChangeRef = useRef(onScaleChange);
  const gestureStartScaleRef = useRef<number | null>(null);
  const wheelDeltaRef = useRef(0);
  const wheelZoomRafRef = useRef<number | null>(null);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    minScaleRef.current = minScale;
    maxScaleRef.current = maxScale;
  }, [minScale, maxScale]);

  useEffect(() => {
    zoomStepRef.current = zoomStep;
  }, [zoomStep]);

  useEffect(() => {
    onScaleChangeRef.current = onScaleChange;
  }, [onScaleChange]);

  const clampScale = useCallback((value: number) => {
    const lower = Math.min(minScaleRef.current, maxScaleRef.current);
    const upper = Math.max(minScaleRef.current, maxScaleRef.current);
    return Math.min(Math.max(value, lower), upper);
  }, []);

  const requestScaleChange = useCallback((nextScale: number, source: 'wheel' | 'gesture') => {
    const handler = onScaleChangeRef.current;
    if (!handler || !Number.isFinite(nextScale)) return;
    const clamped = Number(clampScale(nextScale).toFixed(3));
    if (!Number.isFinite(clamped)) return;
    if (Math.abs(clamped - scaleRef.current) < 0.0005) return;
    handler(clamped, source);
  }, [clampScale]);

  useEffect(() => {
    const container = scrollContainerEl;
    if (!container) return;

    const logZoomInput = (payload: {
      source: 'wheel' | 'gesture';
      deltaY: number | null;
      direction: number;
      nextScale: number;
    }) => {
      if (!import.meta.env.DEV) return;
      console.debug('[PdfViewer] zoom input', payload);
    };

    const stopNativeEvent = (event: Event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
      event.stopPropagation();
      (event as Event & { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
    };

    const handleWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      stopNativeEvent(event);
      if (gestureStartScaleRef.current !== null) return;
      wheelDeltaRef.current += event.deltaY;
      if (wheelZoomRafRef.current !== null) return;

      wheelZoomRafRef.current = window.requestAnimationFrame(() => {
        wheelZoomRafRef.current = null;
        const delta = wheelDeltaRef.current;
        wheelDeltaRef.current = 0;
        if (!delta) return;
        const direction = Math.sign(delta);
        if (!direction) return;
        const step = Math.max(0.001, zoomStepRef.current);
        const nextScale = direction > 0 ? scaleRef.current - step : scaleRef.current + step;
        const normalizedNextScale = Number(clampScale(nextScale).toFixed(3));
        logZoomInput({
          source: 'wheel',
          deltaY: delta,
          direction,
          nextScale: normalizedNextScale,
        });
        requestScaleChange(normalizedNextScale, 'wheel');
      });
    };

    const handleGestureStart = (event: Event) => {
      stopNativeEvent(event);
      gestureStartScaleRef.current = scaleRef.current;
    };

    const handleGestureChange = (event: Event) => {
      stopNativeEvent(event);
      const gestureScale = (event as Event & { scale?: number }).scale;
      if (typeof gestureScale !== 'number' || !Number.isFinite(gestureScale)) return;
      const baseScale = gestureStartScaleRef.current ?? scaleRef.current;
      const nextScale = baseScale * gestureScale;
      const normalizedNextScale = Number(clampScale(nextScale).toFixed(3));
      logZoomInput({
        source: 'gesture',
        deltaY: null,
        direction: Math.sign(normalizedNextScale - scaleRef.current),
        nextScale: normalizedNextScale,
      });
      requestScaleChange(normalizedNextScale, 'gesture');
    };

    const handleGestureEnd = (event: Event) => {
      stopNativeEvent(event);
      gestureStartScaleRef.current = null;
    };

    const supportsGestureEvents = 'ongesturestart' in window;

    container.addEventListener('wheel', handleWheel, { passive: false });
    if (supportsGestureEvents) {
      container.addEventListener('gesturestart', handleGestureStart, { passive: false });
      container.addEventListener('gesturechange', handleGestureChange, { passive: false });
      container.addEventListener('gestureend', handleGestureEnd, { passive: false });
    }

    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (supportsGestureEvents) {
        container.removeEventListener('gesturestart', handleGestureStart);
        container.removeEventListener('gesturechange', handleGestureChange);
        container.removeEventListener('gestureend', handleGestureEnd);
      }
      if (wheelZoomRafRef.current !== null) {
        cancelAnimationFrame(wheelZoomRafRef.current);
        wheelZoomRafRef.current = null;
      }
      wheelDeltaRef.current = 0;
      gestureStartScaleRef.current = null;
    };
  }, [clampScale, requestScaleChange, scrollContainerEl]);
  const sourceKey = [
    sourceUrl ? `url:${sourceUrl}` : null,
    sourceDataLength > 0 ? `data:${sourceDataLength}` : null,
    sourceMetaRemoteUrl ? `remote:${sourceMetaRemoteUrl}` : null,
    sourceMetaBlobUrl ? `blob:${sourceMetaBlobUrl}` : null,
    sourceMetaLocalFileId ? `localFileId:${sourceMetaLocalFileId}` : null,
  ]
    .filter(Boolean)
    .join('|');
  const enableXfa = viewerOptions?.enableXfa ?? false;
  const useSystemFonts = viewerOptions?.useSystemFonts ?? false;
  const cMapUrl = viewerOptions?.cMapUrl;
  const standardFontDataUrl = viewerOptions?.standardFontDataUrl;

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  const scheduleOnPageChange = useCallback((page: number) => {
    pendingPageForCallbackRef.current = page;
    if (pageChangeRafRef.current !== null) return;
    pageChangeRafRef.current = requestAnimationFrame(() => {
      pageChangeRafRef.current = null;
      const pendingPage = pendingPageForCallbackRef.current;
      pendingPageForCallbackRef.current = null;
      if (typeof pendingPage === 'number') {
        onPageChangeRef.current?.(pendingPage);
      }
    });
  }, []);

  const setCurrentPageSafe = useCallback(
    (page: number) => {
      const clamped = Math.min(Math.max(page, 1), Math.max(numPages, 1));
      if (currentPageRef.current === clamped) return;
      currentPageRef.current = clamped;
      setCurrentPage(clamped);
      scheduleOnPageChange(clamped);
    },
    [numPages, scheduleOnPageChange]
  );

  const estimateCurrentPageFromScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || numPages <= 0) return;

    const targetTop = container.scrollTop;
    let lo = 0;
    let hi = numPages - 1;

    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      const midEl = pageRefs.current[mid];
      const midTop = midEl ? midEl.offsetTop : Number.MAX_SAFE_INTEGER;
      if (midTop < targetTop) lo = mid + 1;
      else hi = mid;
    }

    const rightIndex = lo;
    const leftIndex = Math.max(0, rightIndex - 1);
    const leftTop = pageRefs.current[leftIndex]?.offsetTop ?? 0;
    const rightTop = pageRefs.current[rightIndex]?.offsetTop ?? Number.MAX_SAFE_INTEGER;
    const nearestIndex =
      Math.abs(leftTop - targetTop) <= Math.abs(rightTop - targetTop) ? leftIndex : rightIndex;

    setCurrentPageSafe(nearestIndex + 1);
  }, [numPages, setCurrentPageSafe]);

  const handleScroll = useCallback(() => {
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      estimateCurrentPageFromScroll();
    });
  }, [estimateCurrentPageFromScroll]);

  useEffect(() => {
  let cancelled = false;
  let loadingTask: any | null = null;

  // 既存 doc の破棄
  if (docRef.current?.destroy) {
    try {
      docRef.current.destroy();
    } catch {}
  }
  docRef.current = null;

  // state reset
  setDoc(null);
  setNumPages(0);
  setPageSizes({});
  setError(null);
  setCurrentPage(1);
  currentPageRef.current = 1;
  pageRefs.current = [];
  visibilityRatiosRef.current = {};
  if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;

  const hasUrl = sourceUrl.length > 0;
  const hasData = sourceDataLength > 0;

  // ✅ 空ソースは沈黙させない
  if (!hasUrl && !hasData) {
    setLoading(false);
    setError('PDFソースが見つかりません（URL/データが空）');
    onNumPages(0);
    onFirstPageSize?.(null);
    return;
  }

  setLoading(true);

  console.info('[PdfViewer] source diagnostic', {
    sourceUrl,
    dataByteLength: sourceDataLength,
    sourceBlobUrl: sourceMetaBlobUrl,
    sourceKey,
    sourceMeta: {
      url: sourceMetaUrl,
      blobUrl: sourceMetaBlobUrl,
      localFileId: sourceMetaLocalFileId,
      remoteUrl: sourceMetaRemoteUrl,
      updatedAt: sourceMetaUpdatedAt,
    },
  });

  const buildGetDocumentParams = async () => {
    const params: any = {
      enableXfa,
      useSystemFonts,
      cMapUrl,
      standardFontDataUrl,
    };

    if (hasData && sourceData) {
      params.data = sourceData;
      return params;
    }

    if (hasUrl) {
      if (sourceUrl.startsWith('blob:')) {
        const res = await fetch(sourceUrl);
        if (!res.ok) throw new Error(`blob fetch failed: ${res.status}`);
        const buf = await res.arrayBuffer();
        params.data = new Uint8Array(buf);
        return params;
      }
      params.url = sourceUrl;
      return params;
    }

    return null;
  };

  (async () => {
    try {
      const params = await buildGetDocumentParams();
      if (!params) throw new Error('missing pdf source');

      loadingTask = pdfjsLib.getDocument(params);
      const pdf = await loadingTask.promise;

      if (cancelled) {
        pdf.destroy?.();
        return;
      }

      if (docRef.current?.destroy) {
        try {
          docRef.current.destroy();
        } catch {}
      }
      docRef.current = pdf;

      setDoc(pdf);
      setNumPages(pdf.numPages || 0);
      onNumPages(pdf.numPages || 0);
      pageRefs.current = new Array(pdf.numPages || 0).fill(null);
      visibilityRatiosRef.current = {};
      setError(null);
    } catch (err: any) {
      if (cancelled) return;

      const msg = String(err?.message ?? err ?? '');
      console.error('[PdfViewer] load error', {
        error: err,
        hasUrl,
        hasData,
        dataByteLength: sourceDataLength,
        url: sourceMetaUrl ?? (sourceUrl || null),
        blobUrl: sourceMetaBlobUrl,
        localFileId: sourceMetaLocalFileId,
        remoteUrl: sourceMetaRemoteUrl,
        sourceUpdatedAt: sourceMetaUpdatedAt,
      });

      setDoc(null);
      setNumPages(0);
      onNumPages(0);
      onFirstPageSize?.(null);
      setError(`PDFの読み込みに失敗しました: ${msg}`);
      if (onSourceLoadError) {
        const kind = hasData
          ? 'data'
          : hasUrl && sourceUrl.startsWith('blob:')
            ? 'blob-url'
            : hasUrl
              ? 'remote-url'
              : 'unknown';
        try {
          onSourceLoadError({
            kind,
            url: hasUrl ? sourceUrl : null,
            message: msg,
          });
        } catch (callbackError) {
          console.warn('[PdfViewer] onSourceLoadError callback failed', callbackError);
        }
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
  })();

  return () => {
    cancelled = true;
    try {
      loadingTask?.destroy?.();
    } catch {}
    try {
      docRef.current?.destroy?.();
    } catch {}
    docRef.current = null;
  };
}, [
  sourceKey,
  sourceData,
  sourceDataLength,
  sourceUrl,
  onNumPages,
  onFirstPageSize,
  onSourceLoadError,
  enableXfa,
  useSystemFonts,
  cMapUrl,
  standardFontDataUrl,
  sourceMetaUrl,
  sourceMetaBlobUrl,
  sourceMetaLocalFileId,
  sourceMetaRemoteUrl,
]);


  useEffect(() => {
    if (!doc) return;
    let cancelled = false;

    (async () => {
      try {
        const page = await doc.getPage(1);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: 1 });
        const size = { width: viewport.width, height: viewport.height };
        setPageSizes({ 1: size });
        onFirstPageSize?.(size);
      } catch {
        if (!cancelled) {
          const size = { width: 1, height: 1 };
          setPageSizes({ 1: size });
          onFirstPageSize?.(size);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [doc, onFirstPageSize]);

  useEffect(() => {
    if (!numPages) return;
    const next: Record<number, number> = {};
    for (const [key, ratio] of Object.entries(visibilityRatiosRef.current)) {
      const page = Number(key);
      if (!Number.isFinite(page) || page < 1 || page > numPages) continue;
      next[page] = ratio;
    }
    visibilityRatiosRef.current = next;
  }, [numPages]);

  useEffect(() => {
    return () => {
      if (docRef.current?.destroy) {
        try {
          docRef.current.destroy();
        } catch {}
      }
      docRef.current = null;
    };
  }, []);

  const schedulePageUpdate = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const entries = Object.entries(visibilityRatiosRef.current);
      if (entries.length === 0) return;
      let maxPage = 1;
      let maxRatio = -1;
      for (const [key, ratio] of entries) {
        const page = Number(key);
        if (!Number.isFinite(page) || !Number.isFinite(ratio)) continue;
        if (ratio > maxRatio) {
          maxRatio = ratio;
          maxPage = page;
        }
      }
      if (maxRatio < 0.05) return;
      setCurrentPageSafe(maxPage);
    });
  }, [setCurrentPageSafe]);

  useEffect(() => {
    if (!doc) return;
    schedulePageUpdate();
  }, [doc, scale, schedulePageUpdate]);

  useEffect(() => {
    if (!doc || numPages <= 0) return;
    estimateCurrentPageFromScroll();
  }, [doc, numPages, estimateCurrentPageFromScroll]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
      if (pageChangeRafRef.current !== null) {
        cancelAnimationFrame(pageChangeRafRef.current);
        pageChangeRafRef.current = null;
      }
      pendingPageForCallbackRef.current = null;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => {
      const getScrollDiagnostics = () => {
        const container = scrollContainerRef.current;
        if (!container) return null;
        const style = window.getComputedStyle(container);
        const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
        const ancestorTransforms: Array<{ tag: string; className: string; transform: string }> = [];
        let current: HTMLElement | null = container.parentElement;

        while (current) {
          const currentStyle = window.getComputedStyle(current);
          if (currentStyle.transform && currentStyle.transform !== 'none') {
            ancestorTransforms.push({
              tag: current.tagName.toLowerCase(),
              className: current.className || '',
              transform: currentStyle.transform,
            });
          }
          current = current.parentElement;
        }

        return {
          scrollTop: container.scrollTop,
          scrollHeight: container.scrollHeight,
          clientHeight: container.clientHeight,
          maxScrollTop,
          overflowY: style.overflowY,
          overscrollBehaviorY: style.overscrollBehaviorY,
          isScrollable: maxScrollTop > 0 && ['auto', 'scroll', 'overlay'].includes(style.overflowY),
          numPages,
          currentPage: currentPageRef.current,
          ancestorTransforms,
        };
      };

      return {
        scrollToPage: (page: number) => {
          const container = scrollContainerRef.current;
          if (!container) return;
          const clamped = Math.min(Math.max(page, 1), numPages || 1);
          const target = pageRefs.current[clamped - 1];
          if (!target) return;
          container.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
        },
        getScrollDiagnostics,
        logScrollDiagnostics: () => {
          console.info('[PdfViewer] scroll diagnostics', getScrollDiagnostics());
        },
      };
    },
    [numPages]
  );

  return (
    <div
      // スクロール担当はこの ScrollContainer のみ（body/祖先スクロールには依存しない）
      ref={(el) => {
        scrollContainerRef.current = el;
        setScrollContainerEl((prev) => (prev === el ? prev : el));
      }}
      onScroll={handleScroll}
      data-testid="pdf-scroll-container"
      className={cn(
        'h-full min-h-0 w-full bg-slate-50',
        className
      )}
      style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        overflow: 'auto',
        overflowX: 'hidden',
      }}
    >
      <div className="p-2 min-w-0">
        {loading && <div className="text-xs text-slate-400 mb-2">読み込み中...</div>}
        {error && <div className="text-sm text-rose-500">{error}</div>}
        {!error && doc && (
          <div className="flex flex-col items-center" style={{ gap: `${pageGap}px` }}>
            {Array.from({ length: numPages }).map((_, index) => {
              const pageNumber = index + 1;
              const WINDOW = 6;
              const inWindow = Math.abs(pageNumber - currentPage) <= WINDOW;

              const base = pageSizes[pageNumber] ?? pageSizes[1];
              const placeholderHeight = base && base.height > 0 ? Math.max(1, Math.floor(base.height * scale)) : 200;

              return (
                <div
                  key={`pdf-row-${pageNumber}`}
                  ref={(el) => { pageRefs.current[index] = el; }}
                  style={{ minHeight: `${placeholderHeight}px` }}
                  className="w-full flex justify-center"
                >
                  {inWindow ? (
                    <PdfPage
                      pdf={doc}
                      pageNumber={pageNumber}
                      scale={scale}
                      baseSize={pageSizes[pageNumber]}
                      rootEl={scrollContainerEl}
                      pageRef={() => {}}
                      opaqueCanvas={viewerOptions?.opaqueCanvas ?? false}
                      onPageSize={(pn, size) => {
                        setPageSizes((prev) => {
                          const existing = prev[pn];
                          if (existing && existing.width === size.width && existing.height === size.height) return prev;
                          return { ...prev, [pn]: size };
                        });
                      }}
                      onVisibilityChange={(pn, ratio) => {
                        if (ratio < 0.05) delete visibilityRatiosRef.current[pn];
                        else visibilityRatiosRef.current[pn] = ratio;
                        schedulePageUpdate();
                      }}
                    />
                  ) : (
                    <div className="w-full" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
