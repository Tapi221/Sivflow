/**
 * Manages local blob URL restoration from IndexedDB / session cache.
 * Handles: cache lookup → IndexedDB restore → URL.createObjectURL → pin/unpin.
 */

import { useEffect, useRef, useState } from "react";
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
  const [cachedBlobUrl, setCachedBlobUrl] = useState<string | null>(null);
  const [restoredLocalBlobUrl, setRestoredLocalBlobUrl] = useState<
    string | null
  >(null);
  const [localSourceStatus, setLocalSourceStatus] =
    useState<LocalSourceStatus>("idle");

  const triedKeysRef = useRef<Set<string>>(new Set());

  // Reset when localBlobId changes (doc switched)
  useEffect(() => {
    triedKeysRef.current.clear();
    setRestoredLocalBlobUrl(null);
    setLocalSourceStatus("idle");
  }, [localBlobId]);

  // Session cache lookup
  useEffect(() => {
    if (!localBlobId) {
      setCachedBlobUrl(null);
      return;
    }
    setCachedBlobUrl(
      getCachedDocumentBlobUrl(localBlobId, { userId }) ?? null,
    );
  }, [userId, localBlobId]);

  // IndexedDB restore
  useEffect(() => {
    let cancelled = false;

    if (cachedBlobUrl || restoredLocalBlobUrl) {
      setLocalSourceStatus("ready");
      return;
    }

    if (localBlobId && !triedKeysRef.current.has(localBlobId)) {
      triedKeysRef.current.add(localBlobId);
      setLocalSourceStatus("loading");

      getDocumentBlob(localBlobId, { userId })
        .then((blob) => {
          if (cancelled) return;
          if (!blob) {
            setLocalSourceStatus(persistedBlobUrl ? "ready" : "failed");
            return;
          }
          const blobUrl = URL.createObjectURL(blob);
          cacheDocumentBlobUrl(localBlobId, blobUrl, { userId });
          setCachedBlobUrl(blobUrl);
          setRestoredLocalBlobUrl(blobUrl);
          setLocalSourceStatus("ready");
        })
        .catch((error) => {
          if (cancelled) return;
          console.error("[useLocalDocumentSource] local restore failed", {
            localBlobId,
            error,
          });
          setLocalSourceStatus(persistedBlobUrl ? "ready" : "failed");
        });

      return () => {
        cancelled = true;
      };
    }

    if (persistedBlobUrl) {
      setLocalSourceStatus("ready");
      return;
    }

    setLocalSourceStatus(localBlobId ? "failed" : "idle");
    return () => {
      cancelled = true;
    };
  }, [
    cachedBlobUrl,
    userId,
    localBlobId,
    persistedBlobUrl,
    restoredLocalBlobUrl,
  ]);

  const localBlobUrl =
    cachedBlobUrl ?? restoredLocalBlobUrl ?? persistedBlobUrl ?? null;

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
