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

const resolveDocumentFileId = (document: Pick<DocumentItem, "id" | "localFileId">): string => {
  return document.localFileId?.trim() || document.id;
};

const PdfDocumentPane = ({ document, className, onDocumentUpdate }: PdfDocumentPaneProps) => {
  const persistedSourceUrl = useMemo(() => resolvePdfDocumentSourceUrl(document), [document.blobUrl, document.downloadUrl, document.googleDriveWebContentLink, document.googleDriveWebViewLink, document.localUrl, document.remoteUrl]);
  const [localObjectUrl, setLocalObjectUrl] = useState<string | null>(null);
  const sourceUrl = persistedSourceUrl ?? localObjectUrl;

  useEffect(() => {
    if (persistedSourceUrl) {
      setLocalObjectUrl(null);
      return;
    }

    let isCancelled = false;
    let objectUrl: string | null = null;

    const loadLocalObjectUrl = async () => {
      const blob = await getDocumentBlob(resolveDocumentFileId(document), { userId: document.userId });
      if (!blob || isCancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setLocalObjectUrl(objectUrl);
    };

    void loadLocalObjectUrl().catch((error: unknown) => {
      if (!isCancelled) console.error("[PdfDocumentPane] local PDF source failed", error);
    });

    return () => {
      isCancelled = true;
      setLocalObjectUrl(null);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [document.id, document.localFileId, document.userId, persistedSourceUrl]);

  return <PdfPane sourceUrl={sourceUrl} className={className} viewerState={document.viewerState ?? null} onViewerStateChange={(viewerState: PdfViewerState) => onDocumentUpdate?.({ viewerState })} />;
};

export { PdfDocumentPane };
