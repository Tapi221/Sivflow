import React, { useState, useRef } from 'react';
import { Button } from '@/Components/ui/button';
import { Play, Pause, Volume2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageFrame } from './blocks/ImageFrame';

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
            ref={(el) => { audioRefs.current[index] = el; }}
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
    string | {
      remoteUrl?: string | null;
      localUrl?: string | null;
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
  const [failedImages, setFailedImages] = useState(new Set());
  const [naturalSizeMap, setNaturalSizeMap] = useState<Record<number, { w: number; h: number }>>({});
  const resolvedItems = React.useMemo(
    () =>
      (items && items.length > 0 ? items : urls).map((entry) => {
        if (typeof entry === 'string') {
          return { url: entry, scale: 1, x: 0, naturalW: null, naturalH: null };
        }
        return {
          url: entry.remoteUrl ?? entry.localUrl ?? entry.url ?? '',
          scale: entry.scale ?? 1,
          x: entry.x ?? 0,
          naturalW: entry.naturalW ?? null,
          naturalH: entry.naturalH ?? null,
        };
      }),
    [items, urls]
  );
  const urlKey = React.useMemo(
    () => resolvedItems.map((item) => item.url).join('\u001f'),
    [resolvedItems]
  );

  React.useEffect(() => {
    setNaturalSizeMap({});
  }, [urlKey]);

  const handleImageError = (index: number) => {
    setFailedImages(prev => new Set(prev).add(index));
    console.error(`Image load failed at index ${index}:`, resolvedItems[index]?.url);
  };

  if (!resolvedItems || resolvedItems.length === 0) return null;

  return (
    <>
      <div className="w-full">
        {resolvedItems.map((item, index) => (
           !failedImages.has(index) ? (
            <ImageFrame
              key={index}
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
                  if (current?.w === naturalW && current?.h === naturalH) return prev;
                  return { ...prev, [index]: { w: naturalW, h: naturalH } };
                });
              }}
              onError={() => handleImageError(index)}
            />
           ) : (
             <div key={index} className="w-full h-48 bg-slate-100 flex items-center justify-center text-slate-400 flex-col gap-2">
               <ImageIcon className="w-8 h-8 text-slate-300" />
               <span className="text-xs">画像の読み込みに失敗しました</span>
             </div>
           )
        ))}
      </div>
    </>
  );
}
