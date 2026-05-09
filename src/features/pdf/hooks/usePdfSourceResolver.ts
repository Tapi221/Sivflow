/**
 * PDF ソースの解決を担当するフック。
 *
 * 方針:
 * - remote URL が使えるときは remote URL を優先
 * - remote URL が使えないときは IndexedDB から Blob を復元し、
 *   Uint8Array に変換して PdfViewer へ直接渡す
 * - 通常表示経路では blob: URL を使わない
 *
 * === フォールバック挙動 ===
 * - remote URL がロードエラー → failedRemoteSourceKey に記録 → local bytes に降格
 * - local bytes の復元が一時失敗/空振り → 複数回リトライ
 * - local bytes も最終的に失敗 → localDataStatus: "failed"
 */
import { getDocumentBlob } from "@/services/documentFileStore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface PdfSourceDoc {
  id: string;
  remoteUrl?: string | null;
  blobUrl?: string | null;
  localUrl?: string | null;
  localFileId?: string | null;
  downloadUrl?: string | null;
}

type SourceLoadErrorDetails = {
  kind: "remote-url" | "blob-url" | "data" | "unknown";
  url: string | null;
  message: string;
};

interface UsePdfSourceResolverResult {
  source: {
    url: string | null;
    data: Uint8Array | null;
  };
  sourceMeta: {
    remoteUrl: string | null;
    blobUrl: string | null;
    localFileId: string | null;
    url: string | null;
  };
  sourceUnavailable: boolean;
  isLocalOnly: boolean;
  localDataStatus: "idle" | "loading" | "ready" | "failed";
  effectiveRemoteUrl: string | null;
  localSourceBytes: Uint8Array | null;
  handleSourceLoadError: (details: SourceLoadErrorDetails) => void;
}

const LOCAL_RESTORE_MAX_ATTEMPTS = 3;
const LOCAL_RESTORE_RETRY_DELAY_MS = 250;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

export const usePdfSourceResolver = (
  doc: PdfSourceDoc,
  userId: string | undefined,
): UsePdfSourceResolverResult => {
  const [localSourceBytes, setLocalSourceBytes] = useState<Uint8Array | null>(
    null,
  );
  const [localDataStatus, setLocalDataStatus] = useState<
    "idle" | "loading" | "ready" | "failed"
  >("idle");
  const [failedRemoteSourceKey, setFailedRemoteSourceKey] = useState<
    string | null
  >(null);

  const triedRemoteSourceKeysRef = useRef<Set<string>>(new Set());
  const localRestoreAttemptCountsRef = useRef<Map<string, number>>(new Map());

  const remoteUrl = useMemo(() => {
    const candidate = doc.remoteUrl ?? doc.downloadUrl ?? null;
    if (typeof candidate === "string" && candidate.startsWith("blob:")) {
      return null;
    }
    return candidate;
  }, [doc.remoteUrl, doc.downloadUrl]);

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

  /**
   * PDF の表示ソース identity は「実際のソース」にのみ依存させる。
   * viewerState の保存で updatedAt が動いても、表示ソースは変わっていないため
   * 再初期化してはいけない。
   */
  const docIdentityKey = useMemo(() => {
    return [
      doc.id,
      userId?.trim() || "__anonymous__",
      localBlobId ?? "__no_local_blob__",
      remoteUrl ?? "__no_remote__",
    ].join("|");
  }, [doc.id, userId, localBlobId, remoteUrl]);

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

  useEffect(() => {
    queueMicrotask(() => setLocalSourceBytes(null));
    queueMicrotask(() => setLocalDataStatus("idle"));
    queueMicrotask(() => setFailedRemoteSourceKey(null));
    triedRemoteSourceKeysRef.current.clear();
    localRestoreAttemptCountsRef.current.clear();
  }, [docIdentityKey]);

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
    let cancelled = false;

    if (effectiveRemoteUrl) {
      queueMicrotask(() => setLocalDataStatus("idle"));
      return;
    }

    if (localSourceBytes) {
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
          setLocalSourceBytes(null);
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
            const buffer = await blob.arrayBuffer();
            if (cancelled) return;

            const nextBytes = new Uint8Array(buffer);
            setLocalSourceBytes(nextBytes);
            setLocalDataStatus("ready");
            return;
          }
        } catch (error: unknown) {
          if (cancelled) return;
          console.error("[usePdfSourceResolver] local bytes restore failed", {
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
          setLocalSourceBytes(null);
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
    effectiveRemoteUrl,
    localSourceBytes,
  ]);

  const source = useMemo(() => {
    if (effectiveRemoteUrl) {
      return { url: effectiveRemoteUrl, data: null };
    }
    if (localSourceBytes) {
      return { url: null, data: localSourceBytes };
    }
    return { url: null, data: null };
  }, [effectiveRemoteUrl, localSourceBytes]);

  const sourceMeta = useMemo(
    () => ({
      remoteUrl: remoteUrl ?? null,
      blobUrl: null,
      localFileId: localBlobId,
      url: source.url ?? null,
    }),
    [localBlobId, remoteUrl, source.url],
  );

  const sourceUnavailable = !source.url && !source.data;
  const isLocalOnly = !effectiveRemoteUrl && !!localSourceBytes;

  const handleSourceLoadError = useCallback(
    (details: SourceLoadErrorDetails) => {
      if (details.kind === "remote-url" && remoteSourceKey) {
        if (triedRemoteSourceKeysRef.current.has(remoteSourceKey)) return;
        triedRemoteSourceKeysRef.current.add(remoteSourceKey);

        console.warn(
          "[usePdfSourceResolver] Remote source failed, fallback to local bytes",
          {
            docId: doc.id,
            remoteUrl,
            remoteSourceKey,
            localFileId: localBlobId,
            message: details.message,
          },
        );

        resetLocalRestoreAttempt();
        setLocalSourceBytes(null);
        setFailedRemoteSourceKey(remoteSourceKey);
        setLocalDataStatus("idle");
        return;
      }

      if (details.kind === "data") {
        console.error(
          "[usePdfSourceResolver] Local PDF bytes failed to load or parse",
          {
            docId: doc.id,
            localFileId: localBlobId,
            message: details.message,
          },
        );
        setLocalSourceBytes(null);
        setLocalDataStatus("failed");
        return;
      }

      if (details.kind === "blob-url") {
        console.warn(
          "[usePdfSourceResolver] Unexpected blob-url error in bytes-based PDF path",
          {
            docId: doc.id,
            localFileId: localBlobId,
            url: details.url,
            message: details.message,
          },
        );
      }
    },
    [doc.id, localBlobId, remoteSourceKey, remoteUrl, resetLocalRestoreAttempt],
  );

  return {
    source,
    sourceMeta,
    sourceUnavailable,
    isLocalOnly,
    localDataStatus,
    effectiveRemoteUrl,
    localSourceBytes,
    handleSourceLoadError,
  };
};
