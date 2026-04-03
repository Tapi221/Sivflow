import { useEffect, useMemo, useRef, useState } from "react";
import {
  cacheDocumentBlobUrl,
  getCachedDocumentBlobUrl,
  pinDocumentBlobUrl,
  unpinDocumentBlobUrl,
} from "@/services/documentBlobUrlSessionCache";
import { getDocumentBlob } from "@/services/documentFileStore";

export type LocalSourceStatus = "idle" | "loading" | "ready" | "failed";

interface Options {
  userId: string | undefined;
  localBlobId: string | null;
  /** blob: URL persisted in the document record */
  persistedBlobUrl: string | null;
}

interface LocalDocumentSource {
  localBlobUrl: string | null;
  localSourceStatus: LocalSourceStatus;
}

interface RestoredState {
  key: string | null;
  url: string | null;
}

interface RestoreAttemptState {
  key: string | null;
  attempted: boolean;
}

export function usePptxDocumentSync({
  userId,
  localBlobId,
  persistedBlobUrl,
}: Options): LocalDocumentSource {
  const [restoredState, setRestoredState] = useState<RestoredState>({
    key: null,
    url: null,
  });
  const [restoreAttemptState, setRestoreAttemptState] =
    useState<RestoreAttemptState>({
      key: null,
      attempted: false,
    });

  const triedKeysRef = useRef<Set<string>>(new Set());

  const cachedBlobUrl = useMemo(() => {
    if (!localBlobId) return null;
    return getCachedDocumentBlobUrl(localBlobId, { userId }) ?? null;
  }, [userId, localBlobId]);

  const restoredLocalBlobUrl =
    restoredState.key === localBlobId ? restoredState.url : null;

  const restoreAttempted =
    restoreAttemptState.key === localBlobId
      ? restoreAttemptState.attempted
      : false;

  useEffect(() => {
    let cancelled = false;

    if (!localBlobId) {
      return () => {
        cancelled = true;
      };
    }

    if (cachedBlobUrl || restoredLocalBlobUrl) {
      return () => {
        cancelled = true;
      };
    }

    if (triedKeysRef.current.has(localBlobId)) {
      return () => {
        cancelled = true;
      };
    }

    triedKeysRef.current.add(localBlobId);

    getDocumentBlob(localBlobId, { userId })
      .then((blob) => {
        if (cancelled) return;

        setRestoreAttemptState({
          key: localBlobId,
          attempted: true,
        });

        if (!blob) {
          return;
        }

        const blobUrl = URL.createObjectURL(blob);
        cacheDocumentBlobUrl(localBlobId, blobUrl, { userId });

        setRestoredState({
          key: localBlobId,
          url: blobUrl,
        });
      })
      .catch((error) => {
        if (cancelled) return;

        console.error("[usePptxDocumentSync] local restore failed", {
          localBlobId,
          error,
        });

        setRestoreAttemptState({
          key: localBlobId,
          attempted: true,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [cachedBlobUrl, userId, localBlobId, restoredLocalBlobUrl]);

  const localBlobUrl =
    cachedBlobUrl ?? restoredLocalBlobUrl ?? persistedBlobUrl ?? null;

  const localSourceStatus = useMemo<LocalSourceStatus>(() => {
    if (!localBlobId) return "idle";
    if (localBlobUrl) return "ready";
    if (!restoreAttempted) return "loading";
    return persistedBlobUrl ? "ready" : "failed";
  }, [localBlobId, localBlobUrl, persistedBlobUrl, restoreAttempted]);

  useEffect(() => {
    if (!localBlobId || !localBlobUrl || !localBlobUrl.startsWith("blob:")) {
      return;
    }

    pinDocumentBlobUrl(localBlobId, { userId });

    return () => {
      unpinDocumentBlobUrl(localBlobId, { userId });
    };
  }, [userId, localBlobId, localBlobUrl]);

  return {
    localBlobUrl,
    localSourceStatus,
  };
}
