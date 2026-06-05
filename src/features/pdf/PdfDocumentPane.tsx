import { useEffect, useMemo, useState } from "react";
import { PdfPane } from "./PdfPane";
import { resolvePdfDocumentSourceUrl } from "./resolvePdfDocumentSourceUrl";
import type { PdfViewerState, DocumentItem } from "@/types";
import { getDocumentBlob } from "@/services/documentFileStore";

type PdfDocumentPaneProps = {
  document: DocumentItem;
  className?: string;
  onDocumentUpdate?: (updates: Partial<DocumentItem>) => Promise<void> | void;
};

type LocalPdfSourceState = {
  isResolved: boolean;
  url: string | null;
};

const createPendingLocalPdfSourceState = (): LocalPdfSourceState => ({
  isResolved: false,
  url: null,
});

const createResolvedLocalPdfSourceState = (url: string | null): LocalPdfSourceState => ({
  isResolved: true,
  url,
});

const resolveDocumentFileId = (document: Pick<DocumentItem, "id" | "localFileId">): string => {
  return document.localFileId?.trim() || document.id;
};

const PdfDocumentPane = ({ document, className, onDocumentUpdate }: PdfDocumentPaneProps) => {
  const persistedSourceUrl = useMemo(() => resolvePdfDocumentSourceUrl(document), [document.blobUrl, document.downloadUrl, document.googleDriveWebContentLink, document.googleDriveWebViewLink, document.localUrl, document.remoteUrl]);
  const [localSource, setLocalSource] = useState<LocalPdfSourceState>(createPendingLocalPdfSourceState);
  const sourceUrl = localSource.url ?? (localSource.isResolved ? persistedSourceUrl : null);

  useEffect(() => {
    let isCancelled = false;
    let objectUrl: string | null = null;

    setLocalSource(createPendingLocalPdfSourceState());

    const loadLocalObjectUrl = async () => {
      const blob = await getDocumentBlob(resolveDocumentFileId(document), { userId: document.userId });
      if (isCancelled) return;

      if (!blob) {
        setLocalSource(createResolvedLocalPdfSourceState(null));
        return;
      }

      objectUrl = URL.createObjectURL(blob);
      setLocalSource(createResolvedLocalPdfSourceState(objectUrl));
    };

    void loadLocalObjectUrl().catch((error: unknown) => {
      if (isCancelled) return;
      console.error("[PdfDocumentPane] local PDF source failed", error);
      setLocalSource(createResolvedLocalPdfSourceState(null));
    });

    return () => {
      isCancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [document.id, document.localFileId, document.userId]);

  if (!localSource.isResolved && !sourceUrl) {
    return <div className={className ?? "flex h-full min-h-0 min-w-0 items-center justify-center bg-[var(--carvepanel-surface)] text-[13px] text-[#6d6d6d]"}>PDFを読み込み中...</div>;
  }

  return <PdfPane sourceUrl={sourceUrl} className={className} viewerState={document.viewerState ?? null} onViewerStateChange={(viewerState: PdfViewerState) => onDocumentUpdate?.({ viewerState })} />;
};

export { PdfDocumentPane };
