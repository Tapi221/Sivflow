import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@web-renderer/chip/button/button/button";
import { Copy, Download, Image as ImageIcon, Pause, Play, Volume2 } from "@web-renderer/chip/icons/icons";
import { ImageFrame } from "@/components/card/blocks/image/ImageFrame";
import type { ImageGalleryItem } from "./media.types";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { CANONICAL_CARD_WIDTH } from "@/domain/card/cardGeometry.constants";
import { webClipboardAdapter } from "@/platform/clipboard/webClipboardAdapter";
import { resolveCardImageUrl } from "@/services/cardImageResolver";
import type { ResolvableImageRef } from "@/types/domain/assets";



interface AudioPlayerProps {
  urls: string[];
}
interface ImageGalleryProps {
  urls: string[];
  items?: ImageGalleryItem[];
  onFullscreenChange?: (isFullscreen: boolean) => void;
  displayMode?: "fixed" | "fluid";
  zoom?: number;
}
type DisplayImage = {
  key: string;
  url: string | null;
  layout?: ResolvableImageRef["layout"];
  scale?: number | null;
  x?: number | null;
  naturalW?: number | null;
  naturalH?: number | null;
};
type NormalizedDisplayImage = DisplayImage & {
  ref?: ResolvableImageRef;
};
type DisplayImagesState = {
  key: string;
  images: DisplayImage[];
};
type FailedImagesState = {
  key: string;
  indices: Set<number>;
};



const IMAGE_BLOCK_INSET_PX = 4;
const FIXED_IMAGE_REFERENCE_FRAME_WIDTH_PX =
  CANONICAL_CARD_WIDTH - IMAGE_BLOCK_INSET_PX * 2;
const EMPTY_FAILED_IMAGE_INDICES = new Set<number>();
const IMAGE_ACTION_BAR_CLASS_NAME = "absolute top-1 right-1 z-[999] pointer-events-auto flex items-center gap-0.5 rounded bg-white/80 p-px opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100";
const IMAGE_ACTION_BUTTON_CLASS_NAME = "flex h-4 w-4 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-900/5 hover:text-zinc-600 focus:outline-none";
const IMAGE_ACTION_ICON_CLASS_NAME = "h-2.5 w-2.5";



const hasDisplayImageUrl = (url: string | null): url is string =>
  typeof url === "string" && url.trim().length > 0;
const getInlineDisplayImageUrl = (entry: ResolvableImageRef): string | null => {
  for (const value of [entry.url, entry.remoteUrl, entry.localUrl]) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
};
const getDisplayImageKey = (
  entry: ResolvableImageRef,
  index: number,
): string => {
  for (const value of [
    entry.assetId,
    entry.id,
    entry.localFileId,
    entry.remoteUrl,
    entry.localUrl,
    entry.url,
  ]) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return `image-${index}`;
};
const toDisplayImage = (item: NormalizedDisplayImage): DisplayImage => ({
  key: item.key,
  url: item.url,
  layout: item.layout ?? null,
  scale: item.scale ?? 1,
  x: item.x ?? 0,
  naturalW: item.naturalW ?? null,
  naturalH: item.naturalH ?? null,
});
const getNormalizedItemsKey = (items: NormalizedDisplayImage[]) =>
  items
    .map((item) =>
      JSON.stringify([
        item.key,
        item.url ?? "",
        item.layout?.baseWidthPx ?? null,
        item.layout?.cropX ?? null,
        item.scale ?? null,
        item.x ?? null,
        item.naturalW ?? null,
        item.naturalH ?? null,
      ]),
    )
    .join("\n");



const AudioPlayer = ({ urls }: AudioPlayerProps) => {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);

  const togglePlay = (index: number) => {
    if (playingIndex === index) {
      audioRefs.current[index]?.pause();
      setPlayingIndex(null);
      return;
    }
    if (playingIndex !== null) {
      audioRefs.current[playingIndex]?.pause();
    }
    void audioRefs.current[index]?.play();
    setPlayingIndex(index);
  };

  if (!urls || urls.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 justify-center">
      {urls.map((url, index) => (
        <Fragment key={index}>
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
        </Fragment>
      ))}
    </div>
  );
};
const ImageGallery = ({ items, displayMode = "fixed", zoom = 1 }: ImageGalleryProps) => {
  const { currentUser } = useAuthSession();
  const [displayImagesState, setDisplayImagesState] =
    useState<DisplayImagesState>(() => ({ key: "", images: [] }));
  const [failedImagesState, setFailedImagesState] =
    useState<FailedImagesState>(() => ({
      key: "",
      indices: new Set(),
    }));

  const normalizedItems = useMemo<NormalizedDisplayImage[]>(() => {
    return (items ?? []).map((entry, index) => {
      if (typeof entry === "string") {
        return {
          key: entry,
          url: entry,
          layout: null,
          scale: 1,
          x: 0,
          naturalW: null,
          naturalH: null,
        };
      }

      return {
        key: getDisplayImageKey(entry, index),
        url: getInlineDisplayImageUrl(entry),
        layout: entry.layout ?? null,
        scale: entry.scale ?? 1,
        x: entry.x ?? 0,
        naturalW: entry.naturalW ?? null,
        naturalH: entry.naturalH ?? null,
        ref: entry,
      };
    });
  }, [items]);

  const normalizedItemsKey = useMemo(
    () => getNormalizedItemsKey(normalizedItems),
    [normalizedItems],
  );
  const imageResolutionKey = useMemo(
    () => `${currentUser?.uid ?? ""}\n${normalizedItemsKey}`,
    [currentUser?.uid, normalizedItemsKey],
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const resolved = await Promise.all(
        normalizedItems.map(async (item) => {
          if (hasDisplayImageUrl(item.url) || !item.ref) return toDisplayImage(item);
          const result = await resolveCardImageUrl(item.ref, currentUser?.uid);
          return {
            key: item.key,
            url: result.url,
            layout: result.layout ?? null,
            scale: result.scale ?? 1,
            x: result.x ?? 0,
            naturalW: result.naturalW ?? null,
            naturalH: result.naturalH ?? null,
          } satisfies DisplayImage;
        }),
      );

      if (!cancelled) {
        setDisplayImagesState({ key: imageResolutionKey, images: resolved });
        setFailedImagesState({ key: imageResolutionKey, indices: new Set() });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, imageResolutionKey, normalizedItems]);

  const copyImage = async (imageUrl: string) => {
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
      await webClipboardAdapter.writeText(imageUrl);
    } catch {
      await webClipboardAdapter.writeText(imageUrl);
    }
  };

  const downloadImage = async (imageUrl: string, index: number) => {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const ext =
      blob.type === "image/png"
        ? "png"
        : blob.type === "image/webp"
          ? "webp"
          : "jpg";
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `uploaded-image-${index + 1}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  };

  const displayImages =
    displayImagesState.key === imageResolutionKey
      ? displayImagesState.images
      : normalizedItems.map(toDisplayImage).filter((item) => hasDisplayImageUrl(item.url));
  const failedImages =
    failedImagesState.key === imageResolutionKey
      ? failedImagesState.indices
      : EMPTY_FAILED_IMAGE_INDICES;

  if (displayImages.length === 0) return null;

  return (
    <div className="w-full">
      {displayImages.map((item, index) => (
        <div key={item.key || index} className="relative group isolate">
          {!failedImages.has(index) && item.url ? (
            <>
              <ImageFrame
                src={item.url}
                alt={`Image ${index + 1}`}
                displayMode={displayMode}
                zoom={zoom}
                scale={item.scale ?? 1}
                x={item.x ?? 0}
                layoutBaseWidthPx={item.layout?.baseWidthPx ?? null}
                cropX={item.layout?.cropX ?? null}
                fixedReferenceFrameWidthPx={
                  FIXED_IMAGE_REFERENCE_FRAME_WIDTH_PX
                }
                naturalW={item.naturalW ?? null}
                naturalH={item.naturalH ?? null}
                className="bg-transparent"
                imgClassName="cursor-pointer pointer-events-none"
                onError={() => {
                  setFailedImagesState((prev) => {
                    const next = new Set(
                      prev.key === imageResolutionKey ? prev.indices : undefined,
                    );
                    next.add(index);
                    return { key: imageResolutionKey, indices: next };
                  });
                }}
              />
              <div className={IMAGE_ACTION_BAR_CLASS_NAME}>
                <button
                  type="button"
                  className={IMAGE_ACTION_BUTTON_CLASS_NAME}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    void copyImage(item.url!);
                  }}
                  aria-label="画像をコピー"
                >
                  <Copy className={IMAGE_ACTION_ICON_CLASS_NAME} />
                </button>
                <button
                  type="button"
                  className={IMAGE_ACTION_BUTTON_CLASS_NAME}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    void downloadImage(item.url!, index);
                  }}
                  aria-label="画像をダウンロード"
                >
                  <Download className={IMAGE_ACTION_ICON_CLASS_NAME} />
                </button>
              </div>
            </>
          ) : (
            <div className="w-full h-48 bg-slate-100 flex items-center justify-center text-slate-400 flex-col gap-2">
              <ImageIcon className="w-8 h-8 text-slate-300" />
              <span className="text-xs">画像を表示できません</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};



export { AudioPlayer, ImageGallery };
