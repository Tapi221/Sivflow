/**
 * useLocalImageBlobUrl
 *
 * ローカル IndexedDB の blob URL を取得・pin・unpin する共通 hook。
 */

import { useEffect, useState } from "react";
import {
  getOrCreateImageBlobUrl,
  pinImageBlobUrl,
  unpinImageBlobUrl,
} from "@/services/imageBlobUrlSessionCache";

export interface LocalImageBlobUrlResult {
  url: string | null;
  loading: boolean;
}

type LocalImageBlobUrlState = {
  fileId: string | null;
  url: string | null;
};

export function useLocalImageBlobUrl(
  localFileId: string | null | undefined,
  userId: string | null | undefined,
): LocalImageBlobUrlResult {
  const [state, setState] = useState<LocalImageBlobUrlState>({
    fileId: null,
    url: null,
  });

  useEffect(() => {
    if (!localFileId) return;

    let pinnedId: string | null = null;
    let cancelled = false;

    const run = async () => {
      const url = await getOrCreateImageBlobUrl(localFileId, { userId });
      if (cancelled) return;

      if (url) {
        pinImageBlobUrl(localFileId, { userId });
        pinnedId = localFileId;
      }

      setState({
        fileId: localFileId,
        url,
      });
    };

    void run();

    return () => {
      cancelled = true;
      if (pinnedId !== null) {
        unpinImageBlobUrl(pinnedId, { userId });
        pinnedId = null;
      }
    };
  }, [localFileId, userId]);

  if (!localFileId) {
    return { url: null, loading: false };
  }

  const hasResolvedCurrent = state.fileId === localFileId;
  return {
    url: hasResolvedCurrent ? state.url : null,
    loading: !hasResolvedCurrent,
  };
}