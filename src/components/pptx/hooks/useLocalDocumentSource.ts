/**
 * Manages local blob URL restoration from IndexedDB / session cache.
 * Handles: cache lookup → IndexedDB restore → URL.createObjectURL → pin/unpin.
 */

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

export function useLocalDocumentSource({
  userId,
  localBlobId,
  persistedBlobUrl,
}: Options): LocalDocumentSource {
  const [restoredLocalBlobUrl, setRestoredLocalBlobUrl] = useState<
    string | null
  >(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const triedKeysRef = useRef<Set<string>>(new Set());

  const cachedBlobUrl = useMemo(() => {
    if (!localBlobId) return null;
    return getCachedDocumentBlobUrl(localBlobId, { userId }) ?? null;
  }, [userId, localBlobId]);

  // Reset when localBlobId changes (doc switched)
  useEffect(() => {
    triedKeysRef.current.clear();

    const rafId = requestAnimationFrame(() => {
      setRestoredLocalBlobUrl(null);
      setIsRestoring(false);
    });

    return () => cancelAnimationFrame(rafId);
  }, [localBlobId]);

  // IndexedDB restore
  useEffect(() => {
    let cancelled = false;

    if (!localBlobId) {
      const rafId = requestAnimationFrame(() => {
        setIsRestoring(false);
      });

      return () => {
        cancelled = true;
        cancelAnimationFrame(rafId);
      };
    }

    if (cachedBlobUrl || restoredLocalBlobUrl) {
      const rafId = requestAnimationFrame(() => {
        setIsRestoring(false);
      });

      return () => {
        cancelled = true;
        cancelAnimationFrame(rafId);
      };
    }

    if (triedKeysRef.current.has(localBlobId)) {
      const rafId = requestAnimationFrame(() => {
        setIsRestoring(false);
      });

      return () => {
        cancelled = true;
        cancelAnimationFrame(rafId);
      };
    }

    triedKeysRef.current.add(localBlobId);

    const startRestoreRafId = requestAnimationFrame(() => {
      setIsRestoring(true);
    });

    getDocumentBlob(localBlobId, { userId })
      .then((blob) => {
        if (cancelled) return;

        if (!blob) {
          setIsRestoring(false);
          return;
        }

        const blobUrl = URL.createObjectURL(blob);
        cacheDocumentBlobUrl(localBlobId, blobUrl, { userId });
        setRestoredLocalBlobUrl(blobUrl);
        setIsRestoring(false);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("[useLocalDocumentSource] local restore failed", {
          localBlobId,
          error,
        });
        setIsRestoring(false);
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(startRestoreRafId);
    };
  }, [cachedBlobUrl, userId, localBlobId, restoredLocalBlobUrl]);

  const localBlobUrl =
    cachedBlobUrl ?? restoredLocalBlobUrl ?? persistedBlobUrl ?? null;

  const localSourceStatus = useMemo<LocalSourceStatus>(() => {
    if (!localBlobId) return "idle";
    if (localBlobUrl) return "ready";
    if (isRestoring) return "loading";
    return persistedBlobUrl ? "ready" : "failed";
  }, [isRestoring, localBlobId, localBlobUrl, persistedBlobUrl]);

  // Pin / unpin in session cache while component is mounted
  useEffect(() => {
    if (!localBlobId || !localBlobUrl || !localBlobUrl.startsWith("blob:"))
      return;
    pinDocumentBlobUrl(localBlobId, { userId });
    return () => {
      unpinDocumentBlobUrl(localBlobId, { userId });
    };
  }, [userId, localBlobId, localBlobUrl]);

  return { localBlobUrl, localSourceStatus };
}
