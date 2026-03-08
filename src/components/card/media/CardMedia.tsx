import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, Image as ImageIcon } from "@/ui/icons";
import { ImageFrame } from "../blocks/ImageFrame";
import { useAuth } from "@/contexts/AuthContext";
import { getOrCreateImageBlobUrl } from "@/services/imageBlobUrlSessionCache";
import { getLocalDb } from "@/services/localDB";
import { storage } from "@/services/firebase";
import { getDownloadURL, ref as storageRef } from "firebase/storage";

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
  const { currentUser } = useAuth();
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

  if (!resolvedItems || resolvedItems.length === 0) return null;

  return (
    <>
      <div className="w-full">
        {resolvedItems.map((item, index) =>
          !failedImages.has(index) && item.url ? (
            <ImageFrame
              key={item.key || index}
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
          ) : (
            <div
              key={index}
              className="w-full h-48 bg-slate-100 flex items-center justify-center text-slate-400 flex-col gap-2"
            >
              <ImageIcon className="w-8 h-8 text-slate-300" />
              <span className="text-xs">
                {item.url
                  ? "画像の読み込みに失敗しました"
                  : "画像が壊れているため表示できません"}
              </span>
            </div>
          ),
        )}
      </div>
    </>
  );
}



