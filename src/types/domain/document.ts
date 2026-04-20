import type { BlobUrl, StorageUrl } from "@/types/core/branded";
import type { BaseEntity } from "./base";

export type DocumentKind = "pdf";
export type PdfPageLayoutMode = "single" | "double";

export interface PdfViewerState {
  currentPage?: number;
  scale?: number;
  zoomPercent?: number;
  fitMode?: "width" | "manual";
  pageLayoutMode?: PdfPageLayoutMode;
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
