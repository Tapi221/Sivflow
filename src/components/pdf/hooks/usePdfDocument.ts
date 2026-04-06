import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PageSize,
  PdfJsDocument,
  PdfJsGetDocumentParams,
  PdfJsLoadingTask,
  PdfViewerOptions,
  PdfViewerSourceMeta,
  SourceLoadErrorKind,
} from "@/components/pdf/pdfViewerTypes";
import {
  destroyPdfResource,
  getErrorMessage,
  getPdfDocument,
} from "@/components/pdf/pdfViewerTypes";

interface UsePdfDocumentOptions {
  source: {
    url?: string | null;
    data?: Uint8Array | null;
  };
  viewerOptions?: PdfViewerOptions;
  sourceMeta?: PdfViewerSourceMeta;
  onNumPages: (n: number) => void;
  onFirstPageSize?: (size: PageSize | null) => void;
  onSourceLoadError?: (details: {
    kind: SourceLoadErrorKind;
    url: string | null;
    message: string;
  }) => void;
}

interface UsePdfDocumentResult {
  doc: PdfJsDocument | null;
  numPages: number;
  pageSizes: Record<number, PageSize>;
  loading: boolean;
  error: string | null;
  setPageSize: (pageNumber: number, size: PageSize) => void;
}

export const usePdfDocument = ({
  source,
  viewerOptions,
  sourceMeta,
  onNumPages,
  onFirstPageSize,
  onSourceLoadError,
}: UsePdfDocumentOptions): UsePdfDocumentResult => {
  const docRef = useRef<PdfJsDocument | null>(null);
  const onNumPagesRef = useRef(onNumPages);
  const onFirstPageSizeRef = useRef(onFirstPageSize);
  const onSourceLoadErrorRef = useRef(onSourceLoadError);
  const sourceMetaRef = useRef(sourceMeta);

  const [doc, setDoc] = useState<PdfJsDocument | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageSizes, setPageSizes] = useState<Record<number, PageSize>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceUrl = typeof source?.url === "string" ? source.url.trim() : "";
  const sourceData = source?.data instanceof Uint8Array ? source.data : null;
  const sourceDataLength = sourceData?.byteLength ?? 0;

  const enableXfa = viewerOptions?.enableXfa ?? false;
  const useSystemFonts = viewerOptions?.useSystemFonts ?? false;
  const cMapUrl = viewerOptions?.cMapUrl;
  const standardFontDataUrl = viewerOptions?.standardFontDataUrl;

  useEffect(() => {
    onNumPagesRef.current = onNumPages;
  }, [onNumPages]);

  useEffect(() => {
    onFirstPageSizeRef.current = onFirstPageSize;
  }, [onFirstPageSize]);

  useEffect(() => {
    onSourceLoadErrorRef.current = onSourceLoadError;
  }, [onSourceLoadError]);

  useEffect(() => {
    sourceMetaRef.current = sourceMeta;
  }, [sourceMeta]);

  const setPageSize = useCallback((pageNumber: number, size: PageSize) => {
    setPageSizes((prev) => {
      const existing = prev[pageNumber];
      if (
        existing &&
        existing.width === size.width &&
        existing.height === size.height
      ) {
        return prev;
      }

      return { ...prev, [pageNumber]: size };
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PdfJsLoadingTask | null = null;

    destroyPdfResource(docRef.current);
    docRef.current = null;

    setDoc(null);
    setNumPages(0);
    setPageSizes({});
    setError(null);

    const hasUrl = sourceUrl.length > 0;
    const hasData = sourceDataLength > 0;

    if (!hasUrl && !hasData) {
      setLoading(false);
      setError("PDFソースが見つかりません（URL/データが空）");
      onNumPagesRef.current(0);
      onFirstPageSizeRef.current?.(null);
      return () => {
        cancelled = true;
      };
    }

    const loadFirstPageSize = async (pdf: PdfJsDocument, pageCount: number) => {
      if (pageCount <= 0) {
        setPageSizes({});
        onFirstPageSizeRef.current?.(null);
        return;
      }

      try {
        const firstPage = await pdf.getPage(1);
        if (cancelled) return;

        const viewport = firstPage.getViewport({ scale: 1 });
        const size = { width: viewport.width, height: viewport.height };
        setPageSizes({ 1: size });
        onFirstPageSizeRef.current?.(size);
      } catch {
        if (cancelled) return;

        const fallback = { width: 1, height: 1 };
        setPageSizes({ 1: fallback });
        onFirstPageSizeRef.current?.(fallback);
      }
    };

    const buildGetDocumentParams =
      async (): Promise<PdfJsGetDocumentParams> => {
        const params: PdfJsGetDocumentParams = {
          enableXfa,
          useSystemFonts,
          cMapUrl,
          standardFontDataUrl,
        };

        if (hasData && sourceData) {
          params.data = sourceData;
          return params;
        }

        if (!hasUrl) {
          throw new Error("missing pdf source");
        }

        if (sourceUrl.startsWith("blob:")) {
          const response = await fetch(sourceUrl);
          if (!response.ok) {
            throw new Error(`blob fetch failed: ${response.status}`);
          }

          const buffer = await response.arrayBuffer();
          params.data = new Uint8Array(buffer);
          return params;
        }

        params.url = sourceUrl;
        return params;
      };

    const run = async () => {
      setLoading(true);

      console.info("[PdfViewer] source diagnostic", {
        sourceUrl,
        dataByteLength: sourceDataLength,
        sourceMeta: {
          url: sourceMetaRef.current?.url ?? null,
          blobUrl: sourceMetaRef.current?.blobUrl ?? null,
          localFileId: sourceMetaRef.current?.localFileId ?? null,
          remoteUrl: sourceMetaRef.current?.remoteUrl ?? null,
        },
      });

      try {
        const params = await buildGetDocumentParams();
        if (cancelled) return;

        loadingTask = getPdfDocument(params);
        const pdf = await loadingTask.promise;

        if (cancelled) {
          destroyPdfResource(pdf);
          return;
        }

        destroyPdfResource(docRef.current);
        docRef.current = pdf;

        const pageCount = Math.max(0, pdf.numPages || 0);

        setDoc(pdf);
        setNumPages(pageCount);
        onNumPagesRef.current(pageCount);
        setError(null);

        await loadFirstPageSize(pdf, pageCount);
      } catch (errorValue: unknown) {
        if (cancelled) return;

        const message = getErrorMessage(errorValue);

        console.error("[PdfViewer] load error", {
          error: errorValue,
          hasUrl,
          hasData,
          dataByteLength: sourceDataLength,
          url: sourceMetaRef.current?.url ?? (sourceUrl || null),
          blobUrl: sourceMetaRef.current?.blobUrl ?? null,
          localFileId: sourceMetaRef.current?.localFileId ?? null,
          remoteUrl: sourceMetaRef.current?.remoteUrl ?? null,
        });

        setDoc(null);
        setNumPages(0);
        setPageSizes({});
        setError(`PDFの読み込みに失敗しました: ${message}`);
        onNumPagesRef.current(0);
        onFirstPageSizeRef.current?.(null);

        const kind: SourceLoadErrorKind = hasData
          ? "data"
          : hasUrl && sourceUrl.startsWith("blob:")
            ? "blob-url"
            : hasUrl
              ? "remote-url"
              : "unknown";

        try {
          onSourceLoadErrorRef.current?.({
            kind,
            url: hasUrl ? sourceUrl : null,
            message,
          });
        } catch (callbackError) {
          console.warn(
            "[PdfViewer] onSourceLoadError callback failed",
            callbackError,
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      destroyPdfResource(loadingTask);
      destroyPdfResource(docRef.current);
      docRef.current = null;
    };
  }, [
    cMapUrl,
    enableXfa,
    sourceData,
    sourceDataLength,
    sourceUrl,
    standardFontDataUrl,
    useSystemFonts,
  ]);

  return {
    doc,
    numPages,
    pageSizes,
    loading,
    error,
    setPageSize,
  };
};
