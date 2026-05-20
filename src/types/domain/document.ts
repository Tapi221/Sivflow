import type { BaseEntity } from "./base";

import type { BlobUrl, StorageUrl } from "@/types/core/branded";

export type DocumentKind = "pdf";
export type PdfPageLayoutMode = "single" | "double";
export type PdfSidePanelTab = "bookmarks" | "outline" | "ocr" | "thumbnails";

export interface PdfViewerState {
  currentPage?: number;
  scale?: number;
  fitMode?: "width" | "manual";
  pageLayoutMode?: PdfPageLayoutMode;
  bookmarkPages?: number[];
  sidePanelTab?: PdfSidePanelTab;
  thumbnailOrder?: number[];
}

export interface DocumentItem extends BaseEntity {
  kind: DocumentKind;
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
  thumbnailUrl?: string | null;
  tags?: string[];
  pageCount?: number | null;
  uploadStatus?: "pending" | "queued" | "uploading" | "ready" | "failed";
  documentId?: string;
  viewerState?: PdfViewerState | null;
}

export type Document = DocumentItem;
export type PdfDocument = DocumentItem;
