import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/Components/ui/button';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileWarning,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { ref, getDownloadURL } from 'firebase/storage';
import { doc as firestoreDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { storage, firestoreDb } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { getLocalDb } from '@/services/localDB';
import { documentDocPathSegments, pptxConversionDocPathSegments } from '@/services/firestorePaths';
import { getDocumentBlob } from '@/services/documentFileStore';
import {
  cacheDocumentBlobUrl,
  getCachedDocumentBlobUrl,
  pinDocumentBlobUrl,
  unpinDocumentBlobUrl,
} from '@/services/documentBlobUrlSessionCache';
import { PowerPointViewer } from './PowerPointViewer';
import type { PowerPointViewerHandle } from './PowerPointViewer';
import type { SlideData } from './SlideImage';
import type { DocumentItem } from '@/types';

interface PowerPointPaneProps {
  doc: DocumentItem;
  className?: string;
}

type PptxManifestStatus = NonNullable<DocumentItem['pptxManifestStatus']>;

interface PptxManifest {
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

type ConversionStatus = 'queued' | 'processing' | 'ready' | 'failed';

interface PptxConversionRecord {
  status?: ConversionStatus | string;
  manifestPath?: string | null;
  fallbackPdfPath?: string | null;
  slideCount?: number | null;
  errorMessage?: string | null;
  createdAt?: unknown;
  convertedAt?: unknown;
}

const FIRESTORE_DIAGNOSTIC_FLAG = 'flashcard.firestore.diagnostics';
const MANIFEST_PENDING_WINDOW_BASE_MS = 5 * 60 * 1000;
const MANIFEST_PENDING_WINDOW_LARGE_FILE_MS = 10 * 60 * 1000;
const MANIFEST_PENDING_WINDOW_LARGE_FILE_THRESHOLD_BYTES = 20 * 1024 * 1024;
const MANIFEST_RETRY_BASE_MS = 2000;
const MANIFEST_RETRY_STEP_MS = 750;
const MANIFEST_RETRY_MAX_MS = 5000;
const ENQUEUE_DEDUPE_WINDOW_MS = 30 * 1000;
const MAX_AUTO_RETRY_ATTEMPTS = 5;
const AUTO_RETRY_DELAYS_MS = [30 * 1000, 2 * 60 * 1000, 10 * 60 * 1000, 30 * 60 * 1000, 60 * 60 * 1000];
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

const isFirestoreDiagnosticsEnabled = (): boolean => {
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(FIRESTORE_DIAGNOSTIC_FLAG) === '1';
  } catch {
    return false;
  }
};

const getUpdatedAtMs = (value: unknown): number | null => {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object') {
    const record = value as { toMillis?: () => number; seconds?: number };
    if (typeof record.toMillis === 'function') return record.toMillis();
    if (typeof record.seconds === 'number') return record.seconds * 1000;
  }
  if (typeof value === 'number') return value;
  return null;
};

const appendCacheBust = (url: string, token?: string | number | null) => {
  if (!token) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}t=${token}`;
};

const normalizeManifestStatus = (doc: DocumentItem): PptxManifestStatus => {
  if (doc.pptxManifestStatus) return doc.pptxManifestStatus;
  if (doc.convertStatus === 'ready') return 'ready';
  if (doc.convertStatus === 'failed') return 'failed';
  if (doc.convertStatus === 'processing') return 'processing';
  return 'none';
};

const normalizeConversionStatus = (value: unknown): ConversionStatus | null => {
  if (value === 'queued' || value === 'processing' || value === 'ready' || value === 'failed') {
    return value;
  }
  return null;
};

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getErrorCode = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') return null;
  const record = error as Record<string, unknown>;
  const rawCode = normalizeString(record.code);
  if (!rawCode) return null;
  return rawCode.toLowerCase().replace(/^firestore\//, '').replace(/^firebase\//, '');
};

const getErrorMessage = (error: unknown): string => {
  if (!error || typeof error !== 'object') return '';
  const record = error as Record<string, unknown>;
  return normalizeString(record.message)?.toLowerCase() ?? '';
};

const getErrorText = (error: unknown): string => {
  const code = getErrorCode(error) ?? '';
  const message = getErrorMessage(error);
  return `${code} ${message}`.trim();
};

const isStorageObjectNotFound = (error: unknown): boolean => {
  const text = getErrorText(error);
  return text.includes('storage/object-not-found') || text.includes('manifest_not_found');
};

const isFirestoreBlockedByClient = (error: unknown): boolean => {
  const code = getErrorCode(error);
  const text = getErrorText(error);
  if (code === 'blocked-by-client' || code === 'err_blocked_by_client') return true;
  return text.includes('err_blocked_by_client') || (text.includes('blocked') && text.includes('client'));
};

const isFirestoreUnavailable = (error: unknown): boolean => {
  const code = getErrorCode(error);
  const text = getErrorText(error);
  if (code === 'unavailable' || code === 'deadline-exceeded') return true;
  return (
    text.includes('unavailable') ||
    text.includes('network request failed') ||
    text.includes('failed to fetch') ||
    text.includes('networkerror')
  );
};

const isLikelyClientBlock = (error: unknown, isOnline: boolean): boolean => {
  if (!isOnline) return false;
  if (isFirestoreBlockedByClient(error)) return true;
  const text = getErrorText(error);
  return (
    text.includes('failed to fetch') &&
    (text.includes('googleapis.com') || text.includes('firestore') || text.includes('blocked'))
  );
};

const classifyConversionRequestError = (error: unknown, isOnline: boolean): string => {
  if (isFirestoreBlockedByClient(error)) return 'conversion_request_blocked_by_client';
  if (isLikelyClientBlock(error, isOnline)) return 'conversion_request_probably_blocked_by_client';
  const code = getErrorCode(error);
  const text = getErrorText(error);
  if (code === 'permission-denied' || text.includes('permission-denied')) return 'conversion_request_permission_denied';
  if (code === 'unavailable') return 'conversion_request_unavailable';
  if (code === 'failed-precondition') return 'conversion_request_failed_precondition';
  if (code === 'cancelled') return 'conversion_request_cancelled';
  if (text.includes('offline')) return 'conversion_request_offline';
  if (isFirestoreUnavailable(error)) return 'conversion_request_unavailable';
  return 'conversion_request_failed';
};

const isConversionRequestFailure = (value: string | null | undefined): boolean => {
  const normalized = normalizeString(value)?.toLowerCase() ?? '';
  return normalized.startsWith('conversion_request_');
};

const isAutoRetryableConversionRequestFailure = (value: string | null | undefined): boolean => {
  const normalized = normalizeString(value)?.toLowerCase() ?? '';
  if (!normalized) return false;
  if (
    normalized === 'conversion_request_blocked_by_client' ||
    normalized === 'conversion_request_probably_blocked_by_client' ||
    normalized === 'conversion_request_permission_denied'
  ) {
    return false;
  }
  return normalized.startsWith('conversion_request_');
};

const normalizeRetryCount = (value: unknown): number => {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

const autoRetryDelayMs = (attempt: number): number => {
  const index = Math.max(0, Math.min(AUTO_RETRY_DELAYS_MS.length - 1, attempt - 1));
  return AUTO_RETRY_DELAYS_MS[index];
};

const getManifestPendingWindowMs = (sizeBytes?: number | null): number => {
  if (typeof sizeBytes === 'number' && sizeBytes >= MANIFEST_PENDING_WINDOW_LARGE_FILE_THRESHOLD_BYTES) {
    return MANIFEST_PENDING_WINDOW_LARGE_FILE_MS;
  }
  return MANIFEST_PENDING_WINDOW_BASE_MS;
};

const sanitizeErrorLabel = (value: string): string =>
  value.replace(/^([a-z0-9_]+)(users\/)/i, '$1: $2');

const formatConversionError = (value: string | null | undefined): string => {
  const normalized = normalizeString(value) ?? null;
  if (!normalized) return 'conversion_failed';
  switch (normalized) {
    case 'manifest_not_found':
      return 'manifest_not_found: 変換出力が見つかりません';
    case 'conversion_request_offline':
      return 'conversion_request_offline: オフラインのため変換要求できません';
    case 'conversion_request_unavailable':
      return 'conversion_request_unavailable: Firestore に接続できません';
    case 'conversion_request_blocked_by_client':
      return 'conversion_request_blocked_by_client: ブラウザ拡張が通信を遮断しています';
    case 'conversion_request_probably_blocked_by_client':
      return 'conversion_request_probably_blocked_by_client: ブラウザ拡張等で通信が遮断されています';
    case 'conversion_request_permission_denied':
      return 'conversion_request_permission_denied: 変換要求の権限がありません';
    case 'conversion_request_failed_precondition':
      return 'conversion_request_failed_precondition: 変換要求の前提条件を満たしていません';
    case 'conversion_request_cancelled':
      return 'conversion_request_cancelled: 変換要求がキャンセルされました';
    default:
      return sanitizeErrorLabel(normalized);
  }
};

const isWithinPendingWindow = (requestedAtMs?: number | null, windowMs = MANIFEST_PENDING_WINDOW_BASE_MS): boolean => {
  if (typeof requestedAtMs !== 'number' || Number.isNaN(requestedAtMs)) return false;
  return Date.now() - requestedAtMs < windowMs;
};

const manifestRetryDelayMs = (attempt: number): number =>
  Math.min(MANIFEST_RETRY_MAX_MS, MANIFEST_RETRY_BASE_MS + attempt * MANIFEST_RETRY_STEP_MS);

const waitFor = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    let timer: number | null = null;
    const onAbort = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      signal.removeEventListener('abort', onAbort);
      reject(new Error('aborted'));
    };
    timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  });

const buildSourceSignature = (doc: DocumentItem): string => {
  const storagePath = normalizeString(doc.storagePath) ?? '';
  const remoteUrl = normalizeString(doc.remoteUrl ?? doc.downloadUrl ?? null) ?? '';
  const sizeBytes = typeof doc.sizeBytes === 'number' && Number.isFinite(doc.sizeBytes) ? doc.sizeBytes : -1;
  const mimeType = normalizeString(doc.mimeType) ?? '';
  const fileName = normalizeString(doc.fileName) ?? '';
  return `${storagePath}|${remoteUrl}|${sizeBytes}|${mimeType}|${fileName}`;
};

async function resolveStorageUrl(pathOrUrl?: string | null): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (isHttpUrl(pathOrUrl)) return pathOrUrl;
  return getDownloadURL(ref(storage, pathOrUrl));
}

export function PowerPointPane({ doc, className }: PowerPointPaneProps) {
  const { currentUser } = useAuth();
  const { isOnline } = useNetworkStatus();
  const diagnosticsEnabled = useMemo(() => isFirestoreDiagnosticsEnabled(), []);

  const [docState, setDocState] = useState<DocumentItem>(doc);
  const viewerRef = useRef<PowerPointViewerHandle>(null);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [slideCount, setSlideCount] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [loadingManifest, setLoadingManifest] = useState(false);
  const [manifestPending, setManifestPending] = useState(false);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [cachedBlobUrl, setCachedBlobUrl] = useState<string | null>(null);
  const [restoredLocalBlobUrl, setRestoredLocalBlobUrl] = useState<string | null>(null);
  const [localSourceStatus, setLocalSourceStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');

  const triedLocalRestoreKeysRef = useRef<Set<string>>(new Set());
  const lastConversionSignatureRef = useRef<string | null>(null);
  const enqueueInFlightRef = useRef<Set<string>>(new Set());
  const manifestLoadGenerationRef = useRef(0);

  const logDiagnostics = useCallback(
    (message: string, payload?: Record<string, unknown>) => {
      if (!diagnosticsEnabled) return;
      console.info(`[PowerPointPane] ${message}`, payload ?? {});
    },
    [diagnosticsEnabled]
  );

  const applyLocalDocumentPatch = useCallback(
    async (patch: Partial<DocumentItem>) => {
      setDocState((prev) => ({
        ...prev,
        ...patch,
        pptx: patch.pptx ? { ...prev.pptx, ...patch.pptx } : prev.pptx,
      }));

      if (!currentUser?.uid || !doc.id) return;
      try {
        const db = await getLocalDb(currentUser.uid);
        const existing = await db.documents.get(doc.id);
        const persistedPatch: Partial<DocumentItem> = { ...patch };
        if (patch.pptx) {
          persistedPatch.pptx = { ...(existing?.pptx ?? {}), ...patch.pptx };
        }
        await db.updateItem('documents', doc.id, {
          ...persistedPatch,
          updatedAt: new Date(),
        });
      } catch (error) {
        console.warn('[PowerPointPane] Failed to persist local document patch', {
          docId: doc.id,
          patch,
          error,
        });
      }
    },
    [currentUser?.uid, doc.id]
  );

  const queueConversion = useCallback(
    async (reason: 'auto' | 'manual') => {
      if (!currentUser?.uid || !docState.id || !docState.storagePath) return;

      const now = Date.now();
      const lastRequestedAt = getUpdatedAtMs(docState.pptxConvertRequestedAt);
      const lastSourceSignature = normalizeString(docState.pptxSourceSignature ?? docState.pptx?.sourceSignature ?? null);
      const currentSourceSignature = buildSourceSignature(docState);
      const sameSourceAsLastRequest = lastSourceSignature === currentSourceSignature;
      const currentRetryCount = normalizeRetryCount(docState.pptxRetryCount ?? docState.pptx?.retryCount ?? 0);
      const currentNextRetryAtMs = getUpdatedAtMs(docState.pptxNextRetryAt);
      const baseRetryCount = sameSourceAsLastRequest ? currentRetryCount : 0;
      const attemptNumber = baseRetryCount + 1;

      if (reason === 'auto') {
        if (sameSourceAsLastRequest && currentRetryCount >= MAX_AUTO_RETRY_ATTEMPTS) {
          logDiagnostics('conversion-request-skipped-max-retries', {
            docId: docState.id,
            retryCount: currentRetryCount,
            maxRetries: MAX_AUTO_RETRY_ATTEMPTS,
          });
          return;
        }
        if (sameSourceAsLastRequest && typeof currentNextRetryAtMs === 'number' && now < currentNextRetryAtMs) {
          logDiagnostics('conversion-request-skipped-cooldown', {
            docId: docState.id,
            retryCount: currentRetryCount,
            nextRetryAtMs: currentNextRetryAtMs,
          });
          return;
        }
      }

      if (
        typeof lastRequestedAt === 'number' &&
        now - lastRequestedAt < ENQUEUE_DEDUPE_WINDOW_MS &&
        sameSourceAsLastRequest
      ) {
        logDiagnostics('conversion-request-skipped-duplicate', {
          docId: docState.id,
          reason,
          lastRequestedAt,
          sourceSignature: currentSourceSignature,
        });
        return;
      }

      if (enqueueInFlightRef.current.has(docState.id)) {
        logDiagnostics('conversion-request-skipped-inflight', {
          docId: docState.id,
          reason,
        });
        return;
      }

      const patchRequestFailure = async (errorMessage: string) => {
        const shouldScheduleAutoRetry =
          reason === 'auto' &&
          isAutoRetryableConversionRequestFailure(errorMessage) &&
          attemptNumber < MAX_AUTO_RETRY_ATTEMPTS;
        const nextRetryAt = shouldScheduleAutoRetry ? now + autoRetryDelayMs(attemptNumber) : null;
        await applyLocalDocumentPatch({
          convertStatus: 'failed',
          pptxManifestStatus: 'failed',
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
        await patchRequestFailure('conversion_request_offline');
        return;
      }

      const requestedAt = now;
      enqueueInFlightRef.current.add(docState.id);
      const conversionPath = pptxConversionDocPathSegments(currentUser.uid, docState.id);
      try {
        await applyLocalDocumentPatch({
          convertStatus: 'processing',
          pptxManifestStatus: 'queued',
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
            status: 'queued',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            requestOrigin: reason,
          },
          { merge: true }
        );
        logDiagnostics('conversion-request-enqueued', {
          docId: docState.id,
          storagePath: docState.storagePath,
          reason,
          path: conversionPath.join('/'),
        });
      } catch (error: unknown) {
        const errorMessage = classifyConversionRequestError(error, isOnline);
        console.error('[PowerPointPane] Failed to enqueue PPTX conversion', {
          docId: docState.id,
          storagePath: docState.storagePath,
          error,
          normalizedError: errorMessage,
          retryAttempt: attemptNumber,
          retryCount: currentRetryCount,
        });
        await patchRequestFailure(errorMessage);
      } finally {
        enqueueInFlightRef.current.delete(docState.id);
      }
    },
    [
      applyLocalDocumentPatch,
      currentUser?.uid,
      docState.id,
      docState.pptx,
      docState.pptxConvertRequestedAt,
      docState.pptxSourceSignature,
      docState.pptxNextRetryAt,
      docState.pptxRetryCount,
      docState.storagePath,
      isOnline,
      logDiagnostics,
    ]
  );

  const displayName = docState.title || docState.fileName || 'PowerPoint';
  const manifestStatus = normalizeManifestStatus(docState);
  const manifestPath = docState.pptxManifestPath ?? docState.pptx?.manifestPath ?? null;
  const fallbackPath = docState.pptx?.fallbackPdfPath ?? null;
  const manifestToken =
    getUpdatedAtMs(docState.pptxConvertedAt ?? docState.pptx?.updatedAt ?? docState.updatedAt) ?? undefined;
  const docSlideCount = docState.pptxSlideCount ?? docState.pptx?.slideCount ?? null;
  const conversionError = docState.pptxLastError ?? docState.pptx?.error ?? null;
  const requestedAtMs = getUpdatedAtMs(docState.pptxConvertRequestedAt);
  const nextRetryAtMs = getUpdatedAtMs(docState.pptxNextRetryAt);
  const retryCount = normalizeRetryCount(docState.pptxRetryCount ?? docState.pptx?.retryCount ?? 0);
  const sourceSignature = useMemo(() => buildSourceSignature(docState), [docState]);
  const lastRequestedSourceSignature = normalizeString(docState.pptxSourceSignature ?? docState.pptx?.sourceSignature ?? null);
  const isSameSourceAsLastRequested = lastRequestedSourceSignature === sourceSignature;
  const manifestPendingWindowMs = useMemo(() => getManifestPendingWindowMs(docState.sizeBytes), [docState.sizeBytes]);
  const conversionErrorLabel = formatConversionError(conversionError);

  const remoteSourceUrl = useMemo(() => {
    const candidate = normalizeString(docState.remoteUrl ?? docState.downloadUrl ?? null);
    return candidate;
  }, [docState.downloadUrl, docState.remoteUrl]);

  const persistedBlobUrl = useMemo(() => {
    const candidate = normalizeString(docState.blobUrl ?? docState.localUrl ?? null);
    if (!candidate) return null;
    return candidate.startsWith('blob:') ? candidate : null;
  }, [docState]);

  const localBlobId = useMemo(() => docState.localFileId ?? docState.id ?? null, [docState.id, docState.localFileId]);

  useEffect(() => {
    setDocState(doc);
  }, [doc]);

  useEffect(() => {
    manifestLoadGenerationRef.current += 1;
    setCurrentSlide(1);
    setScale(1.0);
    setSlides([]);
    setSlideCount(0);
    setManifestPending(false);
    setManifestError(null);
    setFallbackUrl(null);
    setCachedBlobUrl(null);
    setRestoredLocalBlobUrl(null);
    setLocalSourceStatus('idle');
    triedLocalRestoreKeysRef.current.clear();
    lastConversionSignatureRef.current = null;
    enqueueInFlightRef.current.clear();
  }, [doc.id]);

  useEffect(() => {
    if (!localBlobId) {
      setCachedBlobUrl(null);
      return;
    }
    setCachedBlobUrl(getCachedDocumentBlobUrl(localBlobId, { userId: currentUser?.uid }));
  }, [currentUser?.uid, localBlobId]);

  useEffect(() => {
    let cancelled = false;

    if (cachedBlobUrl || restoredLocalBlobUrl) {
      setLocalSourceStatus('ready');
      return;
    }

    if (localBlobId && !triedLocalRestoreKeysRef.current.has(localBlobId)) {
      triedLocalRestoreKeysRef.current.add(localBlobId);
      setLocalSourceStatus('loading');

      getDocumentBlob(localBlobId, { userId: currentUser?.uid })
        .then((blob) => {
          if (cancelled) return;
          if (!blob) {
            if (persistedBlobUrl) {
              setLocalSourceStatus('ready');
            } else {
              setLocalSourceStatus('failed');
            }
            return;
          }
          const blobUrl = URL.createObjectURL(blob);
          cacheDocumentBlobUrl(localBlobId, blobUrl, { userId: currentUser?.uid });
          setCachedBlobUrl(blobUrl);
          setRestoredLocalBlobUrl(blobUrl);
          setLocalSourceStatus('ready');
        })
        .catch((error) => {
          if (cancelled) return;
          console.error('[PowerPointPane] local source restore failed', {
            docId: docState.id,
            localFileId: localBlobId,
            error,
          });
          if (persistedBlobUrl) {
            setLocalSourceStatus('ready');
          } else {
            setLocalSourceStatus('failed');
          }
        });
      return () => {
        cancelled = true;
      };
    }

    if (persistedBlobUrl) {
      setLocalSourceStatus('ready');
      return;
    }

    setLocalSourceStatus(localBlobId ? 'failed' : 'idle');
    return () => {
      cancelled = true;
    };
  }, [cachedBlobUrl, currentUser?.uid, docState.id, localBlobId, persistedBlobUrl, restoredLocalBlobUrl]);

  const localBlobUrl = cachedBlobUrl ?? restoredLocalBlobUrl ?? persistedBlobUrl ?? null;
  const sourceUrlForOpen = remoteSourceUrl ?? localBlobUrl ?? null;

  useEffect(() => {
    if (!localBlobId || !localBlobUrl || !localBlobUrl.startsWith('blob:')) return;
    pinDocumentBlobUrl(localBlobId, { userId: currentUser?.uid });
    return () => {
      unpinDocumentBlobUrl(localBlobId, { userId: currentUser?.uid });
    };
  }, [currentUser?.uid, localBlobId, localBlobUrl]);

  useEffect(() => {
    if (!currentUser?.uid || !doc.id) return;
    const ref = firestoreDoc(firestoreDb, ...documentDocPathSegments(currentUser.uid, doc.id));
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as Partial<DocumentItem>;
      setDocState((prev) => ({
        ...prev,
        ...data,
        pptx: { ...prev.pptx, ...data.pptx },
      }));
    });
    return () => unsubscribe();
  }, [currentUser?.uid, doc.id]);

  useEffect(() => {
    if (!currentUser?.uid || !doc.id) return;
    const conversionRef = firestoreDoc(firestoreDb, ...pptxConversionDocPathSegments(currentUser.uid, doc.id));
    const unsubscribe = onSnapshot(
      conversionRef,
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data() as PptxConversionRecord;
        const status = normalizeConversionStatus(data.status);
        if (!status) return;

        const manifest = normalizeString(data.manifestPath);
        const fallbackPdfPath = normalizeString(data.fallbackPdfPath);
        const slideCountValue = typeof data.slideCount === 'number' ? data.slideCount : null;
        const requestedAtMs = getUpdatedAtMs(data.createdAt) ?? Date.now();
        const convertedAtMs = getUpdatedAtMs(data.convertedAt);
        const errorMessage = normalizeString(data.errorMessage) ?? 'conversion_failed';
        const signature = `${status}|${manifest ?? ''}|${fallbackPdfPath ?? ''}|${slideCountValue ?? ''}|${convertedAtMs ?? ''}|${errorMessage}`;
        if (lastConversionSignatureRef.current === signature) return;
        lastConversionSignatureRef.current = signature;

        logDiagnostics('conversion-status-updated', {
          docId: doc.id,
          status,
          manifestPath: manifest,
          slideCount: slideCountValue,
          errorMessage: status === 'failed' ? errorMessage : null,
        });

        if (status === 'ready') {
          if (!manifest) {
            if (isWithinPendingWindow(requestedAtMs, manifestPendingWindowMs)) {
              void applyLocalDocumentPatch({
                convertStatus: 'processing',
                pptxManifestStatus: 'processing',
                pptxLastError: null,
                pptxConvertRequestedAt: requestedAtMs,
                pptxRetryCount: 0,
                pptxNextRetryAt: null,
                pptxSourceSignature: sourceSignature,
                pptx: {
                  error: null,
                  retryCount: 0,
                  nextRetryAt: null,
                  sourceSignature,
                  updatedAt: new Date(),
                },
              });
              return;
            }
            void applyLocalDocumentPatch({
              convertStatus: 'failed',
              pptxManifestStatus: 'failed',
              pptxLastError: 'manifest_path_missing',
              pptx: {
                error: 'manifest_path_missing',
                updatedAt: new Date(),
              },
            });
            return;
          }

          void applyLocalDocumentPatch({
            convertStatus: 'ready',
            pptxManifestStatus: 'ready',
            pptxManifestPath: manifest,
            pptxSlideCount: slideCountValue,
            pptxLastError: null,
            pptxConvertedAt: convertedAtMs ?? Date.now(),
            pptxRetryCount: 0,
            pptxNextRetryAt: null,
            pptxSourceSignature: sourceSignature,
            pptx: {
              manifestPath: manifest,
              fallbackPdfPath,
              slideCount: slideCountValue,
              error: null,
              retryCount: 0,
              nextRetryAt: null,
              sourceSignature,
              updatedAt: new Date(convertedAtMs ?? Date.now()),
            },
          });
          return;
        }

        if (status === 'failed') {
          void applyLocalDocumentPatch({
            convertStatus: 'failed',
            pptxManifestStatus: 'failed',
            pptxLastError: errorMessage,
            pptxRetryCount: 0,
            pptxNextRetryAt: null,
            pptxSourceSignature: sourceSignature,
            pptx: {
              error: errorMessage,
              retryCount: 0,
              nextRetryAt: null,
              sourceSignature,
              updatedAt: new Date(),
            },
          });
          return;
        }

        void applyLocalDocumentPatch({
          convertStatus: 'processing',
          pptxManifestStatus: status,
          pptxLastError: null,
          pptxConvertRequestedAt: requestedAtMs,
          pptxRetryCount: 0,
          pptxNextRetryAt: null,
          pptxSourceSignature: sourceSignature,
          pptx: {
            error: null,
            retryCount: 0,
            nextRetryAt: null,
            sourceSignature,
            updatedAt: new Date(),
          },
        });
      },
      (error) => {
        console.error('[PowerPointPane] failed to subscribe conversion status', {
          docId: doc.id,
          error,
        });
      }
    );
    return () => unsubscribe();
  }, [applyLocalDocumentPatch, currentUser?.uid, doc.id, logDiagnostics, manifestPendingWindowMs, sourceSignature]);

  useEffect(() => {
    if (!currentUser?.uid || !docState.id || !docState.storagePath) return;
    if (!isOnline) return;
    if (docState.uploadStatus !== 'ready') return;
    if (manifestStatus === 'queued' || manifestStatus === 'processing' || manifestStatus === 'ready') return;
    if (manifestStatus === 'failed') {
      if (!isConversionRequestFailure(conversionError)) return;
      if (!isAutoRetryableConversionRequestFailure(conversionError)) return;
      if (isSameSourceAsLastRequested && retryCount >= MAX_AUTO_RETRY_ATTEMPTS) return;
      if (isSameSourceAsLastRequested && typeof nextRetryAtMs === 'number' && Date.now() < nextRetryAtMs) return;
    }

    void queueConversion('auto');
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

  useEffect(() => {
    let cancelled = false;
    if (!fallbackPath) {
      setFallbackUrl(null);
      return;
    }

    resolveStorageUrl(fallbackPath)
      .then((url) => {
        if (cancelled) return;
        setFallbackUrl(url);
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn('[PowerPointPane] failed to resolve fallback PDF path', {
          docId: docState.id,
          fallbackPath,
          error,
        });
        setFallbackUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [docState.id, fallbackPath]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const generation = manifestLoadGenerationRef.current + 1;
    manifestLoadGenerationRef.current = generation;
    const isStale = () =>
      cancelled || controller.signal.aborted || manifestLoadGenerationRef.current !== generation;

    if (manifestStatus !== 'ready') {
      setLoadingManifest(false);
      setManifestPending(false);
      setManifestError(null);
      setSlides([]);
      setSlideCount(0);
      return () => {
        cancelled = true;
        controller.abort();
      };
    }

    if (!manifestPath) {
      setLoadingManifest(false);
      setManifestPending(false);
      setSlides([]);
      setSlideCount(0);
      setManifestError('manifest が見つかりません。再変換を試してください。');
      return () => {
        cancelled = true;
        controller.abort();
      };
    }

    const loadManifest = async () => {
      setLoadingManifest(true);
      setManifestPending(false);
      setManifestError(null);
      let attempt = 0;
      try {
        while (!cancelled) {
          try {
            const url = await resolveStorageUrl(manifestPath);
            if (!url) throw new Error('manifest URL not found');
            const manifestUrl = appendCacheBust(url, manifestToken);
            const res = await fetch(manifestUrl, { signal: controller.signal });
            if (res.status === 404) {
              const err = new Error('manifest_not_found') as Error & { code?: string };
              err.code = 'manifest_not_found';
              throw err;
            }
            if (!res.ok) throw new Error(`manifest fetch failed: ${res.status}`);
            const json = (await res.json()) as PptxManifest;
            const slideList = (json.slides ?? [])
              .filter((slide) => Number.isFinite(slide.index))
              .map((slide) => ({
                index: slide.index,
                path: slide.path ?? null,
                url: slide.url ?? null,
                width: slide.width,
                height: slide.height,
              })) as SlideData[];
            slideList.sort((a, b) => a.index - b.index);

            if (isStale()) return;
            setManifestPending(false);
            setSlides(slideList);
            setSlideCount(json.slideCount ?? slideList.length ?? 0);
            return;
          } catch (error: unknown) {
            if (isStale()) return;

            const manifestNotFound = isStorageObjectNotFound(error);
            if (manifestNotFound && isWithinPendingWindow(requestedAtMs, manifestPendingWindowMs)) {
              const retryInMs = manifestRetryDelayMs(attempt);
              attempt += 1;
              setManifestPending(true);
              logDiagnostics('manifest-not-found-pending', {
                docId: docState.id,
                manifestPath,
                retryInMs,
                attempt,
              });
              try {
                await waitFor(retryInMs, controller.signal);
              } catch {
                return;
              }
              if (isStale()) return;
              continue;
            }

            const message = error instanceof Error ? error.message : 'manifest の読み込みに失敗しました';
            setManifestPending(false);
            setSlides([]);
            setSlideCount(0);
            setManifestError(
              isOnline
                ? manifestNotFound
                  ? '変換完了待機を超過しました。manifest が見つかりません。再試行してください。'
                  : message
                : 'オフラインのため manifest を取得できません'
            );
            console.error('[PowerPointPane] failed to load manifest', {
              docId: docState.id,
              manifestPath,
              error,
            });
            if (manifestNotFound) {
              void applyLocalDocumentPatch({
                convertStatus: 'failed',
                pptxManifestStatus: 'failed',
                pptxLastError: 'manifest_not_found',
                pptxRetryCount: 0,
                pptxNextRetryAt: null,
                pptxSourceSignature: sourceSignature,
                pptx: {
                  error: 'manifest_not_found',
                  retryCount: 0,
                  nextRetryAt: null,
                  sourceSignature,
                  updatedAt: new Date(),
                },
              });
            }
            return;
          }
        }
      } finally {
        if (!isStale()) {
          setLoadingManifest(false);
        }
      }
    };

    void loadManifest();

    return () => {
      manifestLoadGenerationRef.current = generation + 1;
      cancelled = true;
      controller.abort();
    };
  }, [
    applyLocalDocumentPatch,
    docState.id,
    isOnline,
    logDiagnostics,
    manifestPath,
    manifestPendingWindowMs,
    manifestStatus,
    manifestToken,
    requestedAtMs,
    sourceSignature,
  ]);

  useEffect(() => {
    const maxSlide = Math.max(slideCount, docSlideCount ?? 0);
    if (!maxSlide) return;
    if (currentSlide > maxSlide) setCurrentSlide(maxSlide);
  }, [currentSlide, docSlideCount, slideCount]);

  const effectiveSlideCount = Math.max(slideCount, docSlideCount ?? 0);
  const viewerReady = !loadingManifest && slides.length > 0 && manifestStatus === 'ready' && !manifestError && !manifestPending;
  const offlineWithoutReadyManifest = !isOnline && (manifestStatus !== 'ready' || manifestPending);
  const canOpenSource = !!(sourceUrlForOpen || fallbackUrl);
  const hasReachedAutoRetryLimit =
    manifestStatus === 'failed' &&
    isConversionRequestFailure(conversionError) &&
    isAutoRetryableConversionRequestFailure(conversionError) &&
    isSameSourceAsLastRequested &&
    retryCount >= MAX_AUTO_RETRY_ATTEMPTS;
  const hasScheduledAutoRetry =
    manifestStatus === 'failed' &&
    isConversionRequestFailure(conversionError) &&
    isAutoRetryableConversionRequestFailure(conversionError) &&
    isSameSourceAsLastRequested &&
    typeof nextRetryAtMs === 'number' &&
    nextRetryAtMs > Date.now();
  const nextRetryLabel = hasScheduledAutoRetry && typeof nextRetryAtMs === 'number'
    ? new Date(nextRetryAtMs).toLocaleTimeString()
    : null;

  const handlePrev = () => {
    const next = Math.max(1, currentSlide - 1);
    viewerRef.current?.scrollToSlide(next);
  };

  const handleNext = () => {
    const max = Math.max(1, effectiveSlideCount || currentSlide);
    const next = Math.min(max, currentSlide + 1);
    viewerRef.current?.scrollToSlide(next);
  };

  const handleOpenSource = () => {
    const url = sourceUrlForOpen ?? fallbackUrl;
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleRetryConversion = () => {
    if (!isOnline) return;
    setManifestError(null);
    void queueConversion('manual');
  };

  const renderStatePanel = () => {
    if (offlineWithoutReadyManifest) {
      return (
        <div className="p-4 text-sm text-slate-600 space-y-3">
          <div className="flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-slate-500" />
            オフラインのため変換を開始できません。オンライン復帰後に再試行されます。
          </div>
          {canOpenSource && (
            <Button variant="outline" size="sm" onClick={handleOpenSource}>
              原本を開く
            </Button>
          )}
        </div>
      );
    }

    if (manifestPending || manifestStatus === 'queued' || manifestStatus === 'processing') {
      return (
        <div className="p-4 text-sm text-slate-600 space-y-3">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
            {manifestPending ? '変換結果の生成を待機しています...' : 'PowerPoint を変換中です...'}
          </div>
          {canOpenSource && (
            <Button variant="outline" size="sm" onClick={handleOpenSource}>
              原本を開く
            </Button>
          )}
        </div>
      );
    }

    if (manifestStatus === 'failed') {
      return (
        <div className="p-4 text-sm text-rose-600 space-y-3">
          <div className="flex items-center gap-2">
            <FileWarning className="w-4 h-4" />
            変換に失敗しました。{conversionError ? `(${conversionErrorLabel})` : ''}
          </div>
          {hasScheduledAutoRetry && nextRetryLabel && (
            <div className="text-xs text-slate-600">
              自動再試行予定: {nextRetryLabel}
            </div>
          )}
          {hasReachedAutoRetryLimit && (
            <div className="text-xs text-slate-600">
              自動再試行の上限に達しました。再試行ボタンで再開できます。
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRetryConversion} disabled={!isOnline}>
              <RefreshCw className="w-4 h-4 mr-1" />
              再試行
            </Button>
            {canOpenSource && (
              <Button variant="outline" size="sm" onClick={handleOpenSource}>
                原本を開く
              </Button>
            )}
          </div>
        </div>
      );
    }

    if (docState.uploadStatus !== 'ready') {
      return (
        <div className="p-4 text-sm text-slate-600">
          原本のアップロード完了後に変換を開始します。
        </div>
      );
    }

    if (manifestError) {
      return (
        <div className="p-4 text-sm text-rose-600 space-y-3">
          <div className="flex items-center gap-2">
            <FileWarning className="w-4 h-4" />
            {manifestError}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRetryConversion} disabled={!isOnline}>
              <RefreshCw className="w-4 h-4 mr-1" />
              再試行
            </Button>
            {canOpenSource && (
              <Button variant="outline" size="sm" onClick={handleOpenSource}>
                原本を開く
              </Button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 text-sm text-slate-500">
        変換準備中です...
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col h-full min-w-0', className)}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 bg-white">
        <div className="min-w-0">
          <div className="text-xs text-slate-400">PowerPoint</div>
          <div className="text-sm font-semibold text-slate-700 truncate">{displayName}</div>
          {!isOnline && manifestStatus !== 'ready' && (
            <div className="text-[11px] text-amber-600">オフライン中: 変換キューは保留されます。</div>
          )}
          {docState.uploadStatus === 'failed' && (
            <div className="text-[11px] text-rose-600">原本アップロードに失敗しています。</div>
          )}
          {!remoteSourceUrl && localSourceStatus === 'failed' && (
            <div className="text-[11px] text-rose-600">ローカル原本が見つかりません。再アップロードしてください。</div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={!viewerReady || currentSlide <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-xs text-slate-600 min-w-[72px] text-center">
            {effectiveSlideCount > 0 ? `${currentSlide} / ${effectiveSlideCount}` : '0 / 0'}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={!viewerReady || effectiveSlideCount === 0 || currentSlide >= effectiveSlideCount}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-slate-200 mx-2" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale((s) => clamp(parseFloat((s - 0.1).toFixed(2)), 0.5, 3.0))}
            disabled={!viewerReady || scale <= 0.5}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <div className="text-xs text-slate-600 min-w-[48px] text-center">{Math.round(scale * 100)}%</div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale((s) => clamp(parseFloat((s + 0.1).toFixed(2)), 0.5, 3.0))}
            disabled={!viewerReady || scale >= 3.0}
          >
            <Plus className="w-4 h-4" />
          </Button>

          {canOpenSource && (
            <Button variant="ghost" size="sm" onClick={handleOpenSource} className="ml-1">
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 w-full bg-slate-50">
        {loadingManifest && manifestStatus === 'ready' && (
          <div className="text-sm text-slate-500 p-4">
            {manifestPending ? '変換結果の manifest 生成を待機中...' : 'スライド情報を読み込み中...'}
          </div>
        )}

        {viewerReady && (
          <PowerPointViewer
            ref={viewerRef}
            slides={slides}
            scale={scale}
            onSlideChange={setCurrentSlide}
            className="h-full w-full"
          />
        )}

        {!viewerReady && !loadingManifest && renderStatePanel()}
      </div>
    </div>
  );
}
