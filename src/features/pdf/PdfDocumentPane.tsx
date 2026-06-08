import { useEffect, useMemo, useState } from "react";
import { useAuthSession } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { DocumentItem, PdfViewerState } from "@/types";
import { MobilePdfPages } from "./MobilePdfPages";
import { PdfPane } from "./PdfPane";
import { createPdfDocumentDataSourceFromBlob, createPdfDocumentUrlSource } from "./pdfDocumentSource";
import { resolvePdfDocumentBlob } from "./resolvePdfDocumentBlob";
import { resolvePdfDocumentSourceUrl } from "./resolvePdfDocumentSourceUrl";
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

type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
};

const MOBILE_PDF_VIEWPORT_MEDIA_QUERY = "(max-width: 767px)";
const PDF_SOURCE_RESOLUTION_TIMEOUT_MS = 15_000;
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

const getIsMobilePdfViewport = (): boolean => {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_PDF_VIEWPORT_MEDIA_QUERY).matches;
};

const addMobilePdfViewportChangeListener = (mediaQueryList: MediaQueryList, listener: (event: MediaQueryListEvent) => void): (() => void) => {
  if (typeof mediaQueryList.addEventListener === "function") {
    mediaQueryList.addEventListener("change", listener);
    return () => mediaQueryList.removeEventListener("change", listener);
  }

  const legacyMediaQueryList = mediaQueryList as LegacyMediaQueryList;
  legacyMediaQueryList.addListener?.(listener);
  return () => legacyMediaQueryList.removeListener?.(listener);
};

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

const PdfDocumentPane = ({ document, className, onDocumentUpdate }: PdfDocumentPaneProps) => {
  const { currentUser } = useAuthSession();
  const currentUserId = currentUser?.uid ?? null;
  const persistedSourceUrl = useMemo(() => resolvePdfDocumentSourceUrl(document), [document.blobUrl, document.downloadUrl, document.googleDriveWebContentLink, document.googleDriveWebViewLink, document.localUrl, document.remoteUrl]);
  const persistedSource = useMemo(() => createPersistedPdfDocumentSource(persistedSourceUrl), [persistedSourceUrl]);
  const [localSource, setLocalSource] = useState<LocalPdfSourceState>(createPendingLocalPdfSourceState);
  const [isMobilePdfViewport, setIsMobilePdfViewport] = useState(getIsMobilePdfViewport);
  const source = localSource.source ?? persistedSource;
  const paneClassName = cn(PDF_DOCUMENT_PANE_CLASS_NAME, className);
  const statusClassName = cn(PDF_DOCUMENT_STATUS_CLASS_NAME, className);

  useEffect(() => {
    let isCancelled = false;

    setLocalSource(createPendingLocalPdfSourceState());

    const loadLocalSource = async () => {
      const blob = await waitForPdfSourceResolution(resolvePdfDocumentBlob(document, currentUserId));
      if (isCancelled) return;

      if (!blob) {
        setLocalSource(createResolvedLocalPdfSourceState(null));
        return;
      }

      const nextSource = await waitForPdfSourceResolution(createPdfDocumentDataSourceFromBlob(blob));
      if (isCancelled) return;
      setLocalSource(createResolvedLocalPdfSourceState(nextSource));
    };

    void loadLocalSource().catch((error: unknown) => {
      if (isCancelled) return;
      console.error("[PdfDocumentPane] local PDF source failed", error);
      setLocalSource(createResolvedLocalPdfSourceState(null, getErrorMessage(error, PDF_SOURCE_MISSING_ERROR_MESSAGE)));
    });

    return () => {
      isCancelled = true;
    };
  }, [currentUserId, document.googleDriveFileId, document.id, document.localFileId, document.userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQueryList = window.matchMedia(MOBILE_PDF_VIEWPORT_MEDIA_QUERY);
    const updateMobilePdfViewport = () => setIsMobilePdfViewport(mediaQueryList.matches);

    updateMobilePdfViewport();
    return addMobilePdfViewportChangeListener(mediaQueryList, updateMobilePdfViewport);
  }, []);

  if (!localSource.isResolved && !source) {
    return <div className={statusClassName}>PDFを読み込み中...</div>;
  }

  if (localSource.isResolved && !source) {
    return <div className={statusClassName}>{localSource.error ?? PDF_SOURCE_MISSING_ERROR_MESSAGE}</div>;
  }

  const handleViewerStateChange = (viewerState: PdfViewerState) => onDocumentUpdate?.({ viewerState });

  if (isMobilePdfViewport) {
    return <MobilePdfPages source={source} className={paneClassName} viewerState={document.viewerState ?? null} onViewerStateChange={handleViewerStateChange} />;
  }

  return <PdfPane source={source} className={paneClassName} viewerState={document.viewerState ?? null} onViewerStateChange={handleViewerStateChange} />;
};

export { PdfDocumentPane };
