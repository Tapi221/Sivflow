import { ImageFrame } from "@/components/card/blocks/ImageFrame";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/contexts/AuthContext";
import { storage } from "@/services/firebase";
import { getOrCreateImageBlobUrl } from "@/services/imageBlobUrlSessionCache";
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
import React, { useRef, useState } from "react";

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
  const [failedImages, setFailedImages] = useState(new Set());
  const [naturalSizeMap, setNaturalSizeMap] = useState<
    Record<number, { w: number; h: number }>
  >({});
  const [resolvedLocalUrlMap, setResolvedLocalUrlMap] = useState<
    Record<string, string>
  >({});
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
        const fallbackLocal = localFileId
          ? (resolvedLocalUrlMap[localFileId] ?? "")
          : "";
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
            legacyRemoteUrl ||
            legacyLocalUrl ||
            legacyUrl ||
            fallbackRemote ||
            fallbackLocal,
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
  }, [urlKey]);

  React.useEffect(() => {
    const source = (items && items.length > 0 ? items : urls) as Array<
      unknown
    >;
    const candidates = source.filter(
      (entry) => typeof entry === "object" && Boolean(entry),
    );
    const hasUsableLegacyUrl = (entry: unknown) => {
      const values = [entry?.remoteUrl, entry?.localUrl, entry?.url];
      return values.some(
        (v) =>
          typeof v === "string" &&
          !v.startsWith("blob:") &&
          v.trim().length > 0,
      );
    };
    const unresolved = candidates.filter((entry) => {
      if (typeof entry !== "object" || entry === null) return false;
      const media = entry as {
        localFileId?: string | null;
        assetId?: string | null;
      };
      return !hasUsableLegacyUrl(entry) && Boolean(media.localFileId || media.assetId);
    });
    if (unresolved.length === 0) return;

    let cancelled = false;
    const run = async () => {
      const userId = currentUser?.uid;
      const localEntries = await Promise.all(
        unresolved.map(async (entry) => {
          if (typeof entry !== "object" || entry === null) return null;
          const media = entry as {
            assetId?: string | null;
            localFileId?: string | null;
          };
          const assetId = media.assetId ?? null;
          const localBlobId = media.localFileId ?? assetId;
          if (localBlobId) {
            const url = await getOrCreateImageBlobUrl(localBlobId, { userId });
            if (url) {
              if (import.meta.env.DEV) {
                console.info("[CardMedia] image source=local", {
                  assetId,
                  localBlobId,
                });
              }
              return { type: "local" as const, id: localBlobId, url };
            }
          }
          if (!assetId || !userId) return null;
          const db = await getLocalDb(userId);
          const asset = (await db.images.get(assetId)) as
            | { remoteKey?: string }
            | undefined;
          const remoteKey = asset?.remoteKey;
          if (!remoteKey) return null;
          try {
            const remoteUrl = await getDownloadURL(
              storageRef(storage, remoteKey),
            );
            if (import.meta.env.DEV) {
              console.info("[CardMedia] image source=remote", {
                assetId,
                remoteKey,
              });
            }
            return { type: "remote" as const, id: assetId, url: remoteUrl };
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      setResolvedLocalUrlMap((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const pair of localEntries) {
          if (!pair || pair.type !== "local") continue;
          const { id, url } = pair;
          if (next[id] === url) continue;
          next[id] = url;
          changed = true;
        }
        return changed ? next : prev;
      });
      setResolvedRemoteUrlMap((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const pair of localEntries) {
          if (!pair || pair.type !== "remote") continue;
          const { id, url } = pair;
          if (next[id] === url) continue;
          next[id] = url;
          changed = true;
        }
        return changed ? next : prev;
      });
    };
    void run();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, items, urls]);

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
        return;
      }
      await navigator.clipboard.writeText(imageUrl);
    } catch (error) {
      console.error("Failed to copy image:", error);
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

  if (!resolvedItems || resolvedItems.length === 0) return null;

  return (
    <>
      <div className="w-full">
        {resolvedItems.map((item, index) => (
          <div key={item.key || index} className="relative group">
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
                  imgClassName="cursor-pointer"
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
                <div className="absolute top-1 right-1 z-20 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 supports-[hover:none]:opacity-100">
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





