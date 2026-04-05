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
 * - blob URL がロードエラー → failedBlobUrl に記録 → キャッシュ無効化 → local restore を再試行
 * - local restore が一時失敗/空振り → 複数回リトライ
 * - local blob も最終的に失敗 → localDataStatus: "failed"
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

const LOCAL_RESTORE_MAX_ATTEMPTS = 3;
const LOCAL_RESTORE_RETRY_DELAY_MS = 250;

const getUpdatedAtKey = (value: unknown): string => {
  if (value == null) return "";
  if (value instanceof Date) return String(value.getTime());
  if (typeof value === "number" || typeof value === "string") {
    return String(value);
  }
  const maybeDate = (value as { toDate?: () => Date } | null)?.toDate?.();
  if (maybeDate instanceof Date) return String(maybeDate.getTime());
  return "";
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

export const usePdfSourceResolver = (
  doc: PdfSourceDoc,
  userId: string | undefined,
): UsePdfSourceResolverResult => {
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
  const localRestoreAttemptCountsRef = useRef<Map<string, number>>(new Map());

  const remoteUrl = useMemo(() => {
    const candidate = doc.remoteUrl ?? doc.downloadUrl ?? null;
    if (typeof candidate === "string" && candidate.startsWith("blob:")) {
      return null;
    }
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

  const localRestoreAttemptKey = useMemo(() => {
    if (!localBlobId) return null;
    const scope = userId?.trim() || "__anonymous__";
    return `${scope}:${localBlobId}`;
  }, [localBlobId, userId]);

  const resetLocalRestoreAttempt = useCallback(() => {
    if (!localRestoreAttemptKey) return;
    localRestoreAttemptCountsRef.current.delete(localRestoreAttemptKey);
  }, [localRestoreAttemptKey]);

  const resetRemoteSourceAttempt = useCallback(() => {
    if (!remoteSourceKey) return;
    triedRemoteSourceKeysRef.current.delete(remoteSourceKey);
    setFailedRemoteSourceKey((prev) =>
      prev === remoteSourceKey ? null : prev,
    );
  }, [remoteSourceKey]);

  const effectiveRemoteUrl = useMemo(() => {
    if (!remoteUrl) return null;
    if (failedRemoteSourceKey && remoteSourceKey === failedRemoteSourceKey) {
      return null;
    }
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

  useEffect(() => {
    queueMicrotask(() => setRestoredBlobUrl(null));
    queueMicrotask(() => setCachedBlobUrl(null));
    queueMicrotask(() => setLocalDataStatus("idle"));
    queueMicrotask(() => setFailedRemoteSourceKey(null));
    queueMicrotask(() => setFailedBlobUrl(null));
    triedRemoteSourceKeysRef.current.clear();
    triedBlobUrlsRef.current.clear();
    localRestoreAttemptCountsRef.current.clear();
  }, [doc.id, userId]);

  useEffect(() => {
    queueMicrotask(() => setFailedRemoteSourceKey(null));
    if (remoteSourceKey) {
      triedRemoteSourceKeysRef.current.delete(remoteSourceKey);
    }
  }, [remoteSourceKey]);

  useEffect(() => {
    if (!failedRemoteSourceKey) return;

    const handleOnline = () => {
      resetRemoteSourceAttempt();
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [failedRemoteSourceKey, resetRemoteSourceAttempt]);

  useEffect(() => {
    if (!localBlobId) {
      queueMicrotask(() => setCachedBlobUrl(null));
      return;
    }
    const nextCached = getCachedDocumentBlobUrl(localBlobId, { userId });
    queueMicrotask(() => setCachedBlobUrl(nextCached));
  }, [userId, localBlobId]);

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

    if (!localBlobId || !localRestoreAttemptKey) {
      queueMicrotask(() => setLocalDataStatus("failed"));
      return;
    }

    const runLocalRestore = async () => {
      while (!cancelled) {
        const attemptCount =
          localRestoreAttemptCountsRef.current.get(localRestoreAttemptKey) ?? 0;

        if (attemptCount >= LOCAL_RESTORE_MAX_ATTEMPTS) {
          setLocalDataStatus("failed");
          return;
        }

        localRestoreAttemptCountsRef.current.set(
          localRestoreAttemptKey,
          attemptCount + 1,
        );
        setLocalDataStatus("loading");

        try {
          const blob = await getDocumentBlob(localBlobId, { userId });
          if (cancelled) return;

          if (blob) {
            const nextBlobUrl = URL.createObjectURL(blob);
            if (cancelled) {
              URL.revokeObjectURL(nextBlobUrl);
              return;
            }

            setFailedBlobUrl((prev) => (prev === nextBlobUrl ? null : prev));
            cacheDocumentBlobUrl(localBlobId, nextBlobUrl, { userId });
            setCachedBlobUrl(nextBlobUrl);
            setRestoredBlobUrl(nextBlobUrl);
            setLocalDataStatus("ready");
            return;
          }
        } catch (error: unknown) {
          if (cancelled) return;
          console.error("[usePdfSourceResolver] local blob restore failed", {
            error,
            docId: doc.id,
            localFileId: localBlobId,
            hasRemoteUrl: !!doc.remoteUrl,
            attempt: attemptCount + 1,
          });
        }

        const nextAttemptCount =
          localRestoreAttemptCountsRef.current.get(localRestoreAttemptKey) ?? 0;

        if (nextAttemptCount >= LOCAL_RESTORE_MAX_ATTEMPTS) {
          setRestoredBlobUrl(null);
          setLocalDataStatus("failed");
          return;
        }

        await wait(LOCAL_RESTORE_RETRY_DELAY_MS);
      }
    };

    void runLocalRestore();

    return () => {
      cancelled = true;
    };
  }, [
    userId,
    doc.id,
    doc.remoteUrl,
    localBlobId,
    localRestoreAttemptKey,
    usableCachedBlobUrl,
    effectiveRemoteUrl,
    usablePersistedBlobUrl,
    usableRestoredBlobUrl,
  ]);

  const localBlobUrl =
    usableCachedBlobUrl ?? usableRestoredBlobUrl ?? usablePersistedBlobUrl;

  useEffect(() => {
    if (!localBlobId || !localBlobUrl || !localBlobUrl.startsWith("blob:")) {
      return;
    }
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
        resetLocalRestoreAttempt();
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
        resetLocalRestoreAttempt();
        setLocalDataStatus("idle");
      }
    },
    [
      userId,
      doc.id,
      localBlobId,
      remoteSourceKey,
      remoteUrl,
      resetLocalRestoreAttempt,
    ],
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