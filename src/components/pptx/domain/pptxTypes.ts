import type { DocumentItem } from "@/types";

// ─── Manifest / Conversion types ────────────────────────────────────────────

export type PptxManifestStatus = NonNullable<DocumentItem["pptxManifestStatus"]>;

export interface PptxManifest {
  docId?: string;
  slideCount?: number;
  slides?: Array<{
    index: number;
    path?: string | null;
    url?: string | null;
    width: number;
    height: number;
  }>;
  fallbackPdfPath?: string | null;
}

export type ConversionStatus = "queued" | "processing" | "ready" | "failed";

export interface PptxConversionRecord {
  status?: ConversionStatus | string;
  manifestPath?: string | null;
  fallbackPdfPath?: string | null;
  slideCount?: number | null;
  errorMessage?: string | null;
  createdAt?: unknown;
  convertedAt?: unknown;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const FIRESTORE_DIAGNOSTIC_FLAG = "flashcard.firestore.diagnostics";
export const MANIFEST_PENDING_WINDOW_BASE_MS = 5 * 60 * 1000;
export const MANIFEST_PENDING_WINDOW_LARGE_FILE_MS = 10 * 60 * 1000;
export const MANIFEST_PENDING_WINDOW_LARGE_FILE_THRESHOLD_BYTES =
  20 * 1024 * 1024;
export const MANIFEST_RETRY_BASE_MS = 2000;
export const MANIFEST_RETRY_STEP_MS = 750;
export const MANIFEST_RETRY_MAX_MS = 5000;
export const ENQUEUE_DEDUPE_WINDOW_MS = 30 * 1000;
export const MAX_AUTO_RETRY_ATTEMPTS = 5;
export const AUTO_RETRY_DELAYS_MS = [
  30 * 1000,
  2 * 60 * 1000,
  10 * 60 * 1000,
  30 * 60 * 1000,
  60 * 60 * 1000,
];



