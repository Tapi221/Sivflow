import { ImageFrame } from "@/components/card/blocks/ImageFrame";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/contexts/AuthContext";
import { useLocalImageBlobUrl } from "@/hooks/image/useLocalImageBlobUrl";
import { storage } from "@/services/firebase";
import { getCachedRemoteUrl } from "@/services/imagePreloadCache";
import { getLocalDb } from "@/services/localDB";
import {
  Copy,
  Download,
  Image as ImageIcon,
  Pause,
  Play,
  Volume2,
} from "@/ui/icons";
import { getDownloadURL, ref as storageRef } from "firebase/storage";
import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * render-null ヘルパー。
 *
 * ImageGallery はカードリストを扱うため、hooks をループ内で呼べない。
 * このコンポーネントを 1 画像 1 インスタンスでレンダリングすることで、
 * useLocalImageBlobUrl の lifecycle（pin/unpin）を per-item で適用する。
 *
 * - url が解決されたら onResolved(localFileId, url) を呼ぶ。
 * - unmount 時は hook の cleanup が自動的に unpin する。
 */
function LocalBlobUrlResolverEffect({
  localFileId,
  userId,
  onResolved,
}: {
  localFileId: string;
  userId: string | undefined;
  onResolved: (localFileId: string, url: string | null) => void;
}) {
  const { url, loading } = useLocalImageBlobUrl(localFileId, userId);
  useEffect(() => {
    if (!loading) {
      onResolved(localFileId, url);
    }
  }, [localFileId, url, loading, onResolved]);
  return null;
}

interface AudioPlayerProps {
  urls: string[];
}

export function AudioPlayer({ urls }: AudioPlayerProps) {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);

  const togglePlay = (index: number) => {
    if (playingIndex === index) {
      audioRefs.current[index]?.pause();
      setPlayingIndex(null);
    } else {
      if (playingIndex !== null) {
        audioRefs.current[playingIndex]?.pause();
      }
      audioRefs.current[index]?.play();
      setPlayingIndex(index);
    }
  };

  if (!urls || urls.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 justify-center">
      {urls.map((url, index) => (
        <div key={index}>
          <audio
            ref={(el) => {
              audioRefs.current[index] = el;
            }}
            src={url}
            onEnded={() => setPlayingIndex(null)}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay(index);
            }}
            className="gap-1"
          >
            {playingIndex === index ? (
              <Pause className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            <Volume2 className="w-3 h-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}

interface ImageGalleryProps {
  urls: string[];
  items?: Array<
    | string
    | {
        remoteUrl?: string | null;
        localUrl?: string | null;
        localFileId?: string | null;
        assetId?: string | null;
        url?: string | null;
        scale?: number | null;
        x?: number | null;
        naturalW?: number | null;
        naturalH?: number | null;
      }
  >;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export function ImageGallery({ urls, items }: ImageGalleryProps) {
  const { currentUser } = useAuthSession();
  const [failedImages, setFailedImages] = useState(new Set<number>());
  const [naturalSizeMap, setNaturalSizeMap] = useState<
    Record<number, { w: number; h: number }>
  >({});
  const [resolvedLocalUrlMap, setResolvedLocalUrlMap] = useState<
    Record<string, string>
  >({});
  const [failedLocalFileIds, setFailedLocalFileIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [resolvedRemoteUrlMap, setResolvedRemoteUrlMap] = useState<
    Record<string, string>
  >({});
  const sanitizeLegacyUrl = React.useCallback((value: unknown): string => {
    if (typeof value !== "string") return "";
    if (value.startsWith("blob:")) return "";
    return value;
  }, []);
  const resolvedItems = React.useMemo(
    () =>
      (items && items.length > 0 ? items : urls).map((entry) => {
        if (typeof entry === "string") {
          const safeUrl = sanitizeLegacyUrl(entry);
          return {
            key: safeUrl || entry,
            localFileId: null,
            url: safeUrl,
            scale: 1,
            x: 0,
            naturalW: null,
            naturalH: null,
          };
        }
        const assetId = entry.assetId ?? null;
        const localFileId = entry.localFileId ?? assetId;
        //
        // URL 優先順位（表示成功率の高い順）:
        //
        //   1. fallbackLocal    — 現セッションで IndexedDB から生成した blob URL。
        //                         同一セッション内で作成済みのため最も信頼できる。
        //
        //   2. legacyLocalUrl   — カードデータの localUrl フィールド（非 blob）。
        //                         端末ローカルで確認できる URL。
        //                         blob: URL は sanitizeLegacyUrl で除去済みなので
        //                         ここに来る場合は有効な非 blob パス。
        //
        //   3. cachedRemoteUrl  — useCardImagePreloader が同一セッションで取得した
        //                         Firebase Storage URL。プリロード経路と同じ URL を
        //                         使うことで、preload 済みブラウザキャッシュを活かせる。
        //
        //   4. fallbackRemote   — ImageGallery 自身が Firebase から取得した URL。
        //                         cachedRemoteUrl より取得タイミングが遅い場合がある。
        //
        //   5. legacyRemoteUrl  — カードデータの remoteUrl フィールド（非 blob）。
        //                         古い Firebase 署名 URL の可能性があり、期限切れリスク。
        //                         上位で解決できなかった最終手段。
        //
        //   6. legacyUrl        — カードデータの url フィールド（非 blob）。
        //                         旧データ形式の互換フィールド。最低優先。
        //
        // 【旧実装の問題点】
        //   legacyRemoteUrl を先頭に置いていたため、現セッションで有効な local blob
        //   よりも古い remoteUrl が優先された。remoteUrl が期限切れなら失敗 → failedImages
        //   に積まれ、その後 blob が解決されても表示されない状態に陥っていた。
        //
        const fallbackLocal = localFileId
          ? (resolvedLocalUrlMap[localFileId] ?? "")
          : "";
        const cachedRemoteUrl = assetId ? (getCachedRemoteUrl(assetId) ?? "") : "";
        const fallbackRemote = assetId
          ? (resolvedRemoteUrlMap[assetId] ?? "")
          : "";
        const legacyRemoteUrl = sanitizeLegacyUrl(entry.remoteUrl);
        const legacyLocalUrl = sanitizeLegacyUrl(entry.localUrl);
        const legacyUrl = sanitizeLegacyUrl(entry.url);
        return {
          key:
            entry.remoteUrl ?? entry.localUrl ?? entry.url ?? localFileId ?? "",
          localFileId,
          url:
            fallbackLocal ||
            legacyLocalUrl ||
            cachedRemoteUrl ||
            fallbackRemote ||
            legacyRemoteUrl ||
            legacyUrl,
          assetId,
          scale: entry.scale ?? 1,
          x: entry.x ?? 0,
          naturalW: entry.naturalW ?? null,
          naturalH: entry.naturalH ?? null,
        };
      }),
    [items, urls, resolvedLocalUrlMap, resolvedRemoteUrlMap, sanitizeLegacyUrl],
  );
  const urlKey = React.useMemo(
    () => resolvedItems.map((item) => item.url).join("\u001f"),
    [resolvedItems],
  );

  React.useEffect(() => {
    setNaturalSizeMap({});
    setFailedImages(new Set());
  }, [urlKey]);

  // ── ローカル blob URL 解決のためのデータ収集 ──────────────────────────
  // 非 blob の直接 URL を持たず、localFileId または assetId がある items だけが
  // LocalBlobUrlResolverEffect の対象になる。
  const unresolvedLocalItems = React.useMemo(() => {
    const source = (items && items.length > 0 ? items : urls) as Array<unknown>;
    const result: Array<{ localFileId: string; assetId: string | null }> = [];
    for (const entry of source) {
      if (typeof entry !== "object" || !entry) continue;
      const media = entry as {
        remoteUrl?: unknown;
        localUrl?: unknown;
        url?: unknown;
        localFileId?: string | null;
        assetId?: string | null;
      };
      const hasNonBlob = [media.remoteUrl, media.localUrl, media.url].some(
        (v) =>
          typeof v === "string" && !v.startsWith("blob:") && v.trim().length > 0,
      );
      if (hasNonBlob) continue;
      const localFileId = media.localFileId ?? media.assetId ?? null;
      if (!localFileId) continue;
      result.push({ localFileId, assetId: media.assetId ?? null });
    }
    return result;
  }, [items, urls]);

  // ローカル blob 解決結果のコールバック（stable 参照を保つため useCallback）
  const handleLocalResolved = useCallback(
    (localFileId: string, url: string | null) => {
      if (url) {
        setResolvedLocalUrlMap((prev) => {
          if (prev[localFileId] === url) return prev;
          return { ...prev, [localFileId]: url };
        });
      } else {
        // 解決失敗: pending → failed に遷移させる
        setFailedLocalFileIds((prev) => {
          if (prev.has(localFileId)) return prev;
          const next = new Set(prev);
          next.add(localFileId);
          return next;
        });
      }
    },
    [],
  );

  // ── Firebase Storage fallback ─────────────────────────────────────────
  // ローカル blob が取得できなかった（resolvedLocalUrlMap に入っていない）が
  // assetId を持つ items に対して Firebase から URL を取得する。
  const unresolvedRemoteItems = React.useMemo(() => {
    return unresolvedLocalItems.filter(
      ({ localFileId, assetId }) =>
        !resolvedLocalUrlMap[localFileId] && Boolean(assetId),
    );
  }, [unresolvedLocalItems, resolvedLocalUrlMap]);

  useEffect(() => {
    if (unresolvedRemoteItems.length === 0) return;
    const userId = currentUser?.uid;
    if (!userId) return;

    // ── preload キャッシュから即時反映 ──────────────────────────────────
    // useCardImagePreloader が同一セッションで既に Firebase URL を取得している場合、
    // imagePreloadCache.remoteUrlCache に格納済み。Firebase fetch を待たずに
    // resolvedRemoteUrlMap へ即反映することで preload → 表示のラグを解消する。
    const needsFetch: typeof unresolvedRemoteItems = [];
    setResolvedRemoteUrlMap((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const item of unresolvedRemoteItems) {
        if (!item.assetId) {
          needsFetch.push(item);
          continue;
        }
        const cached = getCachedRemoteUrl(item.assetId);
        if (cached) {
          // キャッシュヒット: 同じ値なら state を変えない
          if (next[item.assetId] !== cached) {
            next[item.assetId] = cached;
            changed = true;
          }
          // Firebase fetch 不要
        } else {
          needsFetch.push(item);
        }
      }
      return changed ? next : prev;
    });

    if (needsFetch.length === 0) return;

    let cancelled = false;
    const run = async () => {
      const entries = await Promise.all(
        needsFetch.map(async ({ assetId }) => {
          if (!assetId) return null;
          try {
            const db = await getLocalDb(userId);
            const asset = (await db.images.get(assetId)) as
              | { remoteKey?: string }
              | undefined;
            const remoteKey = asset?.remoteKey;
            if (!remoteKey) return null;
            const remoteUrl = await getDownloadURL(
              storageRef(storage, remoteKey),
            );
            if (import.meta.env.DEV) {
              console.info("[CardMedia] image source=remote", {
                assetId,
                remoteKey,
              });
            }
            return { id: assetId, url: remoteUrl };
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      setResolvedRemoteUrlMap((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const pair of entries) {
          if (!pair) continue;
          if (next[pair.id] === pair.url) continue;
          next[pair.id] = pair.url;
          changed = true;
        }
        return changed ? next : prev;
      });
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, unresolvedRemoteItems]);

  const handleImageError = (index: number) => {
    setFailedImages((prev) => new Set(prev).add(index));
    console.error(
      `Image load failed at index ${index}:`,
      resolvedItems[index]?.url,
    );
  };
  const copyImage = React.useCallback(async (imageUrl: string) => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      if (
        navigator.clipboard?.write &&
        typeof ClipboardItem !== "undefined" &&
        blob.type
      ) {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob,
          }),
        ]);
        console.log("image copied");
        return;
      }
      await navigator.clipboard.writeText(imageUrl);
      console.log("url copied");
    } catch (error) {
      console.error("copy failed", error);
      try {
        await navigator.clipboard.writeText(imageUrl);
      } catch {
        alert("画像のコピーに失敗しました。");
      }
    }
  }, []);
  const downloadImage = React.useCallback(
    async (imageUrl: string, index: number) => {
      if (!imageUrl) return;
      try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const ext =
          blob.type === "image/png"
            ? "png"
            : blob.type === "image/webp"
              ? "webp"
              : blob.type === "image/gif"
                ? "gif"
                : "jpg";
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `uploaded-image-${index + 1}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
      } catch (error) {
        console.error("Failed to download image:", error);
        const a = document.createElement("a");
        a.href = imageUrl;
        a.download = `uploaded-image-${index + 1}`;
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    },
    [],
  );

  // item.localFileId が解決待ち（pending）かどうか判定するための Set
  const pendingLocalFileIds = React.useMemo(() => {
    const s = new Set<string>();
    for (const { localFileId } of unresolvedLocalItems) {
      if (!resolvedLocalUrlMap[localFileId] && !failedLocalFileIds.has(localFileId)) {
        s.add(localFileId);
      }
    }
    return s;
  }, [unresolvedLocalItems, resolvedLocalUrlMap, failedLocalFileIds]);

  if (!resolvedItems || resolvedItems.length === 0) return null;

  return (
    <>
      {/* ローカル blob URL を per-item で解決・pin する。
          LocalBlobUrlResolverEffect は DOM を生成しない。
          unmount 時に hook の cleanup が unpin を保証する。 */}
      {unresolvedLocalItems.map(({ localFileId }) => (
        <LocalBlobUrlResolverEffect
          key={localFileId}
          localFileId={localFileId}
          userId={currentUser?.uid}
          onResolved={handleLocalResolved}
        />
      ))}
      <div className="w-full">
        {resolvedItems.map((item, index) => (
          <div key={item.key || index} className="relative group isolate">
            {!failedImages.has(index) && item.url ? (
              <>
                <ImageFrame
                  src={item.url}
                  alt={`Image ${index + 1}`}
                  scale={item.scale}
                  x={item.x}
                  naturalW={item.naturalW ?? naturalSizeMap[index]?.w ?? null}
                  naturalH={item.naturalH ?? naturalSizeMap[index]?.h ?? null}
                  className="bg-transparent"
                  imgClassName="cursor-pointer pointer-events-none"
                  onNaturalSize={({ naturalW, naturalH }) => {
                    setNaturalSizeMap((prev) => {
                      const current = prev[index];
                      if (current?.w === naturalW && current?.h === naturalH)
                        return prev;
                      return { ...prev, [index]: { w: naturalW, h: naturalH } };
                    });
                  }}
                  onError={() => handleImageError(index)}
                />
                <div className="absolute top-1 left-1 z-[999] pointer-events-auto flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 supports-[hover:none]:opacity-100">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-6 w-6 bg-white/90"
                    onClick={(event) => {
                      event.stopPropagation();
                      void copyImage(item.url);
                    }}
                    aria-label="画像をコピー"
                  >
                    <Copy className="w-2.5 h-2.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-6 w-6 bg-white/90"
                    onClick={(event) => {
                      event.stopPropagation();
                      void downloadImage(item.url, index);
                    }}
                    aria-label="画像をダウンロード"
                  >
                    <Download className="w-2.5 h-2.5" />
                  </Button>
                </div>
              </>
            ) : item.localFileId && pendingLocalFileIds.has(item.localFileId) ? (
              <div className="w-full h-48 bg-slate-100 flex items-center justify-center text-slate-400">
                <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-400 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="w-full h-48 bg-slate-100 flex items-center justify-center text-slate-400 flex-col gap-2">
                <ImageIcon className="w-8 h-8 text-slate-300" />
                <span className="text-xs">
                  {item.url
                    ? "画像の読み込みに失敗しました"
                    : "画像が壊れているため表示できません"}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}