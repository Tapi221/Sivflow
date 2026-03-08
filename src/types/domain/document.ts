import type { BlobUrl, StorageUrl } from "@/types/core/branded";
import { Timestamp } from "firebase/firestore";
import type { BaseEntity } from "./base";

export type DocumentKind = "pdf" | "pptx";

export interface PdfViewerState {
  currentPage?: number;
  scale?: number;
  fitMode?: "width" | "manual";
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
  pptxManifestStatus?: "none" | "queued" | "processing" | "ready" | "failed";
  pptxManifestPath?: string | null;
  pptxSlideCount?: number | null;
  pptxLastError?: string | null;
  pptxConvertRequestedAt?: number | null;
  pptxConvertedAt?: number | null;
  pptxSourceSignature?: string | null;
  pptxRetryCount?: number | null;
  pptxNextRetryAt?: number | null;
  convertStatus?: "processing" | "ready" | "failed";
  pptx?: {
    manifestPath?: string | null;
    fallbackPdfPath?: string | null;
    slideCount?: number | null;
    updatedAt?: Date | Timestamp;
    error?: string | null;
    sourceSignature?: string | null;
    retryCount?: number | null;
    nextRetryAt?: number | null;
  };
  viewerState?: PdfViewerState | null;
}

export type Document = DocumentItem;
export type PdfDocument = DocumentItem;




