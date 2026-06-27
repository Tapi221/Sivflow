import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoadingSpinner } from "@web-renderer/components/common/LoadingSpinner";
import { cn } from "@web-renderer/lib/utils";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import type { PdfDocumentSource } from "./pdfDocumentSource";
import { createPdfDocumentDataSourceFromBlob, createPdfDocumentUrlSource, releasePdfDocumentSource } from "./pdfDocumentSource";
import { PdfPane } from "./PdfPane";
import { createPdfPerformanceTraceName, recordPdfPerformanceMark, recordPdfPerformanceMeasure } from "./pdfPerformance";
import { findLocalPdfBlob, resolvePdfDocumentBlob } from "./resolvePdfDocumentBlob";
import { resolvePdfDocumentSourceUrl } from "./resolvePdfDocumentSourceUrl";
import type { DocumentItem, PdfViewerState } from "@/types";



type PdfViewerStateChangePersistence = "immediate" | "deferred" | "none";
type PdfViewerStateChangeOptions = {
  persistence?: PdfViewerStateChangePersistence;
};
type LocalPdfSourceState = {
  documentId: string;
  isResolved: boolean;
  source: PdfDocumentSource | null;
  error: string | null;
};
type PendingPdfViewerStateSave = {
  viewerState: PdfViewerState;
  onDocumentUpdate: NonNullable<PdfDocumentPaneProps["onDocumentUpdate"]>;
};
type PdfDocumentPaneProps = {
  document: DocumentItem;
  className?: string;
  onDocumentUpdate?: (updates: Partial<DocumentItem>) => Promise<void> | void;
};
type PdfSourceResolutionWaiter = <T,>(promise: Promise<T>) => Promise<T>;



const PDF_SOURCE_RESOLUTION_TIMEOUT_MS = 15_000;
const PDF_VIEWER_STATE_SAVE_DEBOUNCE_MS = 800;
const PDF_VIEWER_STATE_SAVE_RETRY_DELAY_MS = 1_000;
const PDF_SOURCE_TIMEOUT_ERROR_MESSAGE = "PDFデータの取得がタイムアウトしました。もう一度開き直してください。";
const PDF_SOURCE_MISSING_ERROR_MESSAGE = "表示できるPDFデータが見つかりません。PDFを再インポートしてください。";
const PDF_DOCUMENT_PANE_CLASS_NAME = "flex h-full min-h-0 w-full min-w-0 flex-1";
const PDF_DOCUMENT_STATUS_CLASS_NAME = "flex h-full min-h-0 w-full min-w-0 flex-1 items-center justify-center bg-[var(--carvepanel-surface)] px-6 text-center text-xs leading-6 text-[#6d6d6d]";



const createPendingLocalPdfSourceState = (documentId: string): LocalPdfSourceState => ({
  documentId,
  isResolved: false,
  source: null,
  error: null,
});
const createResolvedLocalPdfSourceState = (documentId: string, source: PdfDocumentSource | null, error: string | null = null): LocalPdfSourceState => ({
  documentId,
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
const waitForPdfSourceResolution: PdfSourceResolutionWaiter = async (promise) => {
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
const delay = (durationMs: number): Promise<void> => {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, durationMs);
  });
};
const getPdfViewerStatePersistence = (options?: PdfViewerStateChangeOptions) => {
  return options?.persistence ?? "immediate";
};
const isBrowserPageHidden = (): boolean => {
  return typeof globalThis.document !== "undefined" && globalThis.document.visibilityState === "hidden";
};
const hasLocalPdfBlobCandidate = (document: Pick<DocumentItem, "localFileId">): boolean => {
  return Boolean(document.localFileId?.trim());
};
const isLocalPersistedPdfSource = (source: PdfDocumentSource | null): boolean => {
  return source?.type === "url" && source.locality === "local";
};
const resolvePreferredPdfBlob = async (document: DocumentItem, currentUserId: string | null, hasPersistedSource: boolean): Promise<Blob | null> => {
  if (!hasPersistedSource) return resolvePdfDocumentBlob(document, currentUserId);

  const localBlob = await findLocalPdfBlob(document, currentUserId);
  if (localBlob) return localBlob;
  return null;
};



const PdfDocumentPane = ({ document, className, onDocumentUpdate }: PdfDocumentPaneProps) => {
  const { currentUser } = useAuthSession();
  const currentUserId = currentUser?.uid ?? null;
  const persistedSourceUrl = useMemo(() => resolvePdfDocumentSourceUrl(document), [document]);
  const [failedPersistedSourceUrl, setFailedPersistedSourceUrl] = useState<string | null>(null);
  const activePersistedSourceUrl = persistedSourceUrl && persistedSourceUrl !== failedPersistedSourceUrl ? persistedSourceUrl : null;
  const persistedSource = useMemo(() => createPersistedPdfDocumentSource(activePersistedSourceUrl), [activePersistedSourceUrl]);
  const [localSource, setLocalSource] = useState<LocalPdfSourceState>(() => createPendingLocalPdfSourceState(document.id));
  const isLocalSourceForCurrentDocument = localSource.documentId === document.id;
  const activeLocalSource = isLocalSourceForCurrentDocument ? localSource : createPendingLocalPdfSourceState(document.id);
  const shouldWaitForLocalSource = hasLocalPdfBlobCandidate(document) && !isLocalPersistedPdfSource(persistedSource) && !activeLocalSource.isResolved;
  const source = shouldWaitForLocalSource ? null : activeLocalSource.source ?? persistedSource;
  const paneClassName = cn(PDF_DOCUMENT_PANE_CLASS_NAME, className);
  const statusClassName = cn(PDF_DOCUMENT_STATUS_CLASS_NAME, className);
  const pendingViewerStateSaveRef = useRef<PendingPdfViewerStateSave | null>(null);
  const viewerStateSaveTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const viewerStateSaveChainRef = useRef<Promise<void>>(Promise.resolve());
  const viewerStateSaveRevisionRef = useRef(0);

  const clearViewerStateSaveTimer = useCallback(() => {
    if (viewerStateSaveTimerRef.current === null) return;
    globalThis.clearTimeout(viewerStateSaveTimerRef.current);
    viewerStateSaveTimerRef.current = null;
  }, []);

  const persistViewerState = useCallback((pendingSave: PendingPdfViewerStateSave) => {
    const revision = viewerStateSaveRevisionRef.current + 1;
    viewerStateSaveRevisionRef.current = revision;

    const runSave = async () => {
      if (revision !== viewerStateSaveRevisionRef.current) return;

      try {
        await pendingSave.onDocumentUpdate({ viewerState: pendingSave.viewerState });
        return;
      } catch (error) {
        if (revision !== viewerStateSaveRevisionRef.current) return;
        console.warn("[PdfDocumentPane] viewer state save failed; retrying latest state", error);
      }

      await delay(PDF_VIEWER_STATE_SAVE_RETRY_DELAY_MS);
      if (revision !== viewerStateSaveRevisionRef.current) return;

      try {
        await pendingSave.onDocumentUpdate({ viewerState: pendingSave.viewerState });
      } catch (error) {
        if (revision !== viewerStateSaveRevisionRef.current) return;
        console.warn("[PdfDocumentPane] viewer state save failed after retry", error);
      }
    };

    viewerStateSaveChainRef.current = viewerStateSaveChainRef.current.catch(() => undefined).then(runSave);
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

  const handlePdfLoadError = useCallback((error: unknown) => {
    if (!activePersistedSourceUrl) return;
    recordPdfPerformanceMark("viewer.load.persistedSourceFailed", { detail: { documentId: document.id, message: getErrorMessage(error, PDF_SOURCE_MISSING_ERROR_MESSAGE), sourceUrl: activePersistedSourceUrl, sizeBytes: document.sizeBytes ?? null } });
    setFailedPersistedSourceUrl(activePersistedSourceUrl);
  }, [activePersistedSourceUrl, document.id, document.sizeBytes]);

  useEffect(() => {
    setFailedPersistedSourceUrl(null);
  }, [document.id, persistedSourceUrl]);

  useEffect(() => {
    let isCancelled = false;
    let resolvedSource: PdfDocumentSource | null = null;
    let isSourceHandedOff = false;
    const performanceTraceName = createPdfPerformanceTraceName("source.resolve");

    recordPdfPerformanceMark(`${performanceTraceName}.start`, { detail: { documentId: document.id, hasPersistedSource: Boolean(persistedSource), sizeBytes: document.sizeBytes ?? null } });
    setLocalSource(createPendingLocalPdfSourceState(document.id));

    const loadLocalSource = async () => {
      if (isLocalPersistedPdfSource(persistedSource)) {
        setLocalSource(createResolvedLocalPdfSourceState(document.id, null));
        return;
      }

      const blob = await waitForPdfSourceResolution(resolvePreferredPdfBlob(document, currentUserId, Boolean(persistedSource)));
      recordPdfPerformanceMark(`${performanceTraceName}.blob`, { detail: { documentId: document.id, hasBlob: Boolean(blob), hasPersistedSource: Boolean(persistedSource), sizeBytes: blob?.size ?? document.sizeBytes ?? null } });
      if (isCancelled) return;

      if (!blob) {
        recordPdfPerformanceMeasure(`${performanceTraceName}.duration`, `${performanceTraceName}.start`, `${performanceTraceName}.blob`);
        setLocalSource(createResolvedLocalPdfSourceState(document.id, null, persistedSource ? null : PDF_SOURCE_MISSING_ERROR_MESSAGE));
        return;
      }

      const nextSource = await waitForPdfSourceResolution(createPdfDocumentDataSourceFromBlob(blob));
      recordPdfPerformanceMark(`${performanceTraceName}.source`, { detail: { documentId: document.id, sourceType: nextSource.type, sizeBytes: blob.size } });
      recordPdfPerformanceMeasure(`${performanceTraceName}.duration`, `${performanceTraceName}.start`, `${performanceTraceName}.source`);
      if (isCancelled) {
        releasePdfDocumentSource(nextSource);
        return;
      }

      resolvedSource = nextSource;
      isSourceHandedOff = true;
      setLocalSource(createResolvedLocalPdfSourceState(document.id, nextSource));
    };

    void loadLocalSource().catch((error: unknown) => {
      recordPdfPerformanceMark(`${performanceTraceName}.error`, { detail: { documentId: document.id, hasPersistedSource: Boolean(persistedSource), message: getErrorMessage(error, PDF_SOURCE_MISSING_ERROR_MESSAGE), sizeBytes: document.sizeBytes ?? null } });
      recordPdfPerformanceMeasure(`${performanceTraceName}.duration`, `${performanceTraceName}.start`, `${performanceTraceName}.error`);
      if (isCancelled) return;
      console.warn("[PdfDocumentPane] local PDF source failed", error);
      setLocalSource(createResolvedLocalPdfSourceState(document.id, null, persistedSource ? null : getErrorMessage(error, PDF_SOURCE_MISSING_ERROR_MESSAGE)));
    });

    return () => {
      isCancelled = true;
      if (!isSourceHandedOff) releasePdfDocumentSource(resolvedSource);
    };
  }, [currentUserId, document, persistedSource]);

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

  if (!activeLocalSource.isResolved && !source) {
    return <LoadingSpinner className={cn(PDF_DOCUMENT_PANE_CLASS_NAME, "bg-[var(--carvepanel-surface)] px-6 text-[#6d6d6d]", className)} label="PDFを読み込み中" />;
  }

  if (activeLocalSource.isResolved && !source) {
    return <div className={statusClassName}>{activeLocalSource.error ?? PDF_SOURCE_MISSING_ERROR_MESSAGE}</div>;
  }

  return <PdfPane source={source} className={paneClassName} viewerState={document.viewerState ?? null} onLoadError={handlePdfLoadError} onViewerStateChange={handleViewerStateChange} />;
};



export { PdfDocumentPane };
