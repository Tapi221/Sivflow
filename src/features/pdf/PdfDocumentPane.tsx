import { useEffect, useMemo, useState } from "react";
import { MobilePdfPages } from "./MobilePdfPages";
import { PdfPane } from "./PdfPane";
import { createPdfDocumentDataSource, createPdfDocumentUrlSource } from "./pdfDocumentSource";
import { resolvePdfDocumentSourceUrl } from "./resolvePdfDocumentSourceUrl";
import { getDocumentBlob } from "@/services/documentFileStore";
import type { PdfViewerState, DocumentItem } from "@/types";
import type { PdfDocumentSource } from "./pdfDocumentSource";

type PdfDocumentPaneProps = {
  document: DocumentItem;
  className?: string;
  onDocumentUpdate?: (updates: Partial<DocumentItem>) => Promise<void> | void;
};

type LocalPdfSourceState = {
  isResolved: boolean;
  source: PdfDocumentSource | null;
};

type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
};

const MOBILE_PDF_VIEWPORT_MEDIA_QUERY = "(max-width: 767px)";

const createPendingLocalPdfSourceState = (): LocalPdfSourceState => ({
  isResolved: false,
  source: null,
});

const createResolvedLocalPdfSourceState = (source: PdfDocumentSource | null): LocalPdfSourceState => ({
  isResolved: true,
  source,
});

const resolveDocumentFileId = (document: Pick<DocumentItem, "id" | "localFileId">): string => {
  return document.localFileId?.trim() || document.id;
};

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

const readBlobAsPdfDocumentSource = async (blob: Blob): Promise<PdfDocumentSource> => {
  return createPdfDocumentDataSource(new Uint8Array(await blob.arrayBuffer()));
};

const PdfDocumentPane = ({ document, className, onDocumentUpdate }: PdfDocumentPaneProps) => {
  const persistedSourceUrl = useMemo(() => resolvePdfDocumentSourceUrl(document), [document.blobUrl, document.downloadUrl, document.googleDriveWebContentLink, document.googleDriveWebViewLink, document.localUrl, document.remoteUrl]);
  const persistedSource = useMemo(() => createPersistedPdfDocumentSource(persistedSourceUrl), [persistedSourceUrl]);
  const [localSource, setLocalSource] = useState<LocalPdfSourceState>(createPendingLocalPdfSourceState);
  const [isMobilePdfViewport, setIsMobilePdfViewport] = useState(getIsMobilePdfViewport);
  const source = localSource.source ?? (localSource.isResolved ? persistedSource : persistedSource);

  useEffect(() => {
    let isCancelled = false;

    setLocalSource(createPendingLocalPdfSourceState());

    const loadLocalSource = async () => {
      const blob = await getDocumentBlob(resolveDocumentFileId(document), { userId: document.userId });
      if (isCancelled) return;

      if (!blob) {
        setLocalSource(createResolvedLocalPdfSourceState(null));
        return;
      }

      const nextSource = await readBlobAsPdfDocumentSource(blob);
      if (isCancelled) return;
      setLocalSource(createResolvedLocalPdfSourceState(nextSource));
    };

    void loadLocalSource().catch((error: unknown) => {
      if (isCancelled) return;
      console.error("[PdfDocumentPane] local PDF source failed", error);
      setLocalSource(createResolvedLocalPdfSourceState(null));
    });

    return () => {
      isCancelled = true;
    };
  }, [document.id, document.localFileId, document.userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQueryList = window.matchMedia(MOBILE_PDF_VIEWPORT_MEDIA_QUERY);
    const updateMobilePdfViewport = () => setIsMobilePdfViewport(mediaQueryList.matches);

    updateMobilePdfViewport();
    return addMobilePdfViewportChangeListener(mediaQueryList, updateMobilePdfViewport);
  }, []);

  if (!localSource.isResolved && !source) {
    return <div className={className ?? "flex h-full min-h-0 min-w-0 items-center justify-center bg-[var(--carvepanel-surface)] text-[13px] text-[#6d6d6d]"}>PDFを読み込み中...</div>;
  }

  const handleViewerStateChange = (viewerState: PdfViewerState) => onDocumentUpdate?.({ viewerState });

  if (isMobilePdfViewport) {
    return <MobilePdfPages source={source} className={className} viewerState={document.viewerState ?? null} onViewerStateChange={handleViewerStateChange} />;
  }

  return <PdfPane source={source} className={className} viewerState={document.viewerState ?? null} onViewerStateChange={handleViewerStateChange} />;
};

export { PdfDocumentPane };
