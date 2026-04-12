import { ImageFrame } from "@/components/card/blocks/image/ImageFrame";
import { CANONICAL_CARD_WIDTH } from "@/components/card/common/constants";
import type { ImageGalleryItem } from "@/components/card/media/types";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/contexts/AuthContext";
import { webClipboardAdapter } from "@/platform/clipboard/webClipboardAdapter";
import { resolveCardImageUrl } from "@/services/cardImageResolver";
import { Copy, Download, Image as ImageIcon, Pause, Play, Volume2 } from "@/ui/icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CardImageRef } from "@/types/domain/assets";

const IMAGE_BLOCK_INSET_PX = 4;
const FIXED_IMAGE_REFERENCE_FRAME_WIDTH_PX =
  CANONICAL_CARD_WIDTH - IMAGE_BLOCK_INSET_PX * 2;

interface AudioPlayerProps {
  urls: string[];
}

export const AudioPlayer = ({ urls }: AudioPlayerProps) => {
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
            {playingIndex === index ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <Volume2 className="w-3 h-3" />
          </Button>
        </div>
      ))}
    </div>
  );
};

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
  layout?: CardImageRef["layout"];
  scale?: number | null;
  x?: number | null;
  naturalW?: number | null;
  naturalH?: number | null;
};

export const ImageGallery = ({ items, displayMode = "fixed", zoom = 1 }: ImageGalleryProps) => {
  const { currentUser } = useAuthSession();
  const [displayImages, setDisplayImages] = useState<DisplayImage[]>([]);
  const [failedImages, setFailedImages] = useState<Set<number>>(() => new Set());

  const normalizedItems = useMemo(() => {
    return (items ?? []).map((entry) => {
      if (typeof entry === "string") {
        return {
          key: entry,
          url: entry,
          layout: null,
          scale: 1,
          x: 0,
          naturalW: null,
          naturalH: null,
        } satisfies DisplayImage;
      }

      return {
        key: entry.assetId,
        url: null,
        layout: entry.layout ?? null,
        scale: entry.scale ?? 1,
        x: entry.x ?? 0,
        naturalW: entry.naturalW ?? null,
        naturalH: entry.naturalH ?? null,
        ref: entry,
      };
    });
  }, [items]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const resolved = await Promise.all(
        normalizedItems.map(async (item) => {
          if (typeof item.url === "string") return item;
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
        setDisplayImages(resolved);
        setFailedImages(new Set());
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, normalizedItems]);

  const copyImage = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined" && blob.type) {
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
    const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `uploaded-image-${index + 1}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  };

  if (!displayImages || displayImages.length === 0) return null;

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
                fixedReferenceFrameWidthPx={FIXED_IMAGE_REFERENCE_FRAME_WIDTH_PX}
                naturalW={item.naturalW ?? null}
                naturalH={item.naturalH ?? null}
                className="bg-transparent"
                imgClassName="cursor-pointer pointer-events-none"
                onError={() => {
                  setFailedImages((prev) => {
                    const next = new Set(prev);
                    next.add(index);
                    return next;
                  });
                }}
              />

              <div className="absolute top-1 left-1 z-[999] pointer-events-auto flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 supports-[hover:none]:opacity-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6 bg-white/90"
                  onClick={(event) => {
                    event.stopPropagation();
                    void copyImage(item.url!);
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
                    void downloadImage(item.url!, index);
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
              <span className="text-xs">画像を表示できません</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
