/**
 * Pure domain logic for PPTX conversion state:
 * status normalization, retry scheduling, error formatting, time utilities.
 * No React, no Firebase, no I/O.
 */

import type { DocumentItem } from "@/types";
import type {
  ConversionStatus,
  PptxManifestStatus,
} from "./pptxTypes";
import {
  AUTO_RETRY_DELAYS_MS,
  MANIFEST_PENDING_WINDOW_BASE_MS,
  MANIFEST_PENDING_WINDOW_LARGE_FILE_MS,
  MANIFEST_PENDING_WINDOW_LARGE_FILE_THRESHOLD_BYTES,
  MANIFEST_RETRY_BASE_MS,
  MANIFEST_RETRY_MAX_MS,
  MANIFEST_RETRY_STEP_MS,
  MAX_AUTO_RETRY_ATTEMPTS,
} from "./pptxTypes";

// ─── Utility ─────────────────────────────────────────────────────────────────

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(Math.max(v, min), max);

export const isHttpUrl = (value: string): boolean =>
  /^https?:\/\//i.test(value);

export const normalizeString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const getUpdatedAtMs = (value: unknown): number | null => {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object") {
    const record = value as { toMillis?: () => number; seconds?: number };
    if (typeof record.toMillis === "function") return record.toMillis();
    if (typeof record.seconds === "number") return record.seconds * 1000;
  }
  if (typeof value === "number") return value;
  return null;
};

export const appendCacheBust = (
  url: string,
  token?: string | number | null,
): string => {
  if (!token) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}t=${token}`;
};

// ─── Status normalization ─────────────────────────────────────────────────────

export const normalizeManifestStatus = (
  doc: DocumentItem,
): PptxManifestStatus => {
  if (doc.pptxManifestStatus) return doc.pptxManifestStatus;
  if (doc.convertStatus === "ready") return "ready";
  if (doc.convertStatus === "failed") return "failed";
  if (doc.convertStatus === "processing") return "processing";
  return "none";
};

export const normalizeConversionStatus = (
  value: unknown,
): ConversionStatus | null => {
  if (
    value === "queued" ||
    value === "processing" ||
    value === "ready" ||
    value === "failed"
  ) {
    return value;
  }
  return null;
};

export const normalizeRetryCount = (value: unknown): number => {
  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    !Number.isFinite(value)
  )
    return 0;
  return Math.max(0, Math.floor(value));
};

// ─── Source signature ─────────────────────────────────────────────────────────

export const buildSourceSignature = (doc: DocumentItem): string => {
  const storagePath = normalizeString(doc.storagePath) ?? "";
  const remoteUrl =
    normalizeString(doc.remoteUrl ?? doc.downloadUrl ?? null) ?? "";
  const sizeBytes =
    typeof doc.sizeBytes === "number" && Number.isFinite(doc.sizeBytes)
      ? doc.sizeBytes
      : -1;
  const mimeType = normalizeString(doc.mimeType) ?? "";
  const fileName = normalizeString(doc.fileName) ?? "";
  return `${storagePath}|${remoteUrl}|${sizeBytes}|${mimeType}|${fileName}`;
};

// ─── Retry scheduling ─────────────────────────────────────────────────────────

export const autoRetryDelayMs = (attempt: number): number => {
  const index = Math.max(
    0,
    Math.min(AUTO_RETRY_DELAYS_MS.length - 1, attempt - 1),
  );
  return AUTO_RETRY_DELAYS_MS[index];
};

export const manifestRetryDelayMs = (attempt: number): number =>
  Math.min(
    MANIFEST_RETRY_MAX_MS,
    MANIFEST_RETRY_BASE_MS + attempt * MANIFEST_RETRY_STEP_MS,
  );

export const getManifestPendingWindowMs = (
  sizeBytes?: number | null,
): number => {
  if (
    typeof sizeBytes === "number" &&
    sizeBytes >= MANIFEST_PENDING_WINDOW_LARGE_FILE_THRESHOLD_BYTES
  ) {
    return MANIFEST_PENDING_WINDOW_LARGE_FILE_MS;
  }
  return MANIFEST_PENDING_WINDOW_BASE_MS;
};

export const isWithinPendingWindow = (
  requestedAtMs?: number | null,
  windowMs = MANIFEST_PENDING_WINDOW_BASE_MS,
): boolean => {
  if (typeof requestedAtMs !== "number" || Number.isNaN(requestedAtMs))
    return false;
  return Date.now() - requestedAtMs < windowMs;
};

// ─── Conversion request failure classification ────────────────────────────────

export const isConversionRequestFailure = (
  value: string | null | undefined,
): boolean => {
  const normalized = normalizeString(value)?.toLowerCase() ?? "";
  return normalized.startsWith("conversion_request_");
};

export const isAutoRetryableConversionRequestFailure = (
  value: string | null | undefined,
): boolean => {
  const normalized = normalizeString(value)?.toLowerCase() ?? "";
  if (!normalized) return false;
  if (
    normalized === "conversion_request_blocked_by_client" ||
    normalized === "conversion_request_probably_blocked_by_client" ||
    normalized === "conversion_request_permission_denied"
  ) {
    return false;
  }
  return normalized.startsWith("conversion_request_");
};

// ─── Error display ────────────────────────────────────────────────────────────

const sanitizeErrorLabel = (value: string): string =>
  value.replace(/^([a-z0-9_]+)(users\/)/i, "$1: $2");

export const formatConversionError = (
  value: string | null | undefined,
): string => {
  const normalized = normalizeString(value) ?? null;
  if (!normalized) return "conversion_failed";
  switch (normalized) {
    case "manifest_not_found":
      return "manifest_not_found: 変換出力が見つかりません";
    case "conversion_request_offline":
      return "conversion_request_offline: オフラインのため変換要求できません";
    case "conversion_request_unavailable":
      return "conversion_request_unavailable: Firestore に接続できません";
    case "conversion_request_blocked_by_client":
      return "conversion_request_blocked_by_client: ブラウザ拡張が通信を遮断しています";
    case "conversion_request_probably_blocked_by_client":
      return "conversion_request_probably_blocked_by_client: ブラウザ拡張等で通信が遮断されています";
    case "conversion_request_permission_denied":
      return "conversion_request_permission_denied: 変換要求の権限がありません";
    case "conversion_request_failed_precondition":
      return "conversion_request_failed_precondition: 変換要求の前提条件を満たしていません";
    case "conversion_request_cancelled":
      return "conversion_request_cancelled: 変換要求がキャンセルされました";
    default:
      return sanitizeErrorLabel(normalized);
  }
};

// ─── Diagnostics ──────────────────────────────────────────────────────────────

export const isFirestoreDiagnosticsEnabled = (): boolean => {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  try {
    return (
      window.localStorage.getItem("flashcard.firestore.diagnostics") === "1"
    );
  } catch {
    return false;
  }
};

// ─── Async utility ────────────────────────────────────────────────────────────

export const waitFor = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    let timer: number | null = null;
    const onAbort = () => {
      if (timer !== null) window.clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      reject(new Error("aborted"));
    };
    timer = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });

// ─── MAX_AUTO_RETRY_ATTEMPTS re-export ───────────────────────────────────────

export { MAX_AUTO_RETRY_ATTEMPTS };





