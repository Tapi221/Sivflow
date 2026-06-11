import type { BlobUrl, StorageUrl } from "@/types/core/branded";
import type { BaseEntity } from "./base";



type DocumentKind = "pdf";
type PdfPageLayoutMode = "single" | "double";
type PdfSidePanelTab = "bookmarks" | "highlights" | "ocr" | "outline" | "thumbnails";
type LegacyDocumentFields = { folder_id?: string | null; file_name?: string | null; order_index?: number; };
interface PdfViewerState { currentPage?: number;
  scale?: number;
  fitMode?: "width" | "manual";
  pageLayoutMode?: PdfPageLayoutMode;
  bookmarkPages?: number[];
  sidePanelTab?: PdfSidePanelTab;
  thumbnailOrder?: number[];
  markPages?: Record<string, number>;
  historyBackPages?: number[];
  historyForwardPages?: number[];
}
interface DocumentItem extends BaseEntity, LegacyDocumentFields { kind: DocumentKind;
  folderId: string;
  orderIndex: number;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  blobUrl?: BlobUrl | null;
  localUrl?: BlobUrl | null;
  remoteUrl?: StorageUrl | null;
  localFileId?: string | null;
  storagePath?: string | null;
  downloadUrl?: string | null;
  thumbnailUrl?: string;
  tags?: string[];
  pageCount?: number | null;
  uploadStatus?: "pending" | "queued" | "uploading" | "ready" | "failed";
  googleDriveFileId?: string | null;
  googleDriveWebViewLink?: string | null;
  googleDriveWebContentLink?: string | null;
  documentId?: string;
  viewerState?: PdfViewerState | null;
}
type Document = DocumentItem;
type PdfDocument = DocumentItem;

export type { DocumentKind, PdfPageLayoutMode, PdfSidePanelTab, LegacyDocumentFields, PdfViewerState, DocumentItem, Document, PdfDocument };
