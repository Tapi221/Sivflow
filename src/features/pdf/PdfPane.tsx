import { useEffect, useState } from "react";

import * as C from "@/features/pdf/pdf.constants.desktop";

import { usePdfWorkspace } from "./hooks/usePdfWorkspace";
import { PdfOverlayToolbar } from "./PdfToolbar";
import { PdfThumbnailSidePanel } from "./PdfThumbnailSidePanel";
import type { PdfViewerHandle } from "./PdfViewer";
import { PdfViewer } from "./PdfViewer";

import { cn } from "@/lib/utils";
import type { PdfViewerState } from "@/types";
import type { BlobUrl } from "@/types/core/branded";
import { DEV_MODE, isLocalHost } from "@/utils/envGuards";

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

const PDF_TOGGLE_THUMBNAILS_EVENT = "flashcard-master:pdf-toggle-thumbnails";

export const PdfPane = ({ doc, className }: PdfPaneProps) => {
  const {
    doc: workspaceDoc,
    viewerRef,
    containerRef,
    documentController,
    sourceUnavailable,
    localDataStatus,
    opaqueCanvas,
    numPages,
    alignedCurrentPage,
    currentPage,
    firstPageSize,
    scale,
    fitMode,
    pageLayoutMode,
    zoomPercent,
    normalizedThumbnailOrder,
    scrollToPage,
    handleFitWidth,
    handleViewerScaleChange,
    handlePageLayoutModeChange,
    handleZoomPercentChange,
    handlePrev,
    handleNext,
    handleCommitPage,
    canGoToPrevPage,
    canGoToNextPage,
    setCurrentPage,
  } = usePdfWorkspace();
  const [isThumbnailPanelOpen, setIsThumbnailPanelOpen] = useState(false);

  useEffect(() => {
    if (workspaceDoc.id === doc.id) {
      return;
    }

    console.warn("[PdfPane] provider doc mismatch", {
      paneDocId: doc.id,
      workspaceDocId: workspaceDoc.id,
    });
  }, [doc.id, workspaceDoc.id]);

  useEffect(() => {
    const handleToggleThumbnails = () => {
      setIsThumbnailPanelOpen((isOpen) => !isOpen);
    };

    window.addEventListener(
      PDF_TOGGLE_THUMBNAILS_EVENT,
      handleToggleThumbnails,
    );

    return () => {
      window.removeEventListener(
        PDF_TOGGLE_THUMBNAILS_EVENT,
        handleToggleThumbnails,
      );
    };
  }, []);

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
  }, [viewerRef]);

  const shouldRenderToolbar = !sourceUnavailable && numPages > 0;
  const shouldRenderThumbnailPanel = shouldRenderToolbar && isThumbnailPanelOpen;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col",
        shouldRenderThumbnailPanel ? "-ml-[var(--workspace-content-gutter)]" : "",
        className,
      )}
    >
      <div className="relative flex-1 min-h-0 min-w-0 w-full overflow-hidden bg-transparent">
        {sourceUnavailable ? (
          <div className="p-4 text-sm text-slate-500">
            {localDataStatus === "loading" && "ローカルPDFを復元中..."}
            {localDataStatus === "failed" &&
              "ローカルファイルが見つかりません。再アップロードしてください。"}
            {localDataStatus === "idle" && "PDFソースがありません。"}
          </div>
        ) : (
          <div className="relative flex h-full min-h-0 min-w-0 w-full overflow-hidden bg-transparent">
            {shouldRenderThumbnailPanel ? (
              <PdfThumbnailSidePanel
                documentController={documentController}
                numPages={numPages}
                normalizedThumbnailOrder={normalizedThumbnailOrder}
                firstPageSize={firstPageSize}
                currentPage={currentPage}
                alignedCurrentPage={alignedCurrentPage}
                opaqueCanvas={opaqueCanvas}
                scrollToPage={scrollToPage}
                onClose={() => setIsThumbnailPanelOpen(false)}
              />
            ) : null}

            <div
              ref={containerRef}
              className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-transparent"
            >
              <PdfViewer
                ref={viewerRef}
                documentController={documentController}
                navigationIdentity={workspaceDoc.id}
                pageOrder={normalizedThumbnailOrder}
                scale={scale}
                minScale={C.FIT_MIN_SCALE}
                maxScale={C.FIT_MAX_SCALE}
                opaqueCanvas={opaqueCanvas}
                pageLayoutMode={pageLayoutMode}
                spreadGap={16}
                onScaleChange={handleViewerScaleChange}
                onPageChange={setCurrentPage}
                className="h-full w-full"
              />

              {shouldRenderToolbar ? (
                <div
                  className="pointer-events-none absolute z-20 flex items-end gap-2"
                  style={{
                    right: "max(1rem, env(safe-area-inset-right))",
                    bottom:
                      "max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))",
                  }}
                >
                  <div className="pointer-events-auto">
                    <PdfOverlayToolbar
                      currentPage={alignedCurrentPage}
                      numPages={numPages}
                      zoomPercent={zoomPercent}
                      minZoomPercent={0}
                      maxZoomPercent={100}
                      fitMode={fitMode}
                      pageLayoutMode={pageLayoutMode}
                      zoomStepPercent={1}
                      onCommitPage={handleCommitPage}
                      onPrevPage={handlePrev}
                      onNextPage={handleNext}
                      onFitWidth={handleFitWidth}
                      onZoomPercentChange={handleZoomPercentChange}
                      onPageLayoutModeChange={handlePageLayoutModeChange}
                      canGoToPrevPage={canGoToPrevPage}
                      canGoToNextPage={canGoToNextPage}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
