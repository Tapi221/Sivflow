/**
 * PDF ソースの解決を担当するフック。
 *
 * 以下の優先順位で有効なソースを決定する:
 *   1. effectiveRemoteUrl（remoteUrl が失敗していない場合）
 *   2. cachedBlobUrl（sessionStorage キャッシュ）
 *   3. restoredBlobUrl（IndexedDB から restore した blob）
 *   4. persistedBlobUrl（doc.blobUrl / doc.localUrl）
 *
 * === フォールバック挙動 ===
 * - remote URL がロードエラー → failedRemoteSourceKey に記録 → local に降格
 * - blob URL がロードエラー → failedBlobUrl に記録 → キャッシュ無効化 → idle に戻す
 * - local blob も失敗 → localDataStatus: "failed"
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  cacheDocumentBlobUrl,
  getCachedDocumentBlobUrl,
  invalidateDocumentBlobUrl,
  pinDocumentBlobUrl,
  unpinDocumentBlobUrl,
} from "@/services/documentBlobUrlSessionCache";
import { getDocumentBlob } from "@/services/documentFileStore";

interface PdfSourceDoc {
  id: string;
  remoteUrl?: string | null;
  blobUrl?: string | null;
  localUrl?: string | null;
  localFileId?: string | null;
  downloadUrl?: string | null;
  updatedAt?: unknown;
}

type SourceLoadErrorDetails = {
  kind: "remote-url" | "blob-url" | "data" | "unknown";
  url: string | null;
  message: string;
};

interface UsePdfSourceResolverResult {
  source: { url: string | null; data: null };
  sourceMeta: {
    remoteUrl: string | null;
    blobUrl: string | null;
    localFileId: string | null;
    url: string | null;
    updatedAt: string;
  };
  sourceUnavailable: boolean;
  isLocalOnly: boolean;
  localDataStatus: "idle" | "loading" | "ready" | "failed";
  effectiveRemoteUrl: string | null;
  localBlobUrl: string | null;
  handleSourceLoadError: (details: SourceLoadErrorDetails) => void;
}

const getUpdatedAtKey = (value: unknown): string => {
  if (value == null) return "";
  if (value instanceof Date) return String(value.getTime());
  if (typeof value === "number" || typeof value === "string")
    return String(value);
  const maybeDate = (value as { toDate?: () => Date } | null)?.toDate?.();
  if (maybeDate instanceof Date) return String(maybeDate.getTime());
  return "";
};

export const usePdfSourceResolver = (
  doc: PdfSourceDoc,
  userId: string | undefined,
) => {
  const [restoredBlobUrl, setRestoredBlobUrl] = useState<string | null>(null);
  const [cachedBlobUrl, setCachedBlobUrl] = useState<string | null>(null);
  const [localDataStatus, setLocalDataStatus] = useState<
    "idle" | "loading" | "ready" | "failed"
  >("idle");
  const [failedRemoteSourceKey, setFailedRemoteSourceKey] = useState<
    string | null
  >(null);
  const [failedBlobUrl, setFailedBlobUrl] = useState<string | null>(null);

  const triedRemoteSourceKeysRef = useRef<Set<string>>(new Set());
  const triedBlobUrlsRef = useRef<Set<string>>(new Set());
  const triedLocalRestoreKeysRef = useRef<Set<string>>(new Set());

  const remoteUrl = useMemo(() => {
    const candidate = doc.remoteUrl ?? doc.downloadUrl ?? null;
    if (typeof candidate === "string" && candidate.startsWith("blob:"))
      return null;
    return candidate;
  }, [doc.remoteUrl, doc.downloadUrl]);

  const persistedBlobUrl = useMemo(() => {
    const candidate = doc.blobUrl ?? doc.localUrl ?? null;
    if (typeof candidate !== "string") return null;
    const trimmed = candidate.trim();
    return trimmed.startsWith("blob:") ? trimmed : null;
  }, [doc.blobUrl, doc.localUrl]);

  const remoteSourceKey = useMemo(
    () => (remoteUrl ? remoteUrl : null),
    [remoteUrl],
  );

  const localBlobId = useMemo(
    () => doc.localFileId ?? doc.id ?? null,
    [doc.id, doc.localFileId],
  );

  const effectiveRemoteUrl = useMemo(() => {
    if (!remoteUrl) return null;
    if (failedRemoteSourceKey && remoteSourceKey === failedRemoteSourceKey)
      return null;
    return remoteUrl;
  }, [failedRemoteSourceKey, remoteSourceKey, remoteUrl]);

  const usablePersistedBlobUrl = useMemo(() => {
    if (!persistedBlobUrl) return null;
    if (failedBlobUrl && failedBlobUrl === persistedBlobUrl) return null;
    return persistedBlobUrl;
  }, [failedBlobUrl, persistedBlobUrl]);

  const usableRestoredBlobUrl = useMemo(() => {
    if (!restoredBlobUrl) return null;
    if (failedBlobUrl && failedBlobUrl === restoredBlobUrl) return null;
    return restoredBlobUrl;
  }, [failedBlobUrl, restoredBlobUrl]);

  const usableCachedBlobUrl = useMemo(() => {
    if (!cachedBlobUrl) return null;
    if (failedBlobUrl && failedBlobUrl === cachedBlobUrl) return null;
    return cachedBlobUrl;
  }, [cachedBlobUrl, failedBlobUrl]);

  // ✅ doc.id 切替時のリセット
  useEffect(() => {
    queueMicrotask(() => setRestoredBlobUrl(null));
    queueMicrotask(() => setCachedBlobUrl(null));
    queueMicrotask(() => setLocalDataStatus("idle"));
    queueMicrotask(() => setFailedRemoteSourceKey(null));
    queueMicrotask(() => setFailedBlobUrl(null));
    triedRemoteSourceKeysRef.current.clear();
    triedBlobUrlsRef.current.clear();
    triedLocalRestoreKeysRef.current.clear();
  }, [doc.id]);

  useEffect(() => {
    queueMicrotask(() => setFailedRemoteSourceKey(null));
  }, [remoteSourceKey]);

  useEffect(() => {
    if (!localBlobId) {
      queueMicrotask(() => setCachedBlobUrl(null));
      return;
    }
    const nextCached = getCachedDocumentBlobUrl(localBlobId, { userId });
    queueMicrotask(() => setCachedBlobUrl(nextCached));
  }, [userId, localBlobId]);

  // local blob restore
  useEffect(() => {
    let cancelled = false;

    if (effectiveRemoteUrl) {
      queueMicrotask(() => setLocalDataStatus("idle"));
      return;
    }

    if (
      usableCachedBlobUrl ||
      usableRestoredBlobUrl ||
      usablePersistedBlobUrl
    ) {
      queueMicrotask(() => setLocalDataStatus("ready"));
      return;
    }

    if (!localBlobId) {
      queueMicrotask(() => setLocalDataStatus("failed"));
      return;
    }

    if (triedLocalRestoreKeysRef.current.has(localBlobId)) {
      queueMicrotask(() => setLocalDataStatus("failed"));
      return;
    }
    triedLocalRestoreKeysRef.current.add(localBlobId);
    queueMicrotask(() => setLocalDataStatus("loading"));
    getDocumentBlob(localBlobId, { userId })
      .then(async (blob) => {
        if (cancelled) return;
        if (!blob) {
          setRestoredBlobUrl(null);
          setLocalDataStatus("failed");
          return;
        }

        const nextBlobUrl = URL.createObjectURL(blob);
        if (cancelled) return;
        setFailedBlobUrl((prev) => (prev === nextBlobUrl ? null : prev));
        cacheDocumentBlobUrl(localBlobId, nextBlobUrl, { userId });
        setCachedBlobUrl(nextBlobUrl);
        setRestoredBlobUrl(nextBlobUrl);
        setLocalDataStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[usePdfSourceResolver] local blob restore failed", {
          error: err,
          docId: doc.id,
          localFileId: localBlobId,
          hasRemoteUrl: !!doc.remoteUrl,
        });
        setRestoredBlobUrl(null);
        setLocalDataStatus("failed");
      });

    return () => {
      cancelled = true;
    };
  }, [
    userId,
    doc.id,
    doc.remoteUrl,
    localBlobId,
    usableCachedBlobUrl,
    effectiveRemoteUrl,
    usablePersistedBlobUrl,
    usableRestoredBlobUrl,
  ]);

  // blob URL のピン管理（GC 防止）
  const localBlobUrl =
    usableCachedBlobUrl ?? usableRestoredBlobUrl ?? usablePersistedBlobUrl;

  useEffect(() => {
    if (!localBlobId || !localBlobUrl || !localBlobUrl.startsWith("blob:"))
      return;
    pinDocumentBlobUrl(localBlobId, { userId });
    return () => {
      unpinDocumentBlobUrl(localBlobId, { userId });
    };
  }, [userId, localBlobId, localBlobUrl]);

  const source = useMemo(() => {
    if (effectiveRemoteUrl) return { url: effectiveRemoteUrl, data: null };
    if (localBlobUrl) return { url: localBlobUrl, data: null };
    return { url: null, data: null };
  }, [effectiveRemoteUrl, localBlobUrl]);

  const sourceMeta = useMemo(
    () => ({
      remoteUrl: remoteUrl ?? null,
      blobUrl: localBlobUrl ?? null,
      localFileId: localBlobId,
      url: source.url ?? null,
      updatedAt: getUpdatedAtKey(doc.updatedAt),
    }),
    [doc.updatedAt, localBlobId, localBlobUrl, remoteUrl, source.url],
  );

  const sourceUnavailable = !source.url;
  const isLocalOnly = !effectiveRemoteUrl && !!localBlobUrl;

  const handleSourceLoadError = useCallback(
    (details: SourceLoadErrorDetails) => {
      if (details.kind === "remote-url" && remoteSourceKey) {
        if (triedRemoteSourceKeysRef.current.has(remoteSourceKey)) return;
        triedRemoteSourceKeysRef.current.add(remoteSourceKey);
        console.warn(
          "[usePdfSourceResolver] Remote source failed, fallback to local source",
          {
            docId: doc.id,
            remoteUrl,
            remoteSourceKey,
            localFileId: localBlobId,
            message: details.message,
          },
        );
        setFailedRemoteSourceKey(remoteSourceKey);
        setLocalDataStatus("idle");
        return;
      }

      if (details.kind === "blob-url" && details.url) {
        if (triedBlobUrlsRef.current.has(details.url)) return;
        triedBlobUrlsRef.current.add(details.url);
        console.warn(
          "[usePdfSourceResolver] blob source failed, retrying from localFileId restore",
          {
            docId: doc.id,
            blobUrl: details.url,
            localFileId: localBlobId,
            message: details.message,
          },
        );
        setFailedBlobUrl(details.url);
        invalidateDocumentBlobUrl(localBlobId, details.url, { userId });
        setCachedBlobUrl((prev) => (prev === details.url ? null : prev));
        setRestoredBlobUrl((prev) => (prev === details.url ? null : prev));
        setLocalDataStatus("idle");
      }
    },
    [userId, doc.id, localBlobId, remoteSourceKey, remoteUrl],
  );

  return {
    source,
    sourceMeta,
    sourceUnavailable,
    isLocalOnly,
    localDataStatus,
    effectiveRemoteUrl,
    localBlobUrl,
    handleSourceLoadError,
  };
};
