/**
 * useLocalImageBlobUrl
 *
 * ローカル IndexedDB の blob URL を取得・pin・unpin する共通 hook。
 *
 * ## lifecycle
 *
 *   1. localFileId + userId が揃ったら getOrCreateImageBlobUrl を呼ぶ
 *   2. URL 取得成功 → pinImageBlobUrl(localFileId)
 *      → evictIfNeeded がこのエントリを eviction 対象外にする
 *   3. deps 変化 or unmount の cleanup:
 *      → unpinImageBlobUrl(localFileId)
 *      → pinCount が 0 になれば eviction・revoke 可能になる
 *
 * ## 責務分離
 *
 *   - 表示用 blob URL のみ対象。preload 用 URL は useCardImagePreloader が別管理。
 *   - Firebase Storage URL の解決は行わない（呼び出し元が別途処理する）。
 *   - revokeObjectURL は直接呼ばない（eviction は imageBlobUrlSessionCache に委譲）。
 *
 * ## pin 漏れ防止の仕組み
 *
 *   このフックを使う限り、「取得したら pin」「unmount したら unpin」が
 *   コード構造として強制される。呼び出し元が pin/unpin を手書きする必要はない。
 */

import { useEffect, useState } from "react";
import {
  getOrCreateImageBlobUrl,
  pinImageBlobUrl,
  unpinImageBlobUrl,
} from "@/services/imageBlobUrlSessionCache";

export interface LocalImageBlobUrlResult {
  /** 解決済みの blob URL。取得中・取得失敗時は null。 */
  url: string | null;
  /** getOrCreateImageBlobUrl の呼び出し中は true。 */
  loading: boolean;
}

/**
 * @param localFileId   IndexedDB の blob ID（assetId または localFileId）。
 *                      null/undefined の場合は何もしない。
 * @param userId        スコープ用 userId。null/undefined でも動作するが精度が下がる。
 */
export function useLocalImageBlobUrl(
  localFileId: string | null | undefined,
  userId: string | null | undefined,
): LocalImageBlobUrlResult {
  const [result, setResult] = useState<LocalImageBlobUrlResult>(() => ({
    url: null,
    loading: Boolean(localFileId),
  }));

  useEffect(() => {
    if (!localFileId) {
      setResult({ url: null, loading: false });
      return;
    }

    // このサイクルで pin に成功した ID を記録する。
    // async 完了前に cleanup が走った場合、pinnedId が null のまま unpin しない。
    let pinnedId: string | null = null;
    let cancelled = false;

    setResult({ url: null, loading: true });

    const run = async () => {
      const url = await getOrCreateImageBlobUrl(localFileId, { userId });
      if (cancelled) return;

      if (url) {
        // URL 確定後に pin する。
        // pin → setState の順にすることで「pin より前に unmount」が起きても
        // cleanup の unpinImageBlobUrl(null) が no-op になり安全。
        pinImageBlobUrl(localFileId, { userId });
        pinnedId = localFileId;
      }

      setResult({ url, loading: false });
    };

    void run();

    return () => {
      cancelled = true;
      // pinnedId が非 null のときのみ unpin する。
      // pin 前に cleanup が走ったケースでは pinCount を誤ってデクリメントしない。
      if (pinnedId !== null) {
        unpinImageBlobUrl(pinnedId, { userId });
        pinnedId = null;
      }
    };
    // userId は文字列なので依存に含める。null/undefined 変化も追う。
  }, [localFileId, userId]);

  return result;
}
