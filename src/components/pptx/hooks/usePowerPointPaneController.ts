/**
 * Top-level controller hook for PowerPointPane.
 * Composes all sub-hooks, owns the conversion queue logic,
 * and derives all UI-visible computed values.
 */

import type { SlideData } from "@/components/pptx/SlideImage";
import {
  autoRetryDelayMs,
  buildSourceSignature,
  formatConversionError,
  getManifestPendingWindowMs,
  getUpdatedAtMs,
  isAutoRetryableConversionRequestFailure,
  isConversionRequestFailure,
  isFirestoreDiagnosticsEnabled,
  MAX_AUTO_RETRY_ATTEMPTS,
  normalizeManifestStatus,
  normalizeRetryCount,
  normalizeString,
} from "@/components/pptx/domain/pptxConversion";
import { classifyConversionRequestError } from "@/components/pptx/domain/pptxErrors";
import { ENQUEUE_DEDUPE_WINDOW_MS } from "@/components/pptx/domain/pptxTypes";
import { useAuthSession } from "@/contexts/AuthContext";
import { useNetworkStatus } from "@/hooks/platform/useNetworkStatus";
import { firestoreDb } from "@/services/firebase";
import { pptxConversionDocPathSegments } from "@/services/firestorePaths";
import type { DocumentItem } from "@/types";
import {
  doc as firestoreDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalDocumentSource } from "./useLocalDocumentSource";
import { usePptxConversionSubscription } from "./usePptxConversionSubscription";
import { usePptxDocumentSync } from "./usePptxDocumentSync";
import { usePptxManifestLoader } from "./usePptxManifestLoader";

// ─── Public interface ─────────────────────────────────────────────────────────

export interface PowerPointPaneController {
  // Document state
  docState: DocumentItem;
  displayName: string;

  // Slide navigation
  currentSlide: number;
  setCurrentSlide: (n: number) => void;
  effectiveSlideCount: number;
  slides: SlideData[];

  // Zoom
  scale: number;
  setScale: (updater: (prev: number) => number) => void;

  // Loading / error state
  loadingManifest: boolean;
  manifestPending: boolean;
  manifestError: string | null;
  setManifestError: (v: string | null) => void;
  manifestStatus: ReturnType<typeof normalizeManifestStatus>;

  // Conversion info
  conversionError: string | null;
  conversionErrorLabel: string;
  retryCount: number;
  hasReachedAutoRetryLimit: boolean;
  hasScheduledAutoRetry: boolean;
  nextRetryLabel: string | null;

  // Network / offline
  isOnline: boolean;
  offlineWithoutReadyManifest: boolean;

  // Viewer readiness
  viewerReady: boolean;

  // Source open
  canOpenSource: boolean;
  handleOpenSource: () => void;

  // Local source
  localSourceStatus: ReturnType<
    typeof useLocalDocumentSource
  >["localSourceStatus"];

  // Fallback
  fallbackUrl: string | null;

  // Actions
  handlePrev: () => void;
  handleNext: () => void;
  handleRetryConversion: () => void;

  // Ref for viewer
  viewerRef: React.RefObject<
    import("../PowerPointViewer").PowerPointViewerHandle | null
  >;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const usePowerPointPaneController = (doc: DocumentItem) => {
  const { currentUser } = useAuthSession();
  const { isOnline } = useNetworkStatus();
  const diagnosticsEnabled = useMemo(() => isFirestoreDiagnosticsEnabled(), []);

  const [currentSlide, setCurrentSlide] = useState(1);
  const [scale, setScale] = useState(1.0);

  const enqueueInFlightRef = useRef<Set<string>>(new Set());

  // Reset per-doc state when doc.id changes
  useEffect(() => {
    setCurrentSlide(1);
    setScale(1.0);
    enqueueInFlightRef.current.clear();
  }, [doc.id]);

  const logDiagnostics = useCallback(
    (message: string, payload?: Record<string, unknown>) => {
      if (!diagnosticsEnabled) return;
      console.info(`[PowerPointPane] ${message}`, payload ?? {});
    },
    [diagnosticsEnabled],
  );

  // ── Document sync (Firestore + localDB) ──────────────────────────────────
  const { docState, applyLocalDocumentPatch } = usePptxDocumentSync({
    doc,
    userId: currentUser?.uid,
  });

  // ── Derived document values ───────────────────────────────────────────────
  const manifestStatus = normalizeManifestStatus(docState);
  const manifestPath =
    docState.pptxManifestPath ?? docState.pptx?.manifestPath ?? null;
  const fallbackPath = docState.pptx?.fallbackPdfPath ?? null;
  const manifestToken =
    getUpdatedAtMs(
      docState.pptxConvertedAt ??
        docState.pptx?.updatedAt ??
        docState.updatedAt,
    ) ?? undefined;
  const docSlideCount =
    docState.pptxSlideCount ?? docState.pptx?.slideCount ?? null;
  const conversionError =
    docState.pptxLastError ?? docState.pptx?.error ?? null;
  const requestedAtMs = getUpdatedAtMs(docState.pptxConvertRequestedAt);
  const nextRetryAtMs = getUpdatedAtMs(docState.pptxNextRetryAt);
  const retryCount = normalizeRetryCount(
    docState.pptxRetryCount ?? docState.pptx?.retryCount ?? 0,
  );
  const sourceSignature = useMemo(
    () => buildSourceSignature(docState),
    [docState],
  );
  const lastRequestedSourceSignature = normalizeString(
    docState.pptxSourceSignature ?? docState.pptx?.sourceSignature ?? null,
  );
  const isSameSourceAsLastRequested =
    lastRequestedSourceSignature === sourceSignature;
  const manifestPendingWindowMs = useMemo(
    () => getManifestPendingWindowMs(docState.sizeBytes),
    [docState.sizeBytes],
  );

  // ── Conversion status subscription ───────────────────────────────────────
  usePptxConversionSubscription({
    docId: docState.id,
    userId: currentUser?.uid,
    sourceSignature,
    manifestPendingWindowMs,
    applyLocalDocumentPatch,
    logDiagnostics,
  });

  // ── Manifest loader ───────────────────────────────────────────────────────
  const {
    slides,
    slideCount,
    loadingManifest,
    manifestPending,
    manifestError,
    setManifestError: _setManifestError,
    fallbackUrl,
  } = usePptxManifestLoaderWithReset({
    docId: docState.id,
    manifestStatus,
    manifestPath,
    manifestToken,
    fallbackPath,
    requestedAtMs,
    manifestPendingWindowMs,
    sourceSignature,
    isOnline,
    applyLocalDocumentPatch,
    logDiagnostics,
    docIdKey: doc.id,
  });

  // ── Local source ──────────────────────────────────────────────────────────
  const localBlobId = docState.localFileId ?? docState.id ?? null;
  const persistedBlobUrl = useMemo(() => {
    const candidate = normalizeString(
      docState.blobUrl ?? docState.localUrl ?? null,
    );
    if (!candidate) return null;
    return candidate.startsWith("blob:") ? candidate : null;
  }, [docState]);

  const { localBlobUrl, localSourceStatus } = useLocalDocumentSource({
    userId: currentUser?.uid,
    localBlobId,
    persistedBlobUrl,
  });

  const remoteSourceUrl = useMemo(
    () => normalizeString(docState.remoteUrl ?? docState.downloadUrl ?? null),
    [docState.downloadUrl, docState.remoteUrl],
  );
  const sourceUrlForOpen = remoteSourceUrl ?? localBlobUrl ?? null;

  // ── Conversion queue ──────────────────────────────────────────────────────
  const queueConversion = useCallback(
    async (reason: "auto" | "manual") => {
      if (!currentUser?.uid || !docState.id || !docState.storagePath) return;

      const now = Date.now();
      const lastRequestedAt = getUpdatedAtMs(docState.pptxConvertRequestedAt);
      const currentRetryCount = normalizeRetryCount(
        docState.pptxRetryCount ?? docState.pptx?.retryCount ?? 0,
      );
      const currentNextRetryAtMs = getUpdatedAtMs(docState.pptxNextRetryAt);
      const currentSourceSignature = buildSourceSignature(docState);
      const sameSourceAsLastRequest =
        lastRequestedSourceSignature === currentSourceSignature;
      const baseRetryCount = sameSourceAsLastRequest ? currentRetryCount : 0;
      const attemptNumber = baseRetryCount + 1;

      if (reason === "auto") {
        if (
          sameSourceAsLastRequest &&
          currentRetryCount >= MAX_AUTO_RETRY_ATTEMPTS
        ) {
          logDiagnostics("conversion-request-skipped-max-retries", {
            docId: docState.id,
            retryCount: currentRetryCount,
            maxRetries: MAX_AUTO_RETRY_ATTEMPTS,
          });
          return;
        }
        if (
          sameSourceAsLastRequest &&
          typeof currentNextRetryAtMs === "number" &&
          now < currentNextRetryAtMs
        ) {
          logDiagnostics("conversion-request-skipped-cooldown", {
            docId: docState.id,
            retryCount: currentRetryCount,
            nextRetryAtMs: currentNextRetryAtMs,
          });
          return;
        }
      }

      if (
        typeof lastRequestedAt === "number" &&
        now - lastRequestedAt < ENQUEUE_DEDUPE_WINDOW_MS &&
        sameSourceAsLastRequest
      ) {
        logDiagnostics("conversion-request-skipped-duplicate", {
          docId: docState.id,
          reason,
          lastRequestedAt,
          sourceSignature: currentSourceSignature,
        });
        return;
      }

      if (enqueueInFlightRef.current.has(docState.id)) {
        logDiagnostics("conversion-request-skipped-inflight", {
          docId: docState.id,
          reason,
        });
        return;
      }

      const patchRequestFailure = async (errorMessage: string) => {
        const shouldScheduleAutoRetry =
          reason === "auto" &&
          isAutoRetryableConversionRequestFailure(errorMessage) &&
          attemptNumber < MAX_AUTO_RETRY_ATTEMPTS;
        const nextRetryAt = shouldScheduleAutoRetry
          ? now + autoRetryDelayMs(attemptNumber)
          : null;
        await applyLocalDocumentPatch({
          convertStatus: "failed",
          pptxManifestStatus: "failed",
          pptxLastError: errorMessage,
          pptxRetryCount: attemptNumber,
          pptxNextRetryAt: nextRetryAt,
          pptxSourceSignature: currentSourceSignature,
          pptx: {
            ...(docState.pptx ?? {}),
            error: errorMessage,
            retryCount: attemptNumber,
            nextRetryAt,
            sourceSignature: currentSourceSignature,
            updatedAt: new Date(now),
          },
        });
      };

      if (!isOnline) {
        await patchRequestFailure("conversion_request_offline");
        return;
      }

      const requestedAt = now;
      enqueueInFlightRef.current.add(docState.id);
      const conversionPath = pptxConversionDocPathSegments(
        currentUser.uid,
        docState.id,
      );

      try {
        await applyLocalDocumentPatch({
          convertStatus: "processing",
          pptxManifestStatus: "queued",
          pptxLastError: null,
          pptxConvertRequestedAt: requestedAt,
          pptxRetryCount: 0,
          pptxNextRetryAt: null,
          pptxSourceSignature: currentSourceSignature,
          pptx: {
            ...(docState.pptx ?? {}),
            error: null,
            retryCount: 0,
            nextRetryAt: null,
            sourceSignature: currentSourceSignature,
            updatedAt: new Date(requestedAt),
          },
        });

        await setDoc(
          firestoreDoc(firestoreDb, ...conversionPath),
          {
            docId: docState.id,
            uid: currentUser.uid,
            sourceStoragePath: docState.storagePath,
            status: "queued",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            requestOrigin: reason,
          },
          { merge: true },
        );
        logDiagnostics("conversion-request-enqueued", {
          docId: docState.id,
          storagePath: docState.storagePath,
          reason,
          path: conversionPath.join("/"),
        });
      } catch (error: unknown) {
        const errorMessage = classifyConversionRequestError(error, isOnline);
        console.error(
          "[usePowerPointPaneController] Failed to enqueue PPTX conversion",
          {
            docId: docState.id,
            storagePath: docState.storagePath,
            error,
            normalizedError: errorMessage,
            retryAttempt: attemptNumber,
            retryCount: currentRetryCount,
          },
        );
        await patchRequestFailure(errorMessage);
      } finally {
        enqueueInFlightRef.current.delete(docState.id);
      }
    },
    [
      applyLocalDocumentPatch,
      currentUser?.uid,
      docState,
      isOnline,
      lastRequestedSourceSignature,
      logDiagnostics,
    ],
  );

  // ── Auto-retry trigger ────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.uid || !docState.id || !docState.storagePath) return;
    if (!isOnline) return;
    if (docState.uploadStatus !== "ready") return;
    if (
      manifestStatus === "queued" ||
      manifestStatus === "processing" ||
      manifestStatus === "ready"
    )
      return;
    if (manifestStatus === "failed") {
      if (!isConversionRequestFailure(conversionError)) return;
      if (!isAutoRetryableConversionRequestFailure(conversionError)) return;
      if (isSameSourceAsLastRequested && retryCount >= MAX_AUTO_RETRY_ATTEMPTS)
        return;
      if (
        isSameSourceAsLastRequested &&
        typeof nextRetryAtMs === "number" &&
        Date.now() < nextRetryAtMs
      )
        return;
    }
    void queueConversion("auto");
  }, [
    conversionError,
    currentUser?.uid,
    docState.id,
    docState.storagePath,
    docState.uploadStatus,
    isOnline,
    isSameSourceAsLastRequested,
    manifestStatus,
    nextRetryAtMs,
    queueConversion,
    retryCount,
  ]);

  // ── Slide navigation boundary ─────────────────────────────────────────────
  const effectiveSlideCount = Math.max(slideCount, docSlideCount ?? 0);
  useEffect(() => {
    if (!effectiveSlideCount) return;
    if (currentSlide > effectiveSlideCount)
      setCurrentSlide(effectiveSlideCount);
  }, [currentSlide, effectiveSlideCount]);

  // ── Viewer reference ──────────────────────────────────────────────────────
  // Imported lazily to avoid circular reference at module level
  const viewerRef = useRef<
    import("../PowerPointViewer").PowerPointViewerHandle | null
  >(null);

  // ── Derived UI state ──────────────────────────────────────────────────────
  const viewerReady =
    !loadingManifest &&
    slides.length > 0 &&
    manifestStatus === "ready" &&
    !manifestError &&
    !manifestPending;

  const offlineWithoutReadyManifest =
    !isOnline && (manifestStatus !== "ready" || manifestPending);

  const canOpenSource = !!(sourceUrlForOpen || fallbackUrl);

  const hasReachedAutoRetryLimit =
    manifestStatus === "failed" &&
    isConversionRequestFailure(conversionError) &&
    isAutoRetryableConversionRequestFailure(conversionError) &&
    isSameSourceAsLastRequested &&
    retryCount >= MAX_AUTO_RETRY_ATTEMPTS;

  const hasScheduledAutoRetry =
    manifestStatus === "failed" &&
    isConversionRequestFailure(conversionError) &&
    isAutoRetryableConversionRequestFailure(conversionError) &&
    isSameSourceAsLastRequested &&
    typeof nextRetryAtMs === "number" &&
    nextRetryAtMs > Date.now();

  const nextRetryLabel =
    hasScheduledAutoRetry && typeof nextRetryAtMs === "number"
      ? new Date(nextRetryAtMs).toLocaleTimeString()
      : null;

  const conversionErrorLabel = formatConversionError(conversionError);
  const displayName = docState.title || docState.fileName || "PowerPoint";

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePrev = useCallback(() => {
    const next = Math.max(1, currentSlide - 1);
    viewerRef.current?.scrollToSlide(next);
  }, [currentSlide]);

  const handleNext = useCallback(() => {
    const max = Math.max(1, effectiveSlideCount || currentSlide);
    const next = Math.min(max, currentSlide + 1);
    viewerRef.current?.scrollToSlide(next);
  }, [currentSlide, effectiveSlideCount]);

  const handleOpenSource = useCallback(() => {
    const url = sourceUrlForOpen ?? fallbackUrl;
    if (!url) return;
    void import("@/platform").then((m) => m.default.shell.openExternal(url));
  }, [fallbackUrl, sourceUrlForOpen]);

  const handleRetryConversion = useCallback(() => {
    if (!isOnline) return;
    _setManifestError(null);
    void queueConversion("manual");
  }, [_setManifestError, isOnline, queueConversion]);

  return {
    docState,
    displayName,
    currentSlide,
    setCurrentSlide,
    effectiveSlideCount,
    slides,
    scale,
    setScale,
    loadingManifest,
    manifestPending,
    manifestError,
    setManifestError: _setManifestError,
    manifestStatus,
    conversionError,
    conversionErrorLabel,
    retryCount,
    hasReachedAutoRetryLimit,
    hasScheduledAutoRetry,
    nextRetryLabel,
    isOnline,
    offlineWithoutReadyManifest,
    viewerReady,
    canOpenSource,
    handleOpenSource,
    localSourceStatus,
    fallbackUrl,
    handlePrev,
    handleNext,
    handleRetryConversion,
    viewerRef,
  };
};

const usePptxManifestLoaderWithReset = (
  options: Parameters<typeof usePptxManifestLoader>[0] & {
    docIdKey: string | undefined;
  }
) => {
  const { ...rest } = options;

  // usePptxManifestLoader uses docIdKey only for logging; the reset
  // on doc.id change is handled via the generationRef inside the hook itself
  // (manifestStatus → "none" on doc switch resets loader state).
  const result = usePptxManifestLoader(rest);

  // Expose setManifestError so controller can clear it on manual retry
  const [manifestErrorOverride, setManifestError] = useState<string | null>(
    null,
  );

  return {
    ...result,
    manifestError: manifestErrorOverride ?? result.manifestError,
    setManifestError,
  };
};
