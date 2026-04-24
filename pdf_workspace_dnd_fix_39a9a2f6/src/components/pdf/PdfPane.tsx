import type { BlobUrl } from "@/types/core/branded";
import { cn } from "@/lib/utils";
import { DEV_MODE, isLocalHost } from "@/utils/envGuards";
import { useEffect } from "react";

import { PdfOverlayToolbar } from "@/components/pdf/PdfOverlayToolbar";
import { PdfViewer } from "@/components/pdf/PdfViewer";
import {
  FIT_MAX_SCALE,
  FIT_MIN_SCALE,
} from "@/components/pdf/pdfViewerStateStorage";
import { usePdfWorkspace } from "@/components/pdf/usePdfWorkspace";

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

export const PdfPane = ({ doc, className }: PdfPaneProps) => {
  const {
    doc: workspaceDoc,
    containerRef,
    documentController,
    viewerRef,
    alignedCurrentPage,
    normalizedThumbnailOrder,
    pageLayoutMode,
    scale,
    fitMode,
    zoomPercent,
    canGoToPrevPage,
    canGoToNextPage,
    sourceUnavailable,
    localDataStatus,
    resolvedViewerOptions,
    setCurrentPage,
    handleFitWidth,
    handleViewerScaleChange,
    handlePageLayoutModeChange,
    handleZoomPercentChange,
    handlePrevPage,
    handleNextPage,
    handleCommitPage,
  } = usePdfWorkspace();

  useEffect(() => {
    if (workspaceDoc.id !== doc.id) {
      console.warn("[PdfPane] Workspace document mismatch", {
        paneDocId: doc.id,
        workspaceDocId: workspaceDoc.id,
      });
    }
  }, [doc.id, workspaceDoc.id]);

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
        NonNullable<typeof viewerRef.current>["getScrollDiagnostics"]
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

  const shouldRenderOverlayToolbar =
    !sourceUnavailable && documentController.numPages > 0;

  return (
    <div className={cn("flex h-full min-h-0 min-w-0 flex-col", className)}>
      <div className="relative flex-1 min-h-0 min-w-0 w-full overflow-hidden bg-transparent">
        {sourceUnavailable ? (
          <div className="p-4 text-sm text-slate-500">
            {localDataStatus === "loading" && "ローカルPDFを復元中..."}
            {localDataStatus === "failed" &&
              "ローカルファイルが見つかりません。再アップロードしてください。"}
            {localDataStatus === "idle" && "PDFソースがありません。"}
          </div>
        ) : (
          <div
            ref={containerRef}
            className="relative flex h-full min-h-0 min-w-0 w-full overflow-hidden bg-transparent"
          >
            <PdfViewer
              ref={viewerRef}
              documentController={documentController}
              navigationIdentity={workspaceDoc.id}
              pageOrder={normalizedThumbnailOrder}
              scale={scale}
              minScale={FIT_MIN_SCALE}
              maxScale={FIT_MAX_SCALE}
              opaqueCanvas={resolvedViewerOptions.opaqueCanvas ?? false}
              pageLayoutMode={pageLayoutMode}
              spreadGap={16}
              onScaleChange={handleViewerScaleChange}
              onPageChange={setCurrentPage}
              className="h-full w-full"
            />

            {shouldRenderOverlayToolbar ? (
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
                    numPages={documentController.numPages}
                    zoomPercent={zoomPercent}
                    minZoomPercent={0}
                    maxZoomPercent={100}
                    fitMode={fitMode}
                    pageLayoutMode={pageLayoutMode}
                    zoomStepPercent={1}
                    onCommitPage={handleCommitPage}
                    onPrevPage={handlePrevPage}
                    onNextPage={handleNextPage}
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
        )}
      </div>
    </div>
  );
};
