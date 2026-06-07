import type { BaseEntity } from "./base";
import type { BlobUrl, StorageUrl } from "@/types/core/branded";

export type DocumentKind = "pdf";
export type PdfPageLayoutMode = "single" | "double";
export type PdfSidePanelTab = "bookmarks" | "highlights" | "ocr" | "outline" | "thumbnails";
export type LegacyDocumentFields = { folder_id?: string | null; file_name?: string | null; order_index?: number; };

export interface PdfViewerState {
  currentPage