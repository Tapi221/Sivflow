import { useEffect, useRef, useState } from "react";
import { pdfjsLib } from "@/lib/pdfjs";

export type PageSize = { width: number; height: number };

export type SourceLoadErrorKind = "remote-url" | "blob-url" | "data" | "unknown";

export interface PdfDocumentProxy {
  numPages: number;
  getPage(n: number): Promise<PdfPageProxy>;
  destroy(): void;
}

export interface PdfPageProxy {
  getViewport(params: { scale: number }): { width: number; height: number };
  render(params: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
    intent: string;
  }): { promise: Promise<void>; cancel(): void };
}

export interface PdfDocumentResult {
  doc: PdfDocumentProxy | null;
  numPages: number;
  pageSizes: Record<number, PageSize>;
  loading: boolean;
  error: string | null;
  setPageSizes: React.Dispatch<React.SetStateAction<Record<number, PageSize>>>;
}

interface UsePdfDocumentParams {
  source: { url?: string | null; data?: Uint8Array | null };
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
  };
  onNumPages: (n: number) => void;
  onFirstPageSize?: (size: PageSize | null) => void;
  onSourceLoadError?: (details: {
    kind: SourceLoadErrorKind;
    url: string | null;
    message: string;
  }) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  pageRefsRef: React.RefObject<Array<HTMLDivElement | null>>;
  visibilityRatiosRef: React.RefObject<Record<number, number>>;
  currentPageRef: React.RefObject<number>;
}

export function usePdfDocument({
  source,
  sourceMeta,
  viewerOptions,
  onNumPages,
  onFirstPageSize,
  onSourceLoadError,
  scrollContainerRef,
  pageRefsRef,
  visibilityRatiosRef,
  currentPageRef,
}: UsePdfDocumentParams): PdfDocumentResult {
  const sourceUrl = typeof source?.url === "string" ? source.url.trim() : "";
  const sourceData = source?.data instanceof Uint8Array ? source.data : null;
  const sourceDataLength = sourceData?.byteLength ?? 0;

  const sourceMetaUrl = sourceMeta?.url ?? null;
  const sourceMetaBlobUrl = sourceMeta?.blobUrl ?? null;
  const sourceMetaLocalFileId = sourceMeta?.localFileId ?? null;
  const sourceMetaRemoteUrl = sourceMeta?.remoteUrl ?? null;
  const sourceMetaUpdatedAt = sourceMeta?.updatedAt ?? null;

  const enableXfa = viewerOptions?.enableXfa ?? false;
  const useSystemFonts = viewerOptions?.useSystemFonts ?? false;
  const cMapUrl = viewerOptions?.cMapUrl;
  const standardFontDataUrl = viewerOptions?.standardFontDataUrl;

  const sourceKey = [
    sourceUrl ? `url:${sourceUrl}` : null,
    sourceDataLength > 0 ? `data:${sourceDataLength}` : null,
    sourceMetaRemoteUrl ? `remote:${sourceMetaRemoteUrl}` : null,
    sourceMetaBlobUrl ? `blob:${sourceMetaBlobUrl}` : null,
    sourceMetaLocalFileId ? `localFileId:${sourceMetaLocalFileId}` : null,
  ]
    .filter(Boolean)
    .join("|");

  const docRef = useRef<PdfDocumentProxy | null>(null);
  const [doc, setDoc] = useState<PdfDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageSizes, setPageSizes] = useState<Record<number, PageSize>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load
  useEffect(() => {
    let cancelled = false;
    let loadingTask: { promise: Promise<PdfDocumentProxy>; destroy?(): void } | null = null;

    if (docRef.current) {
      try { docRef.current.destroy(); } catch { /* noop */ }
      docRef.current = null;
    }

    setDoc(null);
    setNumPages(0);
    setPageSizes({});
    setError(null);
    currentPageRef.current = 1;
    pageRefsRef.current = [];
    visibilityRatiosRef.current = {};
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;

    const hasUrl = sourceUrl.length > 0;
    const hasData = sourceDataLength > 0;

    if (!hasUrl && !hasData) {
      setLoading(false);
      setError("PDFソースが見つかりません（URL/データが空）");
      onNumPages(0);
      onFirstPageSize?.(null);
      return;
    }

    setLoading(true);

    console.info("[PdfViewer] source diagnostic", {
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

    const buildParams = async (): Promise<Record<string, unknown> | null> => {
      const params: Record<string, unknown> = {
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
        if (sourceUrl.startsWith("blob:")) {
          const res = await fetch(sourceUrl);
          if (!res.ok) throw new Error(`blob fetch failed: ${res.status}`);
          params.data = new Uint8Array(await res.arrayBuffer());
          return params;
        }
        params.url = sourceUrl;
        return params;
      }
      return null;
    };

    (async () => {
      try {
        const params = await buildParams();
        if (!params) throw new Error("missing pdf source");

        loadingTask = pdfjsLib.getDocument(params) as {
          promise: Promise<PdfDocumentProxy>;
          destroy?(): void;
        };
        const pdf = await loadingTask.promise;

        if (cancelled) { pdf.destroy?.(); return; }

        if (docRef.current) {
          try { docRef.current.destroy(); } catch { /* noop */ }
        }
        docRef.current = pdf;
        setDoc(pdf);
        setNumPages(pdf.numPages || 0);
        onNumPages(pdf.numPages || 0);
        pageRefsRef.current = new Array(pdf.numPages || 0).fill(null);
        visibilityRatiosRef.current = {};
        setError(null);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = String((err as { message?: string })?.message ?? err ?? "");
        console.error("[PdfViewer] load error", {
          error: err, hasUrl, hasData,
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
          const kind: SourceLoadErrorKind = hasData
            ? "data"
            : hasUrl && sourceUrl.startsWith("blob:")
              ? "blob-url"
              : hasUrl ? "remote-url" : "unknown";
          try {
            onSourceLoadError({ kind, url: hasUrl ? sourceUrl : null, message: msg });
          } catch (cbErr) {
            console.warn("[PdfViewer] onSourceLoadError callback failed", cbErr);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      try { loadingTask?.destroy?.(); } catch { /* noop */ }
      try { docRef.current?.destroy(); } catch { /* noop */ }
      docRef.current = null;
    };
  }, [
    sourceKey, sourceData, sourceDataLength, sourceUrl,
    onNumPages, onFirstPageSize, onSourceLoadError,
    enableXfa, useSystemFonts, cMapUrl, standardFontDataUrl,
    sourceMetaUrl, sourceMetaBlobUrl, sourceMetaLocalFileId,
    sourceMetaRemoteUrl, sourceMetaUpdatedAt,
  ]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      try { docRef.current?.destroy(); } catch { /* noop */ }
      docRef.current = null;
    };
  }, []);

  // First page size
  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    (async () => {
      try {
        const page = await doc.getPage(1);
        if (cancelled) return;
        const vp = page.getViewport({ scale: 1 });
        const size: PageSize = { width: vp.width, height: vp.height };
        setPageSizes({ 1: size });
        onFirstPageSize?.(size);
      } catch {
        if (!cancelled) {
          const size: PageSize = { width: 1, height: 1 };
          setPageSizes({ 1: size });
          onFirstPageSize?.(size);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [doc, onFirstPageSize]);

  // numPages 変化時に visibility を trim
  useEffect(() => {
    if (!numPages) return;
    const next: Record<number, number> = {};
    for (const [key, ratio] of Object.entries(visibilityRatiosRef.current)) {
      const page = Number(key);
      if (!Number.isFinite(page) || page < 1 || page > numPages) continue;
      next[page] = ratio;
    }
    visibilityRatiosRef.current = next;
  }, [numPages, visibilityRatiosRef]);

  return { doc, numPages, pageSizes, loading, error, setPageSizes };
}



