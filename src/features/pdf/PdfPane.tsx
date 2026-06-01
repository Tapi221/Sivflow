import type { PdfViewerState } from "@/types";
import type { BlobUrl } from "@/types/core/branded";
import { cn } from "@/lib/utils";

interface PdfPaneDoc {
  id: string;
  name?: string;
  title?: string;
  fileName?: string;
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
  onDocumentUpdate?: (updates: Partial<PdfPaneDoc>) => Promise<void> | void;
}

const resolveDocumentTitle = (doc: PdfPaneDoc): string => {
  return doc.title?.trim() || doc.fileName?.trim() || doc.name?.trim() || "PDF";
};

export const PdfPane = ({ doc, className }: PdfPaneProps) => {
  const documentTitle = resolveDocumentTitle(doc);

  return (
    <div className={cn("flex h-full min-h-0 min-w-0 items-center justify-center bg-[#fbfbfa] p-6", className)}>
      <div className="max-w-md rounded-xl border border-[#e2e1dc] bg-white px-5 py-4 text-[14px] leading-6 text-[#4b4a45] shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        <div className="mb-2 text-[15px] font-semibold text-[#2f2e2a]">
          PDFビューアは無効です
        </div>
        <div className="break-words">
          {documentTitle}
        </div>
        <div className="mt-2 text-[12px] leading-5 text-[#8b8a84]">
          PDF.js ベースの表示実装を外しています。PDFファイルの登録情報は保持されています。
        </div>
      </div>
    </div>
  );
};
