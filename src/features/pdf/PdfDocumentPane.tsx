import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useAuthSession } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { DocumentItem, PdfViewerState } from "@/types";
import { PdfPane } from "./PdfPane";
import { createPdfDocumentDataSourceFromBlob, createPdfDocumentUrlSource, releasePdfDocumentSource } from "./pdfDocumentSource";
import { resolvePdfDocumentBlob } from "./resolvePdfDocumentBlob";
import { resolvePdfDocumentSourceUrl } from "./resolvePdfDocumentSourceUrl";
import type { PdfViewerStateChangeOptions } from "./PdfPane";
import type { PdfDocumentSource } from "./pdfDocumentSource";

type PdfDocumentPaneProps = {
  document: DocumentItem;
  className?: string;
  onDocumentUpdate?: (updates: Partial<DocumentItem>) => Promise<void> | void;
};

type LocalPdfSourceState = {
  isResolved: boolean;
  source: PdfDocumentSource | null;
  error: string | null;
};

type PendingPdfViewerStateSave = {
  viewerState: PdfViewerState;
  onDocumentUpdate: NonNullable<PdfDocumentPaneProps["onDocumentUpdate"]>;
};

const PDF_SOURCE_RESOLUTION_TIMEOUT_MS = 15_000;
const PDF_VIEWER_STATE_SAVE_DEBOUNCE_MS = 800;
const PDF_SOURCE_TIMEOUT_ERROR_MESSAGE = "PDFデータの取得がタイムアウトしました。もう一度開き直してください。";
const PDF_SOURCE_MISSING_ERROR_MESSAGE = "表示できるPDFデータが見つかりません。PDFを再インポートしてください。";
const PDF_DOCUMENT_PANE_CLASS_NAME = "flex h-full min-h-0 w-full min-w-0 flex-1";
const PDF_DOCUMENT_STATUS_CLASS_NAME = "flex h-full min-h-0 w-full min-w-0 flex-1 items-center justify-center bg-[var(--carvepanel-surface)] px-6 text-center text-[13px] leading-6 text-[#6d6d6d]";

const createPendingLocalPdfSourceState = (): LocalPdfSourceState => ({
  isResolved: false,
  source: null,
  error: null,
});

const createResolvedLocalPdfSourceState = (source: PdfDocumentSource | null, error: string | null = null): LocalPdfSourceState => ({
  isResolved: true,
  source,
  error,
});

const createPersistedPdfDocumentSource = (url: string | null): PdfDocumentSource | null => {
  return url ? createPdfDocumentUrlSource(url) : null;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof Error && error.message ? error.message : fallback;
};

const waitForPdfSourceResolution = async <T,>(promise: Promise<T>): Promise<T> => {
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = globalThis.setTimeout(() => reject(new Error(PDF_SOURCE_TIMEOUT_ERROR_MESSAGE)), PDF_SOURCE_RESOLUTION_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== null) globalThis.clearTimeout(timeoutId);
  }
};

const getPdfViewerStatePersistence = (options?: PdfViewerStateChangeOptions) => {
  return options?.persistence ?? "immediate";
};

const isBrowserPageHidden = (): boolean => {
  return typeof globalThis.document !== "undefined" && globalThis.document.visibilityState === "hidden";
};

const PdfDocumentPane = ({ document, className, onDocumentUpdate }: PdfDocumentPaneProps) => {
  const { currentUser } = useAuthSession();
  const currentUserId = currentUser?.uid ?? null;
  const persistedSourceUrl = useMemo(() => resolvePdfDocumentSourceUrl(document), [document.blobUrl, document.downloadUrl, document.googleDriveWebContentLink, document.googleDriveWebViewLink, document.localUrl, document.remoteUrl]);
  const persistedSource = useMemo(() => createPersistedPdfDocumentSource(persistedSourceUrl), [persistedSourceUrl]);
  const [localSource, setLocalSource] = useState<LocalPdfSourceState>(createPendingLocalPdfSourceState);
  const source = localSource.source ?? persistedSource;
  const paneClassName = cn(PDF_DOCUMENT_PANE_CLASS_NAME, className);
  const statusClassName = cn(PDF_DOCUMENT_STATUS_CLASS_NAME, className);
  const pendingViewerStateSaveRef = useRef<PendingPdfViewerStateSave | null>(null);
  const viewerStateSaveTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

  const clearViewerStateSaveTimer = useCallback(() => {
    if (viewerStateSaveTimerRef.current === null) return;
    globalThis.clearTimeout(viewerStateSaveTimerRef.current);
    viewerStateSaveTimerRef.current = null;
  }, []);

  const persistViewerState = useCallback((pendingSave: PendingPdfViewerStateSave) => {
    void pendingSave.onDocumentUpdate({ viewerState: pendingSave.viewerState });
  }, []);

  const flushPendingViewerStateSave = useCallback(() => {
    clearViewerStateSaveTimer();
    const pendingSave = pendingViewerStateSaveRef.current;
    pendingViewerStateSaveRef.current = null;
    if (!pendingSave) return;
    persistViewerState(pendingSave);
  }, [clearViewerStateSaveTimer, persistViewerState]);

  const handleViewerStateChange = useCallback((viewerState: PdfViewerState, options?: PdfViewerStateChangeOptions) => {
    if (!onDocumentUpdate) return;

    const persistence = getPdfViewerStatePersistence(options);
    if (persistence === "none") return;

    if (persistence === "immediate") {
      pendingViewerStateSaveRef.current = null;
      clearViewerStateSaveTimer();
      persistViewerState({ viewerState, onDocumentUpdate });
      return;
    }

    pendingViewerStateSaveRef.current = { viewerState, onDocumentUpdate };
    clearViewerStateSaveTimer();
    viewerStateSaveTimerRef.current = globalThis.setTimeout(flushPendingViewerStateSave, PDF_VIEWER_STATE_SAVE_DEBOUNCE_MS);
  }, [clearViewerStateSaveTimer, flushPendingViewerStateSave, onDocumentUpdate, persistViewerState]);

  useEffect(() => {
    let isCancelled = false;
    let resolvedSource: PdfDocumentSource | null = null;

    setLocalSource(createPendingLocalPdfSourceState());

    const loadLocalSource = async () => {
      const blob = await waitForPdfSourceResolution(resolvePdfDocumentBlob(document, currentUserId));
      if (isCancelled) return;

      if (!blob) {
        setLocalSource(createResolvedLocalPdfSourceState(null));
        return;
      }

      const nextSource = await waitForPdfSourceResolution(createPdfDocumentDataSourceFromBlob(blob));
      if (isCancelled) {
        releasePdfDocumentSource(nextSource);
        return;
      }

      resolvedSource = nextSource;
      setLocalSource(createResolvedLocalPdfSourceState(nextSource));
    };

    void loadLocalSource().catch((error: unknown) => {
      if (isCancelled) return;
      console.error("[PdfDocumentPane] local PDF source failed", error);
      setLocalSource(createResolvedLocalPdfSourceState(null, getErrorMessage(error, PDF_SOURCE_MISSING_ERROR_MESSAGE)));
    });

    return () => {
      isCancelled = true;
      releasePdfDocumentSource(resolvedSource);
    };
  }, [currentUserId, document.googleDriveFileId, document.id, document.localFileId, document.userId]);

  useEffect(() => {
    return () => {
      flushPendingViewerStateSave();
    };
  }, [document.id, flushPendingViewerStateSave]);

  useEffect(() => {
    const handlePageHide = () => {
      flushPendingViewerStateSave();
    };

    const handleVisibilityChange = () => {
      if (isBrowserPageHidden()) flushPendingViewerStateSave();
    };

    globalThis.addEventListener("pagehide", handlePageHide);
    globalThis.document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      globalThis.removeEventListener("pagehide", handlePageHide);
      globalThis.document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flushPendingViewerStateSave]);

  if (!localSource.isResolved && !source) {
    return <LoadingSpinner className={cn(PDF_DOCUMENT_PANE_CLASS_NAME, "bg-[var(--carvepanel-surface)] px-6 text-[#6d6d6d]", className)} label="PDFを読み込み中" />;
  }

  if (localSource.isResolved && !source) {
    return <div className={statusClassName}>{localSource.error ?? PDF_SOURCE_MISSING_ERROR_MESSAGE}</div>;
  }

  return <PdfPane source={source} className={paneClassName} viewerState={document.viewerState ?? null} onViewerStateChange={handleViewerStateChange} />;
};

export { PdfDocumentPane };
