import { useEffect, useMemo, useRef, useState } from "react";
import { MobilePdfPages } from "./MobilePdfPages";
import { PdfPane } from "./PdfPane";
import { createPdfDocumentUrlSource } from "./pdfDocumentSource";
import { resolvePdfDocumentSourceUrl } from "./resolvePdfDocumentSourceUrl";
import { useAuthSession } from "@/contexts/AuthContext";
import { getDocumentBlob } from "@/services/documentFileStore";
import type { DocumentItem, PdfViewerState } from "@/types";
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

type LocalPdfBlobSource = {
  source: PdfDocumentSource;
  objectUrl: string;
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

const getUniqueValues = (values: Array<string | null | undefined>): string[] => {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
};

const resolveDocumentFileIds = (document: Pick<DocumentItem, "id" | "localFileId">): string[] => {
  return getUniqueValues([document.localFileId, document.id]);
};

const resolveDocumentBlobUserIds = (documentUserId: string | null | undefined, currentUserId: string | null | undefined): Array<string | undefined> => {
  const userIds = getUniqueValues([documentUserId, currentUserId]);
  return [...userIds, undefined];
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

const createLocalPdfBlobSource = (blob: Blob): LocalPdfBlobSource => {
  const objectUrl = URL.createObjectURL(blob);
  return {
    source: createPdfDocumentUrlSource(objectUrl),
    objectUrl,
  };
};

const findLocalPdfBlob = async (document: Pick<DocumentItem, "id" | "localFileId" | "userId">, currentUserId: string | null | undefined): Promise<Blob | null> => {
  const fileIds = resolveDocumentFileIds(document);
  const userIds = resolveDocumentBlobUserIds(document.userId, currentUserId);

  for (const userId of userIds) {
    for (const fileId of fileIds) {
      const blob = await getDocumentBlob(fileId, { userId });
      if (blob) return blob;
    }
  }

  return null;
};

const PdfDocumentPane = ({ document, className, onDocumentUpdate }: PdfDocumentPaneProps) => {
  const { currentUser } = useAuthSession();
  const currentUserId = currentUser?.uid ?? null;
  const persistedSourceUrl = useMemo(() => resolvePdfDocumentSourceUrl(document), [document.blobUrl, document.downloadUrl, document.googleDriveWebContentLink, document.googleDriveWebViewLink, document.localUrl, document.remoteUrl]);
  const persistedSource = useMemo(() => createPersistedPdfDocumentSource(persistedSourceUrl), [persistedSourceUrl]);
  const [localSource, setLocalSource] = useState<LocalPdfSourceState>(createPendingLocalPdfSourceState);
  const [isMobilePdfViewport, setIsMobilePdfViewport] = useState(getIsMobilePdfViewport);
  const localObjectUrlRef = useRef<string | null>(null);
  const source = localSource.source ?? persistedSource;

  useEffect(() => {
    let isCancelled = false;

    if (localObjectUrlRef.current) {
      URL.revokeObjectURL(localObjectUrlRef.current);
      localObjectUrlRef.current = null;
    }

    setLocalSource(createPendingLocalPdfSourceState());

    const loadLocalSource = async () => {
      const blob = await findLocalPdfBlob(document, currentUserId);
      if (isCancelled) return;

      if (!blob) {
        setLocalSource(createResolvedLocalPdfSourceState(null));
        return;
      }

      const nextSource = createLocalPdfBlobSource(blob);
      if (isCancelled) {
        URL.revokeObjectURL(nextSource.objectUrl);
        return;
      }

      localObjectUrlRef.current = nextSource.objectUrl;
      setLocalSource(createResolvedLocalPdfSourceState(nextSource.source));
    };

    void loadLocalSource().catch((error: unknown) => {
      if (isCancelled) return;
      console.error("[PdfDocumentPane] local PDF source failed", error);
      setLocalSource(createResolvedLocalPdfSourceState(null));
    });

    return () => {
      isCancelled = true;
      if (localObjectUrlRef.current) {
        URL.revokeObjectURL(localObjectUrlRef.current);
        localObjectUrlRef.current = null;
      }
    };
  }, [currentUserId, document.id, document.localFileId, document.userId]);

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
