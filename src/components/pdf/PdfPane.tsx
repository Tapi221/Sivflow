import type { BlobUrl } from "@/types/core/branded";
import { useAuthSession } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import platform from "@/platform";
import type { PdfViewerState } from "@/types";
import { DEV_MODE, isLocalHost } from "@/utils/envGuards";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PdfPaneToolbar } from "./PdfPaneToolbar";
import type { PdfViewerHandle } from "./PdfViewer";
import { PdfViewer } from "./PdfViewer";
import { usePdfContainerWidth } from "./hooks/usePdfContainerWidth";
import { usePdfSourceResolver } from "./hooks/usePdfSourceResolver";
import { defaultPdfViewerOptions } from "./defaultPdfViewerOptions";
import { usePdfViewerPersistence } from "./hooks/usePdfViewerPersistence";
import {
  FIT_MAX_SCALE,
  FIT_MIN_SCALE,
  FIT_PADDING_X,
  ZOOM_STEP,
  clampScale,
} from "./pdfViewerStateStorage";

interface PdfPaneDoc {
  id: string;
  name?: string;
  title?: string;
  remoteUrl?: string | null;
  blobUrl?: BlobUrl | null;
  localUrl?: BlobUrl | null;
  localFileId?: string | null;
  downloadUrl?: string | null;
  uploadStatus?: "pending" | "queued" | "uploading" | "ready" | "failed" | null;
  updatedAt?: unknown;
  mimeType?: string;
  viewerState?: PdfViewerState | null;
}

interface PdfPaneProps {
  doc: PdfPaneDoc;
  className?: string;
  viewerOptions?: {
    enableXfa?: boolean;
    useSystemFonts?: boolean;
    cMapUrl?: string;
    standardFontDataUrl?: string;
    opaqueCanvas?: boolean;
  };
  onDocumentUpdate?: (updates: Partial<PdfPaneDoc>) => Promise<void>;
}

const SEARCH_INPUT_DEBOUNCE_MS = 300;

export const PdfPane = ({
  doc,
  className,
  viewerOptions,
  onDocumentUpdate,
}: PdfPaneProps) => {
  const { currentUser } = useAuthSession();
  const viewerRef = useRef<PdfViewerHandle>(null);
  const [numPages, setNumPages] = useState(0);
  const [basePageWidth, setBasePageWidth] = useState<number | null>(null);
  const [searchInputValue, setSearchInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchNavToken, setSearchNavToken] = useState(0);
  const [searchNavDirection, setSearchNavDirection] = useState<"next" | "prev">(
    "next",
  );
  const [totalMatches, setTotalMatches] = useState(0);
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);

  const { containerRef, containerWidth } = usePdfContainerWidth();

  const fitScale = useMemo(() => {
    if (!containerWidth || !basePageWidth) {
      return 1;
    }

    const usableWidth = Math.max(1, containerWidth - FIT_PADDING_X);
    return clampScale(Number((usableWidth / basePageWidth).toFixed(3)));
  }, [containerWidth, basePageWidth]);

  const resolvedViewerOptions = useMemo(() => {
    return {
      ...defaultPdfViewerOptions,
      ...viewerOptions,
    };
  }, [viewerOptions]);

  const {
    currentPage,
    scale,
    fitMode,
    setCurrentPage,
    handleZoomIn,
    handleZoomOut,
    handleFitWidth,
    handleViewerScaleChange,
  } = usePdfViewerPersistence({
    docId: doc.id,
    viewerState: doc.viewerState,
    fitScale,
    onDocumentUpdate: onDocumentUpdate
      ? (updates) => onDocumentUpdate(updates)
      : undefined,
  });

  const {
    source,
    sourceMeta,
    sourceUnavailable,
    isLocalOnly,
    localDataStatus,
    effectiveRemoteUrl,
    localSourceBytes,
    handleSourceLoadError,
  } = usePdfSourceResolver(doc, currentUser?.uid);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchQuery(searchInputValue);
    }, SEARCH_INPUT_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInputValue]);

  useEffect(() => {
    if (!numPages) {
      return;
    }

    if (currentPage > numPages) {
      queueMicrotask(() => setCurrentPage(numPages));
    }
  }, [numPages, currentPage, setCurrentPage]);

  const handlePrev = useCallback(() => {
    const nextPage = Math.max(1, currentPage - 1);
    viewerRef.current?.scrollToPage(nextPage);
  }, [currentPage]);

  const handleNext = useCallback(() => {
    const nextPage = Math.min(numPages || currentPage, currentPage + 1);
    viewerRef.current?.scrollToPage(nextPage);
  }, [currentPage, numPages]);

  const commitSearchQuery = useCallback(() => {
    setSearchQuery((previous) =>
      previous === searchInputValue ? previous : searchInputValue,
    );
  }, [searchInputValue]);

  const handlePrevMatch = useCallback(() => {
    commitSearchQuery();
    setSearchNavDirection("prev");
    setSearchNavToken((previous) => previous + 1);
  }, [commitSearchQuery]);

  const handleNextMatch = useCallback(() => {
    commitSearchQuery();
    setSearchNavDirection("next");
    setSearchNavToken((previous) => previous + 1);
  }, [commitSearchQuery]);

  const handleOpenNewTab = useCallback(async () => {
    if (effectiveRemoteUrl) {
      await Promise.resolve(platform.shell.openExternal(effectiveRemoteUrl));
      return;
    }

    if (!localSourceBytes || localSourceBytes.byteLength === 0) {
      return;
    }

    const blobBytes = new Uint8Array(localSourceBytes.byteLength);
    blobBytes.set(localSourceBytes);

    const blob = new Blob([blobBytes], {
      type: doc.mimeType || "application/pdf",
    });
    const tempUrl = URL.createObjectURL(blob);

    try {
      await Promise.resolve(platform.shell.openExternal(tempUrl));
    } finally {
      window.setTimeout(() => {
        try {
          URL.revokeObjectURL(tempUrl);
        } catch {
          // noop
        }
      }, 60_000);
    }
  }, [doc.mimeType, effectiveRemoteUrl, localSourceBytes]);

  const handleFirstPageSize = useCallback(
    (size: { width: number; height: number } | null) => {
      const nextWidth = size?.width ?? null;
      setBasePageWidth((previous) =>
        previous === nextWidth ? previous : nextWidth,
      );
    },
    [],
  );

  useEffect(() => {
    if (!DEV_MODE) {
      return;
    }

    if (!isLocalHost(window.location.hostname)) {
      return;
    }

    const debugWindow = window as Window & {
      __logPdfScrollDiagnostics?: () => void;
      __getPdfScrollDiagnostics?: () => ReturnType<
        PdfViewerHandle["getScrollDiagnostics"]
      >;
    };

    debugWindow.__logPdfScrollDiagnostics = () => {
      viewerRef.current?.logScrollDiagnostics();
    };
    debugWindow.__getPdfScrollDiagnostics = () => {
      return viewerRef.current?.getScrollDiagnostics() ?? null;
    };

    return () => {
      delete debugWindow.__logPdfScrollDiagnostics;
      delete debugWindow.__getPdfScrollDiagnostics;
    };
  }, []);

  return (
    <div className={cn("flex h-full min-h-0 min-w-0 flex-col", className)}>
      <PdfPaneToolbar
        isLocalOnly={isLocalOnly}
        uploadStatus={doc.uploadStatus}
        currentPage={currentPage}
        numPages={numPages}
        scale={scale}
        fitMode={fitMode}
        sourceUnavailable={sourceUnavailable}
        canOpenExternal={!!effectiveRemoteUrl || !!localSourceBytes}
        searchQuery={searchInputValue}
        totalMatches={totalMatches}
        activeMatchIndex={activeMatchIndex}
        onSearchQueryChange={setSearchInputValue}
        onPrevMatch={handlePrevMatch}
        onNextMatch={handleNextMatch}
        onPrev={handlePrev}
        onNext={handleNext}
        onZoomOut={handleZoomOut}
        onZoomIn={handleZoomIn}
        onFitWidth={handleFitWidth}
        onOpenNewTab={() => {
          void handleOpenNewTab();
        }}
      />

      <div
        ref={containerRef}
        className="flex-1 min-h-0 min-w-0 w-full overflow-hidden bg-slate-50"
      >
        {sourceUnavailable ? (
          <div className="p-4 text-sm text-slate-500">
            {localDataStatus === "loading" && "ローカルPDFを復元中..."}
            {localDataStatus === "failed" &&
              "ローカルファイルが見つかりません。再アップロードしてください。"}
            {localDataStatus === "idle" && "PDFソースがありません。"}
          </div>
        ) : (
          <PdfViewer
            ref={viewerRef}
            source={source}
            scale={scale}
            minScale={FIT_MIN_SCALE}
            maxScale={FIT_MAX_SCALE}
            zoomStep={ZOOM_STEP}
            searchQuery={searchQuery}
            searchNavToken={searchNavToken}
            searchNavDirection={searchNavDirection}
            onScaleChange={handleViewerScaleChange}
            onNumPages={setNumPages}
            onPageChange={setCurrentPage}
            onFirstPageSize={handleFirstPageSize}
            viewerOptions={resolvedViewerOptions}
            sourceMeta={sourceMeta}
            onSourceLoadError={handleSourceLoadError}
            onSearchStateChange={({
              totalMatches: nextTotalMatches,
              activeMatchIndex: nextActiveMatchIndex,
            }) => {
              setTotalMatches(nextTotalMatches);
              setActiveMatchIndex(nextActiveMatchIndex);
            }}
            className="h-full w-full"
          />
        )}
      </div>
    </div>
  );
};
